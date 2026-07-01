import { getDb } from "@/lib/db";
import { serializeForClient } from "@/lib/utils";
import Decimal from "decimal.js";

type GetExpensesOptions = {
  page?: number;
  pageSize?: number;
  search?: string | null;
  month?: string | null;
};

export async function getExpenses(opts: GetExpensesOptions = {}) {
  const { page = 1, pageSize = 25, search = null, month = null } = opts;
  const db = await getDb();

  const where: any = {};
  if (search) {
    where.OR = [
      { expenseCode: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  if (month && month !== "all") {
    const [year, m] = month.split("-");
    const startDate = new Date(Number(year), Number(m) - 1, 1);
    const endDate = new Date(Number(year), Number(m), 0, 23, 59, 59, 999);
    where.expenseDate = {
      gte: startDate,
      lte: endDate,
    };
  }

  // Get distinct months for the dropdown (high performance query)
  const allExpenseDates = await db.expense.findMany({
    select: { expenseDate: true },
    orderBy: { expenseDate: "desc" },
  });

  const getMonthKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  };
  const availableMonths = Array.from(
    new Set(allExpenseDates.map((e) => getMonthKey(e.expenseDate)))
  );

  const [expenses, total] = await Promise.all([
    db.expense.findMany({
      where,
      include: { creator: { select: { name: true } } },
      orderBy: { expenseDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.expense.count({ where }),
  ]);

  const mappedExpenses = expenses.map((e: any) => {
    let category = e.category;
    if (category === "Staff Salary") category = "Salary";
    else if (category === "Shop Rent") category = "Office Rent";
    else if (category === "Transport Cost") category = "Transport Inward";
    else if (category === "Miscellaneous") category = "Miscellaneous Expenses";
    return { ...e, category };
  });

  return serializeForClient({
    data: mappedExpenses,
    availableMonths,
    pagination: { page, pageSize, total },
  });
}

export async function getExpenseStats() {
  const db = await getDb();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const expenses = await db.expense.findMany({
    where: { expenseDate: { gte: monthStart } },
  });

  const totalThisMonth = expenses.reduce((sum, e) => sum.plus(e.amount), new Decimal(0));

  const mappedExpenses = expenses.map((e: any) => {
    let category = e.category;
    if (category === "Staff Salary") category = "Salary";
    else if (category === "Shop Rent") category = "Office Rent";
    else if (category === "Transport Cost") category = "Transport Inward";
    else if (category === "Miscellaneous") category = "Miscellaneous Expenses";
    return { ...e, category };
  });

  const categories = [
    "Water and Electricity",
    "Salary",
    "Office Rent",
    "Registration and Renewal",
    "Audit Fee",
    "Repair and Maintainance",
    "Printing and Stationery",
    "Travelling Expenses",
    "Bank Charges",
    "Interest Paid",
    "Miscellaneous Expenses",
    "Transport Inward",
    "Depreciation"
  ];
  const breakdown = categories.map((cat) => {
    const val = mappedExpenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum.plus(e.amount), new Decimal(0));
    return {
      category: cat,
      amount: val.toString(),
    };
  });

  return serializeForClient({
    totalThisMonth: totalThisMonth.toString(),
    breakdown,
  });
}
