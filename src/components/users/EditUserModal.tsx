"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Role } from "../../lib/constants";
import { updateUserCredentials } from "../../modules/auth/actions";
import { toast } from "sonner";
import {
  User, Shield, Loader2, AlertCircle, Mail, Lock, Eye, EyeOff,
  ChevronDown, ChevronRight, KeyRound, Phone,
} from "lucide-react";

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sessionUserId: string;
  userToEdit: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: Role;
    isActive: boolean;
  } | null;
}

// ── Password strength helper ─────────────────────────────────
function getPasswordStrength(pw: string): { label: string; color: string; percent: number } {
  if (!pw || pw.length === 0) return { label: "", color: "bg-zinc-200", percent: 0 };
  const hasMinLen = pw.length >= 8;
  const hasNumber = /\d/.test(pw);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw);

  let score = 0;
  if (hasMinLen) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  if (score >= 3) return { label: "Strong", color: "bg-emerald-500", percent: 100 };
  if (score === 2) return { label: "Fair", color: "bg-amber-500", percent: 66 };
  return { label: "Weak", color: "bg-red-500", percent: 33 };
}

export function EditUserModal({
  isOpen,
  onClose,
  onSuccess,
  sessionUserId,
  userToEdit,
}: EditUserModalProps) {
  // ── Section 1 state ─────────────────────────────────────────
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("VIEWER");
  const [isActive, setIsActive] = useState(true);

  // ── Section 2 state ─────────────────────────────────────────
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // ── General ─────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);

  // Initialize form when user to edit changes
  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name);
      setEmail(userToEdit.email);
      setPhone(userToEdit.phone || "");
      setRole(userToEdit.role);
      setIsActive(userToEdit.isActive);
      // Reset password section
      setShowPasswordSection(false);
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPw(false);
      setShowConfirmPw(false);
    }
  }, [userToEdit]);

  const isEditingSelf = userToEdit ? sessionUserId === userToEdit.id : false;

  const passwordStrength = useMemo(
    () => getPasswordStrength(newPassword),
    [newPassword]
  );

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;

    // Client-side validations
    if (!name.trim()) {
      toast.error("Full name is required.");
      return;
    }
    if (!email.trim()) {
      toast.error("Email address is required.");
      return;
    }
    if (phone && !/^9\d{9}$/.test(phone.replace(/[\s\-]/g, ""))) {
      toast.error("Phone number must be 10 digits starting with 9.");
      return;
    }

    // Password validations (only if section is expanded and filled)
    const hasPassword = showPasswordSection && newPassword.length > 0;
    if (hasPassword) {
      if (newPassword.length < 8) {
        toast.error("Password must be at least 8 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("Passwords do not match.");
        return;
      }
    }

    try {
      setLoading(true);
      await updateUserCredentials(userToEdit.id, {
        name,
        email,
        phone: phone.replace(/[\s\-]/g, "") || "",
        role,
        isActive,
        newPassword: hasPassword ? newPassword : "",
        confirmPassword: hasPassword ? confirmPassword : "",
      });

      toast.success("User credentials updated successfully.");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user credentials.");
    } finally {
      setLoading(false);
    }
  };

  if (!userToEdit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl p-0">
        {/* ── Header ───────────────────────────────────────────── */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Edit User Credentials
          </DialogTitle>
          <p className="text-xs text-zinc-400 mt-1">
            Update profile info and security settings for{" "}
            <span className="font-mono text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-900 px-1 py-0.5 rounded text-zinc-600 dark:text-zinc-400">
              {userToEdit.email}
            </span>
          </p>
        </DialogHeader>

        {/* ── Self-edit warning ─────────────────────────────────── */}
        {isEditingSelf && (
          <div className="mx-6 mt-4 flex gap-2.5 p-3.5 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-400 text-xs leading-relaxed font-medium">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-500 mt-0.5" />
            <div>
              <span className="font-bold">Self-Editing Mode:</span> You cannot
              change your own role or deactivate your account.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-5">
          {/* ═══════════════════════════════════════════════════════
              SECTION 1 — Profile Info
              ═══════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Profile Information
            </h3>

            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                Full Name *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="User Full Name"
                  className="pl-10 h-10 rounded-xl border-zinc-200 dark:border-zinc-800"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-email" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                Email Address *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  id="edit-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="pl-10 h-10 rounded-xl border-zinc-200 dark:border-zinc-800"
                  required
                  disabled={loading}
                />
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">Changing email will update password recovery address</p>
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                Phone Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  id="edit-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="98XXXXXXXX"
                  className="pl-10 h-10 rounded-xl border-zinc-200 dark:border-zinc-800"
                  disabled={loading}
                />
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">Nepal mobile: 10 digits starting with 9</p>
            </div>

            {/* Security Role */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-role" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                Security Role
              </Label>
              <div className="relative" title={isEditingSelf ? "You cannot change your own role" : undefined}>
                <Shield className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 pointer-events-none" />
                <select
                  id="edit-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className={`w-full pl-10 pr-4 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none ${
                    isEditingSelf ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                  disabled={loading || isEditingSelf}
                  title={isEditingSelf ? "You cannot change your own role" : undefined}
                >
                  <option value="SUPERADMIN">Super Admin</option>
                  <option value="OWNER">Business Owner</option>
                  <option value="MANAGER">Manager</option>
                  <option value="SALES_STAFF">Sales Staff</option>
                  <option value="PURCHASE_STAFF">Purchase Staff</option>
                  <option value="VIEWER">Viewer / Read-Only</option>
                </select>
              </div>
            </div>

            {/* Account Status Toggle */}
            <div
              className={`flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-900 rounded-xl ${
                isEditingSelf ? "opacity-60 cursor-not-allowed" : ""
              }`}
              title={isEditingSelf ? "You cannot change your own status" : undefined}
            >
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Account Status
                </span>
                <span className="text-[10px] text-zinc-400 font-semibold">
                  {isActive ? "Active — can log in" : "Inactive — login blocked"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => !isEditingSelf && setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isActive ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-800"
                } ${isEditingSelf ? "cursor-not-allowed" : ""}`}
                disabled={loading || isEditingSelf}
                title={isEditingSelf ? "You cannot change your own status" : undefined}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════
              SECTION 2 — Change Password (Collapsible)
              ═══════════════════════════════════════════════════════ */}
          <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
            {/* Accordion toggle */}
            <button
              type="button"
              onClick={() => {
                setShowPasswordSection(!showPasswordSection);
                if (showPasswordSection) {
                  // Collapsing: clear password fields
                  setNewPassword("");
                  setConfirmPassword("");
                }
              }}
              className="w-full flex items-center justify-between p-3.5 bg-zinc-50/70 dark:bg-zinc-900/30 hover:bg-zinc-100/70 dark:hover:bg-zinc-900/50 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-zinc-500" />
                <span className="text-xs font-extrabold uppercase tracking-widest text-zinc-500">
                  Change Password
                </span>
              </div>
              {showPasswordSection ? (
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-zinc-400" />
              )}
            </button>

            {/* Collapsible content */}
            {showPasswordSection && (
              <div className="p-4 space-y-4 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                  Leave these fields empty and collapse this section to keep the
                  current password unchanged.
                </p>

                {/* New Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <Input
                      id="new-password"
                      type={showNewPw ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="pl-10 pr-10 h-10 rounded-xl border-zinc-200 dark:border-zinc-800"
                      disabled={loading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600"
                      tabIndex={-1}
                    >
                      {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Password strength indicator */}
                  {newPassword.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-400">
                          Strength
                        </span>
                        <span
                          className={`text-[10px] font-extrabold ${
                            passwordStrength.label === "Strong"
                              ? "text-emerald-600"
                              : passwordStrength.label === "Fair"
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        >
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${passwordStrength.percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <Input
                      id="confirm-password"
                      type={showConfirmPw ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className={`pl-10 pr-10 h-10 rounded-xl border-zinc-200 dark:border-zinc-800 ${
                        passwordsMismatch
                          ? "border-red-400 focus:ring-red-200"
                          : passwordsMatch
                          ? "border-emerald-400 focus:ring-emerald-200"
                          : ""
                      }`}
                      disabled={loading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600"
                      tabIndex={-1}
                    >
                      {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordsMismatch && (
                    <p className="text-[10px] text-red-500 font-semibold flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" /> Passwords do not match
                    </p>
                  )}
                  {passwordsMatch && (
                    <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                      ✓ Passwords match
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────────── */}
          <DialogFooter className="pt-4 border-t border-zinc-100 dark:border-zinc-900">
            <div className="flex items-center gap-2 justify-end w-full">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-10 px-4 rounded-xl text-zinc-600 font-bold border-zinc-200 dark:border-zinc-800"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-primary/20"
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export default EditUserModal;
