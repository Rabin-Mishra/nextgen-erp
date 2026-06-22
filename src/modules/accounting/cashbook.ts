import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/modules/auth/session";
import Decimal from "decimal.js";
import { CashEntryType, PartyType, PaymentMode } from "@/generated/prisma/client";
import { createLedgerEntry } from "./ledger";

interface CreateCashEntryData {
  entryDate: Date | string;
  type: CashEntryType;
  amount: Decimal | number | string;
  description?: string | null;
  partyType?: PartyType | null;
  partyId?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  paymentMethod: PaymentMode;
  createdBy?: string;
}

// 1. GET CASHBOOK ENTRIES WITH CHRONOLOGICAL RUNNING BALANCE
export async function getCashBookEntries(dateFrom?: string | Date, dateTo?: string | Date) {
  try {
    const db = await getDb();
    
    const filterFrom = dateFrom ? new Date(dateFrom) : undefined;
    const filterTo = dateTo ? new Date(dateTo) : undefined;

    // A. Calculate opening cash balance prior to dateFrom
    let openingBalance = new Decimal(0);
    if (filterFrom) {
      const sumIn = await db.cashBookEntry.aggregate({
        where: { entryDate: { lt: filterFrom }, type: "RECEIVED" },
        _sum: { amount: true },
      });
      const sumOut = await db.cashBookEntry.aggregate({
        where: { entryDate: { lt: filterFrom }, type: "PAID" },
        _sum: { amount: true },
      });
      openingBalance = new Decimal(sumIn._sum.amount || 0).minus(sumOut._sum.amount || 0);
    }

    // B. Query matching cash book rows
    const where: any = {};
    if (filterFrom || filterTo) {
      where.entryDate = {
        ...(filterFrom ? { gte: filterFrom } : {}),
        ...(filterTo ? { lte: filterTo } : {}),
      };
    }

    const entries = await db.cashBookEntry.findMany({
      where,
      orderBy: [
        { entryDate: "asc" },
        { createdAt: "asc" }
      ],
      include: { creator: { select: { name: true } } },
    });

    // C. Map running balance sequentially
    let currentRunning = openingBalance;
    const results = entries.map((entry) => {
      const amount = new Decimal(entry.amount);
      if (entry.type === "RECEIVED") {
        currentRunning = currentRunning.plus(amount);
      } else {
        currentRunning = currentRunning.minus(amount);
      }

      return {
        ...entry,
        amount: entry.amount.toString(),
        runningBalance: currentRunning.toString(),
      };
    });

    return {
      openingBalance: openingBalance.toString(),
      closingBalance: currentRunning.toString(),
      entries: results,
    };
  } catch (error) {
    console.error("Database connection error in getCashBookEntries:", error);
    return {
      openingBalance: "0.00",
      closingBalance: "0.00",
      entries: [],
      error: "Database connection failed. Please check your network or configuration."
    };
  }
}

