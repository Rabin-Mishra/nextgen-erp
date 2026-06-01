"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PurchaseOrderItemSchema } from "@/modules/purchase/types";
import { receiveGoodsSchema } from "@/modules/purchase/types";
import { receiveGoods } from "@/modules/purchase/actions";
import { toast } from "sonner";
import { Package } from "lucide-react";
import { formatNPR } from "@/lib/utils";

interface ReceiveGoodsModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  poItems?: PurchaseOrderItemSchema[];
  poNumber?: string;
  purchaseOrderId: string;
  userId: string;
}

export function ReceiveGoodsModal({
  open: openProp,
  onOpenChange,
  poItems = [],
  poNumber = "",
  purchaseOrderId,
  userId,
}: ReceiveGoodsModalProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [receiving, setReceiving] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [applyVat, setApplyVat] = useState(false);

  const open = openProp !== undefined ? openProp : internalOpen;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setInternalOpen(v);
  };

  // Fetch active warehouses from lookups API
  useEffect(() => {
    if (open) {
      (async () => {
        try {
          const res = await fetch("/api/inventory/lookups");
          if (res.ok) {
            const j = await res.json();
            setWarehouses(j.warehouses || []);
            if (j.warehouses?.[0]?.id) {
              setWarehouseId(j.warehouses[0].id);
            }
          }
        } catch (err) {
          console.error("Failed to load warehouses", err);
        }
      })();
    }
  }, [open]);

  // Set default prices from products if they exist
  useEffect(() => {
    if (open && poItems.length > 0) {
      const defaultPrices: Record<string, number> = {};
      const defaultReceiving: Record<string, number> = {};
      poItems.forEach(item => {
        // Try parsing purchase price variant or keep 0
        defaultPrices[item.id] = parseFloat(item.unitPrice) || 0;
        defaultReceiving[item.id] = item.orderedQty - item.receivedQty;
      });
      setPrices(defaultPrices);
      setReceiving(defaultReceiving);
      setApplyVat(false);
    }
  }, [open, poItems]);

  const handleReceive = (itemId: string, qty: number) => {
    setReceiving((prev) => ({ ...prev, [itemId]: qty }));
  };

  const handlePrice = (itemId: string, price: number) => {
    setPrices((prev) => ({ ...prev, [itemId]: price }));
  };

  const subtotal = Object.entries(receiving).reduce((sum, [itemId, qty]) => {
    const price = prices[itemId] ?? 0;
    return sum + (qty * price);
  }, 0);
  const vatAmount = applyVat ? subtotal * 0.13 : 0;
  const totalPayable = subtotal + vatAmount;

  const handleSubmit = async () => {
    if (!warehouseId) {
      toast.error("Please select a warehouse");
      return;
    }

    const itemsToReceive = Object.entries(receiving)
      .map(([poItemId, receivedQty]) => ({
        poItemId,
        receivedQty,
        receivedPrice: prices[poItemId] ?? 0
      }))
      .filter((item) => item.receivedQty > 0);

    if (itemsToReceive.length === 0) {
      toast.error("Please enter receiving quantities for at least one item");
      return;
    }

    // Validate quantities and prices
    for (const rx of itemsToReceive) {
      const item = poItems.find((itm) => itm.id === rx.poItemId);
      if (!item) continue;
      const maxReceivable = item.orderedQty - item.receivedQty;
      if (rx.receivedQty > maxReceivable) {
        toast.error(`Cannot receive more than ${maxReceivable} units for ${item.productName}`);
        return;
      }
      if (rx.receivedPrice <= 0) {
        toast.error(`Please enter a valid cost price for ${item.productName}`);
        return;
      }
    }

    const payload = {
      purchaseOrderId,
      items: itemsToReceive,
      warehouseId,
      notes: notes || undefined,
      applyVat,
    };

    // Client-side Zod validation
    const parsed = receiveGoodsSchema.safeParse(payload);
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
      await receiveGoods(parsed.data, userId);

      toast.success("Goods received successfully! Cost prices saved and stock updated.");
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error("Error: " + (err.message || "Failed to receive goods"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[98vw] max-w-[98vw] h-[95vh] flex flex-col overflow-hidden bg-white border-zinc-200 text-zinc-800">
        <DialogHeader className="border-b border-zinc-200 pb-3">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-zinc-900">
            <Package size={20} className="text-amber-500" /> Receive Goods — PO: <span className="font-mono text-zinc-500">{poNumber}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 mt-0.5">
            Log receiving materials from this purchase order. Define destination warehouse, actual quantity received, and cost prices. Financial ledger balances will post automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto py-4 space-y-4 pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-zinc-200 bg-zinc-50">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-500 tracking-wider uppercase block">Destination Warehouse *</Label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full h-10 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="">-- Select Warehouse --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-500 tracking-wider uppercase block">Receiving Notes</Label>
              <Input
                placeholder="e.g. Challan #, delivery van details, loading inspector..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-10 bg-white border-zinc-200 text-zinc-900"
              />
            </div>
          </div>

          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mt-4">Order Items to Reconcile</h4>
          {poItems.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-zinc-200 rounded-lg bg-zinc-50">
              <p className="text-sm text-zinc-500 italic">No items associated with this Purchase Order.</p>
            </div>
          ) : (
            <div className="border border-zinc-200 rounded-xl divide-y divide-zinc-200 overflow-hidden bg-zinc-50/20">
              {poItems.map((item) => {
                const remaining = item.orderedQty - item.receivedQty;
                const receiveQtyValue = receiving[item.id] ?? 0;
                const priceValue = prices[item.id] ?? 0;

                return (
                  <div key={item.id} className="p-4 grid grid-cols-12 gap-4 items-center hover:bg-zinc-50">
                    <div className="col-span-12 sm:col-span-4">
                      <p className="font-semibold text-zinc-800">{item.productName}</p>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{item.productCode}</p>
                    </div>

                    <div className="col-span-12 sm:col-span-8 grid grid-cols-4 gap-3 items-end">
                      <div className="text-center bg-zinc-100/50 py-1.5 rounded border border-zinc-200">
                        <span className="text-[9px] text-zinc-500 uppercase font-semibold block">Demand</span>
                        <p className="text-xs font-bold text-zinc-700">{item.orderedQty} {item.productUnit}</p>
                      </div>

                      <div className="text-center bg-zinc-100/50 py-1.5 rounded border border-zinc-200">
                        <span className="text-[9px] text-zinc-500 uppercase font-semibold block">Received</span>
                        <p className="text-xs font-bold text-emerald-600">{item.receivedQty} {item.productUnit}</p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 uppercase font-semibold block">Receiving Now</label>
                        <Input
                          type="number"
                          max={remaining}
                          min={0}
                          value={receiveQtyValue}
                          onChange={(e) => handleReceive(item.id, Math.min(remaining, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="h-8 text-xs bg-white border-zinc-200 text-zinc-900 text-center"
                          disabled={remaining <= 0}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 uppercase font-semibold block">Cost Price (NPR) *</label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={priceValue === 0 ? "" : priceValue}
                          onChange={(e) => handlePrice(item.id, Math.max(0, parseFloat(e.target.value) || 0))}
                          className="h-8 text-xs bg-white border-zinc-200 text-zinc-900 text-center font-mono"
                          disabled={remaining <= 0}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {poItems.length > 0 && (
            <div className="space-y-4 mt-6">
              <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyVat}
                  onChange={(e) => setApplyVat(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-500"
                />
                Apply Nepal VAT 13% on this receipt
              </label>

              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2 max-w-md ml-auto text-right">
                {applyVat ? (
                  <>
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>Subtotal:</span>
                      <span className="font-semibold text-zinc-800">{formatNPR(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>VAT (13%):</span>
                      <span className="font-semibold text-zinc-800">{formatNPR(vatAmount)}</span>
                    </div>
                    <div className="border-t border-zinc-200 pt-2 flex justify-between text-sm font-bold text-zinc-950">
                      <span>Total Payable:</span>
                      <span>{formatNPR(totalPayable)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm font-bold text-zinc-950">
                    <span>Total Payable:</span>
                    <span>{formatNPR(totalPayable)} (no VAT)</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-zinc-200 pt-4 flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold shadow-md border-none"
          >
            {loading ? "Reconciling..." : "Confirm Material Receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ReceiveGoodsModal;
