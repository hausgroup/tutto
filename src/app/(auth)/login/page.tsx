import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";
import { canUseDemoExperience, isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const nextPath =
    typeof params.next === "string" && params.next.startsWith("/")
      ? params.next
      : undefined;

  if (!isSupabaseConfigured()) {
    return (
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Haus POS</h1>
        {canUseDemoExperience() ? (
          <>
            <p className="text-sm text-muted-foreground">
              Supabase aún no está configurado. Puedes explorar el salón y el
              editor de plano en modo demo local.
            </p>
            <Button asChild className="w-full">
              <Link href="/dashboard">Entrar en modo demo</Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Cuando tengas credenciales, agrega{" "}
              <code className="rounded bg-muted px-1">.env.local</code> y reinicia
              el servidor.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Configura{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            y{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            en <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code>
            , o activa{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              HAUS_DEMO_MODE=true
            </code>{" "}
            para desarrollo sin Supabase.
          </p>
        )}
      </div>
    );
  }

  return <LoginForm nextPath={nextPath} />;
}
