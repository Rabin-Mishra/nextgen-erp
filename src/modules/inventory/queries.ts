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

  const where: any = {
    product: {
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
      ...(brandId ? { brandId } : {}),
    }
  };

  if (search) {
    where.AND = [
      {
        OR: [
          { product: { name: { contains: search, mode: 'insensitive' } } },
          { product: { code: { contains: search, mode: 'insensitive' } } },
          { product: { brand: { name: { contains: search, mode: 'insensitive' } } } },
          { warehouse: { name: { contains: search, mode: 'insensitive' } } },
        ]
      }
    ];
  }

  if (lowStock) {
    const rawIds = await db.$queryRaw<{ id: string }[]>`
      SELECT s.id FROM inventory_stock s 
      JOIN products p ON s.product_id = p.id 
      WHERE s.quantity <= p.reorder_level AND p.is_active = true
    `;
    const ids = rawIds.map((r: any) => r.id);
    where.id = { in: ids };
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

  const totalStockAgg = await db.inventoryStock.aggregate({
    where: { product: { isActive: true } },
    _sum: { quantity: true }
  });
  const totalStock = Number(totalStockAgg._sum.quantity ?? 0);

  // lowStockCount: number of inventory_stock rows where quantity <= product.reorderLevel and product is active
  const raw = await db.$queryRaw`
    SELECT COUNT(1) as cnt 
    FROM inventory_stock s 
    JOIN products p ON s.product_id = p.id 
    WHERE s.quantity <= p.reorder_level AND p.is_active = true
  `;
  const lowStockCount = Array.isArray(raw) && raw[0] ? Number((raw[0] as any).cnt ?? 0) : 0;

  // Calculate total active products valuation in Rupees (purchase price of the latest active variant)
  const activeProducts = await db.product.findMany({
    where: { isActive: true },
    include: {
      stockEntries: true,
      variants: {
        where: { isActive: true },
        orderBy: { effectiveDate: 'desc' },
        take: 1
      }
    }
  });

  let totalValue = new Decimal(0);
  for (const product of activeProducts) {
    const totalQty = product.stockEntries.reduce((acc, s) => acc.plus(s.quantity), new Decimal(0));
    const price = product.variants[0]?.purchasePrice ? new Decimal(product.variants[0].purchasePrice) : new Decimal(0);
    totalValue = totalValue.plus(totalQty.times(price));
  }

  return serializeForClient(
    inventorySummarySchema.parse({ totalProducts, totalStock, lowStockCount, totalValue: totalValue.toNumber() })
  );
}

export async function fetchInventoryAlerts() {
  const db = await getDb();

  const all = await db.inventoryStock.findMany({ 
    where: {
      product: { isActive: true }
    },
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

