"use server";

import { getCurrentUser } from "@/auth/session";
import { getDb } from "@/lib/db";
import Decimal from "decimal.js";
import type { InvoiceStatus, InvoiceType, PaymentMethod, PaymentMode } from "@/generated/prisma/client";
import {
  createCustomerSchema,
  createInvoiceSchema,
  createReturnSchema,
  quickSaleSchema,
  recordSalePaymentSchema,
  updateCustomerSchema,
  type CreateCustomerInput,
  type CreateInvoiceInput,
  type CreateReturnInput,
  type QuickSaleInput,
  type RecordSalePaymentInput,
  type UpdateCustomerInput,
} from "./types";
import { getInvoiceById, getCustomerLedger, getSalesInvoices } from "./queries";

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

function toDecimal(value: Decimal.Value | null | undefined) {
  return new Decimal(value ?? 0);
}

async function resolveUserId(userId?: string) {
  if (userId) return userId;
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");
  return user.id;
}

function toPaymentMode(method: string): PaymentMode {
  return method === "BANK_TRANSFER" ? "BANK" : (method as PaymentMode);
}

function toInvoicePaymentMethod(method?: string | null): PaymentMethod | null {
  if (!method) return null;
  if (method === "BANK") return "BANK_TRANSFER";
  return method as PaymentMethod;
}

function statusFromAmounts(total: Decimal, paid: Decimal, dueDate?: Date | null): InvoiceStatus {
  const balance = total.minus(paid);
  if (balance.lessThanOrEqualTo(0)) return "PAID";
  if (paid.greaterThan(0)) return "PARTIAL";
  if (dueDate && dueDate.getTime() < Date.now()) return "OVERDUE";
  return "SENT";
}

async function nextCode(tx: any, model: "salesInvoice" | "customer", field: "invoiceNumber" | "code", prefix: string) {
  const latest = await tx[model].findFirst({
    where: { [field]: { startsWith: `${prefix}-` } },
    orderBy: { [field]: "desc" },
  });
  const latestNumber = latest?.[field]?.split("-").at(-1);
  const nextNumber = Number.parseInt(latestNumber ?? "0", 10) + 1;
  return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
}

async function latestCustomerBalance(tx: any, customerId: string) {
  const latest = await tx.ledgerEntry.findFirst({
    where: { partyType: "CUSTOMER", partyId: customerId },
    orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
  });
  if (latest) return toDecimal(latest.runningBalance);

  const customer = await tx.customer.findUnique({ where: { id: customerId }, select: { openingBalance: true } });
  return toDecimal(customer?.openingBalance);
}

async function resolveUnitPrice(tx: any, productId: string, invoiceType: InvoiceType, override?: Decimal.Value) {
  if (override !== undefined && override !== null && new Decimal(override).greaterThanOrEqualTo(0)) {
    return new Decimal(override);
  }

  const variant = await tx.productVariant.findFirst({
    where: { productId, isActive: true },
    orderBy: { effectiveDate: "desc" },
  });
  if (!variant) throw new Error("No active selling price found for selected product");

  if (invoiceType === "RETAIL") return toDecimal(variant.retailPrice);
  if (invoiceType === "WHOLESALE") return toDecimal(variant.wholesalePrice);
  return toDecimal(variant.projectPrice);
}

