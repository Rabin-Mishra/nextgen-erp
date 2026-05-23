import React from "react";
import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";

// Core styles for professional A4 document layouts
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    color: "#1f2937",
    fontFamily: "Helvetica",
  },
  header: {
    backgroundColor: "#111827", // sleek dark gray/black
    padding: 16,
    color: "#ffffff",
    marginBottom: 20,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  metaSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 10,
  },
  metaBlock: {
    flexDirection: "column",
    gap: 3,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#4b5563",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  titleText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111827",
  },
  table: {
    flexDirection: "column",
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingVertical: 6,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingVertical: 6,
    alignItems: "center",
  },
  tableRowAlternate: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    backgroundColor: "#f9fafb",
    paddingVertical: 6,
    alignItems: "center",
  },
  tableTotalRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#9ca3af",
    borderBottomWidth: 1,
    borderBottomColor: "#9ca3af",
    paddingVertical: 8,
    marginTop: 8,
    fontWeight: "bold",
  },
  col1: { width: "70%", paddingHorizontal: 4 },
  col2: { width: "30%", textAlign: "right", paddingHorizontal: 4 },
  
  colBS1: { width: "35%", paddingHorizontal: 4 },
  colBS2: { width: "15%", textAlign: "right", paddingHorizontal: 4 },
  colBS3: { width: "35%", paddingHorizontal: 4 },
  colBS4: { width: "15%", textAlign: "right", paddingHorizontal: 4 },

  colTBCode: { width: "15%", paddingHorizontal: 4 },
  colTBName: { width: "40%", paddingHorizontal: 4 },
  colTBType: { width: "15%", paddingHorizontal: 4 },
  colTBDebit: { width: "15%", textAlign: "right", paddingHorizontal: 4 },
  colTBCredit: { width: "15%", textAlign: "right", paddingHorizontal: 4 },

  colAgeCode: { width: "10%", paddingHorizontal: 4 },
  colAgeName: { width: "25%", paddingHorizontal: 4 },
  colAgePan: { width: "13%", paddingHorizontal: 4 },
  colAgeVal: { width: "10%", textAlign: "right", paddingHorizontal: 2 },
  colAgeTotal: { width: "12%", textAlign: "right", paddingHorizontal: 4, fontWeight: "bold" },

  colPrjCode: { width: "10%", paddingHorizontal: 4 },
  colPrjName: { width: "25%", paddingHorizontal: 4 },
  colPrjVal: { width: "13%", textAlign: "right", paddingHorizontal: 4 },
  colPrjMargin: { width: "13%", textAlign: "right", paddingHorizontal: 4 },

  signSection: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signLine: {
    width: 150,
    borderTopWidth: 1,
    borderTopColor: "#9ca3af",
    marginTop: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#4b5563",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 7,
    color: "#9ca3af",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 5,
  },
});

function formatMoney(value: string | number) {
  const amt = Number(value);
  if (isNaN(amt)) return "0.00";
  return amt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Letterhead({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>NextGen Interior And WaterProofing</Text>
      <Text>Gauradaha Nagarpalika-02, Jhapa, Nepal | Phone: +977-9801234567</Text>
      <Text>PAN: 122782202 | Official {title}</Text>
    </View>
  );
}

function DocumentWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {children}
        <View style={styles.signSection}>
          <View>
            <Text style={styles.signLine}>Prepared By (Accounts)</Text>
          </View>
          <View>
            <Text style={styles.signLine}>Authorized Audit Signature</Text>
          </View>
        </View>
        <Text style={styles.footer}>
          This is a certified system-generated financial report. NextGen Interior And WaterProofing, Jhapa, Nepal.
        </Text>
      </Page>
    </Document>
  );
}

