import { Skeleton } from "@/components/ui/skeleton";

/** Instant feedback while a dashboard route segment loads. */
export function DashboardRouteLoading() {
  return (
    <div className="flex flex-col gap-6 pb-6" aria-busy="true" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-48 max-w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <Skeleton className="h-4 w-64 max-w-full" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-[108px] rounded-[20px]"
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-[150px] rounded-[20px]"
          />
        ))}
      </div>
    </div>
  );
}
