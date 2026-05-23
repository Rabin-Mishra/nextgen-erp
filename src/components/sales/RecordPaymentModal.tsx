"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNPR } from "@/lib/utils";
import { recordSalePayment } from "@/modules/sales/actions";
import { recordSalePaymentSchema } from "@/modules/sales/types";
import { toast } from "sonner";

interface RecordPaymentModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  invoiceId?: string;
  invoiceNumber?: string;
  total?: number;
  paidAmount?: number;
  balance?: number;
}

export function RecordPaymentModal({
  open: openProp,
  onOpenChange,
  invoiceId,
  invoiceNumber = "",
  total = 0,
  paidAmount = 0,
  balance = 0,
}: RecordPaymentModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [amount, setAmount] = useState(balance);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const open = openProp ?? internalOpen;
  const setOpen = (value: boolean) => {
    onOpenChange?.(value);
    if (openProp === undefined) setInternalOpen(value);
  };

  const handleSubmit = () => {
    setError("");
    if (!invoiceId) {
      setError("Invoice is required.");
      toast.error("Invoice selection is missing.");
      return;
    }
    if (amount <= 0 || amount > balance) {
      setError("Payment amount must be greater than zero and within the balance due.");
      toast.error("Amount must be between 0 and outstanding balance.");
      return;
    }

    const payload = {
      invoiceId,
      amount: Number(amount),
      paymentMethod: paymentMethod as any,
      paymentDate,
      notes: notes || undefined,
    };

    const parsed = recordSalePaymentSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const errorMsg = Object.entries(fieldErrors)
        .map(([field, errs]) => `${field}: ${errs?.join(", ")}`)
        .join(" | ") || "Form validation failed.";
      setError(errorMsg);
      toast.error(`Validation Failed: ${errorMsg}`);
      return;
    }

    startTransition(async () => {
      try {
        await recordSalePayment(parsed.data);
        toast.success(`Payment of ${formatNPR(Number(parsed.data.amount))} recorded successfully!`);
        setOpen(false);
        router.refresh();
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Could not record payment.";
        setError(errMsg);
        toast.error(`Error: ${errMsg}`);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment - {invoiceNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-zinc-50 p-4 text-sm dark:bg-zinc-900">
            <div className="flex justify-between"><span>Total</span><strong>{formatNPR(total)}</strong></div>
            <div className="flex justify-between"><span>Paid</span><span>{formatNPR(paidAmount)}</span></div>
            <div className="mt-2 flex justify-between border-t pt-2"><span>Balance</span><strong className="text-amber-600">{formatNPR(balance)}</strong></div>
          </div>
          <div>
            <label className="text-sm font-medium">Amount</label>
            <Input type="number" value={amount} max={balance} onChange={(event) => setAmount(Number(event.target.value))} />
          </div>
          <div>
            <label className="text-sm font-medium">Payment Method</label>
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm">
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="ESEWA">eSewa</option>
              <option value="KHALTI">Khalti</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Date</label>
            <Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Notes</label>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>{isPending ? "Saving..." : "Record Payment"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
