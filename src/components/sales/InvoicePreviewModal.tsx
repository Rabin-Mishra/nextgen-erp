"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { INVOICE_COLORS } from "@/lib/constants";
import { formatAmountOnly } from "@/lib/utils";
import type { SalesInvoiceSchema } from "@/modules/sales/types";
import { generateInvoicePDF } from "@/lib/invoice-pdf";

interface InvoicePreviewModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  invoice?: SalesInvoiceSchema | null;
}

export function InvoicePreviewModal({ open = false, onOpenChange, invoice }: InvoicePreviewModalProps) {
  const [downloading, setDownloading] = useState(false);
  const headerColor = invoice ? INVOICE_COLORS[invoice.invoiceType] : INVOICE_COLORS.RETAIL;

  // Aggregate returns by product variant/ID for detailed row breakdown
  const returnsByProduct = new Map<
    string,
    {
      qty: number;
      totalPrice: number;
      details: Array<{ returnNumber: string; qty: number; notes: string | null }>;
    }
  >();

  if (invoice && invoice.returns) {
    for (const ret of invoice.returns) {
      for (const item of ret.items) {
        const existing = returnsByProduct.get(item.productId) || { qty: 0, totalPrice: 0, details: [] };
        existing.qty += item.qty;
        existing.totalPrice += Number(item.totalPrice);
        existing.details.push({
          returnNumber: ret.returnNumber,
          qty: item.qty,
          notes: ret.notes,
        });
        returnsByProduct.set(item.productId, existing);
      }
    }
  }

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      const blob = await generateInvoicePDF(invoice);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoice.invoiceNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate PDF", err);
      alert("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] max-w-[98vw] h-[95vh] flex flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice Preview</DialogTitle>
          <DialogDescription className="sr-only">
            Preview of Sales Invoice details including buyer info, items, rates, taxes, and subtotal.
          </DialogDescription>
        </DialogHeader>

        {invoice ? (
          <div className="overflow-hidden rounded-lg border bg-white text-zinc-950">
            <div className="p-6 text-white" style={{ backgroundColor: headerColor }}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">NextGen Interior And WaterProofing</h2>
                  <p className="text-sm opacity-90">PAN: 122782202 | Phone: 9843146474</p>
                  <p className="text-sm opacity-90">Gauradaha Nagarpalika-02, Jhapa</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm uppercase opacity-80">Invoice</p>
                  <p className="text-xl font-semibold">{invoice.invoiceNumber}</p>
                  <p className="text-sm opacity-90">{invoice.invoiceType}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">Bill To</p>
                <p className="mt-1 font-semibold">{invoice.customerName}</p>
                <p className="text-sm text-zinc-600">{invoice.customerAddress || "Address not provided"}</p>
                <p className="text-sm text-zinc-600">PAN: {invoice.customerPanNumber || "-"}</p>
              </div>
              <div className="text-sm sm:text-right">
                <p>Invoice Date: {new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</p>
                <p>Due Date: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN") : "-"}</p>
                <p>Status: {invoice.status}</p>
              </div>
            </div>

            <div className="px-6 pb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-zinc-50 text-zinc-700">
                    <th className="px-3 py-2.5 text-left font-semibold">Item & Returns Description</th>
                    <th className="px-3 py-2.5 text-center font-semibold w-32">Alternate Unit</th>
                    <th className="px-3 py-2.5 text-right font-semibold w-36">Qty</th>
                    <th className="px-3 py-2.5 text-right font-semibold w-28">Rate (NPR)</th>
                    <th className="px-3 py-2.5 text-right font-semibold w-36">Total (NPR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {invoice.items.map((item) => {
                    const retInfo = returnsByProduct.get(item.productId);
                    const isFullyReturned = retInfo && retInfo.qty >= item.qty;

                    return (
                      <tr
                        key={item.id}
                        className={`align-top hover:bg-zinc-50/50 transition-colors ${
                          isFullyReturned ? "bg-rose-50/20" : ""
                        }`}
                      >
                        <td className="px-3 py-3">
                          <div className="font-medium text-zinc-900 flex items-center gap-2 flex-wrap">
                            <span>{item.productName}</span>
                            {isFullyReturned && (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-150/50 px-2 py-0.5 rounded border border-rose-200">
                                Fully Returned
                              </span>
                            )}
                            {retInfo && !isFullyReturned && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-150/40 px-2 py-0.5 rounded border border-amber-200">
                                Partially Returned
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                            SKU: {item.productCode} {item.notes ? `| Notes: ${item.notes}` : ""}
                          </div>

                          {/* Render exact return transactions matching this product line */}
                          {retInfo && retInfo.details.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {retInfo.details.map((d, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50/60 px-2 py-0.5 rounded border border-rose-100/50 w-fit"
                                >
                                  <span className="font-mono text-[9px] font-bold text-rose-800 bg-rose-100 px-1.5 py-0.2 rounded">
                                    {d.returnNumber}
                                  </span>
                                  <span>
                                    Returned: -{d.qty} {item.productUnit}{" "}
                                    {d.notes ? `— "${d.notes}"` : ""}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-3 text-center text-zinc-700 text-xs font-medium">
                          {item.productAltSalesUnit && item.productAltSalesUnit !== item.productBaseUnit ? (
                            <span>
                              1 {item.productAltSalesUnit} = {Number(item.productAltSalesConversionFactor)} {item.productBaseUnit}
                            </span>
                          ) : (
                            <span className="text-zinc-400 italic">—</span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-right">
                          {retInfo ? (
                            <div className="flex flex-col font-mono text-xs gap-0.5">
                              <span className="text-zinc-400 line-through">
                                {item.qty} {item.productUnit}
                              </span>
                              <span className="text-rose-650 font-medium">
                                -{retInfo.qty} {item.productUnit}
                              </span>
                              <span className="font-bold text-zinc-900 border-t border-dashed border-zinc-200 pt-0.5 mt-0.5">
                                {item.qty - retInfo.qty} {item.productUnit}
                              </span>
                            </div>
                          ) : (
                            <span className="font-mono text-zinc-900">
                              {item.qty} {item.productUnit}
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-right font-mono text-zinc-900">
                          {formatAmountOnly(Number(item.unitPrice))}
                        </td>

                        <td className="px-3 py-3 text-right">
                          {retInfo ? (
                            <div className="flex flex-col font-mono text-xs gap-0.5">
                              <span className="text-zinc-400 line-through">
                                {formatAmountOnly(Number(item.totalPrice))}
                              </span>
                              <span className="text-rose-650 font-medium">
                                -{formatAmountOnly(retInfo.totalPrice)}
                              </span>
                              <span className="font-bold text-zinc-900 border-t border-dashed border-zinc-200 pt-0.5 mt-0.5">
                                {formatAmountOnly(Number(item.totalPrice) - retInfo.totalPrice)}
                              </span>
                            </div>
                          ) : (
                            <span className="font-mono text-zinc-900">
                              {formatAmountOnly(Number(item.totalPrice))}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Summary Calculations */}
              {(() => {
                const totalReturned = invoice.returns
                  ? invoice.returns.reduce((sum, ret) => sum + Number(ret.totalAmount), 0)
                  : 0;

                const netTotal = Number(invoice.totalAmount);
                const originalTotal = netTotal + totalReturned;

                const originalSubtotal = Number(invoice.subtotal);
                const originalDiscountAmount = Number(invoice.discountAmount);
                const originalVatAmount = Number(invoice.vatAmount);

                return (
                  <div className="ml-auto mt-6 w-full max-w-sm space-y-2 text-sm border-t pt-4">
                    <div className="flex justify-between text-zinc-500">
                      <span>Original Subtotal</span>
                      <span>{formatAmountOnly(originalSubtotal)}</span>
                    </div>
                    {originalDiscountAmount > 0 && (
                      <div className="flex justify-between text-zinc-500">
                        <span>Original Discount</span>
                        <span>{formatAmountOnly(originalDiscountAmount)}</span>
                      </div>
                    )}
                    {originalVatAmount > 0 && (
                      <div className="flex justify-between text-zinc-500">
                        <span>Original VAT ({invoice.vatPercent}%)</span>
                        <span>{formatAmountOnly(originalVatAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-b pb-2 font-semibold text-zinc-800">
                      <span>Original Total</span>
                      <span>{formatAmountOnly(originalTotal)}</span>
                    </div>

                    {totalReturned > 0 && (
                      <>
                        <div className="flex justify-between text-rose-600 font-semibold">
                          <span>Total Returned (incl. VAT)</span>
                          <span>-{formatAmountOnly(totalReturned)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 text-base font-bold text-zinc-900 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200 shadow-sm">
                          <span>Net Invoice Value</span>
                          <span className="font-mono">{formatAmountOnly(netTotal)}</span>
                        </div>
                      </>
                    )}

                    {totalReturned === 0 && (
                      <div className="flex justify-between border-t pt-2 text-base font-bold text-zinc-900 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200 shadow-sm">
                        <span>Total Amount</span>
                        <span className="font-mono">{formatAmountOnly(netTotal)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-xs text-zinc-500 px-2 pt-1">
                      <span>Amount Paid</span>
                      <span>{formatAmountOnly(Number(invoice.paidAmount))}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-orange-600 px-2">
                      <span>Balance Due</span>
                      <span className="font-mono">{formatAmountOnly(Number(invoice.balanceAmount))}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="border-t bg-zinc-50 p-4 text-center text-sm text-zinc-600">
              Payment Method: {invoice.paymentMethod || "-"} | Thank you for your business.
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No invoice selected.</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => window.print()}>Print</Button>
          <Button variant="outline" onClick={handleDownloadPDF} disabled={downloading}>
            {downloading ? "Generating..." : "Download PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
