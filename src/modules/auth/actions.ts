"use server";

import { z } from "zod";
import { getDb } from "../../lib/db";
import { getCurrentUser } from "../../auth/session";
import { ROLES } from "../../lib/constants";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

// ── Zod schema ──────────────────────────────────────────────
const updateUserCredentialsSchema = z
  .object({
    name: z.string().min(1, "Full name is required").max(100),
    email: z.string().email("Invalid email address").max(150),
    phone: z.string().max(15).optional().or(z.literal("")),
    role: z.enum(ROLES),
    isActive: z.boolean(),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .optional()
      .or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      // If newPassword is provided (non-empty), confirmPassword must match
      if (data.newPassword && data.newPassword.length > 0) {
        return data.confirmPassword === data.newPassword;
      }
      return true;
    },
    { message: "Passwords do not match", path: ["confirmPassword"] }
  );

export type UpdateUserCredentialsInput = z.infer<typeof updateUserCredentialsSchema>;

// ── Server action ───────────────────────────────────────────
export async function updateUserCredentials(
  userId: string,
  rawData: UpdateUserCredentialsInput
) {
  // 1. Auth check
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    throw new Error("Unauthorized. Please log in.");
  }

  // 2. Permission: SUPERADMIN/OWNER can edit anyone. Others can only edit themselves.
  const isSuperAdminOrOwner = sessionUser.role === "SUPERADMIN" || sessionUser.role === "OWNER";
  const isEditingSelf = sessionUser.id === userId;

  if (!isSuperAdminOrOwner && !isEditingSelf) {
    throw new Error("Access Denied. You can only edit your own profile.");
  }

  // 3. Validate with Zod
  const parsed = updateUserCredentialsSchema.safeParse(rawData);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    throw new Error(firstError?.message || "Validation failed.");
  }

  const data = parsed.data;

  // 4. Fetch current user record
  const db = await getDb();
  const oldUser = await db.user.findUnique({ where: { id: userId } });
  if (!oldUser) {
    throw new Error("User account not found.");
  }

  // 5. Self-edit guardrails (server-side enforcement)
  if (isEditingSelf) {
    if (data.role !== oldUser.role) {
      throw new Error("Security Guardrail: You cannot modify your own role.");
    }
    if (!data.isActive && oldUser.isActive) {
      throw new Error("Security Guardrail: You cannot deactivate your own account.");
    }
  }

  // 6. Non-SUPERADMIN/OWNER cannot change roles of others
  if (!isSuperAdminOrOwner && data.role !== oldUser.role) {
    throw new Error("Access Denied. Only Super Admins and Business Owners can change user roles.");
  }

  // 7. Email uniqueness check (exclude current user)
  const emailLower = data.email.trim().toLowerCase();
  const emailConflict = await db.user.findFirst({
    where: {
      email: emailLower,
      id: { not: userId },
    },
  });
  if (emailConflict) {
    throw new Error("A user with this email address already exists.");
  }

  const updatePayload: Record<string, unknown> = {
    name: data.name.trim(),
    email: emailLower,
    phone: (data.phone && data.phone.trim()) || null,
    role: data.role,
    isActive: data.isActive,
  };

  // 9. Hash password only if provided
  const passwordChanged = !!(data.newPassword && data.newPassword.length >= 8);
  if (passwordChanged) {
    updatePayload.passwordHash = await bcrypt.hash(data.newPassword!, 12);
  }

  // 10. Update user record
  const updatedUser = await db.user.update({
    where: { id: userId },
    data: updatePayload,
  });

  // 11. Log in AuditLog
  const changes: Record<string, unknown> = {};
  if (oldUser.name !== updatedUser.name) changes.name = { from: oldUser.name, to: updatedUser.name };
  if (oldUser.email !== updatedUser.email) changes.email = { from: oldUser.email, to: updatedUser.email };
  if (oldUser.role !== updatedUser.role) changes.role = { from: oldUser.role, to: updatedUser.role };
  if (oldUser.isActive !== updatedUser.isActive) changes.isActive = { from: oldUser.isActive, to: updatedUser.isActive };
  if (passwordChanged) changes.passwordHash = "••• changed •••";

  await db.auditLog.create({
    data: {
      userId: sessionUser.id,
      action: "UPDATE",
      module: "USER",
      recordId: userId,
      oldValues: {
        name: oldUser.name,
        email: oldUser.email,
        role: oldUser.role,
        isActive: oldUser.isActive,
      },
      newValues: {
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        ...(passwordChanged ? { password: "changed" } : {}),
      },
      ipAddress: "Server-Action",
    },
  });

  // 12. Revalidate
  revalidatePath("/users");

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════
// PASSWORD RESET ACTIONS
// ═══════════════════════════════════════════════════════════════

import { sendOTPEmail } from "../../lib/email";
import crypto from "crypto";

