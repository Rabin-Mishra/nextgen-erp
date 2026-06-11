import { z } from "zod";
import { Unit } from "../../generated/prisma/enums";

const dateInput = z.union([z.string(), z.date()]);
const moneyInput = z.union([z.string(), z.number()]);

export const projectStatusSchema = z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  clientId: z.string().min(1, "Client is required"),
  description: z.string().optional().nullable(),
  startDate: dateInput.optional().nullable(),
  endDate: dateInput.optional().nullable(),
  budgetAmount: moneyInput.optional(),
  contractAmount: moneyInput,
  notes: z.string().optional().nullable(),
  advanceAmount: moneyInput.optional().nullable(),
  advancePaymentMethod: z.enum(["CASH", "BANK", "CHEQUE", "ESEWA", "KHALTI"]).optional().nullable(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial().extend({
  status: projectStatusSchema.optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const issueSupplyItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  qty: z.number().positive("Quantity must be positive"),
  unitPrice: moneyInput.optional(), // custom price override if desired
  notes: z.string().optional().nullable(),
  salesUnit: z.nativeEnum(Unit).optional().nullable(),
  conversionFactor: moneyInput.optional().nullable(),
});

export type IssueSupplyItemInput = z.infer<typeof issueSupplyItemSchema>;

export const additionalExpenseSchema = z.object({
  type: z.enum(["TRANSPORT", "LABOUR", "MISCELLANEOUS"]),
  amount: moneyInput,
  notes: z.string().optional().nullable(),
});

export type AdditionalExpenseInput = z.infer<typeof additionalExpenseSchema>;

export const issueSupplySchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  notes: z.string().optional().nullable(),
  items: z.array(issueSupplyItemSchema).min(1, "At least one item must be issued"),
  applyVat: z.boolean().default(true),
  additionalExpenses: z.array(additionalExpenseSchema).optional().default([]),
});

export type IssueSupplyInput = z.infer<typeof issueSupplySchema>;

// Mapped Database Schemas for query results
export const projectSchema = z.object({
  id: z.string(),
  projectCode: z.string(),
  name: z.string(),
  clientId: z.string(),
  clientName: z.string(),
  clientPhone: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  status: projectStatusSchema,
  budgetAmount: z.string(),
  contractAmount: z.string(),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type ProjectSchema = z.infer<typeof projectSchema>;

export const projectBillingSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  invoiceId: z.string(),
  invoiceNumber: z.string(),
  billingDate: z.string(),
  amount: z.string(),
  notes: z.string().nullable().optional(),
  status: z.string(),
});

export type ProjectBillingSchema = z.infer<typeof projectBillingSchema>;

export const materialUsageSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productCode: z.string(),
  productName: z.string(),
  productUnit: z.string(),
  qtyUsed: z.number(),
  unitCost: z.string(),
  totalCost: z.string(),
  warehouseName: z.string(),
  dateUsed: z.string(),
});

export type MaterialUsageSchema = z.infer<typeof materialUsageSchema>;

export const projectStatsSchema = z.object({
  activeCount: z.number().int(),
  totalRevenue: z.string(),
  totalCost: z.string(),
  totalProfit: z.string(),
  avgMarginPercent: z.string(),
});

export type ProjectStatsSchema = z.infer<typeof projectStatsSchema>;

export const projectProfitabilitySchema = z.object({
  projectId: z.string(),
  projectCode: z.string(),
  projectName: z.string(),
  clientId: z.string(),
  clientName: z.string(),
  status: projectStatusSchema,
  contractAmount: z.string(),
  totalBilled: z.string(),
  totalCost: z.string(),
  grossProfit: z.string(),
  marginPercent: z.string(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

export type ProjectProfitabilitySchema = z.infer<typeof projectProfitabilitySchema>;
