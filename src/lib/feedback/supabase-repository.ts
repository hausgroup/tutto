import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TestFeedbackEntry, TestFeedbackKind } from "@/lib/feedback/types";

type FeedbackRow = {
  id: string;
  restaurant_id: string;
  author_id: string;
  kind: TestFeedbackKind;
  title: string;
  body: string;
  page_path: string | null;
  created_at: string;
  profiles: { full_name: string; email: string } | null;
};

function mapRow(row: FeedbackRow): TestFeedbackEntry {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    authorId: row.author_id,
    authorName: row.profiles?.full_name?.trim() || "Usuario",
    authorEmail: row.profiles?.email ?? "",
    kind: row.kind,
    title: row.title,
    body: row.body,
    pagePath: row.page_path,
    createdAt: row.created_at,
  };
}

export async function listTestFeedback(
  restaurantId: string,
): Promise<TestFeedbackEntry[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("test_feedback")
    .select(
      "id, restaurant_id, author_id, kind, title, body, page_path, created_at, profiles(full_name, email)",
    )
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return ((data ?? []) as FeedbackRow[]).map(mapRow);
}

export async function insertTestFeedback(input: {
  restaurantId: string;
  authorId: string;
  kind: TestFeedbackKind;
  title: string;
  body: string;
  pagePath?: string;
}): Promise<TestFeedbackEntry> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("test_feedback")
    .insert({
      restaurant_id: input.restaurantId,
      author_id: input.authorId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      page_path: input.pagePath ?? null,
    })
    .select(
      "id, restaurant_id, author_id, kind, title, body, page_path, created_at, profiles(full_name, email)",
    )
    .single();

  if (error) throw error;
  return mapRow(data as FeedbackRow);
}
