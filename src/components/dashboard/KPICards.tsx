"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { NPRAmount } from "@/components/shared/NPRAmount";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { useRouter } from "next/navigation";

interface KPICardsProps {
  data: {
    revenue: {
      thisMonth: string;
      pctChange: number;
    };
    expenses: {
      thisMonth: string;
      pctChange: number;
    };
    projects: {
      activeCount: number;
      planningCount: number;
    };
    lowStock: {
      count: number;
    };
  };
}

export function KPICards({ data }: KPICardsProps) {
  const router = useRouter();

  const cards = [
    {
      title: "Revenue This Month",
      value: Number(data.revenue.thisMonth),
      isAmount: true,
      desc: "Chronological Channel Billings (MoM)",
      trend: data.revenue.pctChange,
      icon: DollarSign,
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30",
      clickPath: "/ledger"
    },
    {
      title: "Expenses This Month",
      value: Number(data.expenses.thisMonth),
      isAmount: true,
      desc: "Direct Operations Expenses & Depr.",
      trend: data.expenses.pctChange,
      icon: Layers,
      color: "text-rose-500 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30",
      clickPath: "/cashbook"
    },
    {
      title: "Active Construction Sites",
      value: data.projects.activeCount,
      isAmount: false,
      desc: `${data.projects.planningCount} projects pending approval`,
      trend: null,
      icon: Briefcase,
      color: "text-purple-500 bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30",
      clickPath: "/projects"
    },
    {
      title: "Low Stock Inventory Alerts",
      value: data.lowStock.count,
      isAmount: false,
      desc: data.lowStock.count > 0 ? "Requires purchase reorder" : "Stock levels healthy",
      trend: null,
      icon: AlertTriangle,
      color: data.lowStock.count > 0
        ? "text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30 animate-pulse-slow"
        : "text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800",
      clickPath: "/inventory"
    }
  ];

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        const isPositive = c.trend !== null && c.trend >= 0;

        return (
          <Card
            key={idx}
            onClick={() => router.push(c.clickPath)}
            className="group relative cursor-pointer overflow-hidden border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/60 rounded-3xl shadow-sm hover:shadow-md hover:border-zinc-200 dark:hover:border-zinc-700 transition-all duration-300 transform hover:-translate-y-0.5"
          >
            {/* Soft decorative backdrop blur card gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-zinc-900/10 pointer-events-none" />

            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  {c.title}
                </span>
                <div className={`p-2.5 rounded-2xl border transition-all duration-300 group-hover:scale-105 ${c.color}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </div>

              <div className="mt-4 flex flex-col justify-end space-y-1">
                <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                  {c.isAmount ? <NPRAmount amount={c.value} /> : c.value}
                </h3>

                <div className="flex items-center gap-1.5 pt-1">
                  {c.trend !== null ? (
                    <>
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-extrabold rounded-lg px-1.5 py-0.5 ${
                        isPositive
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                          : "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400"
                      }`}>
                        {isPositive ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {Math.abs(c.trend)}%
                      </span>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        vs last month
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-zinc-400 font-semibold tracking-wide">
                      {c.desc}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
