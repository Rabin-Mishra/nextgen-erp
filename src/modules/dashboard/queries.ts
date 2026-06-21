import { getDb } from "@/lib/db";
import Decimal from "decimal.js";
import { InvoiceType, ProjectStatus, PurchaseOrderStatus } from "@/generated/prisma/client";
import { cache } from "react";
import { getCashBookSummary } from "../accounting/cashbook";
import { serializeForClient } from "@/lib/utils";

// Cache dashboard queries for the request duration to optimize performance
export const getDashboardKPIs = cache(async (month: number, year: number) => {
  const db = await getDb();
  
  // Date boundaries
  const startThisMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endThisMonth = new Date(year, month, 0, 23, 59, 59, 999);
  
  const lastMonthYear = month === 1 ? year - 1 : year;
  const lastMonthVal = month === 1 ? 12 : month - 1;
  const startLastMonth = new Date(lastMonthYear, lastMonthVal - 1, 1, 0, 0, 0, 0);
  const endLastMonth = new Date(lastMonthYear, lastMonthVal, 0, 23, 59, 59, 999);

  // 1. REVENUE (Sales Invoices taxable subtotal minus discounts)
  const invoicesThisMonth = await db.salesInvoice.findMany({
    where: { invoiceDate: { gte: startThisMonth, lte: endThisMonth }, status: { not: "CANCELLED" } },
    select: { subtotal: true, discountAmount: true }
  });
  let revThisMonth = new Decimal(0);
  for (const inv of invoicesThisMonth) {
    revThisMonth = revThisMonth.plus(new Decimal(inv.subtotal).minus(inv.discountAmount));
  }

  const invoicesLastMonth = await db.salesInvoice.findMany({
    where: { invoiceDate: { gte: startLastMonth, lte: endLastMonth }, status: { not: "CANCELLED" } },
    select: { subtotal: true, discountAmount: true }
  });
  let revLastMonth = new Decimal(0);
  for (const inv of invoicesLastMonth) {
    revLastMonth = revLastMonth.plus(new Decimal(inv.subtotal).minus(inv.discountAmount));
  }

  let revPctChange = 0;
  if (revLastMonth.greaterThan(0)) {
    revPctChange = revThisMonth.minus(revLastMonth).div(revLastMonth).times(100).toNumber();
  }

  // 2. EXPENSES (PAID CashBookEntries with no supplier link + Depreciations)
  const expensesThisMonth = await db.cashBookEntry.findMany({
    where: { entryDate: { gte: startThisMonth, lte: endThisMonth }, type: "PAID", partyId: null },
    select: { amount: true }
  });
  const depsThisMonth = await db.depreciationEntry.aggregate({
    where: { createdAt: { gte: startThisMonth, lte: endThisMonth } },
    _sum: { amount: true }
  });
  let expThisMonth = new Decimal(0);
  for (const e of expensesThisMonth) expThisMonth = expThisMonth.plus(e.amount);
  expThisMonth = expThisMonth.plus(depsThisMonth._sum.amount || 0);

  const expensesLastMonth = await db.cashBookEntry.findMany({
    where: { entryDate: { gte: startLastMonth, lte: endLastMonth }, type: "PAID", partyId: null },
    select: { amount: true }
  });
  const depsLastMonth = await db.depreciationEntry.aggregate({
    where: { createdAt: { gte: startLastMonth, lte: endLastMonth } },
    _sum: { amount: true }
  });
  let expLastMonth = new Decimal(0);
  for (const e of expensesLastMonth) expLastMonth = expLastMonth.plus(e.amount);
  expLastMonth = expLastMonth.plus(depsLastMonth._sum.amount || 0);

  let expPctChange = 0;
  if (expLastMonth.greaterThan(0)) {
    expPctChange = expThisMonth.minus(expLastMonth).div(expLastMonth).times(100).toNumber();
  }

  // 3. PROJECTS (ACTIVE/ON_HOLD vs PLANNING/PENDING)
  const activeProjectsCount = await db.project.count({
    where: { status: { in: ["ACTIVE", "ON_HOLD"] } }
  });
  const planningProjectsCount = await db.project.count({
    where: { status: "PLANNING" }
  });

  // 4. LOW STOCK ITEMS (Stock below reorder level)
  const products = await db.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      reorderLevel: true,
      stockEntries: { select: { quantity: true } }
    }
  });

  let lowStockCount = 0;
  for (const p of products) {
    const stockQty = p.stockEntries.reduce((sum, entry) => sum + entry.quantity.toNumber(), 0);
    const reorderVal = p.reorderLevel === null || p.reorderLevel === undefined
      ? 0
      : (typeof p.reorderLevel === "number" ? p.reorderLevel : Number(p.reorderLevel.toString()));
    if (stockQty <= reorderVal) {
      lowStockCount++;
    }
  }

  return serializeForClient({
    revenue: {
      thisMonth: revThisMonth.toString(),
      pctChange: Math.round(revPctChange * 100) / 100
    },
    expenses: {
      thisMonth: expThisMonth.toString(),
      pctChange: Math.round(expPctChange * 100) / 100
    },
    projects: {
      activeCount: activeProjectsCount,
      planningCount: planningProjectsCount
    },
    lowStock: {
      count: lowStockCount
    }
  });
});

