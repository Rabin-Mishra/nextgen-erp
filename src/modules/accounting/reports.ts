import { getDb } from "@/lib/db";
import Decimal from "decimal.js";
import { PartyType, EntryType, InvoiceType, StockTransactionType, PaymentMode } from "@/generated/prisma/client";
import { cache } from "react";

// Helper function to calculate stock valuation at cost price as of a target date
async function getStockValuation(asOfDate: Date) {
  const db = await getDb();
  const trans = await db.stockTransaction.findMany({
    where: { createdAt: { lte: asOfDate } },
    select: { productId: true, quantity: true, unitCost: true }
  });

  const qtyMap = new Map<string, Decimal>();
  for (const t of trans) {
    const current = qtyMap.get(t.productId) || new Decimal(0);
    qtyMap.set(t.productId, current.plus(t.quantity));
  }

  let totalValuation = new Decimal(0);
  for (const [productId, qty] of qtyMap.entries()) {
    if (qty.greaterThan(0)) {
      const variant = await db.productVariant.findFirst({
        where: { productId, isActive: true },
        orderBy: { effectiveDate: "desc" },
        select: { purchasePrice: true }
      });
      const price = variant ? new Decimal(variant.purchasePrice) : new Decimal(0);
      totalValuation = totalValuation.plus(qty.times(price));
    }
  }
  return totalValuation;
}

// ============================================================================
// 1. PROFIT & LOSS STATEMENT (Gregorian month/year)
// ============================================================================
export const getProfitLossData = cache(async (month: number, year: number) => {
  const db = await getDb();
  
  // Date boundaries
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // A. Sales Revenue grouped by Channel
  const invoices = await db.salesInvoice.findMany({
    where: {
      invoiceDate: { gte: startDate, lte: endDate },
      status: { not: "CANCELLED" }
    },
    select: { invoiceType: true, subtotal: true, discountAmount: true, totalAmount: true }
  });

  let retailRevenue = new Decimal(0);
  let wholesaleRevenue = new Decimal(0);
  let projectRevenue = new Decimal(0);

  for (const inv of invoices) {
    const netRevenue = new Decimal(inv.subtotal).minus(inv.discountAmount); // Taxable subtotal (standard revenue)
    if (inv.invoiceType === "RETAIL") retailRevenue = retailRevenue.plus(netRevenue);
    else if (inv.invoiceType === "WHOLESALE") wholesaleRevenue = wholesaleRevenue.plus(netRevenue);
    else if (inv.invoiceType === "PROJECT") projectRevenue = projectRevenue.plus(netRevenue);
  }

  const totalRevenue = retailRevenue.plus(wholesaleRevenue).plus(projectRevenue);

  // B. Cost of Goods Sold (COGS)
  const soldTransactions = await db.stockTransaction.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      type: { in: ["SALE_OUT", "PROJECT_ISSUE"] }
    },
    select: { productId: true, quantity: true, unitCost: true }
  });

  let cogs = new Decimal(0);
  for (const st of soldTransactions) {
    const qty = new Decimal(st.quantity).abs();
    // Use variant purchase price as cost price (fallback to st.unitCost if variant not found)
    const variant = await db.productVariant.findFirst({
      where: { productId: st.productId, isActive: true },
      orderBy: { effectiveDate: "desc" },
      select: { purchasePrice: true }
    });
    const cost = variant ? new Decimal(variant.purchasePrice) : new Decimal(st.unitCost);
    cogs = cogs.plus(qty.times(cost));
  }

  const grossProfit = totalRevenue.minus(cogs);

  // C. Operating Expenses
  // PAID entries in CashBook with no supplier link (rent, utilities, salaries, etc.)
  const expEntries = await db.cashBookEntry.findMany({
    where: {
      entryDate: { gte: startDate, lte: endDate },
      type: "PAID",
      partyId: null
    },
    select: { amount: true }
  });

  let operatingExpenses = new Decimal(0);
  for (const exp of expEntries) {
    operatingExpenses = operatingExpenses.plus(exp.amount);
  }

  // D. Asset Depreciation
  const depEntries = await db.depreciationEntry.aggregate({
    where: {
      createdAt: { gte: startDate, lte: endDate }
    },
    _sum: {
      amount: true
    }
  });
  const depreciation = new Decimal(depEntries._sum.amount || 0);

  const netProfit = grossProfit.minus(operatingExpenses).minus(depreciation);

  return {
    period: `${startDate.toLocaleString("default", { month: "long" })} ${year}`,
    revenue: {
      retail: retailRevenue.toString(),
      wholesale: wholesaleRevenue.toString(),
      project: projectRevenue.toString(),
      total: totalRevenue.toString(),
    },
    cogs: cogs.toString(),
    grossProfit: grossProfit.toString(),
    operatingExpenses: operatingExpenses.toString(),
    depreciation: depreciation.toString(),
    netProfit: netProfit.toString(),
  };
});

// ============================================================================
// 2. TRADING ACCOUNT (Opening Stock, Purchases, Closing Stock, COGS)
// ============================================================================
export const getTradingAccountData = cache(async (month: number, year: number) => {
  const db = await getDb();
  
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // A. Total sales taxable amount (Revenue)
  const salesAgg = await db.salesInvoice.findMany({
    where: {
      invoiceDate: { gte: startDate, lte: endDate },
      status: { not: "CANCELLED" }
    },
    select: { subtotal: true, discountAmount: true }
  });

  let sales = new Decimal(0);
  for (const s of salesAgg) {
    sales = sales.plus(new Decimal(s.subtotal).minus(s.discountAmount));
  }

  // B. Opening stock valuation (using getStockValuation helper as of startDate - 1ms)
  const openingStock = await getStockValuation(new Date(startDate.getTime() - 1));

  // C. Purchases during the period (including net adjustments to match periodic accounting)
  const purchTrans = await db.stockTransaction.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      type: { in: ["PURCHASE_IN", "ADJUSTMENT_IN", "ADJUSTMENT_OUT", "RETURN_OUT", "RETURN_IN"] }
    },
    select: { productId: true, quantity: true, unitCost: true }
  });

  let purchases = new Decimal(0);
  for (const pt of purchTrans) {
    const qty = new Decimal(pt.quantity);
    const variant = await db.productVariant.findFirst({
      where: { productId: pt.productId, isActive: true },
      orderBy: { effectiveDate: "desc" },
      select: { purchasePrice: true }
    });
    const cost = variant ? new Decimal(variant.purchasePrice) : new Decimal(pt.unitCost);
    purchases = purchases.plus(qty.times(cost));
  }

  // D. Closing Stock Valuation
  const closingStock = await getStockValuation(endDate);

  // E. Cost of Goods Sold calculations
  const cogs = openingStock.plus(purchases).minus(closingStock);
  const grossProfit = sales.minus(cogs);

  return {
    period: `${startDate.toLocaleString("default", { month: "long" })} ${year}`,
    sales: sales.toString(),
    openingStock: openingStock.toString(),
    purchases: purchases.toString(),
    closingStock: closingStock.toString(),
    cogs: cogs.toString(),
    grossProfit: grossProfit.toString()
  };
});

