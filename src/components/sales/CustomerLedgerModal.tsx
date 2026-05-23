"use client";

import { useMemo, useState, useEffect, useTransition } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNPR, formatDate } from "@/lib/utils";
import type { CustomerLedgerEntrySchema } from "@/modules/sales/types";
import { fetchCustomerLedgerAction } from "@/modules/sales/actions";
import { downloadLedgerPDF } from "@/lib/export/ledger-pdf";
import { downloadLedgerExcel } from "@/lib/export/ledger-excel";
import { toast } from "sonner";
import { Download, FileSpreadsheet } from "lucide-react";

interface CustomerLedgerModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  customerId: string;
  customerName?: string;
}

export function CustomerLedgerModal({ open: openProp, onOpenChange, customerId, customerName = "" }: CustomerLedgerModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [channel, setChannel] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [ledgerEntries, setLedgerEntries] = useState<CustomerLedgerEntrySchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExportingPDF, startExportPDF] = useTransition();
  const [isExportingExcel, startExportExcel] = useTransition();

  const open = openProp ?? internalOpen;
  const setOpen = (value: boolean) => {
    onOpenChange?.(value);
    if (openProp === undefined) setInternalOpen(value);
  };

  // Fetch customer ledger on mount
  useEffect(() => {
    if (open && customerId) {
      (async () => {
        setLoading(true);
        try {
          const res = await fetchCustomerLedgerAction(customerId);
          setLedgerEntries(res);
        } catch (err) {
          console.error("Failed to load customer ledger", err);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [open, customerId]);

  const filteredEntries = useMemo(() => {
    return ledgerEntries.filter((entry) => {
      const entryDate = new Date(entry.entryDate);
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo) : null;

      if (channel !== "ALL" && entry.channelType !== channel) return false;
      if (fromDate && entryDate < fromDate) return false;
      if (toDate && entryDate > toDate) return false;
      return true;
    });
  }, [channel, ledgerEntries, dateFrom, dateTo]);

  const handleExportPDF = () => {
    startExportPDF(async () => {
      try {
        const blob = await downloadLedgerPDF(
          customerId,
          "CUSTOMER",
          dateFrom || undefined,
          dateTo || undefined,
          { name: customerName }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Customer_Ledger_${customerName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Customer ledger PDF downloaded!");
      } catch (err: any) {
        toast.error(`PDF export failed: ${err.message || "Unknown error"}`);
      }
    });
  };

  const handleExportExcel = () => {
    startExportExcel(async () => {
      try {
        const blob = await downloadLedgerExcel(
          customerId,
          "CUSTOMER",
          dateFrom || undefined,
          dateTo || undefined,
          { name: customerName }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Customer_Ledger_${customerName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Customer ledger Excel downloaded!");
      } catch (err: any) {
        toast.error(`Excel export failed: ${err.message || "Unknown error"}`);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[98vw] max-w-[98vw] h-[95vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Customer Ledger - {customerName}</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end shrink-0">
          <div className="sm:w-56">
            <label className="text-xs font-semibold text-zinc-500 uppercase block mb-1">Channel</label>
            <select value={channel} onChange={(event) => setChannel(event.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm">
              <option value="ALL">All</option>
              <option value="RETAIL">Retail</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="PROJECT">Project</option>
            </select>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase block mb-1">From Date</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From date" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase block mb-1">To Date</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To date" />
            </div>
          </div>
        </div>

        {/* Table — scrollable area */}
        <div className="flex-1 overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 sticky top-0">
              <tr className="text-left font-medium">
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Description</th>
                <th className="px-4 py-2.5">Channel</th>
                <th className="px-4 py-2.5 text-right">Debit (Dr)</th>
                <th className="px-4 py-2.5 text-right">Credit (Cr)</th>
                <th className="px-4 py-2.5 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500">Loading ledger statements...</td></tr>
              ) : filteredEntries.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500 italic">No ledger entries posted for this customer.</td></tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 text-xs">
                    <td className="px-4 py-2">{formatDate(entry.entryDate)}</td>
                    <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">{entry.description}</td>
                    <td className="px-4 py-2">
                      <span className="font-semibold text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border uppercase">
                        {entry.channelType}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-red-600">
                      {parseFloat(entry.debit) !== 0 ? formatNPR(parseFloat(entry.debit)) : "-"}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-green-600">
                      {parseFloat(entry.credit) !== 0 ? formatNPR(parseFloat(entry.credit)) : "-"}
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
            {isExportingPDF ? "Generating..." : "Export PDF"}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={isExportingExcel || loading || filteredEntries.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {isExportingExcel ? "Generating..." : "Export Excel"}
          </Button>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
