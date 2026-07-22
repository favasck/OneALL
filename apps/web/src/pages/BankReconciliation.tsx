import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface StatementLine { id: string; lineDate: string; description: string; amount: string; reconciled: boolean; matchedJournalLineId: string | null; }
interface JournalLineCandidate { id: string; debit: string; credit: string; journalEntry: { sourceType: string; entryDate: string } }

export default function BankReconciliation() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [accountId, setAccountId] = useState("");
  const [lines, setLines] = useState<StatementLine[] | null>(null);
  const [candidates, setCandidates] = useState<JournalLineCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [matchInputs, setMatchInputs] = useState<Record<string, string>>({});

  const [lineDate, setLineDate] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [result, setResult] = useState<string | null>(null);

  const load = () => {
    if (!companyId || !accountId) return;
    setError(null);
    Promise.all([
      apiGet<StatementLine[]>(`/companies/${companyId}/bank-reconciliation/statement-lines?accountId=${encodeURIComponent(accountId)}`),
      apiGet<JournalLineCandidate[]>(`/companies/${companyId}/bank-reconciliation/candidates?accountId=${encodeURIComponent(accountId)}`),
    ]).then(([l, c]) => { setLines(l); setCandidates(c); }).catch((e) => setError(e.message));
  };

  useEffect(load, [companyId, accountId]);

  const addLine = async () => {
    if (!companyId || !accountId) { setResult("Enter an account ID first."); return; }
    setResult(null);
    try {
      await apiPost(`/companies/${companyId}/bank-reconciliation/statement-lines`, { accountId, lineDate, description, amount });
      setDescription(""); setAmount(0);
      load();
    } catch (e) {
      setResult(`Error: ${(e as Error).message}`);
    }
  };

  const match = async (lineId: string) => {
    const journalLineId = matchInputs[lineId];
    if (!journalLineId) return;
    try {
      await apiPost(`/companies/${companyId}/bank-reconciliation/statement-lines/${lineId}/match`, { journalLineId });
      load();
    } catch (e) {
      setResult(`Error matching: ${(e as Error).message}`);
    }
  };

  const unmatch = async (lineId: string) => {
    try {
      await apiPost(`/companies/${companyId}/bank-reconciliation/statement-lines/${lineId}/unmatch`, {});
      load();
    } catch (e) {
      setResult(`Error: ${(e as Error).message}`);
    }
  };

  return (
    <div>
      <h2>Bank reconciliation</h2>
      <p className="state">Enter statement lines for a Cash and Bank ledger, then match each one against a journal line already posted to that account.</p>
      {!companyId && <p className="state">No company is assigned to your account yet — ask an admin to assign one in Settings.</p>}
      <div style={{ display: "grid", gap: 10, maxWidth: 420, marginBottom: 16 }}>
        <input placeholder="Bank/cash account ID" value={accountId} onChange={(e) => setAccountId(e.target.value)} />
      </div>
      {error && <p className="state">Could not reach the API ({error}).</p>}

      {accountId && lines && (
        <>
          <table style={{ marginBottom: 12, maxWidth: 900 }}>
            <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th><th>Match to journal line ID</th></tr></thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id}>
                  <td>{new Date(l.lineDate).toLocaleDateString()}</td><td>{l.description}</td><td>{l.amount}</td>
                  <td>{l.reconciled ? "Reconciled" : "Unreconciled"}</td>
                  <td>
                    {l.reconciled ? (
                      <button onClick={() => unmatch(l.id)}>Undo</button>
                    ) : (
                      <>
                        <input
                          style={{ width: 160 }}
                          value={matchInputs[l.id] ?? ""}
                          onChange={(e) => setMatchInputs((p) => ({ ...p, [l.id]: e.target.value }))}
                        />
                        <button onClick={() => match(l.id)}>Match</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {candidates && (
            <>
              <h3 style={{ fontSize: 14, color: "var(--muted)", textTransform: "uppercase" }}>Recent journal lines on this account (copy an ID above)</h3>
              <table style={{ marginBottom: 24, maxWidth: 700 }}>
                <thead><tr><th>Journal line ID</th><th>Source</th><th>Date</th><th>Debit</th><th>Credit</th></tr></thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id}>
                      <td>{c.id}</td><td>{c.journalEntry.sourceType}</td>
                      <td>{new Date(c.journalEntry.entryDate).toLocaleDateString()}</td>
                      <td>{c.debit}</td><td>{c.credit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <h3 style={{ fontSize: 14, color: "var(--muted)", textTransform: "uppercase" }}>Add statement line</h3>
          <div style={{ display: "flex", gap: 10, maxWidth: 640, flexWrap: "wrap", marginBottom: 12 }}>
            <input type="date" value={lineDate} onChange={(e) => setLineDate(e.target.value)} />
            <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <input type="number" placeholder="Amount (+ deposit / - withdrawal)" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            <button onClick={addLine}>Add</button>
          </div>
        </>
      )}
      {result && <p className="state">{result}</p>}
    </div>
  );
}
