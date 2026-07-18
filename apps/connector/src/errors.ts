// Section 7.2: "Structured error codes and support diagnostics without
// exposing unnecessary financial data."

export enum ConnectorErrorCode {
  TALLY_UNREACHABLE = "TALLY_UNREACHABLE",
  AUTH_REJECTED = "AUTH_REJECTED",
  MAPPING_ERROR = "MAPPING_ERROR",
  NETWORK_UNAVAILABLE = "NETWORK_UNAVAILABLE",
  RECONCILIATION_MISMATCH = "RECONCILIATION_MISMATCH",
}

export class ConnectorError extends Error {
  constructor(
    public code: ConnectorErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ConnectorError";
  }

  /** Safe to send to OneAll support diagnostics — never includes raw Tally data. */
  toDiagnostic() {
    return { code: this.code, message: this.message, timestamp: new Date().toISOString() };
  }
}
