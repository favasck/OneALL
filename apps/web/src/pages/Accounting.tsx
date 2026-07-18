import { useEffect, useState } from "react";
import { apiGet } from "../api/client";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
}

const COMPANY_ID = "REPLACE_WITH_REAL_COMPANY_ID";

// Section 4.8: chart of accounts + trial balance, read from
// GET /companies/:id/accounting/accounts and .../trial-balance.
// AccountingService.trialBalance() sums JournalLine debit/credit per
// account — the same JournalLine rows the posting-rule engine writes via
// apps/api/src/common/account-role-resolver.ts.
export default function Accounting() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet<Account[]>(`/companies/${COMPANY_ID}/accounting/accounts`),
      apiGet<TrialBalanceRow[]>(`/companies/${COMPANY_ID}/accounting/trial-balance`),
    ])
      .then(([a, tb]) => {
        setAccounts(a);
        setTrialBalance(tb);
      })
      .catch((e) => setError(e.message));
  }, []);

  const totalDebit = trialBalance?.reduce((s, r) => s + r.debit, 0) ?? 0;
  const totalCredit = trialBalance?.reduce((s, r) => s + r.credit, 0) ?? 0;

  return (
    <div>
      <h2>Accounting</h2>
      {error && <p className="state">Could not reach the API ({error}). Expected without a live database.</p>}
      {!error && !accounts && <p className="state">Loading…</p>}

      {accounts && (
        <>
          <h3 style={{ fontSize: 14, color: "var(--muted)", textTransform: "uppercase", marginTop: 20 }}>
            Chart of accounts
          </h3>
          <table style={{ marginBottom: 24 }}>
            <thead><tr><th>Code</th><th>Name</th><th>Type</th></tr></thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}><td>{a.code}</td><td>{a.name}</td><td>{a.type}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {trialBalance && (
        <>
          <h3 style={{ fontSize: 14, color: "var(--muted)", textTransform: "uppercase" }}>Trial balance</h3>
          <table>
            <thead><tr><th>Code</th><th>Name</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
            <tbody>
              {trialBalance.map((r) => (
                <tr key={r.accountId}>
                  <td>{r.code}</td><td>{r.name}</td>
                  <td>{r.debit.toLocaleString()}</td>
                  <td>{r.credit.toLocaleString()}</td>
                  <td>{r.balance.toLocaleString()}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2} style={{ fontWeight: 700 }}>Total</td>
                <td style={{ fontWeight: 700 }}>{totalDebit.toLocaleString()}</td>
                <td style={{ fontWeight: 700 }}>{totalCredit.toLocaleString()}</td>
                <td />
              </tr>
            </tbody>
          </table>
          {trialBalance.length > 0 && totalDebit !== totalCredit && (
            <p style={{ color: "var(--red)", fontSize: 13 }}>
              Debit and credit totals don't match — this would indicate a bug in a posting rule,
              not something to ignore (Section 8.3: every posted entry must balance).
            </p>
          )}
        </>
      )}
    </div>
  );
}
