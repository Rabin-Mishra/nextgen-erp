"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NPRAmount } from "@/components/shared/NPRAmount";
import { Calendar, AlertTriangle } from "lucide-react";
import Link from "next/link";

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
    <Card className="border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/60 shadow-sm rounded-3xl overflow-hidden h-[420px] flex flex-col justify-between">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider flex items-center gap-2">
          Accounts Payable Dues
        </CardTitle>
        <CardDescription className="text-xs text-zinc-400 font-medium">
          Overdue purchase payments owed to suppliers/creditors
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-grow pt-4 overflow-y-auto">
        <div className="space-y-4">
          {payments.map((p) => {
            const isCritical = p.daysOverdue > 30;

            return (
              <div
                key={p.id}
                className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-850 flex items-center justify-between transition-all duration-300 hover:border-zinc-200 dark:hover:border-zinc-700"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl mt-0.5 ${
                    isCritical
                      ? "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400"
                      : "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400"
                  }`}>
                    {isCritical ? <AlertTriangle className="h-4.5 w-4.5" /> : <Calendar className="h-4.5 w-4.5" />}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-zinc-400">{p.poNumber}</span>
                      {isCritical && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 rounded-md">
                          Urgent
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-zinc-850 dark:text-zinc-200 block max-w-[160px] truncate">
                      {p.vendorName}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-semibold block">
                      Expected: <span className="font-extrabold">{p.dueDate}</span>
                    </span>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-xs font-black text-zinc-950 dark:text-zinc-50 block">
                    <NPRAmount amount={Number(p.amountDue)} />
                  </span>
                  
                  {p.daysOverdue > 0 ? (
                    <span className={`text-[10px] font-extrabold block ${
                      isCritical ? "text-rose-600 dark:text-rose-400" : "text-amber-500"
                    }`}>
                      {p.daysOverdue} Days Overdue
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-600 font-extrabold block">
                      Due Soon
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {payments.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-2">
              <span className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-full">
                ✓
              </span>
              <p className="text-xs font-bold text-zinc-400">All supplier payables clear.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
