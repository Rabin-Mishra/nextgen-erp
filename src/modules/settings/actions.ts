"use server";

import { getDb } from "../../lib/db";
import { getCurrentUser } from "@/auth/session";
import { getSystemSettings, saveSystemSettings, BusinessInfo, InvoiceSettings } from "../../lib/settings-store";
import { revalidatePath } from "next/cache";

// Business Info Settings
export async function saveBusinessInfoAction(data: BusinessInfo) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "SUPERADMIN" && user.role !== "OWNER")) {
    throw new Error("Access Denied. Insufficient permissions to modify business info.");
  }

  const current = getSystemSettings();
  const updated = {
    ...current,
    businessInfo: data,
  };

  const success = saveSystemSettings(updated);
  if (!success) {
    throw new Error("Failed to save business settings to store file.");
  }

  // Log in Audit Log
  const db = await getDb();
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "UPDATE",
      module: "SETTINGS",
      recordId: "businessInfo",
      oldValues: current.businessInfo as any,
      newValues: data as any,
      ipAddress: "Server-Action",
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

// Invoice Settings
export async function saveInvoiceSettingsAction(data: InvoiceSettings) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "SUPERADMIN" && user.role !== "OWNER")) {
    throw new Error("Access Denied. Insufficient permissions to modify invoice settings.");
  }

  const current = getSystemSettings();
  const updated = {
    ...current,
    invoiceSettings: data,
  };

  const success = saveSystemSettings(updated);
  if (!success) {
    throw new Error("Failed to save invoice settings to store file.");
  }

  // Log in Audit Log
  const db = await getDb();
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "UPDATE",
      module: "SETTINGS",
      recordId: "invoiceSettings",
      oldValues: current.invoiceSettings as any,
      newValues: data as any,
      ipAddress: "Server-Action",
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

// Warehouse Management Actions
export async function createWarehouseAction(data: {
  name: string;
  location?: string;
  description?: string;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "SUPERADMIN" && user.role !== "OWNER" && user.role !== "MANAGER")) {
    throw new Error("Access Denied. Only authorized personnel can manage warehouses.");
  }

  if (!data.name.trim()) {
    throw new Error("Warehouse name is required.");
  }

  const db = await getDb();
  const existing = await db.warehouse.findUnique({
    where: { name: data.name.trim() },
  });

  if (existing) {
    throw new Error("A warehouse with this name already exists.");
  }

  const wh = await db.warehouse.create({
    data: {
      name: data.name.trim(),
      location: data.location?.trim() || "",
      description: data.description?.trim() || "",
      isActive: true,
    },
  });

  // Log Audit Log
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "CREATE",
      module: "WAREHOUSE",
      recordId: wh.id,
      newValues: wh as any,
      ipAddress: "Server-Action",
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function updateWarehouseAction(
  id: string,
  data: {
    name: string;
    location?: string;
    description?: string;
    isActive: boolean;
  }
) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "SUPERADMIN" && user.role !== "OWNER" && user.role !== "MANAGER")) {
    throw new Error("Access Denied. Only authorized personnel can manage warehouses.");
  }

  if (!data.name.trim()) {
    throw new Error("Warehouse name is required.");
  }

  const db = await getDb();
  
  // Verify name uniqueness among other warehouses
  const existing = await db.warehouse.findFirst({
    where: {
      name: data.name.trim(),
      id: { not: id },
    },
  });

  if (existing) {
    throw new Error("Another warehouse with this name already exists.");
  }

  const oldWh = await db.warehouse.findUnique({ where: { id } });
  
  const updatedWh = await db.warehouse.update({
    where: { id },
    data: {
      name: data.name.trim(),
      location: data.location?.trim() || "",
      description: data.description?.trim() || "",
      isActive: data.isActive,
    },
  });

  // Log Audit Log
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "UPDATE",
      module: "WAREHOUSE",
      recordId: id,
      oldValues: oldWh as any,
      newValues: updatedWh as any,
      ipAddress: "Server-Action",
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

