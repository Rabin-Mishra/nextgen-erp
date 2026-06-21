"use client";

import React from "react";
import { formatNPR } from "@/lib/utils";
import { Check } from "lucide-react";

interface PendingPaymentItem {
  id: string;
  vendorName: string;
  poNumber: string;
  amountDue: string;
  dueDate: string;
  daysOverdue: number;
}

interface PendingPaymentsWidgetProps {
  payments: PendingPaymentItem[];
}

export function PendingPaymentsWidget({ payments }: PendingPaymentsWidgetProps) {
  const items = payments.map((p) => ({
    id: p.id,
    poNumber: p.poNumber,
    supplierName: p.vendorName,
    amount: Number(p.amountDue),
    expectedDate: p.dueDate,
    isOverdue: p.daysOverdue > 0,
  }));

  return (
    <div className="w-full rounded-xl border bg-card p-6 font-sans">
      <div className="pb-4">
        <h3 className="text-base font-bold text-zinc-850 dark:text-zinc-50 tracking-wider flex items-center gap-2">
          Accounts Payable Dues
        </h3>
        <p className="text-xs text-zinc-650 font-bold dark:text-zinc-350 mt-1">
          Overdue purchase payments owed to suppliers/creditors
        </p>
      </div>

      <div className="max-h-[380px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between gap-3 w-full bg-white dark:bg-zinc-950 hover:shadow-md transition-shadow shadow-sm"
            >
              <div className="space-y-1">
                {/* Row 1 — PO number: */}
                <span className="text-xs text-muted-foreground font-mono">
                  {item.poNumber}
                </span>

                {/* Row 2 — Full supplier name (NO truncation): */}
                <p className="text-sm font-semibold leading-snug break-words whitespace-normal text-zinc-800 dark:text-zinc-200">
                  {item.supplierName}
                </p>
              </div>

              {/* Row 3 — Amount and due status: */}
              <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {formatNPR(item.amount)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Expected: {item.expectedDate}
                  </span>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                  item.isOverdue 
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200 dark:border-rose-900" 
                    : "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-500 border-amber-200 dark:border-amber-900"
                }`}>
                  {item.isOverdue ? "Overdue" : "Due Soon"}
                </span>
              </div>
            </div>
          ))}

          {payments.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-center space-y-2">
              <span className="p-2.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-full border border-emerald-150">
                <Check className="h-4.5 w-4.5 stroke-[2.5]" />
              </span>
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                All supplier payables clear.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
