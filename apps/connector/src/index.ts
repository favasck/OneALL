import { loadConfig } from "./config";
import { runSyncPass } from "./sync";
import { postHeartbeat } from "./api-client";

// Section 7.2: outbound-only, no public inbound port — this process only
// ever makes outbound requests to Tally (localhost) and to the OneAll API.
// Packaging as an actual Windows service (signed installer, auto-start,
// auto-update) is a Gate D build task — suggested approach: `node-windows`
// wrapping this same entry point. Not done in this scaffold.

const VERSION = "0.1.0-scaffold";

async function main() {
  const config = loadConfig();
  // eslint-disable-next-line no-console
  console.log(`OneAll connector ${VERSION} starting for "${config.sourceCompanyName}"`);

  setInterval(() => {
    postHeartbeat(config, VERSION).catch((err) => console.error("heartbeat failed:", err.message));
  }, config.heartbeatIntervalMs);

  const tick = async () => {
    try {
      const results = await runSyncPass(config);
      const failed = results.filter((r) => r.status === "error");
      if (failed.length > 0) {
        console.error(`sync pass completed with ${failed.length} error(s):`, failed);
      } else {
        console.log(`sync pass OK: ${results.map((r) => `${r.objectType}=${r.recordCount}`).join(", ")}`);
      }
    } catch (err) {
      console.error("sync pass crashed:", (err as Error).message);
    }
  };

  await tick();
  setInterval(tick, config.syncIntervalMs);
}

main().catch((err) => {
  console.error("Connector failed to start:", err.message);
  process.exit(1);
});
