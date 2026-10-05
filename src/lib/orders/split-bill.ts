import { sumItemLinesTotals } from "@/lib/orders/bill-segments";
import type { OrderItem } from "@/lib/orders/types";

export type GuestSlot = {
  id: string;
  label: string;
};

export function defaultGuests(count: number): GuestSlot[] {
  const n = Math.max(2, Math.min(8, count));
  return Array.from({ length: n }, (_, index) => ({
    id: `guest-${index}`,
    label: `Persona ${index + 1}`,
  }));
}

/** itemId → guestId; missing items go to the first guest. */
export function totalsByGuest(
  items: OrderItem[],
  guests: GuestSlot[],
  assignment: Record<string, string>,
): { guest: GuestSlot; items: OrderItem[]; totalMinor: number }[] {
  const buckets = new Map<string, OrderItem[]>();
  for (const guest of guests) {
    buckets.set(guest.id, []);
  }
  const fallbackGuestId = guests[0]?.id;
  for (const item of items) {
    const guestId = assignment[item.id] ?? fallbackGuestId;
    if (!guestId || !buckets.has(guestId)) continue;
    buckets.get(guestId)!.push(item);
  }
  return guests.map((guest) => {
    const guestItems = buckets.get(guest.id) ?? [];
    return {
      guest,
      items: guestItems,
      totalMinor: sumItemLinesTotals(guestItems).totalMinor,
    };
  });
}

export function cycleGuestAssignment(
  guests: GuestSlot[],
  currentGuestId: string | undefined,
): string {
  if (guests.length === 0) return "";
  if (!currentGuestId) return guests[0]!.id;
  const index = guests.findIndex((g) => g.id === currentGuestId);
  const next = index < 0 ? 0 : (index + 1) % guests.length;
  return guests[next]!.id;
}
