"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";

interface LowStockItem {
  id: string;
  code: string;
  name: string;
  stock: number;
  reorderAt: number;
}

interface LowStockWidgetProps {
  items: LowStockItem[];
}

export function LowStockWidget({ items }: LowStockWidgetProps) {
  const router = useRouter();

  const handleQuickReorder = (item: LowStockItem) => {
    const recommendedQty = item.reorderAt * 2 - item.stock;
    router.push(`/purchase?newOrder=true&prefillProduct=${item.code}&qty=${recommendedQty}`);
  };

  return (
    <Card className="border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm rounded-lg overflow-hidden h-[420px] flex flex-col justify-between font-sans">
      <CardHeader className="pb-2 p-5">
        <CardTitle className="text-base font-bold text-zinc-850 dark:text-zinc-50 tracking-wider flex items-center gap-2">
          Critical Inventory Alerts
        </CardTitle>
        <CardDescription className="text-xs text-zinc-600 font-bold dark:text-zinc-355 mt-1">
          Stock items running below the defined safety thresholds
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-grow pt-2 overflow-y-auto px-5 pb-5">
        <div className="space-y-3">
          {items.map((item) => {
            const isCriticallyLow = item.stock < item.reorderAt * 0.5;

            return (
              <div
                key={item.id}
                className={`p-3 rounded-lg border flex items-center justify-between transition-all duration-300 ${
                  isCriticallyLow
                    ? "bg-rose-50/10 border-rose-250 dark:border-rose-900/30"
                    : "border-zinc-250 dark:border-zinc-800 hover:border-zinc-350 dark:hover:border-zinc-700 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded mt-0.5 ${
                    isCriticallyLow ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-150" : "bg-zinc-50 text-zinc-500 dark:bg-zinc-900 border border-zinc-200"
                  }`}>
                    <AlertCircle className="h-4 w-4 stroke-[2.5]" />
                  </div>
                  <div className="space-y-0.5 pr-2">
                    <span className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 block">{item.code}</span>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-150 block max-w-[160px] truncate">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-zinc-650 font-bold block dark:text-zinc-350">
                      In Stock: <span className="font-extrabold text-zinc-850 dark:text-zinc-200">{item.stock}</span> | Safety Limit: <span className="font-extrabold text-zinc-850 dark:text-zinc-200">{item.reorderAt}</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleQuickReorder(item)}
                  className="px-2.5 py-1.5 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 text-[10px] font-bold rounded flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer border border-zinc-950"
                >
                  <ShoppingCart className="h-3.5 w-3.5 stroke-[2.5]" />
                  Quick PO
                </button>
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-2">
              <span className="p-2.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-full border border-emerald-150">
                ✓
              </span>
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">All warehouse stocks healthy.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
