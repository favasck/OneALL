import { useState } from "react";
import { apiPost } from "../api/client";

const COMPANY_ID = "REPLACE_WITH_REAL_COMPANY_ID";

interface LineState {
  productId: string;
  quantity: number;
  unitPrice: number;
  taxRatePct: number;
}

// Section 5.2 sales-to-cash workflow, steps 1-6. Posts to
// POST /companies/:id/invoices, which validates the credit limit for
// CREDIT sales, runs the CREDIT_SALE/CASH_SALE posting rule, issues stock
// and writes the journal entry in one transaction (invoices.service.ts).
export default function NewInvoice() {
  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CREDIT">("CREDIT");
  const [lines, setLines] = useState<LineState[]>([{ productId: "", quantity: 1, unitPrice: 0, taxRatePct: 0 }]);
  const [result, setResult] = useState<string | null>(null);

  const updateLine = (i: number, patch: Partial<LineState>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const submit = async () => {
    setResult(null);
    try {
      const invoice = await apiPost(`/companies/${COMPANY_ID}/invoices`, {
        customerId,
        warehouseId,
        paymentMethod,
        lines,
      });
      setResult(`Created: ${JSON.stringify(invoice)}`);
    } catch (e) {
      setResult(`Error (expected without a live database): ${(e as Error).message}`);
    }
  };

  return (
    <div>
      <h2>New invoice</h2>
      <p className="state">Real POST to the API — will error without a live database, which is expected here.</p>
      <div style={{ display: "grid", gap: 10, maxWidth: 420, marginBottom: 16 }}>
        <input placeholder="Customer ID" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
        <input placeholder="Warehouse ID" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} />
        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "CASH" | "CREDIT")}>
          <option value="CREDIT">Credit</option>
          <option value="CASH">Cash</option>
        </select>
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
      <button onClick={() => setLines((p) => [...p, { productId: "", quantity: 1, unitPrice: 0, taxRatePct: 0 }])}>
        + Add line
      </button>{" "}
      <button onClick={submit}>Confirm invoice</button>
      {result && <p className="state">{result}</p>}
    </div>
  );
}
