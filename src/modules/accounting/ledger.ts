import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/modules/auth/session";
import Decimal from "decimal.js";
import { PartyType, EntryType, ChannelType } from "@/generated/prisma/client";

interface CreateLedgerEntryData {
  entryDate: Date | string;
  partyType: PartyType;
  partyId: string;
  entryType: EntryType;
  amount: Decimal | number | string;
  referenceType?: string | null;
  referenceId?: string | null;
  description?: string | null;
  channelType?: ChannelType;
  createdBy?: string;
}

interface PartyLedgerFilters {
  dateFrom?: string | Date;
  dateTo?: string | Date;
  channelType?: ChannelType;
  page?: number;
  pageSize?: number;
}

// 1. CREATE LEDGER ENTRY (IMMUTABLE, TRANSACTION-SAFE)
export async function createLedgerEntry(data: CreateLedgerEntryData, tx?: any) {
  const db = tx || (await getDb());
  const entryDate = new Date(data.entryDate);
  const amount = new Decimal(data.amount);
  
  // Resolve creator user if not supplied
  let createdBy = data.createdBy;
  if (!createdBy) {
    const session = await getCurrentUser();
    if (!session?.id) throw new Error("Unauthorized: Creator session is missing");
    createdBy = session.id;
  }

  // 1. Fetch latest chronological ledger entry prior to or equal to this date to find running balance
  const latest = await db.ledgerEntry.findFirst({
    where: { partyType: data.partyType, partyId: data.partyId },
    orderBy: [
      { entryDate: "desc" },
      { createdAt: "desc" }
    ],
  });

  let prevBal = new Decimal(0);
  if (latest) {
    prevBal = new Decimal(latest.runningBalance);
  } else {
    // Fall back to opening balance if first transaction
    if (data.partyType === "CUSTOMER") {
      const cust = await db.customer.findUnique({
        where: { id: data.partyId },
        select: { openingBalance: true },
      });
      prevBal = new Decimal(cust?.openingBalance || 0);
    } else {
      const supp = await db.supplier.findUnique({
        where: { id: data.partyId },
        select: { openingBalance: true },
      });
      prevBal = new Decimal(supp?.openingBalance || 0);
    }
  }

  // Calculate new running balance based on party rules:
  // - CUSTOMER: DEBIT increases balance (receivable), CREDIT decreases it.
  // - SUPPLIER: CREDIT increases balance (payable), DEBIT decreases it.
  let runningBalance = new Decimal(0);
  if (data.partyType === "CUSTOMER") {
    runningBalance = prevBal.plus(data.entryType === "DEBIT" ? amount : amount.negated());
  } else {
    runningBalance = prevBal.plus(data.entryType === "CREDIT" ? amount : amount.negated());
  }

  return db.ledgerEntry.create({
    data: {
      entryDate,
      partyType: data.partyType,
      partyId: data.partyId,
      entryType: data.entryType,
      amount,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      description: data.description,
      runningBalance,
      channelType: data.channelType || "GENERAL",
      createdBy,
    },
  });
}

// 2. REVERSE LEDGER ENTRY (IMMUTABLE MIRROR ADJUSTMENT)
export async function reverseLedgerEntry(originalId: string, reason: string, userId?: string) {
  const db = await getDb();
  
  let actorId = userId;
  if (!actorId) {
    const session = await getCurrentUser();
    if (!session?.id) throw new Error("Unauthorized");
    actorId = session.id;
  }

  return db.$transaction(async (tx) => {
    const original = await tx.ledgerEntry.findUnique({
      where: { id: originalId },
    });
    if (!original) throw new Error("Original ledger entry not found");

    // Invert the entryType
    const inverseType = original.entryType === "DEBIT" ? "CREDIT" : "DEBIT";
    const reversedDescription = `REVERSAL of Entry #${originalId} - Reason: ${reason}`;

    const reversedEntry = await createLedgerEntry({
      entryDate: new Date(),
      partyType: original.partyType,
      partyId: original.partyId,
      entryType: inverseType,
      amount: original.amount,
      referenceType: "REVERSAL",
      referenceId: originalId,
      description: reversedDescription,
      channelType: original.channelType,
      createdBy: actorId,
    }, tx);

    await tx.auditLog.create({
      data: {
        userId: actorId!,
        action: "REVERSE",
        module: "LEDGER",
        recordId: originalId,
        newValues: { reversalId: reversedEntry.id, reason },
      },
    });

    return reversedEntry;
  });
}