// 1. PROFIT & LOSS STATEMENT PDF
export function ProfitLossPDF({ data }: { data: any }) {
  return (
    <DocumentWrapper>
      <Letterhead title="Profit & Loss Statement" />
      <View style={styles.metaSection}>
        <View style={styles.metaBlock}>
          <Text style={styles.sectionTitle}>Statement Period</Text>
          <Text style={styles.titleText}>{data.period}</Text>
        </View>
        <View style={styles.metaBlock}>
          <Text style={styles.sectionTitle}>Summary Status</Text>
          <Text style={{ fontWeight: "bold" }}>Net Income: NPR {formatMoney(data.netProfit)}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.col1}>SECTION / ACCOUNT PARTICULAR</Text>
          <Text style={styles.col2}>AMOUNT (NPR)</Text>
        </View>

        <View style={styles.tableRow}><Text style={[styles.col1, { fontWeight: "bold" }]}>REVENUES (SALES)</Text></View>
        <View style={styles.tableRowAlternate}><Text style={styles.col1}>  Retail Channel Revenue</Text><Text style={styles.col2}>{formatMoney(data.revenue.retail)}</Text></View>
        <View style={styles.tableRow}><Text style={styles.col1}>  Wholesale Channel Revenue</Text><Text style={styles.col2}>{formatMoney(data.revenue.wholesale)}</Text></View>
        <View style={styles.tableRowAlternate}><Text style={styles.col1}>  Project Channel Revenue</Text><Text style={styles.col2}>{formatMoney(data.revenue.project)}</Text></View>
        <View style={styles.tableTotalRow}><Text style={styles.col1}>TOTAL REVENUE (A)</Text><Text style={styles.col2}>{formatMoney(data.revenue.total)}</Text></View>

        <View style={styles.tableRow}><Text style={[styles.col1, { fontWeight: "bold", marginTop: 5 }]}>COST OF GOODS SOLD</Text></View>
        <View style={styles.tableRowAlternate}><Text style={styles.col1}>  Material Procurement & Cost of Sales (COGS)</Text><Text style={styles.col2}>{formatMoney(data.cogs)}</Text></View>
        <View style={styles.tableTotalRow}><Text style={styles.col1}>TOTAL COST OF GOODS SOLD (B)</Text><Text style={styles.col2}>{formatMoney(data.cogs)}</Text></View>

        <View style={[styles.tableTotalRow, { backgroundColor: "#f3f4f6" }]}><Text style={styles.col1}>GROSS PROFIT (C = A - B)</Text><Text style={styles.col2}>{formatMoney(data.grossProfit)}</Text></View>

        <View style={styles.tableRow}><Text style={[styles.col1, { fontWeight: "bold", marginTop: 5 }]}>OPERATING EXPENSES</Text></View>
        <View style={styles.tableRowAlternate}><Text style={styles.col1}>  Operating Expenses (Rent, Utilities, Wages, Site Costs)</Text><Text style={styles.col2}>{formatMoney(data.operatingExpenses)}</Text></View>
        <View style={styles.tableRow}><Text style={styles.col1}>  Fixed Asset Depreciation (SL & DDB)</Text><Text style={styles.col2}>{formatMoney(data.depreciation)}</Text></View>
        <View style={styles.tableTotalRow}>
          <Text style={styles.col1}>TOTAL OPERATING EXPENSES (D)</Text>
          <Text style={styles.col2}>{formatMoney(Number(data.operatingExpenses) + Number(data.depreciation))}</Text>
        </View>

        <View style={[styles.tableTotalRow, { backgroundColor: "#e5e7eb", borderTopWidth: 2 }]}><Text style={[styles.col1, { fontWeight: "bold" }]}>NET OPERATIONS PROFIT / LOSS (C - D)</Text><Text style={[styles.col2, { fontWeight: "bold" }]}>{formatMoney(data.netProfit)}</Text></View>
      </View>
    </DocumentWrapper>
  );
}

// 2. TRADING ACCOUNT PDF
export function TradingAccountPDF({ data }: { data: any }) {
  return (
    <DocumentWrapper>
      <Letterhead title="Trading Account" />
      <View style={styles.metaSection}>
        <View style={styles.metaBlock}>
          <Text style={styles.sectionTitle}>Period</Text>
          <Text style={styles.titleText}>{data.period}</Text>
        </View>
        <View style={styles.metaBlock}>
          <Text style={styles.sectionTitle}>Gross Margin %</Text>
          <Text style={{ fontWeight: "bold" }}>GP Margin: {Number(data.sales) > 0 ? ((Number(data.grossProfit) / Number(data.sales)) * 100).toFixed(2) : "0.00"}%</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.colBS1}>DEBIT PARTICULARS (Dr)</Text>
          <Text style={styles.colBS2}>AMOUNT (NPR)</Text>
          <Text style={styles.colBS3}>CREDIT PARTICULARS (Cr)</Text>
          <Text style={styles.colBS4}>AMOUNT (NPR)</Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={styles.colBS1}>Opening Stock brought forward</Text><Text style={styles.colBS2}>{formatMoney(data.openingStock)}</Text>
          <Text style={styles.colBS3}>Sales Revenue (Net of VAT)</Text><Text style={styles.colBS4}>{formatMoney(data.sales)}</Text>
        </View>
        <View style={styles.tableRowAlternate}>
          <Text style={styles.colBS1}>Procurement Purchases</Text><Text style={styles.colBS2}>{formatMoney(data.purchases)}</Text>
          <Text style={styles.colBS3}>Closing Stock Valuation</Text><Text style={styles.colBS4}>{formatMoney(data.closingStock)}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.colBS1}>Cost of Goods Sold (COGS)</Text><Text style={styles.colBS2}>{formatMoney(data.cogs)}</Text>
          <Text style={styles.colBS3}>-</Text><Text style={styles.colBS4}>-</Text>
        </View>
        <View style={styles.tableRowAlternate}>
          <Text style={styles.colBS1}>Gross Profit transferred</Text><Text style={styles.colBS2}>{formatMoney(data.grossProfit)}</Text>
          <Text style={styles.colBS3}>-</Text><Text style={styles.colBS4}>-</Text>
        </View>

        <View style={styles.tableTotalRow}>
          <Text style={styles.colBS1}>TOTAL DEBITS</Text>
          <Text style={styles.colBS2}>{formatMoney(Number(data.cogs) + Number(data.grossProfit))}</Text>
          <Text style={styles.colBS3}>TOTAL CREDITS</Text>
          <Text style={styles.colBS4}>{formatMoney(Number(data.sales) + Number(data.closingStock))}</Text>
        </View>
      </View>
    </DocumentWrapper>
  );
}

