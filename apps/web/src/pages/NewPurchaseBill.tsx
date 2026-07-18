import { useState } from "react";
import { apiPost } from "../api/client";

const COMPANY_ID = "REPLACE_WITH_REAL_COMPANY_ID";

interface LineState {
  productId: string;
  quantity: number;
  unitCost: number;
  taxRatePct: number;
}

// Section 5.3 purchase-to-pay workflow, steps 1-3. Posts to
// POST /companies/:id/purchase-bills, which runs the CREDIT_PURCHASE_STOCK
// posting rule and creates the stock receipt in one transaction.
export default function NewPurchaseBill() {
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [supplierRef, setSupplierRef] = useState("");
  const [lines, setLines] = useState<LineState[]>([{ productId: "", quantity: 1, unitCost: 0, taxRatePct: 0 }]);
  const [result, setResult] = useState<string | null>(null);

  const updateLine = (i: number, patch: Partial<LineState>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const submit = async () => {
    setResult(null);
    try {
      const bill = await apiPost(`/companies/${COMPANY_ID}/purchase-bills`, {
        supplierId,
        warehouseId,
        supplierRef: supplierRef || undefined,
        lines,
      });
      setResult(`Created: ${JSON.stringify(bill)}`);
    } catch (e) {
      setResult(`Error (expected without a live database): ${(e as Error).message}`);
    }
  };

  return (
    <div>
      <h2>New purchase bill</h2>
      <p className="state">Real POST to the API — will error without a live database, which is expected here.</p>
      <div style={{ display: "grid", gap: 10, maxWidth: 420, marginBottom: 16 }}>
        <input placeholder="Supplier ID" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} />
        <input placeholder="Warehouse ID" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} />
        <input placeholder="Supplier reference (optional)" value={supplierRef} onChange={(e) => setSupplierRef(e.target.value)} />
      </div>
      <table style={{ maxWidth: 600, marginBottom: 12 }}>
        <thead><tr><th>Product ID</th><th>Qty</th><th>Unit cost</th><th>Tax %</th></tr></thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td><input value={l.productId} onChange={(e) => updateLine(i, { productId: e.target.value })} /></td>
              <td><input type="number" value={l.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} /></td>
              <td><input type="number" value={l.unitCost} onChange={(e) => updateLine(i, { unitCost: Number(e.target.value) })} /></td>
              <td><input type="number" value={l.taxRatePct} onChange={(e) => updateLine(i, { taxRatePct: Number(e.target.value) })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => setLines((p) => [...p, { productId: "", quantity: 1, unitCost: 0, taxRatePct: 0 }])}>
        + Add line
      </button>{" "}
      <button onClick={submit}>Confirm bill</button>
      {result && <p className="state">{result}</p>}
    </div>
  );
}
