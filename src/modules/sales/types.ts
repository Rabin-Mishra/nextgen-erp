import { z } from "zod";
import { Unit } from "../../generated/prisma/enums";

const dateInput = z.union([z.string(), z.date()]);
const moneyInput = z.union([z.string(), z.number()]);

export const invoiceTypeSchema = z.enum(["RETAIL", "WHOLESALE", "PROJECT"]);
export const invoiceStatusSchema = z.enum(["DRAFT", "SENT", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"]);
export const customerTypeSchema = z.enum(["RETAIL", "WHOLESALE", "PROJECT"]);
export const paymentInputMethodSchema = z.enum(["CASH", "BANK", "BANK_TRANSFER", "CHEQUE", "ESEWA", "KHALTI", "CREDIT"]);

export const createInvoiceItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  qty: z.number().positive("Quantity must be positive"),
  unitPrice: moneyInput.optional(),
  discountPercent: moneyInput.optional(),
  notes: z.string().optional(),
  salesUnit: z.nativeEnum(Unit).optional().nullable(),
  conversionFactor: z.number().positive().optional().nullable(),
});

export type CreateInvoiceItemInput = z.infer<typeof createInvoiceItemSchema>;

export const createInvoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  invoiceType: invoiceTypeSchema,
  projectId: z.string().optional(),
  invoiceDate: dateInput,
  dueDate: dateInput.optional(),
  paymentMethod: paymentInputMethodSchema.optional(),
  discountPercent: moneyInput.optional(),
  vatPercent: moneyInput.optional(),
  notes: z.string().optional(),
  items: z.array(createInvoiceItemSchema).min(1, "At least one item is required"),
  initialPaymentAmount: moneyInput.optional(),
  initialPaymentMethod: paymentInputMethodSchema.optional(),
  initialPaymentDate: dateInput.optional(),
  initialPaymentNotes: z.string().optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const quickSaleSchema = z.object({
  customerId: z.string().min(1),
  invoiceType: invoiceTypeSchema.default("RETAIL"),
  warehouseId: z.string().min(1),
  paymentMethod: paymentInputMethodSchema.default("CASH"),
    items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().positive(),
      })
    )
    .min(1),
});

export type QuickSaleInput = z.infer<typeof quickSaleSchema>;

export const recordSalePaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: moneyInput,
  paymentMethod: paymentInputMethodSchema.exclude(["CREDIT"]),
  paymentDate: dateInput,
  notes: z.string().optional(),
});

export type RecordSalePaymentInput = z.infer<typeof recordSalePaymentSchema>;

export const createReturnSchema = z.object({
  invoiceId: z.string().min(1),
  reason: z.string().min(1, "Return reason is required"),
  refundMethod: z.enum(["CASH", "BANK", "CHEQUE", "ESEWA", "KHALTI"]).default("CASH"),
  items: z
    .array(
      z.object({
        invoiceItemId: z.string().min(1),
        qty: z.preprocess((val: any) => (val ? Number(val.toString()) : 0), z.number().positive("Return quantity must be positive")),
      })
    )
    .min(1, "At least one item must be returned"),
});

export type CreateReturnInput = z.infer<typeof createReturnSchema>;

export const createCustomerSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, "Customer name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  panNumber: z.string().optional(),
  customerType: customerTypeSchema.default("RETAIL"),
  creditLimit: moneyInput.optional(),
  openingBalance: moneyInput.optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial();

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const salesInvoiceItemSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  productId: z.string(),
  productCode: z.string(),
  productName: z.string(),
  productUnit: z.string(),
  warehouseId: z.string(),
  warehouseName: z.string(),
  qty: z.preprocess((val: any) => (val ? Number(val.toString()) : 0), z.number()),
  unitPrice: z.string(),
  discountPercent: z.string(),
  totalPrice: z.string(),
  notes: z.string().nullable(),
  salesUnit: z.string().optional().nullable(),
  conversionFactor: z.preprocess((val: any) => (val ? Number(val.toString()) : null), z.number().optional().nullable()),
  baseQtyEquivalent: z.preprocess((val: any) => (val ? Number(val.toString()) : null), z.number().optional().nullable()),
  productBaseUnit: z.string().optional().nullable(),
  productAltSalesUnit: z.string().optional().nullable(),
  productAltSalesConversionFactor: z.preprocess((val: any) => (val ? Number(val.toString()) : null), z.number().optional().nullable()),
});

export type SalesInvoiceItemSchema = z.infer<typeof salesInvoiceItemSchema>;

export const invoicePaymentSchema = z.object({
  id: z.string(),
  amount: z.string(),
  paymentMethod: z.string(),
  paymentDate: z.string(),
  notes: z.string().nullable(),
});

export type InvoicePaymentSchema = z.infer<typeof invoicePaymentSchema>;