// ============================================================================
// 3. BALANCE SHEET (Monthly + Yearly Snapshot)
// ============================================================================
export const getBalanceSheetData = cache(async (asOf: Date | string) => {
  const db = await getDb();
  const targetDate = new Date(asOf);

  // --- ASSETS ---
  // A. Cash & Bank & Digital Wallet balances (derived from CashBookEntries up to targetDate)
  const cashEntries = await db.cashBookEntry.findMany({
    where: { entryDate: { lte: targetDate } },
    select: { amount: true, type: true, paymentMethod: true }
  });

  let cashBalance = new Decimal(0);
  let bankBalance = new Decimal(0);
  let digitalBalance = new Decimal(0); // eSewa / Khalti

  for (const ce of cashEntries) {
    const amt = new Decimal(ce.amount);
    const sign = ce.type === "RECEIVED" ? 1 : -1;
    const value = amt.times(sign);

    if (ce.paymentMethod === "CASH") cashBalance = cashBalance.plus(value);
    else if (ce.paymentMethod === "BANK" || ce.paymentMethod === "CHEQUE") bankBalance = bankBalance.plus(value);
    else digitalBalance = digitalBalance.plus(value);
  }

  // B. Accounts Receivable (AR Customer ledger running balance balances as of targetDate)
  const customers = await db.customer.findMany({ select: { id: true, openingBalance: true } });
  let accountsReceivable = new Decimal(0);

  for (const c of customers) {
    const entries = await db.ledgerEntry.findMany({
      where: { partyType: "CUSTOMER", partyId: c.id, entryDate: { lte: targetDate } },
      select: { amount: true, entryType: true }
    });

    let debits = new Decimal(c.openingBalance);
    let credits = new Decimal(0);
    for (const e of entries) {
      if (e.entryType === "DEBIT") debits = debits.plus(e.amount);
      else credits = credits.plus(e.amount);
    }
    const balance = debits.minus(credits);
    if (balance.greaterThan(0)) {
      accountsReceivable = accountsReceivable.plus(balance);
    }
  }

  // C. Inventory valuation (using getStockValuation helper as of targetDate)
  const inventoryValue = await getStockValuation(targetDate);

  // D. Fixed Assets Cost & Accumulated Depreciation
  const assets = await db.fixedAsset.findMany({
    where: { purchaseDate: { lte: targetDate } },
    select: { id: true, purchasePrice: true }
  });

  let assetsCost = new Decimal(0);
  let accumDepreciation = new Decimal(0);

  for (const a of assets) {
    assetsCost = assetsCost.plus(a.purchasePrice);

    const depAgg = await db.depreciationEntry.aggregate({
      where: { assetId: a.id, createdAt: { lte: targetDate } },
      _sum: { amount: true }
    });
    accumDepreciation = accumDepreciation.plus(depAgg._sum.amount || 0);
  }

  const netFixedAssets = assetsCost.minus(accumDepreciation);
  const totalAssets = cashBalance.plus(bankBalance).plus(digitalBalance).plus(accountsReceivable).plus(inventoryValue).plus(netFixedAssets);

  // --- LIABILITIES ---
  // E. Accounts Payable (AP Supplier ledger balances as of targetDate)
  const suppliers = await db.supplier.findMany({ select: { id: true, openingBalance: true } });
  let accountsPayable = new Decimal(0);

  for (const s of suppliers) {
    const entries = await db.ledgerEntry.findMany({
      where: { partyType: "SUPPLIER", partyId: s.id, entryDate: { lte: targetDate } },
      select: { amount: true, entryType: true }
    });

    let debits = new Decimal(0);
    let credits = new Decimal(s.openingBalance);
    for (const e of entries) {
      if (e.entryType === "CREDIT") credits = credits.plus(e.amount);
      else debits = debits.plus(e.amount);
    }
    const balance = credits.minus(debits);
    if (balance.greaterThan(0)) {
      accountsPayable = accountsPayable.plus(balance);
    }
  }

  const totalLiabilities = accountsPayable; // loans placeholder could be added if needed

  // --- EQUITY (Owner Capital + Retained Earnings) ---
  // Dynamically calculate Capital contributions from the cash book up to targetDate
  const capitalEntries = await db.cashBookEntry.findMany({
    where: {
      entryDate: { lte: targetDate },
      type: "RECEIVED",
      OR: [
        { description: { contains: "capital", mode: "insensitive" } },
        { description: { contains: "equity", mode: "insensitive" } },
        { description: { contains: "contribution", mode: "insensitive" } },
        { referenceType: "FINANCING" }
      ]
    },
    select: { amount: true }
  });
  let startingCapital = new Decimal(0);
  for (const ce of capitalEntries) {
    startingCapital = startingCapital.plus(ce.amount);
  }

  // Calculate Retained Earnings dynamically from cumulative net profits/losses up to targetDate
  const allInvoices = await db.salesInvoice.findMany({
    where: { invoiceDate: { lte: targetDate }, status: { not: "CANCELLED" } },
    select: { subtotal: true, discountAmount: true }
  });
  let totalRevenue = new Decimal(0);
  for (const inv of allInvoices) {
    totalRevenue = totalRevenue.plus(new Decimal(inv.subtotal).minus(inv.discountAmount));
  }

  const allSoldTransactions = await db.stockTransaction.findMany({
    where: { createdAt: { lte: targetDate }, type: { in: ["SALE_OUT", "PROJECT_ISSUE"] } },
    select: { productId: true, quantity: true, unitCost: true }
  });
  let totalCogs = new Decimal(0);
  for (const st of allSoldTransactions) {
    const qty = new Decimal(st.quantity).abs();
    const variant = await db.productVariant.findFirst({
      where: { productId: st.productId, isActive: true },
      orderBy: { effectiveDate: "desc" },
      select: { purchasePrice: true }
    });
    const cost = variant ? new Decimal(variant.purchasePrice) : new Decimal(st.unitCost);
    totalCogs = totalCogs.plus(qty.times(cost));
  }

  const allExpenses = await db.cashBookEntry.findMany({
    where: { entryDate: { lte: targetDate }, type: "PAID", partyId: null },
    select: { amount: true }
  });
  let totalExpenses = new Decimal(0);
  for (const exp of allExpenses) {
    totalExpenses = totalExpenses.plus(exp.amount);
  }

  const depEntriesVal = await db.depreciationEntry.aggregate({
    where: { createdAt: { lte: targetDate } },
    _sum: { amount: true }
  });
  const totalDepreciation = new Decimal(depEntriesVal._sum.amount || 0);

  const retainedEarnings = totalRevenue.minus(totalCogs).minus(totalExpenses).minus(totalDepreciation);
  const totalEquity = startingCapital.plus(retainedEarnings);

  return {
    asOf: targetDate.toLocaleDateString(),
    assets: {
      cash: cashBalance.toString(),
      bank: bankBalance.toString(),
      digital: digitalBalance.toString(),
      receivables: accountsReceivable.toString(),
      inventory: inventoryValue.toString(),
      fixedCost: assetsCost.toString(),
      accumDepreciation: accumDepreciation.toString(),
      netFixed: netFixedAssets.toString(),
      total: totalAssets.toString()
    },
    liabilities: {
      payables: accountsPayable.toString(),
      total: totalLiabilities.toString()
    },
    equity: {
      capital: startingCapital.toString(),
      retainedEarnings: retainedEarnings.toString(),
      total: totalEquity.toString()
    }
  };
});

