import * as XLSX from "xlsx";
import { PartyType } from "@/generated/prisma/enums";
import { fetchPartyLedgerAction } from "@/modules/accounting/actions";
import Decimal from "decimal.js";

export async function downloadLedgerExcel(
  partyId: string,
  partyType: PartyType,
  dateFrom?: string,
  dateTo?: string,
  partyInfo?: any
): Promise<Blob> {
  // 1. Fetch ledger entries from server
  const ledgerData = await fetchPartyLedgerAction(partyType, partyId, { dateFrom, dateTo, pageSize: 999999 });

  const partyName = partyInfo?.name || "Valued Party";
  const partyPan = partyInfo?.panNumber || "-";
  const partyPhone = partyInfo?.phone || "-";
  const partyAddress = partyInfo?.address || "-";

  // 2. Prepare spreadsheet rows (Array of Arrays format for precise layout control)
  const rows: any[][] = [];

  // Metadata headers
  rows.push(["NextGen Interior And WaterProofing"]);
  rows.push(["Gauradaha Nagarpalika-02, Jhapa, Nepal | PAN: 122782202"]);
  rows.push(["PARTY GENERAL LEDGER STATEMENT"]);
  rows.push([]); // Empty spacing

  rows.push(["Party Name:", partyName, "", "PAN Number:", partyPan]);
  rows.push(["Address:", partyAddress, "", "Phone:", partyPhone]);
  rows.push([
    "Period:",
    `${dateFrom ? new Date(dateFrom).toLocaleDateString("en-IN") : "Beginning"} to ${dateTo ? new Date(dateTo).toLocaleDateString("en-IN") : "Present"}`,
    "",
    "Party Type:",
    partyType,
  ]);
  rows.push([]); // Empty spacing

  // Table Columns
  rows.push(["Date", "Reference", "Particulars / Description", "Debit (Dr)", "Credit (Cr)", "Running Balance"]);

  // Opening Balance Row
  rows.push(["-", "-", "Opening Balance brought forward", "", "", Number(ledgerData.openingBalance)]);

  let totalDr = new Decimal(0);
  let totalCr = new Decimal(0);

  // Chronological Entries
  for (const e of ledgerData.entries) {
    const amt = Number(e.amount);
    const isDr = e.entryType === "DEBIT";
    if (isDr) totalDr = totalDr.plus(e.amount);
    else totalCr = totalCr.plus(e.amount);

    rows.push([
      new Date(e.entryDate).toLocaleDateString("en-IN"),
      e.referenceType ? `${e.referenceType}-${e.referenceId?.slice(-4)}` : "-",
      e.description || "-",
      isDr ? amt : "",
      !isDr ? amt : "",
      Number(e.runningBalance),
    ]);
  }

  // Final Summary Row
  const lastIndex = rows.length;
  const closingBalance = ledgerData.entries.length > 0
    ? Number(ledgerData.entries[ledgerData.entries.length - 1].runningBalance)
    : Number(ledgerData.openingBalance);

  rows.push([
    "-",
    "-",
    "Total Period Activity & Net Balance",
    totalDr.toNumber(),
    totalCr.toNumber(),
    closingBalance,
  ]);

  // 3. Create Workbook & sheet
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ledger Sheet");

  // 4. Add smart layout optimizations (column widths auto-fitting)
  const colWidths = [
    { wch: 12 }, // Date
    { wch: 16 }, // Reference
    { wch: 38 }, // Particulars
    { wch: 15 }, // Debit
    { wch: 15 }, // Credit
    { wch: 18 }, // Running Balance
  ];
  ws["!cols"] = colWidths;

  // 5. Build raw binary sheet and compile to Blob
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  
  return new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