export async function createInvoice(data: CreateInvoiceInput, userId?: string) {
  const parsed = createInvoiceSchema.parse(data);
  const createdBy = await resolveUserId(userId);
  const db = await getDb();

  if (parsed.invoiceType === "PROJECT" && !parsed.projectId) {
    throw new Error("Project invoices must be linked to a project");
  }

  const result = await db.$transaction(async (tx) => {
    const invoiceNumber = await nextCode(tx, "salesInvoice", "invoiceNumber", "INV");
    const invoiceDate = toDate(parsed.invoiceDate);
    const dueDate = parsed.dueDate ? toDate(parsed.dueDate) : null;
    const vatPercent = parsed.vatPercent !== undefined ? toDecimal(parsed.vatPercent) : new Decimal(13);
    const discountPercent = toDecimal(parsed.discountPercent);

    let subtotal = new Decimal(0);
    const preparedItems = [];

    for (const item of parsed.items) {
      const stock = await tx.inventoryStock.findUnique({
        where: { productId_warehouseId: { productId: item.productId, warehouseId: item.warehouseId } },
        include: { product: true, warehouse: true },
      });
      if (!stock) throw new Error(`No stock record found for selected product and warehouse`);

      const availableQty = stock.quantity - stock.reservedQty;
      if (availableQty < item.qty) {
        throw new Error(`${stock.product.name} has only ${availableQty} ${stock.product.unit} available in ${stock.warehouse.name}`);
      }

      const unitPrice = await resolveUnitPrice(tx, item.productId, parsed.invoiceType, item.unitPrice);
      const lineDiscountPercent = toDecimal(item.discountPercent);
      const gross = unitPrice.times(item.qty);
      const lineDiscount = gross.times(lineDiscountPercent).div(100);
      const totalPrice = gross.minus(lineDiscount);
      subtotal = subtotal.plus(totalPrice);

      preparedItems.push({ ...item, unitPrice, totalPrice, stock });
    }

    const discountAmount = subtotal.times(discountPercent).div(100);
    const taxableAmount = subtotal.minus(discountAmount);
    const vatAmount = taxableAmount.times(vatPercent).div(100);
    const totalAmount = taxableAmount.plus(vatAmount);
    const initialPayment = toDecimal(parsed.initialPaymentAmount);
    if (initialPayment.greaterThan(totalAmount)) throw new Error("Initial payment cannot exceed invoice total");

    const balanceAmount = totalAmount.minus(initialPayment);
    const status = statusFromAmounts(totalAmount, initialPayment, dueDate);
    const paymentMethod = toInvoicePaymentMethod(parsed.paymentMethod ?? parsed.initialPaymentMethod ?? (initialPayment.greaterThan(0) ? "CASH" : "CREDIT"));

    const invoice = await tx.salesInvoice.create({
      data: {
        invoiceNumber,
        customerId: parsed.customerId,
        invoiceType: parsed.invoiceType,
        projectId: parsed.invoiceType === "PROJECT" ? parsed.projectId : null,
        invoiceDate,
        dueDate,
        status,
        subtotal,
        discountPercent,
        discountAmount,
        vatPercent,
        vatAmount,
        totalAmount,
        paidAmount: initialPayment,
        balanceAmount,
        paymentMethod,
        notes: parsed.notes,
        createdBy,
      },
    });

    for (const item of preparedItems) {
      await tx.salesInvoiceItem.create({
        data: {
          invoiceId: invoice.id,
          productId: item.productId,
          warehouseId: item.warehouseId,
          qty: item.qty,
          unitPrice: item.unitPrice,
          discountPercent: toDecimal(item.discountPercent),
          totalPrice: item.totalPrice,
          notes: item.notes,
        },
      });

      await tx.inventoryStock.update({
        where: { productId_warehouseId: { productId: item.productId, warehouseId: item.warehouseId } },
        data: { quantity: { decrement: item.qty } },
      });

      await tx.stockTransaction.create({
        data: {
          type: "SALE_OUT",
          productId: item.productId,
          warehouseId: item.warehouseId,
          quantity: -item.qty,
          unitCost: item.unitPrice,
          referenceType: "SALES_INVOICE",
          referenceId: invoice.id,
          notes: `Sold via invoice ${invoice.invoiceNumber}`,
          userId: createdBy,
        },
      });
    }

    let runningBalance = await latestCustomerBalance(tx, parsed.customerId);
    runningBalance = runningBalance.plus(totalAmount);
    await tx.ledgerEntry.create({
      data: {
        entryDate: invoiceDate,
        partyType: "CUSTOMER",
        partyId: parsed.customerId,
        entryType: "DEBIT",
        amount: totalAmount,
        referenceType: "INVOICE",
        referenceId: invoice.id,
        description: `Invoice ${invoice.invoiceNumber}`,
        runningBalance,
        channelType: parsed.invoiceType,
        createdBy,
      },
    });

    if (initialPayment.greaterThan(0)) {
      const initialPaymentMethod = toPaymentMode(parsed.initialPaymentMethod ?? parsed.paymentMethod ?? "CASH");
      await tx.payment.create({
        data: {
          referenceType: "INVOICE",
          referenceId: invoice.id,
          partyType: "CUSTOMER",
          partyId: parsed.customerId,
          amount: initialPayment,
          paymentMethod: initialPaymentMethod,
          paymentDate: parsed.initialPaymentDate ? toDate(parsed.initialPaymentDate) : invoiceDate,
          notes: parsed.initialPaymentNotes,
          createdBy,
        },
      });

      await tx.cashBookEntry.create({
        data: {
          entryDate: parsed.initialPaymentDate ? toDate(parsed.initialPaymentDate) : invoiceDate,
          type: "RECEIVED",
          amount: initialPayment,
          description: `Payment received for invoice ${invoice.invoiceNumber}`,
          partyType: "CUSTOMER",
          partyId: parsed.customerId,
          referenceType: "INVOICE",
          referenceId: invoice.id,
          paymentMethod: initialPaymentMethod,
          createdBy,
        },
      });

      runningBalance = runningBalance.minus(initialPayment);
      await tx.ledgerEntry.create({
        data: {
          entryDate: parsed.initialPaymentDate ? toDate(parsed.initialPaymentDate) : invoiceDate,
          partyType: "CUSTOMER",
          partyId: parsed.customerId,
          entryType: "CREDIT",
          amount: initialPayment,
          referenceType: "INVOICE",
          referenceId: invoice.id,
          description: `Payment received for invoice ${invoice.invoiceNumber}`,
          runningBalance,
          channelType: parsed.invoiceType,
          createdBy,
        },
      });
    }

    if (parsed.invoiceType === "PROJECT" && parsed.projectId) {
      await tx.projectBilling.create({
        data: {
          projectId: parsed.projectId,
          invoiceId: invoice.id,
          billingDate: invoiceDate,
          amount: totalAmount,
          notes: parsed.notes,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: createdBy,
        action: "CREATE",
        module: "SALES",
        recordId: invoice.id,
        newValues: { invoiceNumber, invoiceType: parsed.invoiceType, totalAmount: totalAmount.toString() },
      },
    });

    return invoice;
  });

  return getInvoiceById(result.id);
}

export async function quickSale(data: QuickSaleInput, userId?: string) {
  const parsed = quickSaleSchema.parse(data);
  return createInvoice(
    {
      customerId: parsed.customerId,
      invoiceType: parsed.invoiceType,
      invoiceDate: new Date(),
      paymentMethod: parsed.paymentMethod,
      initialPaymentMethod: parsed.paymentMethod,
      vatPercent: 13,
      items: parsed.items.map((item) => ({ ...item, warehouseId: parsed.warehouseId })),
    },
    userId
  );
}

export async function recordSalePayment(data: RecordSalePaymentInput, userId?: string) {
  const parsed = recordSalePaymentSchema.parse(data);
  const createdBy = await resolveUserId(userId);
  const db = await getDb();

  const invoice = await db.salesInvoice.findUnique({ where: { id: parsed.invoiceId }, include: { customer: true } });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "CANCELLED") throw new Error("Cannot record payment against a cancelled invoice");

  const paymentAmount = toDecimal(parsed.amount);
  if (paymentAmount.lessThanOrEqualTo(0)) throw new Error("Payment amount must be greater than zero");
  if (paymentAmount.greaterThan(invoice.balanceAmount)) throw new Error("Payment amount cannot exceed balance due");

  const result = await db.$transaction(async (tx) => {
    const paymentMethod = toPaymentMode(parsed.paymentMethod);
    const paymentDate = toDate(parsed.paymentDate);

    await tx.payment.create({
      data: {
        referenceType: "INVOICE",
        referenceId: invoice.id,
        partyType: "CUSTOMER",
        partyId: invoice.customerId,
        amount: paymentAmount,
        paymentMethod,
        paymentDate,
        notes: parsed.notes,
        createdBy,
      },
    });

    await tx.cashBookEntry.create({
      data: {
        entryDate: paymentDate,
        type: "RECEIVED",
        amount: paymentAmount,
        description: `Payment received for invoice ${invoice.invoiceNumber}`,
        partyType: "CUSTOMER",
        partyId: invoice.customerId,
        referenceType: "INVOICE",
        referenceId: invoice.id,
        paymentMethod,
        createdBy,
      },
    });

    const runningBalance = (await latestCustomerBalance(tx, invoice.customerId)).minus(paymentAmount);
    await tx.ledgerEntry.create({
      data: {
        entryDate: paymentDate,
        partyType: "CUSTOMER",
        partyId: invoice.customerId,
        entryType: "CREDIT",
        amount: paymentAmount,
        referenceType: "INVOICE",
        referenceId: invoice.id,
        description: `Payment received for invoice ${invoice.invoiceNumber}`,
        runningBalance,
        channelType: invoice.invoiceType,
        createdBy,
      },
    });

    const newPaidAmount = toDecimal(invoice.paidAmount).plus(paymentAmount);
    const newBalance = toDecimal(invoice.totalAmount).minus(newPaidAmount);
    const updated = await tx.salesInvoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaidAmount,
        balanceAmount: newBalance.lessThan(0) ? new Decimal(0) : newBalance,
        status: statusFromAmounts(toDecimal(invoice.totalAmount), newPaidAmount, invoice.dueDate),
      },
    });

    await tx.auditLog.create({
      data: {
        userId: createdBy,
        action: "RECORD_PAYMENT",
        module: "SALES",
        recordId: invoice.id,
        newValues: { paidAmount: newPaidAmount.toString(), paymentMethod },
      },
    });

    return updated;
  });

  return getInvoiceById(result.id);
}

