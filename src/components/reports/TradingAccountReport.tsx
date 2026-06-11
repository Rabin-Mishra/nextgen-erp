"use client";

import React from "react";
import { NPRAmount } from "@/components/shared/NPRAmount";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator } from "lucide-react";

interface TradingAccountReportProps {
  data: {
    period: string;
    sales: string;
    openingStock: string;
    purchases: string;
    closingStock: string;
    cogs: string;
    grossProfit: string;
  };
}

export function TradingAccountReport({ data }: TradingAccountReportProps) {
  const debitTotal = Number(data.openingStock) + Number(data.purchases) + Number(data.grossProfit);
  const creditTotal = Number(data.sales) + Number(data.closingStock);

  return (
    <Card className="border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 shadow-md rounded-3xl overflow-hidden">
      <div className="bg-zinc-900 text-zinc-100 p-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Trading Account Ledger</h2>
          <p className="text-xs text-zinc-400 font-medium mt-1">Period Ending: {data.period}</p>
        </div>
        <div className="p-3 bg-zinc-800 rounded-2xl">
          <Calculator className="h-5 w-5 text-amber-500" />
        </div>
      </div>

      <CardContent className="p-8">
        <div className="border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden text-sm font-semibold">
          {/* Header Row */}
          <div className="grid grid-cols-4 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-400">
            <span className="col-span-1">Debit Particulars (Dr)</span>
            <span className="text-right">Amount (NPR)</span>
            <span className="col-span-1 pl-6">Credit Particulars (Cr)</span>
            <span className="text-right">Amount (NPR)</span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {/* Row 1 */}
            <div className="grid grid-cols-4 px-6 py-4 items-center">
              <span className="text-zinc-500 dark:text-zinc-400">Opening Stock brought forward</span>
              <span className="text-right text-zinc-800 dark:text-zinc-200"><NPRAmount amount={Number(data.openingStock)} showCurrency={false} /></span>
              <span className="text-zinc-500 dark:text-zinc-400 pl-6">Sales Revenue (Taxable Subtotal)</span>
              <span className="text-right text-zinc-800 dark:text-zinc-200"><NPRAmount amount={Number(data.sales)} showCurrency={false} /></span>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-4 px-6 py-4 items-center">
              <span className="text-zinc-500 dark:text-zinc-400">Procurement Purchases (Period)</span>
              <span className="text-right text-zinc-800 dark:text-zinc-200"><NPRAmount amount={Number(data.purchases)} showCurrency={false} /></span>
              <span className="text-zinc-500 dark:text-zinc-400 pl-6">Closing Stock Valuation (FIFO)</span>
              <span className="text-right text-zinc-800 dark:text-zinc-200"><NPRAmount amount={Number(data.closingStock)} showCurrency={false} /></span>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-4 px-6 py-4 items-center bg-emerald-50/10 dark:bg-emerald-950/5">
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">Gross Profit transferred to P&L</span>
              <span className="text-right text-emerald-600 dark:text-emerald-400 font-bold"><NPRAmount amount={Number(data.grossProfit)} showCurrency={false} /></span>
              <span className="pl-6">-</span>
              <span className="text-right">-</span>
            </div>

            {/* Total Row */}
            <div className="grid grid-cols-4 px-6 py-5 items-center bg-zinc-50/50 dark:bg-zinc-900/30 font-extrabold border-t border-zinc-300 dark:border-zinc-600 text-zinc-800 dark:text-zinc-200 uppercase tracking-wider text-xs">
              <span>TOTAL DEBITS</span>
              <span className="text-right"><NPRAmount amount={debitTotal} showCurrency={false} /></span>
              <span className="pl-6">TOTAL CREDITS</span>
              <span className="text-right"><NPRAmount amount={creditTotal} showCurrency={false} /></span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
