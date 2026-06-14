"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import {
  getPurchaseLookups,
  createPurchaseOrder,
  submitPurchaseOrder,
} from "@/modules/purchase/actions";
import { createPurchaseOrderSchema } from "@/modules/purchase/types";
import { toast } from "sonner";
import { Plus, Trash2, Calendar, FileText, ShoppingBag } from "lucide-react";
import { DualDatePicker } from "@/components/shared/DualDatePicker";
import { ProductAutocomplete } from "@/components/shared/ProductAutocomplete";

interface LineItem {
  id: string;
  productId: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  conversionFactor: number;
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
        conversionFactor: 1,
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

    const variant = product.variants?.find((v: any) => v.supplierId === supplierId);
    const basePrice = variant ? Number(variant.purchasePrice) : 0;
    const defaultUnit = product.purchaseUnit || product.unit;
    const factor = product.purchaseUnit ? Number(product.purchaseConversionFactor) : 1;
    const unitPrice = basePrice * factor;

    setItems(
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              productId: selectedProductId,
              unit: defaultUnit,
              unitPrice: unitPrice,
              conversionFactor: factor,
            }
          : item,
      ),
    );
  };

  const handleUnitChange = (itemId: string, newUnit: string) => {
    setItems(
      items.map((item) => {
        if (item.id !== itemId) return item;

        const product = products.find((p) => p.id === item.productId);
        if (!product) return { ...item, unit: newUnit };

        let factor = 1;
        if (newUnit === product.purchaseUnit) {
          factor = Number(product.purchaseConversionFactor) || 1;
        } else if (newUnit === product.altSalesUnit) {
          factor = Number(product.altSalesConversionFactor) || 1;
        }

        const variant = product.variants?.find((v: any) => v.supplierId === supplierId);
        const basePrice = variant ? Number(variant.purchasePrice) : 0;
        const unitPrice = basePrice * factor;

        return {
          ...item,
          unit: newUnit,
          conversionFactor: factor,
          unitPrice,
        };
      })
    );
  };

  const updateItem = (id: string, updates: Partial<LineItem>) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const tax = applyVat ? (subtotal - discount) * 0.13 : 0;
  const total = subtotal - discount + tax;

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
        notes: item.notes || undefined,
        orderedUnit: item.unit,
        conversionFactor: Number(item.conversionFactor),
      })),
      discountAmount: Number(discount),
      taxAmount: Number(tax),
    };

    // Client-side Zod validation
    const parsed = createPurchaseOrderSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const errorMsg =
        Object.entries(fieldErrors)
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

      toast.success(
        shouldSubmit
          ? "Purchase Order submitted successfully!"
          : "Draft Purchase Order saved!",
      );
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
      toast.error(
        "Error: " + (err.message || "Failed to process Purchase Order"),
      );
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
              <ShoppingBag size={20} className="text-blue-600" /> Create
              Purchase Order
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs mt-0.5">
              Draft or submit a new procurement request with material
              specifications and quantities.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-grow overflow-y-auto py-4 space-y-5 pr-1">
            {/* Header Section */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-5 rounded-xl border border-zinc-200 bg-zinc-50/50 shadow-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 tracking-wider uppercase block">
                  Supplier *
                </label>
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
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <DualDatePicker
                  label="PO Date"
                  value={poDate}
                  onChange={(date) =>
                    setPoDate(date.toISOString().split("T")[0])
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <DualDatePicker
                  label="Expected Delivery"
                  value={expectedDelivery || undefined}
                  onChange={(date) =>
                    setExpectedDelivery(date.toISOString().split("T")[0])
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 tracking-wider uppercase block">
                  Accounting Context
                </label>
                <Input
                  placeholder="ACCOUNTS PAYABLE"
                  disabled
                  value="ACCOUNTS PAYABLE"
                  className="bg-zinc-50 border-zinc-200 text-zinc-500 h-10 cursor-not-allowed shadow-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 tracking-wider uppercase block">
                Notes / Terms
              </label>
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
                  <FileText size={14} className="text-blue-600" /> Dispatched
                  Supply Demands
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
                  <p className="text-sm text-zinc-400 italic">
                    Please select a supplier first to configure line item
                    demands
                  </p>
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-zinc-300 rounded-lg bg-white/50">
                  <p className="text-sm text-zinc-400 italic">
                    No lines added yet. Click &quot;Add Procurement Line&quot;
                    to define materials.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => {
                    const product = products.find((p) => p.id === item.productId);
                    const baseUnit = product ? product.unit : "PCS";
                    const equivalentBaseQty = item.quantity * item.conversionFactor;

                    return (
                      <div
                        key={item.id}
                        className="grid grid-cols-12 gap-3 items-end p-4 border border-zinc-200 rounded-xl bg-white relative shadow-sm hover:border-zinc-300 transition-colors duration-150"
                      >
                        {/* Product select */}
                        <div className="col-span-12 sm:col-span-3">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-semibold text-zinc-500 block">
                              Product *
                            </label>
                            <a
                              href="/inventory?addProduct=true"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[9px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5"
                            >
                              + Create Product
                            </a>
                          </div>
                          <ProductAutocomplete
                            products={products}
                            value={item.productId}
                            onChange={(selectedId) =>
                              handleProductChange(item.id, selectedId)
                            }
                            placeholder="Select Product"
                          />
                        </div>

                        {/* Quantity input */}
                        <div className="col-span-6 sm:col-span-1.5">
                          <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                            Quantity *
                          </label>
                          <Input
                            type="number"
                            step="any"
                            placeholder="0"
                            value={item.quantity}
                            min={0.0001}
                            onChange={(e) =>
                              updateItem(item.id, {
                                quantity: Math.max(
                                  0.0001,
                                  parseFloat(e.target.value) || 0,
                                ),
                              })
                            }
                            className="h-9 bg-white border-zinc-300 text-zinc-900 text-xs shadow-sm focus:border-blue-500"
                          />
                        </div>

                        {/* Unit select dropdown */}
                        <div className="col-span-6 sm:col-span-1.5">
                          <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                            Unit
                          </label>
                          <select
                            value={item.unit}
                            onChange={(e) => handleUnitChange(item.id, e.target.value)}
                            disabled={!item.productId}
                            className="w-full h-9 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm disabled:bg-zinc-50 disabled:text-zinc-400"
                          >
                            {!item.productId ? (
                              <option value="">—</option>
                            ) : (
                              (() => {
                                const allowedUnits = new Set<string>();
                                if (product) {
                                  allowedUnits.add(product.unit);
                                  if (product.purchaseUnit) allowedUnits.add(product.purchaseUnit);
                                  if (product.altSalesUnit) allowedUnits.add(product.altSalesUnit);
                                }
                                return Array.from(allowedUnits).map((u) => (
                                  <option key={u} value={u}>
                                    {u}
                                  </option>
                                ));
                              })()
                            )}
                          </select>
                        </div>

                        {/* Conversion Factor */}
                        <div className="col-span-6 sm:col-span-1.5">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-semibold text-zinc-500 block">
                              Conversion Factor
                            </label>
                          </div>
                          <Input
                            type="number"
                            step="any"
                            placeholder="1"
                            value={item.conversionFactor}
                            onChange={(e) =>
                              updateItem(item.id, {
                                conversionFactor: Math.max(0.0001, parseFloat(e.target.value) || 1),
                              })
                            }
                            className="h-9 bg-white border-zinc-300 text-zinc-900 text-xs shadow-sm focus:border-blue-500 font-mono"
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="col-span-6 sm:col-span-1.5">
                          <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                            Unit Price (NPR)
                          </label>
                          <Input
                            type="number"
                            step="any"
                            placeholder="0.00"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(item.id, {
                                unitPrice: Math.max(0, parseFloat(e.target.value) || 0),
                              })
                            }
                            className="h-9 bg-white border-zinc-300 text-zinc-900 text-xs shadow-sm focus:border-blue-500 font-mono"
                          />
                        </div>

                        {/* Line Specifications */}
                        <div className="col-span-10 sm:col-span-2">
                          <label className="text-[10px] font-semibold text-zinc-500 block mb-1">
                            Line Specifications / Notes
                          </label>
                          <Input
                            placeholder="e.g. specs, color..."
                            value={item.notes}
                            onChange={(e) =>
                              updateItem(item.id, { notes: e.target.value })
                            }
                            className="h-9 bg-white border-zinc-300 text-zinc-900 text-xs shadow-sm focus:border-blue-500"
                          />
                        </div>

                        {/* Action */}
                        <div className="col-span-2 sm:col-span-0.5 flex flex-col justify-end items-center">
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

                        {/* Equivalency helper line */}
                        {item.conversionFactor !== 1 && (
                          <div className="col-span-12 text-[10px] text-zinc-500 mt-1 font-mono">
                            Equivalent Base Qty: <span className="font-bold text-amber-600">{equivalentBaseQty} {baseUnit}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {items.length > 0 && (
                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addItem}
                        disabled={!supplierId}
                        className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 shadow-sm"
                      >
                        <Plus size={14} className="mr-1" /> Add Procurement Line
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Totals Summary */}
            {supplierId && items.length > 0 && (
              <div className="flex justify-end p-5 rounded-xl border border-zinc-200 bg-zinc-50/50 shadow-sm">
                <div className="w-72 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500 font-medium">Subtotal:</span>
                    <span className="font-mono font-semibold">NPR {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-zinc-500 font-medium">Discount (NPR):</span>
                    <Input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="h-8 w-32 text-right font-mono"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 font-medium">Apply 13% VAT:</span>
                    <input
                      type="checkbox"
                      checked={applyVat}
                      onChange={(e) => setApplyVat(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                  </div>
                  {applyVat && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-medium">VAT (13%):</span>
                      <span className="font-mono font-semibold">NPR {tax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-bold text-zinc-900">
                    <span>Total Amount:</span>
                    <span className="font-mono text-blue-600">NPR {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
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