// Fiscal Year Actions
export async function createFiscalYearAction(data: {
  name: string;
  startDate: string;
  endDate: string;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "SUPERADMIN" && user.role !== "OWNER")) {
    throw new Error("Access Denied. Only Super Admins and Owners can manage fiscal periods.");
  }

  if (!data.name.trim() || !data.startDate || !data.endDate) {
    throw new Error("All fiscal fields are required.");
  }

  const db = await getDb();
  
  const existing = await db.fiscalYear.findUnique({
    where: { name: data.name.trim() },
  });

  if (existing) {
    throw new Error("A fiscal year with this name already exists.");
  }

  const fy = await db.fiscalYear.create({
    data: {
      name: data.name.trim(),
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      isCurrent: false,
      isClosed: false,
    },
  });

  // Log Audit Log
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "CREATE",
      module: "FISCAL_YEAR",
      recordId: fy.id,
      newValues: fy as any,
      ipAddress: "Server-Action",
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function toggleFiscalYearStatusAction(id: string, action: "close" | "setCurrent") {
  const user = await getCurrentUser();
  if (!user || (user.role !== "SUPERADMIN" && user.role !== "OWNER")) {
    throw new Error("Access Denied. Only Super Admins and Owners can modify fiscal periods.");
  }

  const db = await getDb();
  const oldFy = await db.fiscalYear.findUnique({ where: { id } });
  if (!oldFy) {
    throw new Error("Fiscal year record not found.");
  }

  if (action === "close") {
    const updatedFy = await db.fiscalYear.update({
      where: { id },
      data: { isClosed: true },
    });

    // Log Audit Log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        module: "FISCAL_YEAR",
        recordId: id,
        oldValues: oldFy as any,
        newValues: updatedFy as any,
        ipAddress: "Server-Action",
      },
    });
  } else if (action === "setCurrent") {
    // Transaction to safely set one current and unset others
    await db.$transaction([
      db.fiscalYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      }),
      db.fiscalYear.update({
        where: { id },
        data: { isCurrent: true },
      }),
    ]);

    // Log Audit Log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        module: "FISCAL_YEAR",
        recordId: id,
        newValues: { message: `Set fiscal year ${oldFy.name} as current.` },
        ipAddress: "Server-Action",
      },
    });
  }

  revalidatePath("/settings");
  return { success: true };
}

// SUPERADMIN JSON Database Backup Export
export async function exportAllDataAction() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPERADMIN") {
    throw new Error("Unauthorized. Only Super Admins can compile and export full system data backups.");
  }

  const db = await getDb();

  // Query all operational tables in parallel
  const [
    users,
    warehouses,
    categories,
    brands,
    products,
    variants,
    customers,
    suppliers,
    stock,
    transactions,
    purchaseOrders,
    poItems,
    salesInvoices,
    invoiceItems,
    projects,
    payments,
    ledgerEntries,
    cashBookEntries,
    fixedAssets,
    depreciation,
    fiscalYears,
    auditLogs
  ] = await Promise.all([
    db.user.findMany(),
    db.warehouse.findMany(),
    db.category.findMany(),
    db.brand.findMany(),
    db.product.findMany(),
    db.productVariant.findMany(),
    db.customer.findMany(),
    db.supplier.findMany(),
    db.inventoryStock.findMany(),
    db.stockTransaction.findMany(),
    db.purchaseOrder.findMany(),
    db.purchaseOrderItem.findMany(),
    db.salesInvoice.findMany(),
    db.salesInvoiceItem.findMany(),
    db.project.findMany(),
    db.payment.findMany(),
    db.ledgerEntry.findMany(),
    db.cashBookEntry.findMany(),
    db.fixedAsset.findMany(),
    db.depreciationEntry.findMany(),
    db.fiscalYear.findMany(),
    db.auditLog.findMany({ take: 200, orderBy: { createdAt: "desc" } }), // Cap logs in dump
  ]);

  const backupObject = {
    exportedAt: new Date().toISOString(),
    exporter: user.name,
    data: {
      users,
      warehouses,
      categories,
      brands,
      products,
      variants,
      customers,
      suppliers,
      stock,
      transactions,
      purchaseOrders,
      poItems,
      salesInvoices,
      invoiceItems,
      projects,
      payments,
      ledgerEntries,
      cashBookEntries,
      fixedAssets,
      depreciation,
      fiscalYears,
      auditLogs,
    },
  };

  // Add audit trace for backup export
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "BACKUP_EXPORT",
      module: "SETTINGS",
      recordId: "SYSTEM_BACKUP",
      newValues: { message: "SuperAdmin triggered full system data JSON backup compilation." },
      ipAddress: "Server-Action",
    },
  });

  return JSON.stringify(backupObject, null, 2);
}
