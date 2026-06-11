import { getDb } from "@/lib/db";
import Decimal from "decimal.js";
import { z } from "zod";
import { serializeForClient } from "@/lib/utils";
import type { ProjectStatus } from "./types";
import {
  projectSchema,
  projectBillingSchema,
  materialUsageSchema,
  projectStatsSchema,
  projectProfitabilitySchema,
} from "./types";

type GetProjectsOptions = {
  status?: ProjectStatus | null;
  clientId?: string | null;
  page?: number;
  pageSize?: number;
};

export async function getProjects(opts: GetProjectsOptions = {}) {
  const { status = null, clientId = null, page = 1, pageSize = 25 } = opts;
  const db = await getDb();

  const where: any = {};
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;

  const [projects, total] = await Promise.all([
    db.project.findMany({
      where,
      include: {
        client: true,
        salesInvoices: {
          where: { status: { not: "CANCELLED" } },
          include: { items: true },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    db.project.count({ where }),
  ]);

  const data = await Promise.all(
    projects.map(async (p) => {
      const invoiceIds = p.salesInvoices.map((inv) => inv.id);
      
      const stockTxns = invoiceIds.length
        ? await db.stockTransaction.findMany({
            where: {
              referenceType: "SALES_INVOICE",
              referenceId: { in: invoiceIds },
              type: "PROJECT_ISSUE",
            },
          })
        : [];

      const materialCost = stockTxns.reduce(
        (sum, tx) => sum.plus(new Decimal(tx.unitCost).times(tx.quantity.abs())),
        new Decimal(0)
      );

      const totalBilled = p.salesInvoices.reduce(
        (sum, inv) => sum.plus(new Decimal(inv.totalAmount)),
        new Decimal(0)
      );

      const grossProfit = p.contractAmount.minus(totalBilled);
      const marginPercent = p.contractAmount.greaterThan(0)
        ? grossProfit.div(p.contractAmount).times(100)
        : new Decimal(0);

      return {
        id: p.id,
        projectCode: p.projectCode,
        name: p.name,
        clientId: p.clientId,
        clientName: p.client.name,
        clientPhone: p.client.phone,
        description: p.description,
        startDate: p.startDate?.toISOString() ?? null,
        endDate: p.endDate?.toISOString() ?? null,
        status: p.status,
        budgetAmount: p.budgetAmount.toString(),
        contractAmount: p.contractAmount.toString(),
        totalCost: materialCost.toString(),
        totalBilled: totalBilled.toString(),
        grossProfit: grossProfit.toString(),
        marginPercent: marginPercent.toFixed(1),
        notes: p.notes,
        createdAt: p.createdAt.toISOString(),
      };
    })
  );

  return serializeForClient({
    data: zArrayParser(projectProfitabilitySchema, data),
    pagination: { page, pageSize, total },
  });
}

export async function getProjectById(id: string) {
  const db = await getDb();

  const p = await db.project.findUnique({
    where: { id },
    include: {
      client: true,
      creator: true,
      salesInvoices: {
        where: { status: { not: "CANCELLED" } },
        include: {
          items: { include: { product: true, warehouse: true } },
        },
        orderBy: { invoiceDate: "desc" },
      },
      projectBilling: {
        include: { invoice: true },
        orderBy: { billingDate: "desc" },
      },
    },
  });

  if (!p) return null;

  const invoiceIds = p.salesInvoices.map((inv) => inv.id);

  const stockTxns = invoiceIds.length
    ? await db.stockTransaction.findMany({
        where: {
          referenceType: "SALES_INVOICE",
          referenceId: { in: invoiceIds },
          type: "PROJECT_ISSUE",
        },
        include: { product: true, warehouse: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const materialCost = stockTxns.reduce(
    (sum, tx) => sum.plus(new Decimal(tx.unitCost).times(tx.quantity.abs())),
    new Decimal(0)
  );

  const totalBilled = p.salesInvoices.reduce(
    (sum, inv) => sum.plus(new Decimal(inv.totalAmount)),
    new Decimal(0)
  );

  const grossProfit = p.contractAmount.minus(totalBilled);
  const marginPercent = p.contractAmount.greaterThan(0)
    ? grossProfit.div(p.contractAmount).times(100)
    : new Decimal(0);

  const mappedProject = {
    id: p.id,
    projectCode: p.projectCode,
    name: p.name,
    clientId: p.clientId,
    clientName: p.client.name,
    clientPhone: p.client.phone,
    clientAddress: p.client.address,
    clientPanNumber: p.client.panNumber,
    description: p.description,
    startDate: p.startDate?.toISOString() ?? null,
    endDate: p.endDate?.toISOString() ?? null,
    status: p.status,
    budgetAmount: p.budgetAmount.toString(),
    contractAmount: p.contractAmount.toString(),
    totalCost: materialCost.toString(),
    totalBilled: totalBilled.toString(),
    grossProfit: grossProfit.toString(),
    marginPercent: marginPercent.toFixed(1),
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
    creatorName: p.creator.name,
  };

  const mappedBillings = p.projectBilling.map((b) => ({
    id: b.id,
    projectId: b.projectId,
    invoiceId: b.invoiceId,
    invoiceNumber: b.invoice.invoiceNumber,
    billingDate: b.billingDate.toISOString(),
    amount: b.amount.toString(),
    notes: b.notes,
    status: b.invoice.status,
  }));

  const mappedMaterialUsage = stockTxns.map((tx) => ({
    id: tx.id,
    productId: tx.productId,
    productCode: tx.product.code,
    productName: tx.product.name,
    productUnit: tx.product.unit,
    qtyUsed: tx.quantity.abs().toNumber(),
    unitCost: tx.unitCost.toString(),
    totalCost: tx.unitCost.times(tx.quantity.abs()).toString(),
    warehouseName: tx.warehouse.name,
    dateUsed: tx.createdAt.toISOString(),
  }));

  return serializeForClient({
    project: mappedProject,
    billings: zArrayParser(projectBillingSchema, mappedBillings),
    materialUsage: zArrayParser(materialUsageSchema, mappedMaterialUsage),
  });
}

export async function getProjectStats() {
  const db = await getDb();

  const activeCount = await db.project.count({
    where: { status: "ACTIVE" },
  });

  const projects = await db.project.findMany({
    include: {
      salesInvoices: {
        where: { status: { not: "CANCELLED" } },
      },
    },
  });

  let totalRevenue = new Decimal(0);
  let totalCost = new Decimal(0);
  let totalContractValue = new Decimal(0);

  for (const p of projects) {
    const invoiceIds = p.salesInvoices.map((inv) => inv.id);
    const stockTxns = invoiceIds.length
      ? await db.stockTransaction.findMany({
          where: {
            referenceType: "SALES_INVOICE",
            referenceId: { in: invoiceIds },
            type: "PROJECT_ISSUE",
          },
        })
      : [];

    const materialCost = stockTxns.reduce(
      (sum, tx) => sum.plus(new Decimal(tx.unitCost).times(tx.quantity.abs())),
      new Decimal(0)
    );

    const billed = p.salesInvoices.reduce(
      (sum, inv) => sum.plus(new Decimal(inv.totalAmount)),
      new Decimal(0)
    );

    totalRevenue = totalRevenue.plus(billed);
    totalCost = totalCost.plus(materialCost);
    totalContractValue = totalContractValue.plus(new Decimal(p.contractAmount));
  }

  const totalProfit = totalContractValue.minus(totalRevenue);
  const avgMarginPercent = totalContractValue.greaterThan(0)
    ? totalProfit.div(totalContractValue).times(100)
    : new Decimal(0);

  return serializeForClient(
    projectStatsSchema.parse({
      activeCount,
      totalRevenue: totalRevenue.toString(),
      totalCost: totalCost.toString(),
      totalProfit: totalProfit.toString(),
      avgMarginPercent: avgMarginPercent.toFixed(1),
    })
  );
}

export async function getProjectProfitability(projectId?: string) {
  const db = await getDb();
  const where: any = {};
  if (projectId) where.id = projectId;

  const projects = await db.project.findMany({
    where,
    include: {
      client: true,
      salesInvoices: {
        where: { status: { not: "CANCELLED" } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = await Promise.all(
    projects.map(async (p) => {
      const invoiceIds = p.salesInvoices.map((inv) => inv.id);
      
      const stockTxns = invoiceIds.length
        ? await db.stockTransaction.findMany({
            where: {
              referenceType: "SALES_INVOICE",
              referenceId: { in: invoiceIds },
              type: "PROJECT_ISSUE",
            },
          })
        : [];

      const totalCost = stockTxns.reduce(
        (sum, tx) => sum.plus(new Decimal(tx.unitCost).times(tx.quantity.abs())),
        new Decimal(0)
      );

      const totalBilled = p.salesInvoices.reduce(
        (sum, inv) => sum.plus(new Decimal(inv.totalAmount)),
        new Decimal(0)
      );

      const grossProfit = p.contractAmount.minus(totalBilled);
      const marginPercent = p.contractAmount.greaterThan(0)
        ? grossProfit.div(p.contractAmount).times(100)
        : new Decimal(0);

      return {
        projectId: p.id,
        projectCode: p.projectCode,
        projectName: p.name,
        clientId: p.clientId,
        clientName: p.client.name,
        status: p.status,
        contractAmount: p.contractAmount.toString(),
        totalBilled: totalBilled.toString(),
        totalCost: totalCost.toString(),
        grossProfit: grossProfit.toString(),
        marginPercent: marginPercent.toFixed(1),
        startDate: p.startDate?.toISOString() ?? null,
        endDate: p.endDate?.toISOString() ?? null,
      };
    })
  );

  return serializeForClient(zArrayParser(projectProfitabilitySchema, data));
}

export async function getMaterialUsage(projectId: string) {
  const db = await getDb();

  const invoices = await db.salesInvoice.findMany({
    where: { projectId, status: { not: "CANCELLED" } },
    select: { id: true },
  });

  const invoiceIds = invoices.map((inv) => inv.id);
  if (invoiceIds.length === 0) return [];

  const stockTxns = await db.stockTransaction.findMany({
    where: {
      referenceType: "SALES_INVOICE",
      referenceId: { in: invoiceIds },
      type: "PROJECT_ISSUE",
    },
    include: { product: true, warehouse: true },
    orderBy: { createdAt: "desc" },
  });

  const data = stockTxns.map((tx) => ({
    id: tx.id,
    productId: tx.productId,
    productCode: tx.product.code,
    productName: tx.product.name,
    productUnit: tx.product.unit,
    qtyUsed: tx.quantity.abs().toNumber(),
    unitCost: tx.unitCost.toString(),
    totalCost: tx.unitCost.times(tx.quantity.abs()).toString(),
    warehouseName: tx.warehouse.name,
    dateUsed: tx.createdAt.toISOString(),
  }));

  return serializeForClient(zArrayParser(materialUsageSchema, data));
}

export async function getProjectBillings(projectId: string) {
  const db = await getDb();

  const billings = await db.projectBilling.findMany({
    where: { projectId },
    include: { invoice: true },
    orderBy: { billingDate: "desc" },
  });

  const data = billings.map((b) => ({
    id: b.id,
    projectId: b.projectId,
    invoiceId: b.invoiceId,
    invoiceNumber: b.invoice.invoiceNumber,
    billingDate: b.billingDate.toISOString(),
    amount: b.amount.toString(),
    notes: b.notes,
    status: b.invoice.status,
  }));

  return serializeForClient(zArrayParser(projectBillingSchema, data));
}

export async function getProjectLookups() {
  const db = await getDb();

  const [clients, products, warehouses] = await Promise.all([
    db.customer.findMany({ 
      where: { 
        isActive: true,
        customerType: "PROJECT"
      }, 
      orderBy: { name: "asc" } 
    }),
    db.product.findMany({
      where: { isActive: true },
      include: {
        variants: { where: { isActive: true }, orderBy: { effectiveDate: "desc" }, take: 1 },
        stockEntries: { include: { warehouse: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.warehouse.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return serializeForClient({
    clients: clients.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      customerType: c.customerType,
    })),
    products: products.map((p) => {
      const variant = p.variants[0];
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        unit: p.unit,
        purchaseUnit: p.purchaseUnit,
        purchaseConversionFactor: p.purchaseConversionFactor ? p.purchaseConversionFactor.toNumber() : 1,
        altSalesUnit: p.altSalesUnit,
        altSalesConversionFactor: p.altSalesConversionFactor ? p.altSalesConversionFactor.toNumber() : 1,
        projectPrice: variant?.projectPrice.toString() ?? "0",
        stockByWarehouse: p.stockEntries.map((stock) => ({
          warehouseId: stock.warehouseId,
          warehouseName: stock.warehouse.name,
          availableQty: Math.max(0, stock.quantity.minus(stock.reservedQty).toNumber()),
        })),
      };
    }),
    warehouses: warehouses.map((w) => ({
      id: w.id,
      name: w.name,
    })),
  });
}

// Small helper to parse array schemas strictly without throwing on empty values
function zArrayParser<T extends z.ZodTypeAny>(schema: T, data: any[]): z.infer<z.ZodArray<T>> {
  return z.array(schema).parse(data);
}
