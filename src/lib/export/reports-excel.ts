import * as XLSX from "xlsx";

function getHeaderRows(reportName: string, subInfo?: string): any[][] {
  return [
    ["NextGen Interior And WaterProofing"],
    ["Gauradaha Nagarpalika-02, Jhapa, Nepal | PAN: 122782202 | Phone: +977-9801234567"],
    [reportName.toUpperCase() + " REPORT"],
    subInfo ? [subInfo] : [],
    [] // spacing
  ];
}

function createBlobFromWorkbook(wb: XLSX.WorkBook): Blob {
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

// 1. PROFIT & LOSS STATEMENT EXCEL
export function exportProfitLossExcel(data: any): Blob {
  const rows = getHeaderRows("Profit & Loss Statement", `Period: ${data.period}`);
  
  rows.push(["SECTION / PARTICULAR", "AMOUNT (NPR)"]);
  rows.push(["REVENUE"]);
  rows.push(["  Retail Channel Revenue", Number(data.revenue.retail)]);
  rows.push(["  Wholesale Channel Revenue", Number(data.revenue.wholesale)]);
  rows.push(["  Project Channel Revenue", Number(data.revenue.project)]);
  rows.push(["TOTAL REVENUE (A)", Number(data.revenue.total)]);
  rows.push([]);
  
  rows.push(["COST OF GOODS SOLD"]);
  rows.push(["  Material Procurement & Cost of Sales", Number(data.cogs)]);
  rows.push(["TOTAL COST OF GOODS SOLD (B)", Number(data.cogs)]);
  rows.push([]);
  
  rows.push(["GROSS PROFIT (C = A - B)", Number(data.grossProfit)]);
  rows.push([]);
  
  rows.push(["OPERATING EXPENSES & WRITE-OFFS"]);
  rows.push(["  Operating Expenses (Rent, Utilities, Wages)", Number(data.operatingExpenses)]);
  rows.push(["  Fixed Asset Depreciation", Number(data.depreciation)]);
  rows.push(["TOTAL OPERATING EXPENSES (D)", Number(data.operatingExpenses) + Number(data.depreciation)]);
  rows.push([]);
  
  rows.push(["NET PROFIT / LOSS (C - D)", Number(data.netProfit)]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Profit & Loss");
  ws["!cols"] = [{ wch: 45 }, { wch: 18 }];
  
  return createBlobFromWorkbook(wb);
}

// 2. TRADING ACCOUNT EXCEL
export function exportTradingAccountExcel(data: any): Blob {
  const rows = getHeaderRows("Trading Account", `Period: ${data.period}`);
  
  rows.push(["DEBIT SIDE (Dr)", "AMOUNT (NPR)", "CREDIT SIDE (Cr)", "AMOUNT (NPR)"]);
  rows.push(["Opening Stock brought forward", Number(data.openingStock), "Sales Revenue (Taxable)", Number(data.sales)]);
  rows.push(["Procurement Purchases", Number(data.purchases), "Closing Stock Valuation", Number(data.closingStock)]);
  rows.push(["Cost of Goods Sold (COGS)", Number(data.cogs), "", ""]);
  rows.push(["Gross Profit transferred", Number(data.grossProfit), "", ""]);
  rows.push([]);
  rows.push(["TOTAL DEBIT", Number(data.cogs) + Number(data.grossProfit), "TOTAL CREDIT", Number(data.sales) + Number(data.closingStock)]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Trading Account");
  ws["!cols"] = [{ wch: 32 }, { wch: 18 }, { wch: 32 }, { wch: 18 }];
  
  return createBlobFromWorkbook(wb);
}

// 3. BALANCE SHEET EXCEL
export function exportBalanceSheetExcel(data: any): Blob {
  const rows = getHeaderRows("Balance Sheet", `As of: ${data.asOf}`);
  
  rows.push(["ASSETS (Particulars)", "AMOUNT (NPR)", "LIABILITIES & EQUITY", "AMOUNT (NPR)"]);
  
  // Current Assets vs Liabilities
  rows.push(["CURRENT ASSETS", "", "CURRENT LIABILITIES", ""]);
  rows.push(["  Cash-in-hand (Safe Vault)", Number(data.assets.cash), "  Accounts Payable (Creditors)", Number(data.liabilities.payables)]);
  rows.push(["  Bank Balances", Number(data.assets.bank), "TOTAL LIABILITIES (B)", Number(data.liabilities.total)]);
  rows.push(["  Digital QR Wallets (eSewa/Khalti)", Number(data.assets.digital), "", ""]);
  rows.push(["  Accounts Receivable (Debtors)", Number(data.assets.receivables), "OWNER'S EQUITY", ""]);
  rows.push(["  Inventory Closing Stock Value", Number(data.assets.inventory), "  Owner starting Capital", Number(data.equity.capital)]);
  rows.push(["", "", "  Retained Earnings (Dynamic P&L)", Number(data.equity.retainedEarnings)]);
  rows.push(["FIXED ASSETS", "", "TOTAL EQUITY (C)", Number(data.equity.total)]);
  rows.push(["  Fixed Assets Capitalized Cost", Number(data.assets.fixedCost), "", ""]);
  rows.push(["  Less: Accumulated Depreciation", -Number(data.assets.accumDepreciation), "", ""]);
  rows.push(["  Net Fixed Assets Book Value", Number(data.assets.netFixed), "", ""]);
  rows.push([]);
  rows.push(["TOTAL ASSETS (A)", Number(data.assets.total), "TOTAL LIABILITIES & EQUITY (B + C)", Number(data.liabilities.total) + Number(data.equity.total)]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Balance Sheet");
  ws["!cols"] = [{ wch: 35 }, { wch: 18 }, { wch: 35 }, { wch: 18 }];
  
  return createBlobFromWorkbook(wb);
}

// 4. TRIAL BALANCE EXCEL
export function exportTrialBalanceExcel(data: any): Blob {
  const rows = getHeaderRows("Trial Balance", `As of Date: ${data.asOf || "Present"}`);
  
  rows.push(["Account Code", "Account Name", "Account Type", "Debit (Dr) NPR", "Credit (Cr) NPR"]);
  
  for (const r of data.rows) {
    rows.push([
      r.code,
      r.name,
      r.type,
      r.debit !== "0" ? Number(r.debit) : "",
      r.credit !== "0" ? Number(r.credit) : ""
    ]);
  }
  
  rows.push([]);
  rows.push(["-", "TOTAL SUM BALANCES", "-", Number(data.totals.debit), Number(data.totals.credit)]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Trial Balance");
  ws["!cols"] = [{ wch: 15 }, { wch: 35 }, { wch: 15 }, { wch: 18 }, { wch: 18 }];
  
  return createBlobFromWorkbook(wb);
}

// 5. SALES SUMMARY EXCEL
export function exportSalesSummaryExcel(data: any[]): Blob {
  const rows = getHeaderRows("Sales Chronological Summary");
  
  rows.push(["Date (Y-M-D)", "Daily Invoice Volume count", "Taxable Sales Amount (NPR)"]);
  
  let totalAmt = 0;
  let totalCount = 0;
  for (const r of data) {
    totalAmt += r.amount;
    totalCount += r.count;
    rows.push([r.date, r.count, r.amount]);
  }
  
  rows.push([]);
  rows.push(["TOTALS", totalCount, totalAmt]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sales Summary");
  ws["!cols"] = [{ wch: 18 }, { wch: 25 }, { wch: 25 }];
  
  return createBlobFromWorkbook(wb);
}

// 6. ITEM-WISE SALES EXCEL
export function exportItemWiseSalesExcel(data: any[]): Blob {
  const rows = getHeaderRows("Item-Wise Sales Volume");
  
  rows.push(["Product Code", "Product Description Name", "Quantity Sold", "Sales Revenue (NPR)", "Procurement Cost (NPR)", "Contribution Margin (NPR)"]);
  
  let totalQty = 0;
  let totalRev = 0;
  let totalCost = 0;
  let totalProfit = 0;
  
  for (const r of data) {
    totalQty += r.quantity;
    totalRev += r.revenue;
    totalCost += r.cost;
    totalProfit += r.profit;
    rows.push([r.code, r.name, r.quantity, r.revenue, r.cost, r.profit]);
  }
  
  rows.push([]);
  rows.push(["TOTAL SUM", "-", totalQty, totalRev, totalCost, totalProfit]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Item Sales");
  ws["!cols"] = [{ wch: 15 }, { wch: 35 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  
  return createBlobFromWorkbook(wb);
}

// 7. OUTSTANDING AGING EXCEL
export function exportAgingExcel(data: any[]): Blob {
  const rows = getHeaderRows("Customer Dues Aging Statement");
  
  rows.push(["Cust Code", "Customer Name", "PAN Number", "0 - 30 Days Dues", "31 - 60 Days Dues", "61 - 90 Days Dues", "90+ Days Overdue", "Total Dues (NPR)"]);
  
  let total30 = 0, total60 = 0, total90 = 0, totalOver = 0, totalSum = 0;
  
  for (const r of data) {
    total30 += r["0-30"];
    total60 += r["31-60"];
    total90 += r["61-90"];
    totalOver += r["90+"];
    totalSum += r.total;
    rows.push([r.code, r.name, r.pan, r["0-30"], r["31-60"], r["61-90"], r["90+"], r.total]);
  }
  
  rows.push([]);
  rows.push(["TOTAL SUM", "-", "-", total30, total60, total90, totalOver, totalSum]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dues Aging");
  ws["!cols"] = [{ wch: 12 }, { wch: 28 }, { wch: 15 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }];
  
  return createBlobFromWorkbook(wb);
}

// 8. STOCK VALUATION EXCEL
export function exportStockValuationExcel(data: any[]): Blob {
  const rows = getHeaderRows("FIFO Inventory Stock Valuation");
  
  rows.push(["Item Code", "Product Description", "Current Stock Qty", "Average Procurement Unit Cost", "FIFO Total Valuation (NPR)"]);
  
  let totalQty = 0;
  let totalVal = 0;
  
  for (const r of data) {
    totalQty += r.currentStock;
    totalVal += r.totalValuation;
    rows.push([r.code, r.name, r.currentStock, r.avgCost, r.totalValuation]);
  }
  
  rows.push([]);
  rows.push(["TOTALS", "-", totalQty, "-", totalVal]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stock Valuation");
  ws["!cols"] = [{ wch: 15 }, { wch: 35 }, { wch: 18 }, { wch: 20 }, { wch: 22 }];
  
  return createBlobFromWorkbook(wb);
}

// 9. ABC ANALYSIS EXCEL
export function exportABCAnalysisExcel(data: any[]): Blob {
  const rows = getHeaderRows("ABC Inventory Pareto Revenue Classification");
  
  rows.push(["Item Code", "Product Description Name", "Revenues Earned (NPR)", "Revenue Share %", "Cumulative Share %", "ABC Pareto Category"]);
  
  for (const r of data) {
    rows.push([r.code, r.name, r.revenue, r.percentage, r.cumulativePercentage, r.category]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "ABC Analysis");
  ws["!cols"] = [{ wch: 15 }, { wch: 35 }, { wch: 22 }, { wch: 18 }, { wch: 20 }, { wch: 18 }];
  
  return createBlobFromWorkbook(wb);
}

// 10. PROJECT PROFITABILITY EXCEL
export function exportProjectProfitabilityExcel(data: any[]): Blob {
  const rows = getHeaderRows("Projects Construction Contracts Profitability");
  
  rows.push(["PRJ Code", "Project Contract Name", "Linked Client", "Agreed Budget", "Total Milestone Billed", "Dispatched Materials Cost", "Direct Labor Cost", "Calculated Gross Profit", "Gross Margin %"]);
  
  let totalContract = 0, totalBilled = 0, totalMaterial = 0, totalLabor = 0, totalProfit = 0;
  
  for (const r of data) {
    totalContract += r.contractAmount;
    totalBilled += r.totalBilled;
    totalMaterial += r.materialCost;
    totalLabor += r.laborCost;
    totalProfit += r.profit;
    rows.push([r.code, r.name, r.clientName, r.contractAmount, r.totalBilled, r.materialCost, r.laborCost, r.profit, r.margin]);
  }
  
  rows.push([]);
  rows.push(["TOTAL SUM", "-", "-", totalContract, totalBilled, totalMaterial, totalLabor, totalProfit, "-"]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Projects P&L");
  ws["!cols"] = [{ wch: 12 }, { wch: 30 }, { wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 15 }];
  
  return createBlobFromWorkbook(wb);
}

// 11. CASH FLOW STATEMENT EXCEL
export function exportCashFlowExcel(data: any): Blob {
  const rows = getHeaderRows("Cash Flow Statement", `Period: ${data.period}`);
  
  rows.push(["SECTION / PARTICULAR", "AMOUNT (NPR)"]);
  
  rows.push(["CASH FLOW FROM OPERATING ACTIVITIES"]);
  rows.push(["  Receipts from Customers", Number(data.operating.receiptsFromCustomers)]);
  rows.push(["  Less: Payments to Suppliers", -Number(data.operating.paymentsToSuppliers)]);
  rows.push(["  Less: Operating Expenses Paid", -Number(data.operating.operatingExpenses)]);
  rows.push(["NET CASH FROM OPERATING ACTIVITIES (A)", Number(data.operating.netOperating)]);
  rows.push([]);
  
  rows.push(["CASH FLOW FROM INVESTING ACTIVITIES"]);
  rows.push(["  Less: Purchase of Fixed Assets", -Number(data.investing.fixedAssetPurchases)]);
  rows.push(["NET CASH USED IN INVESTING ACTIVITIES (B)", Number(data.investing.netInvesting)]);
  rows.push([]);
  
  rows.push(["CASH FLOW FROM FINANCING ACTIVITIES"]);
  rows.push(["  Owner Capital Contributions", Number(data.financing.capitalContributions)]);
  rows.push(["NET CASH FROM FINANCING ACTIVITIES (C)", Number(data.financing.netFinancing)]);
  rows.push([]);
  
  rows.push(["NET INCREASE / DECREASE IN CASH (A + B + C)", Number(data.netChange)]);
  rows.push(["Cash and Cash Equivalents at Beginning of Month", Number(data.openingCash)]);
  rows.push(["CASH AND CASH EQUIVALENTS AT END OF MONTH", Number(data.closingCash)]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cash Flow");
  ws["!cols"] = [{ wch: 45 }, { wch: 18 }];
  
  return createBlobFromWorkbook(wb);
}

// 12. PURCHASE SUMMARY EXCEL
export function exportPurchaseSummaryExcel(data: any[]): Blob {
  const rows = getHeaderRows("Purchase Summary");
  
  rows.push(["Date (Y-M-D)", "Daily Purchase Volume count", "Taxable Purchase Amount (NPR)"]);
  
  let totalAmt = 0;
  let totalCount = 0;
  for (const r of data) {
    totalAmt += r.amount;
    totalCount += r.count;
    rows.push([r.date, r.count, r.amount]);
  }
  
  rows.push([]);
  rows.push(["TOTALS", totalCount, totalAmt]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Purchase Summary");
  ws["!cols"] = [{ wch: 18 }, { wch: 25 }, { wch: 25 }];
  
  return createBlobFromWorkbook(wb);
}

// 13. VENDOR OUTSTANDING PAYABLES EXCEL
export function exportVendorOutstandingExcel(data: any[]): Blob {
  const rows = getHeaderRows("Vendor Outstanding Payables");
  
  rows.push(["Vendor Code", "Vendor / Supplier Name", "PAN Number", "Outstanding Balance (NPR)"]);
  
  let totalSum = 0;
  for (const r of data) {
    totalSum += r.balance;
    rows.push([r.code, r.name, r.pan, r.balance]);
  }
  
  rows.push([]);
  rows.push(["TOTAL OUTSTANDING", "-", "-", totalSum]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Payables Outstanding");
  ws["!cols"] = [{ wch: 15 }, { wch: 35 }, { wch: 18 }, { wch: 22 }];
  
  return createBlobFromWorkbook(wb);
}


