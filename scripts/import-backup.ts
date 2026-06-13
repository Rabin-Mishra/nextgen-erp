import "dotenv/config";
import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Locate the backup file path
const BACKUP_PATH = "/home/rabin/Documents/NextGenERP/NextGenERP_FullBackup_2026-06-13.json";

if (!fs.existsSync(BACKUP_PATH)) {
  console.error(`❌ Backup file not found at: ${BACKUP_PATH}`);
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function importBackup() {
  console.log("📖 Reading backup file...");
  const rawData = fs.readFileSync(BACKUP_PATH, "utf-8");
  const backup = JSON.parse(rawData);
  const data = backup.data;

  if (!data) {
    console.error("❌ Invalid backup file format. Missing data property.");
    process.exit(1);
  }

  console.log("\n🧹 Cleaning existing local records in reverse dependency order...");
  await prisma.auditLog.deleteMany();
  await prisma.depreciationEntry.deleteMany();
  await prisma.fixedAsset.deleteMany();
  await prisma.cashBookEntry.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.salesInvoiceItem.deleteMany();
  await prisma.salesInvoice.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.stockTransaction.deleteMany();
  await prisma.inventoryStock.deleteMany();
  await prisma.project.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  await prisma.fiscalYear.deleteMany();
  await prisma.user.deleteMany();
  console.log("✅ Local database cleared.");

  // Import helper that handles Date parsing for raw JSON dumps
  const parseDates = (item: any) => {
    const parsed = { ...item };
    for (const key in parsed) {
      if (typeof parsed[key] === "string" && parsed[key].match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        parsed[key] = new Date(parsed[key]);
      }
    }
    return parsed;
  };

  console.log("\n📥 Importing records in dependency order...");

  // Users
  if (data.users?.length) {
    console.log(`- Importing ${data.users.length} Users...`);
    await prisma.user.createMany({ data: data.users.map(parseDates) });
  }

  // Fiscal Years
  if (data.fiscalYears?.length) {
    console.log(`- Importing ${data.fiscalYears.length} Fiscal Years...`);
    await prisma.fiscalYear.createMany({ data: data.fiscalYears.map(parseDates) });
  }

  // Categories
  if (data.categories?.length) {
    console.log(`- Importing ${data.categories.length} Categories...`);
    await prisma.category.createMany({ data: data.categories.map(parseDates) });
  }

  // Brands
  if (data.brands?.length) {
    console.log(`- Importing ${data.brands.length} Brands...`);
    await prisma.brand.createMany({ data: data.brands.map(parseDates) });
  }

  // Warehouses
  if (data.warehouses?.length) {
    console.log(`- Importing ${data.warehouses.length} Warehouses...`);
    await prisma.warehouse.createMany({ data: data.warehouses.map(parseDates) });
  }

  // Suppliers
  if (data.suppliers?.length) {
    console.log(`- Importing ${data.suppliers.length} Suppliers...`);
    await prisma.supplier.createMany({ data: data.suppliers.map(parseDates) });
  }

  // Customers
  if (data.customers?.length) {
    console.log(`- Importing ${data.customers.length} Customers...`);
    await prisma.customer.createMany({ data: data.customers.map(parseDates) });
  }

  // Products
  if (data.products?.length) {
    console.log(`- Importing ${data.products.length} Products...`);
    await prisma.product.createMany({ data: data.products.map(parseDates) });
  }

  // Product Variants
  if (data.variants?.length) {
    console.log(`- Importing ${data.variants.length} Variants...`);
    await prisma.productVariant.createMany({ data: data.variants.map(parseDates) });
  }

  // Projects
  if (data.projects?.length) {
    console.log(`- Importing ${data.projects.length} Projects...`);
    await prisma.project.createMany({ data: data.projects.map(parseDates) });
  }

  // Stock Entries
  if (data.stock?.length) {
    console.log(`- Importing ${data.stock.length} Stock entries...`);
    await prisma.inventoryStock.createMany({ data: data.stock.map(parseDates) });
  }

  // Stock Transactions
  if (data.transactions?.length) {
    console.log(`- Importing ${data.transactions.length} Stock transactions...`);
    await prisma.stockTransaction.createMany({ data: data.transactions.map(parseDates) });
  }

  // Purchase Orders
  if (data.purchaseOrders?.length) {
    console.log(`- Importing ${data.purchaseOrders.length} Purchase Orders...`);
    await prisma.purchaseOrder.createMany({ data: data.purchaseOrders.map(parseDates) });
  }

  // Purchase Order Items
  if (data.poItems?.length) {
    console.log(`- Importing ${data.poItems.length} Purchase Order items...`);
    await prisma.purchaseOrderItem.createMany({ data: data.poItems.map(parseDates) });
  }

  // Sales Invoices
  if (data.salesInvoices?.length) {
    console.log(`- Importing ${data.salesInvoices.length} Sales Invoices...`);
    await prisma.salesInvoice.createMany({ data: data.salesInvoices.map(parseDates) });
  }

  // Sales Invoice Items
  if (data.invoiceItems?.length) {
    console.log(`- Importing ${data.invoiceItems.length} Sales Invoice items...`);
    await prisma.salesInvoiceItem.createMany({ data: data.invoiceItems.map(parseDates) });
  }

  // Payments
  if (data.payments?.length) {
    console.log(`- Importing ${data.payments.length} Payments...`);
    await prisma.payment.createMany({ data: data.payments.map(parseDates) });
  }

  // Ledger Entries
  if (data.ledgerEntries?.length) {
    console.log(`- Importing ${data.ledgerEntries.length} Ledger entries...`);
    await prisma.ledgerEntry.createMany({ data: data.ledgerEntries.map(parseDates) });
  }

  // Cash Book Entries
  if (data.cashBookEntries?.length) {
    console.log(`- Importing ${data.cashBookEntries.length} Cash Book entries...`);
    await prisma.cashBookEntry.createMany({ data: data.cashBookEntries.map(parseDates) });
  }

  // Fixed Assets
  if (data.fixedAssets?.length) {
    console.log(`- Importing ${data.fixedAssets.length} Fixed Assets...`);
    await prisma.fixedAsset.createMany({ data: data.fixedAssets.map(parseDates) });
  }

  // Depreciation Entries
  if (data.depreciation?.length) {
    console.log(`- Importing ${data.depreciation.length} Depreciation entries...`);
    await prisma.depreciationEntry.createMany({ data: data.depreciation.map(parseDates) });
  }

  // Audit Logs
  if (data.auditLogs?.length) {
    console.log(`- Importing ${data.auditLogs.length} Audit logs...`);
    await prisma.auditLog.createMany({ data: data.auditLogs.map(parseDates) });
  }

  console.log("\n🎉 Database restoration complete! Local environment populated successfully.");
}

importBackup()
  .catch((err) => {
    console.error("\n❌ Database import failed:", err);
  })
  .finally(async () => {
    await pool.end();
    process.exit(0);
  });