export async function createSalesReturn(data: CreateReturnInput, userId?: string) {
  const parsed = createReturnSchema.parse(data);
  const createdBy = await resolveUserId(userId);
  const db = await getDb();

  const invoice = await db.salesInvoice.findUnique({
    where: { id: parsed.invoiceId },
    include: { items: true },
  });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "CANCELLED") throw new Error("Cannot return items from a cancelled invoice");

  const result = await db.$transaction(async (tx) => {
    let returnValue = new Decimal(0);

    for (const returnItem of parsed.items) {
      const invoiceItem = invoice.items.find((item) => item.id === returnItem.invoiceItemId);
      if (!invoiceItem) throw new Error(`Invoice item ${returnItem.invoiceItemId} not found`);

      const existingReturns = await tx.stockTransaction.aggregate({
        where: {
          type: "RETURN_IN",
          referenceType: "SALES_RETURN",
          referenceId: invoice.id,
          productId: invoiceItem.productId,
          warehouseId: invoiceItem.warehouseId,
        },
        _sum: { quantity: true },
      });
      const returnedQty = existingReturns._sum.quantity ?? 0;
      const returnableQty = invoiceItem.qty - returnedQty;
      if (returnItem.qty > returnableQty) throw new Error(`Only ${returnableQty} units can be returned for selected item`);

      const perUnitValue = toDecimal(invoiceItem.totalPrice).div(invoiceItem.qty);
      const lineReturnValue = perUnitValue.times(returnItem.qty);
      returnValue = returnValue.plus(lineReturnValue);

      await tx.inventoryStock.upsert({
        where: { productId_warehouseId: { productId: invoiceItem.productId, warehouseId: invoiceItem.warehouseId } },
        update: { quantity: { increment: returnItem.qty } },
        create: {
          productId: invoiceItem.productId,
          warehouseId: invoiceItem.warehouseId,
          quantity: returnItem.qty,
          reservedQty: 0,
        },
      });

      await tx.stockTransaction.create({
        data: {
          type: "RETURN_IN",
          productId: invoiceItem.productId,
          warehouseId: invoiceItem.warehouseId,
          quantity: returnItem.qty,
          unitCost: perUnitValue,
          referenceType: "SALES_RETURN",
          referenceId: invoice.id,
          notes: parsed.reason,
          userId: createdBy,
        },
      });
    }

    const runningBalance = (await latestCustomerBalance(tx, invoice.customerId)).minus(returnValue);
    await tx.ledgerEntry.create({
      data: {
        entryDate: new Date(),
        partyType: "CUSTOMER",
        partyId: invoice.customerId,
        entryType: "CREDIT",
        amount: returnValue,
        referenceType: "SALES_RETURN",
        referenceId: invoice.id,
        description: `Return against invoice ${invoice.invoiceNumber}: ${parsed.reason}`,
        runningBalance,
        channelType: invoice.invoiceType,
        createdBy,
      },
    });

    const adjustedTotal = toDecimal(invoice.totalAmount).minus(returnValue);
    const nextTotal = adjustedTotal.lessThan(0) ? new Decimal(0) : adjustedTotal;
    const nextBalance = nextTotal.minus(invoice.paidAmount);
    const updated = await tx.salesInvoice.update({
      where: { id: invoice.id },
      data: {
        totalAmount: nextTotal,
        balanceAmount: nextBalance.lessThan(0) ? new Decimal(0) : nextBalance,
        status: statusFromAmounts(nextTotal, toDecimal(invoice.paidAmount), invoice.dueDate),
      },
    });

    await tx.auditLog.create({
      data: {
        userId: createdBy,
        action: "RETURN",
        module: "SALES",
        recordId: invoice.id,
        newValues: { reason: parsed.reason, returnValue: returnValue.toString(), items: parsed.items },
      },
    });

    return updated;
  });

  return getInvoiceById(result.id);
}