export async function getRecentInvoices(limit = 5) {
  const db = await getDb();
  const invoices = await db.salesInvoice.findMany({
    orderBy: { invoiceDate: "desc" },
    take: limit,
    include: { customer: { select: { name: true } } }
  });

  return serializeForClient(
    invoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customer.name,
      date: inv.invoiceDate.toISOString().split("T")[0],
      amount: inv.totalAmount.toString(),
      status: inv.status,
      invoiceType: inv.invoiceType
    }))
  );
}

export async function getCashSummary(date: string) {
  return serializeForClient(await getCashBookSummary(date));
}

export async function getLowStockAlerts(limit = 5) {
  const db = await getDb();
  
  const products = await db.product.findMany({
    where: { isActive: true },
    include: { stockEntries: { select: { quantity: true } } }
  });

  const alerts = products
    .map(p => {
      const stockQty = p.stockEntries.reduce((sum, entry) => sum + entry.quantity.toNumber(), 0);
      const reorderVal = p.reorderLevel === null || p.reorderLevel === undefined
        ? 0
        : (typeof p.reorderLevel === "number" ? p.reorderLevel : Number(p.reorderLevel.toString()));
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        stock: stockQty,
        reorderAt: reorderVal
      };
    })
    .filter(item => item.stock <= item.reorderAt)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, limit);

  return serializeForClient(alerts);
}

export async function getPendingVendorPayments(limit = 5) {
  const db = await getDb();
  const today = new Date();

  const orders = await db.purchaseOrder.findMany({
    where: {
      status: { in: ["ORDERED", "PARTIAL", "RECEIVED"] }
    },
    include: { supplier: { select: { name: true } } },
    orderBy: { expectedDate: "asc" }
  });

  const pending = orders
    .map(o => {
      const total = new Decimal(o.totalAmount);
      const paid = new Decimal(o.paidAmount);
      const due = total.minus(paid);
      
      const expected = o.expectedDate ? new Date(o.expectedDate) : new Date(o.orderDate);
      const overdueMs = today.getTime() - expected.getTime();
      const daysOverdue = overdueMs > 0 ? Math.ceil(overdueMs / (1000 * 60 * 60 * 24)) : 0;

      return {
        id: o.id,
        vendorName: o.supplier.name,
        poNumber: o.poNumber,
        amountDue: due.toString(),
        dueDate: expected.toISOString().split("T")[0],
        daysOverdue
      };
    })
    .filter(o => Number(o.amountDue) > 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, limit);

  return serializeForClient(pending);
}

