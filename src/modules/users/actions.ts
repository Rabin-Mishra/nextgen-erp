"use server";

import { getDb } from "../../lib/db";
import { getCurrentUser } from "@/auth/session";
import { Role } from "../../lib/constants";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function createUserAction(formData: {
  name: string;
  email: string;
  password?: string;
  role: Role;
  isActive: boolean;
}) {
  const sessionUser = await getCurrentUser();

  if (!sessionUser) {
    throw new Error("Unauthorized. Please log in.");
  }

  if (sessionUser.role !== "SUPERADMIN") {
    throw new Error("Access Denied. Only Super Admins can manage users.");
  }

  if (!formData.name || !formData.email || !formData.role) {
    throw new Error("Missing required fields.");
  }

  const db = await getDb();

  // Check if email already exists
  const existingUser = await db.user.findUnique({
    where: { email: formData.email.trim().toLowerCase() },
  });

  if (existingUser) {
    throw new Error("A user with this email address already exists.");
  }

  // Hash password
  const rawPassword = formData.password || "Temp@123";
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const newUser = await db.user.create({
    data: {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
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
    throw new Error("Access Denied. Only Super Admins can manage users.");
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

export async function fetchAuditLogsAction(filters: import("./queries").AuditLogFilters) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || sessionUser.role !== "SUPERADMIN") {
    throw new Error("Unauthorized. Only Super Admins can inspect audit logs.");
  }
  const { getAuditLogs } = await import("./queries");
  return getAuditLogs(filters);
}

export async function fetchAuditLogMetadataAction() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || sessionUser.role !== "SUPERADMIN") {
    throw new Error("Unauthorized. Only Super Admins can query audit log parameters.");
  }
  const { getAuditLogModules, getAuditLogActions, getUsersList } = await import("./queries");
  const [modules, actions, users] = await Promise.all([
    getAuditLogModules(),
    getAuditLogActions(),
    getUsersList(),
  ]);
  return { modules, actions, users };
}