/** Mask email for display: r***@domain.com */
function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***@***";
  return user[0] + "***@" + domain;
}

// ── requestPasswordReset ────────────────────────────────────
export async function requestPasswordReset(
  email: string
): Promise<{ success: boolean; ref?: string; maskedEmail?: string; error?: string }> {
  const genericResponse = {
    success: true,
  };

  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) {
    return genericResponse;
  }

  const db = await getDb();

  // 1. Find user by email (must be active)
  const user = await db.user.findFirst({
    where: {
      email: { equals: trimmedEmail, mode: "insensitive" },
      isActive: true,
    },
  });

  if (!user) {
    // Wait 1 second to prevent timing attacks
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return genericResponse;
  }

  // 2. Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 3. Hash OTP
  const otpHash = await bcrypt.hash(otp, 12);

  // 4. Delete any existing unused tokens for this user
  await db.passwordResetToken.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  });

  // 5. Create new token record (expires in 10 minutes)
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
  });

  // 6. Send OTP email via Resend
  console.log(`[DEV ONLY] Generated OTP for ${user.email}: ${otp}`);
  const emailResult = await sendOTPEmail(user.email, otp, user.name);

  if (!emailResult.success) {
    return {
      success: false,
      error: emailResult.error || "Failed to send OTP. Please try again.",
    };
  }

  // 7. Log to AuditLog
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "PASSWORD_RESET_OTP_SENT",
      module: "AUTH",
      recordId: user.id,
      newValues: {
        email: user.email,
        otpSent: true,
      },
      ipAddress: "Server-Action",
    },
  });

  // 8. Return ref (base64-encoded userId)
  const ref = Buffer.from(user.id).toString("base64");

  return {
    success: true,
    ref,
    maskedEmail: maskEmail(user.email),
  };
}

