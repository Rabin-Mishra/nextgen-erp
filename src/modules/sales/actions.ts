"use server";

import { auth } from "@/auth";
import { getCurrentUser } from "@/auth/session";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import type { InvoiceStatus, InvoiceType, PaymentMethod, PaymentMode } from "@/generated/prisma/client";
import { nextCode, serializeForClient } from "@/lib/utils";
import { checkServerPermission } from "@/auth/permissions.server";
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
import { getSystemSettings } from "@/lib/settings-store";
import { getInvoiceById, getCustomerLedger, getSalesInvoices } from "./queries";

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

function toDecimal(value: Decimal.Value | null | undefined) {
  return new Decimal(value ?? 0);
}

async function resolveUserId(db: any, userId?: string): Promise<string> {
  const resolved = userId || (await getCurrentUser())?.id;
  if (!resolved) {
    const fallbackUser = await db.user.findFirst({
      where: { isActive: true },
      select: { id: true }
    });
    if (fallbackUser) return fallbackUser.id;
    throw new Error("Unauthorized");
  }

  const userExists = await db.user.findUnique({
    where: { id: resolved },
    select: { id: true }
  });

  if (userExists) {
    return resolved;
  }

  const fallbackUser = await db.user.findFirst({
    where: { isActive: true },
    select: { id: true }
  });

  if (fallbackUser) {
    return fallbackUser.id;
  }

  throw new Error("Unauthorized");
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


async function latestCustomerBalance(tx: any, customerId: string) {
  const latest = await tx.ledgerEntry.findFirst({
    where: { partyType: "CUSTOMER", partyId: customerId },
    orderBy: { createdAt: "desc" },
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

export async function createInvoice(data: CreateInvoiceInput, passedUserId?: string) {
  await checkServerPermission("sales", "create");
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" }
  }
  const sessionUserId = passedUserId || (session.user as any).id

  const parsed = createInvoiceSchema.parse(data);
  const db = await getDb();

  // Validate that the user ID exists in the database to prevent stale session foreign key violations
  const userExists = await db.user.findUnique({
    where: { id: sessionUserId },
    select: { id: true }
  });

  let userId = sessionUserId;
  if (!userExists) {
    const fallbackUser = await db.user.findFirst({
      where: { isActive: true },
      select: { id: true }
    });
    if (fallbackUser) {
      userId = fallbackUser.id;
    } else {
      return { success: false, error: "Not authenticated" };
    }
  }

  if (parsed.invoiceType === "PROJECT" && !parsed.projectId) {
    throw new Error("Project invoices must be linked to a project");
  }

  const result = await db.$transaction(async (tx) => {
    const settings = getSystemSettings();
    const rawPrefix = settings?.invoiceSettings?.prefix || "INV";
    const prefix = rawPrefix.endsWith("-") ? rawPrefix.slice(0, -1) : rawPrefix;
    const invoiceNumber = await nextCode(tx, "salesInvoice", "invoiceNumber", prefix);
    const invoiceDate = toDate(parsed.invoiceDate);
    const dueDate = parsed.dueDate ? toDate(parsed.dueDate) : null;
    const vatPercent = parsed.vatPercent !== undefined ? toDecimal(parsed.vatPercent) : new Decimal(13);
    let discountPercent = toDecimal(parsed.discountPercent);
    let discountAmount = toDecimal(parsed.discountAmount);

    let subtotal = new Decimal(0);
    const preparedItems = [];

    for (const item of parsed.items) {
      const stock = await tx.inventoryStock.findUnique({
        where: { productId_warehouseId: { productId: item.productId, warehouseId: item.warehouseId } },
        include: { product: true, warehouse: true },
      });
      if (!stock) throw new Error(`No stock record found for selected product and warehouse`);

      const factor = toDecimal(item.conversionFactor ?? 1);
      const baseQtyEquivalent = toDecimal(item.qty).times(factor);

      const availableQty = toDecimal(stock.quantity).minus(stock.reservedQty);
      if (availableQty.lessThan(baseQtyEquivalent)) {
        throw new Error(`${stock.product.name} has only ${availableQty.toNumber()} ${stock.product.unit} available in ${stock.warehouse.name}`);
      }

      let unitPrice = toDecimal(item.unitPrice);
      if (!item.unitPrice || unitPrice.lessThanOrEqualTo(0)) {
        const basePrice = await resolveUnitPrice(tx, item.productId, parsed.invoiceType);
        unitPrice = basePrice.times(factor);
      }

      const lineDiscountPercent = toDecimal(item.discountPercent);
      const gross = unitPrice.times(item.qty);
      const lineDiscount = gross.times(lineDiscountPercent).div(100);
      const totalPrice = gross.minus(lineDiscount);
      subtotal = subtotal.plus(totalPrice);

      // Query active variant purchase price (cost price)
      const variant = await tx.productVariant.findFirst({
        where: { productId: item.productId, isActive: true },
        orderBy: { effectiveDate: "desc" },
        select: { purchasePrice: true }
      });
      const purchasePrice = variant ? toDecimal(variant.purchasePrice) : new Decimal(0);

      preparedItems.push({ ...item, unitPrice, totalPrice, stock, factor, baseQtyEquivalent, purchasePrice });
    }

    if (parsed.discountAmount !== undefined && parsed.discountAmount !== null) {
      discountAmount = toDecimal(parsed.discountAmount);
      discountPercent = subtotal.greaterThan(0)
        ? discountAmount.times(100).div(subtotal).toDecimalPlaces(2)
        : new Decimal(0);
    } else {
      discountAmount = subtotal.times(discountPercent).div(100).toDecimalPlaces(2);
    }
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
        createdBy: userId,
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
          salesUnit: item.salesUnit || item.stock.product.unit,
          conversionFactor: item.factor,
          baseQtyEquivalent: item.baseQtyEquivalent,
        },
      });

      await tx.inventoryStock.update({
        where: { productId_warehouseId: { productId: item.productId, warehouseId: item.warehouseId } },
        data: { quantity: { decrement: item.baseQtyEquivalent } },
      });

      await tx.stockTransaction.create({
        data: {
          type: "SALE_OUT",
          productId: item.productId,
          warehouseId: item.warehouseId,
          quantity: item.baseQtyEquivalent.negated(),
          unitCost: item.purchasePrice, // Cost price (per base unit)
          referenceType: "SALES_INVOICE",
          referenceId: invoice.id,
          notes: `Sold via invoice ${invoice.invoiceNumber}`,
          userId: userId,
          transactionUnit: item.salesUnit || item.stock.product.unit,
          conversionFactor: item.factor,
          originalQty: item.qty,
        },
      });
    }

    const customer = await tx.customer.findUnique({
      where: { id: parsed.customerId },
      select: { customerType: true }
    });
    const isProjectCustomer = customer?.customerType === "PROJECT";

    let runningBalance = await latestCustomerBalance(tx, parsed.customerId);
    if (!isProjectCustomer) {
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
          createdBy: userId,
        },
      });
    }

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
          createdBy: userId,
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
          createdBy: userId,
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
          createdBy: userId,
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
        userId: userId,
        action: "CREATE",
        module: "SALES",
        recordId: invoice.id,
        newValues: { invoiceNumber, invoiceType: parsed.invoiceType, totalAmount: totalAmount.toString() },
      },
    });

    return invoice;
  }, {
    maxWait: 15000,
    timeout: 30000
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
  await checkServerPermission("sales", "create");
  const parsed = recordSalePaymentSchema.parse(data);
  const db = await getDb();
  const createdBy = await resolveUserId(db, userId);

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
  await checkServerPermission("sales", "create");
  const parsed = createReturnSchema.parse(data);
  const db = await getDb();
  const createdBy = await resolveUserId(db, userId);

  const result = await db.$transaction(async (tx) => {
    const invoice = await tx.salesInvoice.findUnique({
      where: { id: parsed.invoiceId },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    });
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status === "CANCELLED") throw new Error("Cannot return items from a cancelled invoice");

    let returnValue = new Decimal(0);
    const returnNumber = await nextCode(tx, "salesReturn", "returnNumber", "SRN");

    // Create the master SalesReturn document first
    const salesReturn = await tx.salesReturn.create({
      data: {
        returnNumber,
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        returnDate: new Date(),
        status: "PROCESSED",
        refundMethod: parsed.refundMethod,
        totalAmount: new Decimal(0), // will update below
        notes: parsed.reason,
        createdBy,
      },
    });

    const returnItemsData = [];

    // Get all sales return IDs for this invoice to calculate max returnable qty
    const salesReturnIds = (
      await tx.salesReturn.findMany({
        where: { invoiceId: invoice.id },
        select: { id: true },
      })
    ).map((r: any) => r.id);

    for (const returnItem of parsed.items) {
      const invoiceItem = invoice.items.find((item) => item.id === returnItem.invoiceItemId);
      if (!invoiceItem) throw new Error(`Invoice item ${returnItem.invoiceItemId} not found`);

      const factor = toDecimal(invoiceItem.conversionFactor ?? 1);
      const baseReturnQty = toDecimal(returnItem.qty).times(factor);

      // Check max returnable qty
      const existingReturns = await tx.stockTransaction.aggregate({
        where: {
          type: "RETURN_IN",
          referenceType: "SALES_RETURN",
          referenceId: { in: salesReturnIds },
          productId: invoiceItem.productId,
          warehouseId: invoiceItem.warehouseId,
        },
        _sum: { quantity: true },
      });
      const returnedBaseQty = toDecimal(existingReturns._sum.quantity);
      const invoiceBaseQty = toDecimal(invoiceItem.baseQtyEquivalent || invoiceItem.qty);
      const returnableBaseQty = invoiceBaseQty.minus(returnedBaseQty);
      if (baseReturnQty.greaterThan(returnableBaseQty)) {
        throw new Error(`Only ${returnableBaseQty.div(factor).toNumber()} units of ${invoiceItem.salesUnit || invoiceItem.product.unit} can be returned for selected item`);
      }

      const perUnitValue = toDecimal(invoiceItem.totalPrice).div(invoiceItem.qty);
      const lineReturnValue = perUnitValue.times(returnItem.qty);
      returnValue = returnValue.plus(lineReturnValue);

      // Increment stock quantity
      await tx.inventoryStock.upsert({
        where: { productId_warehouseId: { productId: invoiceItem.productId, warehouseId: invoiceItem.warehouseId } },
        update: { quantity: { increment: baseReturnQty } },
        create: {
          productId: invoiceItem.productId,
          warehouseId: invoiceItem.warehouseId,
          quantity: baseReturnQty,
          reservedQty: 0,
        },
      });

      // Query active variant purchase price (cost price)
      const variant = await tx.productVariant.findFirst({
        where: { productId: invoiceItem.productId, isActive: true },
        orderBy: { effectiveDate: "desc" },
        select: { purchasePrice: true }
      });
      const purchasePrice = variant ? toDecimal(variant.purchasePrice) : new Decimal(0);

      // Stock transaction entry
      await tx.stockTransaction.create({
        data: {
          type: "RETURN_IN",
          productId: invoiceItem.productId,
          warehouseId: invoiceItem.warehouseId,
          quantity: baseReturnQty,
          unitCost: purchasePrice, // Returned back to inventory at cost price
          referenceType: "SALES_RETURN",
          referenceId: salesReturn.id,
          notes: parsed.reason,
          userId: createdBy,
          transactionUnit: invoiceItem.salesUnit,
          conversionFactor: factor,
          originalQty: returnItem.qty,
        },
      });

      // Create SalesReturnItem
      await tx.salesReturnItem.create({
        data: {
          salesReturnId: salesReturn.id,
          productId: invoiceItem.productId,
          qty: returnItem.qty,
          unitPrice: perUnitValue,
          totalPrice: lineReturnValue,
          warehouseId: invoiceItem.warehouseId,
          notes: parsed.reason,
        },
      });
    }

    // Calculate VAT if the original invoice had VAT applied
    const originalVatPercent = toDecimal(invoice.vatPercent);
    const hasVat = originalVatPercent.greaterThan(0);
    const vatPercentVal = hasVat ? originalVatPercent : new Decimal(0);

    const baseReturnAmount = returnValue;
    const vatAmount = hasVat ? baseReturnAmount.times(vatPercentVal).div(100) : new Decimal(0);
    const totalReturnAmount = baseReturnAmount.plus(vatAmount);

    // Update SalesReturn with actual total (with VAT)
    await tx.salesReturn.update({
      where: { id: salesReturn.id },
      data: { totalAmount: totalReturnAmount },
    });

    // Ledger Credit Bookkeeping (receivables decremented with VAT included)
    const isProjectCustomer = invoice.customer.customerType === "PROJECT";
    if (!isProjectCustomer) {
      const runningBalance = (await latestCustomerBalance(tx, invoice.customerId)).minus(totalReturnAmount);
      await tx.ledgerEntry.create({
        data: {
          entryDate: new Date(),
          partyType: "CUSTOMER",
          partyId: invoice.customerId,
          entryType: "CREDIT",
          amount: totalReturnAmount,
          referenceType: "SALES_RETURN",
          referenceId: salesReturn.id,
          description: `Return ${returnNumber} against invoice ${invoice.invoiceNumber}: ${parsed.reason}`,
          runningBalance,
          channelType: invoice.invoiceType,
          createdBy,
        },
      });
    }

    // Cash Book Integration (PAID entry since cash is paid out as refund)
    await tx.cashBookEntry.create({
      data: {
        entryDate: new Date(),
        type: "PAID",
        amount: totalReturnAmount,
        description: `Refund for Sales Return ${returnNumber} against INV ${invoice.invoiceNumber}`,
        partyType: "CUSTOMER",
        partyId: invoice.customerId,
        referenceType: "SALES_RETURN",
        referenceId: salesReturn.id,
        paymentMethod: parsed.refundMethod,
        createdBy,
      },
    });

    // Update original Invoice totals
    const adjustedTotal = toDecimal(invoice.totalAmount).minus(totalReturnAmount);
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
        recordId: salesReturn.id,
        newValues: { reason: parsed.reason, returnValue: totalReturnAmount.toString(), returnNumber },
      },
    });

    return updated;
  });

  return getInvoiceById(result.id);
}

