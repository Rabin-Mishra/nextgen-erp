"use server";

import { StockTransactionType } from "../../generated/prisma/client";
import Decimal from "decimal.js";
import { getDb } from "@/lib/db";
import {
  inventoryItemSchema,
  createInventoryItemSchema,
  adjustInventoryQuantitySchema,
  type CreateInventoryItemInput,
  createCategorySchema,
  updateCategorySchema,
  createBrandSchema,
  updateBrandSchema,
} from "./types";
import { needsReorder } from "./utils";
import { fetchInventoryAlerts } from "./queries";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/auth/session";
import { serializeForClient } from "@/lib/utils";


async function resolveUserId(db: any, userId?: string): Promise<string> {
  const resolved = userId || (await getCurrentUser())?.id;
  if (!resolved) {
    const fallbackUser = await db.user.findFirst({
      where: { isActive: true },
      select: { id: true }
    });
    if (fallbackUser) return fallbackUser.id;
    throw new Error("Unauthorized");
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

  throw new Error("Unauthorized");
}

export async function createInventoryItem(data: CreateInventoryItemInput, userId: string) {
  const parsed = createInventoryItemSchema.parse(data);
  const db = await getDb();
  const activeUserId = await resolveUserId(db, userId);

  const code = `ITM-${Date.now().toString().slice(-6)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

  // Perform creation in a single transaction for atomicity
  const result = await db.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        code,
        name: parsed.name,
        categoryId: parsed.categoryId,
        brandId: parsed.brandId,
        unit: parsed.unit,
        description: parsed.description,
        minStockLevel: parsed.minStockLevel,
        reorderLevel: parsed.reorderLevel,
        images: [],
      },
    });

    // create variants if provided
    if (parsed.variants && parsed.variants.length) {
      for (const v of parsed.variants) {
        await tx.productVariant.create({
          data: {
            productId: product.id,
            supplierId: v.supplierId,
            purchasePrice: new Decimal(v.purchasePrice),
            retailPrice: new Decimal(v.retailPrice),
            wholesalePrice: new Decimal(v.wholesalePrice),
            projectPrice: new Decimal(v.projectPrice),
            effectiveDate: v.effectiveDate ? new Date(v.effectiveDate) : new Date(),
            isActive: v.isActive ?? true,
            createdAt: new Date(),
          },
        });
      }
    }

    const stock = await tx.inventoryStock.create({
      data: {
        productId: product.id,
        warehouseId: parsed.warehouseId,
        quantity: parsed.quantity,
        reservedQty: 0,
      },
    });

    const warehouse = await tx.warehouse.findUnique({ where: { id: parsed.warehouseId } });

    await tx.stockTransaction.create({
      data: {
        type: parsed.quantity > 0 ? StockTransactionType.ADJUSTMENT_IN : StockTransactionType.ADJUSTMENT_OUT,
        productId: product.id,
        warehouseId: parsed.warehouseId,
        quantity: parsed.quantity,
        unitCost: new Decimal(0),
        referenceType: 'INVENTORY_INIT',
        referenceId: stock.id,
        notes: parsed.quantity > 0 ? 'Initial stock allocation' : 'Created item with zero opening stock',
        userId: activeUserId,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: activeUserId,
        action: 'CREATE',
        module: 'INVENTORY',
        recordId: product.id,
        newValues: {
          product: {
            id: product.id,
            code: product.code,
            name: product.name,
            quantity: stock.quantity,
          },
        },
      },
    });

    return { product, stock, warehouse };
  });

  return inventoryItemSchema.parse({
    id: result.stock.id,
    productId: result.product.id,
    productCode: result.product.code,
    name: result.product.name,
    category: null,
    brand: null,
    warehouse: result.warehouse?.name ?? parsed.warehouseId,
    warehouseId: parsed.warehouseId,
    unit: result.product.unit,
    quantity: result.stock.quantity,
    reservedQty: result.stock.reservedQty,
    minStockLevel: result.product.minStockLevel,
    reorderLevel: result.product.reorderLevel,
    status: needsReorder(result.stock.quantity, result.product.reorderLevel) ? 'reorder' : 'ok',
    lastUpdated: result.stock.lastUpdated.toISOString(),
  });
}

export async function adjustInventoryQuantity(stockId: string, adjustment: number, userId: string) {
  const parsed = adjustInventoryQuantitySchema.parse({ stockId, adjustment });
  const db = await getDb();
  const activeUserId = await resolveUserId(db, userId);

  const existingStock = await db.inventoryStock.findUnique({
    where: { id: parsed.stockId },
    include: { product: true },
  });

  if (!existingStock) {
    throw new Error("Inventory stock record not found.");
  }

  const updatedQuantity = existingStock.quantity + parsed.adjustment;
  if (updatedQuantity < 0) {
    throw new Error("Stock adjustment cannot result in negative inventory.");
  }

  const result = await db.$transaction(async (tx) => {
    const updated = await tx.inventoryStock.update({
      where: { id: existingStock.id },
      data: { quantity: updatedQuantity },
    });

    const transaction = await tx.stockTransaction.create({
      data: {
        type: parsed.adjustment > 0 ? StockTransactionType.ADJUSTMENT_IN : StockTransactionType.ADJUSTMENT_OUT,
        productId: existingStock.productId,
        warehouseId: existingStock.warehouseId,
        quantity: parsed.adjustment,
        unitCost: new Decimal(0),
        referenceType: "INVENTORY_ADJUSTMENT",
        referenceId: existingStock.id,
        notes: parsed.notes,
        userId: activeUserId,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: activeUserId,
        action: "UPDATE",
        module: "INVENTORY",
        recordId: existingStock.id,
        oldValues: {
          quantity: existingStock.quantity,
          reservedQty: existingStock.reservedQty,
        },
        newValues: {
          quantity: updated.quantity,
          reservedQty: updated.reservedQty,
        },
      },
    });

    return updated;
  }, {
    timeout: 15000,
  });

  return {
    id: result.id,
    quantity: result.quantity,
    reservedQty: result.reservedQty,
    updatedAt: result.lastUpdated.toISOString(),
  };
}

export async function getInventoryAlerts() {
  return fetchInventoryAlerts();
}

// ============================================================================
// CATEGORY ACTIONS
// ============================================================================

export async function createCategory(data: any) {
  const parsed = createCategorySchema.parse(data);
  const db = await getDb();
  const userId = await resolveUserId(db);

  // Check unique name
  const existing = await db.category.findUnique({ where: { name: parsed.name } });
  if (existing) {
    throw new Error(`Category with name "${parsed.name}" already exists.`);
  }

  const category = await db.category.create({
    data: {
      name: parsed.name,
      description: parsed.description,
      isActive: true,
    },
  });

  await db.auditLog.create({
    data: {
      userId,
      action: "CREATE",
      module: "INVENTORY_CATEGORY",
      recordId: category.id,
      newValues: category as any,
    },
  });

  revalidatePath("/inventory");
  return serializeForClient(category);
}

export async function updateCategory(id: string, data: any) {
  const parsed = updateCategorySchema.parse(data);
  const db = await getDb();
  const userId = await resolveUserId(db);

  const existing = await db.category.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Category not found");
  }

  // Check unique name if name is changing
  if (parsed.name && parsed.name !== existing.name) {
    const duplicate = await db.category.findUnique({ where: { name: parsed.name } });
    if (duplicate) {
      throw new Error(`Category with name "${parsed.name}" already exists.`);
    }
  }

  const updated = await db.category.update({
    where: { id },
    data: {
      name: parsed.name ?? existing.name,
      description: parsed.description !== undefined ? parsed.description : existing.description,
      isActive: parsed.isActive ?? existing.isActive,
    },
  });

  await db.auditLog.create({
    data: {
      userId,
      action: "UPDATE",
      module: "INVENTORY_CATEGORY",
      recordId: id,
      oldValues: existing as any,
      newValues: updated as any,
    },
  });

  revalidatePath("/inventory");
  return serializeForClient(updated);
}

export async function deleteCategory(id: string) {
  const db = await getDb();
  const userId = await resolveUserId(db);

  const category = await db.category.findUnique({ where: { id } });
  if (!category) {
    throw new Error("Category not found");
  }

  const productsCount = await db.product.count({ where: { categoryId: id } });
  if (productsCount > 0) {
    throw new Error(`Cannot delete. ${productsCount} products are assigned to this category.`);
  }

  const deleted = await db.category.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      userId,
      action: "DELETE",
      module: "INVENTORY_CATEGORY",
      recordId: id,
      oldValues: category as any,
    },
  });

  revalidatePath("/inventory");
  return serializeForClient(deleted);
}

// ============================================================================
// BRAND ACTIONS
// ============================================================================

export async function createBrand(data: any) {
  const parsed = createBrandSchema.parse(data);
  const db = await getDb();
  const userId = await resolveUserId(db);

  // Check unique name
  const existing = await db.brand.findUnique({ where: { name: parsed.name } });
  if (existing) {
    throw new Error(`Brand with name "${parsed.name}" already exists.`);
  }

  const brand = await db.brand.create({
    data: {
      name: parsed.name,
      description: parsed.description,
      isActive: true,
    },
  });

  await db.auditLog.create({
    data: {
      userId,
      action: "CREATE",
      module: "INVENTORY_BRAND",
      recordId: brand.id,
      newValues: brand as any,
    },
  });

  revalidatePath("/inventory");
  return serializeForClient(brand);
}

export async function updateBrand(id: string, data: any) {
  const parsed = updateBrandSchema.parse(data);
  const db = await getDb();
  const userId = await resolveUserId(db);

  const existing = await db.brand.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Brand not found");
  }

  // Check unique name if name is changing
  if (parsed.name && parsed.name !== existing.name) {
    const duplicate = await db.brand.findUnique({ where: { name: parsed.name } });
    if (duplicate) {
      throw new Error(`Brand with name "${parsed.name}" already exists.`);
    }
  }

  const updated = await db.brand.update({
    where: { id },
    data: {
      name: parsed.name ?? existing.name,
      description: parsed.description !== undefined ? parsed.description : existing.description,
      isActive: parsed.isActive ?? existing.isActive,
    },
  });

  await db.auditLog.create({
    data: {
      userId,
      action: "UPDATE",
      module: "INVENTORY_BRAND",
      recordId: id,
      oldValues: existing as any,
      newValues: updated as any,
    },
  });

  revalidatePath("/inventory");
  return serializeForClient(updated);
}

export async function deleteBrand(id: string) {
  const db = await getDb();
  const userId = await resolveUserId(db);

  const brand = await db.brand.findUnique({ where: { id } });
  if (!brand) {
    throw new Error("Brand not found");
  }

  const productsCount = await db.product.count({ where: { brandId: id } });
  if (productsCount > 0) {
    throw new Error(`Cannot delete. ${productsCount} products are assigned to this brand.`);
  }

  const deleted = await db.brand.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      userId,
      action: "DELETE",
      module: "INVENTORY_BRAND",
      recordId: id,
      oldValues: brand as any,
    },
  });

  revalidatePath("/inventory");
  return serializeForClient(deleted);
}

