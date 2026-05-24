"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { formatRs } from "@/lib/utils";

interface ExpenseRow {
  category: string;
  amount: string;
}

interface ThisMonthExpensesWidgetProps {
  expenses: ExpenseRow[];
}

export function ThisMonthExpensesWidget({ expenses }: ThisMonthExpensesWidgetProps) {
  // Calculate dynamic Bikram Sambat (BS) year and month
  const today = new Date();
  const bsYear = today.getFullYear() + 57;
  const bsMonth = String(((today.getMonth() + 8) % 12) + 1).padStart(2, "0");

  return (
    <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg shadow-sm font-sans flex flex-col h-[350px]">
      <CardHeader className="flex flex-row items-center justify-between p-5 pb-0">
        <CardTitle className="text-base font-bold text-zinc-800 dark:text-zinc-100">
          This Month Expenses (BS {bsYear}/{bsMonth})
        </CardTitle>
        <Link
          href="/cashbook"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        >
          View Details
        </Link>
      </CardHeader>

      <CardContent className="p-5 flex flex-1 overflow-hidden">
        {/* Scrollable Table Area */}
        <div className="w-full overflow-y-auto border border-zinc-100 dark:border-zinc-800 rounded-lg">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                <th className="p-3">CATEGORY</th>
                <th className="p-3 text-right">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-zinc-100 dark:border-zinc-800 last:border-none hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="p-3 font-medium text-zinc-800 dark:text-zinc-200">
                    {row.category}
                  </td>
                  <td className="p-3 text-right text-zinc-900 dark:text-zinc-50 font-bold whitespace-nowrap">
                    {formatRs(Number(row.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
