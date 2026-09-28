import type { CatalogSnapshot } from "@/lib/catalog/types";
import type { Order } from "@/lib/orders/types";

/** Lightweight POS chrome shown while the table order loads. */
export function PosLoadingShell({
  tableLabel = "…",
}: {
  tableLabel?: string;
}) {
  return (
    <div className="-m-4 flex min-h-[calc(100dvh-5.5rem)] flex-col bg-background text-foreground md:-m-6 md:min-h-[calc(100dvh-4.5rem)] md:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-5 overflow-auto p-4 md:p-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-[5.5rem] shrink-0 animate-pulse rounded-2xl bg-muted" />
          <div className="h-11 min-w-0 flex-1 animate-pulse rounded-2xl bg-muted" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`cat-${i}`}
                className="min-h-[108px] animate-pulse rounded-[20px] bg-muted"
              />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`prod-${i}`}
                className="min-h-[150px] animate-pulse rounded-[20px] bg-muted"
              />
            ))}
          </div>
        </div>
      </div>
      <aside className="flex w-full shrink-0 flex-col border-t border-border bg-card md:w-[340px] md:border-t-0 md:border-l lg:w-[380px]">
        <div className="border-b border-border px-5 py-5">
          <div className="h-8 w-36 animate-pulse rounded-lg bg-muted" />
          <div className="mt-2 h-4 w-24 animate-pulse rounded bg-muted" />
          {tableLabel !== "…" ? (
            <p className="sr-only">Cargando mesa {tableLabel}</p>
          ) : null}
        </div>
        <div className="flex-1 space-y-2 px-5 py-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`line-${i}`} className="h-12 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="space-y-3 border-t border-border px-5 py-5">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-14 w-full animate-pulse rounded-2xl bg-muted" />
        </div>
      </aside>
    </div>
  );
}

export type PosBootPayload = {
  catalog: CatalogSnapshot;
  order: Order;
  tableLabel: string;
  attendantName: string;
};
