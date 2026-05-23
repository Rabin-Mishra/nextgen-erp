"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createSupplier } from "@/modules/purchase/actions";

interface AddSupplierModalProps {
  userId: string;
  trigger?: React.ReactNode;
}

export function AddSupplierModal({ userId, trigger }: AddSupplierModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Supplier/Vendor name is required");
      return;
    }

    setLoading(true);
    try {
      await createSupplier({
        name,
        code: code || undefined,
        contactPerson: contactPerson || undefined,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        panNumber: panNumber || undefined,
        openingBalance: parseFloat(openingBalance) || 0,
        notes: notes || undefined,
        isActive: true,
      }, userId);

      toast.success("New Vendor account added successfully!");
      setOpen(false);

      // Reset fields
      setName("");
      setCode("");
      setContactPerson("");
      setPhone("");
      setEmail("");
      setAddress("");
      setPanNumber("");
      setOpeningBalance("0");
      setNotes("");

      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to add vendor");
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
        <Button onClick={() => setOpen(true)}>+ Add Supplier / Vendor</Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[98vw] max-w-[98vw] h-[95vh] flex flex-col overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Add New Supplier / Vendor Account
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b pb-1">
              Supplier Identity Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold block mb-1">Supplier / Vendor Name *</label>
                <Input placeholder="e.g. Neupane Stores" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Supplier Code (Auto-generated if empty)</label>
                <Input placeholder="e.g. SUP-102" value={code} onChange={(e) => setCode(e.target.value)} />
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
                <label className="text-xs font-semibold block mb-1">Primary Contact Person</label>
                <Input placeholder="e.g. Rabin Neupane" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Primary Phone Number</label>
                <Input placeholder="98XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Email Address</label>
                <Input type="email" placeholder="vendor@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Supplier Address / Depot</label>
                <Input placeholder="e.g. Gauradaha-02, Jhapa" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>

            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b pb-1 pt-2">
              Accounting Context
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold block mb-1">Opening Credit Balance Owed (AP) (NPR) *</label>
                <Input type="number" min={0} value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
                <p className="text-[10px] text-zinc-500 mt-1">Initial credit payable balance before ERP recording.</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">General Audit Notes / Remarks</label>
              <Input placeholder="Supply categories, discount terms, wholesale contract details..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="mt-4 border-t pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold">
              {loading ? "Adding..." : "Add Vendor Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
