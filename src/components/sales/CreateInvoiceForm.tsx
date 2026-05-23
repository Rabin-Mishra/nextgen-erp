"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { INVOICE_COLORS, VAT_RATE } from "@/lib/constants";
import { formatNPR } from "@/lib/utils";
import { createInvoice } from "@/modules/sales/actions";
import { createInvoiceSchema } from "@/modules/sales/types";
import type { CustomerOptionSchema, ProductOptionSchema, ProjectOptionSchema, WarehouseOptionSchema } from "@/modules/sales/types";
import { toast } from "sonner";

type InvoiceType = "RETAIL" | "WHOLESALE" | "PROJECT";

type LineItem = {
  id: string;
  productId: string;
  warehouseId: string;
  qty: number;
  unitPrice: number;
  discountPercent: number;
};

interface CreateInvoiceFormProps {
  customers: CustomerOptionSchema[];
  products: ProductOptionSchema[];
  projects: ProjectOptionSchema[];
  warehouses: WarehouseOptionSchema[];
}

function priceForType(product: ProductOptionSchema | undefined, invoiceType: InvoiceType) {
  if (!product) return 0;
  if (invoiceType === "RETAIL") return Number(product.retailPrice);
  if (invoiceType === "WHOLESALE") return Number(product.wholesalePrice);
  return Number(product.projectPrice);
}