// 2. GET CASHBOOK SUMMARY FOR A SPECIFIC DATE (Opening, Received, Paid, Closing)
export async function getCashBookSummary(date: Date | string) {
  try {
    const db = await getDb();
    const targetDate = new Date(date);
    
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    // A. Compute opening balance (all history before start of day)
    const sumInBefore = await db.cashBookEntry.aggregate({
      where: { entryDate: { lt: startOfDay }, type: "RECEIVED" },
      _sum: { amount: true },
    });
    const sumOutBefore = await db.cashBookEntry.aggregate({
      where: { entryDate: { lt: startOfDay }, type: "PAID" },
      _sum: { amount: true },
    });
    const openingBalance = new Decimal(sumInBefore._sum.amount || 0).minus(sumOutBefore._sum.amount || 0);

    // B. Compute received today
    const sumInToday = await db.cashBookEntry.aggregate({
      where: {
        entryDate: { gte: startOfDay, lte: endOfDay },
        type: "RECEIVED"
      },
      _sum: { amount: true },
    });
    const receivedToday = new Decimal(sumInToday._sum.amount || 0);

    // C. Compute paid today
    const sumOutToday = await db.cashBookEntry.aggregate({
      where: {
        entryDate: { gte: startOfDay, lte: endOfDay },
        type: "PAID"
      },
      _sum: { amount: true },
    });
    const paidToday = new Decimal(sumOutToday._sum.amount || 0);

    // D. Compute closing
    const closingBalance = openingBalance.plus(receivedToday).minus(paidToday);

    // E. Compute breakdown by payment methods today
    const methods = ["CASH", "BANK", "CHEQUE", "ESEWA", "KHALTI"] as PaymentMode[];
    const methodSummaries: Record<string, string> = {};

    for (const m of methods) {
      const sumInM = await db.cashBookEntry.aggregate({
        where: { entryDate: { lt: endOfDay }, paymentMethod: m, type: "RECEIVED" },
        _sum: { amount: true },
      });
      const sumOutM = await db.cashBookEntry.aggregate({
        where: { entryDate: { lt: endOfDay }, paymentMethod: m, type: "PAID" },
        _sum: { amount: true },
      });
      const mBal = new Decimal(sumInM._sum.amount || 0).minus(sumOutM._sum.amount || 0);
      methodSummaries[m] = mBal.toString();
    }

    return {
      openingBalance: openingBalance.toString(),
      receivedToday: receivedToday.toString(),
      paidToday: paidToday.toString(),
      closingBalance: closingBalance.toString(),
      methodBalances: methodSummaries,
    };
  } catch (error) {
    console.error("Database connection error in getCashBookSummary:", error);
    return {
      openingBalance: "0.00",
      receivedToday: "0.00",
      paidToday: "0.00",
      closingBalance: "0.00",
      methodBalances: {
        CASH: "0.00",
        BANK: "0.00",
        CHEQUE: "0.00",
        ESEWA: "0.00",
        KHALTI: "0.00",
      },
      error: "Database connection failed. Please check your network or configuration."
    };
  }
}

// 3. ADD MANUAL CASH BOOK ENTRY WITH ATOMIC DOUBLE-ENTRY MATCHING
export async function addCashEntry(data: CreateCashEntryData) {
  const db = await getDb();
  
  let actorId = data.createdBy;
  if (!actorId) {
    const session = await getCurrentUser();
    if (!session?.id) throw new Error("Unauthorized");
    actorId = session.id;
  }

  return db.$transaction(async (tx) => {
    // A. Create the CashBookEntry record
    const cashEntry = await tx.cashBookEntry.create({
      data: {
        entryDate: new Date(data.entryDate),
        type: data.type,
        amount: new Decimal(data.amount),
        description: data.description,
        partyType: data.partyType,
        partyId: data.partyId,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        paymentMethod: data.paymentMethod,
        createdBy: actorId!,
      },
    });

    // B. If a party customer/supplier is linked, post the matching double-entry line in LedgerEntry
    if (data.partyType && data.partyId) {
      // Offset logic:
      // - RECEIVED (Inflow) ➔ Client/Supplier outstanding gets CREDIT (decreases customer dues, supplier refund credit).
      // - PAID (Outflow) ➔ Client/Supplier ledger gets DEBIT (reduces supplier payable balance, refunds client).
      const ledgerEntryType = data.type === "RECEIVED" ? "CREDIT" : "DEBIT";
      const ledgerDescription = data.description || `CashBook link - Method: ${data.paymentMethod}`;

      await createLedgerEntry({
        entryDate: new Date(data.entryDate),
        partyType: data.partyType,
        partyId: data.partyId,
        entryType: ledgerEntryType,
        amount: data.amount,
        referenceType: "CASH_BOOK",
        referenceId: cashEntry.id,
        description: ledgerDescription,
        channelType: "GENERAL",
        createdBy: actorId,
      }, tx);
    }

    // C. Record to Audit Log
    await tx.auditLog.create({
      data: {
        userId: actorId!,
        action: "CREATE",
        module: "CASHBOOK",
        recordId: cashEntry.id,
        newValues: {
          id: cashEntry.id,
          amount: data.amount.toString(),
          type: data.type,
          paymentMethod: data.paymentMethod,
        },
      },
    });

    return cashEntry;
  });
}

