"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Role } from "../../lib/constants";
import { updateUserAction } from "../../modules/users/actions";
import { toast } from "sonner";
import { User, Shield, Loader2, AlertCircle } from "lucide-react";

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sessionUserId: string;
  userToEdit: {
    id: string;
    name: string;
    email: string;
    role: Role;
    isActive: boolean;
  } | null;
}

export function EditUserModal({ isOpen, onClose, onSuccess, sessionUserId, userToEdit }: EditUserModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("VIEWER");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  // Initialize form when user to edit changes
  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name);
      setRole(userToEdit.role);
      setIsActive(userToEdit.isActive);
    }
  }, [userToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;

    if (!name.trim()) {
      toast.error("User name is required.");
      return;
    }

    try {
      setLoading(true);
      await updateUserAction(userToEdit.id, {
        name,
        role,
        isActive,
      });

      toast.success("Staff profile and permissions successfully updated.");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user account.");
    } finally {
      setLoading(false);
    }
  };

  if (!userToEdit) return null;

  const isEditingSelf = sessionUserId === userToEdit.id;

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Manage Access Controls
          </DialogTitle>
          <p className="text-xs text-zinc-400 mt-1">
            Configure authorization bounds and status settings for <span className="font-mono text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-900 px-1 py-0.5 rounded text-zinc-600 dark:text-zinc-400">{userToEdit.email}</span>
          </p>
        </DialogHeader>

        {isEditingSelf && (
          <div className="flex gap-2.5 p-3.5 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-400 text-xs leading-relaxed font-medium">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-500 mt-0.5" />
            <div>
              <span className="font-bold">Self-Editing Mode:</span> Security protections prevent you from deactivating your own account or altering your own role from this panel.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-name" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
              Full Name *
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400" />
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

          {/* Security Role Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-role" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
              Security Role
            </Label>
            <div className="relative">
              <Shield className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400 pointer-events-none" />
              <select
                id="edit-role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className={`w-full pl-10 pr-4 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none ${
                  isEditingSelf ? "opacity-60 cursor-not-allowed" : ""
                }`}
                disabled={loading || isEditingSelf}
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

          {/* Account Status Switch */}
          <div className={`flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-900 rounded-xl pt-2 pb-2 ${
            isEditingSelf ? "opacity-60 cursor-not-allowed" : ""
          }`}>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Account Authorization</span>
              <span className="text-[10px] text-zinc-400 font-semibold">Enable or revoke personnel access</span>
            </div>
            <button
              type="button"
              onClick={() => !isEditingSelf && setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isActive ? "bg-emerald-500" : "bg-zinc-250 dark:bg-zinc-800"
              } ${isEditingSelf ? "cursor-not-allowed" : ""}`}
              disabled={loading || isEditingSelf}
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
