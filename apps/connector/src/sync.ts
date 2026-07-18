import type { ConnectorConfig } from "./config";
import { fetchTallyObjects, type TallyObjectType } from "./tally-client";
import { postSyncBatch } from "./api-client";
import { readCheckpoints, writeCheckpoint, enqueueFailedBatch, drainQueue } from "./checkpoint";
import { ConnectorError } from "./errors";

// Section 7.1: object types synced, in a fixed order so dependent objects
// (e.g. vouchers referencing ledgers) sync after what they reference.
const SYNC_ORDER: TallyObjectType[] = [
  "company",
  "ledgers",
  "items",
  "vouchers_sales_purchase",
  "vouchers_receipt_payment",
  "stock_balances",
  "trial_balance",
];

export interface SyncRunResult {
  objectType: TallyObjectType;
  status: "success" | "error";
  recordCount?: number;
  error?: string;
}

/**
 * One full incremental sync pass. Section 7.3 acceptance criteria this is
 * designed against: "re-running a batch creates no duplicates" (checkpoint
 * cursor makes each fetch resumable/idempotent) and "network interruption
 * recovers without data loss" (failed batches are queued, not dropped).
 */
export async function runSyncPass(config: ConnectorConfig): Promise<SyncRunResult[]> {
  const results: SyncRunResult[] = [];

  // Retry anything left over from a previous run before fetching new data.
  const queued = drainQueue();
  for (const item of queued) {
    try {
      await postSyncBatch(config, item as any);
    } catch {
      enqueueFailedBatch(item); // still unreachable — leave it queued
    }
  }

  const checkpoints = readCheckpoints();

  for (const objectType of SYNC_ORDER) {
    const cursor = checkpoints[objectType]?.cursor;
    try {
      const result = await fetchTallyObjects(config.tallyHost, config.sourceCompanyName, objectType, cursor);

      try {
        await postSyncBatch(config, {
          connectorId: config.connectorId,
          objectType,
          records: result.records,
          cursor: result.cursor,
        });
        writeCheckpoint(objectType, result.cursor);
        results.push({ objectType, status: "success", recordCount: result.records.length });
      } catch (apiError) {
        // Network/API failure after a successful Tally read — queue it so
        // the next run retries the same batch instead of losing it.
        enqueueFailedBatch({ connectorId: config.connectorId, objectType, records: result.records, cursor: result.cursor });
        results.push({ objectType, status: "error", error: (apiError as Error).message });
      }
    } catch (err) {
      const message = err instanceof ConnectorError ? err.toDiagnostic().message : (err as Error).message;
      results.push({ objectType, status: "error", error: message });
    }
  }

  return results;
}
