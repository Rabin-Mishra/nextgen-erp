"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { INVOICE_COLORS } from "@/lib/constants";
import { formatNPR } from "@/lib/utils";
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
                  <tr className="border-b bg-zinc-50">
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Rate</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">{item.productName}</td>
                      <td className="px-3 py-2 text-right">{item.qty}</td>
                      <td className="px-3 py-2 text-right">{formatNPR(Number(item.unitPrice))}</td>
                      <td className="px-3 py-2 text-right">{formatNPR(Number(item.totalPrice))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="ml-auto mt-6 w-full max-w-sm space-y-2 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatNPR(Number(invoice.subtotal))}</span></div>
                <div className="flex justify-between"><span>Discount</span><span>{formatNPR(Number(invoice.discountAmount))}</span></div>
                <div className="flex justify-between"><span>VAT</span><span>{formatNPR(Number(invoice.vatAmount))}</span></div>
                <div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Total</span><span>{formatNPR(Number(invoice.totalAmount))}</span></div>
              </div>
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
          <Button variant="outline" onClick={() => alert("Email features pending SMTP setup.")}>
            Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
