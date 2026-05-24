"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { updateCustomer } from "@/modules/sales/actions";
import { User, Shield, Info, MapPin, PhoneCall, Loader2 } from "lucide-react";

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customer: {
    id: string;
    code: string;
    name: string;
    contactPerson: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    customerType: "RETAIL" | "WHOLESALE" | "PROJECT";
    creditLimit: string;
    openingBalance: string;
    notes: string | null;
    isActive: boolean;
  };
}

export function EditCustomerModal({ isOpen, onClose, onSuccess, customer }: EditCustomerModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [customerType, setCustomerType] = useState<"RETAIL" | "WHOLESALE" | "PROJECT">("RETAIL");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [creditLimit, setCreditLimit] = useState("100000");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (customer && isOpen) {
      setName(customer.name);
      setCode(customer.code || "");
      setCustomerType(customer.customerType);
      setContactPerson(customer.contactPerson || "");
      setPhone(customer.phone || "");
      setEmail(customer.email || "");
      setAddress(customer.address || "");
      // Wait, let's see. If the customer object passed has a panNumber, or we can fetch it, let's see.
      // CustomerData passed from CustomerListTable has fields: id, code, name, phone, email, address, customerType, creditLimit, balance, isActive.
      // Wait, does the customer object have a panNumber, openingBalance, notes, contactPerson?
      // Yes! We will update CustomerListTable's CustomerData interface to include all these fields so they are perfectly passed down!
      setPanNumber((customer as any).panNumber || "");
      setCreditLimit(customer.creditLimit);
      setOpeningBalance(customer.openingBalance);
      setNotes(customer.notes || "");
      setIsActive(customer.isActive);
    }
  }, [customer, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    setLoading(true);
    try {
      await updateCustomer(customer.id, {
        name,
        code: code || undefined,
        customerType,
        contactPerson: contactPerson || undefined,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        panNumber: panNumber || undefined,
        creditLimit: parseFloat(creditLimit) || 0,
        openingBalance: parseFloat(openingBalance) || 0,
        notes: notes || undefined,
        isActive,
      });

      toast.success("Customer details updated successfully!");
      onSuccess();
      onClose();
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="w-[98vw] max-w-[98vw] h-[95vh] flex flex-col overflow-y-auto rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Edit Customer Account - {code}
          </DialogTitle>
          <p className="text-xs text-zinc-400 mt-1">
            Update customer profile details, credit context, and deactivation toggles.
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-4 flex-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b pb-1 flex items-center gap-1.5">
            <Shield className="h-4 w-4" />
            General Identity Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1">Customer / Client Name *</label>
              <Input placeholder="e.g. Sabin Mishra" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1">Customer Code</label>
              <Input placeholder="e.g. CUS-102" value={code} onChange={(e) => setCode(e.target.value)} disabled={loading} />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1">Customer Segment / Type *</label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as any)}
                className="w-full h-10 border rounded-xl px-3 text-sm bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-primary/20 border-zinc-200 dark:border-zinc-800"
                disabled={loading}
              >
                <option value="RETAIL">Retail Customer</option>
                <option value="WHOLESALE">Wholesale Client</option>
                <option value="PROJECT">Project Site Client</option>
              </select>
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
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1">Contact Person Name</label>
              <Input placeholder="e.g. Sabin Sharma" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} disabled={loading} />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1">Primary Phone Number</label>
              <Input placeholder="98XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1">Email Address</label>
              <Input type="email" placeholder="client@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1">Billing Location Address</label>
              <Input placeholder="e.g. Gauradaha-02, Jhapa" value={address} onChange={(e) => setAddress(e.target.value)} disabled={loading} />
            </div>
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b pb-1 pt-2 flex items-center gap-1.5">
            <Info className="h-4 w-4" />
            Accounting Context & Status
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1">Credit limit Allowed (NPR) *</label>
              <Input type="number" min={0} value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} disabled={loading} />
              <p className="text-[10px] text-zinc-500 mt-1">Maximum allowed credit balance for WHOLESALE / PROJECT.</p>
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1">Opening Debit Balance (NPR) *</label>
              <Input type="number" min={0} value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} disabled={loading} />
              <p className="text-[10px] text-zinc-500 mt-1">Initial receivable balance before ERP recording.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1">General Audit Notes / Remarks</label>
              <Input placeholder="Terms of credit, client rating, project history..." value={notes} onChange={(e) => setNotes(e.target.value)} disabled={loading} />
            </div>

            {/* Account Authorization Switch Status */}
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-900 rounded-2xl">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Account Active Status</span>
                <span className="text-[10px] text-zinc-400 font-semibold">Allow customer transactional postings</span>
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

export default EditCustomerModal;
