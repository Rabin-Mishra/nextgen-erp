"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { getPurchaseLookups, createPurchaseOrder, submitPurchaseOrder } from "@/modules/purchase/actions";
import { createPurchaseOrderSchema } from "@/modules/purchase/types";
import { toast } from "sonner";
import { Plus, Trash2, Calendar, FileText, ShoppingBag } from "lucide-react";
import { DualDatePicker } from "@/components/shared/DualDatePicker";

interface LineItem {
  id: string;
  productId: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  notes: string;
}

interface NewPurchaseOrderFormProps {
  userId: string;
}

export function NewPurchaseOrderForm({ userId }: NewPurchaseOrderFormProps) {
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [poDate, setPoDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [applyVat, setApplyVat] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  // Lookups data
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const router = useRouter();

  // Fetch lookups when the form opens
  useEffect(() => {
    if (open) {
      (async () => {
        try {
          const res = await getPurchaseLookups();
          setSuppliers(res.suppliers || []);
          setProducts(res.products || []);
        } catch (err) {
          console.error("Failed to load PO lookups", err);
        }
      })();
    }
  }, [open]);

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(),
        productId: "",
        quantity: 1,
        unit: "PCS",
        unitPrice: 0,
        notes: "",
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleProductChange = (itemId: string, selectedProductId: string) => {
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    setItems(
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              productId: selectedProductId,
              unit: product.unit,
              unitPrice: 0,
            }
          : item
      )
    );
  };

  const updateItem = (id: string, updates: Partial<LineItem>) => {
    setItems(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  // Calculations
  const subtotal = 0;
  const tax = 0;
  const total = 0;

  const handleCreate = async (shouldSubmit: boolean) => {
    if (!supplierId) {
      toast.error("Please select a supplier");
      return;
    }
    if (items.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }
    if (items.some((item) => !item.productId)) {
      toast.error("Please select a product for all line items");
      return;
    }

    const payload = {
      supplierId,
      orderDate: new Date(poDate),
      expectedDate: expectedDelivery ? new Date(expectedDelivery) : undefined,
      notes: notes || undefined,
      items: items.map((item) => ({
        productId: item.productId,
        orderedQty: Number(item.quantity),
        unitPrice: 0,
        notes: item.notes || undefined,
      })),
      discountAmount: 0,
      taxAmount: 0,
    };

    // Client-side Zod validation
    const parsed = createPurchaseOrderSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const errorMsg = Object.entries(fieldErrors)
        .map(([field, errs]) => `${field}: ${errs?.join(", ")}`)
        .join(" | ") || "Validation failed.";
      toast.error(`Validation Failed: ${errorMsg}`);
      return;
    }

    setSaving(true);
    try {
      // 1. Create Draft PO
      const po = await createPurchaseOrder(parsed.data, userId);
      if (!po) throw new Error("Failed to create Purchase Order");

      // 2. Submit if requested
      if (shouldSubmit) {
        await submitPurchaseOrder(po.id, userId);
      }

      toast.success(shouldSubmit ? "Purchase Order submitted successfully!" : "Draft Purchase Order saved!");
      setOpen(false);
      
      // Reset form state
      setSupplierId("");
      setPoDate(new Date().toISOString().split("T")[0]);
      setExpectedDelivery("");
      setNotes("");
      setDiscount(0);
      setApplyVat(true);
      setItems([]);

      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error("Error: " + (err.message || "Failed to process Purchase Order"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ New Purchase Order</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[98vw] max-w-[98vw] h-[95vh] flex flex-col overflow-hidden bg-white border border-zinc-200 text-zinc-900 rounded-2xl shadow-xl">
          <DialogHeader className="border-b border-zinc-200 pb-3">
            <DialogTitle className="text-xl font-bold text-zinc-900 flex items-center gap-2">
              <ShoppingBag size={20} className="text-blue-600" /> Create Purchase Order
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs mt-0.5">
              Draft or submit a new procurement request with material specifications and quantities.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-grow overflow-y-auto py-4 space-y-5 pr-1">
            {/* Header Section */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-5 rounded-xl border border-zinc-200 bg-zinc-50/50 shadow-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 tracking-wider uppercase block">Supplier *</label>
                <select
                  value={supplierId}
                  onChange={(e) => {
                    setSupplierId(e.target.value);
                    setItems([]);
                  }}
                  className="w-full h-10 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm"
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <DualDatePicker
                  label="PO Date"
                  value={poDate}
                  onChange={(date) => setPoDate(date.toISOString().split("T")[0])}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <DualDatePicker
                  label="Expected Delivery"
                  value={expectedDelivery || undefined}
                  onChange={(date) => setExpectedDelivery(date.toISOString().split("T")[0])}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 tracking-wider uppercase block">Accounting Context</label>
                <Input
                  placeholder="ACCOUNTS PAYABLE"
                  disabled
                  value="ACCOUNTS PAYABLE"
                  className="bg-zinc-50 border-zinc-200 text-zinc-500 h-10 cursor-not-allowed shadow-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 tracking-wider uppercase block">Notes / Terms</label>
              <Input
                placeholder="Purchase terms, special shipping instructions, delivery coordinator..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-white border-zinc-300 text-zinc-900 h-10 shadow-sm focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>

            {/* Line Items Section */}
            <div className="border border-zinc-200 rounded-xl p-5 space-y-4 bg-zinc-50/20">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <FileText size={14} className="text-blue-600" /> Dispatched Supply Demands
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  disabled={!supplierId}
                  className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 shadow-sm"
                >
                  <Plus size={14} className="mr-1" /> Add Procurement Line
                </Button>
              </div>

              {!supplierId ? (
                <div className="text-center py-8 border border-dashed border-zinc-300 rounded-lg bg-white/50">
                  <p className="text-sm text-zinc-400 italic">Please select a supplier first to configure line item demands</p>
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-zinc-300 rounded-lg bg-white/50">
                  <p className="text-sm text-zinc-400 italic">No lines added yet. Click &quot;Add Procurement Line&quot; to define materials.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-3 items-end p-4 border border-zinc-200 rounded-xl bg-white relative shadow-sm hover:border-zinc-300 transition-colors duration-150">
                      
                      {/* Product select */}
                      <div className="col-span-12 sm:col-span-4">
                        <label className="text-[10px] font-semibold text-zinc-500 block mb-1">Product *</label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleProductChange(item.id, e.target.value)}
                          className="w-full h-9 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
                        >
                          <option value="">-- Select Product --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.code}] {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity input */}
                      <div className="col-span-6 sm:col-span-2">
                        <label className="text-[10px] font-semibold text-zinc-500 block mb-1">Quantity *</label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={item.quantity}
                          min={1}
                          onChange={(e) => updateItem(item.id, { quantity: Math.max(1, parseInt(e.target.value) || 0) })}
                          className="h-9 bg-white border-zinc-300 text-zinc-900 text-xs shadow-sm focus:border-blue-500"
                        />
                      </div>

                      {/* Unit select dropdown */}
                      <div className="col-span-6 sm:col-span-1.5">
                        <label className="text-[10px] font-semibold text-zinc-500 block mb-1">Unit</label>
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                          className="w-full h-9 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
                        >
                          {!["PCS", "BAG", "METER", "KG", "LITRE", "SQ_FT", "ROLL", "BOX"].includes(item.unit) && item.unit && (
                            <option value={item.unit}>{item.unit}</option>
                          )}
                          <option value="PCS">PCS</option>
                          <option value="BAG">BAG</option>
                          <option value="METER">METER</option>
                          <option value="KG">KG</option>
                          <option value="LITRE">LITRE</option>
                          <option value="SQ_FT">SQ FT</option>
                          <option value="ROLL">ROLL</option>
                          <option value="BOX">BOX</option>
                        </select>
                      </div>

                      {/* Line Specifications */}
                      <div className="col-span-10 sm:col-span-4">
                        <label className="text-[10px] font-semibold text-zinc-500 block mb-1">Line Specifications / Notes</label>
                        <Input
                          placeholder="e.g. thickness, color spec..."
                          value={item.notes}
                          onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                          className="h-9 bg-white border-zinc-300 text-zinc-900 text-xs shadow-sm focus:border-blue-500"
                        />
                      </div>

                      {/* Action */}
                      <div className="col-span-2 sm:col-span-0.5 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-zinc-200 pt-4 flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
              className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 shadow-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleCreate(false)}
              disabled={saving || !supplierId}
              variant="outline"
              className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 shadow-sm"
            >
              {saving ? "Processing..." : "Save Draft"}
            </Button>
            <Button
              onClick={() => handleCreate(true)}
              disabled={saving || !supplierId}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md"
            >
              {saving ? "Processing..." : "Confirm & Submit PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default NewPurchaseOrderForm;
