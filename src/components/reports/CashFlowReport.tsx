"use client";

import React from "react";
import { NPRAmount } from "@/components/shared/NPRAmount";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

interface CashFlowReportProps {
  data: {
    period: string;
    operating: {
      receiptsFromCustomers: string;
      paymentsToSuppliers: string;
      operatingExpenses: string;
      netOperating: string;
    };
    investing: {
      fixedAssetPurchases: string;
      netInvesting: string;
    };
    financing: {
      capitalContributions: string;
      netFinancing: string;
    };
    netChange: string;
    openingCash: string;
    closingCash: string;
  };
}

export function CashFlowReport({ data }: CashFlowReportProps) {
  const isNetInflow = Number(data.netChange) >= 0;

  return (
    <Card className="border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 shadow-md rounded-3xl overflow-hidden animate-fade-in">
      <div className="bg-zinc-900 text-zinc-100 p-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Statement of Cash Flows</h2>
          <p className="text-xs text-zinc-400 font-medium mt-1">Period Ending: {data.period}</p>
        </div>
        <div className="p-3 bg-zinc-800 rounded-2xl">
          <DollarSign className="h-5 w-5 text-emerald-500" />
        </div>
      </div>

      <CardContent className="p-8">
        <div className="border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden text-sm font-semibold">
          {/* Header Row */}
          <div className="grid grid-cols-5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-400">
            <span className="col-span-3">Particular / Cash Flow Activities</span>
            <span className="text-right col-span-2">Amount (NPR)</span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {/* A. OPERATING */}
            <div className="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/10">
              <span className="text-zinc-800 dark:text-zinc-200 font-extrabold uppercase text-xs tracking-wider">A. Cash Flows from Operating Activities</span>
            </div>
            
            <div className="grid grid-cols-5 px-6 py-3.5 items-center">
              <span className="col-span-3 text-zinc-500 dark:text-zinc-400">Cash Receipts from Customers</span>
              <span className="text-right col-span-2 text-zinc-800 dark:text-zinc-200"><NPRAmount amount={Number(data.operating.receiptsFromCustomers)} /></span>
            </div>

            <div className="grid grid-cols-5 px-6 py-3.5 items-center">
              <span className="col-span-3 text-zinc-500 dark:text-zinc-400">Less: Cash Paid to Suppliers (Procurement)</span>
              <span className="text-right col-span-2 text-rose-600 dark:text-rose-400">-<NPRAmount amount={Number(data.operating.paymentsToSuppliers)} /></span>
            </div>

            <div className="grid grid-cols-5 px-6 py-3.5 items-center">
              <span className="col-span-3 text-zinc-500 dark:text-zinc-400">Less: Cash Paid for Operating Expenses (Rent, Utilities, Wages)</span>
              <span className="text-right col-span-2 text-rose-600 dark:text-rose-400">-<NPRAmount amount={Number(data.operating.operatingExpenses)} /></span>
            </div>

            <div className="grid grid-cols-5 px-6 py-4 items-center bg-zinc-50/20 dark:bg-zinc-900/5 font-bold">
              <span className="col-span-3 text-zinc-700 dark:text-zinc-300">Net Cash Generated from Operating Activities</span>
              <span className="text-right col-span-2 text-zinc-900 dark:text-zinc-50"><NPRAmount amount={Number(data.operating.netOperating)} /></span>
            </div>

            {/* B. INVESTING */}
            <div className="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/10 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-800 dark:text-zinc-200 font-extrabold uppercase text-xs tracking-wider">B. Cash Flows from Investing Activities</span>
            </div>

            <div className="grid grid-cols-5 px-6 py-3.5 items-center">
              <span className="col-span-3 text-zinc-500 dark:text-zinc-400">Less: Procurement & Capitalization of Fixed Assets</span>
              <span className="text-right col-span-2 text-rose-600 dark:text-rose-400">-<NPRAmount amount={Number(data.investing.fixedAssetPurchases)} /></span>
            </div>

            <div className="grid grid-cols-5 px-6 py-4 items-center bg-zinc-50/20 dark:bg-zinc-900/5 font-bold">
              <span className="col-span-3 text-zinc-700 dark:text-zinc-300">Net Cash Used in Investing Activities</span>
              <span className="text-right col-span-2 text-rose-600 dark:text-rose-400">({Number(data.investing.fixedAssetPurchases) !== 0 ? "-" : ""}<NPRAmount amount={Number(data.investing.fixedAssetPurchases)} />)</span>
            </div>

            {/* C. FINANCING */}
            <div className="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/10 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-800 dark:text-zinc-200 font-extrabold uppercase text-xs tracking-wider">C. Cash Flows from Financing Activities</span>
            </div>

            <div className="grid grid-cols-5 px-6 py-3.5 items-center">
              <span className="col-span-3 text-zinc-500 dark:text-zinc-400">Owner Capital Contributions / Inward Equity</span>
              <span className="text-right col-span-2 text-zinc-800 dark:text-zinc-200"><NPRAmount amount={Number(data.financing.capitalContributions)} /></span>
            </div>

            <div className="grid grid-cols-5 px-6 py-4 items-center bg-zinc-50/20 dark:bg-zinc-900/5 font-bold">
              <span className="col-span-3 text-zinc-700 dark:text-zinc-300">Net Cash Flow from Financing Activities</span>
              <span className="text-right col-span-2 text-zinc-900 dark:text-zinc-50"><NPRAmount amount={Number(data.financing.netFinancing)} /></span>
            </div>

            {/* D. RECONCILIATION */}
            <div className="px-6 py-4 bg-zinc-100/30 dark:bg-zinc-900/30 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-zinc-800 dark:text-zinc-200 font-extrabold uppercase text-xs tracking-wider">D. Vault & Cash Equivalents Reconciliation</span>
            </div>

            <div className="grid grid-cols-5 px-6 py-3.5 items-center font-bold bg-zinc-50/10 dark:bg-zinc-900/5">
              <span className="col-span-3 text-zinc-600 dark:text-zinc-300">Net Increase / (Decrease) in Cash (A + B + C)</span>
              <span className={`text-right col-span-2 font-extrabold ${isNetInflow ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
                {isNetInflow ? "+" : "-"}<NPRAmount amount={Math.abs(Number(data.netChange))} />
              </span>
            </div>

            <div className="grid grid-cols-5 px-6 py-3.5 items-center">
              <span className="col-span-3 text-zinc-500 dark:text-zinc-400 font-medium">Cash and Cash Equivalents at Beginning of Month</span>
              <span className="text-right col-span-2 text-zinc-800 dark:text-zinc-200"><NPRAmount amount={Number(data.openingCash)} /></span>
            </div>

            <div className="grid grid-cols-5 px-6 py-5 items-center bg-zinc-50/50 dark:bg-zinc-900/30 font-extrabold border-t border-zinc-300 dark:border-zinc-600 text-zinc-800 dark:text-zinc-200 uppercase tracking-wider text-xs">
              <span className="col-span-3">Cash & Cash Equivalents at End of Month (Reconciled Vaults)</span>
              <span className="text-right col-span-2 text-zinc-950 dark:text-zinc-50"><NPRAmount amount={Number(data.closingCash)} /></span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
