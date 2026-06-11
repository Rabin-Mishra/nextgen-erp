import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { PartyType } from "@/generated/prisma/enums";
import { fetchPartyLedgerAction } from "@/modules/accounting/actions";
import { getDb } from "@/lib/db";
import Decimal from "decimal.js";

// Reuse standard styles for clean visual appearance
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    color: "#1f2937",
    fontFamily: "Helvetica",
  },
  header: {
    backgroundColor: "#1e3a8a",
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
    marginBottom: 20,
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
  colDate: { width: "15%", paddingHorizontal: 4 },
  colRef: { width: "15%", paddingHorizontal: 4 },
  colDesc: { width: "34%", paddingHorizontal: 4 },
  colDr: { width: "12%", textAlign: "right", paddingHorizontal: 4 },
  colCr: { width: "12%", textAlign: "right", paddingHorizontal: 4 },
  colBal: { width: "12%", textAlign: "right", paddingHorizontal: 4, fontWeight: "bold" },
  totals: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#9ca3af",
    paddingVertical: 8,
    marginTop: 8,
    fontWeight: "bold",
  },
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
  return amt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface LedgerPDFProps {
  party: { name: string; panNumber?: string | null; phone?: string | null; address?: string | null };
  partyType: PartyType;
  entries: any[];
  openingBalance: string;
  closingBalance: string;
  totalDr: string;
  totalCr: string;
  dateFrom?: string;
  dateTo?: string;
}

export function LedgerPDF({
  party,
  partyType,
  entries,
  openingBalance,
  closingBalance,
  totalDr,
  totalCr,
  dateFrom,
  dateTo,
}: LedgerPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Letterhead */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>NextGen Interior And WaterProofing</Text>
          <Text>Gauradaha Nagarpalika-02, Jhapa, Nepal | Phone: 9843146474</Text>
          <Text>PAN: 122782202 | Official Party Ledger Statement</Text>
        </View>

        {/* Meta details */}
        <View style={styles.metaSection}>
          <View style={styles.metaBlock}>
            <Text style={styles.sectionTitle}>Statement For</Text>
            <Text style={{ fontSize: 11, fontWeight: "bold" }}>{party.name}</Text>
            {party.address && <Text>{party.address}</Text>}
            {party.phone && <Text>Phone: {party.phone}</Text>}
            {party.panNumber && <Text>PAN: {party.panNumber}</Text>}
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.sectionTitle}>Statement Summary</Text>
            <Text>Party Type: {partyType}</Text>
            <Text>Period: {dateFrom ? new Date(dateFrom).toLocaleDateString("en-IN") : "Beginning"} to {dateTo ? new Date(dateTo).toLocaleDateString("en-IN") : "Present"}</Text>
            <Text style={{ fontWeight: "bold" }}>Closing Balance: NPR {formatMoney(closingBalance)}</Text>
          </View>
        </View>

        {/* Ledger Table */}
        <View style={styles.table}>
          {/* Header Row */}
          <View style={styles.tableHeader}>
            <Text style={styles.colDate}>Date</Text>
            <Text style={styles.colRef}>Reference</Text>
            <Text style={styles.colDesc}>Particulars / Description</Text>
            <Text style={[styles.colDr, { fontWeight: "bold" }]}>Debit (Dr)</Text>
            <Text style={[styles.colCr, { fontWeight: "bold" }]}>Credit (Cr)</Text>
            <Text style={styles.colBal}>Balance</Text>
          </View>

          {/* Opening Balance Row */}
          <View style={[styles.tableRow, { backgroundColor: "#f9fafb" }]}>
            <Text style={styles.colDate}>-</Text>
            <Text style={styles.colRef}>-</Text>
            <Text style={[styles.colDesc, { fontWeight: "bold" }]}>Opening Balance brought forward</Text>
            <Text style={styles.colDr}>-</Text>
            <Text style={styles.colCr}>-</Text>
            <Text style={styles.colBal}>{formatMoney(openingBalance)}</Text>
          </View>

          {/* Chronological Entries Rows */}
          {entries.map((e, index) => (
            <View key={e.id || index} style={styles.tableRow}>
              <Text style={styles.colDate}>{new Date(e.entryDate).toLocaleDateString("en-IN")}</Text>
              <Text style={[styles.colRef, { fontFamily: "Courier", fontSize: 8 }]}>
                {e.referenceType ? `${e.referenceType}-${e.referenceId?.slice(-4)}` : "-"}
              </Text>
              <Text style={styles.colDesc}>{e.description || "-"}</Text>
              <Text style={styles.colDr}>{e.entryType === "DEBIT" ? formatMoney(e.amount) : "-"}</Text>
              <Text style={styles.colCr}>{e.entryType === "CREDIT" ? formatMoney(e.amount) : "-"}</Text>
              <Text style={styles.colBal}>{formatMoney(e.runningBalance)}</Text>
            </View>
          ))}

          {/* Footer Totals Row */}
          <View style={styles.totals}>
            <Text style={styles.colDate}>-</Text>
            <Text style={styles.colRef}>-</Text>
            <Text style={styles.colDesc}>Total Period Activity & Net Balance</Text>
            <Text style={styles.colDr}>{formatMoney(totalDr)}</Text>
            <Text style={styles.colCr}>{formatMoney(totalCr)}</Text>
            <Text style={styles.colBal}>{formatMoney(closingBalance)}</Text>
          </View>
        </View>

        {/* Firm Signatures Section */}
        <View style={styles.signSection}>
          <View>
            <Text style={styles.signLine}>Prepared By (Accounts)</Text>
          </View>
          <View>
            <Text style={styles.signLine}>Authorized Signature</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          This is a system-generated statement. NextGen Interior And WaterProofing, Gauradaha-02, Jhapa, Nepal.
        </Text>
      </Page>
    </Document>
  );
}

export async function downloadLedgerPDF(
  partyId: string,
  partyType: PartyType,
  dateFrom?: string,
  dateTo?: string,
  partyInfo?: any
): Promise<Blob> {
  // 1. Fetch ledger entries from server
  const ledgerData = await fetchPartyLedgerAction(partyType, partyId, { dateFrom, dateTo, pageSize: 999999 });

  // 2. Resolve party details
  let party = partyInfo;
  if (!party) {
    // If not supplied, search via lookup or fetch
    party = { name: "Valued Customer/Vendor" };
  }

  // 3. Compute sums
  let totalDr = new Decimal(0);
  let totalCr = new Decimal(0);
  for (const e of ledgerData.entries) {
    const amt = new Decimal(e.amount);
    if (e.entryType === "DEBIT") totalDr = totalDr.plus(amt);
    else totalCr = totalCr.plus(amt);
  }

  const closingBalance = ledgerData.entries.length > 0
    ? ledgerData.entries[ledgerData.entries.length - 1].runningBalance
    : ledgerData.openingBalance;

  // 4. Generate & Compile PDF document directly to Blob
  return pdf(
    <LedgerPDF
      party={party}
      partyType={partyType}
      entries={ledgerData.entries}
      openingBalance={ledgerData.openingBalance}
      closingBalance={closingBalance}
      totalDr={totalDr.toString()}
      totalCr={totalCr.toString()}
      dateFrom={dateFrom}
      dateTo={dateTo}
    />
  ).toBlob();
}
