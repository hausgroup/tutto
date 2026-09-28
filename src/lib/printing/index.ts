export type PrintJobType = "receipt" | "kitchen" | "bar";

export type PrintJob = {
  type: PrintJobType;
  restaurantId: string;
  payload: Record<string, unknown>;
};

export async function printReceipt(job: Omit<PrintJob, "type">) {
  return enqueuePrint({ ...job, type: "receipt" });
}

export async function printKitchenTicket(job: Omit<PrintJob, "type">) {
  return enqueuePrint({ ...job, type: "kitchen" });
}

export async function printBarTicket(job: Omit<PrintJob, "type">) {
  return enqueuePrint({ ...job, type: "bar" });
}

async function enqueuePrint(job: PrintJob) {
  // Placeholder adapter — network/ESC-POS adapters plug in here.
  return { ok: true as const, job };
}
