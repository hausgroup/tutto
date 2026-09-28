import { canUseDemoExperience } from "@/lib/env";
import { getDemoRestaurantStore } from "@/lib/demo/restaurant-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function enqueueSiigoSyncJob(input: {
  restaurantId: string;
  entityType: string;
  entityId: string;
  operation: string;
}) {
  if (canUseDemoExperience()) {
    const store = getDemoRestaurantStore();
    store.siigoPendingCount += 1;
    return;
  }

  const supabase = await createSupabaseServerClient();
  const idempotencyKey = `${input.entityType}:${input.entityId}:${input.operation}`;
  const { error } = await supabase.from("siigo_sync_jobs").insert({
    restaurant_id: input.restaurantId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    operation: input.operation,
    idempotency_key: idempotencyKey,
  });

  if (error && error.code !== "23505") {
    throw error;
  }
}

export async function getSiigoPendingCount(restaurantId: string) {
  if (canUseDemoExperience()) {
    return getDemoRestaurantStore().siigoPendingCount;
  }

  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("siigo_sync_jobs")
    .select("*", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("status", "pending");

  if (error) throw error;
  return count ?? 0;
}
