"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getPurchaseLookups, updatePurchaseOrder } from "@/modules/purchase/actions";
import { ShoppingBag, Loader2, Calendar, FileText } from "lucide-react";
import { DualDatePicker } from "@/components/shared/DualDatePicker";
import type { PurchaseOrderSchema } from "@/modules/purchase/types";

interface EditPurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  po: PurchaseOrderSchema;
  userId: string;
}

export function EditPurchaseOrderModal({ isOpen, onClose, onSuccess, po, userId }: EditPurchaseOrderModalProps) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [notes, setNotes] = useState("");
  const [itemsState, setItemsState] = useState<{ id: string; productName: string; productCode: string; productUnit: string; orderedQty: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [lookupsLoading, setLookupsLoading] = useState(false);

  // Lookups data
  const [suppliers, setSuppliers] = useState<any[]>([]);

  useEffect(() => {
    if (po && isOpen) {
      setSupplierId(po.supplierId);
      setExpectedDelivery(po.expectedDate ? po.expectedDate.split("T")[0] : "");
      setNotes(po.notes || "");
      setItemsState(
        po.items ? po.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          productCode: item.productCode,
          productUnit: item.productUnit,
          orderedQty: item.orderedQty,
        })) : []
      );
    }
  }, [po, isOpen]);

  const handleQtyChange = (index: number, val: number) => {
    const updated = [...itemsState];
    updated[index].orderedQty = val;
    setItemsState(updated);
  };

  // Fetch lookups when the form opens
  useEffect(() => {
    if (isOpen) {
      (async () => {
        try {
          setLookupsLoading(true);
          const res = await getPurchaseLookups();
          setSuppliers(res.suppliers || []);
        } catch (err) {
          console.error("Failed to load PO lookups", err);
          toast.error("Failed to load supplier dropdown data.");
        } finally {
          setLookupsLoading(false);
        }
      })();
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!supplierId) {
      toast.error("Please select a supplier/vendor");
      return;
    }

    setLoading(true);
    try {
      await updatePurchaseOrder(
        po.id,
        {
          supplierId,
          expectedDate: expectedDelivery ? new Date(expectedDelivery) : undefined,
          notes: notes || undefined,
          items: po.status === "DRAFT" ? itemsState.map((item) => ({
            id: item.id,
            orderedQty: item.orderedQty,
          })) : undefined,
        },
        userId
      );

      toast.success(`Purchase Order ${po.poNumber} updated successfully!`);
      onSuccess();
      onClose();
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update Purchase Order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-xl rounded-2xl p-6 bg-white text-zinc-900 border border-zinc-200 shadow-xl">
        <DialogHeader className="border-b pb-3 border-zinc-150">
          <DialogTitle className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <ShoppingBag size={20} className="text-blue-600" />
            Edit Purchase Order — <span className="font-mono text-zinc-500">{po?.poNumber}</span>
          </DialogTitle>
          <DialogDescription className="text-zinc-500 text-xs mt-0.5">
            Update supplier vendor profile, delivery expected date, and notes for this purchase order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 tracking-wider uppercase block">Supplier / Vendor *</label>
            {lookupsLoading ? (
              <div className="h-10 rounded-md border border-zinc-300 bg-zinc-50 flex items-center justify-center text-zinc-400 text-xs">
                <Loader2 className="h-4.5 w-4.5 animate-spin mr-1.5" /> Loading vendors...
              </div>
            ) : (
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full h-10 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm"
                disabled={loading}
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1.5">
            <DualDatePicker
              label="Expected Delivery Date"
              value={expectedDelivery || undefined}
              onChange={(date) => setExpectedDelivery(date.toISOString().split("T")[0])}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 tracking-wider uppercase block">Notes / Terms</label>
            <Input
              placeholder="Purchase terms, special shipping instructions, delivery coordinator..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              className="bg-white border-zinc-300 text-zinc-900 h-10 shadow-sm focus:border-blue-500 focus:ring-blue-500/20"
            />
          </div>

          {po.status === "DRAFT" && itemsState.length > 0 && (
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-zinc-500 tracking-wider uppercase block border-b pb-1.5 border-zinc-150">
                Order Line Items
              </label>
              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                {itemsState.map((item, idx) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 p-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-800 truncate">{item.productName}</p>
                      <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{item.productCode}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-24">
                        <label className="text-[9px] uppercase tracking-wider font-bold text-zinc-400 block mb-0.5">Quantity</label>
                        <Input
                          type="number"
                          value={item.orderedQty}
                          onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                          min={1}
                          disabled={loading}
                          className="h-8 text-xs bg-white border-zinc-300 text-zinc-900 focus:ring-blue-500/20"
                        />
                      </div>
                      <span className="text-[10px] text-zinc-500 font-medium self-end pb-1.5">{item.productUnit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 border-t pt-4 border-zinc-150 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading} className="h-10 px-4 rounded-xl font-bold">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="h-10 px-5 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 bg-blue-600 text-white hover:bg-blue-700 border-none"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditPurchaseOrderModal;
