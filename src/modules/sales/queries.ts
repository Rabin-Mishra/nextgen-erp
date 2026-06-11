import { getDb } from "@/lib/db";
import Decimal from "decimal.js";
import { serializeForClient } from "@/lib/utils";
import type { ChannelType, CustomerType, InvoiceStatus, InvoiceType } from "@/generated/prisma/client";
import {
  customerLedgerEntrySchema,
  customerOptionSchema,
  customerSchema,
  outstandingDueSchema,
  productOptionSchema,
  projectOptionSchema,
  revenueByChannelSchema,
  salesInvoiceSchema,
  salesReturnSchema,
  salesStatsSchema,
  warehouseOptionSchema,
} from "./types";

type GetSalesInvoicesOptions = {
  channel?: InvoiceType | null;
  customerId?: string | null;
  status?: InvoiceStatus | null;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  page?: number;
  pageSize?: number;
};

type SalesDateRange = {
  dateFrom?: Date | null;
  dateTo?: Date | null;
};

function toDecimal(value: Decimal.Value | null | undefined) {
  return new Decimal(value ?? 0);
}

function mapInvoice(invoice: any, payments: any[] = [], returns: any[] = []) {
  return salesInvoiceSchema.parse({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    customerName: invoice.customer.name,
    customerPhone: invoice.customer.phone,
    customerPanNumber: invoice.customer.panNumber,
    customerAddress: invoice.customer.address,
    invoiceType: invoice.invoiceType,
    projectId: invoice.projectId,
    projectName: invoice.project?.name ?? null,
    invoiceDate: invoice.invoiceDate.toISOString(),
    dueDate: invoice.dueDate?.toISOString() ?? null,
    status: invoice.status,
    subtotal: invoice.subtotal.toString(),
    discountPercent: invoice.discountPercent.toString(),
    discountAmount: invoice.discountAmount.toString(),
    vatPercent: invoice.vatPercent.toString(),
    vatAmount: invoice.vatAmount.toString(),
    totalAmount: invoice.totalAmount.toString(),
    paidAmount: invoice.paidAmount.toString(),
    balanceAmount: invoice.balanceAmount.toString(),
    paymentMethod: invoice.paymentMethod,
    notes: invoice.notes,
    items: invoice.items.map((item: any) => ({
      id: item.id,
      invoiceId: item.invoiceId,
      productId: item.productId,
      productCode: item.product.code,
      productName: item.product.name,
      productUnit: item.salesUnit || item.product.unit,
      warehouseId: item.warehouseId,
      warehouseName: item.warehouse.name,
      qty: Number(item.qty.toString()),
      unitPrice: item.unitPrice.toString(),
      discountPercent: item.discountPercent.toString(),
      totalPrice: item.totalPrice.toString(),
      notes: item.notes,
      salesUnit: item.salesUnit || item.product.unit,
      conversionFactor: item.conversionFactor ? item.conversionFactor.toString() : "1",
      baseQtyEquivalent: item.baseQtyEquivalent ? item.baseQtyEquivalent.toString() : item.qty.toString(),
      productBaseUnit: item.product.unit,
      productAltSalesUnit: item.product.altSalesUnit || null,
      productAltSalesConversionFactor: item.product.altSalesConversionFactor ? item.product.altSalesConversionFactor.toString() : null,
    })),
    payments: payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount.toString(),
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate.toISOString(),
      notes: payment.notes,
    })),
    returns: returns.map((ret) => ({
      id: ret.id,
      returnNumber: ret.returnNumber,
      returnDate: ret.returnDate.toISOString(),
      totalAmount: ret.totalAmount.toString(),
      notes: ret.notes,
      items: ret.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productCode: item.product.code,
        productName: item.product.name,
        productUnit: item.product.unit,
        qty: Number(item.qty.toString()),
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
      })),
    })),
    createdAt: invoice.createdAt.toISOString(),
  });
}

function mapCustomer(customer: any) {
  return customerSchema.parse({
    id: customer.id,
    code: customer.code,
    name: customer.name,
    contactPerson: customer.contactPerson,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    panNumber: customer.panNumber,
    customerType: customer.customerType,
    creditLimit: customer.creditLimit.toString(),
    openingBalance: customer.openingBalance.toString(),
    notes: customer.notes,
    isActive: customer.isActive,
    createdAt: customer.createdAt.toISOString(),
  });
}

