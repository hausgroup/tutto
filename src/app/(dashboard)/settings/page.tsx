import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { resolveAuthContext } from "@/lib/auth/resolve-context";
import { canUseDemoExperience, isSupabaseConfigured } from "@/lib/env";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Configuración",
};

const checklist = [
  {
    done: isSupabaseConfigured(),
    title: "Variables de Supabase en .env.local",
    detail: "NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY",
  },
  {
    done: isSupabaseConfigured(),
    title: "Migración inicial aplicada",
    detail: "database/migrations/20250924000000_initial_schema.sql",
  },
  {
    done: isSupabaseConfigured(),
    title: "Migración catálogo / pedidos",
    detail:
      "database/migrations/20250924100000_catalog_inventory_orders.sql",
  },
  {
    done: isSupabaseConfigured(),
    title: "Helpers POS (RLS + recetas)",
    detail: "database/migrations/20250924110000_pos_supabase_helpers.sql",
  },
  {
    done: isSupabaseConfigured(),
    title: "Módulo de personal",
    detail: "database/migrations/20250924120000_staff_module.sql",
  },
  {
    done: isSupabaseConfigured(),
    title: "Seed de desarrollo",
    detail: "database/seed.sql, seed-phase3-9.sql y membresía admin",
  },
];

export default async function SettingsPage() {
  const auth = await resolveAuthContext();

  return (
    <div className="space-y-6">
      {canUseDemoExperience() ? (
        <Alert>
          <AlertTitle>Modo demo activo</AlertTitle>
          <AlertDescription>
            Puedes probar salón, POS, catálogo, inventario, caja y reportes sin
            base de datos. Los cambios viven en memoria del servidor.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Checklist Supabase</CardTitle>
          <CardDescription>
            Sesión actual: {auth.email} ·{" "}
            {auth.memberships[0]?.restaurantName ?? "Sin restaurante"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {checklist.map((item) => (
            <div key={item.title} className="flex gap-3">
              {item.done ? (
                <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
              ) : (
                <Circle className="mt-0.5 size-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            </div>
          ))}
          <Button asChild variant="outline">
            <Link href="/floor">Ir al salón</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentación</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="https://supabase.com/docs" target="_blank" rel="noreferrer">
              Supabase docs
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
          <Button asChild size="sm">
            <Link href="/floor/editor">Editor de plano</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
