"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatRs } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface DashboardCardsProps {
  data: {
    activeCustomersCount: number;
    customerCreditOutstanding: string;
    vendorPayable: string;
    thisMonthProfit: string;
    thisMonthExpenses: string;
  };
}

export function DashboardCards({ data }: DashboardCardsProps) {
  const router = useRouter();

  const cards = [
    {
      title: "ACTIVE CUSTOMERS",
      value: data.activeCustomersCount,
      isAmount: false,
      borderColor: "border-t-[4px] border-t-blue-500",
      textColor: "text-zinc-800 dark:text-zinc-100",
      clickPath: "/sales"
    },
    {
      title: "CUSTOMER CREDIT OUTSTANDING",
      value: Number(data.customerCreditOutstanding),
      isAmount: true,
      borderColor: "border-t-[4px] border-t-red-500",
      textColor: "text-red-600 dark:text-red-400 font-extrabold",
      clickPath: "/sales"
    },
    {
      title: "VENDOR PAYABLE",
      value: Number(data.vendorPayable),
      isAmount: true,
      borderColor: "border-t-[4px] border-t-red-500",
      textColor: "text-red-600 dark:text-red-400 font-extrabold",
      clickPath: "/purchase"
    },
    {
      title: "THIS MONTH PROFIT",
      value: Number(data.thisMonthProfit),
      isAmount: true,
      borderColor: "border-t-[4px] border-t-green-500",
      textColor: "text-emerald-600 dark:text-emerald-400 font-extrabold",
      clickPath: "/reports"
    },
    {
      title: "THIS MONTH EXPENSES",
      value: Number(data.thisMonthExpenses),
      isAmount: true,
      borderColor: "border-t-[4px] border-t-blue-500",
      textColor: "text-zinc-800 dark:text-zinc-100",
      clickPath: "/cashbook"
    }
  ];

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 font-sans">
      {cards.map((c, idx) => (
        <Card
          key={idx}
          onClick={() => router.push(c.clickPath)}
          className={`cursor-pointer overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 ${c.borderColor}`}
        >
          <CardContent className="p-5">
            <div className="flex flex-col space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">
                {c.title}
              </span>
              <h3 className={`text-2xl tracking-tight leading-none ${c.textColor}`}>
                {c.isAmount ? formatRs(c.value) : c.value}
              </h3>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
