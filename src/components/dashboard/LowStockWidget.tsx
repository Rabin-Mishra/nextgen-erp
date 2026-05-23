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
    // Prefill parameters: recommend buying double the reorder level to restock
    const recommendedQty = item.reorderAt * 2 - item.stock;
    router.push(`/purchase?newOrder=true&prefillProduct=${item.code}&qty=${recommendedQty}`);
  };

  return (
    <Card className="border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/60 shadow-sm rounded-3xl overflow-hidden h-[420px] flex flex-col justify-between">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider flex items-center gap-2">
          Critical Inventory Alerts
        </CardTitle>
        <CardDescription className="text-xs text-zinc-400 font-medium">
          Stock items running below the defined safety thresholds
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-grow pt-4 overflow-y-auto">
        <div className="space-y-4">
          {items.map((item) => {
            const isCriticallyLow = item.stock < item.reorderAt * 0.5;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border flex items-center justify-between transition-all duration-300 ${
                  isCriticallyLow
                    ? "bg-rose-50/20 border-rose-100 dark:border-rose-900/30"
                    : "border-zinc-100 dark:border-zinc-850"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl mt-0.5 ${
                    isCriticallyLow ? "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400" : "bg-zinc-50 text-zinc-400 dark:bg-zinc-900"
                  }`}>
                    <AlertCircle className="h-4.5 w-4.5" />
                  </div>
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-black text-zinc-400 block">{item.code}</span>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block max-w-[160px] truncate">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-semibold block">
                      In Stock: <span className="font-extrabold text-zinc-600 dark:text-zinc-350">{item.stock}</span> | Safety Limit: <span className="font-extrabold">{item.reorderAt}</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleQuickReorder(item)}
                  className="px-3 py-2 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 text-[10px] font-black rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Quick PO
                </button>
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-2">
              <span className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-full">
                ✓
              </span>
              <p className="text-xs font-bold text-zinc-400">All warehouse stocks healthy.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