// 3. BALANCE SHEET PDF
export function BalanceSheetPDF({ data }: { data: any }) {
  return (
    <DocumentWrapper>
      <Letterhead title="Balance Sheet Statement" />
      <View style={styles.metaSection}>
        <View style={styles.metaBlock}>
          <Text style={styles.sectionTitle}>Snapshot Date</Text>
          <Text style={styles.titleText}>{data.asOf}</Text>
        </View>
        <View style={styles.metaBlock}>
          <Text style={styles.sectionTitle}>Equations Matching</Text>
          <Text style={{ fontWeight: "bold" }}>Assets = Liabilities + Equity (Balanced)</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.colBS1}>ASSETS PARTICULARS</Text>
          <Text style={styles.colBS2}>AMOUNT (NPR)</Text>
          <Text style={styles.colBS3}>LIABILITIES & EQUITIES</Text>
          <Text style={styles.colBS4}>AMOUNT (NPR)</Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={[styles.colBS1, { fontWeight: "bold" }]}>CURRENT ASSETS</Text><Text style={styles.colBS2}></Text>
          <Text style={[styles.colBS3, { fontWeight: "bold" }]}>CURRENT LIABILITIES</Text><Text style={styles.colBS4}></Text>
        </View>
        
        <View style={styles.tableRowAlternate}>
          <Text style={styles.colBS1}>  Cash-in-hand (Safe Vault)</Text><Text style={styles.colBS2}>{formatMoney(data.assets.cash)}</Text>
          <Text style={styles.colBS3}>  Accounts Payable (Creditors)</Text><Text style={styles.colBS4}>{formatMoney(data.liabilities.payables)}</Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={styles.colBS1}>  Bank Vault Balances</Text><Text style={styles.colBS2}>{formatMoney(data.assets.bank)}</Text>
          <Text style={[styles.colBS3, { fontWeight: "bold" }]}>TOTAL LIABILITIES (B)</Text><Text style={[styles.colBS4, { fontWeight: "bold" }]}>{formatMoney(data.liabilities.total)}</Text>
        </View>

        <View style={styles.tableRowAlternate}>
          <Text style={styles.colBS1}>  Digital QR Wallets (eSewa/Khalti)</Text><Text style={styles.colBS2}>{formatMoney(data.assets.digital)}</Text>
          <Text style={[styles.colBS3, { fontWeight: "bold", marginTop: 5 }]}>OWNER'S EQUITY</Text><Text style={styles.colBS4}></Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={styles.colBS1}>  Accounts Receivable (Debtors)</Text><Text style={styles.colBS2}>{formatMoney(data.assets.receivables)}</Text>
          <Text style={styles.colBS3}>  Owner starting Capital</Text><Text style={styles.colBS4}>{formatMoney(data.equity.capital)}</Text>
        </View>

        <View style={styles.tableRowAlternate}>
          <Text style={styles.colBS1}>  Inventory Closing Stock Value</Text><Text style={styles.colBS2}>{formatMoney(data.assets.inventory)}</Text>
          <Text style={styles.colBS3}>  Retained Earnings (Dynamic P&L)</Text><Text style={styles.colBS4}>{formatMoney(data.equity.retainedEarnings)}</Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={[styles.colBS1, { fontWeight: "bold", marginTop: 5 }]}>FIXED ASSETS</Text><Text style={styles.colBS2}></Text>
          <Text style={[styles.colBS3, { fontWeight: "bold" }]}>TOTAL EQUITY (C)</Text><Text style={[styles.colBS4, { fontWeight: "bold" }]}>{formatMoney(data.equity.total)}</Text>
        </View>

        <View style={styles.tableRowAlternate}>
          <Text style={styles.colBS1}>  Capitalized Asset Cost</Text><Text style={styles.colBS2}>{formatMoney(data.assets.fixedCost)}</Text>
          <Text style={styles.colBS3}>-</Text><Text style={styles.colBS4}>-</Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={styles.colBS1}>  Less: Accum. Depreciation</Text><Text style={styles.colBS2}>({formatMoney(data.assets.accumDepreciation)})</Text>
          <Text style={styles.colBS3}>-</Text><Text style={styles.colBS4}>-</Text>
        </View>

        <View style={styles.tableRowAlternate}>
          <Text style={styles.colBS1}>  Net Fixed Assets Value</Text><Text style={styles.colBS2}>{formatMoney(data.assets.netFixed)}</Text>
          <Text style={styles.colBS3}>-</Text><Text style={styles.colBS4}>-</Text>
        </View>

        <View style={[styles.tableTotalRow, { backgroundColor: "#f3f4f6" }]}>
          <Text style={styles.colBS1}>TOTAL ASSETS (A)</Text>
          <Text style={styles.colBS2}>{formatMoney(data.assets.total)}</Text>
          <Text style={styles.colBS3}>TOTAL LIABILITIES & EQUITY (B+C)</Text>
          <Text style={styles.colBS4}>{formatMoney(Number(data.liabilities.total) + Number(data.equity.total))}</Text>
        </View>
      </View>
    </DocumentWrapper>
  );
}