// 4. GET DAILY CASHFLOW GRAPH METRICS (Daily Inflow/Outflow sums for charts)
export async function getDailyCashFlow(month: number, year: number) {
  const db = await getDb();
  
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const entries = await db.cashBookEntry.findMany({
    where: {
      entryDate: { gte: startOfMonth, lte: endOfMonth }
    },
    select: { entryDate: true, type: true, amount: true },
  });

  const dailyTotals: Record<number, { inflow: Decimal; outflow: Decimal }> = {};
  
  // Initialize days
  const daysInMonth = endOfMonth.getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    dailyTotals[i] = { inflow: new Decimal(0), outflow: new Decimal(0) };
  }

  for (const e of entries) {
    const day = new Date(e.entryDate).getDate();
    if (e.type === "RECEIVED") {
      dailyTotals[day].inflow = dailyTotals[day].inflow.plus(e.amount);
    } else {
      dailyTotals[day].outflow = dailyTotals[day].outflow.plus(e.amount);
    }
  }

  const results = [];
  for (let d = 1; d <= daysInMonth; d++) {
    results.push({
      day: d,
      dateString: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      inflow: dailyTotals[d].inflow.toString(),
      outflow: dailyTotals[d].outflow.toString(),
    });
  }

  return results;
}

// 5. HELPER TO RECALCULATE LEDGER BALANCES CHRONOLOGICALLY
export async function recalculateLedgerBalances(partyType: PartyType, partyId: string, tx: any) {
  const entries = await tx.ledgerEntry.findMany({
    where: { partyType, partyId },
    orderBy: [
      { entryDate: "asc" },
      { createdAt: "asc" }
    ],
  });

  let runningBalance = new Decimal(0);
  if (partyType === "CUSTOMER") {
    const cust = await tx.customer.findUnique({
      where: { id: partyId },
      select: { openingBalance: true },
    });
    runningBalance = new Decimal(cust?.openingBalance || 0);
  } else {
    const supp = await tx.supplier.findUnique({
      where: { id: partyId },
      select: { openingBalance: true },
    });
    runningBalance = new Decimal(supp?.openingBalance || 0);
  }

  for (const entry of entries) {
    const amount = new Decimal(entry.amount);
    if (partyType === "CUSTOMER") {
      runningBalance = runningBalance.plus(entry.entryType === "DEBIT" ? amount : amount.negated());
    } else {
      runningBalance = runningBalance.plus(entry.entryType === "CREDIT" ? amount : amount.negated());
    }

    await tx.ledgerEntry.update({
      where: { id: entry.id },
      data: { runningBalance },
    });
  }
}

