import { useState } from "react";
import { apiPost } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface LineState { productId: string; quantity: number; unitCost: number; taxRatePct: number; purchaseReceiptLineId: string; }

export default function NewPurchaseBill() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [supplierRef, setSupplierRef] = useState("");
  const [lines, setLines] = useState<LineState[]>([{ productId: "", quantity: 1, unitCost: 0, taxRatePct: 0, purchaseReceiptLineId: "" }]);
  const [result, setResult] = useState<string | null>(null);

  const updateLine = (i: number, patch: Partial<LineState>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const submit = async () => {
    if (!companyId) { setResult("No company is assigned to your account yet."); return; }
    setResult(null);
    try {
      const bill = await apiPost(`/companies/${companyId}/purchase-bills`, {
        supplierId, warehouseId: warehouseId || undefined, supplierRef: supplierRef || undefined,
        lines: lines.map((l) => ({
          productId: l.productId, quantity: l.quantity, unitCost: l.unitCost, taxRatePct: l.taxRatePct,
          purchaseReceiptLineId: l.purchaseReceiptLineId || undefined,
        })),
      });
      setResult(`Created: ${JSON.stringify(bill)}`);
    } catch (e) {
      setResult(`Error: ${(e as Error).message}`);
    }
  };

  return (
    <div>
      <h2>New purchase bill</h2>
      <p className="state">Leave a line's purchase receipt line ID blank for a direct bill (receives stock now). Set it to bill against an already-posted receipt — see Purchase receipts.</p>
      {!companyId && <p className="state">No company is assigned to your account yet — ask an admin to assign one in Settings.</p>}
      <div style={{ display: "grid", gap: 10, maxWidth: 420, marginBottom: 16 }}>
        <input placeholder="Supplier ID" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} />
        <input placeholder="Warehouse ID (required unless every line is receipt-backed)" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} />
        <input placeholder="Supplier reference (optional)" value={supplierRef} onChange={(e) => setSupplierRef(e.target.value)} />
      </div>
      <table style={{ maxWidth: 760, marginBottom: 12 }}>
        <thead><tr><th>Product ID</th><th>Qty</th><th>Unit cost</th><th>Tax %</th><th>Purchase receipt line ID (optional)</th></tr></thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td><input value={l.productId} onChange={(e) => updateLine(i, { productId: e.target.value })} /></td>
              <td><input type="number" value={l.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} /></td>
              <td><input type="number" value={l.unitCost} onChange={(e) => updateLine(i, { unitCost: Number(e.target.value) })} /></td>
              <td><input type="number" value={l.taxRatePct} onChange={(e) => updateLine(i, { taxRatePct: Number(e.target.value) })} /></td>
              <td><input value={l.purchaseReceiptLineId} onChange={(e) => updateLine(i, { purchaseReceiptLineId: e.target.value })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => setLines((p) => [...p, { productId: "", quantity: 1, unitCost: 0, taxRatePct: 0, purchaseReceiptLineId: "" }])}>+ Add line</button>{" "}
      <button onClick={submit}>Confirm bill</button>
      {result && <p className="state">{result}</p>}
    </div>
  );
}
