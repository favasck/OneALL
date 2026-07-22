import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface DeliveryNote { id: string; number: string; status: string; deliveryDate: string; }
interface LineState { productId: string; quantity: number; salesOrderLineId: string; }

export default function DeliveryNotes() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [notes, setNotes] = useState<DeliveryNote[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [salesOrderId, setSalesOrderId] = useState("");
  const [lines, setLines] = useState<LineState[]>([{ productId: "", quantity: 1, salesOrderLineId: "" }]);
  const [result, setResult] = useState<string | null>(null);

  const load = () => {
    if (!companyId) return;
    apiGet<DeliveryNote[]>(`/companies/${companyId}/delivery-notes`).then(setNotes).catch((e) => setError(e.message));
  };
  useEffect(load, [companyId]);

  const updateLine = (i: number, patch: Partial<LineState>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const submit = async () => {
    if (!companyId) { setResult("No company is assigned to your account yet."); return; }
    setResult(null);
    try {
      const note = await apiPost(`/companies/${companyId}/delivery-notes`, {
        customerId, warehouseId, salesOrderId: salesOrderId || undefined,
        lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, salesOrderLineId: l.salesOrderLineId || undefined })),
      });
      setResult(`Created (draft): ${JSON.stringify(note)}`);
      load();
    } catch (e) {
      setResult(`Error: ${(e as Error).message}`);
    }
  };

  const postNote = async (id: string) => {
    setPosting(id);
    try {
      await apiPost(`/companies/${companyId}/delivery-notes/${id}/post`, {});
      load();
    } catch (e) {
      setResult(`Error posting ${id}: ${(e as Error).message}`);
    } finally {
      setPosting(null);
    }
  };

  return (
    <div>
      <h2>Delivery notes</h2>
      <p className="state">Posting a draft delivery note is what actually issues stock and captures its moving-average cost — see Stock report afterwards.</p>
      {!companyId && <p className="state">No company is assigned to your account yet — ask an admin to assign one in Settings.</p>}
      {error && <p className="state">Could not reach the API ({error}).</p>}
      {companyId && !error && !notes && <p className="state">Loading…</p>}
      {notes && (
        <table style={{ marginBottom: 24 }}>
          <thead><tr><th>Number</th><th>Date</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {notes.map((n) => (
              <tr key={n.id}>
                <td>{n.number}</td><td>{new Date(n.deliveryDate).toLocaleDateString()}</td><td>{n.status}</td>
                <td>{n.status === "DRAFT" && <button disabled={posting === n.id} onClick={() => postNote(n.id)}>{posting === n.id ? "Posting…" : "Post"}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 style={{ fontSize: 14, color: "var(--muted)", textTransform: "uppercase" }}>New delivery note</h3>
      <div style={{ display: "grid", gap: 10, maxWidth: 420, marginBottom: 16 }}>
        <input placeholder="Customer ID" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
        <input placeholder="Warehouse ID" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} />
        <input placeholder="Sales order ID (optional)" value={salesOrderId} onChange={(e) => setSalesOrderId(e.target.value)} />
      </div>
      <table style={{ maxWidth: 640, marginBottom: 12 }}>
        <thead><tr><th>Product ID</th><th>Qty</th><th>Sales order line ID (optional)</th></tr></thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td><input value={l.productId} onChange={(e) => updateLine(i, { productId: e.target.value })} /></td>
              <td><input type="number" value={l.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} /></td>
              <td><input value={l.salesOrderLineId} onChange={(e) => updateLine(i, { salesOrderLineId: e.target.value })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => setLines((p) => [...p, { productId: "", quantity: 1, salesOrderLineId: "" }])}>+ Add line</button>{" "}
      <button onClick={submit}>Create draft</button>
      {result && <p className="state">{result}</p>}
    </div>
  );
}
