import { getDb } from "@/lib/db";
import Decimal from "decimal.js";
import type { PurchaseOrderStatus } from "@/generated/prisma/client";
import { serializeForClient } from "@/lib/utils";
import {
  pendingPaymentSchema,
  purchaseOrderSchema,
  purchaseStatsSchema,
  supplierSchema,
  vendorLedgerEntrySchema,
} from "./types";

type GetPurchaseOrdersOptions = {
  status?: PurchaseOrderStatus | null;
  supplierId?: string | null;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  page?: number;
  pageSize?: number;
};

function toDecimal(value: Decimal.Value | null | undefined) {
  return new Decimal(value ?? 0);
}

function mapPurchaseOrder(po: any, payments: any[] = []) {
  const subtotal = toDecimal(po.subtotal);
  const discountAmount = toDecimal(po.discountAmount);
  const taxAmount = toDecimal(po.taxAmount);
  const totalAmount = po.totalAmount ? toDecimal(po.totalAmount) : subtotal.minus(discountAmount).plus(taxAmount);
  const paidAmount = toDecimal(po.paidAmount);
  const balance = totalAmount.minus(paidAmount);

  return purchaseOrderSchema.parse({
    id: po.id,
    poNumber: po.poNumber,
    supplierId: po.supplierId,
    supplierName: po.supplier.name,
    supplierPanNumber: po.supplier.panNumber,
    supplierPhone: po.supplier.phone,
    status: po.status,
    orderDate: po.orderDate.toISOString(),
    expectedDate: po.expectedDate?.toISOString() ?? null,
    notes: po.notes,
    subtotal: subtotal.toString(),
    discountAmount: discountAmount.toString(),
    taxAmount: taxAmount.toString(),
    totalAmount: totalAmount.toString(),
    paidAmount: paidAmount.toString(),
    balance: balance.toString(),
    billImageUrl: po.billImageUrl,
    items: po.items.map((item: any) => ({
      id: item.id,
      purchaseOrderId: item.purchaseOrderId,
      productId: item.productId,
      productCode: item.product.code,
      productName: item.product.name,
      productUnit: item.orderedUnit || item.product.unit,
      orderedQty: Number(item.orderedQty.toString()),
      receivedQty: Number(item.receivedQty.toString()),
      unitPrice: item.unitPrice.toString(),
      totalPrice: item.totalPrice.toString(),
      notes: item.notes,
      orderedUnit: item.orderedUnit || item.product.unit,
      conversionFactor: item.conversionFactor ? item.conversionFactor.toString() : "1",
      baseQtyEquivalent: item.baseQtyEquivalent ? item.baseQtyEquivalent.toString() : item.orderedQty.toString(),
      productBaseUnit: item.product.unit,
      productPurchaseUnit: item.product.purchaseUnit || null,
      productPurchaseConversionFactor: item.product.purchaseConversionFactor ? item.product.purchaseConversionFactor.toString() : null,
    })),
    payments: payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount.toString(),
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate.toISOString(),
      notes: payment.notes,
    })),
    createdAt: po.createdAt.toISOString(),
  });
}

function mapSupplier(supplier: any) {
  return supplierSchema.parse({
    id: supplier.id,
    code: supplier.code,
    name: supplier.name,
    contactPerson: supplier.contactPerson,
    phone: supplier.phone,
    email: supplier.email,
    address: supplier.address,
    panNumber: supplier.panNumber,
    openingBalance: supplier.openingBalance.toString(),
    notes: supplier.notes,
    isActive: supplier.isActive,
    createdAt: supplier.createdAt.toISOString(),
  });
}

export async function getPurchaseOrders(opts: GetPurchaseOrdersOptions = {}) {
  const { status = null, supplierId = null, dateFrom = null, dateTo = null, page = 1, pageSize = 25 } = opts;
  const db = await getDb();

  const where: any = {};
  if (status) where.status = status;
  if (supplierId) where.supplierId = supplierId;
  if (dateFrom || dateTo) {
    where.orderDate = {};
    if (dateFrom) where.orderDate.gte = dateFrom;
    if (dateTo) where.orderDate.lte = dateTo;
  }

  const [orders, total] = await Promise.all([
    db.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        items: { include: { product: true }, orderBy: { id: "asc" } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { orderDate: "desc" },
    }),
    db.purchaseOrder.count({ where }),
  ]);

  return serializeForClient({
    data: orders.map((po) => mapPurchaseOrder(po)),
    pagination: { page, pageSize, total },
  });
}

export async function getPOById(id: string) {
  const db = await getDb();

  const po = await db.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: { include: { product: true }, orderBy: { id: "asc" } },
    },
  });

  if (!po) return null;

  const payments = await db.payment.findMany({
    where: { referenceType: "PURCHASE", referenceId: id, partyType: "SUPPLIER" },
    orderBy: { paymentDate: "asc" },
  });

  return serializeForClient(mapPurchaseOrder(po, payments));
}

export async function getPurchaseStats() {
  const db = await getDb();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [thisMonthOrders, payableOrders, activeVendors] = await Promise.all([
    db.purchaseOrder.findMany({
      where: {
        orderDate: { gte: monthStart, lte: now },
        status: { not: "CANCELLED" },
      },
    }),
    db.purchaseOrder.findMany({
      where: {
        status: { in: ["ORDERED", "PARTIAL", "RECEIVED"] },
      },
    }),
    db.supplier.count({ where: { isActive: true } }),
  ]);

  const thisMonthTotal = thisMonthOrders.reduce((sum, po) => sum.plus(po.totalAmount), new Decimal(0));
  const pendingPayments = payableOrders.reduce((sum, po) => {
    const balance = toDecimal(po.totalAmount).minus(po.paidAmount);
    return balance.greaterThan(0) ? sum.plus(balance) : sum;
  }, new Decimal(0));

  return serializeForClient(
    purchaseStatsSchema.parse({
      thisMonthTotal: thisMonthTotal.toString(),
      pendingPayments: pendingPayments.toString(),
      activeVendors,
    })
  );
}

