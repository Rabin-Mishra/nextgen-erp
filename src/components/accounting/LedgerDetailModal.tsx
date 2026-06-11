"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchPartyLedgerAction } from "@/modules/accounting/actions";
import { NPRAmount } from "@/components/shared/NPRAmount";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { downloadLedgerPDF } from "@/lib/export/ledger-pdf";
import { downloadLedgerExcel } from "@/lib/export/ledger-excel";
import { PartyType, ChannelType } from "@/generated/prisma/enums";
import { toast } from "sonner";
import { DualDatePicker } from "@/components/shared/DualDatePicker";
import { DualDateDisplay } from "@/components/shared/DualDateDisplay";
import { Calendar, Download, FileSpreadsheet, Eye, RefreshCw } from "lucide-react";

interface LedgerDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partyId: string;
  partyType: PartyType;
  party: any; // includes name, PAN, phone, etc.
}

export function LedgerDetailModal({ open, onOpenChange, partyId, partyType, party }: LedgerDetailModalProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [channelType, setChannelType] = useState<ChannelType>("GENERAL"); // GENERAL acts as 'ALL'
  
  const [entries, setEntries] = useState<any[]>([]);
  const [openingBalance, setOpeningBalance] = useState("0.00");
  const [closingBalance, setClosingBalance] = useState("0.00");
  const [totalDr, setTotalDr] = useState("0.00");
  const [totalCr, setTotalCr] = useState("0.00");

  const [isLoading, setIsLoading] = useState(false);
  const [isExportingPDF, startExportPDF] = useTransition();
  const [isExportingExcel, startExportExcel] = useTransition();

  const fetchLedger = async () => {
    if (!partyId) return;
    setIsLoading(true);
    try {
      const data = await fetchPartyLedgerAction(partyType, partyId, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        channelType: channelType === "GENERAL" ? undefined : channelType,
        pageSize: 1000, // Large number to show all rows in detailed modal
      });

      setEntries(data.entries);
      setOpeningBalance(data.openingBalance);

      // Compute sums
      let drSum = 0;
      let crSum = 0;
      for (const e of data.entries) {
        const amt = parseFloat(e.amount);
        if (e.entryType === "DEBIT") drSum += amt;
        else crSum += amt;
      }
      setTotalDr(drSum.toFixed(2));
      setTotalCr(crSum.toFixed(2));

      const closing = data.entries.length > 0
        ? data.entries[data.entries.length - 1].runningBalance
        : data.openingBalance;
      setClosingBalance(closing);
    } catch (err: any) {
      toast.error(`Error loading ledger: ${err.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && partyId) {
      fetchLedger();
    }
  }, [open, partyId, channelType]);

  const handleExportPDF = () => {
    startExportPDF(async () => {
      try {
        const blob = await downloadLedgerPDF(partyId, partyType, dateFrom || undefined, dateTo || undefined, party);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Ledger_${party.name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Ledger PDF statement downloaded successfully!");
      } catch (err: any) {
        toast.error(`PDF compilation failed: ${err.message}`);
      }
    });
  };

  const handleExportExcel = () => {
    startExportExcel(async () => {
      try {
        const blob = await downloadLedgerExcel(partyId, partyType, dateFrom || undefined, dateTo || undefined, party);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Ledger_${party.name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Ledger Excel sheet downloaded successfully!");
      } catch (err: any) {
        toast.error(`Excel compilation failed: ${err.message}`);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] max-w-[98vw] h-[95vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center pr-6">
            <span>Statement of Account — {partyType}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={isExportingPDF || isLoading}
                className="text-xs h-8 flex gap-1 border-blue-200 hover:bg-blue-50 text-blue-700"
              >
                <Download className="h-3 w-3" />
                {isExportingPDF ? "Exporting..." : "PDF Statement"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={isExportingExcel || isLoading}
                className="text-xs h-8 flex gap-1 border-emerald-200 hover:bg-emerald-50 text-emerald-700"
              >
                <FileSpreadsheet className="h-3 w-3" />
                {isExportingExcel ? "Exporting..." : "Excel Sheet"}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Party Info Header Details */}
        <div className="bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 p-4 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Account Name</p>
            <p className="font-bold text-sm text-zinc-800 dark:text-zinc-100 truncate">{party?.name}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Address / Location</p>
            <p className="font-semibold text-sm text-zinc-700 dark:text-zinc-300 truncate">{party?.address || "-"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Phone Contact</p>
            <p className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">{party?.phone || "-"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">PAN Number</p>
            <p className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">{party?.panNumber || "-"}</p>
          </div>
        </div>

        {/* Date and Channel Filters Row */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mt-4 pb-4 border-b border-dashed dark:border-zinc-800">
          <div className="flex gap-1 border p-1 rounded-lg bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 w-full md:w-auto overflow-x-auto">
            <Button
              size="sm"
              variant={channelType === "GENERAL" ? "default" : "ghost"}
              onClick={() => setChannelType("GENERAL")}
              className="text-xs h-7"
            >
              All Channels
            </Button>
            <Button
              size="sm"
              variant={channelType === "RETAIL" ? "default" : "ghost"}
              onClick={() => setChannelType("RETAIL")}
              className="text-xs h-7"
            >
              Retail
            </Button>
            <Button
              size="sm"
              variant={channelType === "WHOLESALE" ? "default" : "ghost"}
              onClick={() => setChannelType("WHOLESALE")}
              className="text-xs h-7"
            >
              Wholesale
            </Button>
            <Button
              size="sm"
              variant={channelType === "PROJECT" ? "default" : "ghost"}
              onClick={() => setChannelType("PROJECT")}
              className="text-xs h-7"
            >
              Project
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <DualDatePicker
              label="From"
              value={dateFrom || undefined}
              onChange={(date) => setDateFrom(date.toISOString().split("T")[0])}
            />
            <DualDatePicker
              label="To"
              value={dateTo || undefined}
              onChange={(date) => setDateTo(date.toISOString().split("T")[0])}
            />
            <Button size="sm" onClick={fetchLedger} disabled={isLoading} className="h-9 px-3">
              <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Ledger Grid and List */}
        <div className="flex-1 overflow-y-auto min-h-[300px] border dark:border-zinc-800 rounded-xl mt-4 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-950/50">
              <LoadingSpinner />
            </div>
          ) : null}

          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 border-b dark:border-zinc-800 z-10">
              <tr>
                <th className="p-3 font-bold text-zinc-500">Date</th>
                <th className="p-3 font-bold text-zinc-500">Ref Doc</th>
                <th className="p-3 font-bold text-zinc-500">Description / Particulars</th>
                <th className="p-3 font-bold text-zinc-500 text-right">Debit (Dr, NPR)</th>
                <th className="p-3 font-bold text-zinc-500 text-right">Credit (Cr, NPR)</th>
                <th className="p-3 font-bold text-zinc-500 text-right">Balance (NPR)</th>
              </tr>
            </thead>
            <tbody>
              {/* Opening balance row */}
              <tr className="border-b dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 italic text-zinc-500">
                <td className="p-3 font-semibold">-</td>
                <td className="p-3 font-semibold">-</td>
                <td className="p-3 font-bold">Opening Balance brought forward</td>
                <td className="p-3 text-right">-</td>
                <td className="p-3 text-right">-</td>
                <td className="p-3 text-right font-bold">
                  <NPRAmount amount={Number(openingBalance)} showCurrency={false} />
                </td>
              </tr>

              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-400">
                    No transactions found in this period.
                  </td>
                </tr>
              ) : (
                entries.map((e, idx) => {
                  const isDr = e.entryType === "DEBIT";
                  return (
                    <tr key={e.id || idx} className="border-b dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                      <td className="p-3 font-medium"><DualDateDisplay date={e.entryDate} /></td>
                      <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {e.referenceType ? `${e.referenceType}-${e.referenceId?.slice(-4)}` : "-"}
                      </td>
                      <td className="p-3 text-zinc-600 dark:text-zinc-300 font-semibold">{e.description || "-"}</td>
                      <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {isDr ? <NPRAmount amount={Number(e.amount)} showCurrency={false} /> : "-"}
                      </td>
                      <td className="p-3 text-right font-semibold text-rose-650 dark:text-rose-400">
                        {!isDr ? <NPRAmount amount={Number(e.amount)} showCurrency={false} /> : "-"}
                      </td>
                      <td className="p-3 text-right font-bold text-zinc-800 dark:text-zinc-200">
                        <NPRAmount amount={Number(e.runningBalance)} showSign={true} showCurrency={false} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Aggregations Footer */}
        <div className="bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 p-4 rounded-xl flex justify-between items-center mt-4">
          <div className="text-zinc-500 font-bold text-xs uppercase">Period Net Aggregations:</div>
          <div className="flex gap-8 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            <div>
              Total Period Dr: <span className="text-emerald-600 font-bold"><NPRAmount amount={Number(totalDr)} /></span>
            </div>
            <div>
              Total Period Cr: <span className="text-rose-600 font-bold"><NPRAmount amount={Number(totalCr)} /></span>
            </div>
            <div className="border-l pl-8 font-bold text-sm text-zinc-900 dark:text-zinc-50">
              Ending Balance: <NPRAmount amount={Number(closingBalance)} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
