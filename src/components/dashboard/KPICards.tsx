"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatRs } from "@/lib/utils";
import {
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
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50",
      borderColor: "border-t-[4px] border-t-emerald-500 shadow-[0_1px_3px_rgba(16,185,129,0.1)]",
      textColor: "text-emerald-600 dark:text-emerald-450 font-black",
      clickPath: "/ledger"
    },
    {
      title: "Expenses This Month",
      value: Number(data.expenses.thisMonth),
      isAmount: true,
      desc: "Direct Operations Expenses & Depr.",
      trend: data.expenses.pctChange,
      icon: Layers,
      color: "text-rose-600 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50",
      borderColor: "border-t-[4px] border-t-rose-500 shadow-[0_1px_3px_rgba(239,68,68,0.1)]",
      textColor: "text-rose-600 dark:text-rose-450 font-black",
      clickPath: "/cashbook"
    },
    {
      title: "Active Construction Sites",
      value: data.projects.activeCount,
      isAmount: false,
      desc: `${data.projects.planningCount} projects pending approval`,
      trend: null,
      icon: Briefcase,
      color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/50",
      borderColor: "border-t-[4px] border-t-purple-500 shadow-[0_1px_3px_rgba(168,85,247,0.1)]",
      textColor: "text-purple-600 dark:text-purple-450 font-black",
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
        ? "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 animate-pulse-slow"
        : "text-zinc-500 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800",
      borderColor: data.lowStock.count > 0 
        ? "border-t-[4px] border-t-amber-500 shadow-[0_1px_3px_rgba(245,158,11,0.1)]" 
        : "border-t-[4px] border-t-zinc-400 dark:border-t-zinc-700",
      textColor: data.lowStock.count > 0 
        ? "text-amber-600 dark:text-amber-450 font-black" 
        : "text-zinc-800 dark:text-zinc-150 font-black",
      clickPath: "/inventory"
    }
  ];

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 font-sans">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        const isPositive = c.trend !== null && c.trend >= 0;

        return (
          <Card
            key={idx}
            onClick={() => router.push(c.clickPath)}
            className={`group relative cursor-pointer overflow-hidden border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg shadow-sm hover:shadow-md hover:border-zinc-350 dark:hover:border-zinc-700 transition-all duration-300 transform hover:-translate-y-0.5 ${c.borderColor}`}
          >
            {/* Soft decorative backdrop blur card gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-zinc-900/10 pointer-events-none" />

            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                  {c.title}
                </span>
                <div className={`p-2 rounded-xl border transition-all duration-300 group-hover:scale-105 ${c.color}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </div>

              <div className="mt-4 flex flex-col justify-end space-y-1">
                <h3 className={`text-2xl tracking-tight leading-none ${c.textColor}`}>
                  {c.isAmount ? formatRs(c.value) : c.value}
                </h3>

                <div className="flex items-center gap-1.5 pt-1.5">
                  {c.trend !== null ? (
                    <>
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-black rounded px-1.5 py-0.5 ${
                        isPositive
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-450"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-450"
                      }`}>
                        {isPositive ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {Math.abs(c.trend)}%
                      </span>
                      <span className="text-[10px] text-zinc-600 font-bold dark:text-zinc-400">
                        vs last month
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-zinc-600 font-bold tracking-wide dark:text-zinc-350">
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
