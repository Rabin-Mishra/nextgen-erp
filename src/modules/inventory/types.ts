import { z } from "zod";
import { StockTransactionType, Unit } from "../../generated/prisma/client";

export const inventoryItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productCode: z.string(),
  name: z.string(),
  category: z.string().nullable(),
  brand: z.string().nullable(),
  warehouse: z.string(),
  warehouseId: z.string(),
  unit: z.string(),
  quantity: z.number().int(),
  reservedQty: z.number().int().nonnegative(),
  minStockLevel: z.number().int().nonnegative(),
  reorderLevel: z.number().int().nonnegative(),
  status: z.enum(["ok", "reorder"]),
  lastUpdated: z.string(),
});

export type InventoryItemSchema = z.infer<typeof inventoryItemSchema>;

export const createInventoryItemSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().min(1),
  brandId: z.string().min(1),
  warehouseId: z.string().min(1),
  unit: z.nativeEnum(Unit),
  description: z.string().optional(),
  minStockLevel: z.number().int().nonnegative().default(0),
  reorderLevel: z.number().int().nonnegative().default(0),
  quantity: z.number().int().nonnegative(),
  variants: z
    .array(
      z.object({
        supplierId: z.string().min(1),
        // Accept number or string for price values and normalize server-side to Decimal
        purchasePrice: z.union([z.string(), z.number()]),
        retailPrice: z.union([z.string(), z.number()]),
        wholesalePrice: z.union([z.string(), z.number()]),
        projectPrice: z.union([z.string(), z.number()]),
        effectiveDate: z.string().optional(),
        isActive: z.boolean().optional().default(true),
      })
    )
    .optional(),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;

export const adjustInventoryQuantitySchema = z.object({
  stockId: z.string().min(1),
  adjustment: z.number().int(),
  notes: z.string().optional(),
});

export type AdjustInventoryQuantityInput = z.infer<typeof adjustInventoryQuantitySchema>;

export const inventorySummarySchema = z.object({
  totalProducts: z.number().int().nonnegative(),
  totalStock: z.number().int().nonnegative(),
  lowStockCount: z.number().int().nonnegative(),
});

export type InventorySummary = z.infer<typeof inventorySummarySchema>;

export const stockTransactionSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(StockTransactionType),
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number().int(),
  unitCost: z.number(),
  referenceType: z.string().nullable(),
  referenceId: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});

export type StockTransactionSchema = z.infer<typeof stockTransactionSchema>;

export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const createBrandSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
});
export type CreateBrandInput = z.infer<typeof createBrandSchema>;

export const updateBrandSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;