// 4. TRIAL BALANCE PDF
export function TrialBalancePDF({ data }: { data: any }) {
  return (
    <DocumentWrapper>
      <Letterhead title="Trial Balance Sheet" />
      <View style={styles.metaSection}>
        <View style={styles.metaBlock}>
          <Text style={styles.sectionTitle}>Snapshot Date</Text>
          <Text style={styles.titleText}>{data.asOf || "Present"}</Text>
        </View>
        <View style={styles.metaBlock}>
          <Text style={styles.sectionTitle}>Cumulative Balance</Text>
          <Text style={{ fontWeight: "bold" }}>Debit equals Credit (Balanced)</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.colTBCode}>Code</Text>
          <Text style={styles.colTBName}>Account Name Particulars</Text>
          <Text style={styles.colTBType}>Account Type</Text>
          <Text style={styles.colTBDebit}>Debit (Dr) NPR</Text>
          <Text style={styles.colTBCredit}>Credit (Cr) NPR</Text>
        </View>

        {data.rows.map((r: any, idx: number) => (
          <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlternate}>
            <Text style={styles.colTBCode}>{r.code}</Text>
            <Text style={styles.colTBName}>{r.name}</Text>
            <Text style={styles.colTBType}>{r.type}</Text>
            <Text style={styles.colTBDebit}>{r.debit !== "0" ? formatMoney(r.debit) : "-"}</Text>
            <Text style={styles.colTBCredit}>{r.credit !== "0" ? formatMoney(r.credit) : "-"}</Text>
          </View>
        ))}

        <View style={styles.tableTotalRow}>
          <Text style={styles.colTBCode}>-</Text>
          <Text style={styles.colTBName}>TOTAL LEDGER SUM BALANCES</Text>
          <Text style={styles.colTBType}>-</Text>
          <Text style={styles.colTBDebit}>{formatMoney(data.totals.debit)}</Text>
          <Text style={styles.colTBCredit}>{formatMoney(data.totals.credit)}</Text>
        </View>
      </View>
    </DocumentWrapper>
  );
}

// 5. CUSTOMER DUES AGING PDF
export function AgingPDF({ data }: { data: any[] }) {
  return (
    <DocumentWrapper>
      <Letterhead title="Customer Dues Aging Statement" />
      <View style={styles.metaSection}>
        <View style={styles.metaBlock}>
          <Text style={styles.sectionTitle}>Summary Type</Text>
          <Text style={styles.titleText}>Chronological Receivables aging</Text>
        </View>
        <View style={styles.metaBlock}>
          <Text style={styles.sectionTitle}>Total outstanding dues</Text>
          <Text style={{ fontWeight: "bold" }}>
            NPR {formatMoney(data.reduce((acc, curr) => acc + curr.total, 0))}
          </Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.colAgeCode}>Code</Text>
          <Text style={styles.colAgeName}>Customer Name</Text>
          <Text style={styles.colAgePan}>PAN Number</Text>
          <Text style={styles.colAgeVal}>0 - 30 days</Text>
          <Text style={styles.colAgeVal}>31 - 60 days</Text>
          <Text style={styles.colAgeVal}>61 - 90 days</Text>
          <Text style={styles.colAgeVal}>90+ days</Text>
          <Text style={styles.colAgeTotal}>Total Dues</Text>
        </View>

        {data.map((r: any, idx: number) => (
          <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlternate}>
            <Text style={styles.colAgeCode}>{r.code}</Text>
            <Text style={styles.colAgeName}>{r.name}</Text>
            <Text style={styles.colAgePan}>{r.pan}</Text>
            <Text style={styles.colAgeVal}>{formatMoney(r["0-30"])}</Text>
            <Text style={styles.colAgeVal}>{formatMoney(r["31-60"])}</Text>
            <Text style={styles.colAgeVal}>{formatMoney(r["61-90"])}</Text>
            <Text style={styles.colAgeVal}>{formatMoney(r["90+"])}</Text>
            <Text style={styles.colAgeTotal}>{formatMoney(r.total)}</Text>
          </View>
        ))}

        <View style={styles.tableTotalRow}>
          <Text style={styles.colAgeCode}>-</Text>
          <Text style={styles.colAgeName}>AGGREGATED RECEIVABLES SUM</Text>
          <Text style={styles.colAgePan}>-</Text>
          <Text style={styles.colAgeVal}>{formatMoney(data.reduce((acc, curr) => acc + curr["0-30"], 0))}</Text>
          <Text style={styles.colAgeVal}>{formatMoney(data.reduce((acc, curr) => acc + curr["31-60"], 0))}</Text>
          <Text style={styles.colAgeVal}>{formatMoney(data.reduce((acc, curr) => acc + curr["61-90"], 0))}</Text>
          <Text style={styles.colAgeVal}>{formatMoney(data.reduce((acc, curr) => acc + curr["90+"], 0))}</Text>
          <Text style={styles.colAgeTotal}>{formatMoney(data.reduce((acc, curr) => acc + curr.total, 0))}</Text>
        </View>
      </View>
    </DocumentWrapper>
  );
}

