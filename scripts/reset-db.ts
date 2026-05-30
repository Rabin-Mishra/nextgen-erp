import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Role } from "../src/generated/prisma/enums";
import bcrypt from "bcryptjs";
import readline from "readline";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function resetDatabase() {
  console.log("\n🧹 Cleaning existing records in reverse dependency order...");

  // Wipe tables sequentially to respect foreign key constraints
  await prisma.auditLog.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.purchaseReturnItem.deleteMany();
  await prisma.purchaseReturn.deleteMany();
  await prisma.salesReturnItem.deleteMany();
  await prisma.salesReturn.deleteMany();
  await prisma.depreciationEntry.deleteMany();
  await prisma.cashBookEntry.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.projectBilling.deleteMany();
  await prisma.salesInvoiceItem.deleteMany();
  await prisma.salesInvoice.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.stockTransaction.deleteMany();
  await prisma.inventoryStock.deleteMany();
  await prisma.project.deleteMany();
  await prisma.fixedAsset.deleteMany();
  await prisma.fiscalYear.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.businessSettings.deleteMany();
  await prisma.user.deleteMany();

  console.log("✅ Database cleared.");

  // 1. Create Superadmin User
  console.log("👥 Creating production Superadmin...");
  const adminHash = await bcrypt.hash("Admin@2026", 12);
  const superAdmin = await prisma.user.create({
    data: {
      name: "Nischal Timsina",
      email: "admin@nextgen.com",
      phone: "9843146474",
      passwordHash: adminHash,
      role: Role.SUPERADMIN,
      isActive: true,
    },
  });
  console.log(`✅ Superadmin created: ${superAdmin.email}`);

  // 2. Create production Fiscal Year
  console.log("📅 Creating production Fiscal Year...");
  const fiscalYear = await prisma.fiscalYear.create({
    data: {
      name: "2081-82",
      startDate: new Date("2024-07-17"), // Shrawan 1, 2081
      endDate: new Date("2025-07-16"),   // Ashadh 32, 2082
      isCurrent: true,
      isClosed: false,
    },
  });
  console.log(`✅ Fiscal Year created: ${fiscalYear.name}`);

  // 3. Create production Warehouse (1 single main warehouse)
  console.log("🏢 Creating Main Warehouse...");
  const warehouse = await prisma.warehouse.create({
    data: {
      name: "Main Warehouse",
      location: "Gauradaha Nagarpalika-02, Jhapa, Nepal",
      description: "Central operations warehouse depot",
      isActive: true,
    },
  });
  console.log(`✅ Warehouse created: ${warehouse.name}`);

  // 4. Create production Business Settings
  console.log("⚙️  Creating production Business Settings...");
  const settingsData = [
    { key: "business_name", value: "NextGen Interior And WaterProofing", category: "business", label: "Business Name" },
    { key: "business_pan", value: "122782202", category: "business", label: "PAN / VAT Code" },
    { key: "business_address", value: "Gauradaha Nagarpalika-02, Jhapa, Nepal", category: "business", label: "Address" },
    { key: "business_phone", value: "9843146474", category: "business", label: "Phone Number" },
    { key: "business_email", value: "nextgen.interior2025@gmail.com, nischaltimsina20@gmail.com", category: "business", label: "Contact Emails" },
    { key: "business_owner", value: "Nischal Timsina", category: "business", label: "Owner Name" },
    { key: "invoice_terms", value: "Thank you for your business!", category: "invoice", label: "Invoice Terms & Notes" },
    { key: "invoice_color_retail", value: "#2563eb", category: "invoice", label: "Retail Branding Color" },
    { key: "invoice_color_wholesale", value: "#16a34a", category: "invoice", label: "Wholesale Branding Color" },
    { key: "invoice_color_project", value: "#9333ea", category: "invoice", label: "Project Branding Color" },
  ];

  await Promise.all(
    settingsData.map((s) =>
      prisma.businessSettings.create({
        data: {
          key: s.key,
          value: s.value,
          category: s.category,
          label: s.label,
          inputType: "text",
        },
      })
    )
  );
  console.log("✅ Production Business Settings seeded.");
}

rl.question(
  "⚠️  WARNING: This will permanently delete ALL data.\nType CONFIRM to proceed: ",
  async (answer) => {
    if (answer.trim() !== "CONFIRM") {
      console.log("Reset cancelled.");
      rl.close();
      await pool.end();
      process.exit(0);
    }

    try {
      await resetDatabase();
      console.log("\n✅ Reset complete. Admin user, fiscal year, and 1 warehouse created. Ready for real data.\n");
    } catch (err) {
      console.error("\n❌ Database reset failed:", err);
    } finally {
      rl.close();
      await pool.end();
      process.exit(0);
    }
  }
);
