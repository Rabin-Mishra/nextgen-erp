import { ProjectsClient } from "@/components/projects/ProjectsClient";
import { getProjectStats, getProjectProfitability, getProjectLookups } from "@/modules/projects/queries";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function ProjectsPage() {
  const [stats, profitability, lookups] = await Promise.all([
    getProjectStats(),
    getProjectProfitability(),
    getProjectLookups(),
  ]);

  return (
    <div className="space-y-6">
      <div className="border-b pb-4 dark:border-zinc-800">
        <PageHeader
          title="Project Site Management"
          description="Manage contract budgets, issue supplies, record billings, and track margins in real-time."
        />
      </div>
      <ProjectsClient stats={stats} profitability={profitability} lookups={lookups} />
    </div>
  );
}