// ============================================================================
// 4. TRIAL BALANCE
// ============================================================================
export const getTrialBalanceData = cache(async (asOf: Date | string) => {
  const db = await getDb();
  const targetDate = new Date(asOf);

  const trialRows: { code: string; name: string; type: string; debit: string; credit: string }[] = [];
  let totalDebit = new Decimal(0);
  let totalCredit = new Decimal(0);

  // Helper to add row
  const addRow = (code: string, name: string, type: string, balance: Decimal) => {
    if (balance.greaterThan(0)) {
      totalDebit = totalDebit.plus(balance);
      trialRows.push({
        code,
        name,
        type,
        debit: balance.toString(),
        credit: "0",
      });
    } else if (balance.lessThan(0)) {
      totalCredit = totalCredit.plus(balance.abs());
      trialRows.push({
        code,
        name,
        type,
        debit: "0",
        credit: balance.abs().toString(),
      });
    }
  };

  // 1. Cash-in-hand (Safe Vault)
  const cashEntries = await db.cashBookEntry.findMany({
    where: { entryDate: { lte: targetDate }, paymentMethod: "CASH" },
    select: { amount: true, type: true }
  });
  let cashBalance = new Decimal(0);
  for (const ce of cashEntries) {
    cashBalance = cashBalance.plus(new Decimal(ce.amount).times(ce.type === "RECEIVED" ? 1 : -1));
  }
  addRow("GL-1001", "Cash-in-hand (Safe Vault)", "CASH", cashBalance);

  // 2. Commercial Bank Accounts
  const bankEntries = await db.cashBookEntry.findMany({
    where: { entryDate: { lte: targetDate }, paymentMethod: { in: ["BANK", "CHEQUE"] } },
    select: { amount: true, type: true }
  });
  let bankBalance = new Decimal(0);
  for (const be of bankEntries) {
    bankBalance = bankBalance.plus(new Decimal(be.amount).times(be.type === "RECEIVED" ? 1 : -1));
  }
  addRow("GL-1002", "Commercial Bank Accounts", "BANK", bankBalance);

  // 3. Digital QR Wallets (eSewa/Khalti)
  const digitalEntries = await db.cashBookEntry.findMany({
    where: { entryDate: { lte: targetDate }, paymentMethod: { in: ["ESEWA", "KHALTI"] } },
    select: { amount: true, type: true }
  });
  let digitalBalance = new Decimal(0);
  for (const de of digitalEntries) {
    digitalBalance = digitalBalance.plus(new Decimal(de.amount).times(de.type === "RECEIVED" ? 1 : -1));
  }
  addRow("GL-1003", "Digital QR Wallets (eSewa/Khalti)", "DIGITAL", digitalBalance);

  // 4. Accounts Receivable (Customer Ledger Balances)
  const customers = await db.customer.findMany({ select: { id: true, name: true, code: true, openingBalance: true } });
  for (const c of customers) {
    const entries = await db.ledgerEntry.findMany({
      where: { partyType: "CUSTOMER", partyId: c.id, entryDate: { lte: targetDate } },
      select: { amount: true, entryType: true }
    });
    let balance = new Decimal(c.openingBalance);
    for (const e of entries) {
      balance = balance.plus(new Decimal(e.amount).times(e.entryType === "DEBIT" ? 1 : -1));
    }
    addRow(c.code, `${c.name} (Customer Receivable)`, "CUSTOMER", balance);
  }

  // 5. Accounts Payable (Supplier Ledger Balances)
  const suppliers = await db.supplier.findMany({ select: { id: true, name: true, code: true, openingBalance: true } });
  for (const s of suppliers) {
    const entries = await db.ledgerEntry.findMany({
      where: { partyType: "SUPPLIER", partyId: s.id, entryDate: { lte: targetDate } },
      select: { amount: true, entryType: true }
    });
    // Supplier balance is credit-normal: CREDIT increases it, DEBIT decreases it.
    let balance = new Decimal(s.openingBalance);
    for (const e of entries) {
      balance = balance.plus(new Decimal(e.amount).times(e.entryType === "CREDIT" ? 1 : -1));
    }
    addRow(s.code, `${s.name} (Supplier Payable)`, "SUPPLIER", balance.negated()); // negate so credit balance is shown under Credit column
  }

  // 6. Inventory Stock (GL Asset)
  const inventoryVal = await getStockValuation(targetDate);
  addRow("GL-1200", "Inventory Asset", "STOCK", inventoryVal);

  // 7. Cost of Goods Sold (COGS Expense)
  const soldTransactions = await db.stockTransaction.findMany({
    where: { createdAt: { lte: targetDate }, type: { in: ["SALE_OUT", "PROJECT_ISSUE"] } },
    select: { productId: true, quantity: true, unitCost: true }
  });
  let cogsVal = new Decimal(0);
  for (const st of soldTransactions) {
    const qty = new Decimal(st.quantity).abs();
    const variant = await db.productVariant.findFirst({
      where: { productId: st.productId, isActive: true },
      orderBy: { effectiveDate: "desc" },
      select: { purchasePrice: true }
    });
    const cost = variant ? new Decimal(variant.purchasePrice) : new Decimal(st.unitCost);
    cogsVal = cogsVal.plus(qty.times(cost));
  }
  addRow("GL-5001", "Cost of Goods Sold (COGS)", "EXPENSE", cogsVal);

  // 8. Sales Revenue (Income GL)
  const invoices = await db.salesInvoice.findMany({
    where: { invoiceDate: { lte: targetDate }, status: { not: "CANCELLED" } },
    select: { subtotal: true, discountAmount: true }
  });
  let salesVal = new Decimal(0);
  for (const inv of invoices) {
    salesVal = salesVal.plus(new Decimal(inv.subtotal).minus(inv.discountAmount));
  }
  addRow("GL-4001", "Sales Revenue", "REVENUE", salesVal.negated()); // negate so credit balance is shown under Credit column

  // 9. Operating Expenses (Expense GL)
  const expEntries = await db.cashBookEntry.findMany({
    where: { entryDate: { lte: targetDate }, type: "PAID", partyId: null },
    select: { amount: true }
  });
  let expenseVal = new Decimal(0);
  for (const exp of expEntries) {
    expenseVal = expenseVal.plus(exp.amount);
  }
  addRow("GL-6001", "Operating Expenses", "EXPENSE", expenseVal);

  // 10. Fixed Assets Cost
  const assets = await db.fixedAsset.findMany({
    where: { purchaseDate: { lte: targetDate } },
    select: { purchasePrice: true }
  });
  let faCost = new Decimal(0);
  for (const a of assets) {
    faCost = faCost.plus(a.purchasePrice);
  }
  addRow("GL-1300", "Fixed Assets Cost", "ASSET", faCost);

  // 11. Accumulated Depreciation (Contra Asset)
  const depEntries = await db.depreciationEntry.aggregate({
    where: { createdAt: { lte: targetDate } },
    _sum: { amount: true }
  });
  const accumDep = new Decimal(depEntries._sum.amount || 0);
  addRow("GL-1301", "Accumulated Depreciation", "ASSET", accumDep.negated());

  // 12. Owner Starting Capital
  const capitalEntries = await db.cashBookEntry.findMany({
    where: {
      entryDate: { lte: targetDate },
      type: "RECEIVED",
      OR: [
        { description: { contains: "capital", mode: "insensitive" } },
        { description: { contains: "equity", mode: "insensitive" } },
        { description: { contains: "contribution", mode: "insensitive" } },
        { referenceType: "FINANCING" }
      ]
    },
    select: { amount: true }
  });
  let startingCapital = new Decimal(0);
  for (const ce of capitalEntries) {
    startingCapital = startingCapital.plus(ce.amount);
  }
  addRow("GL-3001", "Owner Starting Capital", "EQUITY", startingCapital.negated());

  return {
    rows: trialRows,
    totals: {
      debit: totalDebit.toString(),
      credit: totalCredit.toString()
    }
  };
});

