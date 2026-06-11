import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Role, Unit, CustomerType, StockTransactionType, PurchaseOrderStatus, InvoiceType, InvoiceStatus, PaymentMethod, PaymentMode, ProjectStatus, PartyType, EntryType, ChannelType, CashEntryType, DepreciationMethod } from "../src/generated/prisma/enums";
import bcrypt from "bcryptjs";
import { Decimal } from "decimal.js";

const pool = new Pool({ connectionString: process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚀 Starting database seeding for NextGen ERP...");

  // 1. Clean existing records in reverse dependency order
  console.log("🧹 Cleaning old data...");
  await prisma.auditLog.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.purchaseReturnItem.deleteMany();
  await prisma.purchaseReturn.deleteMany();
  await prisma.salesReturnItem.deleteMany();
  await prisma.salesReturn.deleteMany();
  await prisma.businessSettings.deleteMany();
  await prisma.depreciationEntry.deleteMany();
  await prisma.fixedAsset.deleteMany();
  await prisma.cashBookEntry.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.projectBilling.deleteMany();
  await prisma.salesInvoiceItem.deleteMany();
  await prisma.salesInvoice.deleteMany();
  await prisma.project.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.stockTransaction.deleteMany();
  await prisma.inventoryStock.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.fiscalYear.deleteMany();
  await prisma.user.deleteMany();

  console.log("✅ Database cleared.");

  // 2. Seed Users
  console.log("👥 Seeding Users...");
  const adminHash = await bcrypt.hash("Admin@123", 10);
  const ownerHash = await bcrypt.hash("Owner@123", 10);
  const managerHash = await bcrypt.hash("Manager@123", 10);
  const salesHash = await bcrypt.hash("Sales@123", 10);
  const purchaseHash = await bcrypt.hash("Purchase@123", 10);

  const superAdmin = await prisma.user.create({
    data: {
      name: "Rabin Sharma",
      email: "rabin.mishra2060@gmail.com",
      phone: "9824059780",
      passwordHash: adminHash,
      role: Role.SUPERADMIN,
      isActive: true,
    },
  });

  const owner = await prisma.user.create({
    data: {
      name: "Nischal Timsina",
      email: "nischal@nextgen.com",
      passwordHash: ownerHash,
      role: Role.OWNER,
      isActive: true,
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "Sita Dahal",
      email: "sita@nextgen.com",
      passwordHash: managerHash,
      role: Role.MANAGER,
      isActive: true,
    },
  });

  const salesStaff = await prisma.user.create({
    data: {
      name: "Gopal Adhikari",
      email: "gopal@nextgen.com",
      passwordHash: salesHash,
      role: Role.SALES_STAFF,
      isActive: true,
    },
  });

  const purchaseStaff = await prisma.user.create({
    data: {
      name: "Hari Prasad",
      email: "hari@nextgen.com",
      passwordHash: purchaseHash,
      role: Role.PURCHASE_STAFF,
      isActive: true,
    },
  });

  console.log("✅ Users seeded.");

  // 3. Seed Warehouses
  console.log("🏢 Seeding Warehouses...");
  const whMain = await prisma.warehouse.create({
    data: { name: "Main Warehouse", location: "Gauradaha-02, Jhapa", description: "Primary storage facility" },
  });
  const whYardB = await prisma.warehouse.create({
    data: { name: "Yard B", location: "Gauradaha-03, Jhapa", description: "Heavy construction items yard" },
  });
  const whDispatch = await prisma.warehouse.create({
    data: { name: "Dispatch Bay", location: "Gauradaha-02, Jhapa", description: "Pending orders sorting bay" },
  });

  const warehouses = [whMain, whYardB, whDispatch];
  console.log("✅ Warehouses seeded.");

  // 4. Seed Fiscal Year
  console.log("📅 Seeding Fiscal Year...");
  const currentFY = await prisma.fiscalYear.create({
    data: {
      name: "2081-82",
      startDate: new Date("2024-07-16T00:00:00.000Z"),
      endDate: new Date("2025-07-15T23:59:59.000Z"),
      isCurrent: true,
      isClosed: false,
    },
  });
  console.log("✅ Fiscal Year seeded.");

  // 5. Seed Categories & Brands
  console.log("🏷️ Seeding Categories & Brands...");
  const catNames = ["Construction", "Plumbing", "Electrical", "Finishing", "Waterproofing"];
  const categories = await Promise.all(
    catNames.map((name) => prisma.category.create({ data: { name, description: `${name} products` } }))
  );

  const brandNames = ["Himal", "Shivam", "Jagdamba", "Asian Paints", "Finolex"];
  const brands = await Promise.all(
    brandNames.map((name) => prisma.brand.create({ data: { name, description: `Products from ${name}` } }))
  );

  console.log("✅ Categories & Brands seeded.");

  // 6. Seed Products (10 per category, total 50)
  console.log("📦 Seeding 50 Products and variants...");
  const itemsMeta = [
    // Category 0: Construction
    ["OPC Cement", Unit.BAG, 0, 50, 100],
    ["PPC Cement", Unit.BAG, 0, 40, 80],
    ["TMT Steel Rebar 12mm", Unit.KG, 0, 500, 1000],
    ["TMT Steel Rebar 16mm", Unit.KG, 0, 500, 1000],
    ["Coarse Sand", Unit.BOX, 0, 5, 10], // Box/Trolley
    ["Crushed Stone Aggregate", Unit.BOX, 0, 5, 10],
    ["Red Clay Bricks", Unit.PCS, 0, 2000, 5000],
    ["Concrete Blocks", Unit.PCS, 0, 500, 1000],
    ["Binding Wire", Unit.KG, 0, 15, 30],
    ["Scaffolding Pipes", Unit.PCS, 0, 50, 100],

    // Category 1: Plumbing
    ["PVC Pipe 110mm", Unit.METER, 1, 30, 60],
    ["CPVC Pipe 1/2 inch", Unit.METER, 1, 40, 80],
    ["PPR Pipe 25mm", Unit.METER, 1, 25, 50],
    ["Brass Gate Valve", Unit.PCS, 1, 10, 20],
    ["Teflon Tape", Unit.ROLL, 1, 50, 100],
    ["PVC Elbow 110mm", Unit.PCS, 1, 20, 40],
    ["CPVC Tee 1/2 inch", Unit.PCS, 1, 30, 60],
    ["PPR Socket 25mm", Unit.PCS, 1, 35, 70],
    ["Chrome Bib Tap", Unit.PCS, 1, 15, 30],
    ["Waste Pipe Flexible", Unit.PCS, 1, 25, 50],

    // Category 2: Electrical
    ["FR Wires 1.5 sq mm", Unit.ROLL, 2, 10, 20],
    ["FR Wires 2.5 sq mm", Unit.ROLL, 2, 8, 15],
    ["Modular Switch 1-Way", Unit.PCS, 2, 50, 100],
    ["Modular Socket 16A", Unit.PCS, 2, 40, 80],
    ["LED Panel Light 12W", Unit.PCS, 2, 30, 60],
    ["MCB Single Pole 16A", Unit.PCS, 2, 12, 25],
    ["MCB Double Pole 32A", Unit.PCS, 2, 6, 12],
    ["PVC Conduit Pipe 20mm", Unit.METER, 2, 100, 200],
    ["Switch Plate 6-Module", Unit.PCS, 2, 20, 40],
    ["Insulation Tape Black", Unit.ROLL, 2, 50, 100],

    // Category 3: Finishing
    ["Wall Putty White", Unit.BAG, 3, 20, 40],
    ["Acrylic Distemper", Unit.LITRE, 3, 50, 100],
    ["Interior Emulsion Paint", Unit.LITRE, 3, 40, 80],
    ["Exterior Weathercoat Paint", Unit.LITRE, 3, 30, 60],
    ["Universal Stainer Red", Unit.PCS, 3, 15, 30],
    ["Paint Brush 4 inch", Unit.PCS, 3, 20, 40],
    ["Wall Sandpaper #120", Unit.PCS, 3, 100, 200],
    ["Turpentine Solvent", Unit.LITRE, 3, 10, 20],
    ["Wood Varnish Clear", Unit.LITRE, 3, 8, 15],
    ["Gypsum Board Panels", Unit.PCS, 3, 25, 50],

    // Category 4: Waterproofing
    ["Polymer Waterproof Coating", Unit.LITRE, 4, 30, 60],
    ["Bituminous Waterproofing Membrane", Unit.ROLL, 4, 5, 10],
    ["Polyurethane Joint Sealant", Unit.PCS, 4, 24, 48],
    ["Crystalline Waterproofing Powder", Unit.BAG, 4, 10, 20],
    ["Epoxy Grout Kit", Unit.PCS, 4, 10, 20],
    ["Water Repellent Spray", Unit.LITRE, 4, 15, 30],
    ["SBR Latex Bonding Agent", Unit.LITRE, 4, 25, 50],
    ["Self-Adhesive Flash Band", Unit.ROLL, 4, 12, 24],
    ["Injection Grouting Pump", Unit.PCS, 4, 1, 2],
    ["Drainage Board Cellular", Unit.ROLL, 4, 5, 10],
  ];

  // Base pricing configurations to generate variants
  const basePrices = [
    // OPC Cement, PPC Cement, TMT Rebars, Coarse Sand...
    { cost: 800, retail: 950, wholesale: 880, project: 900 },
    { cost: 680, retail: 800, wholesale: 740, project: 760 },
    { cost: 105, retail: 125, wholesale: 115, project: 118 },
    { cost: 105, retail: 125, wholesale: 115, project: 118 },
    { cost: 9500, retail: 12000, wholesale: 10500, project: 11000 },
    { cost: 8800, retail: 11000, wholesale: 9800, project: 10200 },
    { cost: 14, retail: 18, wholesale: 16, project: 15.5 },
    { cost: 45, retail: 60, wholesale: 52, project: 50 },
    { cost: 180, retail: 240, wholesale: 210, project: 220 },
    { cost: 1200, retail: 1600, wholesale: 1400, project: 1450 },

    // Plumbing
    { cost: 650, retail: 850, wholesale: 720, project: 750 },
    { cost: 120, retail: 160, wholesale: 135, project: 140 },
    { cost: 180, retail: 240, wholesale: 200, project: 210 },
    { cost: 850, retail: 1200, wholesale: 950, project: 1000 },
    { cost: 35, retail: 55, wholesale: 42, project: 45 },
    { cost: 140, retail: 190, wholesale: 160, project: 165 },
    { cost: 45, retail: 65, wholesale: 52, project: 55 },
    { cost: 22, retail: 35, wholesale: 26, project: 28 },
    { cost: 650, retail: 900, wholesale: 750, project: 800 },
    { cost: 85, retail: 130, wholesale: 98, project: 105 },

    // Electrical
    { cost: 2800, retail: 3600, wholesale: 3100, project: 3200 },
    { cost: 4200, retail: 5500, wholesale: 4600, project: 4800 },
    { cost: 95, retail: 150, wholesale: 115, project: 120 },
    { cost: 160, retail: 250, wholesale: 190, project: 200 },
    { cost: 450, retail: 680, wholesale: 520, project: 550 },
    { cost: 350, retail: 520, wholesale: 400, project: 420 },
    { cost: 850, retail: 1250, wholesale: 980, project: 1050 },
    { cost: 95, retail: 140, wholesale: 110, project: 115 },
    { cost: 250, retail: 380, wholesale: 290, project: 300 },
    { cost: 30, retail: 50, wholesale: 36, project: 40 },

    // Finishing
    { cost: 680, retail: 850, wholesale: 750, project: 770 },
    { cost: 160, retail: 220, wholesale: 185, project: 190 },
    { cost: 480, retail: 650, wholesale: 540, project: 560 },
    { cost: 550, retail: 750, wholesale: 620, project: 650 },
    { cost: 85, retail: 120, wholesale: 95, project: 100 },
    { cost: 110, retail: 170, wholesale: 130, project: 135 },
    { cost: 15, retail: 25, wholesale: 18, project: 20 },
    { cost: 190, retail: 280, wholesale: 220, project: 230 },
    { cost: 650, retail: 900, wholesale: 740, project: 780 },
    { cost: 980, retail: 1350, wholesale: 1100, project: 1150 },

    // Waterproofing
    { cost: 1400, retail: 1950, wholesale: 1600, project: 1680 },
    { cost: 4800, retail: 6500, wholesale: 5400, project: 5600 },
    { cost: 320, retail: 480, wholesale: 380, project: 400 },
    { cost: 980, retail: 1400, wholesale: 1100, project: 1150 },
    { cost: 1200, retail: 1700, wholesale: 1350, project: 1400 },
    { cost: 450, retail: 650, wholesale: 520, project: 540 },
    { cost: 620, retail: 880, wholesale: 700, project: 740 },
    { cost: 850, retail: 1200, wholesale: 960, project: 1000 },
    { cost: 18000, retail: 24000, wholesale: 20000, project: 21000 },
    { cost: 3800, retail: 5200, wholesale: 4200, project: 4400 },
  ];

  // Seed 5 Suppliers
  console.log("🏭 Seeding Suppliers...");
  const supplierNames = [
    ["Kathmandu Construction Mart", "SUP-001", "Koteshwor, Kathmandu", "9801234561", "100234567"],
    ["Biratnagar Pipe Distributers", "SUP-002", "Morang, Biratnagar", "9801234562", "100234568"],
    ["Pokhara Electric Store", "SUP-003", "Mahendrapool, Pokhara", "9801234563", "100234569"],
    ["Asian Paints Nepal Ltd", "SUP-004", "Hetauda Industrial District", "9801234564", "100234570"],
    ["Jhapa Waterproofing Traders", "SUP-005", "Birtamode, Jhapa", "9801234565", "100234571"],
  ];

  const suppliers = await Promise.all(
    supplierNames.map(([name, code, address, phone, pan]) =>
      prisma.supplier.create({
        data: {
          name,
          code,
          address,
          phone,
          panNumber: pan,
          email: `${code.toLowerCase()}@example.com`,
          openingBalance: new Decimal(0),
        },
      })
    )
  );

  // Seed 10 Customers
  console.log("🤝 Seeding Customers...");
  const customerMeta = [
    ["Apex Builders & Developers", "CUS-001", CustomerType.WHOLESALE, "Kathmandu", "9851011111", "300456123", 2000000],
    ["Shree Ram Nirman Sewa", "CUS-002", CustomerType.PROJECT, "Jhapa", "9852022222", "300456124", 5000000],
    ["Nirakar Waterproofing Services", "CUS-003", CustomerType.WHOLESALE, "Morang", "9852033333", "300456125", 1500000],
    ["Subham Decorators", "CUS-004", CustomerType.RETAIL, "Damak, Jhapa", "9852044444", "", 100000],
    ["Everest Residences Project", "CUS-005", CustomerType.PROJECT, "Lalitpur", "9851055555", "300456126", 10000000],
    ["Hari Prasad Dahal", "CUS-006", CustomerType.RETAIL, "Gauradaha, Jhapa", "9842601111", "", 50000],
    ["Sita Kumari Shrestha", "CUS-007", CustomerType.RETAIL, "Gauradaha, Jhapa", "9842602222", "", 50000],
    ["Lumbini Heritage Hotel", "CUS-008", CustomerType.PROJECT, "Rupandehi", "9857011111", "300456127", 6000000],
    ["Panchakanya Infrastructures", "CUS-009", CustomerType.WHOLESALE, "Lalitpur", "9851066666", "300456128", 3000000],
    ["Local Finisher & Co", "CUS-010", CustomerType.WHOLESALE, "Birtamode, Jhapa", "9852077777", "", 500000],
  ];

  const customers = await Promise.all(
    customerMeta.map(([name, code, type, address, phone, pan, creditLimit]) =>
      prisma.customer.create({
        data: {
          name: name as string,
          code: code as string,
          customerType: type as CustomerType,
          address: address as string,
          phone: phone as string,
          panNumber: pan as string,
          creditLimit: new Decimal(creditLimit as number),
          openingBalance: new Decimal(0),
        },
      })
    )
  );

  const products: any[] = [];
  for (let i = 0; i < itemsMeta.length; i++) {
    const [name, unit, catIdx, minStock, reorder] = itemsMeta[i];
    const category = categories[catIdx as number];
    const brand = brands[i % brands.length];
    const prices = basePrices[i];

    // Determine supplier for this item type
    let preferredSupplier = suppliers[4]; // Default to Jhapa Waterproofing
    if (catIdx === 0) preferredSupplier = suppliers[0]; // Construction -> Kathmandu Construction Mart
    else if (catIdx === 1) preferredSupplier = suppliers[1]; // Plumbing -> Biratnagar Pipe
    else if (catIdx === 2) preferredSupplier = suppliers[2]; // Electrical -> Pokhara Electric
    else if (catIdx === 3) preferredSupplier = suppliers[3]; // Finishing -> Asian Paints

    const code = `ITM-${String(i + 1).padStart(3, "0")}`;

    const prod = await prisma.product.create({
      data: {
        code,
        name: name as string,
        categoryId: category.id,
        brandId: brand.id,
        unit: unit as Unit,
        description: `Premium quality ${name} for commercial construction projects.`,
        minStockLevel: minStock as number,
        reorderLevel: reorder as number,
      },
    });

    const variant = await prisma.productVariant.create({
      data: {
        productId: prod.id,
        supplierId: preferredSupplier.id,
        purchasePrice: new Decimal(prices.cost),
        retailPrice: new Decimal(prices.retail),
        wholesalePrice: new Decimal(prices.wholesale),
        projectPrice: new Decimal(prices.project),
        effectiveDate: new Date("2026-01-01T00:00:00.000Z"),
        isActive: true,
      },
    });

    // Seed stock levels in each warehouse
    await prisma.inventoryStock.create({
      data: {
        productId: prod.id,
        warehouseId: whMain.id,
        quantity: 0, // Will be filled dynamically by seed transactions
        reservedQty: 0,
      },
    });
    await prisma.inventoryStock.create({
      data: {
        productId: prod.id,
        warehouseId: whYardB.id,
        quantity: 0,
        reservedQty: 0,
      },
    });
    await prisma.inventoryStock.create({
      data: {
        productId: prod.id,
        warehouseId: whDispatch.id,
        quantity: 0,
        reservedQty: 0,
      },
    });

    products.push({ ...prod, variant, preferredSupplier });
  }
  console.log("✅ 50 Products & Variants seeded with stock structures.");

  // 7. Seed Projects (3 Active Projects)
  console.log("🏗️ Seeding Projects...");
  const prj1 = await prisma.project.create({
    data: {
      projectCode: "PRJ-001",
      name: "Waterproofing for Gauradaha City Hall",
      clientId: customers[1].id, // Shree Ram Nirman Sewa
      description: "Complete basement and rooftop waterproofing using high-grade bituminous membranes.",
      startDate: new Date("2026-02-15T00:00:00.000Z"),
      endDate: new Date("2026-06-30T00:00:00.000Z"),
      status: ProjectStatus.ACTIVE,
      budgetAmount: new Decimal(1500000), // Material/Operating budget
      contractAmount: new Decimal(2200000), // Billed revenue
      createdBy: owner.id,
    },
  });

  const prj2 = await prisma.project.create({
    data: {
      projectCode: "PRJ-002",
      name: "Electrical Retrofitting at Heritage Hotel",
      clientId: customers[7].id, // Lumbini Heritage Hotel
      description: "Commercial lighting, solar connection integration, and safety switches installation.",
      startDate: new Date("2026-03-01T00:00:00.000Z"),
      endDate: new Date("2026-07-15T00:00:00.000Z"),
      status: ProjectStatus.ACTIVE,
      budgetAmount: new Decimal(3200000),
      contractAmount: new Decimal(4800000),
      createdBy: owner.id,
    },
  });

  const prj3 = await prisma.project.create({
    data: {
      projectCode: "PRJ-003",
      name: "Finishing & Coating for Everest Apartments",
      clientId: customers[4].id, // Everest Residences Project
      description: "Full wall putty, primer, weathercoat paints, and decorative wall panels.",
      startDate: new Date("2026-03-10T00:00:00.000Z"),
      endDate: new Date("2026-08-30T00:00:00.000Z"),
      status: ProjectStatus.ACTIVE,
      budgetAmount: new Decimal(8000000),
      contractAmount: new Decimal(12000000),
      createdBy: owner.id,
    },
  });

  const activeProjects = [prj1, prj2, prj3];
  console.log("✅ Projects seeded.");

  // 8. 90-Day Rolling Transaction Simulator
  console.log("📅 Simulating 90 days of transactions (purchase, sales, cash book, ledgers)...");
  
  // Date configuration
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);
  
  let openingCash = new Decimal(5000000); // 50 Lakhs starting capital
  let openingBank = new Decimal(8000000); // 80 Lakhs in bank account
  let openingEsewa = new Decimal(200000); // 2 Lakhs digital
  
  // Write initial Capital Contribution Entries in Cash Book
  await prisma.cashBookEntry.create({
    data: {
      entryDate: new Date(startDate.getTime() - 1000 * 60 * 60 * 24),
      type: CashEntryType.RECEIVED,
      amount: openingCash,
      description: "Opening Cash Capital Contribution",
      paymentMethod: PaymentMode.CASH,
      createdBy: superAdmin.id,
    },
  });
  
  await prisma.cashBookEntry.create({
    data: {
      entryDate: new Date(startDate.getTime() - 1000 * 60 * 60 * 24),
      type: CashEntryType.RECEIVED,
      amount: openingBank,
      description: "Opening Bank Capital Contribution",
      paymentMethod: PaymentMode.BANK,
      createdBy: superAdmin.id,
    },
  });

  // Track running balances
  const supplierLedgerBalances: Record<string, Decimal> = {};
  const customerLedgerBalances: Record<string, Decimal> = {};
  
  suppliers.forEach((s) => (supplierLedgerBalances[s.id] = new Decimal(0)));
  customers.forEach((c) => (customerLedgerBalances[c.id] = new Decimal(0)));

  let poCount = 1;
  let invCount = 1;

  // Let's iterate day by day for 90 days
  for (let day = 0; day <= 90; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + day);

    // Skip Sundays sometimes or simulate realistic operational cycles
    const dayOfWeek = currentDate.getDay();

    // 1. WAREHOUSE SUPPLY PURCHASES (Trigger POs)
    // Run purchases twice a week on average
    if (dayOfWeek === 1 || dayOfWeek === 4) {
      const activeSupplier = suppliers[day % suppliers.length];
      const purchaseUser = purchaseStaff;

      // Filter products supplied by this supplier
      const sProds = products.filter((p) => p.preferredSupplier.id === activeSupplier.id);
      if (sProds.length > 0) {
        const poProducts = sProds.slice(0, 3); // Pick 3 items to buy
        
        let subtotal = new Decimal(0);
        const orderItemsData = poProducts.map((p) => {
          const qty = 50 + (day % 4) * 20; // 50 to 110 items
          const price = p.variant.purchasePrice;
          const total = price.times(qty);
          subtotal = subtotal.plus(total);
          return {
            productId: p.id,
            orderedQty: qty,
            receivedQty: qty, // Assume completed receiving in seed
            unitPrice: price,
            totalPrice: total,
          };
        });

        const tax = subtotal.times(0.13);
        const totalAmount = subtotal.plus(tax);
        const poNumber = `PO-${String(poCount++).padStart(4, "0")}`;

        // Create PO
        const po = await prisma.purchaseOrder.create({
          data: {
            poNumber,
            supplierId: activeSupplier.id,
            orderDate: currentDate,
            expectedDate: new Date(currentDate.getTime() + 1000 * 60 * 60 * 24 * 3), // +3 days
            status: PurchaseOrderStatus.RECEIVED,
            subtotal,
            discountAmount: new Decimal(0),
            taxAmount: tax,
            totalAmount,
            paidAmount: totalAmount, // Paid in full
            notes: `Bulk procurement of construction/waterproofing supplies.`,
            createdBy: purchaseUser.id,
          },
        });

        // PO items
        for (const item of orderItemsData) {
          await prisma.purchaseOrderItem.create({
            data: {
              purchaseOrderId: po.id,
              productId: item.productId,
              orderedQty: item.orderedQty,
              receivedQty: item.receivedQty,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            },
          });

          // Stock transactions
          const wh = warehouses[day % warehouses.length];
          await prisma.stockTransaction.create({
            data: {
              type: StockTransactionType.PURCHASE_IN,
              productId: item.productId,
              warehouseId: wh.id,
              quantity: item.orderedQty,
              unitCost: item.unitPrice,
              referenceType: "PURCHASE_ORDER",
              referenceId: po.id,
              userId: purchaseUser.id,
              createdAt: currentDate,
            },
          });

          // Update Inventory Stock Snapshot
          await prisma.inventoryStock.updateMany({
            where: { productId: item.productId, warehouseId: wh.id },
            data: { quantity: { increment: item.orderedQty } },
          });
        }

        // DOUBLE-ENTRY LEDGER & CASH BOOK
        // Credit Accounts Payable / Supplier
        const runningBalBefore = supplierLedgerBalances[activeSupplier.id];
        const creditBalance = runningBalBefore.plus(totalAmount); // Supplier is credited (we owe more)
        supplierLedgerBalances[activeSupplier.id] = creditBalance;

        await prisma.ledgerEntry.create({
          data: {
            entryDate: currentDate,
            partyType: PartyType.SUPPLIER,
            partyId: activeSupplier.id,
            entryType: EntryType.CREDIT,
            amount: totalAmount,
            referenceType: "PURCHASE_ORDER",
            referenceId: po.id,
            description: `Procurement PO: ${poNumber} | Cr. Accounts Payable`,
            runningBalance: creditBalance,
            channelType: ChannelType.GENERAL,
            createdBy: purchaseUser.id,
            createdAt: currentDate,
          },
        });

        // Pay immediately from bank
        const debitBalance = creditBalance.minus(totalAmount); // Paid Supplier (we owe less)
        supplierLedgerBalances[activeSupplier.id] = debitBalance;

        await prisma.ledgerEntry.create({
          data: {
            entryDate: currentDate,
            partyType: PartyType.SUPPLIER,
            partyId: activeSupplier.id,
            entryType: EntryType.DEBIT,
            amount: totalAmount,
            referenceType: "PURCHASE_ORDER",
            referenceId: po.id,
            description: `Payment PO: ${poNumber} via Bank Transfer | Dr. Accounts Payable`,
            runningBalance: debitBalance,
            channelType: ChannelType.GENERAL,
            createdBy: purchaseUser.id,
            createdAt: currentDate,
          },
        });

        // Save in payment transactions log
        await prisma.payment.create({
          data: {
            referenceType: "PURCHASE",
            referenceId: po.id,
            partyType: PartyType.SUPPLIER,
            partyId: activeSupplier.id,
            amount: totalAmount,
            paymentMethod: PaymentMode.BANK,
            paymentDate: currentDate,
            notes: `Bank payment for PO ${poNumber}`,
            createdBy: purchaseUser.id,
          },
        });

        // Cash book record
        await prisma.cashBookEntry.create({
          data: {
            entryDate: currentDate,
            type: CashEntryType.PAID,
            amount: totalAmount,
            description: `Payment for supply procurement PO: ${poNumber} to ${activeSupplier.name}`,
            partyType: PartyType.SUPPLIER,
            partyId: activeSupplier.id,
            referenceType: "PURCHASE_ORDER",
            referenceId: po.id,
            paymentMethod: PaymentMode.BANK,
            createdBy: purchaseUser.id,
            createdAt: currentDate,
          },
        });
      }
    }

    // 2. PROJECT ISSUES (Simulate using material stock for active projects)
    if (dayOfWeek === 2 || dayOfWeek === 5) {
      const activeProj = activeProjects[day % activeProjects.length];
      // Get products with active stock to issue
      const wh = whMain;
      
      // Select 2 random products and issue 5-15 units
      const itemIndices = [(day * 7) % products.length, (day * 13) % products.length];
      
      for (const idx of itemIndices) {
        const prod = products[idx];
        const issueQty = 5 + (day % 3) * 5; // 5, 10, or 15 units

        // Check if there is enough stock before issuing in our simulation
        const currentStock = await prisma.inventoryStock.findUnique({
          where: { productId_warehouseId: { productId: prod.id, warehouseId: wh.id } },
        });

        if (currentStock && currentStock.quantity.toNumber() >= issueQty) {
          // Deduct from stock snapshot
          await prisma.inventoryStock.update({
            where: { productId_warehouseId: { productId: prod.id, warehouseId: wh.id } },
            data: { quantity: { decrement: issueQty } },
          });

          // Stock transaction
          await prisma.stockTransaction.create({
            data: {
              type: StockTransactionType.PROJECT_ISSUE,
              productId: prod.id,
              warehouseId: wh.id,
              quantity: -issueQty,
              unitCost: prod.variant.purchasePrice,
              referenceType: "PROJECT",
              referenceId: activeProj.id,
              notes: `Issued materials to project ${activeProj.projectCode}: ${prod.name}`,
              userId: manager.id,
              createdAt: currentDate,
            },
          });
        }
      }
    }

    // 3. SALES INVOICES (Simulate sales)
    // Run sales invoices every few days (highly active)
    if (dayOfWeek !== 6) { // Except Saturdays (weekly off)
      const activeCustomer = customers[day % customers.length];
      const salesUser = salesStaff;

      // Invoice Type & Pricing Channel
      let invType: InvoiceType = InvoiceType.RETAIL;
      let priceField: "retailPrice" | "wholesalePrice" | "projectPrice" = "retailPrice";
      if (activeCustomer.customerType === CustomerType.WHOLESALE) {
        invType = InvoiceType.WHOLESALE;
        priceField = "wholesalePrice";
      } else if (activeCustomer.customerType === CustomerType.PROJECT) {
        invType = InvoiceType.PROJECT;
        priceField = "projectPrice";
      }

      // Pick 2 random items to sell
      const item1Idx = (day * 3) % products.length;
      const item2Idx = (day * 11 + 2) % products.length;
      const invoiceProducts = [products[item1Idx], products[item2Idx]];

      let subtotal = new Decimal(0);
      const invoiceItemsData: any[] = [];
      const wh = warehouses[day % warehouses.length];

      for (const p of invoiceProducts) {
        const qty = 5 + (day % 3) * 5; // 5, 10, or 15 items
        const price = p.variant[priceField];
        const total = price.times(qty);
        
        // Check if there is stock to fulfill the sale in our seed
        const currentStock = await prisma.inventoryStock.findUnique({
          where: { productId_warehouseId: { productId: p.id, warehouseId: wh.id } },
        });

        if (currentStock && currentStock.quantity.toNumber() >= qty) {
          subtotal = subtotal.plus(total);
          invoiceItemsData.push({
            productId: p.id,
            qty,
            unitPrice: price,
            totalPrice: total,
            warehouseId: wh.id,
            purchasePrice: p.variant.purchasePrice, // Store variant cost price
          });
        }
      }

      if (invoiceItemsData.length > 0) {
        const vatPercent = new Decimal(13);
        const vatAmount = subtotal.times(0.13);
        const totalAmount = subtotal.plus(vatAmount);
        
        const invoiceNumber = `INV-${String(invCount++).padStart(4, "0")}`;
        const associatedProject = invType === InvoiceType.PROJECT ? activeProjects[day % activeProjects.length] : null;

        // Determine Payment status
        let paidAmount = totalAmount; // Default: paid in full
        let status: InvoiceStatus = InvoiceStatus.PAID;
        let payMethod: PaymentMethod = PaymentMethod.BANK_TRANSFER;
        let payMode: PaymentMode = PaymentMode.BANK;

        if (day % 5 === 0) {
          // Cash sales
          payMethod = PaymentMethod.CASH;
          payMode = PaymentMode.CASH;
        } else if (day % 7 === 0) {
          // Digital Esewa
          payMethod = PaymentMethod.ESEWA;
          payMode = PaymentMode.ESEWA;
        } else if (day % 9 === 0) {
          // Partial invoice
          paidAmount = totalAmount.times(0.4); // 40% paid
          status = InvoiceStatus.PARTIAL;
          payMethod = PaymentMethod.CREDIT;
          payMode = PaymentMode.BANK; // partial goes to bank
        }

        // Create Invoice
        const invoice = await prisma.salesInvoice.create({
          data: {
            invoiceNumber,
            customerId: activeCustomer.id,
            invoiceType: invType,
            projectId: associatedProject ? associatedProject.id : null,
            invoiceDate: currentDate,
            dueDate: new Date(currentDate.getTime() + 1000 * 60 * 60 * 24 * 30), // +30 days
            status,
            subtotal,
            discountPercent: new Decimal(0),
            discountAmount: new Decimal(0),
            vatPercent,
            vatAmount,
            totalAmount,
            paidAmount,
            balanceAmount: totalAmount.minus(paidAmount),
            paymentMethod: payMethod,
            notes: `Supply sales invoice billed under ${invType} channel.`,
            createdBy: salesUser.id,
          },
        });

        // Add invoice items
        for (const item of invoiceItemsData) {
          await prisma.salesInvoiceItem.create({
            data: {
              invoiceId: invoice.id,
              productId: item.productId,
              qty: item.qty,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              warehouseId: item.warehouseId,
            },
          });

          // Stock transactions
          await prisma.stockTransaction.create({
            data: {
              type: StockTransactionType.SALE_OUT,
              productId: item.productId,
              warehouseId: item.warehouseId,
              quantity: -item.qty,
              unitCost: item.purchasePrice, // Log correct cost price
              referenceType: "SALES_INVOICE",
              referenceId: invoice.id,
              userId: salesUser.id,
              createdAt: currentDate,
            },
          });

          // Update stock snapshots
          await prisma.inventoryStock.updateMany({
            where: { productId: item.productId, warehouseId: item.warehouseId },
            data: { quantity: { decrement: item.qty } },
          });
        }

        // Under project context, log milestone billing
        if (associatedProject) {
          await prisma.projectBilling.create({
            data: {
              projectId: associatedProject.id,
              invoiceId: invoice.id,
              billingDate: currentDate,
              amount: totalAmount,
              notes: `Project billing progress milestone: ${invoiceNumber}`,
            },
          });
        }

        // DOUBLE-ENTRY LEDGER & CASH BOOK
        // Debit Customer Accounts Receivable (Customer owes more)
        const cBalBefore = customerLedgerBalances[activeCustomer.id];
        const debitBalance = cBalBefore.plus(totalAmount);
        customerLedgerBalances[activeCustomer.id] = debitBalance;

        await prisma.ledgerEntry.create({
          data: {
            entryDate: currentDate,
            partyType: PartyType.CUSTOMER,
            partyId: activeCustomer.id,
            entryType: EntryType.DEBIT,
            amount: totalAmount,
            referenceType: "SALES_INVOICE",
            referenceId: invoice.id,
            description: `Sales Billed Invoice: ${invoiceNumber} | Dr. Accounts Receivable`,
            runningBalance: debitBalance,
            channelType: invType as unknown as ChannelType,
            createdBy: salesUser.id,
            createdAt: currentDate,
          },
        });

        // Credit Customer accounts for the paid amount (Customer paid some)
        if (paidAmount.greaterThan(0)) {
          const creditBalance = debitBalance.minus(paidAmount);
          customerLedgerBalances[activeCustomer.id] = creditBalance;

          await prisma.ledgerEntry.create({
            data: {
              entryDate: currentDate,
              partyType: PartyType.CUSTOMER,
              partyId: activeCustomer.id,
              entryType: EntryType.CREDIT,
              amount: paidAmount,
              referenceType: "SALES_INVOICE",
              referenceId: invoice.id,
              description: `Sales Received Payment: ${invoiceNumber} via ${payMode} | Cr. Accounts Receivable`,
              runningBalance: creditBalance,
              channelType: invType as unknown as ChannelType,
              createdBy: salesUser.id,
              createdAt: currentDate,
            },
          });

          // Log payment transaction
          await prisma.payment.create({
            data: {
              referenceType: "INVOICE",
              referenceId: invoice.id,
              partyType: PartyType.CUSTOMER,
              partyId: activeCustomer.id,
              amount: paidAmount,
              paymentMethod: payMode,
              paymentDate: currentDate,
              notes: `Payment received for Sales Invoice ${invoiceNumber}`,
              createdBy: salesUser.id,
            },
          });

          // Inflow in Cash Book
          await prisma.cashBookEntry.create({
            data: {
              entryDate: currentDate,
              type: CashEntryType.RECEIVED,
              amount: paidAmount,
              description: `Received payment for Invoice: ${invoiceNumber} from ${activeCustomer.name}`,
              partyType: PartyType.CUSTOMER,
              partyId: activeCustomer.id,
              referenceType: "SALES_INVOICE",
              referenceId: invoice.id,
              paymentMethod: payMode,
              createdBy: salesUser.id,
              createdAt: currentDate,
            },
          });
        }
      }
    }
  }

  // 9. Seeding Fixed Assets & Depreciation (for reports testing)
  console.log("🚙 Seeding Fixed Assets and Depreciation logs...");
  const vehicle = await prisma.fixedAsset.create({
    data: {
      name: "TATA Dumper Delivery Truck",
      category: "Vehicles",
      purchaseDate: new Date("2025-08-01T00:00:00.000Z"),
      purchasePrice: new Decimal(4500000), // 45 Lakhs
      usefulLifeYears: 10,
      depreciationMethod: DepreciationMethod.STRAIGHT_LINE,
      currentValue: new Decimal(4162500),
    },
  });

  const mixer = await prisma.fixedAsset.create({
    data: {
      name: "High Capacity Concrete Mixer",
      category: "Machinery & Equipment",
      purchaseDate: new Date("2025-10-01T00:00:00.000Z"),
      purchasePrice: new Decimal(1200000), // 12 Lakhs
      usefulLifeYears: 8,
      depreciationMethod: DepreciationMethod.STRAIGHT_LINE,
      currentValue: new Decimal(1112500),
    },
  });

  // Seed standard depreciation log entries
  await prisma.depreciationEntry.create({
    data: {
      assetId: vehicle.id,
      fiscalYear: "2081-82",
      month: 5, // Bhadra
      amount: new Decimal(37500),
      bookValueBefore: new Decimal(4500000),
      bookValueAfter: new Decimal(4462500),
    },
  });

  await prisma.depreciationEntry.create({
    data: {
      assetId: mixer.id,
      fiscalYear: "2081-82",
      month: 7, // Kartik
      amount: new Decimal(12500),
      bookValueBefore: new Decimal(1200000),
      bookValueAfter: new Decimal(1187500),
    },
  });

  await seedBusinessSettings();

  console.log("🏁 Database Seeding completed successfully!");
}

