"use client";

import React, { useState } from "react";
import { PageHeader } from "../layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { DataTable } from "../shared/DataTable";
import { StatusBadge } from "../shared/StatusBadge";
import { ColumnDef } from "@tanstack/react-table";
import { Role, ROLE_LABELS, INVOICE_COLORS } from "../../lib/constants";
import { Users, UserPlus, ShieldAlert, KeyRound, ShieldCheck, Lock, Activity } from "lucide-react";
import { Button } from "../ui/button";
import { AddUserModal } from "./AddUserModal";
import { EditUserModal } from "./EditUserModal";
import { AuditLogViewer } from "./AuditLogViewer";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  lastLogin: Date | null;
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
  
  // Modals visibility states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  const handleRefresh = async () => {
    // Standard fast reload using dynamic refresh/router push or client revalidate
    window.location.reload();
  };

  const isSuperAdmin = sessionUser.role === "SUPERADMIN";

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
        const login = row.getValue("lastLogin") as Date | null;
        if (!login) return <span className="text-zinc-450 italic">Never</span>;
        return (
          <span className="text-xs font-semibold text-zinc-500">
            {new Date(login).toLocaleDateString()} {new Date(login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Operations",
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setSelectedUser(row.original);
            setIsEditOpen(true);
          }}
          disabled={!isSuperAdmin}
          className="h-8 text-xs font-bold border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-50"
        >
          Manage Access
        </Button>
      ),
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

        {isSuperAdmin && (
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
            <div className="flex flex-col gap-1 mb-6">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-purple-600" />
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Role Permissions Mapping Matrix</h2>
              </div>
              <p className="text-xs text-zinc-400 font-medium pl-7">
                Compliance reference grid defining explicit module authorization boundaries.
              </p>
            </div>

            {/* Matrix Table Responsive */}
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
