"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Mail, Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { requestPasswordReset } from "../../../modules/auth/actions";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage("Email address is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await requestPasswordReset(email);

      // Always show the same generic message for security
      setSent(true);

      // If we actually got a ref back, redirect to OTP page
      if (result.ref) {
        setTimeout(() => {
          router.push(
            `/verify-otp?ref=${encodeURIComponent(result.ref!)}&email=${encodeURIComponent(result.maskedEmail || "")}`
          );
        }, 2000);
      }
    } catch (err: any) {
      // Even on errors, show generic message for security
      setSent(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/95 p-10 shadow-2xl shadow-black/30">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">NextGen ERP</p>
          <h1 className="mt-4 text-3xl font-bold text-white">Reset Your Password</h1>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            Enter your registered email address.<br />
            We will send an OTP to that email.
          </p>
        </div>

        {sent ? (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
              <ShieldCheck className="h-10 w-10 text-emerald-400" />
              <p className="text-sm text-emerald-200 text-center font-medium leading-relaxed">
                If your details match our records, a 6-digit OTP has been sent to your registered email address.
              </p>
              <p className="text-xs text-zinc-400 text-center">
                Check your inbox (and spam folder). Redirecting...
              </p>
            </div>

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="pl-10 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500/50"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <p>{errorMessage}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                "Send OTP"
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
        )}

        <p className="mt-6 text-center text-xs text-zinc-500">
          A 6-digit OTP will be sent to your registered email for verification.
        </p>
      </div>
    </div>
  );
}