export async function cancelInvoice(id: string, userId?: string) {
  await checkServerPermission("sales", "delete");
  const db = await getDb();
  const createdBy = await resolveUserId(db, userId);
  const invoice = await db.salesInvoice.findUnique({ where: { id }, include: { items: true } });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "DRAFT") throw new Error("Only draft invoices can be cancelled");

  const result = await db.$transaction(async (tx) => {
    for (const item of invoice.items) {
      const baseQty = toDecimal(item.baseQtyEquivalent || item.qty);
      const factor = toDecimal(item.conversionFactor || 1);

      await tx.inventoryStock.update({
        where: { productId_warehouseId: { productId: item.productId, warehouseId: item.warehouseId } },
        data: { quantity: { increment: baseQty } },
      });
      // Query active variant purchase price (cost price)
      const variant = await tx.productVariant.findFirst({
        where: { productId: item.productId, isActive: true },
        orderBy: { effectiveDate: "desc" },
        select: { purchasePrice: true }
      });
      const purchasePrice = variant ? toDecimal(variant.purchasePrice) : new Decimal(0);

      await tx.stockTransaction.create({
        data: {
          type: "RETURN_IN",
          productId: item.productId,
          warehouseId: item.warehouseId,
          quantity: baseQty,
          unitCost: purchasePrice, // Returned back to inventory at cost price
          referenceType: "INVOICE_CANCEL",
          referenceId: invoice.id,
          notes: `Cancelled draft invoice ${invoice.invoiceNumber}`,
          userId: createdBy,
          transactionUnit: item.salesUnit,
          conversionFactor: factor,
          originalQty: item.qty,
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
  await checkServerPermission("sales", "create");
  const parsed = createCustomerSchema.parse(data);
  const db = await getDb();
  const createdBy = await resolveUserId(db, userId);

  const result = await db.$transaction(async (tx) => {
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

  revalidatePath("/sales");
  return serializeForClient(result);
}

export async function updateCustomer(id: string, data: UpdateCustomerInput, userId?: string) {
  await checkServerPermission("sales", "edit");
  const parsed = updateCustomerSchema.parse(data);
  const db = await getDb();
  const createdBy = await resolveUserId(db, userId);

  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) throw new Error("Customer not found");

  const result = await db.$transaction(async (tx) => {
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

  revalidatePath("/sales");
  return serializeForClient(result);
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

export async function deleteCustomer(id: string, userId?: string) {
  await checkServerPermission("sales", "delete");
  const db = await getDb();
  const createdBy = await resolveUserId(db, userId);

  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) throw new Error("Customer not found");

  const invoicesCount = await db.salesInvoice.count({ where: { customerId: id } });
  if (invoicesCount > 0) {
    throw new Error(`Cannot delete. This customer has ${invoicesCount} invoices on record. Deactivate instead?`);
  }

  const result = await db.$transaction(async (tx) => {
    const deleted = await tx.customer.delete({ where: { id } });

    await tx.auditLog.create({
      data: {
        userId: createdBy,
        action: "DELETE",
        module: "CUSTOMER",
        recordId: id,
        oldValues: customer as any,
      },
    });

    return deleted;
  });

  revalidatePath("/sales");
  return serializeForClient(result);
}

export async function fetchInvoiceByIdAction(id: string) {
  const invoice = await getInvoiceById(id);
  return serializeForClient(invoice);
}

export async function getSalesReturnDetails(returnId: string) {
  const db = await getDb();
  const salesReturn = await db.salesReturn.findUnique({
    where: { id: returnId },
    include: {
      customer: true,
      invoice: {
        include: {
          items: {
            include: {
              product: true,
              warehouse: true,
            },
          },
          salesReturns: {
            include: {
              items: true,
            },
          },
        },
      },
      items: {
        include: {
          product: true,
          warehouse: true,
        },
      },
    },
  });
  return serializeForClient(salesReturn);
}



