// Section 7.2: "Customer-specific credentials and revocation."
// Loaded from environment variables so the packaged Windows installer can
// write a per-customer config file without shipping secrets in code.

export interface ConnectorConfig {
  connectorId: string;
  apiBaseUrl: string;
  apiKey: string; // customer-specific credential, Section 7.2
  tallyHost: string; // Tally's local XML/HTTP export endpoint, e.g. http://localhost:9000
  sourceCompanyName: string; // Tally company selected during setup, Section 5.7 step 2
  syncIntervalMs: number;
  heartbeatIntervalMs: number;
}

export function loadConfig(): ConnectorConfig {
  const required = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`Missing required env var ${name} — see .env.example`);
    return value;
  };

  return {
    connectorId: required("ONEALL_CONNECTOR_ID"),
    apiBaseUrl: process.env.ONEALL_API_BASE_URL ?? "http://localhost:3000",
    apiKey: required("ONEALL_API_KEY"),
    tallyHost: process.env.TALLY_HOST ?? "http://localhost:9000",
    sourceCompanyName: required("TALLY_SOURCE_COMPANY"),
    syncIntervalMs: Number(process.env.SYNC_INTERVAL_MS ?? 5 * 60 * 1000), // 5 min default
    heartbeatIntervalMs: Number(process.env.HEARTBEAT_INTERVAL_MS ?? 60 * 1000), // 1 min default
  };
}
