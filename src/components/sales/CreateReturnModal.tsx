"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNPR } from "@/lib/utils";
import type { SalesInvoiceSchema } from "@/modules/sales/types";
import { createSalesReturn } from "@/modules/sales/actions";
import { toast } from "sonner";

interface CreateReturnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: SalesInvoiceSchema | null;
}

export function CreateReturnModal({ open, onOpenChange, invoice }: CreateReturnModalProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!invoice) return null;

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
          items: itemsToReturn,
        });

        toast.success("Sales return recorded successfully! Inventory has been credited back.");
        onOpenChange(false);
        setReason("");
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
      <DialogContent className="w-[98vw] max-w-[98vw] h-[95vh] flex flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Sales Return — Invoice: <span className="font-mono text-zinc-500">{invoice.invoiceNumber}</span></DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Return Reason */}
          <div>
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Reason for Return *</label>
            <Input
              placeholder="e.g. Damaged material, wrong items delivered, customer cancelled..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-4">Invoice Line Items</h4>
          <div className="border rounded-lg divide-y bg-zinc-50/20">
            {invoice.items.map((item) => {
              const currentQty = returnQtys[item.id] || 0;
              const refundValue = currentQty * parseFloat(item.unitPrice) * (1 - parseFloat(item.discountPercent) / 100);

              return (
                <div key={item.id} className="p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">{item.productName}</p>
                    <p className="text-xs text-zinc-500 font-mono">
                      {item.productCode} • Rate: {formatNPR(parseFloat(item.unitPrice))}
                    </p>
                  </div>
                  <div className="flex gap-4 items-center text-xs">
                    <div>
                      <span className="text-zinc-500 block mb-0.5">Purchased</span>
                      <p className="font-semibold text-sm text-zinc-900">{item.qty} {item.productUnit}</p>
                    </div>
                    <div className="w-20">
                      <label className="text-zinc-500 block mb-0.5">Return Qty</label>
                      <Input
                        type="number"
                        min={0}
                        max={item.qty}
                        value={currentQty}
                        onChange={(e) => handleQtyChange(item.id, Math.max(0, parseInt(e.target.value) || 0))}
                        className="h-8"
                      />
                    </div>
                    <div className="w-24 text-right">
                      <span className="text-zinc-500 block mb-0.5 font-semibold">Refund Value</span>
                      <p className="font-bold text-sm text-zinc-950 dark:text-zinc-50">
                        {formatNPR(refundValue)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {error && <p className="text-sm font-semibold text-red-600 mt-2">{error}</p>}
        </div>

        <DialogFooter className="mt-4 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
            {isPending ? "Processing..." : "Submit Return"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