// ============================================================================
// 5. SALES SUMMARY (Chronological Daily Sales Charting)
// ============================================================================
export const getSalesSummary = cache(async (dateFrom: Date | string, dateTo: Date | string, channel?: InvoiceType) => {
  const db = await getDb();
  
  const filterFrom = new Date(dateFrom);
  const filterTo = new Date(dateTo);

  const invoices = await db.salesInvoice.findMany({
    where: {
      invoiceDate: { gte: filterFrom, lte: filterTo },
      status: { not: "CANCELLED" },
      ...(channel ? { invoiceType: channel } : {})
    },
    orderBy: { invoiceDate: "asc" },
    select: {
      id: true,
      invoiceNumber: true,
      invoiceDate: true,
      invoiceType: true,
      totalAmount: true,
      subtotal: true,
      discountAmount: true,
      customer: {
        select: {
          name: true
        }
      }
    }
  });

  return invoices.map(inv => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    date: inv.invoiceDate.toISOString().split("T")[0],
    channel: inv.invoiceType,
    customerName: inv.customer.name,
    amount: new Decimal(inv.subtotal).minus(inv.discountAmount).toNumber(),
  }));
});

// ============================================================================
// 6. ITEM-WISE SALES (Top Selling Products)
// ============================================================================
export const getItemWiseSales = cache(async (dateFrom: Date | string, dateTo: Date | string) => {
  const db = await getDb();
  
  const filterFrom = new Date(dateFrom);
  const filterTo = new Date(dateTo);

  const invoiceItems = await db.salesInvoiceItem.findMany({
    where: {
      invoice: {
        invoiceDate: { gte: filterFrom, lte: filterTo },
        status: { not: "CANCELLED" }
      }
    },
    select: {
      qty: true,
      unitPrice: true,
      baseQtyEquivalent: true,
      product: {
        select: {
          name: true,
          code: true,
          variants: {
            where: { isActive: true },
            select: { purchasePrice: true }
          }
        }
      }
    }
  });

  const itemMap = new Map<string, { name: string; code: string; qty: Decimal; revenue: Decimal; cost: Decimal }>();

  for (const ii of invoiceItems) {
    const key = ii.product.code;
    const qty = new Decimal(ii.qty);
    const baseQty = ii.baseQtyEquivalent ? new Decimal(ii.baseQtyEquivalent) : qty;
    const rev = new Decimal(ii.unitPrice).times(qty);
    const purchasePrice = ii.product.variants[0]?.purchasePrice || new Decimal(0);
    const cost = new Decimal(purchasePrice).times(baseQty);

    const existing = itemMap.get(key) || { name: ii.product.name, code: ii.product.code, qty: new Decimal(0), revenue: new Decimal(0), cost: new Decimal(0) };
    itemMap.set(key, {
      ...existing,
      qty: existing.qty.plus(baseQty),
      revenue: existing.revenue.plus(rev),
      cost: existing.cost.plus(cost)
    });
  }

  return Array.from(itemMap.values())
    .map(val => ({
      name: val.name,
      code: val.code,
      quantity: val.qty.toNumber(),
      revenue: val.revenue.toNumber(),
      cost: val.cost.toNumber(),
      profit: val.revenue.minus(val.cost).toNumber()
    }))
    .sort((a, b) => b.revenue - a.revenue);
});

