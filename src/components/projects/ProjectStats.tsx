"use client";

import { Briefcase, Coins, TrendingUp, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNPR } from "@/lib/utils";
import type { ProjectStatsSchema } from "@/modules/projects/types";

interface ProjectStatsProps {
  stats: ProjectStatsSchema;
}

export function ProjectStats({ stats }: ProjectStatsProps) {
  const profit = parseFloat(stats.totalProfit);
  const margin = parseFloat(stats.avgMarginPercent);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Active Projects */}
      <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Active Projects</CardTitle>
          <div className="p-2.5 rounded-xl text-blue-500 bg-blue-50 dark:bg-blue-950/20">
            <Briefcase className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {stats.activeCount}
          </div>
          <p className="text-xs text-zinc-400 font-medium mt-1">Currently running site jobs</p>
        </CardContent>
      </Card>

      {/* Total Billed Revenue */}
      <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Billed</CardTitle>
          <div className="p-2.5 rounded-xl text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20">
            <Coins className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {formatNPR(parseFloat(stats.totalRevenue))}
          </div>
          <p className="text-xs text-zinc-400 font-medium mt-1">Milestone sales billings raised</p>
        </CardContent>
      </Card>

      {/* Total Cost */}
      <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Material Cost</CardTitle>
          <div className="p-2.5 rounded-xl text-purple-500 bg-purple-50 dark:bg-purple-950/20">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {formatNPR(parseFloat(stats.totalCost))}
          </div>
          <p className="text-xs text-zinc-400 font-medium mt-1">Value of materials dispatched</p>
        </CardContent>
      </Card>

      {/* Profit & Margin */}
      <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Net Profit (Margin)</CardTitle>
          <div className="p-2.5 rounded-xl text-orange-500 bg-orange-50 dark:bg-orange-950/20">
            <TrendingUp className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {formatNPR(profit)}
          </div>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Avg Margin:{" "}
            <span
              className={
                margin >= 20
                  ? "font-bold text-green-600 dark:text-green-400"
                  : margin >= 10
                  ? "font-bold text-amber-600 dark:text-amber-400"
                  : "font-bold text-red-600 dark:text-red-400"
              }
            >
              {margin}%
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
