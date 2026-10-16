import { revalidatePath } from "next/cache";

/** Dashboard routes that depend on the active restaurant cookie. */
const RESTAURANT_SCOPED_PATHS = [
  "/floor",
  "/floor/editor",
  "/cashier",
  "/reservations",
  "/products",
  "/inventory",
  "/recipes",
  "/reports",
  "/staff",
  "/settings",
  "/pos",
] as const;

export function revalidateRestaurantScopedPaths() {
  for (const path of RESTAURANT_SCOPED_PATHS) {
    revalidatePath(path);
  }
}
