import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface ChargeLine { id: string; description: string; amount: string; accountId: string | null; }
interface Voucher { id: string; purchaseReceiptId: string; totalAmount: string; appliedAt: string | null; createdAt: string; chargeLines: ChargeLine[]; }
interface ChargeLineInput { description: string; amount: number; accountId: string; }

export default function LandedCosts() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [vouchers, setVouchers] = useState<Voucher[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);

  const [purchaseReceiptId, setPurchaseReceiptId] = useState("");
  const [chargeLines, setChargeLines] = useState<ChargeLineInput[]>([{ description: "", amount: 0, accountId: "" }]);
  const [result, setResult] = useState<string | null>(null);

  const load = () => {
    if (!companyId) return;
    apiGet<Voucher[]>(`/companies/${companyId}/landed-costs`).then(setVouchers).catch((e) => setError(e.message));
  };
  useEffect(load, [companyId]);

  const updateLine = (i: number, patch: Partial<ChargeLineInput>) => {
    setChargeLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const submit = async () => {
    if (!companyId) { setResult("No company is assigned to your account yet."); return; }
    setResult(null);
    try {
      const voucher = await apiPost(`/companies/${companyId}/landed-costs`, {
        purchaseReceiptId,
        chargeLines: chargeLines.map((c) => ({ description: c.description, amount: c.amount, accountId: c.accountId || undefined })),
      });
      setResult(`Created: ${JSON.stringify(voucher)}`);
      load();
    } catch (e) {
      setResult(`Error: ${(e as Error).message}`);
    }
  };

  const apply = async (id: string) => {
    setApplying(id);
    try {
      await apiPost(`/companies/${companyId}/landed-costs/${id}/apply`, {});
      load();
    } catch (e) {
      setResult(`Error applying ${id}: ${(e as Error).message}`);
    } finally {
      setApplying(null);
    }
  };

  return (
    <div>
      <h2>Landed costs</h2>
      <p className="state">Allocates freight/customs/other charges across a POSTED purchase receipt's lines, capitalizing them into stock value instead of expensing them immediately.</p>
      {!companyId && <p className="state">No company is assigned to your account yet — ask an admin to assign one in Settings.</p>}
      {error && <p className="state">Could not reach the API ({error}).</p>}
      {companyId && !error && !vouchers && <p className="state">Loading…</p>}
      {vouchers && (
        <table style={{ marginBottom: 24 }}>
          <thead><tr><th>Receipt</th><th>Total</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {vouchers.map((v) => (
              <tr key={v.id}>
                <td>{v.purchaseReceiptId}</td><td>{v.totalAmount}</td>
                <td>{v.appliedAt ? `Applied ${new Date(v.appliedAt).toLocaleDateString()}` : "Draft"}</td>
                <td>{!v.appliedAt && <button disabled={applying === v.id} onClick={() => apply(v.id)}>{applying === v.id ? "Applying…" : "Apply"}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 style={{ fontSize: 14, color: "var(--muted)", textTransform: "uppercase" }}>New landed cost voucher</h3>
      <div style={{ display: "grid", gap: 10, maxWidth: 420, marginBottom: 16 }}>
        <input placeholder="Purchase receipt ID (must be posted)" value={purchaseReceiptId} onChange={(e) => setPurchaseReceiptId(e.target.value)} />
      </div>
      <table style={{ maxWidth: 700, marginBottom: 12 }}>
        <thead><tr><th>Description</th><th>Amount</th><th>Expense account ID (optional)</th></tr></thead>
        <tbody>
          {chargeLines.map((l, i) => (
            <tr key={i}>
              <td><input value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} /></td>
              <td><input type="number" value={l.amount} onChange={(e) => updateLine(i, { amount: Number(e.target.value) })} /></td>
              <td><input value={l.accountId} onChange={(e) => updateLine(i, { accountId: e.target.value })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => setChargeLines((p) => [...p, { description: "", amount: 0, accountId: "" }])}>+ Add charge</button>{" "}
      <button onClick={submit}>Create voucher</button>
      {result && <p className="state">{result}</p>}
    </div>
  );
}
