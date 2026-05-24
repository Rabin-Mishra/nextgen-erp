"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatRs } from "@/lib/utils";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  amount: string;
  status: string;
  invoiceType: string;
}

interface RecentInvoicesTableProps {
  invoices: InvoiceItem[];
}

export function RecentInvoicesTable({ invoices }: RecentInvoicesTableProps) {
  return (
    <Card className="border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm rounded-lg overflow-hidden h-[420px] flex flex-col justify-between font-sans">
      <CardHeader className="pb-2 flex flex-row items-center justify-between p-5">
        <div>
          <CardTitle className="text-base font-black text-zinc-900 dark:text-zinc-50 tracking-wider">
            Recent Sales Invoices
          </CardTitle>
          <CardDescription className="text-xs text-zinc-600 font-bold dark:text-zinc-350 mt-1">
            Review the latest five customer invoice billings
          </CardDescription>
        </div>
        <Link
          href="/sales"
          className="text-xs font-extrabold text-blue-600 hover:text-blue-755 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
        >
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="flex-grow pt-2 overflow-y-auto px-5">
        <div className="border border-zinc-250 dark:border-zinc-800 rounded-lg overflow-hidden text-sm">
          {/* Header */}
          <div className="grid grid-cols-5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-250 dark:border-zinc-800 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
            <span className="col-span-1">Invoice#</span>
            <span className="col-span-2">Customer / Channel</span>
            <span className="text-right">Amount</span>
            <span className="text-center">Status</span>
          </div>

          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {invoices.map((inv) => {
              const isRetail = inv.invoiceType === "RETAIL";
              const isWholesale = inv.invoiceType === "WHOLESALE";
              const isPaid = inv.status === "PAID";
              const isPartial = inv.status === "PARTIAL";
              const isOverdue = inv.status === "OVERDUE" || inv.status === "CANCELLED";

              return (
                <div key={inv.id} className="grid grid-cols-5 px-4 py-3 items-center hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <span className="text-xs font-extrabold text-zinc-600 dark:text-zinc-450">{inv.invoiceNumber}</span>
                  
                  <div className="col-span-2 pr-2">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-150 block truncate">
                      {inv.customerName}
                    </span>
                    <span className={`text-[9px] font-black uppercase inline-block px-1.5 py-0.5 rounded-md mt-1 ${
                      isRetail
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-150"
                        : isWholesale
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-150"
                        : "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-150"
                    }`}>
                      {inv.invoiceType}
                    </span>
                  </div>

                  <span className="text-right text-xs font-extrabold text-zinc-950 dark:text-zinc-50 whitespace-nowrap">
                    {formatRs(Number(inv.amount))}
                  </span>

                  <div className="text-center">
                    <span className={`text-[9px] font-black uppercase inline-block px-2 py-0.5 rounded ${
                      isPaid
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : isPartial
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                        : isOverdue
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-450"
                        : "bg-zinc-100 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              );
            })}
            {invoices.length === 0 && (
              <div className="p-8 text-center text-zinc-500 font-bold text-xs">No invoices logged yet.</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
