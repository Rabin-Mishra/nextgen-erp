"use server";

import { getCurrentUser } from "@/auth/session";
import { getDb } from "@/lib/db";
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

async function resolveUserId(userId?: string) {
  if (userId) return userId;
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");
  return user.id;
}

async function nextCode(tx: any, model: string, field: string, prefix: string) {
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

export async function createProject(data: CreateProjectInput, userId?: string) {
  const parsed = createProjectSchema.parse(data);
  const createdBy = await resolveUserId(userId);
  const db = await getDb();

  return db.$transaction(async (tx) => {
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

    await tx.auditLog.create({
      data: {
        userId: createdBy,
        action: "CREATE",
        module: "PROJECT",
        recordId: project.id,
        newValues: { projectCode, name: parsed.name, contractAmount: parsed.contractAmount.toString() },
      },
    });

    return project;
  });
}

export async function updateProject(id: string, data: UpdateProjectInput, userId?: string) {
  const parsed = updateProjectSchema.parse(data);
  const createdBy = await resolveUserId(userId);
  const db = await getDb();

  const project = await db.project.findUnique({ where: { id } });
  if (!project) throw new Error("Project not found");

  return db.$transaction(async (tx) => {
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
}

export async function updateProjectStatus(id: string, status: ProjectStatus, userId?: string) {
  const createdBy = await resolveUserId(userId);
  const db = await getDb();

  const project = await db.project.findUnique({ where: { id } });
  if (!project) throw new Error("Project not found");

  return db.$transaction(async (tx) => {
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
}

export async function closeProject(id: string, userId?: string) {
  const createdBy = await resolveUserId(userId);
  const db = await getDb();

  const project = await db.project.findUnique({ where: { id } });
  if (!project) throw new Error("Project not found");

  return db.$transaction(async (tx) => {
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
}

export async function issueSupplyToProject(data: IssueSupplyInput, userId?: string) {
  const parsed = issueSupplySchema.parse(data);
  const createdBy = await resolveUserId(userId);
  const db = await getDb();

  const project = await db.project.findUnique({ where: { id: parsed.projectId }, include: { client: true } });
  if (!project) throw new Error("Project not found");

  const result = await db.$transaction(async (tx) => {
    const invoiceNumber = await nextCode(tx, "salesInvoice", "invoiceNumber", "INV");
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

      const availableQty = stock.quantity - stock.reservedQty;
      if (availableQty < item.qty) {
        throw new Error(`${stock.product.name} has only ${availableQty} ${stock.product.unit} available in ${stock.warehouse.name}`);
      }

      // Resolve cost price (if Custom unit price override is not provided, fetch the active product variant projectPrice)
      let unitPrice = toDecimal(item.unitPrice);
      if (!item.unitPrice || unitPrice.lessThanOrEqualTo(0)) {
        const variant = await tx.productVariant.findFirst({
          where: { productId: item.productId, isActive: true },
          orderBy: { effectiveDate: "desc" },
        });
        if (!variant) throw new Error(`No active project variant price found for ${stock.product.name}`);
        unitPrice = toDecimal(variant.projectPrice);
      }

      const totalPrice = unitPrice.times(item.qty);
      subtotal = subtotal.plus(totalPrice);

      preparedItems.push({
        productId: item.productId,
        qty: item.qty,
        unitPrice,
        totalPrice,
        notes: item.notes,
        stock,
      });
    }

    const vatPercent = new Decimal(13);
    const vatAmount = subtotal.times(0.13);
    const totalAmount = subtotal.plus(vatAmount);

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
        notes: parsed.notes || `Material dispatch for project ${project.name}`,
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
        },
      });

      // Deduct inventory stock
      await tx.inventoryStock.update({
        where: { productId_warehouseId: { productId: item.productId, warehouseId: parsed.warehouseId } },
        data: { quantity: { decrement: item.qty } },
      });

      // Log StockTransaction type PROJECT_ISSUE
      await tx.stockTransaction.create({
        data: {
          type: "PROJECT_ISSUE",
          productId: item.productId,
          warehouseId: parsed.warehouseId,
          quantity: -item.qty,
          unitCost: item.unitPrice,
          referenceType: "SALES_INVOICE",
          referenceId: invoice.id,
          notes: item.notes || `Issued to contract site ${project.projectCode}`,
          userId: createdBy,
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

  return result;
}

export async function fetchInvoiceByIdAction(id: string) {
  const { getInvoiceById } = await import("../sales/queries");
  return getInvoiceById(id);
}
