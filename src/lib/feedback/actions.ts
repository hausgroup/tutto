"use server";

import { revalidatePath } from "next/cache";
import {
  getDefaultRestaurantId,
  resolveAuthContext,
} from "@/lib/auth/resolve-context";
import { createTestFeedbackSchema } from "@/lib/feedback/schemas";
import { feedbackService } from "@/lib/feedback/service";

export type FeedbackActionState = { ok?: boolean; error?: string };

function mapError(error: unknown): FeedbackActionState {
  if (error instanceof Error) {
    if (error.message === "FORBIDDEN") {
      return { error: "No tienes acceso a este restaurante." };
    }
    return { error: error.message || "No pudimos guardar el feedback." };
  }
  return { error: "No pudimos guardar el feedback." };
}

export async function createTestFeedbackAction(input: {
  kind: "issue" | "feedback" | "note";
  title: string;
  body: string;
  pagePath?: string;
}): Promise<FeedbackActionState> {
  try {
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) throw new Error("FORBIDDEN");

    const parsed = createTestFeedbackSchema.parse({
      restaurantId,
      ...input,
    });

    await feedbackService.create(context, {
      restaurantId: parsed.restaurantId,
      kind: parsed.kind,
      title: parsed.title,
      body: parsed.body,
      pagePath: parsed.pagePath,
    });

    revalidatePath("/feedback");
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}
