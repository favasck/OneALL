import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface PurchaseReceipt { id: string; number: string; status: string; receiptDate: string; }
interface LineState { productId: string; quantity: number; unitCost: number; purchaseOrderLineId: string; }

export default function PurchaseReceipts() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [receipts, setReceipts] = useState<PurchaseReceipt[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [lines, setLines] = useState<LineState[]>([{ productId: "", quantity: 1, unitCost: 0, purchaseOrderLineId: "" }]);
  const [result, setResult] = useState<string | null>(null);

  const load = () => {
    if (!companyId) return;
    apiGet<PurchaseReceipt[]>(`/companies/${companyId}/purchase-receipts`).then(setReceipts).catch((e) => setError(e.message));
  };
  useEffect(load, [companyId]);

  const updateLine = (i: number, patch: Partial<LineState>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const submit = async () => {
    if (!companyId) { setResult("No company is assigned to your account yet."); return; }
    setResult(null);
    try {
      const receipt = await apiPost(`/companies/${companyId}/purchase-receipts`, {
        supplierId, warehouseId, purchaseOrderId: purchaseOrderId || undefined,
        lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitCost: l.unitCost, purchaseOrderLineId: l.purchaseOrderLineId || undefined })),
      });
      setResult(`Created (draft): ${JSON.stringify(receipt)}`);
      load();
    } catch (e) {
      setResult(`Error: ${(e as Error).message}`);
    }
  };

  const postReceipt = async (id: string) => {
    setPosting(id);
    try {
      await apiPost(`/companies/${companyId}/purchase-receipts/${id}/post`, {});
      load();
    } catch (e) {
      setResult(`Error posting ${id}: ${(e as Error).message}`);
    } finally {
      setPosting(null);
    }
  };

  return (
    <div>
      <h2>Purchase receipts (goods received notes)</h2>
      <p className="state">Posting a draft receipt is what actually receives stock and updates its moving-average cost — see Stock report afterwards. Apply a landed cost voucher before posting to fold in freight/customs.</p>
      {!companyId && <p className="state">No company is assigned to your account yet — ask an admin to assign one in Settings.</p>}
      {error && <p className="state">Could not reach the API ({error}).</p>}
      {companyId && !error && !receipts && <p className="state">Loading…</p>}
      {receipts && (
        <table style={{ marginBottom: 24 }}>
          <thead><tr><th>Number</th><th>Date</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {receipts.map((r) => (
              <tr key={r.id}>
                <td>{r.number}</td><td>{new Date(r.receiptDate).toLocaleDateString()}</td><td>{r.status}</td>
                <td>{r.status === "DRAFT" && <button disabled={posting === r.id} onClick={() => postReceipt(r.id)}>{posting === r.id ? "Posting…" : "Post"}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 style={{ fontSize: 14, color: "var(--muted)", textTransform: "uppercase" }}>New purchase receipt</h3>
      <div style={{ display: "grid", gap: 10, maxWidth: 420, marginBottom: 16 }}>
        <input placeholder="Supplier ID" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} />
        <input placeholder="Warehouse ID" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} />
        <input placeholder="Purchase order ID (optional)" value={purchaseOrderId} onChange={(e) => setPurchaseOrderId(e.target.value)} />
      </div>
      <table style={{ maxWidth: 640, marginBottom: 12 }}>
        <thead><tr><th>Product ID</th><th>Qty</th><th>Unit cost</th><th>Purchase order line ID (optional)</th></tr></thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td><input value={l.productId} onChange={(e) => updateLine(i, { productId: e.target.value })} /></td>
              <td><input type="number" value={l.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} /></td>
              <td><input type="number" value={l.unitCost} onChange={(e) => updateLine(i, { unitCost: Number(e.target.value) })} /></td>
              <td><input value={l.purchaseOrderLineId} onChange={(e) => updateLine(i, { purchaseOrderLineId: e.target.value })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => setLines((p) => [...p, { productId: "", quantity: 1, unitCost: 0, purchaseOrderLineId: "" }])}>+ Add line</button>{" "}
      <button onClick={submit}>Create draft</button>
      {result && <p className="state">{result}</p>}
    </div>
  );
}
