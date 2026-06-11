"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { formatNepaliNumber } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";
import type { ProjectProfitabilitySchema } from "@/modules/projects/types";
import { updateProjectStatus } from "@/modules/projects/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Hammer, Eye, Edit2, PlayCircle, PauseCircle, CheckCircle } from "lucide-react";
import { DualDateDisplay } from "@/components/shared/DualDateDisplay";

interface ProjectsTableProps {
  projects: ProjectProfitabilitySchema[];
  onIssueSupply: (project: { id: string; name: string; clientId: string; clientName: string }) => void;
  onEdit: (project: any) => void;
}

export function ProjectsTable({ projects, onIssueSupply, onEdit }: ProjectsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (projectId: string, status: any) => {
    startTransition(async () => {
      try {
        await updateProjectStatus(projectId, status);
        toast.success(`Project status updated to ${status}`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to update project status");
      }
    });
  };

  const statusColors: Record<string, string> = {
    PLANNING: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100",
    ACTIVE: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 animate-pulse",
    ON_HOLD: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    COMPLETED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
    CANCELLED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  };

  const formatNumberOnly = (amount: number | string) => {
    const val = Number(amount) || 0;
    const parts = val.toFixed(2).split(".");
    return `${formatNepaliNumber(Number(parts[0]))}.${parts[1]}`;
  };

  const columns: ColumnDef<ProjectProfitabilitySchema, any>[] = [
    {
      accessorKey: "projectCode",
      header: "Project #",
      cell: ({ row }) => (
        <span className="font-mono text-sm font-bold block shrink-0">
          {row.original.projectCode}
        </span>
      ),
    },
    {
      accessorKey: "projectName",
      header: "Project Name",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 leading-tight">
            {row.original.projectName}
          </p>
          <p className="text-xs text-zinc-500 font-medium">Client: {row.original.clientName}</p>
        </div>
      ),
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) => {
        const date = (row.original as any).startDate;
        return date ? <DualDateDisplay date={date} /> : "—";
      },
    },
    {
      accessorKey: "endDate",
      header: "Deadline",
      cell: ({ row }) => {
        const date = (row.original as any).endDate;
        return date ? <DualDateDisplay date={date} /> : "—";
      },
    },
    {
      accessorKey: "contractAmount",
      header: "Budget/Contract (NPR)",
      cell: ({ row }) => (
        <span className="font-semibold text-blue-600 dark:text-blue-400">
          {formatNumberOnly(row.original.contractAmount)}
        </span>
      ),
    },
    {
      accessorKey: "totalCost",
      header: "Material Cost (NPR)",
      cell: ({ row }) => (
        <span className="font-medium text-purple-600 dark:text-purple-400">
          {formatNumberOnly(row.original.totalCost)}
        </span>
      ),
    },
    {
      accessorKey: "totalBilled",
      header: "Total Billed (NPR)",
      cell: ({ row }) => (
        <span className="font-bold text-indigo-600 dark:text-indigo-400">
          {formatNumberOnly(row.original.totalBilled)}
        </span>
      ),
    },
    {
      accessorKey: "grossProfit",
      header: "Net Profit (NPR)",
      cell: ({ row }) => {
        const profit = Number(row.original.grossProfit);
        return (
          <span className={profit >= 0 ? "font-semibold text-emerald-600 dark:text-emerald-400" : "font-semibold text-rose-600 dark:text-rose-400"}>
            {formatNumberOnly(profit)}
          </span>
        );
      },
    },
    {
      accessorKey: "marginPercent",
      header: "Net Margin %",
      cell: ({ row }) => {
        const margin = Number(row.original.marginPercent);
        let colorClass = "text-red-600 dark:text-red-400 font-bold";
        if (margin >= 20) {
          colorClass = "text-green-600 dark:text-green-400 font-bold";
        } else if (margin >= 10) {
          colorClass = "text-amber-600 dark:text-amber-400 font-bold";
        }

        return <span className={colorClass}>{margin}%</span>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={statusColors[row.original.status]}>{row.original.status}</Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link href={`/projects/${p.projectId}`}>
              <Button variant="outline" size="sm" className="h-8 px-2.5">
                <Eye className="h-3.5 w-3.5 mr-1" />
                View Details
              </Button>
            </Link>

            {p.status === "ACTIVE" && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-900/30 dark:hover:bg-purple-950/20"
                onClick={() =>
                  onIssueSupply({
                    id: p.projectId,
                    name: p.projectName,
                    clientId: p.clientId,
                    clientName: p.clientName,
                  })
                }
              >
                <Hammer className="h-3.5 w-3.5 mr-1" />
                Issue Supply
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={() => onEdit(p)}
            >
              <Edit2 className="h-3 w-3" />
            </Button>

            {/* Status quick toggle */}
            <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-zinc-50 dark:bg-zinc-900/40">
              {p.status === "PLANNING" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                  disabled={isPending}
                  onClick={() => handleStatusChange(p.projectId, "ACTIVE")}
                  title="Activate Project"
                >
                  <PlayCircle className="h-4 w-4" />
                </Button>
              )}
              {p.status === "ACTIVE" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-amber-600 hover:bg-amber-50"
                  disabled={isPending}
                  onClick={() => handleStatusChange(p.projectId, "ON_HOLD")}
                  title="Hold Project"
                >
                  <PauseCircle className="h-4 w-4" />
                </Button>
              )}
              {p.status === "ON_HOLD" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                  disabled={isPending}
                  onClick={() => handleStatusChange(p.projectId, "ACTIVE")}
                  title="Resume Project"
                >
                  <PlayCircle className="h-4 w-4" />
                </Button>
              )}
              {p.status !== "COMPLETED" && p.status !== "CANCELLED" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-green-600 hover:bg-green-50"
                  disabled={isPending}
                  onClick={() => handleStatusChange(p.projectId, "COMPLETED")}
                  title="Complete Project"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={projects}
      searchPlaceholder="Search projects..."
      searchColumnId="projectName"
    />
  );
}
