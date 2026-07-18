import type { ConnectorConfig } from "./config";
import type { TallyObjectType } from "./tally-client";

export interface SyncBatchPayload {
  connectorId: string;
  objectType: TallyObjectType;
  records: unknown[];
  cursor?: string;
}

/**
 * Posts a batch to the OneAll cloud mapping service (Section 5.7 step 4:
 * "Cloud mapping converts Tally objects into OneAll's standard customer,
 * invoice, ledger and stock model"). The mapping itself lives server-side,
 * not in the connector — the connector's job is transport + checkpoint +
 * retry only, per Section 7's "thin connector" design.
 */
export async function postSyncBatch(config: ConnectorConfig, payload: SyncBatchPayload): Promise<void> {
  const res = await fetch(`${config.apiBaseUrl}/connectors/${config.connectorId}/sync-batches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`postSyncBatch failed: ${res.status} ${res.statusText}`);
  }
}

/** Section 7.2: "Connector version, host identity, last heartbeat and last successful sync." */
export async function postHeartbeat(config: ConnectorConfig, version: string): Promise<void> {
  const res = await fetch(`${config.apiBaseUrl}/connectors/${config.connectorId}/heartbeat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({ version, hostIdentity: process.env.COMPUTERNAME ?? "unknown-host" }),
  });
  if (!res.ok) {
    throw new Error(`postHeartbeat failed: ${res.status} ${res.statusText}`);
  }
}
