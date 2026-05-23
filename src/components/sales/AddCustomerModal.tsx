"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createCustomer } from "@/modules/sales/actions";

interface AddCustomerModalProps {
  userId?: string;
  trigger?: React.ReactNode;
}

export function AddCustomerModal({ userId, trigger }: AddCustomerModalProps) {
  const [open, setOpen] = useState(false);
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
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    setLoading(true);
    try {
      await createCustomer({
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
        isActive: true,
      }, userId);

      toast.success("New Customer account added successfully!");
      setOpen(false);

      // Reset fields
      setName("");
      setCode("");
      setCustomerType("RETAIL");
      setContactPerson("");
      setPhone("");
      setEmail("");
      setAddress("");
      setPanNumber("");
      setCreditLimit("100000");
      setOpeningBalance("0");
      setNotes("");

      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to add customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">
          {trigger}
        </div>
      ) : (
        <Button onClick={() => setOpen(true)}>+ Add Customer</Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[98vw] max-w-[98vw] h-[95vh] flex flex-col overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Add New Customer Account
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b pb-1">
              General Identity Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold block mb-1">Customer / Client Name *</label>
                <Input placeholder="e.g. Sabin Mishra" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Customer Code (Auto-generated if empty)</label>
                <Input placeholder="e.g. CUS-102" value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Customer Segment / Type *</label>
                <select
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value as any)}
                  className="w-full h-10 border rounded-md px-3 text-sm bg-white dark:bg-zinc-950"
                >
                  <option value="RETAIL">Retail Customer</option>
                  <option value="WHOLESALE">Wholesale Client</option>
                  <option value="PROJECT">Project Site Client</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">PAN Number / Tax ID</label>
                <Input placeholder="9-digit PAN Number" value={panNumber} onChange={(e) => setPanNumber(e.target.value)} />
              </div>
            </div>

            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b pb-1 pt-2">
              Contact & Location Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold block mb-1">Contact Person Name</label>
                <Input placeholder="e.g. Sabin Sharma" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Primary Phone Number</label>
                <Input placeholder="98XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Email Address</label>
                <Input type="email" placeholder="client@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Billing Location Address</label>
                <Input placeholder="e.g. Gauradaha-02, Jhapa" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>

            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b pb-1 pt-2">
              Accounting Context
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold block mb-1">Credit limit Allowed (NPR) *</label>
                <Input type="number" min={0} value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
                <p className="text-[10px] text-zinc-500 mt-1">Maximum allowed credit balance for WHOLESALE / PROJECT.</p>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Opening Debit Balance (NPR) *</label>
                <Input type="number" min={0} value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
                <p className="text-[10px] text-zinc-500 mt-1">Initial receivable balance before ERP recording.</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">General Audit Notes / Remarks</label>
              <Input placeholder="Terms of credit, client rating, project history..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="mt-4 border-t pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold">
              {loading ? "Adding..." : "Add Customer Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
