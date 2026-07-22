import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface SalesOrder { id: string; number: string; status: string; grandTotal: string; orderDate: string; }
interface LineState { productId: string; quantity: number; unitPrice: number; taxRatePct: number; }

export default function SalesOrders() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [orders, setOrders] = useState<SalesOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<LineState[]>([{ productId: "", quantity: 1, unitPrice: 0, taxRatePct: 0 }]);
  const [result, setResult] = useState<string | null>(null);

  const load = () => {
    if (!companyId) return;
    apiGet<SalesOrder[]>(`/companies/${companyId}/sales-orders`).then(setOrders).catch((e) => setError(e.message));
  };
  useEffect(load, [companyId]);

  const updateLine = (i: number, patch: Partial<LineState>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const submit = async () => {
    if (!companyId) { setResult("No company is assigned to your account yet."); return; }
    setResult(null);
    try {
      const order = await apiPost(`/companies/${companyId}/sales-orders`, { customerId, lines });
      setResult(`Created: ${JSON.stringify(order)}`);
      load();
    } catch (e) {
      setResult(`Error: ${(e as Error).message}`);
    }
  };

  return (
    <div>
      <h2>Sales orders</h2>
      <p className="state">Commits a price/quantity with a customer. No stock or ledger impact until a delivery note against it is posted.</p>
      {!companyId && <p className="state">No company is assigned to your account yet — ask an admin to assign one in Settings.</p>}
      {error && <p className="state">Could not reach the API ({error}).</p>}
      {companyId && !error && !orders && <p className="state">Loading…</p>}
      {orders && (
        <table style={{ marginBottom: 24 }}>
          <thead><tr><th>Number</th><th>Date</th><th>Status</th><th>Total</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}><td>{o.number}</td><td>{new Date(o.orderDate).toLocaleDateString()}</td><td>{o.status}</td><td>{o.grandTotal}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 style={{ fontSize: 14, color: "var(--muted)", textTransform: "uppercase" }}>New sales order</h3>
      <div style={{ display: "grid", gap: 10, maxWidth: 420, marginBottom: 16 }}>
        <input placeholder="Customer ID" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
      </div>
      <table style={{ maxWidth: 600, marginBottom: 12 }}>
        <thead><tr><th>Product ID</th><th>Qty</th><th>Unit price</th><th>Tax %</th></tr></thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td><input value={l.productId} onChange={(e) => updateLine(i, { productId: e.target.value })} /></td>
              <td><input type="number" value={l.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} /></td>
              <td><input type="number" value={l.unitPrice} onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })} /></td>
              <td><input type="number" value={l.taxRatePct} onChange={(e) => updateLine(i, { taxRatePct: Number(e.target.value) })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => setLines((p) => [...p, { productId: "", quantity: 1, unitPrice: 0, taxRatePct: 0 }])}>+ Add line</button>{" "}
      <button onClick={submit}>Confirm order</button>
      {result && <p className="state">{result}</p>}
    </div>
  );
}
