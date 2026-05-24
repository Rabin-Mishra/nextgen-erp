import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800 font-sans">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-55">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-zinc-650 mt-1.5 dark:text-zinc-305 font-medium leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 mt-4 sm:mt-0">{actions}</div>}
    </div>
  );
}
export default PageHeader;
