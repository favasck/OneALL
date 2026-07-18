import { useState } from "react";
import { apiGet, apiPost } from "../api/client";

const COMPANY_ID = "REPLACE_WITH_REAL_COMPANY_ID";

interface Movement {
  id: string;
  quantity: string;
  reason: string;
  reference: string | null;
  createdAt: string;
}

// Section 5.4 stock count / adjustment workflow. Movements lookup hits
// GET .../inventory/movements?warehouseId=&productId=; the adjustment form
// posts to POST .../inventory/adjustments, which computes the delta from
// counted vs. book quantity server-side and enforces a mandatory reason
// (inventory.service.ts).
export default function Inventory() {
  const [lookupWarehouseId, setLookupWarehouseId] = useState("");
  const [lookupProductId, setLookupProductId] = useState("");
  const [movements, setMovements] = useState<Movement[] | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [warehouseId, setWarehouseId] = useState("");
  const [productId, setProductId] = useState("");
  const [countedQuantity, setCountedQuantity] = useState(0);
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const lookupMovements = async () => {
    setLookupError(null);
    setMovements(null);
    try {
      const rows = await apiGet<Movement[]>(
        `/companies/${COMPANY_ID}/inventory/movements?warehouseId=${encodeURIComponent(lookupWarehouseId)}&productId=${encodeURIComponent(lookupProductId)}`,
      );
      setMovements(rows);
    } catch (e) {
      setLookupError((e as Error).message);
    }
  };

  const submitAdjustment = async () => {
    setResult(null);
    if (!reason.trim()) {
      setResult("Reason is required (Section 5.4 step 3) — the API rejects adjustments without one.");
      return;
    }
    try {
      const adjustment = await apiPost(`/companies/${COMPANY_ID}/inventory/adjustments`, {
        warehouseId,
        productId,
        countedQuantity,
        reason,
      });
      setResult(`Adjustment recorded: ${JSON.stringify(adjustment)}`);
    } catch (e) {
      setResult(`Error (expected without a live database): ${(e as Error).message}`);
    }
  };

  return (
    <div>
      <h2>Inventory</h2>

      <h3 style={{ fontSize: 14, color: "var(--muted)", textTransform: "uppercase" }}>Recent movements</h3>
      <div style={{ display: "flex", gap: 10, maxWidth: 500, marginBottom: 10 }}>
        <input placeholder="Warehouse ID" value={lookupWarehouseId} onChange={(e) => setLookupWarehouseId(e.target.value)} />
        <input placeholder="Product ID" value={lookupProductId} onChange={(e) => setLookupProductId(e.target.value)} />
        <button onClick={lookupMovements}>Look up</button>
      </div>
      {lookupError && <p className="state">Could not reach the API ({lookupError}). Expected without a live database.</p>}
      {movements && (
        <table style={{ marginBottom: 24, maxWidth: 600 }}>
          <thead><tr><th>Quantity</th><th>Reason</th><th>Reference</th><th>Date</th></tr></thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id}>
                <td>{m.quantity}</td><td>{m.reason}</td><td>{m.reference ?? "—"}</td>
                <td>{new Date(m.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 style={{ fontSize: 14, color: "var(--muted)", textTransform: "uppercase" }}>Stock adjustment</h3>
      <p className="state">Enter the physically counted quantity — the server computes the delta, not this form.</p>
      <div style={{ display: "grid", gap: 10, maxWidth: 420, marginBottom: 12 }}>
        <input placeholder="Warehouse ID" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} />
        <input placeholder="Product ID" value={productId} onChange={(e) => setProductId(e.target.value)} />
        <input
          type="number"
          placeholder="Counted quantity"
          value={countedQuantity}
          onChange={(e) => setCountedQuantity(Number(e.target.value))}
        />
        <input placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <button onClick={submitAdjustment}>Confirm adjustment</button>
      {result && <p className="state">{result}</p>}
    </div>
  );
}
