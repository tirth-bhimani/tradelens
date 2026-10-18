import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-[4px] bg-slate-200/80 dark:bg-slate-800/80",
        className
      )}
      {...props}
    />
  );
}