// 6. PROJECTS PROFITABILITY PDF
export function ProjectProfitabilityPDF({ data }: { data: any[] }) {
  return (
    <DocumentWrapper>
      <Letterhead title="Projects Profitability Summary" />
      <View style={styles.metaSection}>
        <View style={styles.metaBlock}>
          <Text style={styles.sectionTitle}>Summary Category</Text>
          <Text style={styles.titleText}>Construction Site Margin Costing</Text>
        </View>
        <View style={styles.metaBlock}>
          <Text style={styles.sectionTitle}>Total Net Profit</Text>
          <Text style={{ fontWeight: "bold" }}>
            NPR {formatMoney(data.reduce((acc, curr) => acc + curr.profit, 0))}
          </Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.colPrjCode}>Code</Text>
          <Text style={styles.colPrjName}>Project description Name</Text>
          <Text style={styles.colPrjVal}>Contract</Text>
          <Text style={styles.colPrjVal}>Billed</Text>
          <Text style={styles.colPrjVal}>Material Cost</Text>
          <Text style={styles.colPrjVal}>Net Profit</Text>
          <Text style={styles.colPrjMargin}>Margin%</Text>
        </View>

        {data.map((r: any, idx: number) => (
          <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlternate}>
            <Text style={styles.colPrjCode}>{r.code}</Text>
            <Text style={styles.colPrjName}>{r.name}</Text>
            <Text style={styles.colPrjVal}>{formatMoney(r.contractAmount)}</Text>
            <Text style={styles.colPrjVal}>{formatMoney(r.totalBilled)}</Text>
            <Text style={styles.colPrjVal}>{formatMoney(r.materialCost)}</Text>
            <Text style={styles.colPrjVal}>{formatMoney(r.profit)}</Text>
            <Text style={styles.colPrjMargin}>{r.margin.toFixed(2)}%</Text>
          </View>
        ))}

        <View style={styles.tableTotalRow}>
          <Text style={styles.colPrjCode}>-</Text>
          <Text style={styles.colPrjName}>TOTAL PROJECTS ACCUMULATION</Text>
          <Text style={styles.colPrjVal}>{formatMoney(data.reduce((acc: number, curr: any) => acc + curr.contractAmount, 0))}</Text>
          <Text style={styles.colPrjVal}>{formatMoney(data.reduce((acc: number, curr: any) => acc + curr.totalBilled, 0))}</Text>
          <Text style={styles.colPrjVal}>{formatMoney(data.reduce((acc: number, curr: any) => acc + curr.materialCost, 0))}</Text>
          <Text style={styles.colPrjVal}>{formatMoney(data.reduce((acc: number, curr: any) => acc + curr.profit, 0))}</Text>
          <Text style={styles.colPrjMargin}>-</Text>
        </View>
      </View>
    </DocumentWrapper>
  );
}

