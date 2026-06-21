"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatRs } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Briefcase, LayoutGrid } from "lucide-react";

interface ProjectSummaryItem {
  id: string;
  name: string;
  clientName: string;
  contractAmount: string;
  totalBilled: string;
  materialCost: string;
  margin: number;
  status: string;
}

interface ProjectCardsProps {
  projects: ProjectSummaryItem[];
}

export function ProjectCards({ projects }: ProjectCardsProps) {
  const router = useRouter();

  return (
    <Card className="border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm rounded-lg overflow-hidden font-sans">
      <CardHeader className="pb-2 flex flex-row items-center justify-between p-5">
        <div>
          <CardTitle className="text-base font-black text-zinc-900 dark:text-zinc-50 tracking-wider flex items-center gap-2">
            Active Construction Sites Overview
          </CardTitle>
          <CardDescription className="text-xs text-zinc-605 font-bold dark:text-zinc-350 mt-1">
            Monitor real-time job-costing material allocations vs contract budgets
          </CardDescription>
        </div>
        <LayoutGrid className="h-4.5 w-4.5 text-zinc-400 stroke-[2.5]" />
      </CardHeader>

      <CardContent className="p-5 pt-2">
        <div className="max-h-[480px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((prj) => {
              const contractVal = Number(prj.contractAmount);
              const costVal = Number(prj.materialCost);
              
              // Calculate progress: how much of the budget has been consumed by material issues
              const pctConsumed = contractVal > 0 ? (costVal / contractVal) * 100 : 0;
              
              // Progress bar colors: Green (<50%), Amber (50-80%), Red (>80%)
              let progressBarColor = "bg-emerald-500";
              if (pctConsumed >= 80) {
                progressBarColor = "bg-rose-500 animate-pulse";
              } else if (pctConsumed >= 50) {
                progressBarColor = "bg-amber-500";
              }

              const isHighMargin = prj.margin >= 20;
              const isLowMargin = prj.margin < 10;

              return (
                <div
                  key={prj.id}
                  onClick={() => router.push(`/projects/${prj.id}`)}
                  className="w-full p-4 rounded-lg border border-zinc-250 dark:border-zinc-800 dark:bg-zinc-950 cursor-pointer transform hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                >
                  <div>
                    {/* Status header */}
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                        prj.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-850 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200"
                          : prj.status === "ON_HOLD"
                          ? "bg-amber-100 text-amber-850 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200"
                          : "bg-zinc-100 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200"
                      }`}>
                        {prj.status}
                      </span>
                      <Briefcase className="h-4 w-4 text-zinc-400 stroke-[2.5]" />
                    </div>

                    {/* Description */}
                    <div className="mt-3 space-y-0.5">
                      <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 truncate">
                        {prj.name}
                      </h4>
                      <span className="text-[10px] text-zinc-600 font-bold block truncate dark:text-zinc-350">
                        Client: {prj.clientName}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar visualizer */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] font-extrabold text-zinc-550 dark:text-zinc-300 uppercase tracking-wider">
                      <span>Material Cost Consumed</span>
                      <span>{pctConsumed.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(pctConsumed, 100)}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`}
                      />
                    </div>
                  </div>

                  {/* Margins breakdown */}
                  <div className="grid grid-cols-2 gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-3 text-center">
                    <div className="flex flex-col space-y-0.5">
                      <span className="text-[8px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Contract Budget</span>
                      <span className="text-xs font-black text-zinc-900 dark:text-zinc-200 whitespace-nowrap">
                        {formatRs(contractVal)}
                      </span>
                    </div>

                    <div className="flex flex-col space-y-0.5 border-l border-zinc-200 dark:border-zinc-800">
                      <span className="text-[8px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Net Margin</span>
                      <span className={`text-xs font-black ${
                        isHighMargin
                          ? "text-emerald-700 dark:text-emerald-450"
                          : isLowMargin
                          ? "text-rose-700 dark:text-rose-455"
                          : "text-amber-600"
                      }`}>
                        {prj.margin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {projects.length === 0 && (
              <div className="flex flex-col items-center justify-center p-12 text-center w-full col-span-full">
                <p className="text-xs font-extrabold text-zinc-500 dark:text-zinc-400">No active project construction sites logged yet.</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