// ============================================================================
// 7. OUTSTANDING DUES & AGING REPORT
// ============================================================================
export const getAgingReport = cache(async () => {
  const db = await getDb();
  const today = new Date();

  // A. Fetch active customers with opening balance
  const customers = await db.customer.findMany({
    select: { id: true, name: true, code: true, panNumber: true, openingBalance: true }
  });

  const agingReport = [];

  for (const c of customers) {
    // 1. Calculate net ledger balance (current total due)
    const ledgerEntries = await db.ledgerEntry.findMany({
      where: { partyType: "CUSTOMER", partyId: c.id },
      select: { amount: true, entryType: true }
    });

    let debits = new Decimal(c.openingBalance);
    let credits = new Decimal(0);
    for (const e of ledgerEntries) {
      if (e.entryType === "DEBIT") debits = debits.plus(e.amount);
      else credits = credits.plus(e.amount);
    }
    const currentDue = debits.minus(credits);

    // If customer has no outstanding balances, skip
    if (currentDue.lte(0)) continue;

    // 2. Fetch outstanding invoices (status PARTIAL or SENT/UNPAID)
    const unpaidInvoices = await db.salesInvoice.findMany({
      where: {
        customerId: c.id,
        status: { in: ["SENT", "PARTIAL"] }
      },
      orderBy: { invoiceDate: "desc" },
      select: { id: true, totalAmount: true, balanceAmount: true, invoiceDate: true }
    });

    let bucket30 = new Decimal(0);
    let bucket60 = new Decimal(0);
    let bucket90 = new Decimal(0);
    let bucketOver = new Decimal(0);
    let remainingDue = currentDue;

    // 3. Apportion customer due amount across chronological invoices (aging buckets)
    for (const inv of unpaidInvoices) {
      if (remainingDue.lte(0)) break;

      const unpaidVal = Decimal.min(remainingDue, new Decimal(inv.balanceAmount));
      remainingDue = remainingDue.minus(unpaidVal);

      // Calc age in days
      const diffTime = Math.abs(today.getTime() - inv.invoiceDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 30) bucket30 = bucket30.plus(unpaidVal);
      else if (diffDays <= 60) bucket60 = bucket60.plus(unpaidVal);
      else if (diffDays <= 90) bucket90 = bucket90.plus(unpaidVal);
      else bucketOver = bucketOver.plus(unpaidVal);
    }

    // Allocate leftover running balance (e.g. opening balances or unallocated debits) to over 90 days
    if (remainingDue.greaterThan(0)) {
      bucketOver = bucketOver.plus(remainingDue);
    }

    agingReport.push({
      customerId: c.id,
      code: c.code,
      name: c.name,
      pan: c.panNumber || "N/A",
      "0-30": bucket30.toNumber(),
      "31-60": bucket60.toNumber(),
      "61-90": bucket90.toNumber(),
      "90+": bucketOver.toNumber(),
      total: currentDue.toNumber()
    });
  }

  return agingReport.sort((a, b) => b.total - a.total);
});

// ============================================================================
// 8. STOCK VALUATION REPORT (Chronological FIFO Algorithm)
// ============================================================================


// ============================================================================
// 10. PROJECT PROFITABILITY REPORT (Contracts Margin Costing)
// ============================================================================
export const getProjectProfitability = cache(async () => {
  const db = await getDb();

  const projects = await db.project.findMany({
    select: {
      id: true,
      name: true,
      projectCode: true,
      contractAmount: true,
      status: true,
      client: { select: { name: true } }
    }
  });

  const report = [];

  for (const prj of projects) {
    // 1. Total milestones billed (Sales invoices linked to project)
    const billingInvoices = await db.salesInvoice.findMany({
      where: { projectId: prj.id, status: { not: "CANCELLED" } },
      select: { subtotal: true, discountAmount: true }
    });

    let totalBilled = new Decimal(0);
    for (const inv of billingInvoices) {
      totalBilled = totalBilled.plus(new Decimal(inv.subtotal).minus(inv.discountAmount));
    }

    // 2. Material issues consumption cost (PROJECT_ISSUE stock transactions)
    const issues = await db.stockTransaction.findMany({
      where: { referenceType: "PROJECT", referenceId: prj.id, type: "PROJECT_ISSUE" },
      select: { quantity: true, unitCost: true }
    });

    let materialCost = new Decimal(0);
    for (const is of issues) {
      // Quantity is negative for issue dispatches, so we take absolute
      const qty = new Decimal(is.quantity).abs();
      materialCost = materialCost.plus(qty.times(is.unitCost));
    }

    // 3. Labor Cost (Placeholder, could be manual field in Project model if present)
    const laborCost = new Decimal(0);

    const profit = totalBilled.minus(materialCost).minus(laborCost);
    const margin = totalBilled.greaterThan(0) ? profit.div(totalBilled).times(100).toNumber() : 0;

    report.push({
      projectId: prj.id,
      code: prj.projectCode,
      name: prj.name,
      clientName: prj.client?.name || "N/A",
      contractAmount: new Decimal(prj.contractAmount).toNumber(),
      totalBilled: totalBilled.toNumber(),
      materialCost: materialCost.toNumber(),
      laborCost: laborCost.toNumber(),
      profit: profit.toNumber(),
      margin: Math.round(margin * 100) / 100
    });
  }

  return report.sort((a, b) => b.profit - a.profit);
});