// 7. CASH FLOW STATEMENT PDF
export function CashFlowPDF({ data }: { data: any }) {
  return (
    <DocumentWrapper>
      <Letterhead title="Cash Flow Statement" />
      <View style={styles.metaSection}>
        <View style={styles.metaBlock}>
          <Text style={styles.sectionTitle}>Statement Period</Text>
          <Text style={styles.titleText}>{data.period}</Text>
        </View>
        <View style={styles.metaBlock}>
          <Text style={styles.sectionTitle}>Net Cash Flow</Text>
          <Text style={{ fontWeight: "bold" }}>Net Change: NPR {formatMoney(data.netChange)}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.col1}>SECTION / PARTICULAR</Text>
          <Text style={styles.col2}>AMOUNT (NPR)</Text>
        </View>

        <View style={styles.tableRow}><Text style={[styles.col1, { fontWeight: "bold" }]}>CASH FLOW FROM OPERATING ACTIVITIES</Text></View>
        <View style={styles.tableRowAlternate}><Text style={styles.col1}>  Receipts from Customers</Text><Text style={styles.col2}>{formatMoney(data.operating.receiptsFromCustomers)}</Text></View>
        <View style={styles.tableRow}><Text style={styles.col1}>  Less: Payments to Suppliers</Text><Text style={styles.col2}>({formatMoney(data.operating.paymentsToSuppliers)})</Text></View>
        <View style={styles.tableRowAlternate}><Text style={styles.col1}>  Less: Operating Expenses Paid</Text><Text style={styles.col2}>({formatMoney(data.operating.operatingExpenses)})</Text></View>
        <View style={styles.tableTotalRow}><Text style={styles.col1}>NET CASH FROM OPERATING ACTIVITIES (A)</Text><Text style={styles.col2}>{formatMoney(data.operating.netOperating)}</Text></View>

        <View style={styles.tableRow}><Text style={[styles.col1, { fontWeight: "bold", marginTop: 5 }]}>CASH FLOW FROM INVESTING ACTIVITIES</Text></View>
        <View style={styles.tableRowAlternate}><Text style={styles.col1}>  Less: Purchase of Fixed Assets</Text><Text style={styles.col2}>({formatMoney(data.investing.fixedAssetPurchases)})</Text></View>
        <View style={styles.tableTotalRow}><Text style={styles.col1}>NET CASH USED IN INVESTING ACTIVITIES (B)</Text><Text style={styles.col2}>{formatMoney(data.investing.netInvesting)}</Text></View>

        <View style={styles.tableRow}><Text style={[styles.col1, { fontWeight: "bold", marginTop: 5 }]}>CASH FLOW FROM FINANCING ACTIVITIES</Text></View>
        <View style={styles.tableRowAlternate}><Text style={styles.col1}>  Owner Capital Contributions</Text><Text style={styles.col2}>{formatMoney(data.financing.capitalContributions)}</Text></View>
        <View style={styles.tableTotalRow}><Text style={styles.col1}>NET CASH FROM FINANCING ACTIVITIES (C)</Text><Text style={styles.col2}>{formatMoney(data.financing.netFinancing)}</Text></View>

        <View style={[styles.tableTotalRow, { backgroundColor: "#f3f4f6", borderTopWidth: 2 }]}><Text style={styles.col1}>NET INCREASE/DECREASE IN CASH (A + B + C)</Text><Text style={styles.col2}>{formatMoney(data.netChange)}</Text></View>
        <View style={styles.tableRow}><Text style={styles.col1}>Cash and Cash Equivalents at Beginning of Month</Text><Text style={styles.col2}>{formatMoney(data.openingCash)}</Text></View>
        <View style={[styles.tableTotalRow, { backgroundColor: "#e5e7eb" }]}><Text style={[styles.col1, { fontWeight: "bold" }]}>CASH AND CASH EQUIVALENTS AT END OF MONTH</Text><Text style={[styles.col2, { fontWeight: "bold" }]}>{formatMoney(data.closingCash)}</Text></View>
      </View>
    </DocumentWrapper>
  );
}

// 8. SALES SUMMARY PDF
export function SalesSummaryPDF({ data }: { data: any[] }) {
  return (
    <DocumentWrapper>
      <Letterhead title="Sales Chronological Summary" />
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.col1, { width: "40%" }]}>Date (Y-M-D)</Text>
          <Text style={[styles.col1, { width: "30%", textAlign: "right" }]}>Daily Invoices count</Text>
          <Text style={[styles.col2, { width: "30%" }]}>Taxable Sales Amount (NPR)</Text>
        </View>

        {data.map((r: any, idx: number) => (
          <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlternate}>
            <Text style={[styles.col1, { width: "40%" }]}>{r.date}</Text>
            <Text style={[styles.col1, { width: "30%", textAlign: "right" }]}>{r.count}</Text>
            <Text style={[styles.col2, { width: "30%" }]}>{formatMoney(r.amount)}</Text>
          </View>
        ))}

        <View style={styles.tableTotalRow}>
          <Text style={[styles.col1, { width: "40%", fontWeight: "bold" }]}>TOTAL SUM</Text>
          <Text style={[styles.col1, { width: "30%", textAlign: "right", fontWeight: "bold" }]}>{data.reduce((acc, curr) => acc + curr.count, 0)}</Text>
          <Text style={[styles.col2, { width: "30%", fontWeight: "bold" }]}>{formatMoney(data.reduce((acc, curr) => acc + curr.amount, 0))}</Text>
        </View>
      </View>
    </DocumentWrapper>
  );
}

