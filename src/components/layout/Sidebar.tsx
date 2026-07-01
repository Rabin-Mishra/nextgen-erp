"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Role } from "../../lib/constants";
import { hasPermission, Module } from "../../auth/permissions";
import { Badge } from "../ui/badge";
import { ROLE_LABELS } from "../../lib/constants";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  FileSpreadsheet,
  Briefcase,
  BookOpen,
  Wallet,
  BarChart3,
  Users,
  Settings,
  LogOut,
  CreditCard,
  TrendingUp,
  Landmark,
} from "lucide-react";
import { Button } from "../ui/button";

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role: Role;
  };
  onMobileClose?: () => void;
  isMobileDrawer?: boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  module: Module | "settings";
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
  { label: "Inventory", href: "/inventory", icon: Package, module: "inventory" },
  { label: "Purchase", href: "/purchase", icon: ShoppingBag, module: "purchase" },
  { label: "Sales", href: "/sales", icon: FileSpreadsheet, module: "sales" },
  { label: "Projects", href: "/projects", icon: Briefcase, module: "projects" },
  { label: "Capital & Assets", href: "/assets", icon: Landmark, module: "ledger" },
  { label: "Ledger", href: "/ledger", icon: BookOpen, module: "ledger" },
  { label: "Cash Book", href: "/cashbook", icon: Wallet, module: "cashbook" },
  { label: "Expenses", href: "/expenses", icon: CreditCard, module: "expenses" },
  { label: "Incomes", href: "/incomes", icon: TrendingUp, module: "incomes" },
  { label: "Reports", href: "/reports", icon: BarChart3, module: "reports" },
  { label: "Users", href: "/users", icon: Users, module: "users" },
  { label: "Settings", href: "/settings", icon: Settings, module: "settings" },
];

export function Sidebar({ user, onMobileClose, isMobileDrawer = false }: SidebarProps) {
  const pathname = usePathname();

  const filteredNavItems = navItems.filter((item) => {
    if (item.module === "settings") return true;
    return hasPermission(user.role, item.module, "view");
  });

  const SidebarContent = ({ forceExpand = false }: { forceExpand?: boolean }) => (
    <div className="flex flex-col h-full bg-zinc-900 text-zinc-300 dark:bg-black border-r border-zinc-800">
      {/* Brand Header */}
      <div className={`flex items-center justify-between py-5 border-b border-zinc-800/60 shrink-0 ${
        forceExpand ? "px-6" : "px-4 lg:px-6"
      }`}>
        <Link
          href="/dashboard"
          className={`flex items-center gap-2.5 w-full ${
            forceExpand ? "justify-start" : "justify-center lg:justify-start"
          }`}
          onClick={onMobileClose}
        >
          <div className="shrink-0 flex items-center justify-center">
            <img src="/logo.png" className="h-9 w-9 object-contain" alt="NextGen ERP Logo" />
          </div>
          <div className={`flex flex-col truncate ${
            forceExpand ? "flex" : "hidden lg:flex"
          }`}>
            <span className="text-sm lg:text-md font-bold tracking-tight text-white uppercase truncate">
              NextGen ERP
            </span>
            <span className="text-[10px] lg:text-xs text-zinc-500 font-medium truncate mt-0.5">
              Interior & Waterproofing
            </span>
          </div>
        </Link>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              title={item.label} // tooltip assistance
              className={`flex items-center gap-3 p-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                forceExpand
                  ? "justify-start px-4 py-3"
                  : "justify-center lg:justify-start lg:px-4 lg:py-3"
              } ${
                isActive
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "hover:bg-zinc-800/50 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className={forceExpand ? "inline" : "hidden lg:inline"}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User Details box */}
      <div className="p-3 border-t border-zinc-800/60 bg-zinc-950/20 shrink-0">
        <div className={`flex flex-col rounded-2xl bg-zinc-950/40 border border-zinc-800/40 ${
          forceExpand ? "gap-3 px-3 py-2.5" : "gap-3 lg:px-3 lg:py-2.5 p-1"
        }`}>
          {/* Expanded User details */}
          <div className={`flex-col ${forceExpand ? "flex" : "hidden lg:flex"}`}>
            <p className="text-sm font-semibold text-white truncate">
              {user.name || "ERP Staff"}
            </p>
            <p className="text-xs text-zinc-500 truncate mt-0.5">
              {user.email || "staff@nextgen.com"}
            </p>
            <div className="mt-2.5">
              <Badge className="bg-primary/15 text-primary border border-primary/25 rounded-md text-[10px] uppercase font-bold py-0.5 px-2">
                {ROLE_LABELS[user.role]}
              </Badge>
            </div>
          </div>

          {/* Collapsed Avatar/Initials */}
          {!forceExpand && (
            <div className="flex lg:hidden justify-center my-0.5">
              <div
                className="h-8 w-8 rounded-full bg-zinc-800 text-white flex items-center justify-center text-xs font-bold shrink-0 border border-zinc-700"
                title={`${user.name || "ERP Staff"} (${ROLE_LABELS[user.role]})`}
              >
                {user.name ? user.name.substring(0, 2).toUpperCase() : "US"}
              </div>
            </div>
          )}

          {/* Sign Out Button */}
          <Button
            variant="ghost"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={`w-full text-zinc-400 hover:text-white hover:bg-zinc-800/40 gap-2 h-9 p-0 border border-zinc-800/40 ${
              forceExpand
                ? "justify-start px-3"
                : "justify-center lg:justify-start lg:px-3"
            }`}
            title="Sign Out"
          >
            <LogOut className="h-4 w-4 text-zinc-400 shrink-0" />
            <span className={`text-xs font-semibold ${forceExpand ? "inline" : "hidden lg:inline"}`}>
              Sign Out
            </span>
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent: hidden on mobile, collapsed on md, expanded on lg) */}
      {!isMobileDrawer && (
        <div className="hidden md:flex flex-col h-full shrink-0 transition-all duration-300 w-20 lg:w-64">
          <SidebarContent forceExpand={false} />
        </div>
      )}

      {/* Mobile Drawer Content (Forced expanded within Sheet container) */}
      {isMobileDrawer && (
        <div className="flex flex-col w-full h-full">
          <SidebarContent forceExpand={true} />
        </div>
      )}
    </>
  );
}

export default Sidebar;
