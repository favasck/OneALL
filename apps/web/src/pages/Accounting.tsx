import { Fragment, useEffect, useState } from "react";
import { apiGet } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface AccountNode {
  id: string; code: string; name: string; type: string; isGroup: boolean; parentAccountId: string | null;
  balance: number; children: AccountNode[];
}
interface TrialBalanceRow { accountId: string; code: string; name: string; type: string; debit: number; credit: number; balance: number; }
interface BalanceSheet {
  asOf: string | null; assets: AccountNode[]; liabilities: AccountNode[]; equity: AccountNode[];
  currentYearEarnings: number; totalAssets: number; totalLiabilities: number; totalEquity: number; isBalanced: boolean;
}
interface ProfitLoss {
  from: string | null; to: string | null; income: AccountNode[]; expense: AccountNode[];
  totalIncome: number; totalExpense: number; netProfit: number;
}

function AccountTreeRows({ nodes, depth = 0 }: { nodes: AccountNode[]; depth?: number }) {
  return (
    <>
      {nodes.map((n) => (
        <Fragment key={n.id}>
          <tr style={{ fontWeight: n.isGroup ? 700 : 400 }}>
            <td>{n.code}</td>
            <td style={{ paddingLeft: 12 + depth * 18 }}>{n.name}</td>
            <td>{n.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          </tr>
          {n.children.length > 0 && <AccountTreeRows nodes={n.children} depth={depth + 1} />}
        </Fragment>
      ))}
    </>
  );
}

export default function Accounting() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [tree, setTree] = useState<AccountNode[] | null>(null);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceRow[] | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [profitLoss, setProfitLoss] = useState<ProfitLoss | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      apiGet<AccountNode[]>(`/companies/${companyId}/accounting/accounts/tree`),
      apiGet<TrialBalanceRow[]>(`/companies/${companyId}/accounting/trial-balance`),
      apiGet<BalanceSheet>(`/companies/${companyId}/accounting/balance-sheet`),
      apiGet<ProfitLoss>(`/companies/${companyId}/accounting/profit-loss`),
    ]).then(([t, tb, bs, pl]) => { setTree(t); setTrialBalance(tb); setBalanceSheet(bs); setProfitLoss(pl); }).catch((e) => setError(e.message));
  }, [companyId]);

  const totalDebit = trialBalance?.reduce((s, r) => s + r.debit, 0) ?? 0;
  const totalCredit = trialBalance?.reduce((s, r) => s + r.credit, 0) ?? 0;

  return (
    <div>
      <h2>Accounting</h2>
      {!companyId && <p className="state">No company is assigned to your account yet — ask an admin to assign one in Settings.</p>}
      {error && <p className="state">Could not reach the API ({error}).</p>}
      {companyId && !error && !tree && <p className="state">Loading…</p>}

      {tree && (
        <>
          <h3 style={{ fontSize: 14, color: "var(--muted)", textTransform: "uppercase", marginTop: 20 }}>Chart of accounts</h3>
          <table style={{ marginBottom: 24 }}>
            <thead><tr><th>Code</th><th>Name</th><th>Balance</th></tr></thead>
            <tbody><AccountTreeRows nodes={tree} /></tbody>
          </table>
        </>
      )}

      {balanceSheet && (
        <>
          <h3 style={{ fontSize: 14, color: "var(--muted)", textTransform: "uppercase" }}>Balance sheet</h3>
          <table style={{ marginBottom: 12, maxWidth: 640 }}>
            <thead><tr><th>Code</th><th>Assets</th><th>Balance</th></tr></thead>
            <tbody><AccountTreeRows nodes={balanceSheet.assets} /></tbody>
          </table>
          <table style={{ marginBottom: 12, maxWidth: 640 }}>
            <thead><tr><th>Code</th><th>Liabilities</th><th>Balance</th></tr></thead>
            <tbody><AccountTreeRows nodes={balanceSheet.liabilities} /></tbody>
          </table>
          <table style={{ marginBottom: 8, maxWidth: 640 }}>
            <thead><tr><th>Code</th><th>Equity</th><th>Balance</th></tr></thead>
            <tbody>
              <AccountTreeRows nodes={balanceSheet.equity} />
              <tr><td></td><td>Current year earnings</td><td>{balanceSheet.currentYearEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
            </tbody>
          </table>
          <p className="state" style={{ padding: 0, marginBottom: 24 }}>
            Total assets: QAR {balanceSheet.totalAssets.toLocaleString()} · Total liabilities + equity: QAR {(balanceSheet.totalLiabilities + balanceSheet.totalEquity).toLocaleString()}
            {balanceSheet.isBalanced
              ? <span style={{ color: "var(--green)" }}> — balanced.</span>
              : <span style={{ color: "var(--red)" }}> — does not balance, this indicates a posting bug.</span>}
          </p>
        </>
      )}

      {profitLoss && (
        <>
          <h3 style={{ fontSize: 14, color: "var(--muted)", textTransform: "uppercase" }}>Profit &amp; loss</h3>
          <table style={{ marginBottom: 12, maxWidth: 640 }}>
            <thead><tr><th>Code</th><th>Income</th><th>Balance</th></tr></thead>
            <tbody><AccountTreeRows nodes={profitLoss.income} /></tbody>
          </table>
          <table style={{ marginBottom: 8, maxWidth: 640 }}>
            <thead><tr><th>Code</th><th>Expense</th><th>Balance</th></tr></thead>
            <tbody><AccountTreeRows nodes={profitLoss.expense} /></tbody>
          </table>
          <p className="state" style={{ padding: 0, marginBottom: 24 }}>
            Net profit: QAR {profitLoss.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </>
      )}

      {trialBalance && (
        <>
          <h3 style={{ fontSize: 14, color: "var(--muted)", textTransform: "uppercase" }}>Trial balance</h3>
          <table>
            <thead><tr><th>Code</th><th>Name</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
            <tbody>
              {trialBalance.map((r) => (
                <tr key={r.accountId}><td>{r.code}</td><td>{r.name}</td><td>{r.debit.toLocaleString()}</td><td>{r.credit.toLocaleString()}</td><td>{r.balance.toLocaleString()}</td></tr>
              ))}
              <tr><td colSpan={2} style={{ fontWeight: 700 }}>Total</td><td style={{ fontWeight: 700 }}>{totalDebit.toLocaleString()}</td><td style={{ fontWeight: 700 }}>{totalCredit.toLocaleString()}</td><td /></tr>
            </tbody>
          </table>
          {trialBalance.length > 0 && totalDebit !== totalCredit && (
            <p style={{ color: "var(--red)", fontSize: 13 }}>Debit and credit totals don't match — this would indicate a bug in a posting rule, not something to ignore (Section 8.3: every posted entry must balance).</p>
          )}
        </>
      )}
    </div>
  );
}