// 9. ITEM-WISE SALES PDF
export function ItemWiseSalesPDF({ data }: { data: any[] }) {
  return (
    <DocumentWrapper>
      <Letterhead title="Item-Wise Sales Volume & Contribution" />
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.col1, { width: "15%" }]}>Item Code</Text>
          <Text style={[styles.col1, { width: "40%" }]}>Product Description Particulars</Text>
          <Text style={[styles.col1, { width: "15%", textAlign: "right" }]}>Qty Sold</Text>
          <Text style={[styles.col1, { width: "15%", textAlign: "right" }]}>Revenue (NPR)</Text>
          <Text style={[styles.col2, { width: "15%" }]}>Net profit</Text>
        </View>

        {data.map((r: any, idx: number) => (
          <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlternate}>
            <Text style={[styles.col1, { width: "15%" }]}>{r.code}</Text>
            <Text style={[styles.col1, { width: "40%" }]}>{r.name}</Text>
            <Text style={[styles.col1, { width: "15%", textAlign: "right" }]}>{r.quantity}</Text>
            <Text style={[styles.col1, { width: "15%", textAlign: "right" }]}>{formatMoney(r.revenue)}</Text>
            <Text style={[styles.col2, { width: "15%" }]}>{formatMoney(r.profit)}</Text>
          </View>
        ))}

        <View style={styles.tableTotalRow}>
          <Text style={[styles.col1, { width: "15%" }]}>-</Text>
          <Text style={[styles.col1, { width: "40%", fontWeight: "bold" }]}>TOTAL OUTFLOW VOLUME</Text>
          <Text style={[styles.col1, { width: "15%", textAlign: "right", fontWeight: "bold" }]}>{data.reduce((acc, curr) => acc + curr.quantity, 0)}</Text>
          <Text style={[styles.col1, { width: "15%", textAlign: "right", fontWeight: "bold" }]}>{formatMoney(data.reduce((acc, curr) => acc + curr.revenue, 0))}</Text>
          <Text style={[styles.col2, { width: "15%", fontWeight: "bold" }]}>{formatMoney(data.reduce((acc, curr) => acc + curr.profit, 0))}</Text>
        </View>
      </View>
    </DocumentWrapper>
  );
}

// 10. FIFO STOCK VALUATION PDF
export function StockValuationPDF({ data }: { data: any[] }) {
  return (
    <DocumentWrapper>
      <Letterhead title="FIFO Inventory Stock Valuation" />
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.col1, { width: "15%" }]}>Item Code</Text>
          <Text style={[styles.col1, { width: "45%" }]}>Product Description Particulars</Text>
          <Text style={[styles.col1, { width: "12%", textAlign: "right" }]}>Stock Qty</Text>
          <Text style={[styles.col1, { width: "13%", textAlign: "right" }]}>Avg Cost</Text>
          <Text style={[styles.col2, { width: "15%" }]}>FIFO Value</Text>
        </View>

        {data.map((r: any, idx: number) => (
          <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlternate}>
            <Text style={[styles.col1, { width: "15%" }]}>{r.code}</Text>
            <Text style={[styles.col1, { width: "45%" }]}>{r.name}</Text>
            <Text style={[styles.col1, { width: "12%", textAlign: "right" }]}>{r.currentStock}</Text>
            <Text style={[styles.col1, { width: "13%", textAlign: "right" }]}>{formatMoney(r.avgCost)}</Text>
            <Text style={[styles.col2, { width: "15%" }]}>{formatMoney(r.totalValuation)}</Text>
          </View>
        ))}

        <View style={styles.tableTotalRow}>
          <Text style={[styles.col1, { width: "15%" }]}>-</Text>
          <Text style={[styles.col1, { width: "45%", fontWeight: "bold" }]}>AGGREGATED INVENTORY VALUE</Text>
          <Text style={[styles.col1, { width: "12%", textAlign: "right", fontWeight: "bold" }]}>{data.reduce((acc, curr) => acc + curr.currentStock, 0)}</Text>
          <Text style={[styles.col1, { width: "13%", textAlign: "right" }]}>-</Text>
          <Text style={[styles.col2, { width: "15%", fontWeight: "bold" }]}>{formatMoney(data.reduce((acc, curr) => acc + curr.totalValuation, 0))}</Text>
        </View>
      </View>
    </DocumentWrapper>
  );
}

// 11. ABC ANALYSIS PDF
export function ABCAnalysisPDF({ data }: { data: any[] }) {
  return (
    <DocumentWrapper>
      <Letterhead title="ABC Inventory Pareto Revenue Classification" />
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.col1, { width: "15%" }]}>Item Code</Text>
          <Text style={[styles.col1, { width: "35%" }]}>Product Description Particulars</Text>
          <Text style={[styles.col1, { width: "18%", textAlign: "right" }]}>Revenue Earned</Text>
          <Text style={[styles.col1, { width: "16%", textAlign: "right" }]}>Share %</Text>
          <Text style={[styles.col2, { width: "16%" }]}>ABC Pareto Class</Text>
        </View>

        {data.map((r: any, idx: number) => (
          <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlternate}>
            <Text style={[styles.col1, { width: "15%" }]}>{r.code}</Text>
            <Text style={[styles.col1, { width: "35%" }]}>{r.name}</Text>
            <Text style={[styles.col1, { width: "18%", textAlign: "right" }]}>{formatMoney(r.revenue)}</Text>
            <Text style={[styles.col1, { width: "16%", textAlign: "right" }]}>{r.percentage.toFixed(2)}%</Text>
            <Text style={[styles.col2, { width: "16%", fontWeight: "bold" }]}>Class {r.category}</Text>
          </View>
        ))}
      </View>
    </DocumentWrapper>
  );
}

