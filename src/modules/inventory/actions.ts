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

  const trimmedName = parsed.name.trim();

  // Find existing product by matching category, brand, and case-insensitive name
  const existingProduct = await db.product.findFirst({
    where: {
      categoryId: parsed.categoryId,
      brandId: parsed.brandId,
      name: { equals: trimmedName, mode: 'insensitive' },
      isActive: true,
    },
  });

  const code = `ITM-${Date.now().toString().slice(-6)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

  // Perform creation/update in a single transaction for atomicity
  const result = await db.$transaction(async (tx) => {
    let product = existingProduct;
    let isNewProduct = false;

    if (!product) {
      isNewProduct = true;
      product = await tx.product.create({
        data: {
          code,
          name: parsed.name.trim(),
          categoryId: parsed.categoryId,
          brandId: parsed.brandId,
          unit: parsed.unit,
          purchaseUnit: parsed.purchaseUnit,
          purchaseConversionFactor: parsed.purchaseConversionFactor ? new Decimal(parsed.purchaseConversionFactor) : null,
          altSalesUnit: parsed.altSalesUnit,
          altSalesConversionFactor: parsed.altSalesConversionFactor ? new Decimal(parsed.altSalesConversionFactor) : null,
          description: parsed.description,
          minStockLevel: parsed.minStockLevel,
          reorderLevel: parsed.reorderLevel,
          images: [],
        },
      });
    }

    // create/update variants if provided
    if (parsed.variants && parsed.variants.length) {
      for (const v of parsed.variants) {
        // Check if an active variant for this supplier already exists on the product
        const existingVariant = isNewProduct ? null : await tx.productVariant.findFirst({
          where: {
            productId: product.id,
            supplierId: v.supplierId,
            isActive: true,
          },
        });

        if (existingVariant) {
          // Update the prices for this supplier variant
          await tx.productVariant.update({
            where: { id: existingVariant.id },
            data: {
              purchasePrice: new Decimal(v.purchasePrice),
              retailPrice: new Decimal(v.retailPrice),
              wholesalePrice: new Decimal(v.wholesalePrice),
              projectPrice: new Decimal(v.projectPrice),
              effectiveDate: v.effectiveDate ? new Date(v.effectiveDate) : new Date(),
            },
          });
        } else {
          // Create a new supplier variant
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
    }

    // Upsert inventory stock
    let stock;
    if (isNewProduct) {
      stock = await tx.inventoryStock.create({
        data: {
          productId: product.id,
          warehouseId: parsed.warehouseId,
          quantity: parsed.quantity,
          reservedQty: 0,
        },
      });
    } else {
      const existingStock = await tx.inventoryStock.findUnique({
        where: {
          productId_warehouseId: {
            productId: product.id,
            warehouseId: parsed.warehouseId,
          },
        },
      });

      if (existingStock) {
        stock = await tx.inventoryStock.update({
          where: { id: existingStock.id },
          data: {
            quantity: new Decimal(existingStock.quantity).plus(parsed.quantity),
          },
        });
      } else {
        stock = await tx.inventoryStock.create({
          data: {
            productId: product.id,
            warehouseId: parsed.warehouseId,
            quantity: parsed.quantity,
            reservedQty: 0,
          },
        });
      }
    }

    const warehouse = await tx.warehouse.findUnique({ where: { id: parsed.warehouseId } });

    await tx.stockTransaction.create({
      data: {
        type: parsed.quantity > 0 ? StockTransactionType.ADJUSTMENT_IN : StockTransactionType.ADJUSTMENT_OUT,
        productId: product.id,
        warehouseId: parsed.warehouseId,
        quantity: parsed.quantity,
        unitCost: parsed.variants && parsed.variants[0] ? new Decimal(parsed.variants[0].purchasePrice) : new Decimal(0),
        referenceType: 'INVENTORY_INIT',
        referenceId: stock.id,
        notes: isNewProduct
          ? (parsed.quantity > 0 ? 'Initial stock allocation' : 'Created item with zero opening stock')
          : `Grouped duplicate purchase: stock added to master product`,
        userId: activeUserId,
        transactionUnit: parsed.unit,
        conversionFactor: new Decimal(1),
        originalQty: new Decimal(parsed.quantity),
      },
    });

    await tx.auditLog.create({
      data: {
        userId: activeUserId,
        action: isNewProduct ? 'CREATE' : 'UPDATE',
        module: 'INVENTORY',
        recordId: product.id,
        newValues: {
          product: {
            id: product.id,
            code: product.code,
            name: product.name,
            quantity: stock.quantity,
            isGroupedConsolidation: !isNewProduct,
            addedQty: parsed.quantity,
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
    quantity: Number(result.stock.quantity.toString()),
    reservedQty: Number(result.stock.reservedQty.toString()),
    minStockLevel: result.product.minStockLevel,
    reorderLevel: result.product.reorderLevel,
    status: needsReorder(Number(result.stock.quantity.toString()), Number(result.product.reorderLevel.toString())) ? 'reorder' : 'ok',
    lastUpdated: result.stock.lastUpdated.toISOString(),
  });
}

export async function adjustInventoryQuantity(
  stockId: string,
  adjustment: number,
  userId: string,
  newReorderLevel?: number,
  notes?: string
) {
  const parsed = adjustInventoryQuantitySchema.parse({ stockId, adjustment, newReorderLevel, notes });
  const db = await getDb();
  const activeUserId = await resolveUserId(db, userId);

  const existingStock = await db.inventoryStock.findUnique({
    where: { id: parsed.stockId },
    include: { product: true },
  });

  if (!existingStock) {
    throw new Error("Inventory stock record not found.");
  }

  const updatedQuantity = new Decimal(existingStock.quantity).plus(parsed.adjustment);
  if (updatedQuantity.lessThan(0)) {
    throw new Error("Stock adjustment cannot result in negative inventory.");
  }

  const result = await db.$transaction(async (tx) => {
    let updated = existingStock;

    if (parsed.adjustment !== 0) {
      updated = await tx.inventoryStock.update({
        where: { id: existingStock.id },
        data: { quantity: updatedQuantity },
        include: { product: true },
      });

      await tx.stockTransaction.create({
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
          transactionUnit: existingStock.product.unit,
          conversionFactor: new Decimal(1),
          originalQty: new Decimal(parsed.adjustment),
        },
      });
    }

    if (parsed.newReorderLevel !== undefined) {
      await tx.product.update({
        where: { id: existingStock.productId },
        data: { reorderLevel: new Decimal(parsed.newReorderLevel) as any },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: activeUserId,
        action: "UPDATE",
        module: "INVENTORY",
        recordId: existingStock.id,
        oldValues: {
          quantity: existingStock.quantity,
          reservedQty: existingStock.reservedQty,
          reorderLevel: existingStock.product.reorderLevel,
        },
        newValues: {
          quantity: parsed.adjustment !== 0 ? updated.quantity : existingStock.quantity,
          reservedQty: existingStock.reservedQty,
          reorderLevel: parsed.newReorderLevel !== undefined ? parsed.newReorderLevel : existingStock.product.reorderLevel,
        },
      },
    });

    return updated;
  }, {
    timeout: 15000,
  });

  revalidatePath("/inventory");

  return {
    id: result.id,
    quantity: Number(result.quantity.toString()),
    reservedQty: Number(result.reservedQty.toString()),
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

export async function fetchProductDetails(productId: string) {
  const db = await getDb();
  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      brand: true,
      variants: {
        where: { isActive: true },
        orderBy: { effectiveDate: "desc" },
        take: 1,
      },
    },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  return serializeForClient(product);
}

export async function updateInventoryProduct(productId: string, data: {
  name: string;
  categoryId: string;
  brandId: string;
  unit: any;
  purchaseUnit?: any;
  purchaseConversionFactor?: number | string;
  altSalesUnit?: any;
  altSalesConversionFactor?: number | string;
  description?: string;
  minStockLevel: number;
  reorderLevel: number;
  supplierId?: string;
  purchasePrice?: number | string;
  retailPrice?: number | string;
  wholesalePrice?: number | string;
  projectPrice?: number | string;
}) {
  const db = await getDb();
  const userId = await resolveUserId(db);

  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      variants: {
        where: { isActive: true },
      },
    },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  const result = await db.$transaction(async (tx) => {
    // 1. Update Product Details
    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: {
        name: data.name.trim(),
        categoryId: data.categoryId,
        brandId: data.brandId,
        unit: data.unit,
        purchaseUnit: data.purchaseUnit || null,
        purchaseConversionFactor: data.purchaseConversionFactor ? new Decimal(data.purchaseConversionFactor) : null,
        altSalesUnit: data.altSalesUnit || null,
        altSalesConversionFactor: data.altSalesConversionFactor ? new Decimal(data.altSalesConversionFactor) : null,
        description: data.description?.trim() || null,
        minStockLevel: Number(data.minStockLevel),
        reorderLevel: Number(data.reorderLevel),
      },
    });

    // 2. Handle Variant / Pricing updates
    if (data.supplierId) {
      const activeVariant = product.variants[0];
      const purchasePrice = new Decimal(data.purchasePrice ?? 0);
      const retailPrice = new Decimal(data.retailPrice ?? 0);
      const wholesalePrice = new Decimal(data.wholesalePrice ?? 0);
      const projectPrice = new Decimal(data.projectPrice ?? 0);

      if (activeVariant) {
        // Update existing variant details
        await tx.productVariant.update({
          where: { id: activeVariant.id },
          data: {
            supplierId: data.supplierId,
            purchasePrice,
            retailPrice,
            wholesalePrice,
            projectPrice,
          },
        });
      } else {
        // Create a new variant if none existed previously (e.g. they skipped Step 2!)
        await tx.productVariant.create({
          data: {
            productId,
            supplierId: data.supplierId,
            purchasePrice,
            retailPrice,
            wholesalePrice,
            projectPrice,
            effectiveDate: new Date(),
            isActive: true,
          },
        });
      }
    }

    // 3. Log Audit Trail
    await tx.auditLog.create({
      data: {
        userId,
        action: "UPDATE",
        module: "INVENTORY",
        recordId: productId,
        newValues: {
          id: productId,
          name: data.name,
          minStockLevel: data.minStockLevel,
          reorderLevel: data.reorderLevel,
          hasVariant: !!data.supplierId,
        },
      },
    });

    return updatedProduct;
  });

  revalidatePath("/inventory");
  return serializeForClient(result);
}

export async function deleteInventoryProduct(productId: string, userId: string) {
  const db = await getDb();
  const activeUserId = await resolveUserId(db, userId);

  // Find if product exists and check relations to prevent breaking active historical ledgers
  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      purchaseItems: { take: 1 },
      salesItems: { take: 1 },
      purchaseReturnItems: { take: 1 },
      salesReturnItems: { take: 1 },
      stockTransactions: {
        where: {
          referenceType: { not: "INVENTORY_INIT" }
        },
        take: 1
      }
    }
  });

  if (!product) {
    throw new Error("Product not found");
  }

  const hasRelations =
    product.purchaseItems.length > 0 ||
    product.salesItems.length > 0 ||
    product.purchaseReturnItems.length > 0 ||
    product.salesReturnItems.length > 0 ||
    product.stockTransactions.length > 0;

  if (hasRelations) {
    throw new Error("Cannot delete. This product has active operational transactions (purchases, sales, or movements) linked to it. To preserve database audit trails, please deactivate the product instead.");
  }

  // Safe delete: delete associated variants, inventory stocks, initial transactions, and the product itself
  await db.$transaction([
    db.productVariant.deleteMany({ where: { productId } }),
    db.stockTransaction.deleteMany({ where: { productId } }),
    db.inventoryStock.deleteMany({ where: { productId } }),
    db.product.delete({ where: { id: productId } }),
  ]);

  // Log audit trail
  await db.auditLog.create({
    data: {
      userId: activeUserId,
      action: "DELETE",
      module: "INVENTORY",
      recordId: productId,
      oldValues: {
        id: product.id,
        code: product.code,
        name: product.name,
      },
    },
  });

  revalidatePath("/inventory");
  return { success: true };
}


