import React from "react";
import { redirect } from "next/navigation";
import { auth } from "../../auth-middleware";
import { Sidebar } from "../../components/layout/Sidebar";
import { Header } from "../../components/layout/Header";
import { getDb } from "@/lib/db";
import Decimal from "decimal.js";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth();

  // If no session exists, redirect to login page (fallback check)
  if (!session?.user) {
    redirect("/login");
  }

  // Cast user role
  const user = {
    name: session.user.name,
    email: session.user.email,
    role: (session.user as any).role,
  };

  // Fetch dynamic notifications directly from the database (Server Component context)
  const db = await getDb();

  // 1. Calculate active low stock items count
  const products = await db.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      reorderLevel: true,
      stockEntries: { select: { quantity: true } }
    }
  });

  let lowStockCount = 0;
  for (const p of products) {
    const stockQty = p.stockEntries.reduce((sum, entry) => sum + entry.quantity.toNumber(), 0);
    if (stockQty <= p.reorderLevel) {
      lowStockCount++;
    }
  }

  // 2. Calculate pending purchase order payments count
  const purchaseOrders = await db.purchaseOrder.findMany({
    where: {
      status: { in: ["ORDERED", "PARTIAL", "RECEIVED"] }
    },
    select: {
      totalAmount: true,
      paidAmount: true,
    }
  });

  let pendingPaymentsCount = 0;
  for (const po of purchaseOrders) {
    const due = new Decimal(po.totalAmount).minus(new Decimal(po.paidAmount));
    if (due.greaterThan(0)) {
      pendingPaymentsCount++;
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar user={user} />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header Bar with live, dynamic notification counts */}
        <Header 
          user={user} 
          lowStockCount={lowStockCount} 
          pendingPaymentsCount={pendingPaymentsCount} 
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="mx-auto max-w-7xl h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
