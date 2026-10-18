import { Skeleton } from "@/components/ui/skeleton";

export default function ImportsLoading() {
  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Page Title & Context Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-36 rounded-[3px]" />
        <Skeleton className="h-8 w-60 sm:w-72" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      {/* Upload Dropzone & Instructions Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Dropzone Skeleton */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] rounded-[6px] space-y-4">
            <Skeleton className="h-5 w-44" />

            {/* Dropzone Area Skeleton */}
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[6px] p-10 flex flex-col items-center justify-center space-y-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-40" />
            </div>

            {/* 3 Step Guides */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3.5 w-full" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3.5 w-full" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3.5 w-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Security Guarantees & Formats Skeleton */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] rounded-[6px] space-y-3">
            <Skeleton className="h-4 w-40" />
            <div className="space-y-2 pt-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>

          <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] rounded-[6px] space-y-3">
            <Skeleton className="h-4 w-36" />
            <div className="space-y-2 pt-1">
              <Skeleton className="h-8 w-full rounded-[4px]" />
              <Skeleton className="h-8 w-full rounded-[4px]" />
            </div>
          </div>
        </div>
      </div>

      {/* Ingestion History Table Skeleton */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] rounded-[6px] overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 p-4 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </div>
  );
}
