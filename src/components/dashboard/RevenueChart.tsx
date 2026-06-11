"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface RevenueChartProps {
  data: Array<{
    month: string;
    RETAIL: number;
    WHOLESALE: number;
    PROJECT: number;
  }>;
}

function formatNPR(value: number) {
  if (value >= 100000) {
    return `NPR ${(value / 100000).toFixed(1)}L`;
  }
  return `NPR ${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function RevenueChart({ data }: RevenueChartProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Card className="border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/60 shadow-sm rounded-3xl overflow-hidden h-[420px] flex flex-col justify-between w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">
          Sales Revenue by Channel
        </CardTitle>
        <CardDescription className="text-xs text-zinc-400 font-medium">
          Rolling 6-month comparison of billing streams
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow pt-4">
        <div style={{ width: '100%', height: 288, minWidth: 0 }}>
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={data} margin={{ top: 10, right: 5, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" className="dark:stroke-zinc-800" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#a1a1aa", fontSize: 10, fontWeight: 600 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 100000).toFixed(1)}L`}
                  tick={{ fill: "#a1a1aa", fontSize: 10, fontWeight: 500 }}
                />
                <Tooltip
                  formatter={(value: any) => [
                    `NPR ${value.toLocaleString("en-IN")}`,
                    ""
                  ]}
                  contentStyle={{
                    backgroundColor: "rgba(9, 9, 11, 0.95)",
                    border: "none",
                    borderRadius: "16px",
                    color: "#f4f4f5",
                    fontSize: "11px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
                  }}
                  labelStyle={{ fontWeight: "bold", color: "#a1a1aa", fontSize: "11px", marginBottom: "4px" }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "10px", fontWeight: 600, color: "#71717a", paddingTop: "15px" }}
                />
                <Bar dataKey="RETAIL" name="Retail Channel" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="WHOLESALE" name="Wholesale Channel" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="PROJECT" name="Projects Channel" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[288px] flex items-center justify-center text-xs text-zinc-400">Loading chart...</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