export async function cancelInvoice(id: string, userId?: string) {
  const createdBy = await resolveUserId(userId);
  const db = await getDb();
  const invoice = await db.salesInvoice.findUnique({ where: { id }, include: { items: true } });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "DRAFT") throw new Error("Only draft invoices can be cancelled");

  const result = await db.$transaction(async (tx) => {
    for (const item of invoice.items) {
      await tx.inventoryStock.update({
        where: { productId_warehouseId: { productId: item.productId, warehouseId: item.warehouseId } },
        data: { quantity: { increment: item.qty } },
      });
      await tx.stockTransaction.create({
        data: {
          type: "RETURN_IN",
          productId: item.productId,
          warehouseId: item.warehouseId,
          quantity: item.qty,
          unitCost: item.unitPrice,
          referenceType: "INVOICE_CANCEL",
          referenceId: invoice.id,
          notes: `Cancelled draft invoice ${invoice.invoiceNumber}`,
          userId: createdBy,
        },
      });
    }

    const updated = await tx.salesInvoice.update({
      where: { id },
      data: { status: "CANCELLED", balanceAmount: new Decimal(0) },
    });

    await tx.auditLog.create({
      data: { userId: createdBy, action: "CANCEL", module: "SALES", recordId: id, newValues: { status: "CANCELLED" } },
    });

    return updated;
  });

  return getInvoiceById(result.id);
}

