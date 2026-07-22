import { useState } from "react";
import { apiPost } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface AllocationState { purchaseBillId: string; amount: number; }

export default function RecordSupplierPayment() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [supplierId, setSupplierId] = useState("");
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [allocations, setAllocations] = useState<AllocationState[]>([{ purchaseBillId: "", amount: 0 }]);
  const [result, setResult] = useState<string | null>(null);

  const updateAllocation = (i: number, patch: Partial<AllocationState>) => {
    setAllocations((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  };

  const allocatedTotal = allocations.reduce((s, a) => s + a.amount, 0);

  const submit = async () => {
    if (!companyId) { setResult("No company is assigned to your account yet."); return; }
    setResult(null);
    try {
      const payment = await apiPost(`/companies/${companyId}/supplier-payments`, { supplierId, amount, method, allocations });
      setResult(`Created: ${JSON.stringify(payment)}`);
    } catch (e) {
      setResult(`Error: ${(e as Error).message}`);
    }
  };

  return (
    <div>
      <h2>Record supplier payment</h2>
      {!companyId && <p className="state">No company is assigned to your account yet — ask an admin to assign one in Settings.</p>}
      <div style={{ display: "grid", gap: 10, maxWidth: 420, marginBottom: 16 }}>
        <input placeholder="Supplier ID" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} />
        <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="BANK_TRANSFER">Bank transfer</option>
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="CHEQUE">Cheque</option>
        </select>
      </div>
      <table style={{ maxWidth: 460, marginBottom: 8 }}>
        <thead><tr><th>Purchase bill ID</th><th>Allocated amount</th></tr></thead>
        <tbody>
          {allocations.map((a, i) => (
            <tr key={i}>
              <td><input value={a.purchaseBillId} onChange={(e) => updateAllocation(i, { purchaseBillId: e.target.value })} /></td>
              <td><input type="number" value={a.amount} onChange={(e) => updateAllocation(i, { amount: Number(e.target.value) })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="state" style={{ padding: 0, marginBottom: 12 }}>
        Allocated: {allocatedTotal} / Payment amount: {amount}
        {allocatedTotal !== amount && <span style={{ color: "var(--red)" }}> — must match before the API will accept this.</span>}
      </p>
      <button onClick={() => setAllocations((p) => [...p, { purchaseBillId: "", amount: 0 }])}>+ Add allocation</button>{" "}
      <button onClick={submit}>Confirm payment</button>
      {result && <p className="state">{result}</p>}
    </div>
  );
}