// 3. GET PARTY LEDGER (PAGINATED CHRONOLOGICAL STATEMENT WITH PERIOD OPENING BALANCE)
export async function getPartyLedger(partyType: PartyType, partyId: string, filters: PartyLedgerFilters) {
  const db = await getDb();
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : undefined;
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : undefined;
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;
  const skip = (page - 1) * pageSize;

  const whereClause: any = {
    partyType,
    partyId,
  };

  if (filters.channelType && filters.channelType !== "GENERAL") {
    whereClause.channelType = filters.channelType;
  }

  // A. Determine opening balance at start of period
  let openingBalance = new Decimal(0);
  if (dateFrom) {
    const lastBefore = await db.ledgerEntry.findFirst({
      where: {
        partyType,
        partyId,
        entryDate: { lt: dateFrom },
      },
      orderBy: [
        { entryDate: "desc" },
        { createdAt: "desc" }
      ],
    });

    if (lastBefore) {
      openingBalance = new Decimal(lastBefore.runningBalance);
    } else {
      // First transaction falls back to opening balance
      if (partyType === "CUSTOMER") {
        const cust = await db.customer.findUnique({ where: { id: partyId }, select: { openingBalance: true } });
        openingBalance = new Decimal(cust?.openingBalance || 0);
      } else {
        const supp = await db.supplier.findUnique({ where: { id: partyId }, select: { openingBalance: true } });
        openingBalance = new Decimal(supp?.openingBalance || 0);
      }
    }
    whereClause.entryDate = {
      gte: dateFrom,
      ...(dateTo ? { lte: dateTo } : {}),
    };
  } else if (dateTo) {
    whereClause.entryDate = { lte: dateTo };
    // Fetch original opening balance if dateFrom is not specified
    if (partyType === "CUSTOMER") {
      const cust = await db.customer.findUnique({ where: { id: partyId }, select: { openingBalance: true } });
      openingBalance = new Decimal(cust?.openingBalance || 0);
    } else {
      const supp = await db.supplier.findUnique({ where: { id: partyId }, select: { openingBalance: true } });
      openingBalance = new Decimal(supp?.openingBalance || 0);
    }
  } else {
    // If no filters, opening balance is the master data opening balance
    if (partyType === "CUSTOMER") {
      const cust = await db.customer.findUnique({ where: { id: partyId }, select: { openingBalance: true } });
      openingBalance = new Decimal(cust?.openingBalance || 0);
    } else {
      const supp = await db.supplier.findUnique({ where: { id: partyId }, select: { openingBalance: true } });
      openingBalance = new Decimal(supp?.openingBalance || 0);
    }
  }

  // B. Query matching ledger entries
  const entries = await db.ledgerEntry.findMany({
    where: whereClause,
    orderBy: [
      { entryDate: "asc" },
      { createdAt: "asc" }
    ],
    skip,
    take: pageSize,
    include: { creator: { select: { name: true } } },
  });

  const totalItems = await db.ledgerEntry.count({ where: whereClause });

  return {
    openingBalance: openingBalance.toString(),
    entries: entries.map(e => ({
      ...e,
      amount: e.amount.toString(),
      runningBalance: e.runningBalance.toString(),
    })),
    pagination: {
      page,
      pageSize,
      totalItems,
      pageCount: Math.ceil(totalItems / pageSize),
    },
  };
}

