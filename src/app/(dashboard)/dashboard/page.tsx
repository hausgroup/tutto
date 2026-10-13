import { redirect } from "next/navigation";

/** Legacy entry — operational home is the floor plan. */
export default function DashboardPage() {
  redirect("/floor");
}
