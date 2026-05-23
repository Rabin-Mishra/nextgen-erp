import { getProjectById } from "@/modules/projects/queries";
import { ProjectDetailClient } from "@/components/projects/ProjectDetailClient";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const projectDetails = await getProjectById(id);

  if (!projectDetails) {
    notFound();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="border-b pb-4 dark:border-zinc-800">
        <PageHeader
          title="Project Site Details"
          description="Detailed contract dashboard tracking material dispatches, milestone invoicing, and profit margins."
        />
      </div>
      <ProjectDetailClient data={projectDetails} />
    </div>
  );
}
