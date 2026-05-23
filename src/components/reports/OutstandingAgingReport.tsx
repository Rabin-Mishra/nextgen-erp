"use client";

import React from "react";
import { NPRAmount } from "@/components/shared/NPRAmount";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface AgingRow {
  customerId: string;
  code: string;
  name: string;
  pan: string;
  "0-30": number;
  "31-60": number;
  "61-90": number;
  "90+": number;
  total: number;
}

interface OutstandingAgingReportProps {
  data: AgingRow[];
}

export function OutstandingAgingReport({ data }: OutstandingAgingReportProps) {
  // Aggregate overall sums for the table footer
  const total30 = data.reduce((acc, curr) => acc + curr["0-30"], 0);
  const total60 = data.reduce((acc, curr) => acc + curr["31-60"], 0);
  const total90 = data.reduce((acc, curr) => acc + curr["61-90"], 0);
  const totalOver = data.reduce((acc, curr) => acc + curr["90+"], 0);
  const grandTotal = data.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <Card className="border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 shadow-md rounded-3xl overflow-hidden animate-fade-in">
      <div className="bg-zinc-900 text-zinc-100 p-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Customer Receivables Aging Analysis</h2>
          <p className="text-xs text-zinc-400 font-medium mt-1">Outstanding dues chronologically categorized by severity</p>
        </div>
        <div className="p-3 bg-zinc-800 rounded-2xl">
          <AlertCircle className="h-5 w-5 text-amber-500" />
        </div>
      </div>

      <CardContent className="p-8">
        <div className="border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden text-sm font-semibold">
          <div className="grid grid-cols-8 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-400">
            <span className="col-span-1">Code</span>
            <span className="col-span-2">Customer Description</span>
            <span className="text-right">0-30 Days</span>
            <span className="text-right">31-60 Days</span>
            <span className="text-right">61-90 Days</span>
            <span className="text-right text-rose-500">90+ Overdue</span>
            <span className="text-right">Total Outstanding</span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {data.map((r, idx) => (
              <div
                key={r.customerId || idx}
                className={`grid grid-cols-8 px-5 py-3.5 items-center ${idx % 2 === 0 ? "bg-white dark:bg-zinc-950" : "bg-zinc-50/20 dark:bg-zinc-900/10"}`}
              >
                <span className="text-xs font-bold text-zinc-400">{r.code}</span>
                <div className="col-span-2 pr-4">
                  <span className="text-zinc-800 dark:text-zinc-200 block truncate">{r.name}</span>
                  <span className="text-[10px] text-zinc-400 font-medium block mt-0.5">PAN: {r.pan}</span>
                </div>
                
                {/* 0-30 Days (Light alert) */}
                <span className="text-right text-zinc-600 dark:text-zinc-400"><NPRAmount amount={r["0-30"]} /></span>
                
                {/* 31-60 Days (Mild warning - yellow tint) */}
                <span className={`text-right ${r["31-60"] > 0 ? "text-amber-500 font-bold" : "text-zinc-600 dark:text-zinc-400"}`}>
                  <NPRAmount amount={r["31-60"]} />
                </span>

                {/* 61-90 Days (Moderate warning - orange tint) */}
                <span className={`text-right ${r["61-90"] > 0 ? "text-orange-500 font-bold" : "text-zinc-600 dark:text-zinc-400"}`}>
                  <NPRAmount amount={r["61-90"]} />
                </span>

                {/* 90+ Days (Severe overdue - deep red alert background) */}
                <span className={`text-right px-2.5 py-1 rounded-xl ${r["90+"] > 0 ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-extrabold" : "text-zinc-600 dark:text-zinc-400"}`}>
                  <NPRAmount amount={r["90+"]} />
                </span>

                <span className="text-right text-zinc-900 dark:text-zinc-50 font-bold"><NPRAmount amount={r.total} /></span>
              </div>
            ))}

            {data.length === 0 && (
              <div className="p-8 text-center text-zinc-400">
                No active outstanding customer dues mapped inside the ledger balances.
              </div>
            )}

            {/* Aggregates row */}
            <div className="grid grid-cols-8 px-5 py-5 items-center bg-zinc-50/50 dark:bg-zinc-900/30 font-extrabold border-t border-zinc-300 dark:border-zinc-600 text-zinc-800 dark:text-zinc-200 uppercase tracking-wider text-xs">
              <span className="col-span-1">-</span>
              <span className="col-span-2">TOTAL AGED RECEIVABLES</span>
              <span className="text-right"><NPRAmount amount={total30} /></span>
              <span className="text-right text-amber-500"><NPRAmount amount={total60} /></span>
              <span className="text-right text-orange-500"><NPRAmount amount={total90} /></span>
              <span className="text-right text-rose-600 dark:text-rose-400"><NPRAmount amount={totalOver} /></span>
              <span className="text-right text-zinc-900 dark:text-zinc-50"><NPRAmount amount={grandTotal} /></span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
