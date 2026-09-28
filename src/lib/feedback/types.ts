export type TestFeedbackKind = "issue" | "feedback" | "note";

export type TestFeedbackEntry = {
  id: string;
  restaurantId: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  kind: TestFeedbackKind;
  title: string;
  body: string;
  pagePath: string | null;
  createdAt: string;
};
