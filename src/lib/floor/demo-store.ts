import { createDemoFloorSnapshot } from "@/lib/floor/demo-data";
import type { FloorSnapshot } from "@/lib/floor/types";

const globalForDemo = globalThis as unknown as {
  hausDemoFloorStore?: FloorSnapshot;
};

function cloneSnapshot(snapshot: FloorSnapshot): FloorSnapshot {
  return structuredClone(snapshot);
}

export function getDemoFloorStore(): FloorSnapshot {
  if (!globalForDemo.hausDemoFloorStore) {
    globalForDemo.hausDemoFloorStore = createDemoFloorSnapshot();
  }
  return globalForDemo.hausDemoFloorStore;
}

export function replaceDemoFloorStore(snapshot: FloorSnapshot) {
  globalForDemo.hausDemoFloorStore = cloneSnapshot(snapshot);
}

export function resetDemoFloorStore() {
  globalForDemo.hausDemoFloorStore = createDemoFloorSnapshot();
}
