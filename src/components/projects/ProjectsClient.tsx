"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProjectStats } from "./ProjectStats";
import { ProjectsTable } from "./ProjectsTable";
import { CreateProjectModal } from "./CreateProjectModal";
import { IssueSupplyModal } from "./IssueSupplyModal";
import { ProjectProfitabilityReport } from "./ProjectProfitabilityReport";
import type { ProjectStatsSchema, ProjectProfitabilitySchema } from "@/modules/projects/types";

interface ProjectsClientProps {
  stats: ProjectStatsSchema;
  profitability: ProjectProfitabilitySchema[];
  lookups: {
    clients: Array<{ id: string; name: string; code: string; customerType: string }>;
    products: any[];
    warehouses: Array<{ id: string; name: string }>;
  };
}

export function ProjectsClient({ stats, profitability, lookups }: ProjectsClientProps) {
  const [tab, setTab] = useState<"active" | "all" | "pnl">("active");
  const [showCreate, setShowCreate] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [selectedProject, setSelectedProject] = useState<{ id: string; name: string; clientId: string; clientName: string } | null>(null);
  const [editingProject, setEditingProject] = useState<any | null>(null);

  const activeProjects = profitability.filter((p) => p.status === "ACTIVE");

  const handleEdit = (project: any) => {
    setEditingProject(project);
    setShowCreate(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Projects Board</h2>
          <p className="text-sm text-zinc-500">Track site dispatches, contracts, and profitability ratios.</p>
        </div>
        <Button
          onClick={() => {
            setEditingProject(null);
            setShowCreate(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          + New Project
        </Button>
      </div>

      <ProjectStats stats={stats} />

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2 dark:border-zinc-800">
        <button
          onClick={() => setTab("active")}
          className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
            tab === "active"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
          }`}
        >
          Active Projects ({activeProjects.length})
        </button>
        <button
          onClick={() => setTab("all")}
          className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
            tab === "all"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
          }`}
        >
          All Projects ({profitability.length})
        </button>
        <button
          onClick={() => setTab("pnl")}
          className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
            tab === "pnl"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
          }`}
        >
          Project Profitability (P&L)
        </button>
      </div>

      {tab === "active" && (
        <ProjectsTable
          projects={activeProjects}
          onIssueSupply={(proj) => {
            setSelectedProject(proj);
            setShowIssue(true);
          }}
          onEdit={handleEdit}
        />
      )}

      {tab === "all" && (
        <ProjectsTable
          projects={profitability}
          onIssueSupply={(proj) => {
            setSelectedProject(proj);
            setShowIssue(true);
          }}
          onEdit={handleEdit}
        />
      )}

      {tab === "pnl" && <ProjectProfitabilityReport projects={profitability} />}

      {/* Create / Edit Project Modal */}
      <CreateProjectModal
        open={showCreate}
        onOpenChange={setShowCreate}
        clients={lookups.clients}
        project={editingProject}
      />

      {/* Issue Supply Modal */}
      {selectedProject && (
        <IssueSupplyModal
          open={showIssue}
          onOpenChange={setShowIssue}
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          clientName={selectedProject.clientName}
          products={lookups.products}
          warehouses={lookups.warehouses}
        />
      )}
    </div>
  );
}
