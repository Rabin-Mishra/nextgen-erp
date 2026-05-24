"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle, Loader2, ArrowLeft, Lock, Eye, EyeOff, CheckCircle2,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { resetPasswordWithToken } from "../../../modules/auth/actions";
import Link from "next/link";
import { toast } from "sonner";

function getPasswordStrength(pw: string): {
  label: string;
  color: string;
  textColor: string;
  percent: number;
  isStrong: boolean;
} {
  if (!pw || pw.length === 0)
    return { label: "", color: "bg-zinc-700", textColor: "text-zinc-500", percent: 0, isStrong: false };

  const hasMinLen = pw.length >= 8;
  const hasNumber = /\d/.test(pw);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw);

  let score = 0;
  if (hasMinLen) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  if (score >= 3)
    return { label: "Strong", color: "bg-emerald-500", textColor: "text-emerald-400", percent: 100, isStrong: true };
  if (score === 2)
    return { label: "Fair", color: "bg-amber-500", textColor: "text-amber-400", percent: 66, isStrong: false };
  return { label: "Weak", color: "bg-red-500", textColor: "text-red-400", percent: 33, isStrong: false };
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetToken = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!resetToken) {
      setErrorMessage("Invalid reset session. Please start over.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (!strength.isStrong) {
      setErrorMessage("Password must be Strong (8+ chars, number, special character).");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await resetPasswordWithToken(resetToken, newPassword);

      if (!result.success) {
        setErrorMessage(result.error || "Failed to reset password.");
      } else {
        toast.success("Password reset successfully. Please log in with your new password.");
        router.push("/login");
      }
    } catch {
      setErrorMessage("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!resetToken) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/95 p-10 shadow-2xl shadow-black/30 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Invalid Session</h1>
          <p className="text-sm text-zinc-400 mb-6">
            No valid reset token found. Please start the process again.
          </p>
          <Link href="/forgot-password">
            <Button className="w-full">Go to Forgot Password</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/95 p-10 shadow-2xl shadow-black/30">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">NextGen ERP</p>
          <h1 className="mt-4 text-3xl font-bold text-white">Set New Password</h1>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            Create a strong password with at least 8 characters,<br />
            a number, and a special character.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-zinc-300">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <Input
                id="new-password"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="pl-10 pr-10 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500/50"
                required
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Strength indicator */}
            {newPassword.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500">Strength</span>
                  <span className={`text-[10px] font-extrabold ${strength.textColor}`}>
                    {strength.label}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${strength.percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-zinc-300">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <Input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className={`pl-10 pr-10 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 ${
                  passwordsMismatch
                    ? "border-red-500/50"
                    : passwordsMatch
                    ? "border-emerald-500/50"
                    : "focus:border-emerald-500/50"
                }`}
                required
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {passwordsMismatch && (
              <p className="text-[11px] text-red-400 font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Passwords do not match
              </p>
            )}
            {passwordsMatch && (
              <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Passwords match
              </p>
            )}
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <p>{errorMessage}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !strength.isStrong || !passwordsMatch}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
