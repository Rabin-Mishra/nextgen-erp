"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NPRAmount } from "@/components/shared/NPRAmount";
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
    <Card className="border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/60 shadow-sm rounded-3xl overflow-hidden h-[420px] flex flex-col justify-between">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">
            Recent Sales Invoices
          </CardTitle>
          <CardDescription className="text-xs text-zinc-400 font-medium">
            Review the latest five customer invoice billings
          </CardDescription>
        </div>
        <Link
          href="/sales"
          className="text-xs font-bold text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors"
        >
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="flex-grow pt-4 overflow-y-auto">
        <div className="border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden text-sm font-semibold">
          {/* Header */}
          <div className="grid grid-cols-5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
            <span className="col-span-1">Invoice#</span>
            <span className="col-span-2">Customer / Channel</span>
            <span className="text-right">Amount</span>
            <span className="text-center">Status</span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {invoices.map((inv) => {
              const isRetail = inv.invoiceType === "RETAIL";
              const isWholesale = inv.invoiceType === "WHOLESALE";
              const isPaid = inv.status === "PAID";
              const isPartial = inv.status === "PARTIAL";
              const isOverdue = inv.status === "OVERDUE" || inv.status === "CANCELLED";

              return (
                <div key={inv.id} className="grid grid-cols-5 px-5 py-3 items-center">
                  <span className="text-xs font-black text-zinc-400">{inv.invoiceNumber}</span>
                  
                  <div className="col-span-2 pr-2">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block truncate">
                      {inv.customerName}
                    </span>
                    <span className={`text-[9px] font-black uppercase inline-block px-1.5 py-0.5 rounded-md mt-1 ${
                      isRetail
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                        : isWholesale
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                        : "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400"
                    }`}>
                      {inv.invoiceType}
                    </span>
                  </div>

                  <span className="text-right text-xs font-black text-zinc-900 dark:text-zinc-50">
                    <NPRAmount amount={Number(inv.amount)} />
                  </span>

                  <div className="text-center">
                    <span className={`text-[10px] font-extrabold uppercase inline-block px-2 py-0.5 rounded-lg ${
                      isPaid
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                        : isPartial
                        ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
                        : isOverdue
                        ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
                        : "bg-zinc-50 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400"
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              );
            })}
            {invoices.length === 0 && (
              <div className="p-8 text-center text-zinc-400">No invoices logged yet.</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
