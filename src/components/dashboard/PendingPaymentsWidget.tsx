"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatRs } from "@/lib/utils";
import { Calendar, AlertTriangle, Check } from "lucide-react";

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
  return (
    <Card className="border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm rounded-lg overflow-hidden h-[420px] flex flex-col justify-between font-sans">
      <CardHeader className="pb-2 p-5">
        <CardTitle className="text-base font-black text-zinc-900 dark:text-zinc-50 tracking-wider flex items-center gap-2">
          Accounts Payable Dues
        </CardTitle>
        <CardDescription className="text-xs text-zinc-600 font-bold dark:text-zinc-350 mt-1">
          Overdue purchase payments owed to suppliers/creditors
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-grow pt-2 overflow-y-auto px-5 pb-5">
        <div className="space-y-3">
          {payments.map((p) => {
            const isCritical = p.daysOverdue > 30;

            return (
              <div
                key={p.id}
                className="p-3 rounded-lg border border-zinc-250 dark:border-zinc-800 flex items-center justify-between transition-all duration-300 hover:border-zinc-350 dark:hover:border-zinc-700 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded mt-0.5 ${
                    isCritical
                      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-150"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-150"
                  }`}>
                    {isCritical ? <AlertTriangle className="h-4 w-4 stroke-[2.5]" /> : <Calendar className="h-4 w-4 stroke-[2.5]" />}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400">{p.poNumber}</span>
                      {isCritical && (
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-rose-150 text-rose-800 dark:bg-rose-950/30 dark:text-rose-455 rounded">
                          Urgent
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-150 block max-w-[160px] truncate">
                      {p.vendorName}
                    </span>
                    <span className="text-[10px] text-zinc-600 font-bold block dark:text-zinc-350">
                      Expected: <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{p.dueDate}</span>
                    </span>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-xs font-black text-zinc-950 dark:text-zinc-55 block whitespace-nowrap">
                    {formatRs(Number(p.amountDue))}
                  </span>
                  
                  {p.daysOverdue > 0 ? (
                    <span className={`text-[10px] font-black block ${
                      isCritical ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-500"
                    }`}>
                      {p.daysOverdue} Days Overdue
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-450 font-black block">
                      Due Soon
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {payments.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-2">
              <span className="p-2.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-full border border-emerald-150">
                <Check className="h-4.5 w-4.5 stroke-[2.5]" />
              </span>
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">All supplier payables clear.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
