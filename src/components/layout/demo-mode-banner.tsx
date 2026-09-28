import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { canUseDemoExperience } from "@/lib/env";
import { FlaskConical } from "lucide-react";

export function DemoModeBanner() {
  if (!canUseDemoExperience()) {
    return null;
  }

  return (
    <Alert className="border-amber-500/30 bg-amber-500/5">
      <FlaskConical className="size-4" />
      <AlertTitle>Modo demo local</AlertTitle>
      <AlertDescription>
        Supabase no está configurado. Estás viendo datos de demostración en
        memoria. Configura <code className="text-xs">.env.local</code> para
        persistir en PostgreSQL.
      </AlertDescription>
    </Alert>
  );
}
