// Table-driven posting rule engine.
//
// Source: OneAll_Master_Project_Plan_v1.1.docx, Appendix C "Sample posting
// rules" (illustrative, requires accounting/tax validation before real use)
// and the Architecture & Technical Spike Brief, Section 2, which recommends
// this be table-driven rather than hardcoded — because Qatar has not
// implemented VAT as of July 2026 (Decision Backlog Tracker finding). As of
// Jul 2026, Fawaz/Guardian confirmed the expected rate and timing: 5%,
// starting 2027 or 2028 (still directional — not a formal tax-advisor
// sign-off; see the Decision Backlog Tracker). Either way, VAT is not live
// today, so the tax line on every rule below is conditional: it only posts
// when a tax code with a non-zero rate is actually configured for the
// company. Do not remove that condition to "simplify" the code — it is the
// whole point, and it's exactly what lets this engine flip on cleanly
// whenever VAT actually goes live.

export type AccountRole =
  | "ACCOUNTS_RECEIVABLE"
  | "ACCOUNTS_PAYABLE"
  | "SALES_REVENUE"
  | "OUTPUT_TAX"
  | "INPUT_TAX"
  | "COST_OF_GOODS_SOLD"
  | "INVENTORY"
  | "CASH_OR_BANK"
  | "EXPENSE";

export interface JournalLineDraft {
  accountRole: AccountRole;
  debit: number;
  credit: number;
}

export interface PostingContext {
  netAmount: number; // pre-tax amount
  taxAmount: number; // 0 when no tax code applies (e.g. pre-VAT Qatar) — Section 2, Architecture Brief
  costOfGoodsAmount?: number; // required for CREDIT_SALE / CASH_SALE when the line is stock
}

export type PostingEvent =
  | "CREDIT_SALE"
  | "CASH_SALE"
  | "COST_OF_GOODS_SOLD"
  | "CREDIT_PURCHASE_STOCK"
  | "CUSTOMER_RECEIPT"
  | "SUPPLIER_PAYMENT"
  | "EXPENSE_PAID";

type RuleFn = (ctx: PostingContext) => JournalLineDraft[];

const rules: Record<PostingEvent, RuleFn> = {
  // Credit sale: Dr Accounts receivable | Cr Sales revenue + output tax
  CREDIT_SALE: (ctx) => withOptionalTax(
    [{ accountRole: "ACCOUNTS_RECEIVABLE", debit: ctx.netAmount + ctx.taxAmount, credit: 0 }],
    [{ accountRole: "SALES_REVENUE", debit: 0, credit: ctx.netAmount }],
    ctx.taxAmount,
    "OUTPUT_TAX",
  ),

  // Cash sale: Dr Cash/bank | Cr Sales revenue + output tax
  CASH_SALE: (ctx) => withOptionalTax(
    [{ accountRole: "CASH_OR_BANK", debit: ctx.netAmount + ctx.taxAmount, credit: 0 }],
    [{ accountRole: "SALES_REVENUE", debit: 0, credit: ctx.netAmount }],
    ctx.taxAmount,
    "OUTPUT_TAX",
  ),

  // Cost of goods sold: Dr COGS | Cr Inventory — posted alongside CREDIT_SALE/CASH_SALE for stock items
  COST_OF_GOODS_SOLD: (ctx) => [
    { accountRole: "COST_OF_GOODS_SOLD", debit: ctx.costOfGoodsAmount ?? 0, credit: 0 },
    { accountRole: "INVENTORY", debit: 0, credit: ctx.costOfGoodsAmount ?? 0 },
  ],

  // Credit purchase (stock): Dr Inventory + input tax | Cr Accounts payable
  CREDIT_PURCHASE_STOCK: (ctx) => withOptionalTax(
    [{ accountRole: "INVENTORY", debit: ctx.netAmount, credit: 0 }],
    [{ accountRole: "ACCOUNTS_PAYABLE", debit: 0, credit: ctx.netAmount + ctx.taxAmount }],
    ctx.taxAmount,
    "INPUT_TAX",
    "debit",
  ),

  // Customer receipt: Dr Cash/bank | Cr Accounts receivable
  CUSTOMER_RECEIPT: (ctx) => [
    { accountRole: "CASH_OR_BANK", debit: ctx.netAmount, credit: 0 },
    { accountRole: "ACCOUNTS_RECEIVABLE", debit: 0, credit: ctx.netAmount },
  ],

  // Supplier payment: Dr Accounts payable | Cr Cash/bank
  SUPPLIER_PAYMENT: (ctx) => [
    { accountRole: "ACCOUNTS_PAYABLE", debit: ctx.netAmount, credit: 0 },
    { accountRole: "CASH_OR_BANK", debit: 0, credit: ctx.netAmount },
  ],

  // Expense paid: Dr Expense + input tax (if applicable) | Cr Cash/bank
  EXPENSE_PAID: (ctx) => withOptionalTax(
    [{ accountRole: "EXPENSE", debit: ctx.netAmount, credit: 0 }],
    [{ accountRole: "CASH_OR_BANK", debit: 0, credit: ctx.netAmount + ctx.taxAmount }],
    ctx.taxAmount,
    "INPUT_TAX",
    "debit",
  ),
};

function withOptionalTax(
  debitSide: JournalLineDraft[],
  creditSide: JournalLineDraft[],
  taxAmount: number,
  taxRole: "OUTPUT_TAX" | "INPUT_TAX",
  taxSide: "debit" | "credit" = "credit",
): JournalLineDraft[] {
  if (taxAmount <= 0) return [...debitSide, ...creditSide];
  const taxLine: JournalLineDraft =
    taxSide === "credit"
      ? { accountRole: taxRole, debit: 0, credit: taxAmount }
      : { accountRole: taxRole, debit: taxAmount, credit: 0 };
  return [...debitSide, ...creditSide, taxLine];
}

/**
 * Post an event and assert the result balances (Section 8.3: every posted
 * transaction is immutable and must balance before it is written).
 */
export function post(event: PostingEvent, ctx: PostingContext): JournalLineDraft[] {
  const lines = rules[event](ctx);
  const totalDebit = round(lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round(lines.reduce((s, l) => s + l.credit, 0));
  if (totalDebit !== totalCredit) {
    th