// ============================================================================
// 11. CASH FLOW STATEMENT
// ============================================================================
export const getCashFlowData = cache(async (month: number, year: number) => {
  const db = await getDb();
  
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // A. Operating Activities
  // 1. Cash Receipts from Customers (RECEIVED entries for CUSTOMER)
  const receipts = await db.cashBookEntry.findMany({
    where: {
      entryDate: { gte: startDate, lte: endDate },
      type: "RECEIVED",
      partyType: "CUSTOMER"
    },
    select: { amount: true }
  });
  let custReceipts = new Decimal(0);
  for (const r of receipts) custReceipts = custReceipts.plus(r.amount);

  // 2. Cash Paid to Suppliers (PAID entries for SUPPLIER)
  const supplierPmts = await db.cashBookEntry.findMany({
    where: {
      entryDate: { gte: startDate, lte: endDate },
      type: "PAID",
      partyType: "SUPPLIER"
    },
    select: { amount: true }
  });
  let vendorPayments = new Decimal(0);
  for (const p of supplierPmts) vendorPayments = vendorPayments.plus(p.amount);

  // 3. Operating Expenses Paid (PAID entries with no party link)
  const opExps = await db.cashBookEntry.findMany({
    where: {
      entryDate: { gte: startDate, lte: endDate },
      type: "PAID",
      partyId: null
    },
    select: { amount: true }
  });
  let expPaid = new Decimal(0);
  for (const e of opExps) expPaid = expPaid.plus(e.amount);

  const netOperating = custReceipts.minus(vendorPayments).minus(expPaid);

  // B. Investing Activities
  // Cash paid for Fixed Asset purchases during this period
  const assetsPurchased = await db.fixedAsset.findMany({
    where: {
      purchaseDate: { gte: startDate, lte: endDate }
    },
    select: { purchasePrice: true }
  });
  let assetOutflow = new Decimal(0);
  for (const a of assetsPurchased) assetOutflow = assetOutflow.plus(a.purchasePrice);

  const netInvesting = assetOutflow.negated();

  // C. Financing Activities
  // Capital additions (RECEIVED entries with description containing capital / equity / partner)
  const financingEntries = await db.cashBookEntry.findMany({
    where: {
      entryDate: { gte: startDate, lte: endDate },
      type: "RECEIVED",
      OR: [
        { description: { contains: "capital", mode: "insensitive" } },
        { description: { contains: "equity", mode: "insensitive" } },
        { description: { contains: "contribution", mode: "insensitive" } },
        { referenceType: "FINANCING" }
      ]
    },
    select: { amount: true }
  });
  let capitalInflow = new Decimal(0);
  for (const f of financingEntries) capitalInflow = capitalInflow.plus(f.amount);

  const netFinancing = capitalInflow;

  // D. Summarization & Vault Reconciliation
  const netChange = netOperating.plus(netInvesting).plus(netFinancing);

  // Opening Cash Balance (sum of all CashBookEntry prior to startDate)
  const priorIn = await db.cashBookEntry.aggregate({
    where: { entryDate: { lt: startDate }, type: "RECEIVED" },
    _sum: { amount: true }
  });
  const priorOut = await db.cashBookEntry.aggregate({
    where: { entryDate: { lt: startDate }, type: "PAID" },
    _sum: { amount: true }
  });
  const openingCash = new Decimal(priorIn._sum.amount || 0).minus(priorOut._sum.amount || 0);
  const closingCash = openingCash.plus(netChange);

  return {
    period: `${startDate.toLocaleString("default", { month: "long" })} ${year}`,
    operating: {
      receiptsFromCustomers: custReceipts.toString(),
      paymentsToSuppliers: vendorPayments.toString(),
      operatingExpenses: expPaid.toString(),
      netOperating: netOperating.toString()
    },
    investing: {
      fixedAssetPurchases: assetOutflow.toString(),
      netInvesting: netInvesting.toString()
    },
    financing: {
      capitalContributions: capitalInflow.toString(),
      netFinancing: netFinancing.toString()
    },
    netChange: netChange.toString(),
    openingCash: openingCash.toString(),
    closingCash: closingCash.toString()
  };
});

// ============================================================================
// 12. PURCHASE SUMMARY
// ============================================================================
export const getPurchaseSummary = cache(async (dateFrom: Date | string, dateTo: Date | string) => {
  const db = await getDb();
  
  const filterFrom = new Date(dateFrom);
  const filterTo = new Date(dateTo);

  const orders = await db.purchaseOrder.findMany({
    where: {
      orderDate: { gte: filterFrom, lte: filterTo },
      status: { not: "CANCELLED" }
    },
    orderBy: { orderDate: "asc" },
    select: {
      id: true,
      poNumber: true,
      orderDate: true,
      totalAmount: true,
      supplier: {
        select: {
          name: true
        }
      }
    }
  });

  return orders.map(o => ({
    id: o.id,
    poNumber: o.poNumber,
    date: o.orderDate.toISOString().split("T")[0],
    vendorName: o.supplier.name,
    amount: Number(o.totalAmount),
  }));
});

// ============================================================================
// 13. VENDOR OUTSTANDING PAYABLES
// ============================================================================
export const getVendorOutstanding = cache(async () => {
  const db = await getDb();

  const suppliers = await db.supplier.findMany({
    select: { id: true, name: true, code: true, panNumber: true, openingBalance: true }
  });

  const payables = [];

  for (const s of suppliers) {
    const entries = await db.ledgerEntry.findMany({
      where: { partyType: "SUPPLIER", partyId: s.id },
      select: { amount: true, entryType: true }
    });

    let debits = new Decimal(0);
    let credits = new Decimal(s.openingBalance);
    for (const e of entries) {
      if (e.entryType === "CREDIT") credits = credits.plus(e.amount);
      else debits = debits.plus(e.amount);
    }

    const balance = credits.minus(debits);
    if (balance.greaterThan(0)) {
      payables.push({
        code: s.code,
        name: s.name,
        pan: s.panNumber || "N/A",
        balance: balance.toNumber()
      });
    }
  }

  return payables.sort((a, b) => b.balance - a.balance);
});

