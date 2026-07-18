import test from "node:test";
import assert from "node:assert/strict";
import { post } from "./posting-rules";

test("credit sale with no tax (pre-VAT Qatar) balances and has no tax line", () => {
  const lines = post("CREDIT_SALE", { netAmount: 1000, taxAmount: 0 });
  assert.equal(lines.length, 2);
  assert.equal(lines.some((l) => l.accountRole === "OUTPUT_TAX"), false);
  const debit = lines.reduce((s, l) => s + l.debit, 0);
  const credit = lines.reduce((s, l) => s + l.credit, 0);
  assert.equal(debit, credit);
});

test("credit sale with tax adds an output tax line and still balances", () => {
  const lines = post("CREDIT_SALE", { netAmount: 1000, taxAmount: 50 });
  assert.equal(lines.length, 3);
  assert.ok(lines.some((l) => l.accountRole === "OUTPUT_TAX" && l.credit === 50));
  const debit = lines.reduce((s, l) => s + l.debit, 0);
  const credit = lines.reduce((s, l) => s + l.credit, 0);
  assert.equal(debit, credit);
});

test("credit purchase (stock) puts input tax on the debit side", () => {
  const lines = post("CREDIT_PURCHASE_STOCK", { netAmount: 500, taxAmount: 25 });
  const inputTax = lines.find((l) => l.accountRole === "INPUT_TAX");
  assert.ok(inputTax);
  assert.equal(inputTax!.debit, 25);
  const debit = lines.reduce((s, l) => s + l.debit, 0);
  const credit = lines.reduce((s, l) => s + l.credit, 0);
  assert.equal(debit, credit);
});

test("customer receipt balances", () => {
  const lines = post("CUSTOMER_RECEIPT", { netAmount: 300, taxAmount: 0 });
  const debit = lines.reduce((s, l) => s + l.debit, 0);
  const credit = lines.reduce((s, l) => s + l.credit, 0);
  assert.equal(debit, credit);
  assert.equal(debit, 300);
});