export function CreateInvoiceForm({ customers, products, projects, warehouses }: CreateInvoiceFormProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("RETAIL");
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [projectId, setProjectId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [items, setItems] = useState<LineItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [vatEnabled, setVatEnabled] = useState(true);
  const [paymentNow, setPaymentNow] = useState(0);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const selectedCustomer = customers.find((customer) => customer.id === customerId);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const gross = item.qty * item.unitPrice;
      return sum + gross - gross * (item.discountPercent / 100);
    }, 0);
    const discountAmount = subtotal * (discountPercent / 100);
    const taxable = subtotal - discountAmount;
    const vatAmount = vatEnabled ? taxable * VAT_RATE : 0;
    const total = taxable + vatAmount;
    return { subtotal, discountAmount, vatAmount, total, balance: Math.max(0, total - paymentNow) };
  }, [discountPercent, items, paymentNow, vatEnabled]);

  const addLine = () => {
    const product = products[0];
    const warehouseId = product?.stockByWarehouse[0]?.warehouseId ?? warehouses[0]?.id ?? "";
    setItems((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        productId: product?.id ?? "",
        warehouseId,
        qty: 1,
        unitPrice: priceForType(product, invoiceType),
        discountPercent: 0,
      },
    ]);
  };

  const updateLine = (id: string, patch: Partial<LineItem>) => {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        if (patch.productId) {
          const product = products.find((candidate) => candidate.id === patch.productId);
          next.unitPrice = priceForType(product, invoiceType);
          next.warehouseId = product?.stockByWarehouse[0]?.warehouseId ?? next.warehouseId;
        }
        return next;
      })
    );
  };

  const availableQty = (item: LineItem) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return product?.stockByWarehouse.find((stock) => stock.warehouseId === item.warehouseId)?.availableQty ?? 0;
  };

  const handleSubmit = () => {
    setError("");
    
    // 1. Prepare raw form payload
    const payload = {
      customerId,
      invoiceType,
      projectId: invoiceType === "PROJECT" ? projectId || undefined : undefined,
      invoiceDate,
      dueDate: dueDate || undefined,
      paymentMethod: paymentMethod as any,
      discountPercent: Number(discountPercent),
      vatPercent: vatEnabled ? 13 : 0,
      notes: notes || undefined,
      initialPaymentAmount: Number(paymentNow),
      initialPaymentMethod: paymentNow > 0 ? (paymentMethod as any) : undefined,
      items: items.map((item) => ({
        productId: item.productId,
        warehouseId: item.warehouseId,
        qty: Number(item.qty),
        unitPrice: Number(item.unitPrice),
        discountPercent: Number(item.discountPercent),
      })),
    };

    // 2. Client-side Zod schema validation
    const parsed = createInvoiceSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const errorMsg = Object.entries(fieldErrors)
        .map(([field, errs]) => `${field}: ${errs?.join(", ")}`)
        .join(" | ") || "Form validation failed.";
      setError(errorMsg);
      toast.error(`Validation Failed: ${errorMsg}`);
      return;
    }

    // 3. Dynamic stock check
    const invalidStock = items.find((item) => item.qty > availableQty(item));
    if (invalidStock) {
      const prodName = products.find((p) => p.id === invalidStock.productId)?.name || "Item";
      setError(`Stock bounds exceeded for ${prodName}.`);
      toast.error(`Stock levels exceeded for ${prodName}.`);
      return;
    }

    startTransition(async () => {
      try {
        await createInvoice(parsed.data);
        toast.success("Sales invoice created successfully!");
        setOpen(false);
        setStep(1);
        setItems([]);
        setDiscountPercent(0);
        setPaymentNow(0);
        setNotes("");
        router.refresh();
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Could not create invoice.";
        setError(errMsg);
        toast.error(`Error: ${errMsg}`);
      }
    });
  };

  const stepClasses = (currentStep: number) =>
    `h-8 rounded-lg px-3 text-sm font-medium ${step === currentStep ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"}`;

  return (
    <>
      <Button onClick={() => setOpen(true)}>New Invoice</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[98vw] max-w-[98vw] h-[95vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Create Sales Invoice</DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setStep(1)} className={stepClasses(1)}>1. Setup</button>
            <button type="button" onClick={() => setStep(2)} className={stepClasses(2)}>2. Items</button>
            <button type="button" onClick={() => setStep(3)} className={stepClasses(3)}>3. Totals</button>
          </div>

          <div className="flex-1 overflow-y-auto grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-5">
              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {(["RETAIL", "WHOLESALE", "PROJECT"] as InvoiceType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setInvoiceType(type);
                          setItems((current) =>
                            current.map((item) => ({
                              ...item,
                              unitPrice: priceForType(products.find((product) => product.id === item.productId), type),
                            }))
                          );
                        }}
                        className={`rounded-lg border p-3 text-left ${invoiceType === type ? "ring-2 ring-offset-2" : ""}`}
                        style={{ borderColor: INVOICE_COLORS[type], boxShadow: invoiceType === type ? `0 0 0 2px ${INVOICE_COLORS[type]}` : undefined }}
                      >
                        <span className="text-sm font-semibold" style={{ color: INVOICE_COLORS[type] }}>{type}</span>
                        <p className="mt-1 text-xs text-zinc-500">{type === "RETAIL" ? "Walk-in sales" : type === "WHOLESALE" ? "Reseller billing" : "Project materials"}</p>
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Customer</label>
                      <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm">
                        <option value="">Select customer</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>{customer.name} ({customer.customerType})</option>
                        ))}
                      </select>
                    </div>
                    {invoiceType === "PROJECT" && (
                      <div>
                        <label className="text-sm font-medium">Project</label>
                        <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm">
                          <option value="">Select project</option>
                          {projects.map((project) => (
                            <option key={project.id} value={project.id}>{project.projectCode} - {project.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium">Invoice Date</label>
                      <Input type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Due Date</label>
                      <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Payment Method</label>
                      <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm">
                        <option value="CASH">Cash</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="CREDIT">Credit</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="ESEWA">eSewa</option>
                        <option value="KHALTI">Khalti</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Invoice Items</h3>
                    <Button type="button" variant="outline" onClick={addLine}>Add Item</Button>
                  </div>
                  {items.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-8 text-center text-sm text-zinc-500">No items added yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {items.map((item) => {
                        const product = products.find((candidate) => candidate.id === item.productId);
                        const stockQty = availableQty(item);
                        return (
                          <div key={item.id} className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[1.5fr_1fr_80px_110px_90px_100px_auto] lg:items-end">
                            <div>
                              <label className="text-xs font-medium text-zinc-500">Product</label>
                              <select value={item.productId} onChange={(event) => updateLine(item.id, { productId: event.target.value })} className="h-9 w-full rounded-lg border bg-background px-3 text-sm">
                                {products.map((candidate) => (
                                  <option key={candidate.id} value={candidate.id}>{candidate.code} - {candidate.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-zinc-500">Warehouse</label>
                              <select value={item.warehouseId} onChange={(event) => updateLine(item.id, { warehouseId: event.target.value })} className="h-9 w-full rounded-lg border bg-background px-3 text-sm">
                                {(product?.stockByWarehouse.length ? product.stockByWarehouse : warehouses.map((warehouse) => ({ warehouseId: warehouse.id, warehouseName: warehouse.name, availableQty: 0 }))).map((stock) => (
                                  <option key={stock.warehouseId} value={stock.warehouseId}>{stock.warehouseName}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-zinc-500">Qty</label>
                              <Input type="number" min={1} value={item.qty} onChange={(event) => updateLine(item.id, { qty: Number(event.target.value) })} />
                              <p className={item.qty > stockQty ? "mt-1 text-xs text-red-600" : "mt-1 text-xs text-zinc-500"}>{stockQty} available</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-zinc-500">Unit Price</label>
                              <Input type="number" value={item.unitPrice} onChange={(event) => updateLine(item.id, { unitPrice: Number(event.target.value) })} />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-zinc-500">Disc %</label>
                              <Input type="number" value={item.discountPercent} onChange={(event) => updateLine(item.id, { discountPercent: Number(event.target.value) })} />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-zinc-500">Line Total</label>
                              <p className="h-9 pt-2 text-sm font-semibold">{formatNPR(Math.max(0, item.qty * item.unitPrice * (1 - item.discountPercent / 100)))}</p>
                            </div>
                            <Button type="button" variant="outline" onClick={() => setItems((current) => current.filter((candidate) => candidate.id !== item.id))}>Remove</Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Invoice Discount %</label>
                      <Input type="number" value={discountPercent} onChange={(event) => setDiscountPercent(Number(event.target.value))} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Payment Received Now</label>
                      <Input type="number" value={paymentNow} max={totals.total} onChange={(event) => setPaymentNow(Number(event.target.value))} />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={vatEnabled} onChange={(event) => setVatEnabled(event.target.checked)} />
                    Apply Nepal VAT 13%
                  </label>
                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <aside className="rounded-lg border bg-zinc-50 p-4 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase text-zinc-500">Live Preview</p>
              <div className="mt-3 rounded-md p-3 text-white" style={{ backgroundColor: INVOICE_COLORS[invoiceType] }}>
                <p className="text-sm font-semibold">NextGen Interior And WaterProofing</p>
                <p className="text-xs opacity-90">{invoiceType} Invoice</p>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span>Customer</span><span className="font-medium">{selectedCustomer?.name ?? "-"}</span></div>
                <div className="flex justify-between"><span>Items</span><span>{items.length}</span></div>
                <div className="flex justify-between"><span>Subtotal</span><span>{formatNPR(totals.subtotal)}</span></div>
                <div className="flex justify-between"><span>Discount</span><span>{formatNPR(totals.discountAmount)}</span></div>
                <div className="flex justify-between"><span>VAT</span><span>{formatNPR(totals.vatAmount)}</span></div>
                <div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Total</span><span>{formatNPR(totals.total)}</span></div>
                <div className="flex justify-between text-amber-600"><span>Balance</span><span>{formatNPR(totals.balance)}</span></div>
              </div>
            </aside>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            {step > 1 && <Button variant="outline" onClick={() => setStep((current) => current - 1)}>Back</Button>}
            {step < 3 ? (
              <Button onClick={() => setStep((current) => current + 1)}>Next</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isPending}>{isPending ? "Creating..." : "Create Invoice"}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
