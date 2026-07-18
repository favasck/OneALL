// Plain domain types, independent of the Prisma client, so the web and
// mobile apps can depend on @oneall/shared without pulling in @prisma/client.
// Field names intentionally mirror packages/db/prisma/schema.prisma.

export type Money = number; // represented as a decimal-safe number at the API boundary; stored as Decimal in Postgres

export interface InvoiceLineInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  taxRatePct: number; // 0 when no tax code applies — see Qatar VAT note in postingRules.ts
}

export interface InvoiceTotals {
  subtotal: Money;
  taxTotal: Money;
  grandTotal: Money;
}

export function calculateInvoiceTotals(lines: InvoiceLineInput[]): InvoiceTotals {
  let subtotal = 0;
  let taxTotal = 0;
  for (const line of lines) {
    const lineBase = line.quantity * line.unitPrice;
    subtotal += lineBase;
    taxTotal += lineBase * (line.taxRatePct / 100);
  }
  return {
    subtotal: round2(subtotal),
    taxTotal: round2(taxTotal),
    grandTotal: round2(subtotal + taxTotal),
  };
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// -----------------------------------------------------------------------
// Permission model — Section 3.3: user x company x branch x module x
// action x record scope. Deny by default.
// -----------------------------------------------------------------------

export type PermissionModule =
  | "sales"
  | "purchases"
  | "inventory"
  | "accounting"
  | "reports"
  | "settings"
  | "admin";

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "approve"
  | "void"
  | "export"
  | "share";

export interface PermissionGrant {
  module: PermissionModule;
  action: PermissionAction;
}

export interface PermissionContext {
  companyId: string;
  branchId?: string;
  grants: PermissionGrant[];
  recordScope?: { assignedSalespersonOnly?: boolean; salespersonId?: string };
}

/** Deny-by-default check: a grant must explicitly exist for module+action. */
export function can(ctx: PermissionContext, module: PermissionModule, action: PermissionAction): boolean {
  return ctx.grants.some((g) => g.module === module && g.action === action);
}