// 4. GET LEDGER SUMMARY (DASHBOARD OUTSTANDING AR / AP MATRIX)
export async function getLedgerSummary() {
  const db = await getDb();

  // Receivables (AR) = Sum of latest running balances for all customers
  const customers = await db.customer.findMany({ select: { id: true, name: true } });
  let totalReceivable = new Decimal(0);
  for (const c of customers) {
    const latest = await db.ledgerEntry.findFirst({
      where: { partyType: "CUSTOMER", partyId: c.id },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
      select: { runningBalance: true }
    });
    if (latest) {
      totalReceivable = totalReceivable.plus(latest.runningBalance);
    } else {
      const info = await db.customer.findUnique({ where: { id: c.id }, select: { openingBalance: true } });
      totalReceivable = totalReceivable.plus(info?.openingBalance || 0);
    }
  }

  // Payables (AP) = Sum of latest running balances for all suppliers
  const suppliers = await db.supplier.findMany({ select: { id: true, name: true } });
  let totalPayable = new Decimal(0);
  for (const s of suppliers) {
    const latest = await db.ledgerEntry.findFirst({
      where: { partyType: "SUPPLIER", partyId: s.id },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
      select: { runningBalance: true }
    });
    if (latest) {
      totalPayable = totalPayable.plus(latest.runningBalance);
    } else {
      const info = await db.supplier.findUnique({ where: { id: s.id }, select: { openingBalance: true } });
      totalPayable = totalPayable.plus(info?.openingBalance || 0);
    }
  }

  return {
    totalReceivable: totalReceivable.toString(),
    totalPayable: totalPayable.toString(),
    netPosition: totalReceivable.minus(totalPayable).toString(),
  };
}

