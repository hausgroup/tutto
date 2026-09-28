import { formatCurrency } from "@/lib/utils/money";
import type {
  HourSalesBucket,
  ProductSalesRow,
  RestaurantReports,
  StationSalesRow,
  WeekdaySalesBucket,
} from "@/lib/orders/reports";
import { DailyRevenueChart } from "@/components/reports/daily-revenue-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


function ProductRankList({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: ProductSalesRow[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {rows.length === 0 ? (
          <p className="text-muted-foreground">{empty}</p>
        ) : (
          rows.map((row, index) => (
            <div
              key={row.productId}
              className="flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                  {row.productName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.quantitySold} uds · {row.orderCount} pedidos
                </p>
              </div>
              <span className="shrink-0 tabular-nums">
                {formatCurrency(row.revenueMinor)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function HourBars({ buckets }: { buckets: HourSalesBucket[] }) {
  const max = Math.max(...buckets.map((b) => b.grossSalesMinor), 1);
  const active = buckets.filter((b) => b.orderCount > 0);
  const display =
    active.length > 0
      ? buckets.filter((b) => b.hour >= 8 && b.hour <= 23)
      : buckets.filter((b) => b.hour >= 8 && b.hour <= 23);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ventas por hora</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-36 items-end gap-1">
          {display.map((bucket) => (
            <div
              key={bucket.hour}
              className="flex flex-1 flex-col items-center gap-1"
              title={`${String(bucket.hour).padStart(2, "0")}:00 · ${formatCurrency(bucket.grossSalesMinor)}`}
            >
              <div
                className="w-full rounded-sm bg-emerald-500/80 dark:bg-emerald-500/60"
                style={{
                  height: `${Math.max(
                    bucket.grossSalesMinor > 0
                      ? (bucket.grossSalesMinor / max) * 100
                      : 0,
                    bucket.grossSalesMinor > 0 ? 4 : 0,
                  )}%`,
                }}
              />
              <span className="text-[9px] text-muted-foreground">
                {String(bucket.hour).padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WeekdayBars({ buckets }: { buckets: WeekdaySalesBucket[] }) {
  const max = Math.max(...buckets.map((b) => b.grossSalesMinor), 1);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ventas por día de la semana</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {buckets.map((bucket) => (
          <div key={bucket.weekday} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 text-sm">
            <span className="text-muted-foreground">{bucket.label}</span>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500/80 dark:bg-emerald-500/60"
                style={{
                  width: `${(bucket.grossSalesMinor / max) * 100}%`,
                }}
              />
            </div>
            <span className="tabular-nums text-xs text-muted-foreground">
              {formatCurrency(bucket.grossSalesMinor)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function StationMix({ rows }: { rows: StationSalesRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ventas por estación</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {rows.length === 0 ? (
          <p className="text-muted-foreground">Sin datos de preparación.</p>
        ) : (
          rows.map((row) => (
            <div key={row.station} className="flex justify-between gap-3">
              <span>
                {row.label}{" "}
                <span className="text-xs text-muted-foreground">
                  · {row.quantitySold} uds
                </span>
              </span>
              <span className="tabular-nums">
                {formatCurrency(row.revenueMinor)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function ReportsDashboard({
  reports,
  siigoPending,
  isMock = false,
}: {
  reports: RestaurantReports;
  siigoPending: number;
  isMock?: boolean;
}) {
  const peakLabel =
    reports.peakHour == null
      ? "—"
      : `${String(reports.peakHour).padStart(2, "0")}:00`;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Resumen de {reports.monthLabel}. Incluye ventas completadas, ranking de
        productos y patrones de demanda.
        {isMock ? (
          <>
            {" "}
            <span className="text-amber-700 dark:text-amber-400">
              Datos de ejemplo (mock) — desactiva HAUS_MOCK_REPORTS al lanzar.
            </span>
          </>
        ) : null}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ventas brutas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(reports.grossSalesMinor)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {reports.orderCount}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ticket promedio
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(reports.averageOrderMinor)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Siigo pendiente
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {siigoPending}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ítems por pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {reports.averageItemsPerOrder}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tiempo promedio mesa
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {reports.averageServiceMinutes == null
              ? "—"
              : `${reports.averageServiceMinutes} min`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hora pico
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{peakLabel}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Día más fuerte
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {reports.busiestWeekday ?? "—"}
          </CardContent>
        </Card>
      </div>

      <DailyRevenueChart
        monthLabel={reports.monthLabel}
        cells={reports.dailyHeatmap}
        totalRevenueMinor={reports.grossSalesMinor}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ProductRankList
          title="Más vendidos"
          empty="Aún no hay productos vendidos este mes."
          rows={reports.bestSellers}
        />
        <ProductRankList
          title="Menos vendidos"
          empty="Necesitas más variedad de ventas para comparar."
          rows={reports.worstSellers}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HourBars buckets={reports.salesByHour} />
        <WeekdayBars buckets={reports.salesByWeekday} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pagos por método</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.entries(reports.paymentsByMethod).length === 0 ? (
              <p className="text-muted-foreground">Sin pagos registrados aún.</p>
            ) : (
              Object.entries(reports.paymentsByMethod).map(([method, amount]) => (
                <div key={method} className="flex justify-between">
                  <span className="capitalize">{method}</span>
                  <span>{formatCurrency(amount)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <StationMix rows={reports.salesByStation} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Descuentos del mes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(reports.discountTotalMinor)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pedidos anulados
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {reports.voidedOrderCount}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
