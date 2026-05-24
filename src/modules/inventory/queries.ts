import { getDb } from '@/lib/db';
import { inventoryItemSchema, inventorySummarySchema } from './types';

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
    ];
  }

  // Fetch stocks with related product and warehouse
  const [items, total] = await Promise.all([
    db.inventoryStock.findMany({
      where: where,
      include: { product: true, warehouse: true },
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
      category: s.product.categoryId ?? null,
      brand: s.product.brandId ?? null,
      warehouse: s.warehouse.name,
      warehouseId: s.warehouseId,
      unit: s.product.unit,
      quantity: s.quantity,
      reservedQty: s.reservedQty,
      minStockLevel: s.product.minStockLevel,
      reorderLevel: s.product.reorderLevel,
      status: s.quantity <= s.product.reorderLevel ? 'reorder' : 'ok',
      lastUpdated: s.lastUpdated.toISOString(),
    });
  });

  return {
    data: mapped,
    pagination: { page, pageSize, total },
  };
}

export async function fetchStockSummary() {
  const db = await getDb();

  const totalProducts = await db.product.count({ where: { isActive: true } });

  const totalStockAgg = await db.inventoryStock.aggregate({ _sum: { quantity: true } });
  const totalStock = Number(totalStockAgg._sum.quantity ?? 0);

  // lowStockCount: number of inventory_stock rows where quantity <= product.reorderLevel
  const raw = await db.$queryRaw`SELECT COUNT(1) as cnt FROM inventory_stock s JOIN products p ON s.product_id = p.id WHERE s.quantity <= p.reorder_level`;
  const lowStockCount = Array.isArray(raw) && raw[0] ? Number((raw[0] as any).cnt ?? 0) : 0;

  return inventorySummarySchema.parse({ totalProducts, totalStock, lowStockCount });
}

export async function fetchInventoryAlerts() {
  const db = await getDb();

  const all = await db.inventoryStock.findMany({ include: { product: true, warehouse: true } });
  const alerts = all.filter((s) => s.quantity <= s.product.reorderLevel).map((s) => {
    return inventoryItemSchema.parse({
      id: s.id,
      productId: s.productId,
      productCode: s.product.code,
      name: s.product.name,
      category: s.product.categoryId ?? null,
      brand: s.product.brandId ?? null,
      warehouse: s.warehouse.name,
      warehouseId: s.warehouseId,
      unit: s.product.unit,
      quantity: s.quantity,
      reservedQty: s.reservedQty,
      minStockLevel: s.product.minStockLevel,
      reorderLevel: s.product.reorderLevel,
      status: s.quantity <= s.product.reorderLevel ? 'reorder' : 'ok',
      lastUpdated: s.lastUpdated.toISOString(),
    });
  });

  return alerts;
}

export async function fetchCategories() {
  const db = await getDb();
  return db.category.findMany({
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function fetchBrands() {
  const db = await getDb();
  return db.brand.findMany({
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: "asc" },
  });
}

export default fetchInventoryItems;