// 5. GET CHANNEL LEDGER
export async function getChannelLedger(channel: ChannelType, dateFrom?: string | Date, dateTo?: string | Date) {
  const db = await getDb();
  const where: any = { channelType: channel };
  
  if (dateFrom || dateTo) {
    where.entryDate = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  const entries = await db.ledgerEntry.findMany({
    where,
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
  });

  return entries.map(e => ({
    ...e,
    amount: e.amount.toString(),
    runningBalance: e.runningBalance.toString(),
  }));
}

// 6. GET TRIAL BALANCE (DEBITS AND CREDITS AS OF A SPECIFIC DATE)
export async function getTrialBalance(asOf: Date | string) {
  const db = await getDb();
  const targetDate = new Date(asOf);

  // Group client entries
  const customers = await db.customer.findMany({ select: { id: true, name: true, code: true } });
  const suppliers = await db.supplier.findMany({ select: { id: true, name: true, code: true } });

  const trialRows = [];
  let totalDebit = new Decimal(0);
  let totalCredit = new Decimal(0);

  // Process Customers
  for (const c of customers) {
    const entries = await db.ledgerEntry.findMany({
      where: {
        partyType: "CUSTOMER",
        partyId: c.id,
        entryDate: { lte: targetDate },
      },
      select: { amount: true, entryType: true },
    });

    let debits = new Decimal(0);
    let credits = new Decimal(0);
    for (const e of entries) {
      if (e.entryType === "DEBIT") debits = debits.plus(e.amount);
      else credits = credits.plus(e.amount);
    }

    // Add initial customer opening balance
    const custInfo = await db.customer.findUnique({ where: { id: c.id }, select: { openingBalance: true } });
    const opVal = new Decimal(custInfo?.openingBalance || 0);
    debits = debits.plus(opVal);

    const balance = debits.minus(credits);
    if (balance.greaterThan(0)) {
      totalDebit = totalDebit.plus(balance);
      trialRows.push({
        code: c.code,
        name: c.name,
        type: "CUSTOMER",
        debit: balance.toString(),
        credit: "0",
      });
    } else if (balance.lessThan(0)) {
      totalCredit = totalCredit.plus(balance.abs());
      trialRows.push({
        code: c.code,
        name: c.name,
        type: "CUSTOMER",
        debit: "0",
        credit: balance.abs().toString(),
      });
    }
  }

  // Process Suppliers
  for (const s of suppliers) {
    const entries = await db.ledgerEntry.findMany({
      where: {
        partyType: "SUPPLIER",
        partyId: s.id,
        entryDate: { lte: targetDate },
      },
      select: { amount: true, entryType: true },
    });

    let debits = new Decimal(0);
    let credits = new Decimal(0);
    for (const e of entries) {
      if (e.entryType === "CREDIT") credits = credits.plus(e.amount);
      else debits = debits.plus(e.amount);
    }

    // Add initial supplier opening balance
    const suppInfo = await db.supplier.findUnique({ where: { id: s.id }, select: { openingBalance: true } });
    const opVal = new Decimal(suppInfo?.openingBalance || 0);
    credits = credits.plus(opVal);

    const balance = credits.minus(debits);
    if (balance.greaterThan(0)) {
      totalCredit = totalCredit.plus(balance);
      trialRows.push({
        code: s.code,
        name: s.name,
        type: "SUPPLIER",
        debit: "0",
        credit: balance.toString(),
      });
    } else if (balance.lessThan(0)) {
      totalDebit = totalDebit.plus(balance.abs());
      trialRows.push({
        code: s.code,
        name: s.name,
        type: "SUPPLIER",
        debit: balance.abs().toString(),
        credit: "0",
      });
    }
  }

  return {
    rows: trialRows,
    totals: {
      debit: totalDebit.toString(),
      credit: totalCredit.toString(),
    },
  };
}

// 7. GET ALL PARTIES LEDGER BALANCES (CUSTOMERS & SUPPLIERS DETAILED LIST)
export async function getPartiesBalances() {
  const db = await getDb();
  
  // Customers
  const customers = await db.customer.findMany({
    select: { id: true, name: true, code: true, address: true, phone: true, panNumber: true, openingBalance: true, customerType: true },
  });
  
  const customerResults = [];
  for (const c of customers) {
    const ledgerEntries = await db.ledgerEntry.findMany({
      where: { partyType: "CUSTOMER", partyId: c.id },
      select: { amount: true, entryType: true },
    });
    
    let dr = new Decimal(0);
    let cr = new Decimal(0);
    for (const e of ledgerEntries) {
      if (e.entryType === "DEBIT") dr = dr.plus(e.amount);
      else cr = cr.plus(e.amount);
    }
    
    const op = new Decimal(c.openingBalance || 0);
    dr = dr.plus(op); // Customer opening balance acts as initial debit dues
    
    const latest = await db.ledgerEntry.findFirst({
      where: { partyType: "CUSTOMER", partyId: c.id },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
      select: { runningBalance: true, entryDate: true },
    });
    
    customerResults.push({
      id: c.id,
      name: c.name,
      code: c.code,
      type: "CUSTOMER" as const,
      channel: c.customerType, // RETAIL, WHOLESALE, PROJECT
      address: c.address,
      phone: c.phone,
      panNumber: c.panNumber,
      totalDr: dr.toString(),
      totalCr: cr.toString(),
      balance: latest ? latest.runningBalance.toString() : op.toString(),
      lastTxDate: latest ? latest.entryDate.toISOString() : null,
    });
  }

  // Suppliers
  const suppliers = await db.supplier.findMany({
    select: { id: true, name: true, code: true, address: true, phone: true, panNumber: true, openingBalance: true },
  });
  
  const supplierResults = [];
  for (const s of suppliers) {
    const ledgerEntries = await db.ledgerEntry.findMany({
      where: { partyType: "SUPPLIER", partyId: s.id },
      select: { amount: true, entryType: true },
    });
    
    let dr = new Decimal(0);
    let cr = new Decimal(0);
    for (const e of ledgerEntries) {
      if (e.entryType === "CREDIT") cr = cr.plus(e.amount);
      else dr = dr.plus(e.amount);
    }
    
    const op = new Decimal(s.openingBalance || 0);
    cr = cr.plus(op); // Supplier opening balance acts as initial credit payables
    
    const latest = await db.ledgerEntry.findFirst({
      where: { partyType: "SUPPLIER", partyId: s.id },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
      select: { runningBalance: true, entryDate: true },
    });
    
    supplierResults.push({
      id: s.id,
      name: s.name,
      code: s.code,
      type: "SUPPLIER" as const,
      channel: "GENERAL" as const,
      address: s.address,
      phone: s.phone,
      panNumber: s.panNumber,
      totalDr: dr.toString(),
      totalCr: cr.toString(),
      balance: latest ? latest.runningBalance.toString() : op.toString(),
      lastTxDate: latest ? latest.entryDate.toISOString() : null,
    });
  }

  return [...customerResults, ...supplierResults];
}