// 12. PURCHASE SUMMARY PDF
export function PurchaseSummaryPDF({ data }: { data: any[] }) {
  return (
    <DocumentWrapper>
      <Letterhead title="Purchase Chronological Summary" />
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.col1, { width: "40%" }]}>Date (Y-M-D)</Text>
          <Text style={[styles.col1, { width: "30%", textAlign: "right" }]}>Daily Purchases count</Text>
          <Text style={[styles.col2, { width: "30%" }]}>Taxable Purchase Amount (NPR)</Text>
        </View>

        {data.map((r: any, idx: number) => (
          <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlternate}>
            <Text style={[styles.col1, { width: "40%" }]}>{r.date}</Text>
            <Text style={[styles.col1, { width: "30%", textAlign: "right" }]}>{r.count}</Text>
            <Text style={[styles.col2, { width: "30%" }]}>{formatMoney(r.amount)}</Text>
          </View>
        ))}

        <View style={styles.tableTotalRow}>
          <Text style={[styles.col1, { width: "40%", fontWeight: "bold" }]}>TOTAL SUM</Text>
          <Text style={[styles.col1, { width: "30%", textAlign: "right", fontWeight: "bold" }]}>{data.reduce((acc, curr) => acc + curr.count, 0)}</Text>
          <Text style={[styles.col2, { width: "30%", fontWeight: "bold" }]}>{formatMoney(data.reduce((acc, curr) => acc + curr.amount, 0))}</Text>
        </View>
      </View>
    </DocumentWrapper>
  );
}

// 13. VENDOR OUTSTANDING PAYABLES PDF
export function VendorOutstandingPDF({ data }: { data: any[] }) {
  return (
    <DocumentWrapper>
      <Letterhead title="Vendor Outstanding Payables" />
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.col1, { width: "15%" }]}>Vendor Code</Text>
          <Text style={[styles.col1, { width: "40%" }]}>Vendor / Supplier Name</Text>
          <Text style={[styles.col1, { width: "20%" }]}>PAN Number</Text>
          <Text style={[styles.col2, { width: "25%" }]}>Outstanding Balance (NPR)</Text>
        </View>

        {data.map((r: any, idx: number) => (
          <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlternate}>
            <Text style={[styles.col1, { width: "15%" }]}>{r.code}</Text>
            <Text style={[styles.col1, { width: "40%" }]}>{r.name}</Text>
            <Text style={[styles.col1, { width: "20%" }]}>{r.pan}</Text>
            <Text style={[styles.col2, { width: "25%" }]}>{formatMoney(r.balance)}</Text>
          </View>
        ))}

        <View style={styles.tableTotalRow}>
          <Text style={[styles.col1, { width: "15%" }]}>-</Text>
          <Text style={[styles.col1, { width: "40%", fontWeight: "bold" }]}>TOTAL OUTSTANDING</Text>
          <Text style={[styles.col1, { width: "20%" }]}>-</Text>
          <Text style={[styles.col2, { width: "25%", fontWeight: "bold" }]}>{formatMoney(data.reduce((acc, curr) => acc + curr.balance, 0))}</Text>
        </View>
      </View>
    </DocumentWrapper>
  );
}

// ----------------------------------------------------------------------------
// BLOB DOWNLOAD COMPILERS
// ----------------------------------------------------------------------------
export async function downloadProfitLossPDF(data: any): Promise<Blob> {
  return pdf(<ProfitLossPDF data={data} />).toBlob();
}

export async function downloadTradingAccountPDF(data: any): Promise<Blob> {
  return pdf(<TradingAccountPDF data={data} />).toBlob();
}

export async function downloadBalanceSheetPDF(data: any): Promise<Blob> {
  return pdf(<BalanceSheetPDF data={data} />).toBlob();
}

export async function downloadTrialBalancePDF(data: any): Promise<Blob> {
  return pdf(<TrialBalancePDF data={data} />).toBlob();
}

export async function downloadAgingPDF(data: any[]): Promise<Blob> {
  return pdf(<AgingPDF data={data} />).toBlob();
}

export async function downloadProjectProfitabilityPDF(data: any[]): Promise<Blob> {
  return pdf(<ProjectProfitabilityPDF data={data} />).toBlob();
}

export async function downloadCashFlowPDF(data: any): Promise<Blob> {
  return pdf(<CashFlowPDF data={data} />).toBlob();
}

export async function downloadSalesSummaryPDF(data: any[]): Promise<Blob> {
  return pdf(<SalesSummaryPDF data={data} />).toBlob();
}

export async function downloadItemWiseSalesPDF(data: any[]): Promise<Blob> {
  return pdf(<ItemWiseSalesPDF data={data} />).toBlob();
}

export async function downloadStockValuationPDF(data: any[]): Promise<Blob> {
  return pdf(<StockValuationPDF data={data} />).toBlob();
}

export async function downloadABCAnalysisPDF(data: any[]): Promise<Blob> {
  return pdf(<ABCAnalysisPDF data={data} />).toBlob();
}

export async function downloadPurchaseSummaryPDF(data: any[]): Promise<Blob> {
  return pdf(<PurchaseSummaryPDF data={data} />).toBlob();
}

export async function downloadVendorOutstandingPDF(data: any[]): Promise<Blob> {
  return pdf(<VendorOutstandingPDF data={data} />).toBlob();
}


