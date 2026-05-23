"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      },
    ]);
  };

  const updateLine = (id: string, patch: Partial<LocalLineItem>) => {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        if (patch.productId) {
          next.unitPrice = getProductPrice(patch.productId);
        }
        return next;
      })
    );
  };

  const totalCostValue = useMemo(() => {
    return items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  }, [items]);

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
      const available = getStockQty(item.productId);
      if (item.qty > available) {
        const name = products.find((p) => p.id === item.productId)?.name || "Item";
        setError(`Insufficient stock for ${name} inside ${activeWarehouseName} (${item.qty} requested vs ${available} available)`);
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
                  const unit = getProductUnit(item.productId);
                  return (
                    <div key={item.id} className="grid grid-cols-12 gap-3 items-end pb-3 sm:pb-0">
                      <div className="col-span-12 sm:col-span-4">
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

                      <div className="col-span-4 sm:col-span-2">
                        <label className="text-[10px] text-zinc-500 block mb-0.5">Dispatch Qty *</label>
                        <Input
                          type="number"
                          value={item.qty}
                          min={1}
                          onChange={(e) => updateLine(item.id, { qty: Math.max(1, parseInt(e.target.value) || 0) })}
                          className="h-8 text-xs"
                        />
                        <span className={item.qty > stock ? "text-[9px] font-semibold text-red-500 block mt-0.5" : "text-[9px] text-zinc-400 block mt-0.5"}>
                          {stock} {unit} available
                        </span>
                      </div>

                      <div className="col-span-4 sm:col-span-2">
                        <label className="text-[10px] text-zinc-500 block mb-0.5">Project Rate (NPR)</label>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          min={0}
                          onChange={(e) => updateLine(item.id, { unitPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-3">
                        <label className="text-[10px] text-zinc-500 block mb-0.5">Item Line Notes</label>
                        <Input
                          placeholder="e.g. standard specs, item notes..."
                          value={item.notes}
                          onChange={(e) => updateLine(item.id, { notes: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="col-span-12 sm:col-span-1 flex justify-end">
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

          {/* Running Totals Visual */}
          <div className="border rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900 border-dashed space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Material Cost Value (Taxable):</span>
              <span className="font-semibold">{formatNPR(totalCostValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Project standard VAT (13%):</span>
              <span className="font-semibold">{formatNPR(totalCostValue * 0.13)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold text-base text-zinc-900 dark:text-zinc-50">
              <span>Total Billings Raised (Ledger Debit):</span>
              <span className="text-purple-600 dark:text-purple-400">{formatNPR(totalCostValue * 1.13)}</span>
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