export async function getActiveProjectsSummary() {
  const db = await getDb();

  const projects = await db.project.findMany({
    where: { status: { in: ["ACTIVE", "ON_HOLD", "COMPLETED"] } },
    include: {
      client: { select: { name: true } },
      salesInvoices: {
        where: { status: { not: "CANCELLED" } },
        select: { id: true, totalAmount: true }
      }
    }
  });

  const summary = [];

  for (const prj of projects) {
    let totalBilled = new Decimal(0);
    for (const inv of prj.salesInvoices) {
      totalBilled = totalBilled.plus(new Decimal(inv.totalAmount));
    }

    const invoiceIds = prj.salesInvoices.map((inv) => inv.id);

    const issues = invoiceIds.length
      ? await db.stockTransaction.findMany({
          where: {
            referenceType: "SALES_INVOICE",
            referenceId: { in: invoiceIds },
            type: "PROJECT_ISSUE"
          },
          select: { quantity: true, unitCost: true }
        })
      : [];

    let materialCost = new Decimal(0);
    for (const is of issues) {
      const qty = new Decimal(is.quantity).abs();
      materialCost = materialCost.plus(qty.times(is.unitCost));
    }

    const budget = new Decimal(prj.budgetAmount || 1);
    const contract = new Decimal(prj.contractAmount || 1);
    
    const netProfit = contract.minus(totalBilled);
    const margin = contract.greaterThan(0) ? netProfit.div(contract).times(100).toNumber() : 0;

    summary.push({
      id: prj.id,
      name: prj.name,
      clientName: prj.client.name,
      contractAmount: contract.toString(),
      totalBilled: totalBilled.toString(),
      materialCost: materialCost.toString(),
      margin: Math.round(margin * 10) / 10,
      status: prj.status
    });
  }

  return serializeForClient(summary);
}

export async function getMonthlyRevenueByChannel(monthsCount = 6) {
  const db = await getDb();
  const today = new Date();
  
  const results = [];

  for (let i = monthsCount - 1; i >= 0; i--) {
    const targetMonthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const m = targetMonthDate.getMonth() + 1;
    const y = targetMonthDate.getFullYear();

    const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const end = new Date(y, m, 0, 23, 59, 59, 999);

    const invoices = await db.salesInvoice.findMany({
      where: { invoiceDate: { gte: start, lte: end }, status: { not: "CANCELLED" } },
      select: { invoiceType: true, subtotal: true, discountAmount: true }
    });

    let retail = new Decimal(0);
    let wholesale = new Decimal(0);
    let project = new Decimal(0);

    for (const inv of invoices) {
      const net = new Decimal(inv.subtotal).minus(inv.discountAmount);
      if (inv.invoiceType === "RETAIL") retail = retail.plus(net);
      else if (inv.invoiceType === "WHOLESALE") wholesale = wholesale.plus(net);
      else if (inv.invoiceType === "PROJECT") project = project.plus(net);
    }

    results.push({
      month: targetMonthDate.toLocaleString("default", { month: "short" }),
      RETAIL: retail.toNumber(),
      WHOLESALE: wholesale.toNumber(),
      PROJECT: project.toNumber()
    });
  }

  return serializeForClient(results);
}

export async function getDashboardSearchData() {
  const db = await getDb();
  
  const [customers, suppliers, invoices, pos] = await Promise.all([
    db.customer.findMany({ where: { isActive: true }, select: { id: true, name: true, code: true, phone: true } }),
    db.supplier.findMany({ where: { isActive: true }, select: { id: true, name: true, code: true, phone: true } }),
    db.salesInvoice.findMany({ select: { id: true, invoiceNumber: true, customer: { select: { name: true } }, totalAmount: true, status: true }, orderBy: { invoiceDate: "desc" }, take: 100 }),
    db.purchaseOrder.findMany({ select: { id: true, poNumber: true, supplier: { select: { name: true } }, totalAmount: true, status: true }, orderBy: { orderDate: "desc" }, take: 100 }),
  ]);

  const customerBalances = await Promise.all(
    customers.map(async (c) => {
      const latest = await db.ledgerEntry.findFirst({
        where: { partyType: "CUSTOMER", partyId: c.id },
        orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
      });
      return {
        id: c.id,
        name: c.name,
        code: c.code,
        phone: c.phone || "",
        balance: latest?.runningBalance?.toString() ?? "0.00",
      };
    })
  );

  const supplierBalances = await Promise.all(
    suppliers.map(async (s) => {
      const latest = await db.ledgerEntry.findFirst({
        where: { partyType: "SUPPLIER", partyId: s.id },
        orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
      });
      return {
        id: s.id,
        name: s.name,
        code: s.code,
        phone: s.phone || "",
        balance: latest?.runningBalance?.toString() ?? "0.00",
      };
    })
  );

  return serializeForClient({
    customers: customerBalances,
    vendors: supplierBalances,
    invoices: invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customer.name,
      totalAmount: inv.totalAmount.toString(),
      status: inv.status,
    })),
    purchaseOrders: pos.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      supplierName: po.supplier.name,
      totalAmount: po.totalAmount.toString(),
      status: po.status,
    })),
  });
}
