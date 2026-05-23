"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { getPurchaseLookups, createPurchaseOrder, submitPurchaseOrder } from "@/modules/purchase/actions";
import { createPurchaseOrderSchema } from "@/modules/purchase/types";
import { toast } from "sonner";

interface LineItem {
  id: string;
  productId: string;
  quantity: number;
  unit: string;
  unitPrice: number;
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
  const [discount, setDiscount] = useState(0);
  const [applyVat, setApplyVat] = useState(true);
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

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = applyVat ? Math.round((subtotal - discount) * 0.13 * 100) / 100 : 0;
  const total = subtotal - discount + tax;

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(),
        productId: "",
        quantity: 1,
        unit: "PCS",
        unitPrice: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleProductChange = (itemId: string, selectedProductId: string) => {
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    // Check if supplier-specific price exists in variants
    const variant = product.variants?.find((v: any) => v.supplierId === supplierId);
    const costPrice = variant ? parseFloat(variant.purchasePrice) : 0;

    setItems(
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              productId: selectedProductId,
              unit: product.unit,
              unitPrice: costPrice,
            }
          : item
      )
    );
  };

  const updateItem = (id: string, updates: Partial<LineItem>) => {
    setItems(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

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
        unitPrice: Number(item.unitPrice),
      })),
      discountAmount: Number(discount),
      taxAmount: Number(tax),
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
      setItems([]);
      setDiscount(0);
      setApplyVat(true);

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
        <DialogContent className="w-[98vw] max-w-[98vw] h-[95vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Header Section */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Supplier *</label>
                <select
                  value={supplierId}
                  onChange={(e) => {
                    setSupplierId(e.target.value);
                    // Reset items if supplier changes to recalculate correct cost prices
                    setItems([]);
                  }}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-zinc-950"
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.panNumber ? `(PAN: ${s.panNumber})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">PO Date *</label>
                <Input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Expected Delivery</label>
                <Input
                  type="date"
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Payment Method Context</label>
                <Input placeholder="Payment Terms / Cash Account" disabled value="ACCOUNTS PAYABLE" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Notes / Terms</label>
              <Input
                placeholder="Purchase terms, special handling instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Line Items Section */}
            <div className="border rounded-lg p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-zinc-600">Line Items</h3>
                <Button variant="outline" size="sm" onClick={addItem} disabled={!supplierId}>
                  + Add Item
                </Button>
              </div>

              {!supplierId ? (
                <p className="text-xs text-zinc-500 italic text-center py-2">Please select a supplier first to add items</p>
              ) : items.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-2">No items added yet</p>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-2 items-end flex-wrap sm:flex-nowrap border-b pb-2 sm:border-0 sm:pb-0">
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-xs text-zinc-500 mb-0.5 block">Product *</label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleProductChange(item.id, e.target.value)}
                          className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-zinc-950"
                        >
                          <option value="">-- Select Product --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.code}] {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-20">
                        <label className="text-xs text-zinc-500 mb-0.5 block">Qty</label>
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          min={1}
                          onChange={(e) => updateItem(item.id, { quantity: Math.max(1, parseInt(e.target.value) || 0) })}
                        />
                      </div>
                      <div className="w-20">
                        <label className="text-xs text-zinc-500 mb-0.5 block">Unit</label>
                        <Input placeholder="Unit" value={item.unit} disabled className="bg-zinc-100" />
                      </div>
                      <div className="w-28">
                        <label className="text-xs text-zinc-500 mb-0.5 block">Cost Price</label>
                        <Input
                          type="number"
                          placeholder="Price"
                          value={item.unitPrice}
                          min={0}
                          onChange={(e) => updateItem(item.id, { unitPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                        />
                      </div>
                      <div className="w-28 text-right self-center pb-2">
                        <span className="text-xs text-zinc-500 block mb-0.5">Line Total</span>
                        <span className="font-semibold text-sm">
                          NPR {(item.quantity * item.unitPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="mb-0.5"
                        onClick={() => removeItem(item.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totals Section */}
            <div className="border rounded-lg p-4 space-y-2.5 bg-zinc-50 dark:bg-zinc-900 border-dashed">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600">Subtotal:</span>
                <span className="font-medium">NPR {subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <label className="text-zinc-600">Discount Amount:</label>
                <Input
                  type="number"
                  value={discount}
                  min={0}
                  max={subtotal}
                  onChange={(e) => setDiscount(Math.min(subtotal, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="w-32 h-8"
                />
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-600">Apply VAT (13%):</span>
                  <input
                    type="checkbox"
                    checked={applyVat}
                    onChange={(e) => setApplyVat(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <span className="font-medium">NPR {tax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-2 text-zinc-900 dark:text-zinc-50">
                <span>Grand Total:</span>
                <span>NPR {total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => handleCreate(false)} disabled={saving || !supplierId} variant="outline" className="border-zinc-300">
              {saving ? "Processing..." : "Save Draft"}
            </Button>
            <Button onClick={() => handleCreate(true)} disabled={saving || !supplierId} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? "Processing..." : "Submit PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

