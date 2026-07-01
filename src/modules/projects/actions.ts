"use server";

import { getCurrentUser } from "@/auth/session";
import { getDb } from "@/lib/db";
import { nextCode, serializeForClient } from "@/lib/utils";
import { checkServerPermission } from "@/auth/permissions.server";
import { getSystemSettings } from "../../lib/settings-store";
import Decimal from "decimal.js";
import type { ProjectStatus } from "./types";
import {
  createProjectSchema,
  updateProjectSchema,
  issueSupplySchema,
  type CreateProjectInput,
  type UpdateProjectInput,
  type IssueSupplyInput,
} from "./types";

function toDate(value: string | Date | null | undefined) {
  if (!value) return null;
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


async function latestCustomerBalance(tx: any, customerId: string) {
  const latest = await tx.ledgerEntry.findFirst({
    where: { partyType: "CUSTOMER", partyId: customerId },
    orderBy: { createdAt: "desc" },
  });
  if (latest) return toDecimal(latest.runningBalance);

  const customer = await tx.customer.findUnique({ where: { id: customerId }, select: { openingBalance: true } });
  return toDecimal(customer?.openingBalance);
}

export async function createProject(data: CreateProjectInput, userId?: string) {
  await checkServerPermission("projects", "create");
  const parsed = createProjectSchema.parse(data);
  const db = await getDb();
  const createdBy = await resolveUserId(db, userId);

  const result = await db.$transaction(async (tx) => {
    const projectCode = await nextCode(tx, "project", "projectCode", "PRJ");
    const budgetAmount = parsed.budgetAmount !== undefined ? toDecimal(parsed.budgetAmount) : toDecimal(parsed.contractAmount);
    
    const project = await tx.project.create({
      data: {
        projectCode,
        name: parsed.name,
        clientId: parsed.clientId,
        description: parsed.description,
        startDate: toDate(parsed.startDate),
        endDate: toDate(parsed.endDate),
        budgetAmount,
        contractAmount: toDecimal(parsed.contractAmount),
        notes: parsed.notes,
        createdBy,
        status: "PLANNING",
      },
      include: { client: true },
    });

    const contractAmount = toDecimal(parsed.contractAmount);
    if (project.client.customerType === "PROJECT" && contractAmount.greaterThan(0)) {
      const customerBalance = await latestCustomerBalance(tx, project.clientId);
      const runningBalance = customerBalance.plus(contractAmount);

      await tx.ledgerEntry.create({
        data: {
          entryDate: toDate(parsed.startDate) || new Date(),
          partyType: "CUSTOMER",
          partyId: project.clientId,
          entryType: "DEBIT",
          amount: contractAmount,
          referenceType: "PROJECT",
          referenceId: project.id,
          description: `Contract value for project: ${project.name} (${project.projectCode})`,
          runningBalance,
          channelType: "PROJECT",
          createdBy,
        },
      });
    }

    const advanceAmount = parsed.advanceAmount ? toDecimal(parsed.advanceAmount) : new Decimal(0);
    if (advanceAmount.greaterThan(0)) {
      const paymentMethod = parsed.advancePaymentMethod || "CASH";

      await tx.payment.create({
        data: {
          referenceType: "PROJECT",
          referenceId: project.id,
          partyType: "CUSTOMER",
          partyId: project.clientId,
          amount: advanceAmount,
          paymentMethod,
          paymentDate: new Date(),
          notes: parsed.notes || `Advance payment received on project initialization for ${project.name}`,
          createdBy,
        },
      });

      await tx.cashBookEntry.create({
        data: {
          entryDate: new Date(),
          type: "RECEIVED",
          amount: advanceAmount,
          description: `Advance payment received for project: ${project.name} (${project.projectCode})`,
          partyType: "CUSTOMER",
          partyId: project.clientId,
          referenceType: "PROJECT",
          referenceId: project.id,
          paymentMethod,
          createdBy,
        },
      });

      const customerBalance = await latestCustomerBalance(tx, project.clientId);
      const runningBalance = customerBalance.minus(advanceAmount);

      await tx.ledgerEntry.create({
        data: {
          entryDate: new Date(),
          partyType: "CUSTOMER",
          partyId: project.clientId,
          entryType: "CREDIT",
          amount: advanceAmount,
          referenceType: "PROJECT",
          referenceId: project.id,
          description: `Advance payment received for project: ${project.name} (${project.projectCode})`,
          runningBalance,
          channelType: "PROJECT",
          createdBy,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: createdBy,
        action: "CREATE",
        module: "PROJECT",
        recordId: project.id,
        newValues: { projectCode, name: parsed.name, contractAmount: parsed.contractAmount.toString(), advanceAmount: advanceAmount.toString() },
      },
    });

    return project;
  });

  return serializeForClient(result);
}

export async function updateProject(id: string, data: UpdateProjectInput, userId?: string) {
  await checkServerPermission("projects", "edit");
  const parsed = updateProjectSchema.parse(data);
  const db = await getDb();
  const createdBy = await resolveUserId(db, userId);

  const project = await db.project.findUnique({ where: { id } });
  if (!project) throw new Error("Project not found");

  const result = await db.$transaction(async (tx) => {
    const budgetAmount = parsed.budgetAmount !== undefined ? toDecimal(parsed.budgetAmount) : undefined;
    const contractAmount = parsed.contractAmount !== undefined ? toDecimal(parsed.contractAmount) : undefined;

    const updated = await tx.project.update({
      where: { id },
      data: {
        name: parsed.name ?? project.name,
        clientId: parsed.clientId ?? project.clientId,
        description: parsed.description !== undefined ? parsed.description : project.description,
        startDate: parsed.startDate !== undefined ? toDate(parsed.startDate) : project.startDate,
        endDate: parsed.endDate !== undefined ? toDate(parsed.endDate) : project.endDate,
        budgetAmount: budgetAmount ?? project.budgetAmount,
        contractAmount: contractAmount ?? project.contractAmount,
        notes: parsed.notes !== undefined ? parsed.notes : project.notes,
        status: parsed.status ?? project.status,
      },
      include: { client: true },
    });

    if (updated.client.customerType === "PROJECT" && contractAmount !== undefined) {
      const oldContractAmount = toDecimal(project.contractAmount);
      const newContractAmount = toDecimal(updated.contractAmount);
      if (!oldContractAmount.equals(newContractAmount)) {
        const diff = newContractAmount.minus(oldContractAmount);
        const customerBalance = await latestCustomerBalance(tx, updated.clientId);
        if (diff.greaterThan(0)) {
          const runningBalance = customerBalance.plus(diff);
          await tx.ledgerEntry.create({
            data: {
              entryDate: new Date(),
              partyType: "CUSTOMER",
              partyId: updated.clientId,
              entryType: "DEBIT",
              amount: diff,
              referenceType: "PROJECT",
              referenceId: updated.id,
              description: `Contract value adjustment (increase) for project: ${updated.name} (${updated.projectCode})`,
              runningBalance,
              channelType: "PROJECT",
              createdBy,
            },
          });
        } else if (diff.lessThan(0)) {
          const absDiff = diff.abs();
          const runningBalance = customerBalance.minus(absDiff);
          await tx.ledgerEntry.create({
            data: {
              entryDate: new Date(),
              partyType: "CUSTOMER",
              partyId: updated.clientId,
              entryType: "CREDIT",
              amount: absDiff,
              referenceType: "PROJECT",
              referenceId: updated.id,
              description: `Contract value adjustment (decrease) for project: ${updated.name} (${updated.projectCode})`,
              runningBalance,
              channelType: "PROJECT",
              createdBy,
            },
          });
        }
      }
    }

    await tx.auditLog.create({
      data: {
        userId: createdBy,
        action: "UPDATE",
        module: "PROJECT",
        recordId: id,
        newValues: parsed,
      },
    });

    return updated;
  });

  return serializeForClient(result);
}

export async function updateProjectStatus(id: string, status: ProjectStatus, userId?: string) {
  await checkServerPermission("projects", "edit");
  const db = await getDb();
  const createdBy = await resolveUserId(db, userId);

  const project = await db.project.findUnique({ where: { id } });
  if (!project) throw new Error("Project not found");

  const result = await db.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id },
      data: { status },
      include: { client: true },
    });

    await tx.auditLog.create({
      data: {
        userId: createdBy,
        action: "STATUS_CHANGE",
        module: "PROJECT",
        recordId: id,
        newValues: { status },
      },
    });

    return updated;
  });

  return serializeForClient(result);
}

