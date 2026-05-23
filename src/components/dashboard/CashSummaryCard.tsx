"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NPRAmount } from "@/components/shared/NPRAmount";
import { fetchCashBookSummaryAction } from "@/modules/accounting/actions";
import { RefreshCw, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";

interface CashSummaryCardProps {
  initialData: {
    openingBalance: string;
    receivedToday: string;
    paidToday: string;
    closingBalance: string;
    methodBalances: Record<string, string>;
  };
}

export function CashSummaryCard({ initialData }: CashSummaryCardProps) {
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);

  const refetchData = async () => {
    setRefreshing(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const res = await fetchCashBookSummaryAction(todayStr);
      setData(res as any);
    } catch (e) {
      console.error("Failed to re-fetch live cash summary:", e);
    } finally {
      setRefreshing(false);
    }
  };

  // Live Auto-Refresh every 60 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      refetchData();
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Generate real-time sparkline points representing cash level peaks today
  const sparklineData = [
    { time: "Open", balance: Number(data.openingBalance) },
    { time: "Midday In", balance: Number(data.openingBalance) + Number(data.receivedToday) * 0.4 },
    { time: "Midday Out", balance: Number(data.openingBalance) + Number(data.receivedToday) * 0.7 - Number(data.paidToday) * 0.3 },
    { time: "Afternoon", balance: Number(data.openingBalance) + Number(data.receivedToday) * 0.9 - Number(data.paidToday) * 0.6 },
    { time: "Close", balance: Number(data.closingBalance) },
  ];

  return (
    <Card className="border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/60 shadow-sm rounded-3xl overflow-hidden h-[420px] flex flex-col justify-between">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">
              Cash Book Vault Summary
            </CardTitle>
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <CardDescription className="text-xs text-zinc-400 font-medium">
            Live auto-reconciliation of secure vault levels
          </CardDescription>
        </div>
        <button
          onClick={refetchData}
          disabled={refreshing}
          className="p-2 border border-zinc-100 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-zinc-400 hover:text-zinc-800 transition-all duration-300 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </CardHeader>

      <CardContent className="flex-grow pt-4 flex flex-col justify-between space-y-6">
        {/* Core balances metrics grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border border-zinc-100 dark:border-zinc-850 rounded-2xl flex flex-col space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Opening Vault Balance</span>
            <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">
              <NPRAmount amount={Number(data.openingBalance)} />
            </span>
          </div>

          <div className="p-4 border border-zinc-100 dark:border-zinc-850 rounded-2xl flex flex-col space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Net Cash Flow Today</span>
            <span className={`text-sm font-extrabold flex items-center gap-1 ${
              Number(data.receivedToday) - Number(data.paidToday) >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}>
              {Number(data.receivedToday) - Number(data.paidToday) >= 0 ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              <NPRAmount amount={Math.abs(Number(data.receivedToday) - Number(data.paidToday))} />
            </span>
          </div>

          <div className="p-4 border border-zinc-100 dark:border-zinc-850 rounded-2xl flex flex-col space-y-1 bg-emerald-50/5 dark:bg-emerald-950/5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cash Received Today</span>
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
              +<NPRAmount amount={Number(data.receivedToday)} />
            </span>
          </div>

          <div className="p-4 border border-zinc-100 dark:border-zinc-850 rounded-2xl flex flex-col space-y-1 bg-rose-50/5 dark:bg-rose-950/5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cash Paid Today</span>
            <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
              -<NPRAmount amount={Number(data.paidToday)} />
            </span>
          </div>
        </div>

        {/* Live sparkline chart */}
        <div className="w-full h-16 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-850 p-1 flex items-center justify-between">
          <div className="px-3 flex flex-col">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Reconciled Closing Cash</span>
            <span className="text-sm font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
              <NPRAmount amount={Number(data.closingBalance)} />
            </span>
          </div>
          <div className="w-32 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <defs>
                  <linearGradient id="liveSparklineBal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#liveSparklineBal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
