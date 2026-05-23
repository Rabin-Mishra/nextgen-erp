"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PurchaseOrderItemSchema } from "@/modules/purchase/types";
import { receiveGoodsSchema } from "@/modules/purchase/types";
import { receiveGoods } from "@/modules/purchase/actions";
import { toast } from "sonner";

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
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);

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

  const handleReceive = (itemId: string, qty: number) => {
    setReceiving((prev) => ({ ...prev, [itemId]: qty }));
  };

  const handleSubmit = async () => {
    if (!warehouseId) {
      toast.error("Please select a warehouse");
      return;
    }

    const itemsToReceive = Object.entries(receiving)
      .map(([poItemId, receivedQty]) => ({ poItemId, receivedQty }))
      .filter((item) => item.receivedQty > 0);

    if (itemsToReceive.length === 0) {
      toast.error("Please enter receiving quantities for at least one item");
      return;
    }

    // Validate quantities
    for (const rx of itemsToReceive) {
      const item = poItems.find((itm) => itm.id === rx.poItemId);
      if (!item) continue;
      const maxReceivable = item.orderedQty - item.receivedQty;
      if (rx.receivedQty > maxReceivable) {
        toast.error(`Cannot receive more than ${maxReceivable} units for ${item.productName}`);
        return;
      }
    }

    const payload = {
      purchaseOrderId,
      items: itemsToReceive,
      warehouseId,
      notes: notes || undefined,
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

      toast.success("Goods received successfully! Inventory stock has been updated.");
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
      <DialogContent className="w-[98vw] max-w-[98vw] h-[95vh] flex flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receive Goods — PO: <span className="font-mono text-zinc-600">{poNumber}</span></DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Warehouse Selector */}
          <div>
            <label className="text-sm font-medium block mb-1">Destination Warehouse *</label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-zinc-950"
            >
              <option value="">-- Select Warehouse --</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Receiving Notes</label>
            <Input
              placeholder="e.g. Delivery Challan #, driver info, stock remarks..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-4">Order Items</h4>
          {poItems.length === 0 ? (
            <p className="text-sm text-zinc-500 italic">No items associated with this PO.</p>
          ) : (
            <div className="border rounded-lg divide-y bg-zinc-50/30">
              {poItems.map((item) => {
                const remaining = item.orderedQty - item.receivedQty;
                return (
                  <div key={item.id} className="p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">{item.productName}</p>
                      <p className="text-xs text-zinc-500 font-mono">{item.productCode}</p>
                    </div>
                    <div className="flex gap-4 items-end text-xs">
                      <div>
                        <span className="text-zinc-500 block mb-0.5">Ordered</span>
                        <p className="font-semibold text-sm">{item.orderedQty} {item.productUnit}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-0.5">Received</span>
                        <p className="font-semibold text-sm text-green-600">{item.receivedQty} {item.productUnit}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-0.5">Pending</span>
                        <p className="font-semibold text-sm text-zinc-600">{remaining} {item.productUnit}</p>
                      </div>
                      <div className="w-24">
                        <label className="text-zinc-500 block mb-0.5">Receiving Now</label>
                        <Input
                          type="number"
                          max={remaining}
                          min={0}
                          defaultValue={0}
                          onChange={(e) => handleReceive(item.id, Math.max(0, parseInt(e.target.value) || 0))}
                          className="h-8"
                          disabled={remaining <= 0}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 border-t pt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? "Receiving..." : "Confirm Receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

