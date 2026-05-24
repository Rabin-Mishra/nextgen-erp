"use client";

import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertTriangle } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const response = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl: "/dashboard",
    });

    setIsSubmitting(false);

    if (response?.error) {
      setErrorMessage("Invalid email or password. Please try again.");
      return;
    }

    if (response?.url) {
      router.push(response.url);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/95 p-10 shadow-2xl shadow-black/30">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">NextGen ERP</p>
          <h1 className="mt-4 text-3xl font-bold text-white">Staff Login</h1>
          <p className="mt-2 text-sm text-zinc-400">Access the Interior & Waterproofing operations dashboard.</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex justify-end -mt-2">
            <Link
              href="/forgot-password"
              className="text-xs text-zinc-500 hover:text-emerald-400 hover:underline transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <p>{errorMessage}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Use your staff credentials to access ERP modules and financial dashboards.
        </p>
      </div>
    </div>
  );
}
