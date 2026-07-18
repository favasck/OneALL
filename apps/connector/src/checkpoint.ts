import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

// Section 7.2: "Incremental synchronization with checkpoint and retry" +
// "Local queue for temporary internet failure." A local file is enough for
// a single-machine Windows service; it survives restarts, which is the
// actual requirement (idempotency across process restarts, not just
// within one run).

export interface CheckpointStore {
  [objectType: string]: { lastSyncedAt: string; cursor?: string };
}

const CHECKPOINT_PATH = join(process.cwd(), ".oneall", "checkpoint.json");

export function readCheckpoints(): CheckpointStore {
  if (!existsSync(CHECKPOINT_PATH)) return {};
  return JSON.parse(readFileSync(CHECKPOINT_PATH, "utf-8"));
}

export function writeCheckpoint(objectType: string, cursor?: string): void {
  const store = readCheckpoints();
  store[objectType] = { lastSyncedAt: new Date().toISOString(), cursor };
  mkdirSync(dirname(CHECKPOINT_PATH), { recursive: true });
  writeFileSync(CHECKPOINT_PATH, JSON.stringify(store, null, 2));
}

// Section 7.2 "Local queue for temporary internet failure" — batches that
// failed to reach the OneAll API are appended here and retried before any
// new sync starts, so a connectivity blip never drops data.
const QUEUE_PATH = join(process.cwd(), ".oneall", "queue.json");

export function enqueueFailedBatch(batch: unknown): void {
  const queue = existsSync(QUEUE_PATH) ? JSON.parse(readFileSync(QUEUE_PATH, "utf-8")) : [];
  queue.push({ queuedAt: new Date().toISOString(), batch });
  mkdirSync(dirname(QUEUE_PATH), { recursive: true });
  writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2));
}

export function drainQueue(): unknown[] {
  if (!existsSync(QUEUE_PATH)) return [];
  const queue = JSON.parse(readFileSync(QUEUE_PATH, "utf-8"));
  writeFileSync(QUEUE_PATH, JSON.stringify([]));
  return queue;
}