export async function getSalesInvoices(opts: GetSalesInvoicesOptions = {}) {
  const { channel = null, customerId = null, status = null, dateFrom = null, dateTo = null, page = 1, pageSize = 25 } = opts;
  const db = await getDb();

  const where: any = {};
  if (channel) where.invoiceType = channel;
  if (customerId) where.customerId = customerId;
  if (status) where.status = status;
  if (dateFrom || dateTo) {
    where.invoiceDate = {};
    if (dateFrom) where.invoiceDate.gte = dateFrom;
    if (dateTo) where.invoiceDate.lte = dateTo;
  }

  const [invoices, total] = await Promise.all([
    db.salesInvoice.findMany({
      where,
      include: {
        customer: true,
        project: true,
        items: { include: { product: true, warehouse: true }, orderBy: { id: "asc" } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { invoiceDate: "desc" },
    }),
    db.salesInvoice.count({ where }),
  ]);

  return serializeForClient({
    data: invoices.map((invoice) => mapInvoice(invoice)),
    pagination: { page, pageSize, total },
  });
}

export async function getInvoiceById(id: string) {
  const db = await getDb();

  const invoice = await db.salesInvoice.findUnique({
    where: { id },
    include: {
      customer: true,
      project: true,
      items: { include: { product: true, warehouse: true }, orderBy: { id: "asc" } },
    },
  });

  if (!invoice) return null;

  const payments = await db.payment.findMany({
    where: { referenceType: "INVOICE", referenceId: id, partyType: "CUSTOMER" },
    orderBy: { paymentDate: "asc" },
  });

  const returns = await db.salesReturn.findMany({
    where: { invoiceId: id },
    include: {
      items: { include: { product: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return serializeForClient(mapInvoice(invoice, payments, returns));
}

export async function getSalesStats(dateRange: SalesDateRange = {}) {
  const db = await getDb();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const returnWhere: any = { type: "RETURN_IN", referenceType: "SALES_RETURN" };
  if (dateRange.dateFrom || dateRange.dateTo) {
    returnWhere.createdAt = {};
    if (dateRange.dateFrom) returnWhere.createdAt.gte = dateRange.dateFrom;
    if (dateRange.dateTo) returnWhere.createdAt.lte = dateRange.dateTo;
  }

  const [todayInvoices, monthInvoices, lastMonthInvoices, outstandingInvoices, returns] = await Promise.all([
    db.salesInvoice.findMany({
      where: { invoiceDate: { gte: todayStart, lte: todayEnd }, status: { not: "CANCELLED" } },
    }),
    db.salesInvoice.findMany({
      where: { invoiceDate: { gte: monthStart, lte: now }, status: { not: "CANCELLED" } },
    }),
    db.salesInvoice.findMany({
      where: { invoiceDate: { gte: lastMonthStart, lte: lastMonthEnd }, status: { not: "CANCELLED" } },
    }),
    db.salesInvoice.findMany({
      where: { status: { in: ["SENT", "PARTIAL", "OVERDUE"] }, balanceAmount: { gt: 0 } },
    }),
    db.stockTransaction.findMany({ where: returnWhere }),
  ]);

  const todaySales = todayInvoices.reduce((sum, invoice) => sum.plus(invoice.totalAmount), new Decimal(0));
  const monthlyRevenue = monthInvoices.reduce((sum, invoice) => sum.plus(invoice.totalAmount), new Decimal(0));
  const lastMonthRevenue = lastMonthInvoices.reduce((sum, invoice) => sum.plus(invoice.totalAmount), new Decimal(0));
  const outstanding = outstandingInvoices.reduce((sum, invoice) => sum.plus(invoice.balanceAmount), new Decimal(0));
  const returnsValue = returns.reduce((sum, entry) => sum.plus(toDecimal(entry.unitCost).times(entry.quantity)), new Decimal(0));
  const growth = lastMonthRevenue.equals(0) ? new Decimal(0) : monthlyRevenue.minus(lastMonthRevenue).div(lastMonthRevenue).times(100);

  return serializeForClient(
    salesStatsSchema.parse({
      todaySales: todaySales.toString(),
      monthlyRevenue: monthlyRevenue.toString(),
      monthlyGrowthPercent: growth.toFixed(1),
      outstanding: outstanding.toString(),
      returns: returnsValue.toString(),
    })
  );
}

export async function getCustomers(search?: string, type?: CustomerType, page = 1, pageSize = 25) {
  const db = await getDb();
  const where: any = {};
  if (type) where.customerType = type;
  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { contactPerson: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { panNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  const [customers, total] = await Promise.all([
    db.customer.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { name: "asc" } }),
    db.customer.count({ where }),
  ]);

  const customerBalances = await Promise.all(
    customers.map(async (customer) => {
      const latest = await db.ledgerEntry.findFirst({
        where: { partyType: "CUSTOMER", partyId: customer.id },
        orderBy: { createdAt: "desc" },
      });
      return {
        ...mapCustomer(customer),
        balance: latest?.runningBalance?.toString() ?? customer.openingBalance.toString(),
      };
    })
  );

  return serializeForClient({
    data: customerBalances,
    pagination: { page, pageSize, total },
  });
}

export async function getCustomerById(id: string) {
  const db = await getDb();
  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) return null;

  const ledger = await getCustomerLedger(id);
  const latest = ledger.at(-1);

  return serializeForClient({
    ...mapCustomer(customer),
    ledger,
    balance: latest?.balance ?? customer.openingBalance.toString(),
  });
}

export async function getOutstandingDues() {
  const db = await getDb();
  const customers = await db.customer.findMany({
    where: {
      isActive: true,
      salesInvoices: {
        some: { status: { in: ["SENT", "PARTIAL", "OVERDUE"] }, balanceAmount: { gt: 0 } },
      },
    },
    include: { salesInvoices: { where: { status: { not: "CANCELLED" } }, orderBy: { invoiceDate: "desc" } } },
  });

  return serializeForClient(
    customers
      .map((customer) => {
        const totalBilled = customer.salesInvoices.reduce((sum, invoice) => sum.plus(invoice.totalAmount), new Decimal(0));
        const totalPaid = customer.salesInvoices.reduce((sum, invoice) => sum.plus(invoice.paidAmount), new Decimal(0));
        const balance = customer.salesInvoices.reduce((sum, invoice) => sum.plus(invoice.balanceAmount), new Decimal(0));
        const lastInvoice = customer.salesInvoices[0];
        const overdueBasis = lastInvoice?.dueDate ?? lastInvoice?.invoiceDate ?? null;
        const daysOverdue = overdueBasis ? Math.max(0, Math.floor((Date.now() - overdueBasis.getTime()) / 86_400_000)) : 0;

        return outstandingDueSchema.parse({
          customerId: customer.id,
          customerName: customer.name,
          customerType: customer.customerType,
          totalBilled: totalBilled.toString(),
          totalPaid: totalPaid.toString(),
          balance: balance.toString(),
          lastInvoiceDate: lastInvoice?.invoiceDate.toISOString() ?? null,
          daysOverdue,
        });
      })
      .sort((a, b) => Number(b.balance) - Number(a.balance))
  );
}

export async function getRevenueByChannel(month: number, year: number) {
  const db = await getDb();
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const invoices = await db.salesInvoice.findMany({
    where: { invoiceDate: { gte: start, lte: end }, status: { not: "CANCELLED" } },
  });

  const totals = invoices.reduce(
    (acc, invoice) => {
      acc[invoice.invoiceType] = acc[invoice.invoiceType].plus(invoice.totalAmount);
      return acc;
    },
    { RETAIL: new Decimal(0), WHOLESALE: new Decimal(0), PROJECT: new Decimal(0) } as Record<InvoiceType, Decimal>
  );

  return serializeForClient(
    revenueByChannelSchema.parse({
      retail: totals.RETAIL.toString(),
      wholesale: totals.WHOLESALE.toString(),
      project: totals.PROJECT.toString(),
    })
  );
}

export async function getCustomerLedger(customerId: string, dateFrom?: Date, dateTo?: Date, channel?: ChannelType | "ALL") {
  const db = await getDb();
  const where: any = { partyId: customerId, partyType: "CUSTOMER" };
  if (channel && channel !== "ALL") where.channelType = channel;
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
    const debit = entry.entryType === "DEBIT" ? entry.amount : new Decimal(0);
    const credit = entry.entryType === "CREDIT" ? entry.amount : new Decimal(0);

    return customerLedgerEntrySchema.parse({
      id: entry.id,
      entryDate: entry.entryDate.toISOString(),
      description: entry.description,
      channelType: entry.channelType,
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

export async function getSalesReturns(page = 1, pageSize = 25) {
  const db = await getDb();
  const [returns, total] = await Promise.all([
    db.salesReturn.findMany({
      include: {
        invoice: true,
        customer: true,
        items: {
          include: { product: true, warehouse: true }
        }
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { returnDate: "desc" },
    }),
    db.salesReturn.count(),
  ]);

  return serializeForClient({
    data: returns,
    pagination: { page, pageSize, total }
  });
}

export async function getInvoiceFormLookups() {
  const db = await getDb();
  const [customers, products, warehouses, projects] = await Promise.all([
    db.customer.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.product.findMany({
      where: { isActive: true },
      include: {
        variants: { where: { isActive: true }, orderBy: { effectiveDate: "desc" } },
        stockEntries: { include: { warehouse: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.warehouse.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.project.findMany({ where: { status: { in: ["PLANNING", "ACTIVE"] } }, orderBy: { name: "asc" } }),
  ]);

  const customerBalances = await Promise.all(
    customers.map(async (customer) => {
      const latest = await db.ledgerEntry.findFirst({
        where: { partyType: "CUSTOMER", partyId: customer.id },
        orderBy: { createdAt: "desc" },
      });
      return [customer.id, latest?.runningBalance?.toString() ?? customer.openingBalance.toString()] as const;
    })
  );
  const balanceByCustomer = new Map(customerBalances);

  return serializeForClient({
    customers: customers.map((customer) =>
      customerOptionSchema.parse({
        id: customer.id,
        code: customer.code,
        name: customer.name,
        customerType: customer.customerType,
        balance: balanceByCustomer.get(customer.id) ?? "0",
      })
    ),
    products: products.map((product) => {
      let retailPrice = new Decimal(0);
      let wholesalePrice = new Decimal(0);
      let projectPrice = new Decimal(0);

      product.variants.forEach((v) => {
        const r = new Decimal(v.retailPrice);
        const w = new Decimal(v.wholesalePrice);
        const p = new Decimal(v.projectPrice);

        if (r.gt(retailPrice)) retailPrice = r;
        if (w.gt(wholesalePrice)) wholesalePrice = w;
        if (p.gt(projectPrice)) projectPrice = p;
      });

      return productOptionSchema.parse({
        id: product.id,
        code: product.code,
        name: product.name,
        unit: product.unit,
        purchaseUnit: product.purchaseUnit,
        purchaseConversionFactor: product.purchaseConversionFactor ? product.purchaseConversionFactor.toString() : null,
        altSalesUnit: product.altSalesUnit,
        altSalesConversionFactor: product.altSalesConversionFactor ? product.altSalesConversionFactor.toString() : null,
        retailPrice: retailPrice.toString(),
        wholesalePrice: wholesalePrice.toString(),
        projectPrice: projectPrice.toString(),
        stockByWarehouse: product.stockEntries.map((stock) => ({
          warehouseId: stock.warehouseId,
          warehouseName: stock.warehouse.name,
          availableQty: Math.max(0, Number(stock.quantity.toString()) - Number(stock.reservedQty.toString())),
        })),
      });
    }),
    warehouses: warehouses.map((warehouse) => warehouseOptionSchema.parse({ id: warehouse.id, name: warehouse.name })),
    projects: projects.map((project) =>
      projectOptionSchema.parse({
        id: project.id,
        projectCode: project.projectCode,
        name: project.name,
        clientId: project.clientId,
      })
    ),
  });
}
