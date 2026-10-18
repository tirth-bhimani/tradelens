import { Skeleton } from "@/components/ui/skeleton";

export default function ReconciliationLoading() {
  return (
    <div className="space-y-5 animate-in fade-in-50 duration-300">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-3.5 w-80 max-w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-40 rounded-[4px]" />
          <Skeleton className="h-8 w-28 rounded-[4px]" />
        </div>
      </div>

      {/* Diagnostics Alert Strip Skeleton */}
      <div className="p-3.5 rounded-[4px] border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5 w-full">
          <Skeleton className="w-4 h-4 rounded-full shrink-0" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-5 w-24 rounded-[3px] shrink-0" />
      </div>

      {/* Financial KPI Ribbon Skeleton (4 columns) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] rounded-[6px] overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3.5 w-3.5 rounded-full" />
            </div>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-2.5 w-24" />
          </div>
        ))}
      </div>

      {/* Table Section Skeleton */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] rounded-[6px] overflow-hidden">
        {/* Table Filters Toolbar */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Skeleton className="h-8 w-64 rounded-[4px]" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-20 rounded-[3px]" />
            <Skeleton className="h-7 w-20 rounded-[3px]" />
            <Skeleton className="h-7 w-20 rounded-[3px]" />
          </div>
        </div>

        {/* Table Header & Rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <th className="p-3.5"><Skeleton className="h-3 w-16" /></th>
                <th className="p-3.5"><Skeleton className="h-3 w-20" /></th>
                <th className="p-3.5"><Skeleton className="h-3 w-20 ml-auto" /></th>
                <th className="p-3.5"><Skeleton className="h-3 w-20 ml-auto" /></th>
                <th className="p-3.5"><Skeleton className="h-3 w-16 ml-auto" /></th>
                <th className="p-3.5"><Skeleton className="h-3 w-16 ml-auto" /></th>
                <th className="p-3.5"><Skeleton className="h-3 w-20 ml-auto" /></th>
                <th className="p-3.5"><Skeleton className="h-3 w-20 ml-auto" /></th>
                <th className="p-3.5"><Skeleton className="h-3 w-16 ml-auto" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
              {Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx} className="p-3.5">
                  <td className="p-3.5"><Skeleton className="h-4 w-24" /></td>
                  <td className="p-3.5"><Skeleton className="h-5 w-18 rounded-[3px]" /></td>
                  <td className="p-3.5 text-right"><Skeleton className="h-4 w-18 ml-auto" /></td>
                  <td className="p-3.5 text-right"><Skeleton className="h-4 w-18 ml-auto" /></td>
                  <td className="p-3.5 text-right"><Skeleton className="h-4 w-14 ml-auto" /></td>
                  <td className="p-3.5 text-right"><Skeleton className="h-4 w-14 ml-auto" /></td>
                  <td className="p-3.5 text-right"><Skeleton className="h-4 w-18 ml-auto" /></td>
                  <td className="p-3.5 text-right"><Skeleton className="h-4 w-18 ml-auto" /></td>
                  <td className="p-3.5 text-right"><Skeleton className="h-4 w-14 ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
