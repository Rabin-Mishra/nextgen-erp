import { z } from "zod";
import { Unit } from "../../generated/prisma/enums";

const dateInput = z.union([z.string(), z.date()]);
const moneyInput = z.union([z.string(), z.number()]);

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  orderDate: dateInput,
  expectedDate: dateInput.optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product is required"),
        orderedQty: z.number().positive("Quantity must be positive"),
        unitPrice: moneyInput,
        notes: z.string().optional(),
        orderedUnit: z.nativeEnum(Unit).optional().nullable(),
        conversionFactor: z.number().positive().optional().nullable(),
      })
    )
    .min(1, "At least one item is required"),
  discountAmount: moneyInput.optional(),
  taxAmount: moneyInput.optional(),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;

export const updatePurchaseOrderSchema = z.object({
  supplierId: z.string().min(1).optional(),
  orderDate: dateInput.optional(),
  expectedDate: dateInput.optional(),
  notes: z.string().nullable().optional(),
  discountAmount: moneyInput.optional(),
  taxAmount: moneyInput.optional(),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        orderedQty: z.number().positive(),
        unitPrice: moneyInput.optional(),
      })
    )
    .optional(),
});

export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;

export const addPOItemSchema = z.object({
  purchaseOrderId: z.string().min(1),
  productId: z.string().min(1),
  orderedQty: z.number().positive("Quantity must be positive"),
  unitPrice: moneyInput,
  notes: z.string().optional(),
});

export type AddPOItemInput = z.infer<typeof addPOItemSchema>;

export const receiveGoodsSchema = z.object({
  purchaseOrderId: z.string().min(1),
  items: z
    .array(
      z.object({
        poItemId: z.string().min(1),
        receivedQty: z.number().positive("Received quantity must be positive"),
        receivedPrice: moneyInput,
      })
    )
    .min(1, "At least one item must be received"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  notes: z.string().optional(),
  applyVat: z.boolean().optional(),
});

export type ReceiveGoodsInput = z.infer<typeof receiveGoodsSchema>;

export const recordPurchasePaymentSchema = z.object({
  purchaseOrderId: z.string().min(1),
  amount: moneyInput,
  paymentMethod: z.enum(["CASH", "BANK", "BANK_TRANSFER", "CHEQUE", "ESEWA", "KHALTI"]),
  paymentDate: dateInput,
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export type RecordPurchasePaymentInput = z.infer<typeof recordPurchasePaymentSchema>;



export const createSupplierSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, "Supplier name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  panNumber: z.string().optional(),
  openingBalance: moneyInput.optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = createSupplierSchema.partial();

export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export const purchaseOrderItemSchema = z.object({
  id: z.string(),
  purchaseOrderId: z.string(),
  productId: z.string(),
  productCode: z.string(),
  productName: z.string(),
  productUnit: z.string(),
  orderedQty: z.preprocess((val: any) => (val ? Number(val.toString()) : 0), z.number()),
  receivedQty: z.preprocess((val: any) => (val ? Number(val.toString()) : 0), z.number()),
  unitPrice: z.string(),
  totalPrice: z.string(),
  notes: z.string().nullable(),
  orderedUnit: z.string().optional().nullable(),
  conversionFactor: z.preprocess((val: any) => (val ? Number(val.toString()) : null), z.number().optional().nullable()),
  baseQtyEquivalent: z.preprocess((val: any) => (val ? Number(val.toString()) : null), z.number().optional().nullable()),
  productBaseUnit: z.string().optional().nullable(),
  productPurchaseUnit: z.string().optional().nullable(),
  productPurchaseConversionFactor: z.preprocess((val: any) => (val ? Number(val.toString()) : null), z.number().optional().nullable()),
});

export type PurchaseOrderItemSchema = z.infer<typeof purchaseOrderItemSchema>;

export const purchaseOrderSchema = z.object({
  id: z.string(),
  poNumber: z.string(),
  supplierId: z.string(),
  supplierName: z.string(),
  supplierPanNumber: z.string().nullable(),
  supplierPhone: z.string().nullable(),
  status: z.enum(["DRAFT", "ORDERED", "PARTIAL", "RECEIVED", "CANCELLED"]),
  orderDate: z.string(),
  expectedDate: z.string().nullable(),
  notes: z.string().nullable(),
  subtotal: z.string(),
  discountAmount: z.string(),
  taxAmount: z.string(),
  totalAmount: z.string(),
  paidAmount: z.string(),
  balance: z.string(),
  billImageUrl: z.string().nullable(),
  items: z.array(purchaseOrderItemSchema),
  payments: z
    .array(
      z.object({
        id: z.string(),
        amount: z.string(),
        paymentMethod: z.string(),
        paymentDate: z.string(),
        notes: z.string().nullable(),
      })
    )
    .default([]),
  createdAt: z.string(),
});

export type PurchaseOrderSchema = z.infer<typeof purchaseOrderSchema>;

export const purchaseStatsSchema = z.object({
  thisMonthTotal: z.string(),
  pendingPayments: z.string(),
  activeVendors: z.number().int(),
});

export type PurchaseStatsSchema = z.infer<typeof purchaseStatsSchema>;

export const supplierSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  contactPerson: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  panNumber: z.string().nullable(),
  openingBalance: z.string(),
  notes: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export type SupplierSchema = z.infer<typeof supplierSchema>;

export const vendorLedgerEntrySchema = z.object({
  id: z.string(),
  entryDate: z.string(),
  description: z.string().nullable(),
  debit: z.string(),
  credit: z.string(),
  balance: z.string(),
  entryType: z.enum(["DEBIT", "CREDIT"]),
});

export type VendorLedgerEntrySchema = z.infer<typeof vendorLedgerEntrySchema>;

export const pendingPaymentSchema = z.object({
  id: z.string(),
  poNumber: z.string(),
  supplierName: z.string(),
  total: z.string(),
  paidAmount: z.string(),
  balance: z.string(),
  daysOverdue: z.number().int(),
});

export type PendingPaymentSchema = z.infer<typeof pendingPaymentSchema>;
