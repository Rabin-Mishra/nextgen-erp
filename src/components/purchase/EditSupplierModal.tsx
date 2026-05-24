"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { updateSupplier } from "@/modules/purchase/actions";
import { Award, Shield, PhoneCall, Info, Loader2 } from "lucide-react";

interface EditSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier: {
    id: string;
    code: string;
    name: string;
    contactPerson: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    panNumber: string | null;
    openingBalance: string;
    notes: string | null;
    isActive: boolean;
  };
  userId: string;
}

export function EditSupplierModal({ isOpen, onClose, onSuccess, supplier, userId }: EditSupplierModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (supplier && isOpen) {
      setName(supplier.name);
      setCode(supplier.code || "");
      setContactPerson(supplier.contactPerson || "");
      setPhone(supplier.phone || "");
      setEmail(supplier.email || "");
      setAddress(supplier.address || "");
      setPanNumber(supplier.panNumber || "");
      setOpeningBalance(supplier.openingBalance);
      setNotes(supplier.notes || "");
      setIsActive(supplier.isActive);
    }
  }, [supplier, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Supplier/Vendor name is required");
      return;
    }

    setLoading(true);
    try {
      await updateSupplier(supplier.id, {
        name,
        code: code || undefined,
        contactPerson: contactPerson || undefined,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        panNumber: panNumber || undefined,
        openingBalance: parseFloat(openingBalance) || 0,
        notes: notes || undefined,
        isActive,
      }, userId);

      toast.success("Supplier/Vendor details updated successfully!");
      onSuccess();
      onClose();
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update supplier");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="w-[98vw] max-w-[98vw] h-[95vh] flex flex-col overflow-y-auto rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Edit Supplier / Vendor Account - {code}
          </DialogTitle>
          <p className="text-xs text-zinc-400 mt-1">
            Update manufacturer profile details, opening accounts, and status.
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-4 flex-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b pb-1 flex items-center gap-1.5">
            <Shield className="h-4 w-4" />
            Supplier Identity Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1">Supplier / Vendor Name *</label>
              <Input placeholder="e.g. Neupane Stores" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1">Supplier Code</label>
              <Input placeholder="e.g. SUP-102" value={code} onChange={(e) => setCode(e.target.value)} disabled={loading} />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1">PAN Number / Tax ID</label>
              <Input placeholder="9-digit PAN Number" value={panNumber} onChange={(e) => setPanNumber(e.target.value)} disabled={loading} />
            </div>
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b pb-1 pt-2 flex items-center gap-1.5">
            <PhoneCall className="h-4 w-4" />
            Contact & Location Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1">Primary Contact Person</label>
              <Input placeholder="e.g. Rabin Neupane" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} disabled={loading} />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1">Primary Phone Number</label>
              <Input placeholder="98XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1">Email Address</label>
              <Input type="email" placeholder="vendor@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1">Supplier Address / Depot</label>
              <Input placeholder="e.g. Gauradaha-02, Jhapa" value={address} onChange={(e) => setAddress(e.target.value)} disabled={loading} />
            </div>
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b pb-1 pt-2 flex items-center gap-1.5">
            <Info className="h-4 w-4" />
            Accounting Context & Status
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1">Opening Credit Balance Owed (AP) (NPR) *</label>
              <Input type="number" min={0} value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} disabled={loading} />
              <p className="text-[10px] text-zinc-500 mt-1">Initial credit payable balance before ERP recording.</p>
            </div>

            {/* Status Switch */}
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-900 rounded-2xl">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Account Active Status</span>
                <span className="text-[10px] text-zinc-400 font-semibold">Allow supplier purchase order postings</span>
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
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1">General Audit Notes / Remarks</label>
            <Input placeholder="Supply categories, discount terms, wholesale contract details..." value={notes} onChange={(e) => setNotes(e.target.value)} disabled={loading} />
          </div>
        </div>

        <DialogFooter className="mt-6 border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading} className="h-10 px-4 rounded-xl font-bold">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} className="h-10 px-5 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditSupplierModal;