// ============================================================================
// FISCAL YEAR DATE RANGE SPECIFIC REPORT HELPERS
// ============================================================================

export const getTradingAccountDataForDates = cache(async (startDate: Date, endDate: Date) => {
  const db = await getDb();
  
  // A. Total sales taxable amount (Revenue)
  const salesAgg = await db.salesInvoice.findMany({
    where: {
      invoiceDate: { gte: startDate, lte: endDate },
      status: { not: "CANCELLED" }
    },
    select: { subtotal: true, discountAmount: true }
  });

  let sales = new Decimal(0);
  for (const s of salesAgg) {
    sales = sales.plus(new Decimal(s.subtotal).minus(s.discountAmount));
  }

  // B. Opening stock valuation (using getStockValuation helper as of startDate - 1ms)
  const openingStock = await getStockValuation(new Date(startDate.getTime() - 1));

  // C. Purchases during the period (including net adjustments to match periodic accounting)
  const purchTrans = await db.stockTransaction.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      type: { in: ["PURCHASE_IN", "ADJUSTMENT_IN", "ADJUSTMENT_OUT", "RETURN_OUT", "RETURN_IN"] }
    },
    select: { productId: true, quantity: true, unitCost: true }
  });

  let purchases = new Decimal(0);
  for (const pt of purchTrans) {
    const qty = new Decimal(pt.quantity);
    const variant = await db.productVariant.findFirst({
      where: { productId: pt.productId, isActive: true },
      orderBy: { effectiveDate: "desc" },
      select: { purchasePrice: true }
    });
    const cost = variant ? new Decimal(variant.purchasePrice) : new Decimal(pt.unitCost);
    purchases = purchases.plus(qty.times(cost));
  }

  // D. Closing Stock Valuation (using getStockValuation helper as of endDate)
  const closingStock = await getStockValuation(endDate);

  // E. Cost of Goods Sold calculations
  const cogs = openingStock.plus(purchases).minus(closingStock);
  const grossProfit = sales.minus(cogs);

  return {
    sales: sales.toString(),
    openingStock: openingStock.toString(),
    purchases: purchases.toString(),
    closingStock: closingStock.toString(),
    cogs: cogs.toString(),
    grossProfit: grossProfit.toString()
  };
});

export const getProfitLossDataForDates = cache(async (startDate: Date, endDate: Date) => {
  const db = await getDb();

  // A. Sales Revenue grouped by Channel
  const invoices = await db.salesInvoice.findMany({
    where: {
      invoiceDate: { gte: startDate, lte: endDate },
      status: { not: "CANCELLED" }
    },
    select: { invoiceType: true, subtotal: true, discountAmount: true, totalAmount: true }
  });

  let retailRevenue = new Decimal(0);
  let wholesaleRevenue = new Decimal(0);
  let projectRevenue = new Decimal(0);

  for (const inv of invoices) {
    const netRevenue = new Decimal(inv.subtotal).minus(inv.discountAmount); // Taxable subtotal (standard revenue)
    if (inv.invoiceType === "RETAIL") retailRevenue = retailRevenue.plus(netRevenue);
    else if (inv.invoiceType === "WHOLESALE") wholesaleRevenue = wholesaleRevenue.plus(netRevenue);
    else if (inv.invoiceType === "PROJECT") projectRevenue = projectRevenue.plus(netRevenue);
  }

  const totalRevenue = retailRevenue.plus(wholesaleRevenue).plus(projectRevenue);

  // B. Cost of Goods Sold (COGS)
  const soldTransactions = await db.stockTransaction.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      type: { in: ["SALE_OUT", "PROJECT_ISSUE"] }
    },
    select: { productId: true, quantity: true, unitCost: true }
  });

  let cogs = new Decimal(0);
  for (const st of soldTransactions) {
    const qty = new Decimal(st.quantity).abs();
    // Use variant purchase price as cost price (fallback to st.unitCost if variant not found)
    const variant = await db.productVariant.findFirst({
      where: { productId: st.productId, isActive: true },
      orderBy: { effectiveDate: "desc" },
      select: { purchasePrice: true }
    });
    const cost = variant ? new Decimal(variant.purchasePrice) : new Decimal(st.unitCost);
    cogs = cogs.plus(qty.times(cost));
  }

  const grossProfit = totalRevenue.minus(cogs);

  // C. Operating Expenses
  const expEntries = await db.cashBookEntry.findMany({
    where: {
      entryDate: { gte: startDate, lte: endDate },
      type: "PAID",
      partyId: null
    },
    select: { amount: true }
  });

  let operatingExpenses = new Decimal(0);
  for (const exp of expEntries) {
    operatingExpenses = operatingExpenses.plus(exp.amount);
  }

  // D. Asset Depreciation
  const depEntries = await db.depreciationEntry.aggregate({
    where: {
      createdAt: { gte: startDate, lte: endDate }
    },
    _sum: {
      amount: true
    }
  });
  const depreciation = new Decimal(depEntries._sum.amount || 0);

  const netProfit = grossProfit.minus(operatingExpenses).minus(depreciation);

  return {
    revenue: {
      retail: retailRevenue.toString(),
      wholesale: wholesaleRevenue.toString(),
      project: projectRevenue.toString(),
      total: totalRevenue.toString(),
    },
    cogs: cogs.toString(),
    grossProfit: grossProfit.toString(),
    operatingExpenses: operatingExpenses.toString(),
    depreciation: depreciation.toString(),
    netProfit: netProfit.toString(),
  };
});

