"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { Plus, ChevronRight, ChevronLeft, Save, Loader2 } from "lucide-react";

export function AddProductModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<any>({
    name: "",
    categoryId: "",
    brandId: "",
    warehouseId: "",
    unit: "PCS",
    purchaseUnit: "",
    purchaseConversionFactor: 1,
    altSalesUnit: "",
    altSalesConversionFactor: 1,
    description: "",
    minStockLevel: 0,
    reorderLevel: 0,
    quantity: 0,
    variants: [],
  });

  const [options, setOptions] = useState({
    categories: [] as any[],
    brands: [] as any[],
    warehouses: [] as any[],
    suppliers: [] as any[],
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("addProduct") === "true") {
        setOpen(true);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/inventory/lookups");
        const j = await res.json();
        if (!mounted) return;

        const warehouses = j.warehouses || [];
        setOptions({
          categories: j.categories || [],
          brands: j.brands || [],
          warehouses: warehouses,
          suppliers: j.suppliers || [],
        });

        // Auto-select warehouse if exactly 1 exists
        if (warehouses.length === 1) {
          setForm((s: any) => ({ ...s, warehouseId: warehouses[0].id }));
        }
      } catch (err) {
        console.error("Failed to load lookups", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [open]);

  const router = useRouter();

  function update<K extends string>(key: K, value: any) {
    setForm((s: any) => ({ ...s, [key]: value }));
    // Clear validation error when field is updated
    if (errors[key]) {
      setErrors((e) => {
        const next = { ...e };
        delete next[key];
        return next;
      });
    }
  }

  function addVariant() {
    setForm((s: any) => ({
      ...s,
      variants: [
        ...(s.variants || []),
        {
          supplierId: "",
          purchasePrice: 0,
          retailPrice: 0,
          wholesalePrice: 0,
          projectPrice: 0,
        },
      ],
    }));
  }

  function removeVariant(index: number) {
    setForm((s: any) => ({
      ...s,
      variants: s.variants.filter((_: any, i: number) => i !== index),
    }));
  }

  function validateStep1() {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Product name is required";
    if (!form.categoryId) newErrors.categoryId = "Please select a category";
    if (!form.brandId) newErrors.brandId = "Please select a brand";
    if (!form.warehouseId) newErrors.warehouseId = "Please select a warehouse";
    if (!form.unit) newErrors.unit = "Please select a unit";
    if (form.quantity < 0) newErrors.quantity = "Quantity cannot be negative";
    if (form.reorderLevel < 0)
      newErrors.reorderLevel = "Reorder level cannot be negative";

    if (form.purchaseUnit && (!form.purchaseConversionFactor || form.purchaseConversionFactor <= 0)) {
      newErrors.purchaseConversionFactor = "Conversion factor must be greater than 0";
    }
    if (form.altSalesUnit && (!form.altSalesConversionFactor || form.altSalesConversionFactor <= 0)) {
      newErrors.altSalesConversionFactor = "Conversion factor must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function validateStep2() {
    const newErrors: Record<string, string> = {};
    if (form.variants && form.variants.length > 0) {
      form.variants.forEach((v: any, i: number) => {
        if (!v.supplierId)
          newErrors[`variant_${i}_supplier`] = "Select a supplier";
        if (v.purchasePrice <= 0)
          newErrors[`variant_${i}_purchase`] = "Must be > 0";
        if (v.retailPrice <= 0)
          newErrors[`variant_${i}_retail`] = "Must be > 0";
        if (v.wholesalePrice <= 0)
          newErrors[`variant_${i}_wholesale`] = "Must be > 0";
      });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    if (validateStep1()) {
      setStep(2);
      setErrors({});
    }
  }

  async function submit() {
    if (submitting) return;
    if (!validateStep2()) return;
    try {
      setSubmitting(true);
      const payload = {
        ...form,
        purchaseUnit: form.purchaseUnit || null,
        purchaseConversionFactor: form.purchaseUnit ? Number(form.purchaseConversionFactor) : null,
        altSalesUnit: form.altSalesUnit || null,
        altSalesConversionFactor: form.altSalesUnit ? Number(form.altSalesConversionFactor) : null,
      };
      const res = await fetch("/api/inventory/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to create product");
      setOpen(false);
      // Reset form
      setForm({
        name: "",
        categoryId: "",
        brandId: "",
        warehouseId: "",
        unit: "PCS",
        purchaseUnit: "",
        purchaseConversionFactor: 1,
        altSalesUnit: "",
        altSalesConversionFactor: 1,
        description: "",
        minStockLevel: 0,
        reorderLevel: 0,
        quantity: 0,
        variants: [],
      });
      setStep(1);
      setErrors({});
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Error: " + (err as any).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg border-none transition-all">
          <Plus size={16} /> Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            {step === 1
              ? "Add Product — Basic Details"
              : "Add Product — Supplier Pricing Variants"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Form wizard to create a new product item with specifications,
            warehouse stock, and multiple supplier price matrices.
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label
                  htmlFor="name"
                  className="text-xs font-bold text-zinc-500 uppercase tracking-wide"
                >
                  Product Name
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Waterproofing Compound Premium"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800"
                />
                {errors.name && (
                  <span className="text-xs text-rose-500 font-medium">
                    {errors.name}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="categoryId"
                  className="text-xs font-bold text-zinc-500 uppercase tracking-wide"
                >
                  Category
                </Label>
                <select
                  id="categoryId"
                  value={form.categoryId}
                  onChange={(e) => update("categoryId", e.target.value)}
                  className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select Category</option>
                  {options.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <span className="text-xs text-rose-500 font-medium">
                    {errors.categoryId}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="brandId"
                  className="text-xs font-bold text-zinc-500 uppercase tracking-wide"
                >
                  Brand
                </Label>
                <select
                  id="brandId"
                  value={form.brandId}
                  onChange={(e) => update("brandId", e.target.value)}
                  className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select Brand</option>
                  {options.brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {errors.brandId && (
                  <span className="text-xs text-rose-500 font-medium">
                    {errors.brandId}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="warehouseId"
                  className="text-xs font-bold text-zinc-500 uppercase tracking-wide"
                >
                  Warehouse
                </Label>
                <select
                  id="warehouseId"
                  value={form.warehouseId}
                  onChange={(e) => update("warehouseId", e.target.value)}
                  className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select Warehouse</option>
                  {options.warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                {options.warehouses.length === 1 && (
                  <span className="text-xs text-zinc-500">
                    Automatically defaulted (only 1 warehouse exists)
                  </span>
                )}
                {errors.warehouseId && (
                  <span className="text-xs text-rose-500 font-medium">
                    {errors.warehouseId}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="unit"
                  className="text-xs font-bold text-zinc-500 uppercase tracking-wide"
                >
                  Unit of Measurement
                </Label>
                <select
                  id="unit"
                  value={form.unit}
                  onChange={(e) => update("unit", e.target.value)}
                  className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-zinc-950"
                >
                  {["BAG", "PCS", "METER", "KG", "LITRE", "SQ_FT", "ROLL", "BOX", "CARTON", "TIN", "DRUM", "SHEET", "BUNDLE", "SET", "PAIR", "FEET", "TON"].map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                {errors.unit && (
                  <span className="text-xs text-rose-500 font-medium">
                    {errors.unit}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="quantity"
                  className="text-xs font-bold text-zinc-500 uppercase tracking-wide"
                >
                  Initial Stock Quantity
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  step="any"
                  placeholder="0"
                  value={form.quantity}
                  onChange={(e) =>
                    update("quantity", Math.max(0, parseFloat(e.target.value) || 0))
                  }
                  className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800"
                />
                {errors.quantity && (
                  <span className="text-xs text-rose-500 font-medium">
                    {errors.quantity}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="reorderLevel"
                  className="text-xs font-bold text-zinc-500 uppercase tracking-wide"
                >
                  Reorder Level Alert Threshold
                </Label>
                <Input
                  id="reorderLevel"
                  type="number"
                  step="any"
                  placeholder="0"
                  value={form.reorderLevel}
                  onChange={(e) =>
                    update("reorderLevel", Math.max(0, parseFloat(e.target.value) || 0))
                  }
                  className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800"
                />
                {errors.reorderLevel && (
                  <span className="text-xs text-rose-500 font-medium">
                    {errors.reorderLevel}
                  </span>
                )}
              </div>

              {/* UoM Configurations */}
              <div className="space-y-4 col-span-2 border-t border-zinc-100 dark:border-zinc-900 pt-4">
                <h4 className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
                  Alternate Units of Measure (UoM)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* Purchase UoM */}
                  <div className="p-3 border border-zinc-100 dark:border-zinc-900 rounded-xl bg-zinc-50/30 dark:bg-zinc-900/10 space-y-3">
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-wide">
                      Default Purchase Unit
                    </span>
                    <div className="space-y-1.5">
                      <Label htmlFor="purchaseUnit" className="text-[11px] font-bold text-zinc-500 uppercase">
                        Purchase Unit
                      </Label>
                      <select
                        id="purchaseUnit"
                        value={form.purchaseUnit || ""}
                        onChange={(e) => update("purchaseUnit", e.target.value || "")}
                        className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 bg-white dark:bg-zinc-950"
                      >
                        <option value="">Same as Base ({form.unit})</option>
                        {["BAG", "PCS", "METER", "KG", "LITRE", "SQ_FT", "ROLL", "BOX", "CARTON", "TIN", "DRUM", "SHEET", "BUNDLE", "SET", "PAIR", "FEET", "TON"].map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                    {form.purchaseUnit && form.purchaseUnit !== form.unit && (
                      <div className="space-y-1.5 animate-fadeIn">
                        <Label htmlFor="purchaseConversionFactor" className="text-[11px] font-bold text-zinc-500 uppercase">
                          Conversion Factor (1 {form.purchaseUnit} = X {form.unit})
                        </Label>
                        <Input
                          id="purchaseConversionFactor"
                          type="number"
                          step="any"
                          placeholder="e.g. 10"
                          value={form.purchaseConversionFactor}
                          onChange={(e) => update("purchaseConversionFactor", parseFloat(e.target.value) || "")}
                          className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800 font-mono"
                        />
                        {errors.purchaseConversionFactor && (
                          <span className="text-xs text-rose-500 font-medium">
                            {errors.purchaseConversionFactor}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sales UoM */}
                  <div className="p-3 border border-zinc-100 dark:border-zinc-900 rounded-xl bg-zinc-50/30 dark:bg-zinc-900/10 space-y-3">
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-wide">
                      Alternate Sales Unit
                    </span>
                    <div className="space-y-1.5">
                      <Label htmlFor="altSalesUnit" className="text-[11px] font-bold text-zinc-500 uppercase">
                        Sales Unit
                      </Label>
                      <select
                        id="altSalesUnit"
                        value={form.altSalesUnit || ""}
                        onChange={(e) => update("altSalesUnit", e.target.value || "")}
                        className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 bg-white dark:bg-zinc-950"
                      >
                        <option value="">Same as Base ({form.unit})</option>
                        {["BAG", "PCS", "METER", "KG", "LITRE", "SQ_FT", "ROLL", "BOX", "CARTON", "TIN", "DRUM", "SHEET", "BUNDLE", "SET", "PAIR", "FEET", "TON"].map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                    {form.altSalesUnit && form.altSalesUnit !== form.unit && (
                      <div className="space-y-1.5 animate-fadeIn">
                        <Label htmlFor="altSalesConversionFactor" className="text-[11px] font-bold text-zinc-500 uppercase">
                          Conversion Factor (1 {form.altSalesUnit} = X {form.unit})
                        </Label>
                        <Input
                          id="altSalesConversionFactor"
                          type="number"
                          step="any"
                          placeholder="e.g. 10"
                          value={form.altSalesConversionFactor}
                          onChange={(e) => update("altSalesConversionFactor", parseFloat(e.target.value) || "")}
                          className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800 font-mono"
                        />
                        {errors.altSalesConversionFactor && (
                          <span className="text-xs text-rose-500 font-medium">
                            {errors.altSalesConversionFactor}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label
                  htmlFor="description"
                  className="text-xs font-bold text-zinc-500 uppercase tracking-wide"
                >
                  Description (Optional)
                </Label>
                <textarea
                  id="description"
                  placeholder="Product specs, usage guidelines, etc."
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  className="w-full min-h-16 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-transparent text-zinc-900 dark:text-zinc-50"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2 max-h-[50vh] overflow-y-auto pr-1">
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-500">
                Configure cost and client selling prices per supplier.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={addVariant}
                className="h-10 px-4 rounded-xl text-zinc-600 font-bold border-zinc-200 dark:border-zinc-800 gap-1"
              >
                <Plus size={14} /> Add Supplier Price Row
              </Button>
            </div>

            {!form.variants || form.variants.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50 dark:bg-zinc-900/30">
                <p className="text-sm text-zinc-500">
                  No supplier pricing added yet. Highly recommended to configure
                  at least one.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {form.variants.map((v: any, i: number) => (
                  <div
                    key={i}
                    className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/40 relative space-y-3"
                  >
                    <div className="flex justify-between items-center pb-1 border-b border-zinc-200/60">
                      <span className="text-xs font-semibold text-amber-500">
                        Supplier Combo #{i + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariant(i)}
                        className="h-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50/50 px-2 rounded-lg"
                      >
                        Remove Row
                      </Button>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-xs text-zinc-400">
                          Supplier
                        </Label>
                        <select
                          value={v.supplierId}
                          onChange={(e) => {
                            const arr = [...form.variants];
                            arr[i].supplierId = e.target.value;
                            setForm({ ...form, variants: arr });
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next[`variant_${i}_supplier`];
                              return next;
                            });
                          }}
                          className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none"
                        >
                          <option value="">Select Supplier</option>
                          {options.suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        {errors[`variant_${i}_supplier`] && (
                          <span className="text-[10px] text-rose-500">
                            {errors[`variant_${i}_supplier`]}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-zinc-400">
                          Purchase Price
                        </Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={v.purchasePrice}
                          onChange={(e) => {
                            const arr = [...form.variants];
                            arr[i].purchasePrice = Number(e.target.value);
                            setForm({ ...form, variants: arr });
                          }}
                          className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800"
                        />
                        {errors[`variant_${i}_purchase`] && (
                          <span className="text-[10px] text-rose-500">
                            {errors[`variant_${i}_purchase`]}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-zinc-400">
                          Retail Sell Price
                        </Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={v.retailPrice}
                          onChange={(e) => {
                            const arr = [...form.variants];
                            arr[i].retailPrice = Number(e.target.value);
                            setForm({ ...form, variants: arr });
                          }}
                          className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800"
                        />
                        {errors[`variant_${i}_retail`] && (
                          <span className="text-[10px] text-rose-500">
                            {errors[`variant_${i}_retail`]}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-xs text-zinc-400">
                          Wholesale Price
                        </Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={v.wholesalePrice}
                          onChange={(e) => {
                            const arr = [...form.variants];
                            arr[i].wholesalePrice = Number(e.target.value);
                            setForm({ ...form, variants: arr });
                          }}
                          className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800"
                        />
                        {errors[`variant_${i}_wholesale`] && (
                          <span className="text-[10px] text-rose-500">
                            {errors[`variant_${i}_wholesale`]}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-xs text-zinc-400">
                          Project Price
                        </Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={v.projectPrice}
                          onChange={(e) => {
                            const arr = [...form.variants];
                            arr[i].projectPrice = Number(e.target.value);
                            setForm({ ...form, variants: arr });
                          }}
                          className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-4 border-t border-zinc-100 dark:border-zinc-900 flex gap-2">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="h-10 px-4 rounded-xl text-zinc-600 font-bold border-zinc-200 dark:border-zinc-800 gap-2"
            >
              <ChevronLeft size={16} /> Back
            </Button>
          )}
          {step === 1 ? (
            <Button
              onClick={handleNext}
              className="h-10 px-5 rounded-xl font-bold flex items-center gap-2 shadow-md bg-amber-500 hover:bg-amber-600 text-zinc-950"
            >
              Next: Pricing <ChevronRight size={16} />
            </Button>
          ) : (
            <Button
              onClick={submit}
              disabled={submitting}
              className="h-10 px-5 rounded-xl font-bold flex items-center gap-2 shadow-md bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save size={16} /> Save Product
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddProductModal;
