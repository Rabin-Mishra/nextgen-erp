"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNPR } from "@/lib/utils";
import { issueSupplySchema } from "@/modules/projects/types";
import { issueSupplyToProject } from "@/modules/projects/actions";
import { toast } from "sonner";
import { Trash2, Plus, Info } from "lucide-react";

interface IssueSupplyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  clientName: string;
  products: Array<{
    id: string;
    code: string;
    name: string;
    unit: string;
    purchaseUnit?: string | null;
    purchaseConversionFactor?: number | null;
    altSalesUnit?: string | null;
    altSalesConversionFactor?: number | null;
    projectPrice: string;
    stockByWarehouse: Array<{ warehouseId: string; warehouseName: string; availableQty: number }>;
  }>;
  warehouses: Array<{ id: string; name: string }>;
}

type LocalLineItem = {
  id: string;
  productId: string;
  qty: number;
  unitPrice: number;
  notes: string;
  salesUnit?: string;
  conversionFactor?: number;
};

export function IssueSupplyModal({
  open,
  onOpenChange,
  projectId,
  projectName,
  clientName,
  products,
  warehouses,
}: IssueSupplyModalProps) {
  const router = useRouter();
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LocalLineItem[]>([]);
  const [applyVat, setApplyVat] = useState(true);
  const [additionalExpenses, setAdditionalExpenses] = useState<Array<{
    id: string;
    type: "TRANSPORT" | "LABOUR" | "MISCELLANEOUS";
    amount: number;
    notes: string;
  }>>([]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const activeWarehouseName = warehouses.find((w) => w.id === warehouseId)?.name || "Warehouse";

  const getStockQty = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return 0;
    return product.stockByWarehouse.find((stock) => stock.warehouseId === warehouseId)?.availableQty ?? 0;
  };

  const getProductPrice = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    return product ? parseFloat(product.projectPrice) : 0;
  };

  const getProductUnit = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    return product ? product.unit : "PCS";
  };

  const addLine = () => {
    const product = products[0];
    if (!product) return;
    setItems((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        productId: product.id,
        qty: 1,
        unitPrice: parseFloat(product.projectPrice),
        notes: "",
        salesUnit: product.unit,
        conversionFactor: 1,
      },
    ]);
  };

  const updateLine = (id: string, patch: Partial<LocalLineItem>) => {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        if (patch.productId) {
          const product = products.find((p) => p.id === patch.productId);
          next.unitPrice = product ? parseFloat(product.projectPrice) : 0;
          next.salesUnit = product?.unit ?? "PCS";
          next.conversionFactor = 1;
        }
        return next;
      })
    );
  };

  const handleUnitChange = (id: string, newUnit: string) => {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const product = products.find((p) => p.id === item.productId);
        if (!product) return { ...item, salesUnit: newUnit };

        let factor = 1;
        if (newUnit === product.altSalesUnit) {
          factor = Number(product.altSalesConversionFactor) || 1;
        } else if (newUnit === product.purchaseUnit) {
          factor = Number(product.purchaseConversionFactor) || 1;
        }

        const basePrice = product ? parseFloat(product.projectPrice) : 0;
        const unitPrice = basePrice * factor;

        return {
          ...item,
          salesUnit: newUnit,
          conversionFactor: factor,
          unitPrice,
        };
      })
    );
  };

  const totalCostValue = useMemo(() => {
    return items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  }, [items]);

  const vatValue = useMemo(() => {
    return applyVat ? totalCostValue * 0.13 : 0;
  }, [totalCostValue, applyVat]);

  const additionalExpensesSum = useMemo(() => {
    return additionalExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [additionalExpenses]);

  const grandTotalValue = useMemo(() => {
    return totalCostValue + vatValue + additionalExpensesSum;
  }, [totalCostValue, vatValue, additionalExpensesSum]);

  const addAdditionalExpense = () => {
    setAdditionalExpenses((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        type: "TRANSPORT",
        amount: 0,
        notes: "",
      },
    ]);
  };

  const updateAdditionalExpense = (id: string, patch: Partial<{
    type: "TRANSPORT" | "LABOUR" | "MISCELLANEOUS";
    amount: number;
    notes: string;
  }>) => {
    setAdditionalExpenses((current) =>
      current.map((exp) => (exp.id === id ? { ...exp, ...patch } : exp))
    );
  };

  const removeAdditionalExpense = (id: string) => {
    setAdditionalExpenses((current) => current.filter((exp) => exp.id !== id));
  };

  const handleSubmit = () => {
    setError("");
    if (!warehouseId) {
      setError("Please select a source warehouse.");
      toast.error("Source warehouse is required.");
      return;
    }
    if (items.length === 0) {
      setError("Please add at least one line item dispatch.");
      toast.error("At least one line item must be issued.");
      return;
    }

    // Verify stock bounds
    for (const item of items) {
      const factor = item.conversionFactor ?? 1;
      const baseQtyEquivalent = item.qty * factor;
      const available = getStockQty(item.productId);
      if (baseQtyEquivalent > available) {
        const name = products.find((p) => p.id === item.productId)?.name || "Item";
        setError(`Insufficient stock for ${name} inside ${activeWarehouseName} (${baseQtyEquivalent} ${getProductUnit(item.productId)} requested vs ${available} available)`);
        toast.error(`Stock bounds exceeded for ${name}!`);
        return;
      }
    }

    const payload = {
      projectId,
      warehouseId,
      notes: notes || undefined,
      items: items.map((item) => ({
        productId: item.productId,
        qty: Number(item.qty),
        unitPrice: Number(item.unitPrice),
        notes: item.notes || undefined,
        salesUnit: item.salesUnit || undefined,
        conversionFactor: item.conversionFactor ? Number(item.conversionFactor) : undefined,
      })),
      applyVat,
      additionalExpenses: additionalExpenses.map((exp) => ({
        type: exp.type,
        amount: Number(exp.amount),
        notes: exp.notes || undefined,
      })),
    };

    // Client-side Zod validation
    const parsed = issueSupplySchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const errorMsg = Object.entries(fieldErrors)
        .map(([field, errs]) => `${field}: ${errs?.join(", ")}`)
        .join(" | ") || "Validation failed.";
      setError(errorMsg);
      toast.error(`Validation Failed: ${errorMsg}`);
      return;
    }

    startTransition(async () => {
      try {
        await issueSupplyToProject(parsed.data);
        toast.success(`Supplies issued successfully! INV raised and posted to ${clientName} ledger.`);
        onOpenChange(false);
        setItems([]);
        setNotes("");
        setAdditionalExpenses([]);
        setApplyVat(true);
        router.refresh();
      } catch (err: any) {
        const errMsg = err.message || "Failed to dispatch supplies.";
        setError(errMsg);
        toast.error(`Error: ${errMsg}`);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] max-w-[98vw] h-[95vh] flex flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Issue Inventory Supply to Project</DialogTitle>
          <DialogDescription className="sr-only">
            Form modal to issue specific inventory quantities to a construction project, creating a sales invoice and decreasing stock levels.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Project Site Details Context */}
          <div className="bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-xl border flex flex-col sm:flex-row justify-between gap-4 text-sm">
            <div>
              <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase block">Project Target</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">{projectName}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase block">Client Billed</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">{clientName}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase block">Invoicing Channel</span>
              <span className="font-bold text-purple-600 dark:text-purple-400 uppercase">PROJECT SALE (INV)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Source Inventory Warehouse *</label>
              <select
                value={warehouseId}
                onChange={(e) => {
                  setWarehouseId(e.target.value);
                  setItems([]); // Clear dispatches if source resets to force price variants & stock checks
                }}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-zinc-950"
              >
                <option value="">-- Select Source --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Dispatch Remarks / Notes</label>
              <Input
                placeholder="e.g. Challan #, driver name, site supervisor..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Line Item Dispatching list */}
          <div className="border rounded-xl p-4 bg-zinc-50/20 divide-y divide-zinc-100 dark:divide-zinc-800">
            <div className="flex justify-between items-center pb-3">
              <h3 className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Dispatched Supply Items</h3>
              <Button variant="outline" size="sm" onClick={addLine} disabled={!warehouseId}>
                + Add Supply
              </Button>
            </div>

            {!warehouseId ? (
              <p className="text-xs text-zinc-500 italic text-center py-4">Please select a source warehouse to begin adding supply items</p>
            ) : items.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">No supply items added yet</p>
            ) : (
              <div className="space-y-3 pt-3">
                {items.map((item) => {
                  const stock = getStockQty(item.productId);
                  const product = products.find((p) => p.id === item.productId);
                  const baseUnit = product?.unit ?? "PCS";
                  const factor = item.conversionFactor ?? 1;
                  const baseQtyEquivalent = item.qty * factor;
                  const isExceeded = baseQtyEquivalent > stock;

                  // Build unique unit options
                  const unitOptions = [];
                  if (product) {
                    unitOptions.push({ value: product.unit, label: product.unit });
                    if (product.altSalesUnit && product.altSalesUnit !== product.unit) {
                      unitOptions.push({ value: product.altSalesUnit, label: product.altSalesUnit });
                    }
                    if (product.purchaseUnit && product.purchaseUnit !== product.unit && product.purchaseUnit !== product.altSalesUnit) {
                      unitOptions.push({ value: product.purchaseUnit, label: product.purchaseUnit });
                    }
                  }

                  return (
                    <div key={item.id} className="grid grid-cols-12 gap-3 items-end pb-3 sm:pb-0 border-b pb-3 border-zinc-100 dark:border-zinc-800 last:border-0 last:pb-0">
                      {/* Product */}
                      <div className="col-span-12 sm:col-span-3">
                        <label className="text-[10px] text-zinc-500 block mb-0.5">Product *</label>
                        <select
                          value={item.productId}
                          onChange={(e) => updateLine(item.id, { productId: e.target.value })}
                          className="w-full border rounded-md px-3 py-1.5 text-xs bg-white dark:bg-zinc-950"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.code}] {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Dispatch Qty */}
                      <div className="col-span-6 sm:col-span-1.5 font-semibold">
                        <label className="text-[10px] text-zinc-500 block mb-0.5">Dispatch Qty *</label>
                        <Input
                          type="number"
                          value={item.qty}
                          min={1}
                          onChange={(e) => updateLine(item.id, { qty: Math.max(1, parseFloat(e.target.value) || 0) })}
                          className="h-8 text-xs font-semibold"
                        />
                        <div className="mt-1 space-y-1">
                          {isExceeded ? (
                            <span className="text-[9px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-1 py-0.5 rounded border border-red-200/50 block w-max">
                              Stock Exceeded!
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 px-1 py-0.5 rounded border border-teal-200/50 block w-max">
                              {stock} {baseUnit} av.
                            </span>
                          )}
                          {factor > 1 && (
                            <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-1 py-0.5 rounded border border-amber-200/50 block w-max">
                              equiv: {baseQtyEquivalent} {baseUnit}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Unit */}
                      <div className="col-span-6 sm:col-span-1.5 font-bold">
                        <label className="text-[10px] text-zinc-500 block mb-0.5">Unit</label>
                        <select
                          value={item.salesUnit || baseUnit}
                          onChange={(e) => handleUnitChange(item.id, e.target.value)}
                          className="w-full border rounded-md px-3 py-1.5 text-xs bg-white dark:bg-zinc-950 font-bold text-purple-750 dark:text-purple-400"
                        >
                          {unitOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Conv. Factor */}
                      <div className="col-span-6 sm:col-span-1.5 font-bold">
                        <label className="text-[10px] text-zinc-500 block mb-0.5">Conv. Factor</label>
                        <Input
                          type="number"
                          value={item.conversionFactor ?? 1}
                          readOnly
                          disabled
                          className="h-8 text-xs font-mono font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-150"
                        />
                        {factor > 1 && (
                          <span className="text-[9px] font-bold text-orange-600 dark:text-orange-400 mt-1 block">
                            1 {item.salesUnit} = {factor} {baseUnit}
                          </span>
                        )}
                      </div>

                      {/* Project Rate */}
                      <div className="col-span-6 sm:col-span-1.5">
                        <label className="text-[10px] text-zinc-500 block mb-0.5">Project Rate (NPR)</label>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          min={0}
                          onChange={(e) => updateLine(item.id, { unitPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                          className="h-8 text-xs"
                        />
                        <span className="text-[9px] text-zinc-400 block mt-1 font-mono">
                          per {item.salesUnit || baseUnit}
                        </span>
                      </div>

                      {/* Item Line Notes */}
                      <div className="col-span-10 sm:col-span-2">
                        <label className="text-[10px] text-zinc-500 block mb-0.5">Item Line Notes</label>
                        <Input
                          placeholder="e.g. standard specs, item notes..."
                          value={item.notes}
                          onChange={(e) => updateLine(item.id, { notes: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 sm:col-span-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setItems((curr) => curr.filter((i) => i.id !== item.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Additional Expenses Section */}
          <div className="border rounded-xl p-4 bg-zinc-50/20 divide-y divide-zinc-100 dark:divide-zinc-800">
            <div className="flex justify-between items-center pb-3">
              <h3 className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Additional Project Expenses</h3>
              <Button variant="outline" size="sm" onClick={addAdditionalExpense} disabled={!warehouseId}>
                + Add Expense
              </Button>
            </div>

            {additionalExpenses.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">No additional expenses added yet</p>
            ) : (
              <div className="space-y-3 pt-3">
                {additionalExpenses.map((exp) => (
                  <div key={exp.id} className="grid grid-cols-12 gap-3 items-end pb-3 sm:pb-0">
                    <div className="col-span-12 sm:col-span-4">
                      <label className="text-[10px] text-zinc-500 block mb-0.5">Expense Type *</label>
                      <select
                        value={exp.type}
                        onChange={(e) => updateAdditionalExpense(exp.id, { type: e.target.value as any })}
                        className="w-full border rounded-md px-3 py-1.5 text-xs bg-white dark:bg-zinc-950"
                      >
                        <option value="TRANSPORT">Transport Cost</option>
                        <option value="LABOUR">Labour Cost</option>
                        <option value="MISCELLANEOUS">Miscellaneous Cost</option>
                      </select>
                    </div>

                    <div className="col-span-12 sm:col-span-3">
                      <label className="text-[10px] text-zinc-500 block mb-0.5">Amount (NPR) *</label>
                      <Input
                        type="number"
                        value={exp.amount}
                        min={0}
                        onChange={(e) => updateAdditionalExpense(exp.id, { amount: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="h-8 text-xs"
                        placeholder="0"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-4">
                      <label className="text-[10px] text-zinc-500 block mb-0.5">Notes (Labour names, Vehicle No, etc.)</label>
                      <Input
                        placeholder="e.g. Vehicle BA-3-PA-1234, names of labourers..."
                        value={exp.notes}
                        onChange={(e) => updateAdditionalExpense(exp.id, { notes: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-1 flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeAdditionalExpense(exp.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Running Totals Visual */}
          <div className="border rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900 border-dashed space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">Items Subtotal (Material Cost):</span>
              <span className="font-semibold">{formatNPR(totalCostValue)}</span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="applyVatCheckbox"
                  checked={applyVat}
                  onChange={(e) => setApplyVat(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="applyVatCheckbox" className="text-zinc-500 cursor-pointer select-none text-xs font-medium">
                  Apply 13% VAT
                </label>
              </div>
              <span className="font-semibold">{formatNPR(vatValue)}</span>
            </div>

            {additionalExpenses.length > 0 && (
              <div className="border-t pt-2 space-y-1.5">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Additional Costs Breakdown</div>
                {additionalExpenses.map((exp) => {
                  const typeLabel = exp.type === "TRANSPORT" ? "Transport" : exp.type === "LABOUR" ? "Labour" : "Misc";
                  return (
                    <div key={exp.id} className="flex justify-between text-xs">
                      <span className="text-zinc-500">
                        • {typeLabel} Cost{exp.notes ? ` (${exp.notes})` : ""}:
                      </span>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{formatNPR(exp.amount)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between border-t pt-2 font-bold text-base text-zinc-900 dark:text-zinc-50">
              <span>Grand Total (Ledger Debit):</span>
              <span className="text-purple-600 dark:text-purple-400">{formatNPR(grandTotalValue)}</span>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}
        </div>

        <DialogFooter className="mt-4 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || items.length === 0} className="bg-purple-600 hover:bg-purple-700 text-white">
            {isPending ? "Issuing..." : "Confirm Dispatch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
