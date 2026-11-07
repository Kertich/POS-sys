import Dexie, { type Table } from "dexie";
import type { HeldOrder, Sale } from "@/lib/types";

export interface QueueEntry {
  id?: number;
  entityId: string;
  type: "sale" | "held-order";
  action: "upsert" | "delete";
  createdAt: string;
}

class PosDatabase extends Dexie {
  sales!: Table<Sale, string>;
  heldOrders!: Table<HeldOrder, string>;
  syncQueue!: Table<QueueEntry, number>;

  constructor() {
    super("soko-staff-pos");
    this.version(1).stores({
      sales: "id, createdAt",
      heldOrders: "id, createdAt",
      syncQueue: "++id, entityId, createdAt",
    });
  }
}

export const db = new PosDatabase();

export async function queueForSync(entityId: string, type: QueueEntry["type"], action: QueueEntry["action"] = "upsert") {
  await db.syncQueue.where("entityId").equals(entityId).and((entry) => entry.type === type).delete();
  await db.syncQueue.add({ entityId, type, action, createdAt: new Date().toISOString() });
  if (typeof window !== "undefined") window.dispatchEvent(new Event("pos-sync-queue-updated"));
  if (typeof navigator !== "undefined" && navigator.onLine) void syncPendingChanges();
}

export async function removeQueuedSync(entityId: string, type: QueueEntry["type"]) {
  await db.syncQueue.where("entityId").equals(entityId).and((entry) => entry.type === type).delete();
  if (typeof window !== "undefined") window.dispatchEvent(new Event("pos-sync-queue-updated"));
}

export async function syncPendingChanges() {
  if (typeof navigator === "undefined" || !navigator.onLine) return;
  const { api } = await import("@/lib/api/client");
  const pending = await db.syncQueue.orderBy("createdAt").toArray();
  for (const entry of pending) {
    try {
      if (entry.type === "sale") {
        const sale = await db.sales.get(entry.entityId);
        if (sale) await api.createSale(sale);
      } else if (entry.action === "delete") {
        await api.deleteHeldOrder(entry.entityId);
      } else {
        const order = await db.heldOrders.get(entry.entityId);
        if (order) await api.saveHeldOrder(order);
      }
      if (entry.id !== undefined) await db.syncQueue.delete(entry.id);
    } catch (error) {
      console.error(`Could not sync ${entry.type} ${entry.entityId}; keeping it in the offline queue`, error);
    }
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event("pos-sync-queue-updated"));
}