async function seedBusinessSettings() {
  const settings = [
    { key: 'business_name', value: 'NextGen Interior And WaterProofing', category: 'business', label: 'Business Name', inputType: 'text' },
    { key: 'business_pan', value: '122782202', category: 'business', label: 'PAN Number', inputType: 'text' },
    { key: 'business_phone', value: '9843146474', category: 'business', label: 'Phone Number', inputType: 'tel' },
    { key: 'business_email', value: 'gauravchaulagain99@gmail.com', category: 'business', label: 'Business Email', inputType: 'email' },
    { key: 'business_address', value: 'Gauradaha Nagarpalika-02, Jhapa, Nepal', category: 'business', label: 'Address', inputType: 'textarea' },
    { key: 'business_owner', value: 'Nischal Timsina', category: 'business', label: 'Owner Name', inputType: 'text' },
    { key: 'business_type', value: 'Construction Materials Distributor', category: 'business', label: 'Business Type', inputType: 'text' },
    { key: 'invoice_prefix', value: 'INV', category: 'invoice', label: 'Invoice Prefix', inputType: 'text' },
    { key: 'po_prefix', value: 'PO', category: 'invoice', label: 'PO Prefix', inputType: 'text' },
    { key: 'vat_rate', value: '13', category: 'invoice', label: 'VAT Rate (%)', inputType: 'number' },
    { key: 'invoice_terms', value: 'Thank you for your business!', category: 'invoice', label: 'Invoice Footer Terms', inputType: 'textarea' },
    { key: 'invoice_color_retail', value: '#2563eb', category: 'invoice', label: 'Retail Invoice Color', inputType: 'color' },
    { key: 'invoice_color_wholesale', value: '#16a34a', category: 'invoice', label: 'Wholesale Invoice Color', inputType: 'color' },
    { key: 'invoice_color_project', value: '#9333ea', category: 'invoice', label: 'Project Invoice Color', inputType: 'color' },
    { key: 'currency_symbol', value: 'NPR', category: 'regional', label: 'Currency Symbol', inputType: 'text' },
    { key: 'currency_name', value: 'Nepali Rupee', category: 'regional', label: 'Currency Name', inputType: 'text' },
    { key: 'date_primary', value: 'BS', category: 'regional', label: 'Primary Date Format', inputType: 'select' },
    { key: 'low_stock_multiplier', value: '1', category: 'inventory', label: 'Low Stock Alert Multiplier', inputType: 'number' },
    { key: 'high_stock_multiplier', value: '5', category: 'inventory', label: 'High Stock Alert Multiplier', inputType: 'number' },
    { key: 'credit_limit_default', value: '100000', category: 'sales', label: 'Default Credit Limit (NPR)', inputType: 'number' },
    { key: 'report_footer_text', value: 'NextGen Interior And WaterProofing — Confidential', category: 'reports', label: 'Report Footer Text', inputType: 'text' },
  ];

  for (const setting of settings) {
    await prisma.businessSettings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting
    });
  }
  console.log('Business settings seeded');
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
