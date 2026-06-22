"use client";

import React, { useState, useTransition } from "react";
import { PageHeader } from "../layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { DataTable } from "../shared/DataTable";
import { StatusBadge } from "../shared/StatusBadge";
import { ColumnDef } from "@tanstack/react-table";
import { Role, ROLE_LABELS, INVOICE_COLORS } from "../../lib/constants";
import { Users, UserPlus, ShieldAlert, KeyRound, ShieldCheck, Lock, Activity, Pencil, Trash2, CheckCircle2, Eye } from "lucide-react";
import { Button } from "../ui/button";
import { AddUserModal } from "./AddUserModal";
import { EditUserModal } from "./EditUserModal";
import { AuditLogViewer } from "./AuditLogViewer";
import { deleteUserAction } from "../../modules/users/actions";
import { toast } from "sonner";

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  lastLogin: Date | null;
  lastSessionInfo?: {
    action: string;
    timestamp: string | Date;
    duration: string | null;
    ipAddress: string | null;
    browser?: string | null;
    device?: string | null;
  } | null;
}

interface UsersPageProps {
  initialUsers: UserItem[];
  sessionUser: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
}

// Map roles to module access strings for table tags
const getModulesAccessText = (role: Role): string => {
  switch (role) {
    case "SUPERADMIN":
      return "All Modules (Root)";
    case "OWNER":
      return "All Modules";
    case "MANAGER":
      return "All exc. Security Config";
    case "SALES_STAFF":
      return "Sales, Cash, Projects (Ltd)";
    case "PURCHASE_STAFF":
      return "Purchase, Inventory, Projects (Ltd)";
    default:
      return "Read-Only Access";
  }
};

