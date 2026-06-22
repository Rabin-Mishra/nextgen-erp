"use server";

import { PartyType, CashEntryType, PaymentMode, InvoiceType } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { checkServerPermission } from "@/auth/permissions.server";
import {
  createLedgerEntry,
  reverseLedgerEntry,
  getPartyLedger,
  getLedgerSummary,
  getChannelLedger,
  getTrialBalance,
  getPartiesBalances,
} from "./ledger";
import {
  getCashBookEntries,
  getCashBookSummary,
  addCashEntry,
  getDailyCashFlow,
  updateCashEntry,
  deleteCashEntry,
} from "./cashbook";
import {
  runMonthlyDepreciationForAll,
  getDepreciationSchedule,
  getAssetRegister,
  createFixedAsset,
} from "./depreciation";
import {
  getProfitLossData,
  getTradingAccountData,
  getBalanceSheetData,
  getTrialBalanceData,
  getSalesSummary,
  getItemWiseSales,
  getAgingReport,
  getProjectProfitability,
  getCashFlowData,
  getPurchaseSummary,
  getVendorOutstanding,
  getTradingAccountDataForDates,
  getProfitLossDataForDates,
  getCashFlowDataForDates,
  getProjectProfitabilityForDates,
  getVendorOutstandingAsOf,
} from "./reports";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/auth/session";

// 1. PARTY LOOKUPS FOR CASHBOOK ENTRIES
export async function getAccountingLookups() {
  const db = await getDb();
  
  const customers = await db.customer.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true, customerType: true },
    orderBy: { name: "asc" },
  });

  const suppliers = await db.supplier.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  return { customers, suppliers };
}

// 2. CASH BOOK SERVER ACTIONS
export async function addCashBookEntryAction(data: {
  entryDate: string;
  type: CashEntryType;
  amount: number;
  description?: string;
  partyType?: PartyType;
  partyId?: string;
  paymentMethod: PaymentMode;
}) {
  await checkServerPermission("cashbook", "create");
  try {
    const res = await addCashEntry({
      entryDate: new Date(data.entryDate),
      type: data.type,
      amount: data.amount,
      description: data.description || "",
      partyType: data.partyType || null,
      partyId: data.partyId || null,
      paymentMethod: data.paymentMethod,
    });
    
    revalidatePath("/cashbook");
    revalidatePath("/ledger");
    revalidatePath("/dashboard");
    return { success: true, entry: res };
  } catch (error: any) {
    console.error("Failed to add cash entry:", error);
    return { success: false, error: error.message || "Failed to save cash entry" };
  }
}

// 2b. UPDATE CASH BOOK ENTRY SERVER ACTION
export async function updateCashBookEntryAction(
  id: string,
  data: {
    entryDate: string;
    type: CashEntryType;
    amount: number;
    description?: string;
    partyType?: PartyType;
    partyId?: string;
    paymentMethod: PaymentMode;
  }
) {
  await checkServerPermission("cashbook", "edit");
  try {
    const res = await updateCashEntry(id, {
      entryDate: new Date(data.entryDate),
      type: data.type,
      amount: data.amount,
      description: data.description || "",
      partyType: data.partyType || null,
      partyId: data.partyId || null,
      paymentMethod: data.paymentMethod,
    });
    
    revalidatePath("/cashbook");
    revalidatePath("/ledger");
    revalidatePath("/dashboard");
    return { success: true, entry: res };
  } catch (error: any) {
    console.error("Failed to update cash entry:", error);
    return { success: false, error: error.message || "Failed to update cash entry" };
  }
}

// 2c. DELETE CASH BOOK ENTRY SERVER ACTION
export async function deleteCashBookEntryAction(id: string) {
  await checkServerPermission("cashbook", "delete");
  try {
    const res = await deleteCashEntry(id);
    
    revalidatePath("/cashbook");
    revalidatePath("/ledger");
    revalidatePath("/dashboard");
    return { success: true, entry: res };
  } catch (error: any) {
    console.error("Failed to delete cash entry:", error);
    return { success: false, error: error.message || "Failed to delete cash entry" };
  }
}

// 3. LEDGER REVERSAL SERVER ACTION
export async function reverseLedgerEntryAction(originalId: string, reason: string) {
  await checkServerPermission("ledger", "approve");
  try {
    const res = await reverseLedgerEntry(originalId, reason);
    revalidatePath("/ledger");
    return { success: true, entry: res };
  } catch (error: any) {
    console.error("Failed to reverse ledger entry:", error);
    return { success: false, error: error.message || "Reversal failed" };
  }
}

