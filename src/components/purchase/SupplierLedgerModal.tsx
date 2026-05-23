"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useTransition } from "react";
import type { VendorLedgerEntrySchema } from "@/modules/purchase/types";
import { fetchSupplierLedger } from "@/modules/purchase/actions";
import { formatDate, formatNPR } from "@/lib/utils";
import { downloadLedgerPDF } from "@/lib/export/ledger-pdf";
import { downloadLedgerExcel } from "@/lib/export/ledger-excel";
import { toast } from "sonner";
import { Download, FileSpreadsheet } from "lucide-react";

interface SupplierLedgerModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  supplierId: string;
  supplierName?: string;
  supplierPan?: string;
  supplierPhone?: string;
}

export function SupplierLedgerModal({
  open: openProp,
  onOpenChange,
  supplierId,
  supplierName = "",
  supplierPan = "",
  supplierPhone = "",
}: SupplierLedgerModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [ledgerEntries, setLedgerEntries] = useState<VendorLedgerEntrySchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExportingPDF, startExportPDF] = useTransition();
  const [isExportingExcel, startExportExcel] = useTransition();

  const open = openProp !== undefined ? openProp : internalOpen;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setInternalOpen(v);
  };

  // Fetch supplier ledger dynamically
  useEffect(() => {
    if (open && supplierId) {
      (async () => {
        setLoading(true);
        try {
          const entries = await fetchSupplierLedger(supplierId);
          setLedgerEntries(entries);
        } catch (err) {
          console.error("Failed to load supplier ledger", err);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [open, supplierId]);

  const filteredEntries = ledgerEntries.filter((entry) => {
    const entryDate = new Date(entry.entryDate);
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;

    if (fromDate && entryDate < fromDate) return false;
    if (toDate && entryDate > toDate) return false;
    return true;
  });

  const handleExportPDF = () => {
    startExportPDF(async () => {
      try {
        const blob = await downloadLedgerPDF(
          supplierId,
          "SUPPLIER",
          dateFrom || undefined,
          dateTo || undefined,
          { name: supplierName, panNumber: supplierPan, phone: supplierPhone }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Supplier_Ledger_${supplierName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Supplier ledger PDF downloaded!");
      } catch (err: any) {
        toast.error(`PDF export failed: ${err.message || "Unknown error"}`);
      }
    });
  };

  const handleExportExcel = () => {
    startExportExcel(async () => {
      try {
        const blob = await downloadLedgerExcel(
          supplierId,
          "SUPPLIER",
          dateFrom || undefined,
          dateTo || undefined,
          { name: supplierName, panNumber: supplierPan, phone: supplierPhone }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Supplier_Ledger_${supplierName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Supplier ledger Excel downloaded!");
      } catch (err: any) {
        toast.error(`Excel export failed: ${err.message || "Unknown error"}`);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[98vw] max-w-[98vw] h-[95vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Supplier Ledger — {supplierName}</DialogTitle>
        </DialogHeader>

        {/* Supplier Info */}
        <div className="bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-lg grid grid-cols-3 gap-4 text-xs border shrink-0">
          <div>
            <p className="text-zinc-500 uppercase font-semibold mb-0.5">Supplier Name</p>
            <p className="font-bold text-sm text-zinc-900 dark:text-zinc-50">{supplierName}</p>
          </div>
          <div>
            <p className="text-zinc-500 uppercase font-semibold mb-0.5">PAN Number</p>
            <p className="font-mono font-semibold text-sm">{supplierPan || "—"}</p>
          </div>
          <div>
            <p className="text-zinc-500 uppercase font-semibold mb-0.5">Phone Contact</p>
            <p className="font-semibold text-sm">{supplierPhone || "—"}</p>
          </div>
        </div>

        {/* Date Filters */}
        <div className="flex gap-4 shrink-0">
          <div className="flex-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase block mb-1">From Date</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase block mb-1">To Date</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>

        {/* Ledger Table — scrollable area */}
        <div className="flex-1 overflow-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-b sticky top-0">
              <tr className="text-left font-medium">
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Description</th>
                <th className="px-4 py-2.5 text-right">Debit (Dr)</th>
                <th className="px-4 py-2.5 text-right">Credit (Cr)</th>
                <th className="px-4 py-2.5 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                    Loading supplier transactions...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 italic">
                    No ledger entries posted for this period.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 text-xs">
                    <td className="px-4 py-2">{formatDate(entry.entryDate)}</td>
                    <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">{entry.description}</td>
                    <td className="px-4 py-2 text-right font-medium text-red-600">
                      {parseFloat(entry.debit) !== 0 ? formatNPR(parseFloat(entry.debit)) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-zinc-900 dark:text-zinc-100">
                      {parseFloat(entry.credit) !== 0 ? formatNPR(parseFloat(entry.credit)) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-zinc-900 dark:text-zinc-100">
                      {formatNPR(parseFloat(entry.balance))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <DialogFooter className="border-t pt-4 shrink-0">
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={isExportingPDF || loading || filteredEntries.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExportingPDF ? "Generating..." : "Download PDF"}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={isExportingExcel || loading || filteredEntries.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {isExportingExcel ? "Generating..." : "Download Excel"}
          </Button>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
