"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Role } from "../../lib/constants";
import { createUserAction } from "../../modules/users/actions";
import { toast } from "sonner";
import { Lock, Mail, User, Shield, Eye, EyeOff, Loader2, Phone } from "lucide-react";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("VIEWER");
  const [isActive, setIsActive] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password strength state
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState("Too short");

  // Validate password on change
  useEffect(() => {
    let score = 0;
    if (password.length === 0) {
      setPasswordStrength(0);
      setPasswordFeedback("");
      return;
    }

    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    setPasswordStrength(score);

    switch (score) {
      case 1:
        setPasswordFeedback("Weak (Include uppercase/numbers/symbols)");
        break;
      case 2:
        setPasswordFeedback("Fair (Include numbers/symbols)");
        break;
      case 3:
        setPasswordFeedback("Good (Include special symbols)");
        break;
      case 4:
        setPasswordFeedback("Strong (Highly secure)");
        break;
      case 5:
        setPasswordFeedback("Excellent (Flawless password)");
        break;
      default:
        setPasswordFeedback("Too short (Min 8 characters)");
        break;
    }
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (phone && !/^9\d{9}$/.test(phone.replace(/[\s\-]/g, ""))) {
      toast.error("Phone number must be 10 digits starting with 9 (Nepal mobile format).");
      return;
    }

    if (password && password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    try {
      setLoading(true);
      await createUserAction({
        name,
        email,
        phone: phone.replace(/[\s\-]/g, "") || undefined,
        password: password || undefined,
        role,
        isActive,
      });

      toast.success("Staff member account successfully created and welcome logs dispatched.");
      onSuccess();
      handleClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create user account.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setRole("VIEWER");
    setIsActive(true);
    setShowPassword(false);
    onClose();
  };

  // Get strength meter styling
  const getStrengthColor = () => {
    switch (passwordStrength) {
      case 1:
        return "bg-rose-500";
      case 2:
        return "bg-amber-500";
      case 3:
        return "bg-yellow-500";
      case 4:
        return "bg-teal-500";
      case 5:
        return "bg-emerald-500";
      default:
        return "bg-zinc-200 dark:bg-zinc-800";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Invite Staff Member
          </DialogTitle>
          <p className="text-xs text-zinc-400 mt-1">
            Provision authorized credentials to access operations console.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
              Full Name *
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400" />
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nischal Timsina"
                className="pl-10 h-10 rounded-xl border-zinc-200 dark:border-zinc-800"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
              Email Address *
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@nextgen.com"
                className="pl-10 h-10 rounded-xl border-zinc-200 dark:border-zinc-800"
                required
                disabled={loading}
              />
            </div>
            <p className="text-[10px] text-zinc-400 font-medium">This email will be used for password recovery</p>
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
              Phone Number
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400" />
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98XXXXXXXX"
                className="pl-10 h-10 rounded-xl border-zinc-200 dark:border-zinc-800"
                disabled={loading}
              />
            </div>
            <p className="text-[10px] text-zinc-400 font-medium">Optional. Nepal mobile: 10 digits starting with 9</p>
          </div>

          {/* Security Role Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="role" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
              Security Role
            </Label>
            <div className="relative">
              <Shield className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400 pointer-events-none" />
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full pl-10 pr-4 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                disabled={loading}
              >
                <option value="VIEWER">Viewer / Read-Only</option>
                <option value="PURCHASE_STAFF">Purchase Staff</option>
                <option value="SALES_STAFF">Sales Staff</option>
                <option value="MANAGER">Manager</option>
                <option value="OWNER">Business Owner</option>
                <option value="SUPERADMIN">Super Admin</option>
              </select>
            </div>
          </div>

          {/* Password (Temporary) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="password" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                Security Password (Temporary)
              </Label>
              <span className="text-[10px] text-zinc-400 font-medium">Default: Temp@123</span>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10 pr-10 h-10 rounded-xl border-zinc-200 dark:border-zinc-800"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <div className="space-y-1.5 pt-1.5 animate-fade-in">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-zinc-500">Security Strength:</span>
                  <span
                    className={
                      passwordStrength <= 2
                        ? "text-rose-500"
                        : passwordStrength === 3
                        ? "text-amber-500"
                        : "text-emerald-500"
                    }
                  >
                    {passwordFeedback}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 h-1.5 w-full bg-zinc-150 dark:bg-zinc-900 rounded-full overflow-hidden">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={`strength-bar-${i}`}
                      className={`h-full rounded-full transition-all duration-300 ${
                        i < passwordStrength ? getStrengthColor() : "bg-transparent"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Account Status Switch */}
          <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-900 rounded-xl pt-2 pb-2">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Account Authorization</span>
              <span className="text-[10px] text-zinc-400 font-semibold">Allow staff to sign in immediately</span>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isActive ? "bg-emerald-500" : "bg-zinc-250 dark:bg-zinc-800"
              }`}
              disabled={loading}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <DialogFooter className="pt-4 border-t border-zinc-100 dark:border-zinc-900">
            <div className="flex items-center gap-2 justify-end w-full">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="h-10 px-4 rounded-xl text-zinc-600 font-bold border-zinc-200 dark:border-zinc-800"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-primary/20"
                disabled={loading || (password.length > 0 && password.length < 8)}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Invite Member
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export default AddUserModal;
