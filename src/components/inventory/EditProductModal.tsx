"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { Save, Loader2, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { fetchProductDetails, updateInventoryProduct } from "@/modules/inventory/actions";

interface EditProductModalProps {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProductModal({ productId, open, onOpenChange }: EditProductModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<{
    name: string;
    categoryId: string;
    brandId: string;
    unit: string;
    purchaseUnit: string;
    purchaseConversionFactor: number | "";
    altSalesUnit: string;
    altSalesConversionFactor: number | "";
    description: string;
    minStockLevel: number;
    reorderLevel: number;
    supplierId: string;
    purchasePrice: number;
    retailPrice: number;
    wholesalePrice: number;
    projectPrice: number;
  }>({
    name: "",
    categoryId: "",
    brandId: "",
    unit: "BAG",
    purchaseUnit: "",
    purchaseConversionFactor: 1,
    altSalesUnit: "",
    altSalesConversionFactor: 1,
    description: "",
    minStockLevel: 0,
    reorderLevel: 0,
    supplierId: "",
    purchasePrice: 0,
    retailPrice: 0,
    wholesalePrice: 0,
    projectPrice: 0,
  });

  const [options, setOptions] = useState({
    categories: [] as any[],
    brands: [] as any[],
    suppliers: [] as any[],
  });

  // Load lookups and product details
  useEffect(() => {
    if (!open || !productId) return;
    const activeProductId = productId;

    let mounted = true;

    async function loadData() {
      try {
        setFetching(true);
        setErrors({});

        // 1. Fetch lookup lists
        const lookupRes = await fetch("/api/inventory/lookups");
        const lookups = await lookupRes.json();

        // 2. Fetch specific product details (including variants)
        const product = await fetchProductDetails(activeProductId);

        if (!mounted) return;

        setOptions({
          categories: lookups.categories || [],
          brands: lookups.brands || [],
          suppliers: lookups.suppliers || [],
        });

        // 3. Map values to form states
        const activeVariant = product.variants?.[0] || null;

        setForm({
          name: product.name || "",
          categoryId: product.categoryId || "",
          brandId: product.brandId || "",
          unit: product.unit || "BAG",
          purchaseUnit: product.purchaseUnit || "",
          purchaseConversionFactor: product.purchaseConversionFactor ? Number(product.purchaseConversionFactor) : 1,
          altSalesUnit: product.altSalesUnit || "",
          altSalesConversionFactor: product.altSalesConversionFactor ? Number(product.altSalesConversionFactor) : 1,
          description: product.description || "",
          minStockLevel: product.minStockLevel ?? 0,
          reorderLevel: product.reorderLevel ?? 0,
          supplierId: activeVariant?.supplierId || "",
          purchasePrice: activeVariant ? Number(activeVariant.purchasePrice) : 0,
          retailPrice: activeVariant ? Number(activeVariant.retailPrice) : 0,
          wholesalePrice: activeVariant ? Number(activeVariant.wholesalePrice) : 0,
          projectPrice: activeVariant ? Number(activeVariant.projectPrice) : 0,
        });

      } catch (err: any) {
        console.error("Failed to load product details", err);
        toast.error("Failed to retrieve product details.");
      } finally {
        if (mounted) setFetching(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [open, productId]);

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((s) => ({ ...s, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function validate() {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Product name is required";
    if (!form.categoryId) newErrors.categoryId = "Please select a category";
    if (!form.brandId) newErrors.brandId = "Please select a brand";
    if (!form.unit) newErrors.unit = "Please select a unit";
    if (form.minStockLevel < 0) newErrors.minStockLevel = "Cannot be negative";
    if (form.reorderLevel < 0) newErrors.reorderLevel = "Cannot be negative";

    // If they configure pricing, make sure it is complete
    if (form.supplierId) {
      if (form.purchasePrice <= 0) newErrors.purchasePrice = "Must be > 0";
      if (form.retailPrice <= 0) newErrors.retailPrice = "Must be > 0";
      if (form.wholesalePrice <= 0) newErrors.wholesalePrice = "Must be > 0";
      if (form.projectPrice <= 0) newErrors.projectPrice = "Must be > 0";
    }

    if (form.purchaseUnit && (!form.purchaseConversionFactor || form.purchaseConversionFactor <= 0)) {
      newErrors.purchaseConversionFactor = "Conversion factor must be greater than 0";
    }
    if (form.altSalesUnit && (!form.altSalesConversionFactor || form.altSalesConversionFactor <= 0)) {
      newErrors.altSalesConversionFactor = "Conversion factor must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !productId) return;

    try {
      setLoading(true);
      await updateInventoryProduct(productId, {
        name: form.name,
        categoryId: form.categoryId,
        brandId: form.brandId,
        unit: form.unit,
        purchaseUnit: form.purchaseUnit || undefined,
        purchaseConversionFactor: form.purchaseUnit ? Number(form.purchaseConversionFactor) : undefined,
        altSalesUnit: form.altSalesUnit || undefined,
        altSalesConversionFactor: form.altSalesUnit ? Number(form.altSalesConversionFactor) : undefined,
        description: form.description || undefined,
        minStockLevel: form.minStockLevel,
        reorderLevel: form.reorderLevel,
        supplierId: form.supplierId || undefined,
        purchasePrice: form.supplierId ? form.purchasePrice : undefined,
        retailPrice: form.supplierId ? form.retailPrice : undefined,
        wholesalePrice: form.supplierId ? form.wholesalePrice : undefined,
        projectPrice: form.supplierId ? form.projectPrice : undefined,
      });

      toast.success("Product specifications and pricing matrices successfully updated.");
      onOpenChange(false);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update product details.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-primary" />
            Edit Product Specifications
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400 font-medium pl-7">
            Modify product configurations, stock reorder bounds, and active supplier price lists.
          </DialogDescription>
        </DialogHeader>

        {fetching ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm font-bold text-zinc-500">Loading catalog variables...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            {/* Step 1: Basic Specifications */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-900 pb-2">
                1. Basic Item Details
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="edit-name" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Product Name</Label>
                  <Input
                    id="edit-name"
                    placeholder="e.g. Waterproofing Compound Premium"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800"
                    required
                    disabled={loading}
                  />
                  {errors.name && <span className="text-xs text-rose-500 font-medium">{errors.name}</span>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-categoryId" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Category</Label>
                  <select
                    id="edit-categoryId"
                    value={form.categoryId}
                    onChange={(e) => update("categoryId", e.target.value)}
                    className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-zinc-950"
                    required
                    disabled={loading}
                  >
                    <option value="">Select Category</option>
                    {options.categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {errors.categoryId && <span className="text-xs text-rose-500 font-medium">{errors.categoryId}</span>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-brandId" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Brand</Label>
                  <select
                    id="edit-brandId"
                    value={form.brandId}
                    onChange={(e) => update("brandId", e.target.value)}
                    className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-zinc-950"
                    required
                    disabled={loading}
                  >
                    <option value="">Select Brand</option>
                    {options.brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  {errors.brandId && <span className="text-xs text-rose-500 font-medium">{errors.brandId}</span>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-unit" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Unit of Measurement</Label>
                  <select
                    id="edit-unit"
                    value={form.unit}
                    onChange={(e) => update("unit", e.target.value)}
                    className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-zinc-950"
                    required
                    disabled={loading}
                  >
                    {["BAG", "PCS", "METER", "KG", "LITRE", "SQ_FT", "ROLL", "BOX", "CARTON", "TIN", "DRUM", "SHEET", "BUNDLE", "SET", "PAIR", "FEET", "TON"].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  {errors.unit && <span className="text-xs text-rose-500 font-medium">{errors.unit}</span>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-reorderLevel" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Reorder Alert Threshold</Label>
                  <Input
                    id="edit-reorderLevel"
                    type="number"
                    value={form.reorderLevel}
                    onChange={(e) => update("reorderLevel", Math.max(0, Number(e.target.value)))}
                    className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800"
                    disabled={loading}
                  />
                  {errors.reorderLevel && <span className="text-xs text-rose-500 font-medium">{errors.reorderLevel}</span>}
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
                        <Label htmlFor="edit-purchaseUnit" className="text-[11px] font-bold text-zinc-500 uppercase">
                          Purchase Unit
                        </Label>
                        <select
                          id="edit-purchaseUnit"
                          value={form.purchaseUnit || ""}
                          onChange={(e) => update("purchaseUnit", e.target.value || "")}
                          className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 bg-white dark:bg-zinc-950"
                          disabled={loading}
                        >
                          <option value="">Same as Base ({form.unit})</option>
                          {["BAG", "PCS", "METER", "KG", "LITRE", "SQ_FT", "ROLL", "BOX", "CARTON", "TIN", "DRUM", "SHEET", "BUNDLE", "SET", "PAIR", "FEET", "TON"].map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                      {form.purchaseUnit && form.purchaseUnit !== form.unit && (
                        <div className="space-y-1.5 animate-fadeIn">
                          <Label htmlFor="edit-purchaseConversionFactor" className="text-[11px] font-bold text-zinc-500 uppercase">
                            Conversion Factor (1 {form.purchaseUnit} = X {form.unit})
                          </Label>
                          <Input
                            id="edit-purchaseConversionFactor"
                            type="number"
                            step="any"
                            placeholder="e.g. 10"
                            value={form.purchaseConversionFactor}
                            onChange={(e) => update("purchaseConversionFactor", parseFloat(e.target.value) || "")}
                            className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800 font-mono"
                            disabled={loading}
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
                        <Label htmlFor="edit-altSalesUnit" className="text-[11px] font-bold text-zinc-500 uppercase">
                          Sales Unit
                        </Label>
                        <select
                          id="edit-altSalesUnit"
                          value={form.altSalesUnit || ""}
                          onChange={(e) => update("altSalesUnit", e.target.value || "")}
                          className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 bg-white dark:bg-zinc-950"
                          disabled={loading}
                        >
                          <option value="">Same as Base ({form.unit})</option>
                          {["BAG", "PCS", "METER", "KG", "LITRE", "SQ_FT", "ROLL", "BOX", "CARTON", "TIN", "DRUM", "SHEET", "BUNDLE", "SET", "PAIR", "FEET", "TON"].map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                      {form.altSalesUnit && form.altSalesUnit !== form.unit && (
                        <div className="space-y-1.5 animate-fadeIn">
                          <Label htmlFor="edit-altSalesConversionFactor" className="text-[11px] font-bold text-zinc-500 uppercase">
                            Conversion Factor (1 {form.altSalesUnit} = X {form.unit})
                          </Label>
                          <Input
                            id="edit-altSalesConversionFactor"
                            type="number"
                            step="any"
                            placeholder="e.g. 10"
                            value={form.altSalesConversionFactor}
                            onChange={(e) => update("altSalesConversionFactor", parseFloat(e.target.value) || "")}
                            className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800 font-mono"
                            disabled={loading}
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
                  <Label htmlFor="edit-description" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Description (Optional)</Label>
                  <textarea
                    id="edit-description"
                    placeholder="Product specifications..."
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    className="w-full min-h-16 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-transparent text-zinc-900 dark:text-zinc-50 bg-white dark:bg-zinc-950"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Pricing Variants */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-900 pb-2">
                2. Active Supplier Pricing Configurations
              </h3>

              <div className="p-4 border border-zinc-100 dark:border-zinc-900 rounded-2xl bg-zinc-50/40 dark:bg-zinc-900/30 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Supplier / Vendor</Label>
                    <select
                      value={form.supplierId}
                      onChange={(e) => update("supplierId", e.target.value)}
                      className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-zinc-950"
                      disabled={loading}
                    >
                      <option value="">Configure Supplier (Optional)</option>
                      {options.suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    {errors.supplierId && (
                      <span className="text-xs text-rose-500 font-medium">{errors.supplierId}</span>
                    )}
                  </div>

                  {form.supplierId && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Purchase Cost (NPR)</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={form.purchasePrice}
                          onChange={(e) => update("purchasePrice", Math.max(0, Number(e.target.value)))}
                          className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800 font-mono"
                          disabled={loading}
                        />
                        {errors.purchasePrice && (
                          <span className="text-xs text-rose-500 font-medium">{errors.purchasePrice}</span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Retail Sell Price (NPR)</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={form.retailPrice}
                          onChange={(e) => update("retailPrice", Math.max(0, Number(e.target.value)))}
                          className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800 font-mono"
                          disabled={loading}
                        />
                        {errors.retailPrice && (
                          <span className="text-xs text-rose-500 font-medium">{errors.retailPrice}</span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Wholesale Price (NPR)</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={form.wholesalePrice}
                          onChange={(e) => update("wholesalePrice", Math.max(0, Number(e.target.value)))}
                          className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800 font-mono"
                          disabled={loading}
                        />
                        {errors.wholesalePrice && (
                          <span className="text-xs text-rose-500 font-medium">{errors.wholesalePrice}</span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Project Contract Price (NPR)</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={form.projectPrice}
                          onChange={(e) => update("projectPrice", Math.max(0, Number(e.target.value)))}
                          className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800 font-mono"
                          disabled={loading}
                        />
                        {errors.projectPrice && (
                          <span className="text-xs text-rose-500 font-medium">{errors.projectPrice}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-zinc-100 dark:border-zinc-900">
              <div className="flex items-center gap-2 justify-end w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="h-10 px-4 rounded-xl text-zinc-600 font-bold border-zinc-200 dark:border-zinc-800"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-10 px-5 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-primary/20"
                  disabled={loading}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Save size={16} />
                  Save Changes
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default EditProductModal;
