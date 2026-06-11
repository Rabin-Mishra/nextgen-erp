"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addCashBookEntryAction, getAccountingLookups } from "@/modules/accounting/actions";
import { CashEntryType, PartyType, PaymentMode } from "@/generated/prisma/enums";
import { toast } from "sonner";
import { DualDatePicker } from "@/components/shared/DualDatePicker";

interface AddCashEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddCashEntryModal({ open, onOpenChange, onSuccess }: AddCashEntryModalProps) {
  const router = useRouter();
  const [entryDate, setEntryDate] = useState("");
  const [type, setType] = useState<CashEntryType>("RECEIVED");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMode>("CASH");
  
  const [partyType, setPartyType] = useState<PartyType | "">("");
  const [partyId, setPartyId] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const [isPending, startTransition] = useTransition();

  // Lookups data
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  useEffect(() => {
    // Set default date to today
    setEntryDate(new Date().toISOString().slice(0, 10));

    // Load lookups
    const loadLookups = async () => {
      try {
        const lookups = await getAccountingLookups();
        setCustomers(lookups.customers);
        setSuppliers(lookups.suppliers);
      } catch (err) {
        console.error("Failed to load accounting lookups:", err);
      }
    };
    if (open) {
      loadLookups();
      setError("");
      setAmount("");
      setDescription("");
      setPartyType("");
      setPartyId("");
    }
  }, [open]);

  const handleSubmit = () => {
    setError("");
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }

    if (partyType && !partyId) {
      setError(`Please select a specific ${partyType.toLowerCase()} to link.`);
      return;
    }

    const payload = {
      entryDate,
      type,
      amount: parsedAmount,
      description: description || undefined,
      partyType: partyType || undefined,
      partyId: partyId || undefined,
      paymentMethod,
    };

    startTransition(async () => {
      const res = await addCashBookEntryAction(payload);
      if (res.success) {
        toast.success(`Cash transaction logged successfully!`);
        onOpenChange(false);
        if (onSuccess) onSuccess();
        router.refresh();
      } else {
        setError(res.error || "Failed to save cash transaction.");
        toast.error(`Error: ${res.error}`);
      }
    });
  };

  const activeParties = partyType === "CUSTOMER" ? customers : partyType === "SUPPLIER" ? suppliers : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Cash Book Entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Inflow vs Outflow toggle */}
          <div className="grid grid-cols-2 gap-2 border p-1 rounded-lg bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800">
            <Button
              type="button"
              variant={type === "RECEIVED" ? "default" : "ghost"}
              onClick={() => setType("RECEIVED")}
              className={`text-xs h-8 ${type === "RECEIVED" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
            >
              Cash In (Received)
            </Button>
            <Button
              type="button"
              variant={type === "PAID" ? "default" : "ghost"}
              onClick={() => setType("PAID")}
              className={`text-xs h-8 ${type === "PAID" ? "bg-rose-600 hover:bg-rose-700 text-white" : ""}`}
            >
              Cash Out (Paid)
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <DualDatePicker
                label="Transaction Date"
                value={entryDate}
                onChange={(date) => setEntryDate(date.toISOString().split("T")[0])}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Amount (NPR) *</label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={0.01}
                step="any"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1">Payment Mode *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMode)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-zinc-950 dark:border-zinc-800"
              >
                <option value="CASH">Physical Cash</option>
                <option value="BANK">Bank Transfer / T-T</option>
                <option value="CHEQUE">Cheque Deposit</option>
                <option value="ESEWA">eSewa Wallet</option>
                <option value="KHALTI">Khalti Wallet</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Link Party (Optional)</label>
              <select
                value={partyType}
                onChange={(e) => {
                  setPartyType(e.target.value as PartyType | "");
                  setPartyId("");
                }}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-zinc-950 dark:border-zinc-800"
              >
                <option value="">-- No Account Link --</option>
                <option value="CUSTOMER">Customer Ledger</option>
                <option value="SUPPLIER">Supplier Ledger</option>
              </select>
            </div>
          </div>

          {/* Specific customer/supplier list (visible only if partyType is selected) */}
          {partyType && (
            <div className="animate-fade-in">
              <label className="text-xs font-semibold block mb-1">Select Specific {partyType} *</label>
              <select
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-zinc-950 dark:border-zinc-800"
              >
                <option value="">-- Select {partyType} Account --</option>
                {activeParties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.code ? `(${p.code})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold block mb-1">Narration Remarks / Description</label>
            <Input
              placeholder="e.g. Cleared monthly office internet charges, paint retail billing..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && <p className="text-xs font-bold text-red-600 mt-2">{error}</p>}
        </div>

        <DialogFooter className="mt-6 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className={`${
              type === "RECEIVED" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
            } text-white`}
          >
            {isPending ? "Recording..." : "Record Transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
