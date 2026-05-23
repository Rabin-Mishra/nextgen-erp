"use client";

import React from "react";
import { NPRAmount } from "@/components/shared/NPRAmount";
import { Card, CardContent } from "@/components/ui/card";
import { Scale } from "lucide-react";

interface BalanceSheetReportProps {
  data: {
    asOf: string;
    assets: {
      cash: string;
      bank: string;
      digital: string;
      receivables: string;
      inventory: string;
      fixedCost: string;
      accumDepreciation: string;
      netFixed: string;
      total: string;
    };
    liabilities: {
      payables: string;
      total: string;
    };
    equity: {
      capital: string;
      retainedEarnings: string;
      total: string;
    };
  };
}

export function BalanceSheetReport({ data }: BalanceSheetReportProps) {
  const assets = data.assets;
  const liabilities = data.liabilities;
  const equity = data.equity;

  return (
    <Card className="border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 shadow-md rounded-3xl overflow-hidden">
      <div className="bg-zinc-900 text-zinc-100 p-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Statement of Financial Position</h2>
          <p className="text-xs text-zinc-400 font-medium mt-1">Balance Sheet as of: {data.asOf}</p>
        </div>
        <div className="p-3 bg-zinc-800 rounded-2xl">
          <Scale className="h-5 w-5 text-indigo-400" />
        </div>
      </div>

      <CardContent className="p-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* --- LEFT COLUMN: ASSETS --- */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 pb-2">Assets (Use of Funds)</h3>
            
            <div className="border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden text-sm font-semibold divide-y divide-zinc-100 dark:divide-zinc-800/60">
              <div className="px-5 py-3 bg-zinc-50/50 dark:bg-zinc-900/10 text-xs font-bold text-zinc-400 uppercase tracking-wider">Current Assets</div>
              
              <div className="grid grid-cols-2 px-5 py-3 items-center">
                <span className="text-zinc-500 dark:text-zinc-400">Cash-in-hand (Safe Vault)</span>
                <span className="text-right text-zinc-800 dark:text-zinc-200"><NPRAmount amount={Number(assets.cash)} /></span>
              </div>
              <div className="grid grid-cols-2 px-5 py-3 items-center">
                <span className="text-zinc-500 dark:text-zinc-400">Commercial Bank Accounts</span>
                <span className="text-right text-zinc-800 dark:text-zinc-200"><NPRAmount amount={Number(assets.bank)} /></span>
              </div>
              <div className="grid grid-cols-2 px-5 py-3 items-center">
                <span className="text-zinc-500 dark:text-zinc-400">Digital QR Wallets (eSewa/Khalti)</span>
                <span className="text-right text-zinc-800 dark:text-zinc-200"><NPRAmount amount={Number(assets.digital)} /></span>
              </div>
              <div className="grid grid-cols-2 px-5 py-3 items-center">
                <span className="text-zinc-500 dark:text-zinc-400">Accounts Receivable (Debtors Dues)</span>
                <span className="text-right text-zinc-800 dark:text-zinc-200"><NPRAmount amount={Number(assets.receivables)} /></span>
              </div>
              <div className="grid grid-cols-2 px-5 py-3 items-center">
                <span className="text-zinc-500 dark:text-zinc-400">Inventory Closing Stock Value</span>
                <span className="text-right text-zinc-800 dark:text-zinc-200"><NPRAmount amount={Number(assets.inventory)} /></span>
              </div>

              <div className="px-5 py-3 bg-zinc-50/50 dark:bg-zinc-900/10 text-xs font-bold text-zinc-400 uppercase tracking-wider">Fixed Non-Current Assets</div>

              <div className="grid grid-cols-2 px-5 py-3 items-center">
                <span className="text-zinc-500 dark:text-zinc-400">Capitalized Fixed Assets Cost</span>
                <span className="text-right text-zinc-800 dark:text-zinc-200"><NPRAmount amount={Number(assets.fixedCost)} /></span>
              </div>
              <div className="grid grid-cols-2 px-5 py-3 items-center text-rose-600 dark:text-rose-400">
                <span>Less: Accumulated Depreciation</span>
                <span className="text-right">-<NPRAmount amount={Number(assets.accumDepreciation)} /></span>
              </div>
              <div className="grid grid-cols-2 px-5 py-3 items-center bg-zinc-50/30 dark:bg-zinc-900/20 font-bold border-b border-zinc-200 dark:border-zinc-700">
                <span className="text-zinc-800 dark:text-zinc-200 pl-2">Net Fixed Assets Book Value</span>
                <span className="text-right text-zinc-900 dark:text-zinc-50"><NPRAmount amount={Number(assets.netFixed)} /></span>
              </div>

              <div className="grid grid-cols-2 px-5 py-4 items-center bg-indigo-50/30 dark:bg-indigo-950/15 font-extrabold border-t-2 border-indigo-200 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-400 text-base">
                <span>TOTAL ASSETS (A)</span>
                <span className="text-right"><NPRAmount amount={Number(assets.total)} /></span>
              </div>
            </div>
          </div>

          {/* --- RIGHT COLUMN: LIABILITIES & EQUITY --- */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 pb-2">Liabilities & Equity (Source of Funds)</h3>

            <div className="border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden text-sm font-semibold divide-y divide-zinc-100 dark:divide-zinc-800/60">
              <div className="px-5 py-3 bg-zinc-50/50 dark:bg-zinc-900/10 text-xs font-bold text-zinc-400 uppercase tracking-wider">Liabilities</div>

              <div className="grid grid-cols-2 px-5 py-3 items-center">
                <span className="text-zinc-500 dark:text-zinc-400">Accounts Payable (Vendor Creditors)</span>
                <span className="text-right text-zinc-800 dark:text-zinc-200"><NPRAmount amount={Number(liabilities.payables)} /></span>
              </div>
              <div className="grid grid-cols-2 px-5 py-4 items-center bg-zinc-50/50 dark:bg-zinc-900/30 font-bold border-b border-zinc-200 dark:border-zinc-700">
                <span className="text-zinc-800 dark:text-zinc-200 pl-2">Total Liabilities (B)</span>
                <span className="text-right text-zinc-900 dark:text-zinc-50"><NPRAmount amount={Number(liabilities.total)} /></span>
              </div>

              <div className="px-5 py-3 bg-zinc-50/50 dark:bg-zinc-900/10 text-xs font-bold text-zinc-400 uppercase tracking-wider">Owner Equities</div>

              <div className="grid grid-cols-2 px-5 py-3 items-center">
                <span className="text-zinc-500 dark:text-zinc-400">Owner starting Capital reserves</span>
                <span className="text-right text-zinc-800 dark:text-zinc-200"><NPRAmount amount={Number(equity.capital)} /></span>
              </div>
              <div className="grid grid-cols-2 px-5 py-3 items-center">
                <span className="text-zinc-500 dark:text-zinc-400 font-semibold">Retained Earnings (Dynamic P&L Accumulation)</span>
                <span className="text-right text-zinc-800 dark:text-zinc-200"><NPRAmount amount={Number(equity.retainedEarnings)} showSign={true} /></span>
              </div>
              <div className="grid grid-cols-2 px-5 py-4 items-center bg-zinc-50/50 dark:bg-zinc-900/30 font-bold border-b border-zinc-200 dark:border-zinc-700">
                <span className="text-zinc-800 dark:text-zinc-200 pl-2">Total Owner Equity (C)</span>
                <span className="text-right text-zinc-900 dark:text-zinc-50"><NPRAmount amount={Number(equity.total)} /></span>
              </div>

              <div className="grid grid-cols-2 px-5 py-4 items-center bg-indigo-50/30 dark:bg-indigo-950/15 font-extrabold border-t-2 border-indigo-200 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-400 text-base">
                <span>TOTAL LIABILITIES & EQUITY (B + C)</span>
                <span className="text-right">
                  <NPRAmount amount={Number(liabilities.total) + Number(equity.total)} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
