"use server";

import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import { nextCode, serializeForClient } from "@/lib/utils";
import { getCurrentUser } from "@/auth/session";
import { createExpenseSchema, type CreateExpenseInput } from "./types";
import { checkServerPermission } from "@/auth/permissions.server";

async function resolveActiveUserId(db: any, userId?: string): Promise<string> {
  const resolved = userId || (await getCurrentUser())?.id;
  if (!resolved) {
    const fallbackUser = await db.user.findFirst({
      where: { isActive: true },
      select: { id: true }
    });
    if (fallbackUser) return fallbackUser.id;
    throw new Error("No active user found in the database. Please seed the database first.");
  }

  const userExists = await db.user.findUnique({
    where: { id: resolved },
    select: { id: true }
  });

  if (userExists) {
    return resolved;
  }

  const fallbackUser = await db.user.findFirst({
    where: { isActive: true },
    select: { id: true }
  });

  if (fallbackUser) {
    return fallbackUser.id;
  }

  throw new Error("No active user found in the database. Please seed the database first.");
}

export async function createExpense(data: CreateExpenseInput, userId: string) {
  await checkServerPermission("expenses", "create");
  const parsed = createExpenseSchema.parse(data);
  const db = await getDb();
  const activeUserId = await resolveActiveUserId(db, userId);

  const result = await db.$transaction(async (tx: any) => {
    const expenseCode = await nextCode(tx, "expense", "expenseCode", "EXP");
    const amount = new Decimal(parsed.amount);

    const expense = await tx.expense.create({
      data: {
        expenseCode,
        category: parsed.category,
        amount,
        expenseDate: new Date(parsed.expenseDate),
        paymentMethod: parsed.paymentMethod,
        notes: parsed.notes,
        createdBy: activeUserId,
      },
    });

    // Cash Book PAID entry (operating activity vault decrement)
    await tx.cashBookEntry.create({
      data: {
        entryDate: new Date(parsed.expenseDate),
        type: "PAID",
        amount,
        description: `Operating Expense: [${parsed.category}] ${parsed.notes ?? ""}`,
        referenceType: "EXPENSE",
        referenceId: expense.id,
        paymentMethod: parsed.paymentMethod,
        createdBy: activeUserId,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: activeUserId,
        action: "CREATE",
        module: "EXPENSE",
        recordId: expense.id,
        newValues: { expenseCode, category: parsed.category, amount: amount.toString() },
      },
    });

    return expense;
  });

  revalidatePath("/expenses");
  return serializeForClient(result);
}

export async function deleteExpense(id: string, userId: string) {
  await checkServerPermission("expenses", "delete");
  const db = await getDb();
  const activeUserId = await resolveActiveUserId(db, userId);

  const result = await db.$transaction(async (tx: any) => {
    const expense = await tx.expense.findUnique({ where: { id } });
    if (!expense) throw new Error("Expense not found");

    // Remove matching CashBookEntries
    await tx.cashBookEntry.deleteMany({
      where: { referenceType: "EXPENSE", referenceId: id },
    });

    await tx.expense.delete({ where: { id } });

    await tx.auditLog.create({
      data: {
        userId: activeUserId,
        action: "DELETE",
        module: "EXPENSE",
        recordId: id,
        oldValues: expense as any,
      },
    });

    return expense;
  });

  revalidatePath("/expenses");
  return serializeForClient(result);
}

export async function updateExpense(id: string, data: CreateExpenseInput, userId: string) {
  await checkServerPermission("expenses", "edit");
  const parsed = createExpenseSchema.parse(data);
  const db = await getDb();
  const activeUserId = await resolveActiveUserId(db, userId);

  const result = await db.$transaction(async (tx: any) => {
    const existing = await tx.expense.findUnique({ where: { id } });
    if (!existing) throw new Error("Expense not found");

    const amount = new Decimal(parsed.amount);

    // Update the expense record
    const updated = await tx.expense.update({
      where: { id },
      data: {
        category: parsed.category,
        amount,
        expenseDate: new Date(parsed.expenseDate),
        paymentMethod: parsed.paymentMethod,
        notes: parsed.notes,
      },
    });

    // Remove old cash book entry and create a new one
    await tx.cashBookEntry.deleteMany({
      where: { referenceType: "EXPENSE", referenceId: id },
    });

    await tx.cashBookEntry.create({
      data: {
        entryDate: new Date(parsed.expenseDate),
        type: "PAID",
        amount,
        description: `Operating Expense: [${parsed.category}] ${parsed.notes ?? ""}`,
        referenceType: "EXPENSE",
        referenceId: id,
        paymentMethod: parsed.paymentMethod,
        createdBy: activeUserId,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: activeUserId,
        action: "UPDATE",
        module: "EXPENSE",
        recordId: id,
        oldValues: existing as any,
        newValues: { category: parsed.category, amount: amount.toString() },
      },
    });

    return updated;
  });

  revalidatePath("/expenses");
  return serializeForClient(result);
}
