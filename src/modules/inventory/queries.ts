import { getDb } from '@/lib/db';
import { inventoryItemSchema, inventorySummarySchema } from './types';
import { serializeForClient } from '@/lib/utils';
import Decimal from 'decimal.js';

type FetchInventoryOptions = {
  page?: number;
  pageSize?: number;
  search?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  lowStock?: boolean | null;
};

export async function fetchInventoryItems(opts: FetchInventoryOptions = {}) {
  const { page = 1, pageSize = 25, search = null, categoryId = null, brandId = null, lowStock = null } = opts;
  const db = await getDb();

  const where: any = {};

  if (categoryId) where.product = { ...(where.product || {}), categoryId };
  if (brandId) where.product = { ...(where.product || {}), brandId };

  if (search) {
    where.OR = [
      { product: { name: { contains: search, mode: 'insensitive' } } },
      { product: { code: { contains: search, mode: 'insensitive' } } },
      { product: { brand: { name: { contains: search, mode: 'insensitive' } } } },
      { warehouse: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  // Fetch stocks with related product, including category and brand, and warehouse
  const [items, total] = await Promise.all([
    db.inventoryStock.findMany({
      where: where,
      include: {
        product: {
          include: {
            category: true,
            brand: true,
          },
        },
        warehouse: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { lastUpdated: 'desc' },
    }),
    db.inventoryStock.count({ where: where }),
  ]);

  const mapped = items.map((s) => {
    // Map product variants (Decimal) to numbers/strings for JSON
    const variants = (s.product as any).productVariants || (s.product as any).variants || [];
    const mappedVariants = variants.map((v: any) => ({
      id: v.id,
      supplierId: v.supplierId,
      purchasePrice: v.purchasePrice ? v.purchasePrice.toString() : null,
      retailPrice: v.retailPrice ? v.retailPrice.toString() : null,
      wholesalePrice: v.wholesalePrice ? v.wholesalePrice.toString() : null,
      projectPrice: v.projectPrice ? v.projectPrice.toString() : null,
      effectiveDate: v.effectiveDate?.toISOString?.() ?? null,
      isActive: v.isActive ?? true,
    }));

    return inventoryItemSchema.parse({
      id: s.id,
      productId: s.productId,
      productCode: s.product.code,
      name: s.product.name,
      category: s.product.category?.name ?? null,
      brand: s.product.brand?.name ?? null,
      warehouse: s.warehouse.name,
      warehouseId: s.warehouseId,
      unit: s.product.unit,
      quantity: s.quantity,
      reservedQty: s.reservedQty,
      minStockLevel: s.product.minStockLevel,
      reorderLevel: s.product.reorderLevel,
      status: new Decimal(s.quantity).lessThanOrEqualTo(s.product.reorderLevel) ? 'reorder' : 'ok',
      lastUpdated: s.lastUpdated.toISOString(),
      purchaseUnit: s.product.purchaseUnit,
      purchaseConversionFactor: s.product.purchaseConversionFactor,
      altSalesUnit: s.product.altSalesUnit,
      altSalesConversionFactor: s.product.altSalesConversionFactor,
    });
  });

  return serializeForClient({
    data: mapped,
    pagination: { page, pageSize, total },
  });
}

export async function fetchStockSummary() {
  const db = await getDb();

  const totalProducts = await db.product.count({ where: { isActive: true } });

  const totalStockAgg = await db.inventoryStock.aggregate({ _sum: { quantity: true } });
  const totalStock = Number(totalStockAgg._sum.quantity ?? 0);

  // lowStockCount: number of inventory_stock rows where quantity <= product.reorderLevel
  const raw = await db.$queryRaw`SELECT COUNT(1) as cnt FROM inventory_stock s JOIN products p ON s.product_id = p.id WHERE s.quantity <= p.reorder_level`;
  const lowStockCount = Array.isArray(raw) && raw[0] ? Number((raw[0] as any).cnt ?? 0) : 0;

  return serializeForClient(
    inventorySummarySchema.parse({ totalProducts, totalStock, lowStockCount })
  );
}

export async function fetchInventoryAlerts() {
  const db = await getDb();

  const all = await db.inventoryStock.findMany({ 
    include: { 
      product: {
        include: {
          category: true,
          brand: true,
        },
      }, 
      warehouse: true 
    } 
  });
  const alerts = all.filter((s) => new Decimal(s.quantity).lessThanOrEqualTo(s.product.reorderLevel)).map((s) => {
    return inventoryItemSchema.parse({
      id: s.id,
      productId: s.productId,
      productCode: s.product.code,
      name: s.product.name,
      category: s.product.category?.name ?? null,
      brand: s.product.brand?.name ?? null,
      warehouse: s.warehouse.name,
      warehouseId: s.warehouseId,
      unit: s.product.unit,
      quantity: s.quantity,
      reservedQty: s.reservedQty,
      minStockLevel: s.product.minStockLevel,
      reorderLevel: s.product.reorderLevel,
      status: new Decimal(s.quantity).lessThanOrEqualTo(s.product.reorderLevel) ? 'reorder' : 'ok',
      lastUpdated: s.lastUpdated.toISOString(),
      purchaseUnit: s.product.purchaseUnit,
      purchaseConversionFactor: s.product.purchaseConversionFactor,
      altSalesUnit: s.product.altSalesUnit,
      altSalesConversionFactor: s.product.altSalesConversionFactor,
    });
  });

  return serializeForClient(alerts);
}

export async function fetchCategories(opts: { page?: number; pageSize?: number; search?: string } = {}) {
  const { page = 1, pageSize = 10, search = "" } = opts;
  const db = await getDb();

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [categories, total] = await Promise.all([
    db.category.findMany({
      where,
      include: {
        _count: {
          select: { products: true },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { name: "asc" },
    }),
    db.category.count({ where }),
  ]);

  return serializeForClient({
    data: categories,
    pagination: { page, pageSize, total },
  });
}

export async function fetchBrands(opts: { page?: number; pageSize?: number; search?: string } = {}) {
  const { page = 1, pageSize = 10, search = "" } = opts;
  const db = await getDb();

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [brands, total] = await Promise.all([
    db.brand.findMany({
      where,
      include: {
        _count: {
          select: { products: true },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { name: "asc" },
    }),
    db.brand.count({ where }),
  ]);

  return serializeForClient({
    data: brands,
    pagination: { page, pageSize, total },
  });
}

export default fetchInventoryItems;

