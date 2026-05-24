"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { formatRs, convertToBS } from "@/lib/utils";

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: Date;
  paymentMethod: string;
  totalAmount: string;
  status: string;
}

interface RecentSalesBillsWidgetProps {
  invoices: Invoice[];
}

export function RecentSalesBillsWidget({ invoices }: RecentSalesBillsWidgetProps) {
  return (
    <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg shadow-sm font-sans flex flex-col h-[350px]">
      <CardHeader className="flex flex-row items-center justify-between p-5 pb-0">
        <CardTitle className="text-base font-bold text-zinc-800 dark:text-zinc-100">
          Recent Sales Bills
        </CardTitle>
        <Link
          href="/sales"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        >
          View All
        </Link>
      </CardHeader>

      <CardContent className="p-5 flex flex-1 overflow-hidden">
        {/* Scrollable Table Area */}
        <div className="w-full overflow-y-auto border border-zinc-100 dark:border-zinc-800 rounded-lg">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                <th className="p-3">BILL NO</th>
                <th className="p-3">CUSTOMER</th>
                <th className="p-3 whitespace-nowrap">DATE (BS)</th>
                <th className="p-3 text-center">TYPE</th>
                <th className="p-3 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length > 0 ? (
                invoices.map((inv) => {
                  const isCredit = inv.paymentMethod === "CREDIT";
                  return (
                    <tr
                      key={inv.id}
                      className="border-b border-zinc-100 dark:border-zinc-800 last:border-none hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="p-3 font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap cursor-pointer">
                        <Link href={`/sales?invoiceId=${inv.id}`}>{inv.invoiceNumber}</Link>
                      </td>
                      <td className="p-3 font-medium text-zinc-800 dark:text-zinc-200 max-w-[120px] truncate">
                        {inv.customerName}
                      </td>
                      <td className="p-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {convertToBS(inv.date)}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                            isCredit
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                          }`}
                        >
                          {isCredit ? "credit" : "cash"}
                        </span>
                      </td>
                      <td className="p-3 text-right text-zinc-900 dark:text-zinc-50 font-bold whitespace-nowrap">
                        {formatRs(Number(inv.totalAmount))}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                    No recent sales invoices.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
