import { useState } from "react";
import { apiPost } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface LineState { productId: string; quantity: number; unitPrice: number; taxRatePct: number; deliveryNoteLineId: string; }

export default function NewInvoice() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CREDIT">("CREDIT");
  const [lines, setLines] = useState<LineState[]>([{ productId: "", quantity: 1, unitPrice: 0, taxRatePct: 0, deliveryNoteLineId: "" }]);
  const [result, setResult] = useState<string | null>(null);

  const updateLine = (i: number, patch: Partial<LineState>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const submit = async () => {
    if (!companyId) { setResult("No company is assigned to your account yet."); return; }
    setResult(null);
    try {
      const invoice = await apiPost(`/companies/${companyId}/invoices`, {
        customerId, warehouseId: warehouseId || undefined, paymentMethod,
        lines: lines.map((l) => ({
          productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, taxRatePct: l.taxRatePct,
          deliveryNoteLineId: l.deliveryNoteLineId || undefined,
        })),
      });
      setResult(`Created: ${JSON.stringify(invoice)}`);
    } catch (e) {
      setResult(`Error: ${(e as Error).message}`);
    }
  };

  return (
    <div>
      <h2>New invoice</h2>
      <p className="state">Leave a line's delivery note line ID blank for a direct/walk-in sale (issues stock now). Set it to bill against an already-posted delivery — see Delivery notes.</p>
      {!companyId && <p className="state">No company is assigned to your account yet — ask an admin to assign one in Settings.</p>}
      <div style={{ display: "grid", gap: 10, maxWidth: 420, marginBottom: 16 }}>
        <input placeholder="Customer ID" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
        <input placeholder="Warehouse ID (required unless every line is delivery-backed)" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} />
        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "CASH" | "CREDIT")}>
          <option value="CREDIT">Credit</option>
          <option value="CASH">Cash</option>
        </select>
      </div>
      <table style={{ maxWidth: 760, marginBottom: 12 }}>
        <thead><tr><th>Product ID</th><th>Qty</th><th>Unit price</th><th>Tax %</th><th>Delivery note line ID (optional)</th></tr></thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td><input value={l.productId} onChange={(e) => updateLine(i, { productId: e.target.value })} /></td>
              <td><input type="number" value={l.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} /></td>
              <td><input type="number" value={l.unitPrice} onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })} /></td>
              <td><input type="number" value={l.taxRatePct} onChange={(e) => updateLine(i, { taxRatePct: Number(e.target.value) })} /></td>
              <td><input value={l.deliveryNoteLineId} onChange={(e) => updateLine(i, { deliveryNoteLineId: e.target.value })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => setLines((p) => [...p, { productId: "", quantity: 1, unitPrice: 0, taxRatePct: 0, deliveryNoteLineId: "" }])}>+ Add line</button>{" "}
      <button onClick={submit}>Confirm invoice</button>
      {result && <p className="state">{result}</p>}
    </div>
  );
}
