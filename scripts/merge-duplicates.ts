import "dotenv/config";

// Clear local URL variables so the database client falls back to the remote DATABASE_URL
delete process.env.POSTGRES_PRISMA_URL;
delete process.env.POSTGRES_URL_NON_POOLING;

import { getDb } from "../src/lib/db";
import Decimal from "decimal.js";

async function main() {
  console.log("Starting consolidation of duplicate products...");
  const db = await getDb();

  try {
    // 1. Fetch all active products
    const products = await db.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        brand: true,
      },
    });

    console.log(`Fetched ${products.length} active products.`);

    // 2. Group products by normalized name, brandId, and categoryId
    const groups: Record<string, typeof products> = {};
    for (const p of products) {
      const key = `${p.categoryId}|${p.brandId}|${p.name.trim().toLowerCase()}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(p);
    }

    let mergeCount = 0;

    for (const [key, group] of Object.entries(groups)) {
      if (group.length <= 1) continue;

      // We have duplicates!
      console.log(`\nFound duplicate group for key "${key}" containing ${group.length} products:`);
      group.forEach((p) => {
        console.log(` - [${p.code}] (ID: ${p.id}) created at ${p.createdAt.toISOString()}`);
      });

      // Select oldest product as the master
      const sorted = [...group].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const master = sorted[0];
      const duplicates = sorted.slice(1);

      console.log(`>>> Selected Master: [${master.code}] (ID: ${master.id}) "${master.name}"`);

      // Merge each duplicate into the master
      for (const duplicate of duplicates) {
        console.log(`    Merging duplicate: [${duplicate.code}] (ID: ${duplicate.id}) into Master...`);

        await db.$transaction(async (tx) => {
          // A. Process Variants
          const dupVariants = await tx.productVariant.findMany({
            where: { productId: duplicate.id },
          });

          for (const dv of dupVariants) {
            // Check if master already has a variant for the same supplier
            const masterVariant = await tx.productVariant.findFirst({
              where: {
                productId: master.id,
                supplierId: dv.supplierId,
                isActive: true,
              },
            });

            if (masterVariant) {
              // Master already has a variant for this supplier. Compare prices and keep highest.
              const retailMax = Decimal.max(new Decimal(masterVariant.retailPrice), new Decimal(dv.retailPrice));
              const wholesaleMax = Decimal.max(new Decimal(masterVariant.wholesalePrice), new Decimal(dv.wholesalePrice));
              const projectMax = Decimal.max(new Decimal(masterVariant.projectPrice), new Decimal(dv.projectPrice));
              const purchaseMax = Decimal.max(new Decimal(masterVariant.purchasePrice), new Decimal(dv.purchasePrice));

              await tx.productVariant.update({
                where: { id: masterVariant.id },
                data: {
                  purchasePrice: purchaseMax,
                  retailPrice: retailMax,
                  wholesalePrice: wholesaleMax,
                  projectPrice: projectMax,
                },
              });

              // Delete duplicate variant
              await tx.productVariant.delete({ where: { id: dv.id } });
              console.log(`      * Supplier variant updated on master with highest pricing; duplicate variant deleted.`);
            } else {
              // Move supplier variant to master product
              await tx.productVariant.update({
                where: { id: dv.id },
                data: { productId: master.id },
              });
              console.log(`      * Supplier variant moved to master product.`);
            }
          }

          // B. Process InventoryStock
          const dupStocks = await tx.inventoryStock.findMany({
            where: { productId: duplicate.id },
          });

          for (const ds of dupStocks) {
            // Check if master already has stock record in this warehouse
            const masterStock = await tx.inventoryStock.findUnique({
              where: {
                productId_warehouseId: {
                  productId: master.id,
                  warehouseId: ds.warehouseId,
                },
              },
            });

            if (masterStock) {
              // Add duplicate stock to master stock
              await tx.inventoryStock.update({
                where: { id: masterStock.id },
                data: {
                  quantity: masterStock.quantity.plus(ds.quantity),
                  reservedQty: masterStock.reservedQty.plus(ds.reservedQty),
                },
              });
              // Delete duplicate stock record
              await tx.inventoryStock.delete({ where: { id: ds.id } });
              console.log(`      * Stock quantity (${ds.quantity}) added to master's stock record; duplicate stock record deleted.`);
            } else {
              // Repoint duplicate stock record to master product
              await tx.inventoryStock.update({
                where: { id: ds.id },
                data: { productId: master.id },
              });
              console.log(`      * Stock record moved to master product.`);
            }
          }

          // C. Repoint historical records
          // C1. Stock Transactions
          const txCount = await tx.stockTransaction.updateMany({
            where: { productId: duplicate.id },
            data: { productId: master.id },
          });
          if (txCount.count > 0) {
            console.log(`      * Repointed ${txCount.count} Stock Transactions.`);
          }

          // C2. Purchase Order Items
          const poCount = await tx.purchaseOrderItem.updateMany({
            where: { productId: duplicate.id },
            data: { productId: master.id },
          });
          if (poCount.count > 0) {
            console.log(`      * Repointed ${poCount.count} Purchase Order Items.`);
          }

          // C3. Sales Invoice Items
          const siCount = await tx.salesInvoiceItem.updateMany({
            where: { productId: duplicate.id },
            data: { productId: master.id },
          });
          if (siCount.count > 0) {
            console.log(`      * Repointed ${siCount.count} Sales Invoice Items.`);
          }

          // C4. Purchase Return Items
          const prCount = await tx.purchaseReturnItem.updateMany({
            where: { productId: duplicate.id },
            data: { productId: master.id },
          });
          if (prCount.count > 0) {
            console.log(`      * Repointed ${prCount.count} Purchase Return Items.`);
          }

          // C5. Sales Return Items
          const srCount = await tx.salesReturnItem.updateMany({
            where: { productId: duplicate.id },
            data: { productId: master.id },
          });
          if (srCount.count > 0) {
            console.log(`      * Repointed ${srCount.count} Sales Return Items.`);
          }

          // D. Delete the duplicate product
          await tx.product.delete({
            where: { id: duplicate.id },
          });
          console.log(`      * Duplicate product record [${duplicate.code}] deleted.`);
        });
      }
      mergeCount++;
    }

    console.log(`\n✅ Finished successfully! Consolidated ${mergeCount} duplicate product groups.`);
  } catch (err: any) {
    console.error("❌ Consolidation failed:", err.message || String(err));
  }
}

main();
