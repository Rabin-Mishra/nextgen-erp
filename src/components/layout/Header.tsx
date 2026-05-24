"use client";

import React from "react";
import { signOut } from "next-auth/react";
import type { Role } from "../../lib/constants";
import { CURRENCY, ROLE_LABELS } from "../../lib/constants";
import { formatDate } from "../../lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import { Bell, Menu, Landmark } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { Sidebar } from "./Sidebar";

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    role: Role;
  };
  lowStockCount?: number;
  pendingPaymentsCount?: number;
}

export function Header({
  user,
  lowStockCount = 3, // Defaults for visual presentation
  pendingPaymentsCount = 5,
}: HeaderProps) {
  const [open, setOpen] = React.useState(false);
  const getFormattedDate = () => formatDate(new Date());

  const totalNotifications = lowStockCount + pendingPaymentsCount;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-100 bg-white px-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      {/* Mobile Nav Drawer & Page Title */}
      <div className="flex items-center gap-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-10 w-10 text-zinc-500 hover:bg-zinc-100 rounded-xl dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r-0">
            <Sidebar user={user} onMobileClose={() => setOpen(false)} isMobileDrawer={true} />
          </SheetContent>
        </Sheet>
        
        <h2 className="hidden sm:block text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          NextGen Interior & Waterproofing ERP
        </h2>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-4">
        {/* Current Date */}
        <span className="hidden md:block text-xs font-semibold text-zinc-500 tracking-tight dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 px-3 py-1.5 rounded-xl">
          {getFormattedDate()}
        </span>

        {/* NPR Currency Indicator */}
        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 tracking-tight dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 px-3 py-1.5 rounded-xl">
          <Landmark className="h-3.5 w-3.5" />
          {CURRENCY}
        </span>

        {/* Notification Bell */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-10 w-10 text-zinc-500 hover:bg-zinc-100 rounded-xl dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              <Bell className="h-5 w-5" />
              {totalNotifications > 0 && (
                <span className="absolute right-2 top-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-white border border-zinc-100 shadow-xl rounded-2xl dark:bg-zinc-950 dark:border-zinc-800">
            <DropdownMenuLabel className="font-bold">Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator className="border-zinc-100 dark:border-zinc-800" />
            
            {lowStockCount > 0 && (
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">Low Stock Warning</span>
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  {lowStockCount} items have fallen below their minimum stock levels.
                </p>
              </DropdownMenuItem>
            )}

            {pendingPaymentsCount > 0 && (
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 border-t border-zinc-100 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Pending Payments</span>
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  {pendingPaymentsCount} purchase invoices are pending approval or payment.
                </p>
              </DropdownMenuItem>
            )}

            {totalNotifications === 0 && (
              <div className="p-4 text-center text-xs text-zinc-400 font-medium">
                No notifications.
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-xl p-0">
              <Avatar className="h-10 w-10 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <AvatarFallback className="bg-zinc-100 text-zinc-700 text-xs font-bold rounded-xl dark:bg-zinc-900 dark:text-zinc-300">
                  {user.name ? user.name.substring(0, 2).toUpperCase() : "US"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white border border-zinc-100 shadow-xl rounded-2xl dark:bg-zinc-950 dark:border-zinc-800">
            <DropdownMenuLabel className="font-normal flex flex-col p-3">
              <p className="text-sm font-semibold text-zinc-800 truncate dark:text-zinc-100">
                {user.name || "User"}
              </p>
              <p className="text-xs text-zinc-400 truncate mt-0.5">
                {ROLE_LABELS[user.role]}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="border-zinc-100 dark:border-zinc-800" />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-rose-600 font-semibold focus:text-rose-600 focus:bg-rose-50/50 cursor-pointer p-3 rounded-xl dark:focus:bg-rose-950/20"
            >
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default Header;
