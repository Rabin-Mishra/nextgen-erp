"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
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

  const mappedItems = items.map((item) => ({
    ...item,
    reorderLevel: item.reorderAt,
  }));

  return (
    <div className="w-full rounded-xl border bg-card p-6 font-sans">
      <div className="pb-4">
        <h3 className="text-base font-bold text-zinc-850 dark:text-zinc-50 tracking-wider flex items-center gap-2">
          Critical Inventory Alerts
        </h3>
        <p className="text-xs text-zinc-650 font-bold dark:text-zinc-350 mt-1">
          Stock items running below the defined safety thresholds
        </p>
      </div>

      <div className="max-h-[380px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mappedItems.map((item) => {
            const isCriticallyLow = item.stock < item.reorderLevel * 0.5;

            return (
              <div
                key={item.id}
                className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between gap-3 w-full bg-white dark:bg-zinc-950 hover:shadow-md transition-shadow shadow-sm"
              >
                <div className="space-y-2">
                  {/* Row 1 — Item code and status icon: */}
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${
                      isCriticallyLow 
                        ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100" 
                        : "bg-zinc-50 text-zinc-500 dark:bg-zinc-900 border border-zinc-200"
                    }`}>
                      <AlertCircle className="h-4 w-4 stroke-[2.5]" />
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {item.code}
                    </span>
                  </div>

                  {/* Row 2 — Full product name (NO truncation): */}
                  <p className="text-sm font-semibold leading-snug break-words whitespace-normal text-zinc-800 dark:text-zinc-200">
                    {item.name}
                  </p>
                </div>

                {/* Row 3 — Stock info and Quick PO button side by side: */}
                <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80">
                  <span className="text-xs text-muted-foreground">
                    In Stock: <strong className="text-zinc-800 dark:text-zinc-200">{item.stock}</strong> | Safety Limit: <strong className="text-zinc-800 dark:text-zinc-200">{item.reorderLevel}</strong>
                  </span>
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={() => handleQuickReorder(item as any)}
                    className="h-8 rounded-lg text-xs font-bold px-3 shadow-sm bg-rose-600 hover:bg-rose-700 text-white border-0"
                  >
                    Quick PO
                  </Button>
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-center space-y-2">
              <span className="p-2.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-full border border-emerald-150">
                ✓
              </span>
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                All warehouse stocks healthy.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
