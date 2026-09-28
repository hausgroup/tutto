import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FeedbackPanel } from "@/components/feedback/feedback-panel";
import {
  getDefaultRestaurantId,
  resolveAuthContext,
} from "@/lib/auth/resolve-context";
import { canUseDemoExperience } from "@/lib/env";
import { feedbackService } from "@/lib/feedback/service";

export const metadata: Metadata = { title: "Feedback" };

export default async function FeedbackPage() {
  const context = await resolveAuthContext();
  const restaurantId = getDefaultRestaurantId(context);
  if (!restaurantId) redirect("/settings");

  const entries = await feedbackService.list(context, restaurantId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Feedback (pruebas)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Registra problemas y comentarios para el equipo. Todos los testers del
          restaurante pueden ver lo que envían los demás.
        </p>
      </div>
      <FeedbackPanel entries={entries} isDemo={canUseDemoExperience()} />
    </div>
  );
}
