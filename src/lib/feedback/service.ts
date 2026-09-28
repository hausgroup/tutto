import { randomUUID } from "node:crypto";
import { canUseDemoExperience } from "@/lib/env";
import { getDemoRestaurantStore } from "@/lib/demo/restaurant-store";
import { getActiveMembership, type AuthContext } from "@/lib/auth/permissions";
import * as feedbackDb from "@/lib/feedback/supabase-repository";
import type { TestFeedbackEntry, TestFeedbackKind } from "@/lib/feedback/types";

function assertMember(context: AuthContext, restaurantId: string) {
  if (!getActiveMembership(context, restaurantId)) {
    throw new Error("FORBIDDEN");
  }
}

export const feedbackService = {
  async list(
    context: AuthContext,
    restaurantId: string,
  ): Promise<TestFeedbackEntry[]> {
    assertMember(context, restaurantId);

    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      return structuredClone(
        store.testFeedback
          .filter((e) => e.restaurantId === restaurantId)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
      );
    }

    return feedbackDb.listTestFeedback(restaurantId);
  },

  async create(
    context: AuthContext,
    input: {
      restaurantId: string;
      kind: TestFeedbackKind;
      title: string;
      body: string;
      pagePath?: string;
    },
  ): Promise<TestFeedbackEntry> {
    assertMember(context, input.restaurantId);

    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      const entry: TestFeedbackEntry = {
        id: randomUUID(),
        restaurantId: input.restaurantId,
        authorId: context.userId,
        authorName: context.fullName || context.email,
        authorEmail: context.email,
        kind: input.kind,
        title: input.title,
        body: input.body,
        pagePath: input.pagePath ?? null,
        createdAt: new Date().toISOString(),
      };
      store.testFeedback.unshift(entry);
      return structuredClone(entry);
    }

    return feedbackDb.insertTestFeedback({
      restaurantId: input.restaurantId,
      authorId: context.userId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      pagePath: input.pagePath,
    });
  },
};
