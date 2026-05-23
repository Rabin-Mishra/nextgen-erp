"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { recordPurchasePayment } from "@/modules/purchase/actions";
import { recordPurchasePaymentSchema } from "@/modules/purchase/types";
import { toast } from "sonner";

interface RecordPaymentModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  total?: number;
  paidAmount?: number;
  poNumber?: string;
  purchaseOrderId: string;
  userId: string;
}

export function RecordPaymentModal({
  open: openProp,
  onOpenChange,
  total = 0,
  paidAmount = 0,
  poNumber = "",
  purchaseOrderId,
  userId,
}: RecordPaymentModalProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const open = openProp !== undefined ? openProp : internalOpen;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setInternalOpen(v);
  };

  const balance = total - paidAmount;

  const handleSubmit = async () => {
    if (amount <= 0) {
      toast.error("Payment amount must be greater than zero");
      return;
    }
    if (amount > balance) {
      toast.error(`Payment amount exceeds remaining balance due (NPR ${balance.toLocaleString("en-IN")})`);
      return;
    }

    const payload = {
      purchaseOrderId,
      amount: Number(amount),
      paymentMethod: paymentMethod as any,
      paymentDate: new Date(date),
      reference: reference || undefined,
      notes: notes || undefined,
    };

    // Client-side Zod validation
    const parsed = recordPurchasePaymentSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const errorMsg = Object.entries(fieldErrors)
        .map(([field, errs]) => `${field}: ${errs?.join(", ")}`)
        .join(" | ") || "Validation failed.";
      toast.error(`Validation Failed: ${errorMsg}`);
      return;
    }

    setLoading(true);
    try {
      await recordPurchasePayment(parsed.data, userId);
      
      toast.success("Payment recorded successfully!");
      setOpen(false);
      setAmount(0);
      setReference("");
      setNotes("");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error("Error: " + (err.message || "Failed to record payment"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment — PO: <span className="font-mono text-zinc-600">{poNumber}</span></DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-lg space-y-2 border">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Total PO Amount:</span>
              <span className="font-semibold">NPR {total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Previously Paid:</span>
              <span>NPR {paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-sm">
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">Balance Due:</span>
              <span className="font-bold text-orange-600">NPR {balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Payment Amount (NPR) *</label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              max={balance}
              min={0}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Payment Method *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-zinc-950"
            >
              <option value="BANK_TRANSFER">Bank Transfer / Cash Management</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CASH">Cash</option>
              <option value="ESEWA">eSewa</option>
              <option value="KHALTI">Khalti</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Payment Date *</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Reference / Cheque #</label>
            <Input placeholder="Transaction reference, receipt, or cheque details..." value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Notes</label>
            <Input placeholder="Internal accounting logs..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="mt-4 border-t pt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
            {loading ? "Recording..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