export async function closeProject(id: string, userId?: string) {
  await checkServerPermission("projects", "edit");
  const db = await getDb();
  const createdBy = await resolveUserId(db, userId);

  const project = await db.project.findUnique({ where: { id } });
  if (!project) throw new Error("Project not found");

  const result = await db.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id },
      data: { status: "COMPLETED", endDate: new Date() },
      include: { client: true },
    });

    await tx.auditLog.create({
      data: {
        userId: createdBy,
        action: "CLOSE",
        module: "PROJECT",
        recordId: id,
        newValues: { status: "COMPLETED", endDate: new Date().toISOString() },
      },
    });

    return updated;
  });

  return serializeForClient(result);
}

export async function issueSupplyToProject(data: IssueSupplyInput, userId?: string) {
  await checkServerPermission("projects", "edit");
  const parsed = issueSupplySchema.parse(data);
  const db = await getDb();
  const createdBy = await resolveUserId(db, userId);

  const project = await db.project.findUnique({ where: { id: parsed.projectId }, include: { client: true } });
  if (!project) throw new Error("Project not found");

  const result = await db.$transaction(async (tx) => {
    const settings = getSystemSettings();
    const rawPrefix = settings?.invoiceSettings?.prefix || "INV";
    const prefix = rawPrefix.endsWith("-") ? rawPrefix.slice(0, -1) : rawPrefix;
    const invoiceNumber = await nextCode(tx, "salesInvoice", "invoiceNumber", prefix);
    const invoiceDate = new Date();

    let subtotal = new Decimal(0);
    const preparedItems = [];

    // Process line items and compute total material costs
    for (const item of parsed.items) {
      const stock = await tx.inventoryStock.findUnique({
        where: { productId_warehouseId: { productId: item.productId, warehouseId: parsed.warehouseId } },
        include: { product: true, warehouse: true },
      });
      if (!stock) throw new Error(`No stock record found for selected product and warehouse`);

      const factor = toDecimal(item.conversionFactor ?? 1);
      const baseQtyEquivalent = toDecimal(item.qty).times(factor);

      const availableQty = stock.quantity.minus(stock.reservedQty);
      if (availableQty.lessThan(baseQtyEquivalent)) {
        throw new Error(`${stock.product.name} has only ${availableQty.toString()} ${stock.product.unit} available in ${stock.warehouse.name}`);
      }

      // Resolve cost price (if Custom unit price override is not provided, fetch the active product variant projectPrice)
      let unitPrice = toDecimal(item.unitPrice);
      if (!item.unitPrice || unitPrice.lessThanOrEqualTo(0)) {
        const variant = await tx.productVariant.findFirst({
          where: { productId: item.productId, isActive: true },
          orderBy: { effectiveDate: "desc" },
        });
        if (!variant) throw new Error(`No active project variant price found for ${stock.product.name}`);
        unitPrice = toDecimal(variant.projectPrice).times(factor);
      }

      const totalPrice = unitPrice.times(item.qty);
      subtotal = subtotal.plus(totalPrice);

      // Query active variant purchase price (cost price)
      const variant = await tx.productVariant.findFirst({
        where: { productId: item.productId, isActive: true },
        orderBy: { effectiveDate: "desc" },
        select: { purchasePrice: true }
      });
      const purchasePrice = variant ? toDecimal(variant.purchasePrice) : new Decimal(0);

      preparedItems.push({
        productId: item.productId,
        qty: item.qty,
        unitPrice,
        totalPrice,
        notes: item.notes,
        stock,
        purchasePrice,
        salesUnit: item.salesUnit || stock.product.unit,
        factor,
        baseQtyEquivalent,
      });
    }

    const vatPercent = parsed.applyVat ? new Decimal(13) : new Decimal(0);
    const vatAmount = parsed.applyVat ? subtotal.times(0.13) : new Decimal(0);
    
    let additionalExpensesSum = new Decimal(0);
    const expenseNotesBreakdown: string[] = [];

    if (parsed.additionalExpenses && parsed.additionalExpenses.length > 0) {
      for (const expense of parsed.additionalExpenses) {
        const amt = toDecimal(expense.amount);
        additionalExpensesSum = additionalExpensesSum.plus(amt);
        const typeLabel = expense.type === "TRANSPORT" ? "Transport" : expense.type === "LABOUR" ? "Labour" : "Misc";
        const noteStr = expense.notes ? ` (${expense.notes})` : "";
        expenseNotesBreakdown.push(`${typeLabel}: NPR ${amt.toString()}${noteStr}`);
      }
    }

    const totalAmount = subtotal.plus(vatAmount).plus(additionalExpensesSum);

    let invoiceNotes = parsed.notes || `Material dispatch for project ${project.name}`;
    if (expenseNotesBreakdown.length > 0) {
      const breakdownText = `[Additional Expenses -> ${expenseNotesBreakdown.join(" | ")}]`;
      invoiceNotes = invoiceNotes ? `${invoiceNotes} ${breakdownText}` : breakdownText;
    }

    // Create SalesInvoice of type PROJECT
    const invoice = await tx.salesInvoice.create({
      data: {
        invoiceNumber,
        customerId: project.clientId,
        invoiceType: "PROJECT",
        projectId: project.id,
        invoiceDate,
        status: "SENT",
        subtotal,
        discountPercent: new Decimal(0),
        discountAmount: new Decimal(0),
        vatPercent,
        vatAmount,
        totalAmount,
        paidAmount: new Decimal(0),
        balanceAmount: totalAmount,
        paymentMethod: "CREDIT",
        notes: invoiceNotes,
        createdBy,
      },
    });

    // Create invoice line items & deduct stock & log immutable StockTransactions
    for (const item of preparedItems) {
      await tx.salesInvoiceItem.create({
        data: {
          invoiceId: invoice.id,
          productId: item.productId,
          warehouseId: parsed.warehouseId,
          qty: item.qty,
          unitPrice: item.unitPrice,
          discountPercent: new Decimal(0),
          totalPrice: item.totalPrice,
          notes: item.notes,
          salesUnit: item.salesUnit,
          conversionFactor: item.factor,
          baseQtyEquivalent: item.baseQtyEquivalent,
        },
      });

      // Deduct inventory stock
      await tx.inventoryStock.update({
        where: { productId_warehouseId: { productId: item.productId, warehouseId: parsed.warehouseId } },
        data: { quantity: { decrement: item.baseQtyEquivalent } },
      });

      // Log StockTransaction type PROJECT_ISSUE
      await tx.stockTransaction.create({
        data: {
          type: "PROJECT_ISSUE",
          productId: item.productId,
          warehouseId: parsed.warehouseId,
          quantity: item.baseQtyEquivalent.negated(),
          unitCost: item.purchasePrice, // Cost price (per base unit)
          referenceType: "SALES_INVOICE",
          referenceId: invoice.id,
          notes: item.notes || `Issued to contract site ${project.projectCode}`,
          userId: createdBy,
          transactionUnit: item.salesUnit,
          conversionFactor: item.factor,
          originalQty: item.qty,
        },
      });
    }

    // Create ProjectBilling Milestone link
    const billing = await tx.projectBilling.create({
      data: {
        projectId: project.id,
        invoiceId: invoice.id,
        billingDate: invoiceDate,
        amount: totalAmount,
        notes: parsed.notes || `Material supply dispatch billing: INV-${invoiceNumber}`,
      },
    });

    // Post double-entry DEBIT to Customer Ledger under the PROJECT channel type
    const isProjectCustomer = project.client.customerType === "PROJECT";
    if (!isProjectCustomer) {
      const customerBalance = await latestCustomerBalance(tx, project.clientId);
      const runningBalance = customerBalance.plus(totalAmount);
      
      await tx.ledgerEntry.create({
        data: {
          entryDate: invoiceDate,
          partyType: "CUSTOMER",
          partyId: project.clientId,
          entryType: "DEBIT",
          amount: totalAmount,
          referenceType: "INVOICE",
          referenceId: invoice.id,
          description: `Project supply billing for ${project.name}: INV-${invoiceNumber}`,
          runningBalance,
          channelType: "PROJECT",
          createdBy,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: createdBy,
        action: "CREATE",
        module: "PROJECT_DISPATCH",
        recordId: billing.id,
        newValues: { invoiceNumber, totalAmount: totalAmount.toString(), materialCost: subtotal.toString() },
      },
    });

    return invoice;
  });

  return serializeForClient(result);
}

export async function fetchInvoiceByIdAction(id: string) {
  const { getInvoiceById } = await import("../sales/queries");
  const invoice = await getInvoiceById(id);
  return serializeForClient(invoice);
}

export async function deleteProject(id: string, userId?: string) {
  await checkServerPermission("projects", "delete");
  const db = await getDb();
  const activeUserId = await resolveUserId(db, userId);

  const project = await db.project.findUnique({
    where: { id },
    include: {
      salesInvoices: { select: { id: true } },
      projectBilling: { select: { id: true } },
      client: { select: { customerType: true } },
    },
  });

  if (!project) throw new Error("Project not found");

  if (project.status !== "CANCELLED" && project.status !== "COMPLETED") {
    throw new Error("Only cancelled or completed projects can be deleted.");
  }

  if (project.salesInvoices.length > 0 || project.projectBilling.length > 0) {
    throw new Error(
      `Cannot delete project. It has ${project.salesInvoices.length} invoices and ${project.projectBilling.length} billings associated. Please delete those first.`
    );
  }

  const result = await db.$transaction(async (tx) => {
    const oldContractAmount = toDecimal(project.contractAmount);
    if (project.client.customerType === "PROJECT" && oldContractAmount.greaterThan(0)) {
      const customerBalance = await latestCustomerBalance(tx, project.clientId);
      const runningBalance = customerBalance.minus(oldContractAmount);
      await tx.ledgerEntry.create({
        data: {
          entryDate: new Date(),
          partyType: "CUSTOMER",
          partyId: project.clientId,
          entryType: "CREDIT",
          amount: oldContractAmount,
          referenceType: "PROJECT_DELETE",
          referenceId: project.id,
          description: `Contract value reversed due to project deletion: ${project.name} (${project.projectCode})`,
          runningBalance,
          channelType: "PROJECT",
          createdBy: activeUserId,
        },
      });
    }

    const deleted = await tx.project.delete({ where: { id } });

    await tx.auditLog.create({
      data: {
        userId: activeUserId,
        action: "DELETE",
        module: "PROJECT",
        recordId: id,
        oldValues: project as any,
      },
    });

    return deleted;
  });

  return serializeForClient(result);
}
