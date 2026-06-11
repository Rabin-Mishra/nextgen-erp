"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";

function formatNPR(value: number) {
  return "NPR " + value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

// 1. REVENUE BY CHANNEL CHART (Stacked Bar last 6 months)
interface RevenueByChannelChartProps {
  data: Array<{ month: string; RETAIL: number; WHOLESALE: number; PROJECT: number }>;
}

export function RevenueByChannelChart({ data }: RevenueByChannelChartProps) {
  const chartData = data?.length > 0 ? data : [
    { month: "Poush", RETAIL: 420000, WHOLESALE: 850000, PROJECT: 1200000 },
    { month: "Magh", RETAIL: 580000, WHOLESALE: 920000, PROJECT: 1550000 },
    { month: "Falgun", RETAIL: 650000, WHOLESALE: 1100000, PROJECT: 1800000 },
    { month: "Chaitra", RETAIL: 720000, WHOLESALE: 1250000, PROJECT: 1950000 },
    { month: "Baisakh", RETAIL: 890000, WHOLESALE: 1450000, PROJECT: 2200000 },
    { month: "Jestha", RETAIL: 980000, WHOLESALE: 1650000, PROJECT: 2500000 },
  ];

  return (
    <div className="w-full h-80 pt-4">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#a1a1aa", fontSize: 10, fontWeight: 500 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${(v / 100000).toFixed(1)}L`}
            tick={{ fill: "#a1a1aa", fontSize: 10, fontWeight: 500 }}
          />
          <Tooltip
            formatter={(value: any) => [formatNPR(value), ""]}
            contentStyle={{ backgroundColor: "rgba(9, 9, 11, 0.95)", border: "none", borderRadius: "12px", color: "#f4f4f5" }}
            labelStyle={{ fontWeight: "bold", color: "#a1a1aa", fontSize: "11px", marginBottom: "4px" }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: "10px", fontWeight: 600, color: "#71717a" }} />
          <Bar dataKey="RETAIL" name="Retail Channel" stackId="a" fill="#2563eb" radius={[0, 0, 0, 0]} />
          <Bar dataKey="WHOLESALE" name="Wholesale Channel" stackId="a" fill="#16a34a" radius={[0, 0, 0, 0]} />
          <Bar dataKey="PROJECT" name="Projects Channel" stackId="a" fill="#7c3aed" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// 2. MONTHLY PROFIT TREND CHART (12 Months Line Chart)
interface MonthlyProfitTrendChartProps {
  data: Array<{ month: string; profit: number }>;
}

export function MonthlyProfitTrendChart({ data }: MonthlyProfitTrendChartProps) {
  const chartData = data?.length > 0 ? data : [
    { month: "Shrawan", profit: 240000 },
    { month: "Bhadra", profit: 380000 },
    { month: "Ashwin", profit: -120000 },
    { month: "Kartik", profit: 450000 },
    { month: "Mangsir", profit: 620000 },
    { month: "Poush", profit: 790000 },
    { month: "Magh", profit: 890000 },
    { month: "Falgun", profit: 1100000 },
    { month: "Chaitra", profit: 1250000 },
    { month: "Baisakh", profit: 1400000 },
    { month: "Jestha", profit: 1650000 },
    { month: "Ashadh", profit: 1850000 },
  ];

  return (
    <div className="w-full h-80 pt-4">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#a1a1aa", fontSize: 10 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${(v / 100000).toFixed(1)}L`}
            tick={{ fill: "#a1a1aa", fontSize: 10 }}
          />
          <Tooltip
            formatter={(value: any) => [formatNPR(value), "Net Profit"]}
            contentStyle={{ backgroundColor: "rgba(9, 9, 11, 0.95)", border: "none", borderRadius: "12px", color: "#f4f4f5" }}
          />
          <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={3} dot={{ stroke: "#3b82f6", strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// 3. TOP SELLING ITEMS CHART (Horizontal Bar Chart)
interface TopSellingItemsChartProps {
  data: Array<{ name: string; revenue: number }>;
}

export function TopSellingItemsChart({ data }: TopSellingItemsChartProps) {
  const chartData = data?.length > 0 ? data : [
    { name: "Shivam OPC Cement", revenue: 1420000 },
    { name: "Asian Paints Royale", revenue: 980000 },
    { name: "Finolex 2.5mm Wire", revenue: 760000 },
    { name: "Supreme PVC 4inch", revenue: 650000 },
    { name: "Pidilite LW+ Chem", revenue: 410000 },
  ];

  return (
    <div className="w-full h-80 pt-4">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" className="dark:stroke-zinc-800" />
          <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 100000).toFixed(1)}L`} tick={{ fill: "#a1a1aa", fontSize: 10 }} />
          <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={120} tick={{ fill: "#a1a1aa", fontSize: 10 }} />
          <Tooltip
            formatter={(value: any) => [formatNPR(value), "Revenue"]}
            contentStyle={{ backgroundColor: "rgba(9, 9, 11, 0.95)", border: "none", borderRadius: "12px", color: "#f4f4f5" }}
          />
          <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// 4. CASH FLOW MINI CHART (Sparkline for today's cash vault levels)
interface CashFlowMiniChartProps {
  data: Array<{ time: string; balance: number }>;
}

export function CashFlowMiniChart({ data }: CashFlowMiniChartProps) {
  const chartData = data?.length > 0 ? data : [
    { time: "09:00", balance: 140000 },
    { time: "11:00", balance: 185000 },
    { time: "13:00", balance: 165000 },
    { time: "15:00", balance: 220000 },
    { time: "17:00", balance: 195000 },
  ];

  return (
    <div className="w-full h-24">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <Tooltip
            formatter={(value: any) => [formatNPR(value), "Cash Balance"]}
            contentStyle={{ backgroundColor: "rgba(9, 9, 11, 0.95)", border: "none", borderRadius: "10px", color: "#f4f4f5", fontSize: "10px" }}
          />
          <defs>
            <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorBal)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
