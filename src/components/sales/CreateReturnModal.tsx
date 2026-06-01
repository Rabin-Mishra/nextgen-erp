"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNPR } from "@/lib/utils";
import type { SalesInvoiceSchema } from "@/modules/sales/types";
import { createSalesReturn } from "@/modules/sales/actions";
import { toast } from "sonner";
import { ShieldAlert, ArrowLeftRight, CheckCircle } from "lucide-react";

interface CreateReturnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: SalesInvoiceSchema | null;
}

export function CreateReturnModal({ open, onOpenChange, invoice }: CreateReturnModalProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<any>("CASH");
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!invoice) return null;

  const invoiceVatPercent = invoice.vatPercent ? parseFloat(invoice.vatPercent) : 0;
  const hasVat = invoiceVatPercent > 0;

  let totalRefundSubtotal = 0;
  invoice.items.forEach((item) => {
    const currentQty = returnQtys[item.id] || 0;
    const itemRefund = currentQty * parseFloat(item.unitPrice) * (1 - parseFloat(item.discountPercent) / 100);
    totalRefundSubtotal += itemRefund;
  });

  const vatAmount = hasVat ? totalRefundSubtotal * (invoiceVatPercent / 100) : 0;
  const totalCredit = totalRefundSubtotal + vatAmount;

  const handleQtyChange = (itemId: string, val: number) => {
    setReturnQtys((prev) => ({
      ...prev,
      [itemId]: val,
    }));
  };

  const handleSubmit = () => {
    setError("");
    if (!reason.trim()) {
      setError("Please specify a reason for this return.");
      return;
    }

    const itemsToReturn = Object.entries(returnQtys)
      .map(([invoiceItemId, qty]) => ({ invoiceItemId, qty }))
      .filter((itm) => itm.qty > 0);

    if (itemsToReturn.length === 0) {
      setError("Please enter a return quantity greater than 0 for at least one item.");
      return;
    }

    // Verify quantities do not exceed original invoice bounds
    for (const rx of itemsToReturn) {
      const originalItem = invoice.items.find((itm) => itm.id === rx.invoiceItemId);
      if (!originalItem) continue;

      if (rx.qty > originalItem.qty) {
        setError(`Cannot return more than purchased quantity (${originalItem.qty}) for ${originalItem.productName}.`);
        return;
      }
    }

    startTransition(async () => {
      try {
        await createSalesReturn({
          invoiceId: invoice.id,
          reason,
          refundMethod,
          items: itemsToReturn,
        });

        toast.success("Sales return recorded successfully! Inventory has been credited back.");
        onOpenChange(false);
        setReason("");
        setRefundMethod("CASH");
        setReturnQtys({});
        router.refresh();
      } catch (err: any) {
        const errMsg = err.message || "Failed to log sales return.";
        setError(errMsg);
        toast.error(`Error: ${errMsg}`);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] max-w-[98vw] h-[95vh] flex flex-col overflow-y-auto bg-white border border-zinc-200 text-zinc-900 rounded-2xl shadow-xl">
        <DialogHeader className="border-b border-zinc-200 pb-3">
          <DialogTitle className="text-xl font-bold text-rose-650 flex items-center gap-2">
            <ArrowLeftRight size={20} className="text-rose-500" /> Create Sales Return — Invoice: <span className="font-mono text-zinc-500">{invoice.invoiceNumber}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 mt-0.5">
            Log returned products from the original construction or retail invoice. Re-credit inventory stock and record cash/bank customer refund payments instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow space-y-5 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-xl border border-zinc-200 bg-zinc-50/60 shadow-sm">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-500 tracking-wider uppercase block">Reason for Return *</Label>
              <Input
                placeholder="e.g. Defective waterproofing compound, excess tiles, client specification mismatch..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-10 bg-white border-zinc-300 text-zinc-900 focus:border-rose-500 focus:ring-rose-500/20 shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-500 tracking-wider uppercase block">Refund Issuance Method *</Label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value)}
                className="w-full h-10 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 shadow-sm"
              >
                <option value="CASH">CASH REFUND</option>
                <option value="BANK">BANK / DIRECT TRANSFER</option>
                <option value="CHEQUE">CHEQUE DISBURSEMENT</option>
                <option value="ESEWA">eSEWA TRANSFER</option>
                <option value="KHALTI">KHALTI WALLET</option>
              </select>
            </div>
          </div>

          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mt-4">Invoice Line Items</h4>
          <div className="border border-zinc-200 rounded-xl divide-y divide-zinc-250 overflow-hidden bg-zinc-50/20 shadow-sm">
            {invoice.items.map((item) => {
              const currentQty = returnQtys[item.id] || 0;
              const refundValue = currentQty * parseFloat(item.unitPrice) * (1 - parseFloat(item.discountPercent) / 100);

              return (
                <div key={item.id} className="p-4 grid grid-cols-12 gap-4 items-center bg-white hover:bg-zinc-50/30">
                  <div className="col-span-12 sm:col-span-4">
                    <p className="font-semibold text-zinc-900">{item.productName}</p>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      {item.productCode} • Rate: {formatNPR(parseFloat(item.unitPrice))}
                    </p>
                  </div>

                  <div className="col-span-12 sm:col-span-8 grid grid-cols-3 gap-3 items-end">
                    <div className="text-center bg-zinc-50/50 py-1.5 rounded border border-zinc-200 shadow-sm">
                      <span className="text-[9px] text-zinc-500 uppercase font-semibold block">Purchased</span>
                      <p className="text-xs font-bold text-zinc-800">{item.qty} {item.productUnit}</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-500 uppercase font-semibold block">Return Qty</label>
                      <Input
                        type="number"
                        min={0}
                        max={item.qty}
                        value={currentQty === 0 ? "" : currentQty}
                        onChange={(e) => handleQtyChange(item.id, Math.min(item.qty, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="h-8 text-xs bg-white border-zinc-300 text-zinc-900 text-center shadow-sm focus:border-rose-500"
                      />
                    </div>

                    <div className="text-center bg-rose-50/40 py-1.5 rounded border border-rose-100 shadow-sm">
                      <span className="text-[9px] text-rose-600 uppercase font-semibold block">Refund (NPR)</span>
                      <p className="text-xs font-bold text-rose-600">{formatNPR(refundValue)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Panel */}
          {totalRefundSubtotal > 0 && (
            <div className="mt-4 p-4 rounded-xl border border-rose-100 bg-rose-50/10 space-y-2 max-w-md ml-auto">
              <div className="flex justify-between text-sm text-zinc-650">
                <span>Subtotal:</span>
                <span className="font-semibold text-zinc-900">{formatNPR(totalRefundSubtotal)}</span>
              </div>
              {hasVat && (
                <div className="flex justify-between text-sm text-zinc-650">
                  <span>VAT ({invoiceVatPercent}%):</span>
                  <span className="font-semibold text-zinc-900">{formatNPR(vatAmount)}</span>
                </div>
              )}
              <div className="border-t border-rose-150 pt-2 flex justify-between text-base font-bold text-rose-700">
                <span>Total Credit Note Value:</span>
                <span>{formatNPR(totalCredit)}</span>
              </div>
            </div>
          )}

          {error && <p className="text-sm font-semibold text-rose-650 mt-2">{error}</p>}
        </div>

        <DialogFooter className="border-t border-zinc-200 pt-4 flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 shadow-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-md border-none"
          >
            {isPending ? "Reconciling..." : "Confirm Return Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateReturnModal;
