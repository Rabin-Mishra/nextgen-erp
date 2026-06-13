"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Package, AlertTriangle, Loader2 } from "lucide-react";

interface AdjustStockModalProps {
  initialStockId?: string;
  stocks?: any[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AdjustStockModal({
  initialStockId,
  stocks = [],
  open: openProp,
  onOpenChange,
}: AdjustStockModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = typeof openProp === "boolean" ? openProp : internalOpen;
  const setOpen = (v: boolean) => {
    if (typeof openProp === "boolean") {
      onOpenChange?.(v);
    } else {
      setInternalOpen(v);
    }
  };

  const [stockId, setStockId] = useState(initialStockId || "");
  const [adjustment, setAdjustment] = useState<string>("");
  const [newReorderLevel, setNewReorderLevel] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Reset fields when modal state changes
  useEffect(() => {
    if (open) {
      setStockId(initialStockId || "");
      setAdjustment("");
      setNewReorderLevel("");
      setNotes("");
    }
  }, [open, initialStockId]);

  // Find active stock record details
  const activeStock = stocks.find((s) => s.id === stockId);

  // Compute stock levels preview
  const currentQty = activeStock ? Number(activeStock.quantity) : 0;
  const adjNum = parseFloat(adjustment) || 0;
  const previewQty = currentQty + adjNum;

  async function submit() {
    if (!stockId) {
      toast.error("Please select a target product stock record");
      return;
    }
    const hasQtyAdjustment = adjNum !== 0;
    const hasReorderLevelAdjustment = newReorderLevel.trim() !== "";

    if (!hasQtyAdjustment && !hasReorderLevelAdjustment) {
      toast.error("Please specify a stock quantity adjustment or a new reorder level");
      return;
    }
    if (previewQty < 0) {
      toast.error("Adjustment cannot result in negative inventory");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockId,
          adjustment: adjNum,
          newReorderLevel: hasReorderLevelAdjustment ? parseFloat(newReorderLevel) : undefined,
          notes: notes || undefined,
        }),
      });
      
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to submit stock adjustment");
      
      toast.success("Stock details successfully adjusted!");
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to adjust stock details");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!openProp && (
        <DialogTrigger asChild>
          <Button variant="outline" className="h-10 border-primary/20 text-primary hover:bg-primary/5 rounded-xl font-bold flex items-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <ArrowLeftRight size={15} /> Adjust Stock Level
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="w-[96vw] max-w-[500px] bg-white border-zinc-200 text-zinc-800 rounded-2xl shadow-xl flex flex-col p-6">
        <DialogHeader className="pb-3 border-b border-zinc-100">
          <DialogTitle className="text-lg font-extrabold flex items-center gap-2 text-zinc-900">
            <Package className="text-amber-500" size={20} /> Inventory Stock Adjustment
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 mt-1 leading-relaxed">
            Record manual warehouse reconciliations, write-offs, physical count adjustments, or damages. Stock entries update immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 text-sm font-semibold">
          {/* Target Stock Selector */}
          {initialStockId ? (
            /* Read-Only Context Card (Opened from Table Row Action) */
            activeStock && (
              <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4 space-y-1.5 animate-fade-in shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
                <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block">Target Stock Record</span>
                <div className="font-extrabold text-zinc-900 text-sm leading-tight">
                  {activeStock.productCode} • {activeStock.name}
                </div>
                <div className="text-xs font-semibold text-zinc-500 flex items-center gap-3">
                  <span>Warehouse: <strong className="text-zinc-700">{activeStock.warehouse}</strong></span>
                  <span>•</span>
                  <span>Current: <strong className="text-zinc-700">{activeStock.quantity} {activeStock.unit}</strong></span>
                </div>
              </div>
            )
          ) : (
            /* Dropdown Selector (Opened from Generic Top Button) */
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Select Product & Warehouse Stock *</Label>
              <select
                value={stockId}
                onChange={(e) => setStockId(e.target.value)}
                className="w-full h-10 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
              >
                <option value="">-- Choose Stock Record --</option>
                {stocks.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.productCode} • {s.name} ({s.warehouse}) — Qty: {s.quantity}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Adjustment Value Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Adjustment Quantity (+/-)</Label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 50 or -15"
                value={adjustment}
                onChange={(e) => setAdjustment(e.target.value)}
                disabled={!stockId || loading}
                className="h-10 rounded-xl border-zinc-200 text-zinc-900 bg-white font-mono placeholder:text-zinc-400 focus:ring-amber-500/50"
              />
              <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                Positive to add (e.g. `10`), negative to deduct (e.g. `-5`).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">New Reorder Level</Label>
              <Input
                type="number"
                step="any"
                placeholder={activeStock ? `${activeStock.reorderLevel}` : "e.g. 5"}
                value={newReorderLevel}
                onChange={(e) => setNewReorderLevel(e.target.value)}
                disabled={!stockId || loading}
                className="h-10 rounded-xl border-zinc-200 text-zinc-900 bg-white font-mono placeholder:text-zinc-400 focus:ring-amber-500/50"
              />
              <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                Update alert threshold (currently: {activeStock ? `${activeStock.reorderLevel} ${activeStock.unit}` : "N/A"}).
              </p>
            </div>
          </div>

          {/* Real-time Reconciliation Preview */}
          {stockId && adjNum !== 0 && (
            <div className="p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-3 animate-fade-in shadow-[0_1px_3px_rgba(0,0,0,0.01)] bg-zinc-50/50">
              <div className="space-y-1 flex-grow">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Adjustment Preview</span>
                <div className="text-zinc-700 flex items-center gap-1.5 font-semibold">
                  <span>Current: <strong>{currentQty}</strong></span>
                  <span>➔</span>
                  <span>Adjustment: <strong className={adjNum > 0 ? "text-emerald-600" : "text-rose-600"}>{adjNum > 0 ? `+${adjNum}` : adjNum}</strong></span>
                </div>
                <div className="text-sm font-extrabold text-zinc-900">
                  New Available Stock: <span className={previewQty < 0 ? "text-rose-600 font-black" : "text-amber-600 font-black"}>{previewQty}</span> {activeStock?.unit}
                </div>
              </div>
              {previewQty < 0 && (
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 flex items-center justify-center">
                  <AlertTriangle size={18} />
                </div>
              )}
            </div>
          )}

          {/* Audit Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Adjustment Reasoning / Notes *</Label>
            <textarea
              placeholder="e.g. Reconciled physical stock check deviation / damage write-off..."
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              disabled={!stockId || loading}
              rows={2}
              className="w-full rounded-xl border border-zinc-200 text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 p-2.5 leading-relaxed font-semibold resize-none text-sm"
            />
          </div>
        </div>

        <DialogFooter className="mt-2 border-t border-zinc-100 pt-4 flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 h-10 rounded-xl font-bold px-4"
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!stockId || (adjNum === 0 && newReorderLevel.trim() === "") || previewQty < 0 || loading}
            className="bg-primary text-primary-foreground hover:bg-primary/95 font-bold h-10 rounded-xl px-5 flex items-center gap-1.5 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={15} /> Applying...
              </>
            ) : (
              "Apply Adjustment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AdjustStockModal;
