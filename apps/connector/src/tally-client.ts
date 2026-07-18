import { ConnectorError, ConnectorErrorCode } from "./errors";

// Section 7.1 "Supported MVP data" / Table 11 of the plan lists the object
// types this connector reads, all Tally -> OneAll, all read-only (Section
// 2.1: "the first connection is read-only"):
//   - Company and financial periods (initial + on change)
//   - Ledgers / customers / suppliers (incremental)
//   - Sales and purchase vouchers (incremental)
//   - Receipts and payments (incremental)
//   - Items and stock groups (incremental)
//   - Stock balances/movements (scheduled/incremental)
//   - Trial balance / control totals (scheduled)
export type TallyObjectType =
  | "company"
  | "ledgers"
  | "vouchers_sales_purchase"
  | "vouchers_receipt_payment"
  | "items"
  | "stock_balances"
  | "trial_balance";

export interface TallyFetchResult {
  objectType: TallyObjectType;
  records: unknown[];
  cursor?: string; // opaque incremental marker, stored via checkpoint.ts
}

/**
 * Real implementation talks to Tally's local XML-over-HTTP export
 * interface (typically http://localhost:9000, Tally's built-in ODBC/XML
 * server) with a request body matching the object type's Tally report/
 * collection name. Not implemented here — there is no real Tally instance
 * in this environment to integrate against. This stub throws so the sync
 * loop's error handling path is exercised honestly rather than silently
 * returning fake data.
 */
export async function fetchTallyObjects(
  tallyHost: string,
  sourceCompany: string,
  objectType: TallyObjectType,
  sinceCursor?: string,
): Promise<TallyFetchResult> {
  throw new ConnectorError(
    ConnectorErrorCode.TALLY_UNREACHABLE,
    `fetchTallyObjects("${objectType}") is a stub — implement the real Tally XML/HTTP request ` +
      `to ${tallyHost} for company "${sourceCompany}" during the Week 4 technical spike ` +
      `(OneAll_Architecture_Technical_Spike_Brief.docx, Section 3).`,
  );
}
