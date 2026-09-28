import type { Metadata } from "next";
import { FloorClientEntry } from "@/components/floor/floor-client-entry";

export const metadata: Metadata = {
  title: "Salón",
};

export default function FloorPage() {
  // Client paints from warm cache; no blocking server floor fetch.
  return <FloorClientEntry />;
}