// 4. FIXED ASSETS SERVER ACTIONS
export async function createFixedAssetAction(data: {
  name: string;
  category: string;
  purchaseDate: string;
  purchasePrice: number;
  usefulLifeYears: number;
  depreciationMethod: "STRAIGHT_LINE" | "DECLINING_BALANCE";
}) {
  await checkServerPermission("ledger", "create");
  try {
    const res = await createFixedAsset(data);
    revalidatePath("/assets");
    return { success: true, asset: res };
  } catch (error: any) {
    console.error("Failed to create fixed asset:", error);
    return { success: false, error: error.message || "Failed to save asset" };
  }
}

export async function runDepreciationAction() {
  await checkServerPermission("ledger", "approve");
  try {
    const res = await runMonthlyDepreciationForAll();
    revalidatePath("/assets");
    revalidatePath("/dashboard");
    return { success: true, count: res.length };
  } catch (error: any) {
    console.error("Failed to run depreciation batch:", error);
    return { success: false, error: error.message || "Batch depreciation failed" };
  }
}

// 5. READ-ONLY DATA ACTIONS FOR DYNAMIC CLIENT RENDERING
export async function fetchPartyLedgerAction(
  partyType: PartyType,
  partyId: string,
  filters: { dateFrom?: string; dateTo?: string; channelType?: any; page?: number; pageSize?: number }
) {
  return getPartyLedger(partyType, partyId, {
    ...filters,
    dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
    dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
  });
}

export async function fetchLedgerSummaryAction() {
  return getLedgerSummary();
}

export async function fetchCashBookSummaryAction(date: string) {
  return getCashBookSummary(date);
}

export async function fetchCashBookEntriesAction(dateFrom?: string, dateTo?: string) {
  return getCashBookEntries(dateFrom, dateTo);
}

export async function fetchDailyCashFlowAction(month: number, year: number) {
  return getDailyCashFlow(month, year);
}

export async function fetchDepreciationScheduleAction(assetId: string) {
  return getDepreciationSchedule(assetId);
}

export async function fetchAssetRegisterAction() {
  return getAssetRegister();
}

export async function fetchTrialBalanceAction(asOf: string) {
  return getTrialBalance(asOf);
}

export async function fetchPartiesBalancesAction() {
  return getPartiesBalances();
}

// --- STAGE 8: REPORTS SERVER ACTIONS ---
export async function fetchProfitLossAction(month: number, year: number) {
  return getProfitLossData(month, year);
}

export async function fetchTradingAccountAction(month: number, year: number) {
  return getTradingAccountData(month, year);
}

export async function fetchBalanceSheetAction(asOf: string) {
  return getBalanceSheetData(asOf);
}

export async function fetchTrialBalanceDataAction(asOf: string) {
  return getTrialBalanceData(asOf);
}

export async function fetchSalesSummaryAction(dateFrom: string, dateTo: string, channel?: InvoiceType) {
  return getSalesSummary(dateFrom, dateTo, channel);
}

export async function fetchItemWiseSalesAction(dateFrom: string, dateTo: string) {
  return getItemWiseSales(dateFrom, dateTo);
}

export async function fetchAgingReportAction() {
  return getAgingReport();
}



export async function fetchProjectProfitabilityAction() {
  return getProjectProfitability();
}

export async function fetchCashFlowAction(month: number, year: number) {
  return getCashFlowData(month, year);
}

export async function fetchPurchaseSummaryAction(dateFrom: string, dateTo: string) {
  return getPurchaseSummary(dateFrom, dateTo);
}

export async function fetchVendorOutstandingAction() {
  return getVendorOutstanding();
}

export async function fetchFiscalYearReportDataAction(fiscalYearId: string) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "SUPERADMIN" && user.role !== "OWNER")) {
    throw new Error("Access Denied. Only Superadmins and Owners can download fiscal year binders.");
  }

  const db = await getDb();
  const fy = await db.fiscalYear.findUnique({
    where: { id: fiscalYearId }
  });

  if (!fy) {
    throw new Error("Fiscal year period not found.");
  }

  const startDate = new Date(fy.startDate);
  const endDate = new Date(fy.endDate);

  const [trading, pl, balanceSheet, cashFlow, projects, topSelling, vendorOutstanding] = await Promise.all([
    getTradingAccountDataForDates(startDate, endDate),
    getProfitLossDataForDates(startDate, endDate),
    getBalanceSheetData(endDate),
    getCashFlowDataForDates(startDate, endDate),
    getProjectProfitabilityForDates(startDate, endDate),
    getItemWiseSales(startDate, endDate),
    getVendorOutstandingAsOf(endDate)
  ]);

  return {
    fiscalYear: {
      name: fy.name,
      startDate: fy.startDate.toISOString(),
      endDate: fy.endDate.toISOString()
    },
    trading,
    pl,
    balanceSheet,
    cashFlow,
    projects,
    topSelling,
    vendorOutstanding
  };
}