// ── verifyOTP ───────────────────────────────────────────────
export async function verifyOTP(
  ref: string,
  otp: string
): Promise<{ success: boolean; resetToken?: string; error?: string }> {
  // 1. Decode userId from ref
  let userId: string;
  try {
    userId = Buffer.from(ref, "base64").toString("utf-8");
  } catch {
    return { success: false, error: "Invalid request. Please start over." };
  }

  const db = await getDb();

  // 2. Find valid (unused, unexpired) token
  const tokenRecord = await db.passwordResetToken.findFirst({
    where: {
      userId,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!tokenRecord) {
    return { success: false, error: "OTP expired or already used. Please request a new one." };
  }

  // 3. Check attempt limit
  if (tokenRecord.attempts >= 5) {
    await db.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { used: true },
    });
    return {
      success: false,
      error: "Too many wrong attempts. This OTP has been invalidated. Please request a new one.",
    };
  }

  // 4. Compare OTP
  const isMatch = await bcrypt.compare(otp, tokenRecord.otpHash);

  if (!isMatch) {
    const newAttempts = tokenRecord.attempts + 1;
    await db.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { attempts: newAttempts },
    });

    const remaining = 5 - newAttempts;
    if (remaining <= 0) {
      await db.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { used: true },
      });
      return {
        success: false,
        error: "Too many wrong attempts. This OTP has been invalidated.",
      };
    }

    return {
      success: false,
      error: `Invalid OTP. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
    };
  }

  // 5. OTP matches — generate a secure reset token
  const resetToken = crypto.randomUUID();

  await db.passwordResetToken.update({
    where: { id: tokenRecord.id },
    data: { token: resetToken },
  });

  return { success: true, resetToken };
}

// ── resetPasswordWithToken ──────────────────────────────────
export async function resetPasswordWithToken(
  resetToken: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Validate password strength server-side
  if (newPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }
  if (!/\d/.test(newPassword)) {
    return { success: false, error: "Password must contain at least one number." };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
    return { success: false, error: "Password must contain at least one special character." };
  }

  const db = await getDb();

  // 2. Find token record
  const tokenRecord = await db.passwordResetToken.findFirst({
    where: {
      token: resetToken,
      used: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!tokenRecord) {
    return { success: false, error: "Invalid or expired reset link. Please start over." };
  }

  // 3. Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 12);

  // 4. Update user's password
  await db.user.update({
    where: { id: tokenRecord.userId },
    data: { passwordHash },
  });

  // 5. Mark token as used
  await db.passwordResetToken.update({
    where: { id: tokenRecord.id },
    data: { used: true },
  });

  // 6. Invalidate ALL existing unused tokens for this user
  await db.passwordResetToken.updateMany({
    where: { userId: tokenRecord.userId, used: false },
    data: { used: true },
  });

  // 7. Log to AuditLog
  await db.auditLog.create({
    data: {
      userId: tokenRecord.userId,
      action: "PASSWORD_RESET_COMPLETED",
      module: "AUTH",
      recordId: tokenRecord.userId,
      newValues: { passwordReset: true },
      ipAddress: "Server-Action",
    },
  });

  return { success: true };
}

// ── resendOTP ───────────────────────────────────────────────
export async function resendOTP(
  ref: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Decode userId from ref
  let userId: string;
  try {
    userId = Buffer.from(ref, "base64").toString("utf-8");
  } catch {
    return { success: false, error: "Invalid request." };
  }

  const db = await getDb();

  // 2. Check rate limit — find most recent token for this user
  const latestToken = await db.passwordResetToken.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (latestToken) {
    const elapsed = Date.now() - latestToken.createdAt.getTime();
    if (elapsed < 60_000) {
      // Less than 60 seconds since last OTP
      const waitSec = Math.ceil((60_000 - elapsed) / 1000);
      return {
        success: false,
        error: `Please wait ${waitSec} seconds before requesting another OTP.`,
      };
    }
  }

  // 3. Count total tokens in last 30 minutes (max 3 resends)
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
  const recentCount = await db.passwordResetToken.count({
    where: {
      userId,
      createdAt: { gte: thirtyMinAgo },
    },
  });

  if (recentCount >= 4) {
    return {
      success: false,
      error: "Too many attempts. Please start over from the forgot password page.",
    };
  }

  // 4. Fetch user
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    return { success: false, error: "Account not found or inactive." };
  }

  // 5. Invalidate old tokens
  await db.passwordResetToken.updateMany({
    where: { userId, used: false },
    data: { used: true },
  });

  // 6. Generate new OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, 12);

  await db.passwordResetToken.create({
    data: {
      userId,
      otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  // 7. Send email
  const emailResult = await sendOTPEmail(user.email, otp, user.name);
  if (!emailResult.success) {
    return {
      success: false,
      error: emailResult.error || "Failed to send OTP. Please try again.",
    };
  }

  // 8. Log
  await db.auditLog.create({
    data: {
      userId,
      action: "PASSWORD_RESET_OTP_RESENT",
      module: "AUTH",
      recordId: userId,
      newValues: { resend: true },
      ipAddress: "Server-Action",
    },
  });

  return { success: true };
}

export async function resetAllData(): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Auth check
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return { success: false, error: "Unauthorized. Please log in." };
    }
    if (sessionUser.role !== "SUPERADMIN") {
      return { success: false, error: "Access Denied. Only Superadmins can reset database records." };
    }

    const db = await getDb();

    // Execute identical sequential wipe as scripts/reset-db.ts
    await db.auditLog.deleteMany();
    await db.expense.deleteMany();
    await db.purchaseReturnItem.deleteMany();
    await db.purchaseReturn.deleteMany();
    await db.salesReturnItem.deleteMany();
    await db.salesReturn.deleteMany();
    await db.depreciationEntry.deleteMany();
    await db.cashBookEntry.deleteMany();
    await db.ledgerEntry.deleteMany();
    await db.payment.deleteMany();
    await db.projectBilling.deleteMany();
    await db.salesInvoiceItem.deleteMany();
    await db.salesInvoice.deleteMany();
    await db.purchaseOrderItem.deleteMany();
    await db.purchaseOrder.deleteMany();
    await db.stockTransaction.deleteMany();
    await db.inventoryStock.deleteMany();
    await db.project.deleteMany();
    await db.fixedAsset.deleteMany();
    await db.fiscalYear.deleteMany();
    await db.productVariant.deleteMany();
    await db.product.deleteMany();
    await db.customer.deleteMany();
    await db.supplier.deleteMany();
    await db.warehouse.deleteMany();
    await db.brand.deleteMany();
    await db.category.deleteMany();
    await db.passwordResetToken.deleteMany();
    await db.businessSettings.deleteMany();
    await db.user.deleteMany();

    // 1. Create Superadmin User
    const adminHash = await bcrypt.hash("Admin@2026", 12);
    await db.user.create({
      data: {
        name: "Nischal Timsina",
        email: "admin@nextgen.com",
        phone: "9843146474",
        passwordHash: adminHash,
        role: "SUPERADMIN",
        isActive: true,
      },
    });

    // 2. Create production Fiscal Year
    await db.fiscalYear.create({
      data: {
        name: "2081-82",
        startDate: new Date("2024-07-17"), // Shrawan 1, 2081
        endDate: new Date("2025-07-16"),   // Ashadh 32, 2082
        isCurrent: true,
        isClosed: false,
      },
    });

    // 3. Create production Warehouse (1 single main warehouse)
    await db.warehouse.create({
      data: {
        name: "Main Warehouse",
        location: "Gauradaha Nagarpalika-02, Jhapa, Nepal",
        description: "Central operations warehouse depot",
        isActive: true,
      },
    });

    // 4. Create production Business Settings
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
        db.businessSettings.create({
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

    return { success: true };
  } catch (err: any) {
    console.error("Failed to reset database:", err);
    return { success: false, error: err.message || "Failed to reset database." };
  }
}

