"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

interface DailyFlowItem {
  day: number;
  dateString: string;
  inflow: string;
  outflow: string;
}

interface CashFlowChartProps {
  dailyFlow: DailyFlowItem[];
  openingBalance: number;
}

export function CashFlowChart({ dailyFlow, openingBalance }: CashFlowChartProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Pre-calculate running closing balance chronologically
  const chartData = useMemo(() => {
    let running = Number(openingBalance);
    return dailyFlow.map(item => {
      const inf = Number(item.inflow);
      const out = Number(item.outflow);
      running = running + inf - out;
      
      return {
        day: item.day,
        dateString: item.dateString,
        inflow: inf,
        outflow: out,
        balance: running
      };
    });
  }, [dailyFlow, openingBalance]);

  return (
    <Card className="border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/60 shadow-sm rounded-3xl overflow-hidden h-[420px] flex flex-col justify-between w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">
          Cash Flow & Vault Reconciliations
        </CardTitle>
        <CardDescription className="text-xs text-zinc-400 font-medium">
          Sequential daily closing cash balances this month
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-grow pt-4">
        <div style={{ width: '100%', height: 288, minWidth: 0 }}>
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={chartData} margin={{ top: 10, right: 5, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" className="dark:stroke-zinc-800" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `Day ${v}`}
                  tick={{ fill: "#a1a1aa", fontSize: 10, fontWeight: 600 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 100000).toFixed(1)}L`}
                  tick={{ fill: "#a1a1aa", fontSize: 10, fontWeight: 500 }}
                />
                <Tooltip
                  formatter={(value: any, name?: any) => {
                    if (name === "balance") return [`NPR ${value.toLocaleString("en-IN")}`, "Closing Cash Balance"];
                    if (name === "inflow") return [`NPR ${value.toLocaleString("en-IN")}`, "Daily Inflow"];
                    return [`NPR ${value.toLocaleString("en-IN")}`, "Daily Outflow"];
                  }}
                  contentStyle={{
                    backgroundColor: "rgba(9, 9, 11, 0.95)",
                    border: "none",
                    borderRadius: "16px",
                    color: "#f4f4f5",
                    fontSize: "11px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
                  }}
                  labelFormatter={(label) => `Day ${label} of Month`}
                  labelStyle={{ fontWeight: "bold", color: "#a1a1aa", fontSize: "11px", marginBottom: "4px" }}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#chartBalanceGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[288px] flex items-center justify-center text-xs text-zinc-400">Loading chart...</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
