"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Loader2, ArrowLeft, ShieldCheck, RotateCcw } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { verifyOTP, resendOTP } from "../../../modules/auth/actions";
import Link from "next/link";

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") || "";
  const maskedEmail = searchParams.get("email") || "";

  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Handle OTP digit input
  const handleChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return; // Only digits

      const newOtp = [...otp];
      newOtp[index] = value.slice(-1); // Take only last digit
      setOtp(newOtp);
      setErrorMessage(null);

      // Auto-advance to next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [otp]
  );

  // Handle backspace navigation
  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [otp]
  );

  // Handle paste
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      const newOtp = [...Array(6)].map((_, i) => pasted[i] || "");
      setOtp(newOtp);
      // Focus on the last filled input or the next empty one
      const lastIndex = Math.min(pasted.length, 5);
      inputRefs.current[lastIndex]?.focus();
    }
  }, []);

  // Submit OTP
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join("");

    if (otpString.length !== 6) {
      setErrorMessage("Please enter all 6 digits.");
      return;
    }

    if (!ref) {
      setErrorMessage("Invalid session. Please start over from the forgot password page.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await verifyOTP(ref, otpString);

      if (!result.success) {
        setErrorMessage(result.error || "Invalid OTP.");
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        // Success — redirect to reset password page with token
        router.push(
          `/reset-password?token=${encodeURIComponent(result.resetToken!)}`
        );
      }
    } catch {
      setErrorMessage("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (!canResend || resending) return;

    setResending(true);
    setErrorMessage(null);

    try {
      const result = await resendOTP(ref);

      if (result.success) {
        setCountdown(60);
        setCanResend(false);
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        setErrorMessage(result.error || "Could not resend OTP.");
      }
    } catch {
      setErrorMessage("Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  if (!ref) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/95 p-10 shadow-2xl shadow-black/30 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Invalid Session</h1>
          <p className="text-sm text-zinc-400 mb-6">
            No password reset session found. Please start over.
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
          <h1 className="mt-4 text-3xl font-bold text-white">Enter Your OTP</h1>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            {maskedEmail ? (
              <>
                OTP sent to: <span className="font-mono text-emerald-400 font-semibold">{maskedEmail}</span>
              </>
            ) : (
              "A 6-digit code was sent to your registered email."
            )}
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* OTP Input Boxes */}
          <div className="flex justify-center gap-2.5">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-zinc-800/50 text-white outline-none transition-all duration-200 ${
                  digit
                    ? "border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                    : "border-zinc-700 hover:border-zinc-600"
                } focus:border-emerald-400 focus:shadow-lg focus:shadow-emerald-500/20`}
                disabled={isSubmitting}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
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
              <>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Verify OTP
              </>
            )}
          </Button>

          {/* Resend OTP */}
          <div className="text-center">
            {canResend ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
              >
                {resending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                Resend OTP
              </button>
            ) : (
              <p className="text-sm text-zinc-500">
                Resend OTP in{" "}
                <span className="text-zinc-300 font-mono font-bold">
                  {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, "0")}
                </span>
              </p>
            )}
          </div>

          <Link
            href="/forgot-password"
            className="flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Start Over
          </Link>
        </form>
      </div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      }
    >
      <VerifyOTPContent />
    </Suspense>
  );
}
