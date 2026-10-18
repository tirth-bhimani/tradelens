import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header Banner Skeleton */}
      <div className="p-6 sm:p-7 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] rounded-[6px]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-3 max-w-2xl w-full">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-8 w-72 sm:w-80" />
            <div className="space-y-1.5 pt-1">
              <Skeleton className="h-3.5 w-full max-w-xl" />
              <Skeleton className="h-3.5 w-3/4 max-w-lg" />
            </div>
          </div>
          <div className="shrink-0">
            <Skeleton className="h-8 w-36 rounded-[4px]" />
          </div>
        </div>
      </div>

      {/* Account Overview Ribbon Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] rounded-[6px] overflow-hidden">
        {/* Metric 1 */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3.5 w-3.5 rounded-full" />
          </div>
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-2.5 w-48" />
        </div>

        {/* Metric 2 */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3.5 w-3.5 rounded-full" />
          </div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-2.5 w-44" />
        </div>

        {/* Metric 3 */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-30" />
            <Skeleton className="h-3.5 w-3.5 rounded-full" />
          </div>
          <div className="flex gap-2 pt-0.5">
            <Skeleton className="h-5 w-14 rounded-[3px]" />
            <Skeleton className="h-5 w-12 rounded-[3px]" />
          </div>
          <Skeleton className="h-2.5 w-52" />
        </div>
      </div>

      {/* Empty State / Upload Callout Skeleton */}
      <div className="p-8 md:p-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] rounded-[6px] flex flex-col items-center justify-center space-y-4">
        <Skeleton className="w-10 h-10 rounded-[4px]" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
        <Skeleton className="h-8 w-44 rounded-[4px] mt-2" />
      </div>
    </div>
  );
}