export const salesInvoiceSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  customerPhone: z.string().nullable(),
  customerPanNumber: z.string().nullable(),
  customerAddress: z.string().nullable(),
  invoiceType: invoiceTypeSchema,
  projectId: z.string().nullable(),
  projectName: z.string().nullable(),
  invoiceDate: z.string(),
  dueDate: z.string().nullable(),
  status: invoiceStatusSchema,
  subtotal: z.string(),
  discountPercent: z.string(),
  discountAmount: z.string(),
  vatPercent: z.string(),
  vatAmount: z.string(),
  totalAmount: z.string(),
  paidAmount: z.string(),
  balanceAmount: z.string(),
  paymentMethod: z.string().nullable(),
  notes: z.string().nullable(),
  items: z.array(salesInvoiceItemSchema),
  payments: z.array(invoicePaymentSchema).default([]),
  returns: z
    .array(
      z.object({
        id: z.string(),
        returnNumber: z.string(),
        returnDate: z.string(),
        totalAmount: z.string(),
        notes: z.string().nullable(),
        items: z.array(
          z.object({
            id: z.string(),
            productId: z.string(),
            productCode: z.string(),
            productName: z.string(),
            productUnit: z.string(),
            qty: z.preprocess((val: any) => (val ? Number(val.toString()) : 0), z.number()),
            unitPrice: z.string(),
            totalPrice: z.string(),
            salesUnit: z.string().optional().nullable(),
            conversionFactor: z.preprocess((val: any) => (val ? Number(val.toString()) : null), z.number().optional().nullable()),
          })
        ),
      })
    )
    .default([]),
  createdAt: z.string(),
});

export type SalesInvoiceSchema = z.infer<typeof salesInvoiceSchema>;

export const salesStatsSchema = z.object({
  todaySales: z.string(),
  monthlyRevenue: z.string(),
  monthlyGrowthPercent: z.string(),
  outstanding: z.string(),
  returns: z.string(),
});

export type SalesStatsSchema = z.infer<typeof salesStatsSchema>;

export const customerSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  contactPerson: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  panNumber: z.string().nullable(),
  customerType: customerTypeSchema,
  creditLimit: z.string(),
  openingBalance: z.string(),
  notes: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export type CustomerSchema = z.infer<typeof customerSchema>;

export const customerLedgerEntrySchema = z.object({
  id: z.string(),
  entryDate: z.string(),
  description: z.string().nullable(),
  channelType: z.enum(["RETAIL", "WHOLESALE", "PROJECT", "GENERAL"]),
  debit: z.string(),
  credit: z.string(),
  balance: z.string(),
  entryType: z.enum(["DEBIT", "CREDIT"]),
});

export type CustomerLedgerEntrySchema = z.infer<typeof customerLedgerEntrySchema>;

export const outstandingDueSchema = z.object({
  customerId: z.string(),
  customerName: z.string(),
  customerType: customerTypeSchema,
  totalBilled: z.string(),
  totalPaid: z.string(),
  balance: z.string(),
  lastInvoiceDate: z.string().nullable(),
  daysOverdue: z.number().int(),
});

export type OutstandingDueSchema = z.infer<typeof outstandingDueSchema>;

export const revenueByChannelSchema = z.object({
  retail: z.string(),
  wholesale: z.string(),
  project: z.string(),
});

export type RevenueByChannelSchema = z.infer<typeof revenueByChannelSchema>;

export const salesReturnSchema = z.object({
  id: z.string(),
  invoiceId: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  productName: z.string(),
  warehouseName: z.string(),
  quantity: z.preprocess((val: any) => (val ? Number(val.toString()) : 0), z.number()),
  value: z.string(),
  reason: z.string().nullable(),
  createdAt: z.string(),
});

export type SalesReturnSchema = z.infer<typeof salesReturnSchema>;

export const customerOptionSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  customerType: customerTypeSchema,
  balance: z.string(),
});

export type CustomerOptionSchema = z.infer<typeof customerOptionSchema>;

export const projectOptionSchema = z.object({
  id: z.string(),
  projectCode: z.string(),
  name: z.string(),
  clientId: z.string(),
});

export type ProjectOptionSchema = z.infer<typeof projectOptionSchema>;

export const warehouseOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type WarehouseOptionSchema = z.infer<typeof warehouseOptionSchema>;

export const productOptionSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  unit: z.string(),
  purchaseUnit: z.string().optional().nullable(),
  purchaseConversionFactor: z.preprocess((val: any) => (val ? Number(val.toString()) : null), z.number().optional().nullable()),
  altSalesUnit: z.string().optional().nullable(),
  altSalesConversionFactor: z.preprocess((val: any) => (val ? Number(val.toString()) : null), z.number().optional().nullable()),
  retailPrice: z.string(),
  wholesalePrice: z.string(),
  projectPrice: z.string(),
  stockByWarehouse: z.array(
    z.object({
      warehouseId: z.string(),
      warehouseName: z.string(),
      availableQty: z.preprocess((val: any) => (val ? Number(val.toString()) : 0), z.number()),
    })
  ),
});

export type ProductOptionSchema = z.infer<typeof productOptionSchema>;
