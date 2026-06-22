"use server";

import { getDb } from "../../lib/db";
import { getCurrentUser } from "@/auth/session";
import { Role } from "../../lib/constants";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function createUserAction(formData: {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: Role;
  isActive: boolean;
}) {
  try {
    const sessionUser = await getCurrentUser();

    if (!sessionUser) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    if (sessionUser.role !== "SUPERADMIN") {
      return { success: false, error: "Access Denied. Only Super Admins can create users." };
    }

    if (!formData.name || !formData.email || !formData.role) {
      return { success: false, error: "Missing required fields." };
    }

    const db = await getDb();

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: formData.email.trim().toLowerCase() },
    });

    if (existingUser) {
      return { success: false, error: "A user with this email address already exists." };
    }

    // Hash password
    const rawPassword = formData.password || "Temp@123";
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const newUser = await db.user.create({
      data: {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone?.trim() || null,
        passwordHash,
        role: formData.role,
        isActive: formData.isActive,
      },
    });

    // Log audit trail
    await db.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: "CREATE",
        module: "USER",
        recordId: newUser.id,
        newValues: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          isActive: newUser.isActive,
        },
        ipAddress: "Server-Action",
      },
    });

    // Simulate welcome email print to console
    console.log(`
======================================================================
📧 WELCOME EMAIL SIMULATOR (STAGING)
To: ${newUser.name} <${newUser.email}>
Subject: Welcome to NextGen Interior & Waterproofing ERP Console

Dear ${newUser.name},
Your account has been successfully created with role: ${newUser.role}.

Temporary credentials:
Email: ${newUser.email}
Password: ${rawPassword}

Access link: http://localhost:3000/login
Please change your password immediately upon your first login.
======================================================================
    `);

    revalidatePath("/users");
    return { success: true, userId: newUser.id };
  } catch (error: any) {
    console.error("Error in createUserAction:", error);
    return { success: false, error: error.message || "Failed to create user account." };
  }
}

export async function updateUserAction(
  userId: string,
  formData: {
    name: string;
    role: Role;
    isActive: boolean;
  }
) {
  const sessionUser = await getCurrentUser();

  if (!sessionUser) {
    throw new Error("Unauthorized. Please log in.");
  }

  if (sessionUser.role !== "SUPERADMIN") {
    throw new Error("Access Denied. Only Super Admins can edit users.");
  }

  const db = await getDb();

  // Fetch current user details
  const oldUser = await db.user.findUnique({
    where: { id: userId },
  });

  if (!oldUser) {
    throw new Error("User account not found.");
  }

  // Prevent editing own role
  if (sessionUser.id === userId && oldUser.role !== formData.role) {
    throw new Error("Security Guardrail: You cannot modify your own security role.");
  }

  // Prevent disabling own account
  if (sessionUser.id === userId && !formData.isActive) {
    throw new Error("Security Guardrail: You cannot deactivate your own active session account.");
  }

  const updatedUser = await db.user.update({
    where: { id: userId },
    data: {
      name: formData.name.trim(),
      role: formData.role,
      isActive: formData.isActive,
    },
  });

  // Log audit log
  await db.auditLog.create({
    data: {
      userId: sessionUser.id,
      action: "UPDATE",
      module: "USER",
      recordId: userId,
      oldValues: {
        name: oldUser.name,
        role: oldUser.role,
        isActive: oldUser.isActive,
      },
      newValues: {
        name: updatedUser.name,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
      },
      ipAddress: "Server-Action",
    },
  });

  revalidatePath("/users");
  return { success: true };
}

export async function deleteUserAction(userId: string) {
  try {
    const sessionUser = await getCurrentUser();

    if (!sessionUser) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    if (sessionUser.role !== "SUPERADMIN") {
      return { success: false, error: "Access Denied. Only Super Admins can delete users." };
    }

    if (sessionUser.id === userId) {
      return { success: false, error: "Security Guardrail: You cannot delete your own active session account." };
    }

    const db = await getDb();

    // Find if user exists and fetch relations to check constraints
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      include: {
        purchaseOrders: { take: 1 },
        salesInvoices: { take: 1 },
        projects: { take: 1 },
        payments: { take: 1 },
        ledgerEntries: { take: 1 },
        cashBookEntries: { take: 1 },
        expenses: { take: 1 },
      }
    });

    if (!targetUser) {
      return { success: false, error: "User account not found." };
    }

    const hasRelations = 
      targetUser.purchaseOrders.length > 0 ||
      targetUser.salesInvoices.length > 0 ||
      targetUser.projects.length > 0 ||
      targetUser.payments.length > 0 ||
      targetUser.ledgerEntries.length > 0 ||
      targetUser.cashBookEntries.length > 0 ||
      targetUser.expenses.length > 0;

    if (hasRelations) {
      return { success: false, error: "This user has active operational records (sales, purchases, expenses, or ledgers) linked to their account. They cannot be hard-deleted. Please deactivate their account instead to preserve audit history." };
    }

    // Safe delete: delete associated password resets and audit logs first, then user
    await db.$transaction([
      db.passwordResetToken.deleteMany({ where: { userId } }),
      db.auditLog.deleteMany({ where: { userId } }),
      db.user.delete({ where: { id: userId } }),
    ]);

    // Log in active session's audit log
    await db.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: "DELETE",
        module: "USER",
        recordId: userId,
        oldValues: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
        },
        ipAddress: "Server-Action",
      }
    });

    revalidatePath("/users");
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteUserAction:", error);
    return { success: false, error: error.message || "Failed to delete user." };
  }
}

export async function fetchAuditLogsAction(filters: import("./queries").AuditLogFilters) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || (sessionUser.role !== "SUPERADMIN" && sessionUser.role !== "OWNER")) {
    throw new Error("Unauthorized. Only Super Admins and Business Owners can inspect audit logs.");
  }
  const { getAuditLogs } = await import("./queries");
  return getAuditLogs(filters);
}

export async function fetchAuditLogMetadataAction() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || (sessionUser.role !== "SUPERADMIN" && sessionUser.role !== "OWNER")) {
    throw new Error("Unauthorized. Only Super Admins and Business Owners can query audit log parameters.");
  }
  const { getAuditLogModules, getAuditLogActions, getUsersList } = await import("./queries");
  const [modules, actions, users] = await Promise.all([
    getAuditLogModules(),
    getAuditLogActions(),
    getUsersList(),
  ]);
  return { modules, actions, users };
}