export function UsersPage({ initialUsers, sessionUser }: UsersPageProps) {
  const [usersList, setUsersList] = useState<UserItem[]>(initialUsers);
  const [activeTab, setActiveTab] = useState<"directory" | "audit">("directory");
  const [isPending, startTransition] = useTransition();
  
  // Modals visibility states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  const handleRefresh = async () => {
    // Standard fast reload using dynamic refresh/router push or client revalidate
    window.location.reload();
  };

  const isSuperAdmin = sessionUser.role === "SUPERADMIN";
  const isSuperAdminOrOwner = sessionUser.role === "SUPERADMIN" || sessionUser.role === "OWNER";

  const handleDeleteUser = (userId: string) => {
    startTransition(async () => {
      try {
        const res = await deleteUserAction(userId);
        if (res.success) {
          toast.success("User deleted successfully.");
          handleRefresh();
        } else {
          toast.error(res.error || "Failed to delete user.");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to delete user.");
      }
    });
  };

  // Summary Metrics
  const activeCount = usersList.filter(u => u.isActive).length;
  const inactiveCount = usersList.filter(u => !u.isActive).length;
  const uniqueRoles = new Set(usersList.map(u => u.role)).size;

  const columns: ColumnDef<UserItem>[] = [
    {
      accessorKey: "name",
      header: "Personnel Name",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold text-zinc-900 dark:text-zinc-50">{row.getValue("name")}</span>
          <span className="text-[10px] text-zinc-400 font-mono mt-0.5">{row.original.id}</span>
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email Address",
      cell: ({ row }) => (
        <span className="text-zinc-500 dark:text-zinc-400 font-medium font-mono text-xs">{row.getValue("email")}</span>
      ),
    },
    {
      accessorKey: "role",
      header: "Security Role",
      cell: ({ row }) => {
        const role = row.getValue("role") as Role;
        let roleBadgeStyle = "";
        switch (role) {
          case "SUPERADMIN":
            roleBadgeStyle = "bg-rose-500/10 text-rose-600 border border-rose-500/25";
            break;
          case "OWNER":
            roleBadgeStyle = "bg-purple-500/10 text-purple-600 border border-purple-500/25";
            break;
          case "MANAGER":
            roleBadgeStyle = "bg-blue-500/10 text-blue-600 border border-blue-500/25";
            break;
          case "SALES_STAFF":
            roleBadgeStyle = "bg-emerald-500/10 text-emerald-600 border border-emerald-500/25";
            break;
          case "PURCHASE_STAFF":
            roleBadgeStyle = "bg-amber-500/10 text-amber-600 border border-amber-500/25";
            break;
          default:
            roleBadgeStyle = "bg-zinc-500/10 text-zinc-500 border border-zinc-500/25 dark:text-zinc-400";
            break;
        }
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider ${roleBadgeStyle}`}>
            {ROLE_LABELS[role]}
          </span>
        );
      },
    },
    {
      id: "modules",
      header: "Module Privilege",
      cell: ({ row }) => (
        <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
          {getModulesAccessText(row.original.role)}
        </span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const active = row.getValue("isActive") as boolean;
        return <StatusBadge status={active ? "ACTIVE" : "CANCELLED"} />;
      },
    },
    {
      accessorKey: "lastLogin",
      header: "Last Active",
      cell: ({ row }) => {
        const lastLogin = row.getValue("lastLogin") as Date | null;
        const sessionInfo = row.original.lastSessionInfo;

        if (!lastLogin) return <span className="text-zinc-400 italic text-[11px]">Never</span>;

        return (
          <div className="flex flex-col gap-0.5 max-w-[180px] whitespace-normal">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {new Date(lastLogin).toLocaleDateString()} {new Date(lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {sessionInfo && (
              <div className="flex flex-col text-[10px] text-zinc-400 font-mono mt-0.5 leading-snug">
                {sessionInfo.browser || sessionInfo.device ? (
                  <span>Device: {sessionInfo.browser || "Unknown"} ({sessionInfo.device || "Unknown"})</span>
                ) : (
                  <span>Source: {sessionInfo.ipAddress === "Credentials-Login" ? "Form Credentials" : sessionInfo.ipAddress || "Internal"}</span>
                )}
                <span className="flex items-center gap-1">
                  Status:{" "}
                  {sessionInfo.duration === "Active" ? (
                    <span className="inline-flex items-center gap-1 font-extrabold text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active Now
                    </span>
                  ) : (
                    <span className="text-zinc-500 font-semibold">
                      Logged out ({sessionInfo.duration})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Operations",
      cell: ({ row }) => {
        const canEdit = isSuperAdmin || row.original.id === sessionUser.id;
        const canDelete = isSuperAdmin && row.original.id !== sessionUser.id;
        
        if (!canEdit && !canDelete) return null;
        
        return (
          <div className="flex items-center gap-1.5">
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedUser(row.original);
                  setIsEditOpen(true);
                }}
                className="h-8 w-8 p-0 rounded-lg border-zinc-200 dark:border-zinc-800 hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all inline-flex items-center justify-center"
                title="Edit user credentials"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete user ${row.original.name}?`)) {
                    handleDeleteUser(row.original.id);
                  }
                }}
                className="h-8 w-8 p-0 rounded-lg border-zinc-200 dark:border-zinc-800 text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all inline-flex items-center justify-center"
                title="Delete user"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  // Role matrix data structures
  const matrixModules = [
    { key: "dashboard", name: "Dashboard Module" },
    { key: "inventory", name: "Inventory Stock" },
    { key: "purchase", name: "Procurement (PO)" },
    { key: "sales", name: "Billing (Invoices)" },
    { key: "projects", name: "Contracts & Costing" },
    { key: "ledger", name: "Double-Entry Ledger" },
    { key: "cashbook", name: "Cash Book Vaults" },
    { key: "reports", name: "Analytics & P&L" },
    { key: "usermgmt", name: "User & Security Mgmt" },
  ];

  const matrixRoles: { key: Role; label: string }[] = [
    { key: "SUPERADMIN", label: "Super Admin" },
    { key: "OWNER", label: "Owner" },
    { key: "MANAGER", label: "Manager" },
    { key: "SALES_STAFF", label: "Sales Staff" },
    { key: "PURCHASE_STAFF", label: "Purchase Staff" },
    { key: "VIEWER", label: "Viewer" },
  ];

  // Helper mapping matrix states
  const getMatrixCell = (moduleKey: string, roleKey: Role) => {
    const matrix: Record<string, Record<Role, { text: "FULL" | "VIEW" | "LTD" | "NO", style: string }>> = {
      dashboard: {
        SUPERADMIN: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        OWNER: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        MANAGER: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        SALES_STAFF: { text: "VIEW", style: "bg-blue-500/10 text-blue-600 border border-blue-500/20" },
        PURCHASE_STAFF: { text: "VIEW", style: "bg-blue-500/10 text-blue-600 border border-blue-500/20" },
        VIEWER: { text: "VIEW", style: "bg-blue-500/10 text-blue-600 border border-blue-500/20" },
      },
      inventory: {
        SUPERADMIN: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        OWNER: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        MANAGER: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        SALES_STAFF: { text: "LTD", style: "bg-amber-500/10 text-amber-600 border border-amber-500/20" },
        PURCHASE_STAFF: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        VIEWER: { text: "VIEW", style: "bg-blue-500/10 text-blue-600 border border-blue-500/20" },
      },
      purchase: {
        SUPERADMIN: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        OWNER: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        MANAGER: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        SALES_STAFF: { text: "NO", style: "bg-zinc-100 text-zinc-400 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-650" },
        PURCHASE_STAFF: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        VIEWER: { text: "VIEW", style: "bg-blue-500/10 text-blue-600 border border-blue-500/20" },
      },
      sales: {
        SUPERADMIN: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        OWNER: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        MANAGER: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        SALES_STAFF: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        PURCHASE_STAFF: { text: "NO", style: "bg-zinc-100 text-zinc-400 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-650" },
        VIEWER: { text: "VIEW", style: "bg-blue-500/10 text-blue-600 border border-blue-500/20" },
      },
      projects: {
        SUPERADMIN: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        OWNER: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        MANAGER: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        SALES_STAFF: { text: "LTD", style: "bg-amber-500/10 text-amber-600 border border-amber-500/20" },
        PURCHASE_STAFF: { text: "LTD", style: "bg-amber-500/10 text-amber-600 border border-amber-500/20" },
        VIEWER: { text: "VIEW", style: "bg-blue-500/10 text-blue-600 border border-blue-500/20" },
      },
      ledger: {
        SUPERADMIN: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        OWNER: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        MANAGER: { text: "LTD", style: "bg-amber-500/10 text-amber-600 border border-amber-500/20" },
        SALES_STAFF: { text: "NO", style: "bg-zinc-100 text-zinc-400 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-650" },
        PURCHASE_STAFF: { text: "NO", style: "bg-zinc-100 text-zinc-400 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-650" },
        VIEWER: { text: "VIEW", style: "bg-blue-500/10 text-blue-600 border border-blue-500/20" },
      },
      cashbook: {
        SUPERADMIN: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        OWNER: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        MANAGER: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        SALES_STAFF: { text: "LTD", style: "bg-amber-500/10 text-amber-600 border border-amber-500/20" },
        PURCHASE_STAFF: { text: "LTD", style: "bg-amber-500/10 text-amber-600 border border-amber-500/20" },
        VIEWER: { text: "VIEW", style: "bg-blue-500/10 text-blue-600 border border-blue-500/20" },
      },
      reports: {
        SUPERADMIN: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        OWNER: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        MANAGER: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        SALES_STAFF: { text: "NO", style: "bg-zinc-100 text-zinc-400 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-650" },
        PURCHASE_STAFF: { text: "NO", style: "bg-zinc-100 text-zinc-400 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-650" },
        VIEWER: { text: "VIEW", style: "bg-blue-500/10 text-blue-600 border border-blue-500/20" },
      },
      usermgmt: {
        SUPERADMIN: { text: "FULL", style: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
        OWNER: { text: "VIEW", style: "bg-blue-500/10 text-blue-600 border border-blue-500/20" },
        MANAGER: { text: "NO", style: "bg-zinc-100 text-zinc-400 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-650" },
        SALES_STAFF: { text: "NO", style: "bg-zinc-100 text-zinc-400 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-650" },
        PURCHASE_STAFF: { text: "NO", style: "bg-zinc-100 text-zinc-400 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-650" },
        VIEWER: { text: "NO", style: "bg-zinc-100 text-zinc-400 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-650" },
      },
    };
    return matrix[moduleKey]?.[roleKey] || { text: "NO", style: "bg-zinc-100 text-zinc-450 border border-zinc-200 dark:bg-zinc-900" };
  };
const ROLE_DESCRIPTIONS: Record<Role, string> = {
  SUPERADMIN: "Unrestricted root-level command of the entire ERP. Authorized to modify systems configurations, adjust security parameters, override ledger transactions, manage personnel credentials, and inspect compliance audit logs.",
  OWNER: "Complete operational ownership of business transactions. Authorized to execute sales invoicing, manage inventory, draft purchase orders, approve expenses, and audit financial statements. Strictly restricted from altering personnel roles or deleting historical logs.",
  MANAGER: "Branch management profile. Authorized for daily operations, stock audits, supplier PO approvals, client invoice logs, and cost configurations. General ledger entries are read-only, and staff directory access is locked.",
  SALES_STAFF: "Point-of-Sale (POS) and client-facing profile. Authorized for generating retail/wholesale billing invoices, linked project costing, and recording customer receipts. Blocked from supplier databases, general ledger operations, and expense audits.",
  PURCHASE_STAFF: "Inventory control and supply chain profile. Authorized to create procurement POs, manage vendor logs, register incoming stocks, and update warehouse items. Blocked from client databases, accounts receivables, and analytics reports.",
  VIEWER: "Read-only compliance audit profile. Allowed to look up stock, inspect invoices, monitor cash boxes, view financial reports, and track dashboards. Completely blocked from recording, editing, or deleting any system transactions.",
};

  const getMatrixPermissionDetail = (text: string) => {
    switch (text) {
      case "FULL":
        return "Complete control (CRUD) to view, create, update, and delete records inside this module.";
      case "LTD":
        return "Task-level write permissions (view, create, edit), but restricted from deletions or administrative configurations.";
      case "VIEW":
        return "Strictly read-only access. You can view all listings and reports but cannot write or modify data.";
      case "NO":
      default:
        return "Access completely blocked. This module and its features are hidden from this user role.";
    }
  };

  const [selectedRoleTab, setSelectedRoleTab] = useState<Role>("SUPERADMIN");
  const [matrixViewMode, setMatrixViewMode] = useState<"tabbed" | "grid">("tabbed");

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader
        title="Access Control & Safety Management"
        description="Configure branch personnel logins, map role security privileges, and inspect immutable system audit logs."
        actions={
          <div className="flex items-center gap-3">
            {isSuperAdmin && (
              <Button
                onClick={() => setIsAddOpen(true)}
                className="h-10 px-4 rounded-xl flex items-center gap-2 font-bold shadow-md shadow-primary/20"
              >
                <UserPlus className="h-4.5 w-4.5" />
                Invite Staff Member
              </Button>
            )}
          </div>
        }
      />

      {/* Tabs navigation */}
      <div className="flex border-b border-zinc-150 dark:border-zinc-850 gap-2">
        <button
          onClick={() => setActiveTab("directory")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "directory"
              ? "border-primary text-zinc-950 dark:text-zinc-50"
              : "border-transparent text-zinc-400 hover:text-zinc-700"
          }`}
        >
          <ShieldCheck className="h-4.5 w-4.5" />
          Personnel Access Controls
        </button>

        {isSuperAdminOrOwner && (
          <button
            onClick={() => setActiveTab("audit")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "audit"
                ? "border-primary text-zinc-950 dark:text-zinc-50"
                : "border-transparent text-zinc-400 hover:text-zinc-700"
            }`}
          >
            <Activity className="h-4.5 w-4.5" />
            Compliance System Audits
          </button>
        )}
      </div>

      {activeTab === "directory" ? (
        <div className="space-y-8">
          {/* Security Status Cards */}
          <div className="grid gap-6 sm:grid-cols-3">
            <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-850 dark:bg-zinc-950">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Active Personnel</CardTitle>
                <div className="p-2.5 rounded-xl text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20">
                  <Users className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {activeCount}
                </div>
                <p className="text-[10px] text-zinc-400 font-semibold mt-1">Authorized logins to operations console</p>
              </CardContent>
            </Card>

            <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-850 dark:bg-zinc-950">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Security Roles Active</CardTitle>
                <div className="p-2.5 rounded-xl text-purple-500 bg-purple-50 dark:bg-purple-950/20">
                  <KeyRound className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {uniqueRoles} / 6 Roles
                </div>
                <p className="text-[10px] text-zinc-400 font-semibold mt-1">Matrix privileges mapped correctly</p>
              </CardContent>
            </Card>

            <Card className="border border-zinc-100 shadow-sm rounded-2xl dark:border-zinc-850 dark:bg-zinc-950">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Disabled / Revoked</CardTitle>
                <div className="p-2.5 rounded-xl text-rose-500 bg-rose-50 dark:bg-rose-950/20">
                  <ShieldAlert className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {inactiveCount} Accounts
                </div>
                <p className="text-[10px] text-zinc-400 font-semibold mt-1">Revoked credentials and blocks</p>
              </CardContent>
            </Card>
          </div>

          {/* User Directory Table */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Personnel Roster</h2>
            </div>

            <DataTable
              columns={columns}
              data={usersList}
              searchPlaceholder="Search by username or email..."
              searchColumnId="name"
              pagination={{
                pageIndex: 0,
                pageSize: 10,
                pageCount: 1,
                totalItems: usersList.length,
              }}
            />
          </div>

          {/* Role Permissions Matrix Section */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-purple-600" />
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Role Permissions Mapping Matrix</h2>
                </div>
                <p className="text-xs text-zinc-400 font-medium">
                  Define and verify explicit module authorization and operational boundaries.
                </p>
              </div>

              {/* View toggle */}
              <div className="flex gap-1 border p-1 rounded-xl bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-850 self-end md:self-auto shrink-0">
                <Button
                  size="sm"
                  variant={matrixViewMode === "tabbed" ? "default" : "ghost"}
                  onClick={() => setMatrixViewMode("tabbed")}
                  className="text-xs h-8 px-3 rounded-lg"
                >
                  Role Profiles
                </Button>
                <Button
                  size="sm"
                  variant={matrixViewMode === "grid" ? "default" : "ghost"}
                  onClick={() => setMatrixViewMode("grid")}
                  className="text-xs h-8 px-3 rounded-lg"
                >
                  Comparison Grid
                </Button>
              </div>
            </div>

            {matrixViewMode === "tabbed" ? (
              <div className="space-y-6">
                {/* Horizontal tabs list */}
                <div className="flex gap-1.5 border-b pb-3 dark:border-zinc-850 overflow-x-auto">
                  {matrixRoles.map((r) => {
                    const isSelected = selectedRoleTab === r.key;
                    let tabColor = "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-200";
                    if (isSelected) {
                      switch (r.key) {
                        case "SUPERADMIN":
                          tabColor = "border-rose-500 text-rose-600 bg-rose-500/5";
                          break;
                        case "OWNER":
                          tabColor = "border-purple-500 text-purple-600 bg-purple-500/5";
                          break;
                        case "MANAGER":
                          tabColor = "border-blue-500 text-blue-600 bg-blue-500/5";
                          break;
                        case "SALES_STAFF":
                          tabColor = "border-emerald-500 text-emerald-600 bg-emerald-500/5";
                          break;
                        case "PURCHASE_STAFF":
                          tabColor = "border-amber-500 text-amber-600 bg-amber-500/5";
                          break;
                        default:
                          tabColor = "border-zinc-500 text-zinc-650 bg-zinc-500/5 dark:text-zinc-400";
                          break;
                      }
                    }
                    return (
                      <button
                        key={r.key}
                        onClick={() => setSelectedRoleTab(r.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border-b-2 transition-all whitespace-nowrap ${tabColor}`}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>

                {/* Profile detail card */}
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Column 1: Info Card */}
                  <div className="bg-zinc-50/50 dark:bg-zinc-900/10 border dark:border-zinc-800 p-5 rounded-2xl flex flex-col gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">
                        Selected Role Profile
                      </span>
                      <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50">
                        {ROLE_LABELS[selectedRoleTab]}
                      </h3>
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-450 leading-relaxed font-semibold">
                      {ROLE_DESCRIPTIONS[selectedRoleTab]}
                    </p>

                    <div className="mt-auto pt-4 border-t border-dashed dark:border-zinc-850">
                      <span className="text-[10px] text-zinc-400 uppercase font-extrabold tracking-wider block mb-1">
                        Assigned Active Users
                      </span>
                      <span className="text-xl font-bold text-zinc-850 dark:text-zinc-200">
                        {usersList.filter((u) => u.role === selectedRoleTab && u.isActive).length} Members
                      </span>
                    </div>
                  </div>

                  {/* Column 2 & 3: Modules grid */}
                  <div className="md:col-span-2">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {matrixModules.map((m) => {
                        const cell = getMatrixCell(m.key, selectedRoleTab);
                        let statusIcon = null;

                        switch (cell.text) {
                          case "FULL":
                            statusIcon = <CheckCircle2 className="h-3.5 w-3.5 mr-1" />;
                            break;
                          case "LTD":
                            statusIcon = <ShieldAlert className="h-3.5 w-3.5 mr-1" />;
                            break;
                          case "VIEW":
                            statusIcon = <Eye className="h-3.5 w-3.5 mr-1" />;
                            break;
                          case "NO":
                          default:
                            statusIcon = <Lock className="h-3.5 w-3.5 mr-1" />;
                            break;
                        }

                        return (
                          <div
                            key={m.key}
                            className="border dark:border-zinc-850 p-4 rounded-xl flex flex-col gap-2 bg-white dark:bg-zinc-950 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-zinc-850 dark:text-zinc-200">
                                {m.name}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-extrabold tracking-wider border uppercase ${cell.style}`}
                              >
                                {statusIcon}
                                {cell.text === "FULL"
                                  ? "Full Access"
                                  : cell.text === "LTD"
                                  ? "Limited"
                                  : cell.text === "VIEW"
                                  ? "View Only"
                                  : "No Access"}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-500 leading-snug font-medium">
                              {getMatrixPermissionDetail(cell.text)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Legible Comparison Grid layout */
              <div className="space-y-6">
                <div className="overflow-x-auto rounded-xl border border-zinc-100 dark:border-zinc-900">
                  <table className="w-full text-center border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-zinc-50/60 dark:bg-zinc-900/40 text-zinc-500 text-xs font-bold uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-900">
                        <th className="py-4 px-6 text-left w-[220px]">Module Operations</th>
                        {matrixRoles.map((r) => (
                          <th key={r.key} className="py-4 px-2">
                            {r.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 text-zinc-800 dark:text-zinc-300 text-xs font-semibold">
                      {matrixModules.map((m) => (
                        <tr key={m.key} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10">
                          <td className="py-3.5 px-6 text-left font-bold text-zinc-700 dark:text-zinc-300">
                            {m.name}
                          </td>
                          {matrixRoles.map((r) => {
                            const cell = getMatrixCell(m.key, r.key);
                            return (
                              <td key={`${m.key}-${r.key}`} className="py-3.5 px-2">
                                <span className={`inline-flex items-center justify-center w-24 py-1.5 rounded-lg text-[9px] font-extrabold tracking-widest ${cell.style}`}>
                                  {cell.text}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Legend guide */}
                <div className="flex flex-wrap items-center justify-center gap-6 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-900 text-[10px] font-bold text-zinc-500">
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded bg-emerald-500/15 border border-emerald-500/25" />
                    FULL ACCESS (CRUD)
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded bg-blue-500/15 border border-blue-500/25" />
                    VIEW ONLY
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded bg-amber-500/15 border border-amber-500/25" />
                    LIMITED / SEGREGATED
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded bg-zinc-100 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800" />
                    NO ACCESS
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Audit Log Viewer panel (Visible only to SUPERADMIN) */
        <AuditLogViewer />
      )}

      {/* Invitation Modal */}
      <AddUserModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={handleRefresh}
      />

      {/* Account Security Editor Modal */}
      <EditUserModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedUser(null);
        }}
        onSuccess={handleRefresh}
        sessionUserId={sessionUser.id}
        userToEdit={selectedUser}
      />
    </div>
  );
}
export default UsersPage;
