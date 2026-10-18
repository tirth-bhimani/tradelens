import { Skeleton } from "@/components/ui/skeleton";

export default function RuleLabLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header Skeleton */}
      <div className="p-6 sm:p-7 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] rounded-[6px]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-3 max-w-2xl w-full">
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-8 w-64 sm:w-72" />
            <div className="space-y-1.5 pt-1">
              <Skeleton className="h-3.5 w-full max-w-xl" />
              <Skeleton className="h-3.5 w-4/5 max-w-lg" />
            </div>
          </div>
          <div className="shrink-0">
            <Skeleton className="h-8 w-44 rounded-[4px]" />
          </div>
        </div>
      </div>

      {/* Rules Catalog: Unified Institutional Ribbon Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] rounded-[6px] overflow-hidden">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