export async function getSuppliers(search?: string, page = 1, pageSize = 25) {
  const db = await getDb();

  const where: any = {};
  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { contactPerson: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { panNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  const [suppliers, total] = await Promise.all([
    db.supplier.findMany({
      where,
      include: {
        _count: {
          select: { purchaseOrders: true }
        }
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { name: "asc" },
    }),
    db.supplier.count({ where }),
  ]);

  const supplierBalances = await Promise.all(
    suppliers.map(async (supplier) => {
      const latest = await db.ledgerEntry.findFirst({
        where: { partyType: "SUPPLIER", partyId: supplier.id },
        orderBy: { createdAt: "desc" },
      });
      return {
        ...mapSupplier(supplier),
        balance: latest?.runningBalance?.toString() ?? supplier.openingBalance.toString(),
        purchaseOrdersCount: (supplier as any)._count?.purchaseOrders ?? 0,
      };
    })
  );

  return serializeForClient({
    data: supplierBalances,
    pagination: { page, pageSize, total },
  });
}

export async function getSupplierById(id: string) {
  const db = await getDb();
  const supplier = await db.supplier.findUnique({ where: { id } });
  if (!supplier) return null;

  return serializeForClient({
    ...mapSupplier(supplier),
    ledger: await getVendorLedger(id),
  });
}

export async function getPendingPayments() {
  const db = await getDb();

  const orders = await db.purchaseOrder.findMany({
    where: {
      status: { in: ["ORDERED", "PARTIAL", "RECEIVED"] },
    },
    include: { supplier: true },
    orderBy: { orderDate: "asc" },
  });

  const pending = orders
    .map((po) => {
      const total = toDecimal(po.totalAmount);
      const paidAmount = toDecimal(po.paidAmount);
      const balance = total.minus(paidAmount);
      const daysOverdue = Math.max(0, Math.floor((Date.now() - po.orderDate.getTime()) / (1000 * 60 * 60 * 24)));

      return { po, total, paidAmount, balance, daysOverdue };
    })
    .filter(({ balance }) => balance.greaterThan(0))
    .map(({ po, total, paidAmount, balance, daysOverdue }) =>
      pendingPaymentSchema.parse({
        id: po.id,
        poNumber: po.poNumber,
        supplierName: po.supplier.name,
        total: total.toString(),
        paidAmount: paidAmount.toString(),
        balance: balance.toString(),
        daysOverdue,
      })
    );

  return serializeForClient(pending);
}

export async function getVendorLedger(supplierId: string, dateFrom?: Date, dateTo?: Date) {
  const db = await getDb();

  const where: any = { partyId: supplierId, partyType: "SUPPLIER" };
  if (dateFrom || dateTo) {
    where.entryDate = {};
    if (dateFrom) where.entryDate.gte = dateFrom;
    if (dateTo) where.entryDate.lte = dateTo;
  }

  const entries = await db.ledgerEntry.findMany({
    where,
    orderBy: { createdAt: "asc" },
  });

  const mapped = entries.map((entry) => {
    const credit = entry.entryType === "CREDIT" ? entry.amount : new Decimal(0);
    const debit = entry.entryType === "DEBIT" ? entry.amount : new Decimal(0);

    return vendorLedgerEntrySchema.parse({
      id: entry.id,
      entryDate: entry.entryDate.toISOString(),
      description: entry.description,
      debit: debit.toString(),
      credit: credit.toString(),
      balance: entry.runningBalance.toString(),
      entryType: entry.entryType,
    });
  });

  const sorted = mapped.sort((a, b) => {
    const dA = new Date(a.entryDate);
    const dB = new Date(b.entryDate);
    const timeA = new Date(dA.getFullYear(), dA.getMonth(), dA.getDate()).getTime();
    const timeB = new Date(dB.getFullYear(), dB.getMonth(), dB.getDate()).getTime();
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    const indexA = entries.findIndex((e) => e.id === a.id);
    const indexB = entries.findIndex((e) => e.id === b.id);
    return indexA - indexB;
  });

  return serializeForClient(sorted);
}

export async function getActiveProducts() {
  const db = await getDb();
  const products = await db.product.findMany({
    where: { isActive: true },
    include: {
      variants: {
        where: { isActive: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const mapped = products.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    unit: p.unit,
    purchaseUnit: p.purchaseUnit,
    purchaseConversionFactor: p.purchaseConversionFactor ? p.purchaseConversionFactor.toString() : null,
    altSalesUnit: p.altSalesUnit,
    altSalesConversionFactor: p.altSalesConversionFactor ? p.altSalesConversionFactor.toString() : null,
    variants: p.variants.map((v) => ({
      supplierId: v.supplierId,
      purchasePrice: v.purchasePrice.toString(),
    })),
  }));

  return serializeForClient(mapped);
}

export async function getPurchaseReturns(supplierId?: string) {
  const db = await getDb();
  const where: any = {};
  if (supplierId) where.supplierId = supplierId;

  const returns = await db.purchaseReturn.findMany({
    where,
    include: {
      supplier: true,
      items: {
        include: { product: true },
      },
    },
    orderBy: { returnDate: "desc" },
  });

  return serializeForClient(returns);
}

