import { z } from "zod";

export const expenseCategorySchema = z.enum([
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
  "Depreciation",
  "Shop Rent",
  "Transport Cost",
  "Staff Salary",
  "Miscellaneous"
]);

export const createExpenseSchema = z.object({
  category: expenseCategorySchema,
  amount: z.union([z.string(), z.number()]),
  expenseDate: z.union([z.string(), z.date()]),
  paymentMethod: z.enum(["CASH", "BANK", "CHEQUE", "ESEWA", "KHALTI"]),
  notes: z.string().optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