export const getCashFlowDataForDates = cache(async (startDate: Date, endDate: Date) => {
  const db = await getDb();

  // A. Operating Activities
  // 1. Cash Receipts from Customers
  const receipts = await db.cashBookEntry.findMany({
    where: {
      entryDate: { gte: startDate, lte: endDate },
      type: "RECEIVED",
      partyType: "CUSTOMER"
    },
    select: { amount: true }
  });
  let custReceipts = new Decimal(0);
  for (const r of receipts) custReceipts = custReceipts.plus(r.amount);

  // 2. Cash Paid to Suppliers
  const supplierPmts = await db.cashBookEntry.findMany({
    where: {
      entryDate: { gte: startDate, lte: endDate },
      type: "PAID",
      partyType: "SUPPLIER"
    },
    select: { amount: true }
  });
  let vendorPayments = new Decimal(0);
  for (const p of supplierPmts) vendorPayments = vendorPayments.plus(p.amount);

  // 3. Operating Expenses Paid
  const opExps = await db.cashBookEntry.findMany({
    where: {
      entryDate: { gte: startDate, lte: endDate },
      type: "PAID",
      partyId: null
    },
    select: { amount: true }
  });
  let expPaid = new Decimal(0);
  for (const e of opExps) expPaid = expPaid.plus(e.amount);

  const netOperating = custReceipts.minus(vendorPayments).minus(expPaid);

  // B. Investing Activities
  const assetsPurchased = await db.fixedAsset.findMany({
    where: {
      purchaseDate: { gte: startDate, lte: endDate }
    },
    select: { purchasePrice: true }
  });
  let assetOutflow = new Decimal(0);
  for (const a of assetsPurchased) assetOutflow = assetOutflow.plus(a.purchasePrice);

  const netInvesting = assetOutflow.negated();

  // C. Financing Activities
  const financingEntries = await db.cashBookEntry.findMany({
    where: {
      entryDate: { gte: startDate, lte: endDate },
      type: "RECEIVED",
      OR: [
        { description: { contains: "capital", mode: "insensitive" } },
        { description: { contains: "equity", mode: "insensitive" } },
        { description: { contains: "contribution", mode: "insensitive" } },
        { referenceType: "FINANCING" }
      ]
    },
    select: { amount: true }
  });
  let capitalInflow = new Decimal(0);
  for (const f of financingEntries) capitalInflow = capitalInflow.plus(f.amount);

  const netFinancing = capitalInflow;

  // D. Summarization & Vault Reconciliation
  const netChange = netOperating.plus(netInvesting).plus(netFinancing);

  // Opening Cash Balance
  const priorIn = await db.cashBookEntry.aggregate({
    where: { entryDate: { lt: startDate }, type: "RECEIVED" },
    _sum: { amount: true }
  });
  const priorOut = await db.cashBookEntry.aggregate({
    where: { entryDate: { lt: startDate }, type: "PAID" },
    _sum: { amount: true }
  });
  const openingCash = new Decimal(priorIn._sum.amount || 0).minus(priorOut._sum.amount || 0);
  const closingCash = openingCash.plus(netChange);

  return {
    operating: {
      receiptsFromCustomers: custReceipts.toString(),
      paymentsToSuppliers: vendorPayments.toString(),
      operatingExpenses: expPaid.toString(),
      netOperating: netOperating.toString()
    },
    investing: {
      fixedAssetPurchases: assetOutflow.toString(),
      netInvesting: netInvesting.toString()
    },
    financing: {
      capitalContributions: capitalInflow.toString(),
      netFinancing: netFinancing.toString()
    },
    netChange: netChange.toString(),
    openingCash: openingCash.toString(),
    closingCash: closingCash.toString()
  };
});

export const getProjectProfitabilityForDates = cache(async (startDate: Date, endDate: Date) => {
  const db = await getDb();

  const projects = await db.project.findMany({
    select: {
      id: true,
      name: true,
      projectCode: true,
      contractAmount: true,
      status: true,
      client: { select: { name: true } }
    }
  });

  const report = [];

  for (const prj of projects) {
    // 1. Milestones billed during the period
    const billingInvoices = await db.salesInvoice.findMany({
      where: { projectId: prj.id, status: { not: "CANCELLED" }, invoiceDate: { gte: startDate, lte: endDate } },
      select: { subtotal: true, discountAmount: true }
    });

    let totalBilled = new Decimal(0);
    for (const inv of billingInvoices) {
      totalBilled = totalBilled.plus(new Decimal(inv.subtotal).minus(inv.discountAmount));
    }

    // 2. Material issues consumption cost during the period
    const issues = await db.stockTransaction.findMany({
      where: {
        referenceType: "PROJECT",
        referenceId: prj.id,
        type: "PROJECT_ISSUE",
        createdAt: { gte: startDate, lte: endDate }
      },
      select: { quantity: true, unitCost: true }
    });

    let materialCost = new Decimal(0);
    for (const is of issues) {
      const qty = new Decimal(is.quantity).abs();
      materialCost = materialCost.plus(qty.times(is.unitCost));
    }

    // 3. Labor Cost
    const laborCost = new Decimal(0);

    // Skip projects that had absolutely no billing AND no material issues in this period
    if (totalBilled.eq(0) && materialCost.eq(0)) {
      continue;
    }

    const profit = totalBilled.minus(materialCost).minus(laborCost);
    const margin = totalBilled.greaterThan(0) ? profit.div(totalBilled).times(100).toNumber() : 0;

    report.push({
      projectId: prj.id,
      code: prj.projectCode,
      name: prj.name,
      clientName: prj.client?.name || "N/A",
      contractAmount: new Decimal(prj.contractAmount).toNumber(),
      totalBilled: totalBilled.toNumber(),
      materialCost: materialCost.toNumber(),
      laborCost: laborCost.toNumber(),
      profit: profit.toNumber(),
      margin: Math.round(margin * 100) / 100
    });
  }

  return report.sort((a, b) => b.profit - a.profit);
});

export const getVendorOutstandingAsOf = cache(async (endDate: Date) => {
  const db = await getDb();

  const suppliers = await db.supplier.findMany({
    select: { id: true, name: true, code: true, panNumber: true, openingBalance: true }
  });

  const payables = [];

  for (const s of suppliers) {
    const entries = await db.ledgerEntry.findMany({
      where: { partyType: "SUPPLIER", partyId: s.id, entryDate: { lte: endDate } },
      select: { amount: true, entryType: true }
    });

    let debits = new Decimal(0);
    let credits = new Decimal(s.openingBalance);
    for (const e of entries) {
      if (e.entryType === "CREDIT") credits = credits.plus(e.amount);
      else debits = debits.plus(e.amount);
    }

    const balance = credits.minus(debits);
    if (balance.greaterThan(0)) {
      payables.push({
        code: s.code,
        name: s.name,
        pan: s.panNumber || "N/A",
        balance: balance.toNumber()
      });
    }
  }

  return payables.sort((a, b) => b.balance - a.balance);
});