export async function createCustomer(data: CreateCustomerInput, userId?: string) {
  const parsed = createCustomerSchema.parse(data);
  const createdBy = await resolveUserId(userId);
  const db = await getDb();

  return db.$transaction(async (tx) => {
    const code = parsed.code || (await nextCode(tx, "customer", "code", "CUS"));
    const openingBalance = toDecimal(parsed.openingBalance);
    const customer = await tx.customer.create({
      data: {
        code,
        name: parsed.name,
        contactPerson: parsed.contactPerson,
        phone: parsed.phone,
        email: parsed.email,
        address: parsed.address,
        panNumber: parsed.panNumber,
        customerType: parsed.customerType,
        creditLimit: toDecimal(parsed.creditLimit),
        openingBalance,
        notes: parsed.notes,
        isActive: parsed.isActive ?? true,
      },
    });

    if (openingBalance.greaterThan(0)) {
      await tx.ledgerEntry.create({
        data: {
          entryDate: new Date(),
          partyType: "CUSTOMER",
          partyId: customer.id,
          entryType: "DEBIT",
          amount: openingBalance,
          referenceType: "OPENING_BALANCE",
          referenceId: customer.id,
          description: "Opening customer balance",
          runningBalance: openingBalance,
          channelType: "GENERAL",
          createdBy,
        },
      });
    }

    await tx.auditLog.create({
      data: { userId: createdBy, action: "CREATE", module: "CUSTOMER", recordId: customer.id, newValues: { code, name: parsed.name } },
    });

    return customer;
  });
}

export async function updateCustomer(id: string, data: UpdateCustomerInput, userId?: string) {
  const parsed = updateCustomerSchema.parse(data);
  const createdBy = await resolveUserId(userId);
  const db = await getDb();

  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) throw new Error("Customer not found");

  return db.$transaction(async (tx) => {
    const updated = await tx.customer.update({
      where: { id },
      data: {
        code: parsed.code ?? customer.code,
        name: parsed.name ?? customer.name,
        contactPerson: parsed.contactPerson !== undefined ? parsed.contactPerson : customer.contactPerson,
        phone: parsed.phone !== undefined ? parsed.phone : customer.phone,
        email: parsed.email !== undefined ? parsed.email : customer.email,
        address: parsed.address !== undefined ? parsed.address : customer.address,
        panNumber: parsed.panNumber !== undefined ? parsed.panNumber : customer.panNumber,
        customerType: parsed.customerType ?? customer.customerType,
        creditLimit: parsed.creditLimit !== undefined ? toDecimal(parsed.creditLimit) : customer.creditLimit,
        openingBalance: parsed.openingBalance !== undefined ? toDecimal(parsed.openingBalance) : customer.openingBalance,
        notes: parsed.notes !== undefined ? parsed.notes : customer.notes,
        isActive: parsed.isActive !== undefined ? parsed.isActive : customer.isActive,
      },
    });

    await tx.auditLog.create({
      data: { userId: createdBy, action: "UPDATE", module: "CUSTOMER", recordId: id, newValues: parsed },
    });

    return updated;
  });
}

export async function fetchCustomerLedgerAction(customerId: string) {
  return getCustomerLedger(customerId);
}

export async function fetchUnpaidInvoicesAction(customerId: string) {
  const [sent, partial, overdue] = await Promise.all([
    getSalesInvoices({ customerId, status: "SENT", pageSize: 100 }),
    getSalesInvoices({ customerId, status: "PARTIAL", pageSize: 100 }),
    getSalesInvoices({ customerId, status: "OVERDUE", pageSize: 100 }),
  ]);
  
  return [...sent.data, ...partial.data, ...overdue.data].sort(
    (a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
  );
}

