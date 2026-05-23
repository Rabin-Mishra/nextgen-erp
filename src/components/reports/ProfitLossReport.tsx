"use client";

import React from "react";
import { NPRAmount } from "@/components/shared/NPRAmount";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, FileSpreadsheet } from "lucide-react";

interface ProfitLossReportProps {
  data: {
    period: string;
    revenue: {
      retail: string;
      wholesale: string;
      project: string;
      total: string;
    };
    cogs: string;
    grossProfit: string;
    operatingExpenses: string;
    depreciation: string;
    netProfit: string;
  };
}

export function ProfitLossReport({ data }: ProfitLossReportProps) {
  const isLoss = Number(data.netProfit) < 0;

  return (
    <Card className="border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 shadow-md rounded-3xl overflow-hidden">
      <div className="bg-zinc-900 text-zinc-100 p-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Statement of Profit & Loss</h2>
          <p className="text-xs text-zinc-400 font-medium mt-1">Period Ending: {data.period}</p>
        </div>
        <div className="p-3 bg-zinc-800 rounded-2xl">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
        </div>
      </div>

      <CardContent className="p-8 space-y-8">
        {/* Table layout */}
        <div className="border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-400">
            <span>Particulars / Account Description</span>
            <span className="text-right">Amount (NPR)</span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-sm font-semibold">
            {/* Revenue */}
            <div className="px-6 py-4 bg-zinc-50/30 dark:bg-zinc-900/10 text-xs font-bold text-zinc-400 uppercase tracking-wider">Revenue from Operations</div>
            <div className="grid grid-cols-2 px-6 py-3.5 items-center">
              <span className="text-zinc-500 dark:text-zinc-400 pl-4">Retail Sales Channel</span>
              <span className="text-right text-zinc-800 dark:text-zinc-200"><NPRAmount amount={Number(data.revenue.retail)} /></span>
            </div>
            <div className="grid grid-cols-2 px-6 py-3.5 items-center">
              <span className="text-zinc-500 dark:text-zinc-400 pl-4">Wholesale Sales Channel</span>
              <span className="text-right text-zinc-800 dark:text-zinc-200"><NPRAmount amount={Number(data.revenue.wholesale)} /></span>
            </div>
            <div className="grid grid-cols-2 px-6 py-3.5 items-center">
              <span className="text-zinc-500 dark:text-zinc-400 pl-4">Projects Site Accounts</span>
              <span className="text-right text-zinc-800 dark:text-zinc-200"><NPRAmount amount={Number(data.revenue.project)} /></span>
            </div>
            <div className="grid grid-cols-2 px-6 py-4 items-center bg-zinc-50/50 dark:bg-zinc-900/30 font-bold border-b border-zinc-200 dark:border-zinc-700">
              <span className="text-zinc-800 dark:text-zinc-200 pl-2">Total Gross Revenue (A)</span>
              <span className="text-right text-zinc-900 dark:text-zinc-50"><NPRAmount amount={Number(data.revenue.total)} /></span>
            </div>

            {/* COGS */}
            <div className="px-6 py-4 bg-zinc-50/30 dark:bg-zinc-900/10 text-xs font-bold text-zinc-400 uppercase tracking-wider">Cost of Sales</div>
            <div className="grid grid-cols-2 px-6 py-3.5 items-center">
              <span className="text-zinc-500 dark:text-zinc-400 pl-4">Procurement & Dispatched Materials cost</span>
              <span className="text-right text-rose-600 dark:text-rose-400"><NPRAmount amount={Number(data.cogs)} /></span>
            </div>
            <div className="grid grid-cols-2 px-6 py-4 items-center bg-zinc-50/50 dark:bg-zinc-900/30 font-bold border-b border-zinc-200 dark:border-zinc-700">
              <span className="text-zinc-800 dark:text-zinc-200 pl-2">Total Cost of Goods Sold (B)</span>
              <span className="text-right text-rose-600 dark:text-rose-400"><NPRAmount amount={Number(data.cogs)} /></span>
            </div>

            {/* Gross Margin */}
            <div className="grid grid-cols-2 px-6 py-5 items-center bg-emerald-50/30 dark:bg-emerald-950/10 font-extrabold border-y border-emerald-100 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400">
              <span className="pl-2">GROSS MARGIN (C = A - B)</span>
              <span className="text-right"><NPRAmount amount={Number(data.grossProfit)} /></span>
            </div>

            {/* Operating Expenses */}
            <div className="px-6 py-4 bg-zinc-50/30 dark:bg-zinc-900/10 text-xs font-bold text-zinc-400 uppercase tracking-wider">Operating Expenses & Payouts</div>
            <div className="grid grid-cols-2 px-6 py-3.5 items-center">
              <span className="text-zinc-500 dark:text-zinc-400 pl-4">Administrative & Operational Overheads</span>
              <span className="text-right text-zinc-800 dark:text-zinc-200"><NPRAmount amount={Number(data.operatingExpenses)} /></span>
            </div>
            <div className="grid grid-cols-2 px-6 py-3.5 items-center">
              <span className="text-zinc-500 dark:text-zinc-400 pl-4">Fixed Assets Depreciation Write-offs</span>
              <span className="text-right text-zinc-800 dark:text-zinc-200"><NPRAmount amount={Number(data.depreciation)} /></span>
            </div>
            <div className="grid grid-cols-2 px-6 py-4 items-center bg-zinc-50/50 dark:bg-zinc-900/30 font-bold border-b border-zinc-200 dark:border-zinc-700">
              <span className="text-zinc-800 dark:text-zinc-200 pl-2">Total Expenses (D)</span>
              <span className="text-right text-rose-600 dark:text-rose-400">
                <NPRAmount amount={Number(data.operatingExpenses) + Number(data.depreciation)} />
              </span>
            </div>

            {/* Net profit */}
            <div className={`grid grid-cols-2 px-6 py-5 items-center font-extrabold text-base border-t border-zinc-300 dark:border-zinc-600 ${isLoss ? "bg-rose-50/40 dark:bg-rose-950/15 text-rose-600 dark:text-rose-400" : "bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"}`}>
              <span className="pl-2">NET COMPREHENSIVE PROFIT / LOSS (C - D)</span>
              <span className="text-right"><NPRAmount amount={Number(data.netProfit)} showSign={true} /></span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