// 6. UPDATE MANUAL CASH BOOK ENTRY WITH LEDGER SYNC
export async function updateCashEntry(id: string, data: CreateCashEntryData) {
  const db = await getDb();
  
  let actorId = data.createdBy;
  if (!actorId) {
    const session = await getCurrentUser();
    if (!session?.id) throw new Error("Unauthorized");
    actorId = session.id;
  }

  return db.$transaction(async (tx) => {
    const existing = await tx.cashBookEntry.findUnique({
      where: { id },
    });
    if (!existing) throw new Error("Cash book entry not found");

    if (existing.referenceType && existing.referenceType !== "CASH_BOOK") {
      throw new Error("System-generated transactions cannot be edited directly from the cash book page.");
    }

    const oldPartyType = existing.partyType;
    const oldPartyId = existing.partyId;

    const updatedCashEntry = await tx.cashBookEntry.update({
      where: { id },
      data: {
        entryDate: new Date(data.entryDate),
        type: data.type,
        amount: new Decimal(data.amount),
        description: data.description,
        partyType: data.partyType || null,
        partyId: data.partyId || null,
        paymentMethod: data.paymentMethod,
      },
    });

    const linkedLedger = await tx.ledgerEntry.findFirst({
      where: { referenceType: "CASH_BOOK", referenceId: id },
    });

    const isPartyLinkedNow = data.partyType && data.partyId;
    const wasPartyLinkedBefore = oldPartyType && oldPartyId;

    if (isPartyLinkedNow) {
      const ledgerEntryType = data.type === "RECEIVED" ? "CREDIT" : "DEBIT";
      const ledgerDescription = data.description || `CashBook link - Method: ${data.paymentMethod}`;

      if (wasPartyLinkedBefore && oldPartyType === data.partyType && oldPartyId === data.partyId) {
        if (linkedLedger) {
          await tx.ledgerEntry.update({
            where: { id: linkedLedger.id },
            data: {
              entryDate: new Date(data.entryDate),
              entryType: ledgerEntryType,
              amount: new Decimal(data.amount),
              description: ledgerDescription,
            },
          });
        } else {
          await createLedgerEntry({
            entryDate: new Date(data.entryDate),
            partyType: data.partyType!,
            partyId: data.partyId!,
            entryType: ledgerEntryType,
            amount: data.amount,
            referenceType: "CASH_BOOK",
            referenceId: id,
            description: ledgerDescription,
            channelType: "GENERAL",
            createdBy: actorId,
          }, tx);
        }
        await recalculateLedgerBalances(data.partyType!, data.partyId!, tx);
      } else {
        if (linkedLedger) {
          await tx.ledgerEntry.delete({ where: { id: linkedLedger.id } });
        }
        if (wasPartyLinkedBefore) {
          await recalculateLedgerBalances(oldPartyType!, oldPartyId!, tx);
        }

        await createLedgerEntry({
          entryDate: new Date(data.entryDate),
          partyType: data.partyType!,
          partyId: data.partyId!,
          entryType: ledgerEntryType,
          amount: data.amount,
          referenceType: "CASH_BOOK",
          referenceId: id,
          description: ledgerDescription,
          channelType: "GENERAL",
          createdBy: actorId,
        }, tx);

        await recalculateLedgerBalances(data.partyType!, data.partyId!, tx);
      }
    } else {
      if (linkedLedger) {
        await tx.ledgerEntry.delete({ where: { id: linkedLedger.id } });
      }
      if (wasPartyLinkedBefore) {
        await recalculateLedgerBalances(oldPartyType!, oldPartyId!, tx);
      }
    }

    await tx.auditLog.create({
      data: {
        userId: actorId!,
        action: "UPDATE",
        module: "CASHBOOK",
        recordId: id,
        oldValues: existing as any,
        newValues: {
          id,
          amount: data.amount.toString(),
          type: data.type,
          paymentMethod: data.paymentMethod,
          partyType: data.partyType,
          partyId: data.partyId,
        },
      },
    });

    return updatedCashEntry;
  });
}

// 7. DELETE MANUAL CASH BOOK ENTRY WITH LEDGER SYNC
export async function deleteCashEntry(id: string, userId?: string) {
  const db = await getDb();
  
  let actorId = userId;
  if (!actorId) {
    const session = await getCurrentUser();
    if (!session?.id) throw new Error("Unauthorized");
    actorId = session.id;
  }

  return db.$transaction(async (tx) => {
    const existing = await tx.cashBookEntry.findUnique({
      where: { id },
    });
    if (!existing) throw new Error("Cash book entry not found");

    if (existing.referenceType && existing.referenceType !== "CASH_BOOK") {
      throw new Error("System-generated transactions cannot be deleted directly from the cash book page.");
    }

    const oldPartyType = existing.partyType;
    const oldPartyId = existing.partyId;

    await tx.cashBookEntry.delete({
      where: { id },
    });

    const linkedLedger = await tx.ledgerEntry.findFirst({
      where: { referenceType: "CASH_BOOK", referenceId: id },
    });

    if (linkedLedger) {
      await tx.ledgerEntry.delete({ where: { id: linkedLedger.id } });
    }

    if (oldPartyType && oldPartyId) {
      await recalculateLedgerBalances(oldPartyType, oldPartyId, tx);
    }

    await tx.auditLog.create({
      data: {
        userId: actorId!,
        action: "DELETE",
        module: "CASHBOOK",
        recordId: id,
        oldValues: existing as any,
      },
    });

    return existing;
  });
}
