import { useState } from "react";
import { apiPost } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface AllocationState { invoiceId: string; amount: number; }

export default function RecordReceipt() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [allocations, setAllocations] = useState<AllocationState[]>([{ invoiceId: "", amount: 0 }]);
  const [result, setResult] = useState<string | null>(null);

  const updateAllocation = (i: number, patch: Partial<AllocationState>) => {
    setAllocations((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  };

  const allocatedTotal = allocations.reduce((s, a) => s + a.amount, 0);

  const submit = async () => {
    if (!companyId) { setResult("No company is assigned to your account yet."); return; }
    setResult(null);
    try {
      const receipt = await apiPost(`/companies/${companyId}/receipts`, { customerId, amount, method, allocations });
      setResult(`Created: ${JSON.stringify(receipt)}`);
    } catch (e) {
      setResult(`Error: ${(e as Error).message}`);
    }
  };

  return (
    <div>
      <h2>Record receipt</h2>
      {!companyId && <p className="state">No company is assigned to your account yet — ask an admin to assign one in Settings.</p>}
      <div style={{ display: "grid", gap: 10, maxWidth: 420, marginBottom: 16 }}>
        <input placeholder="Customer ID" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
        <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="BANK_TRANSFER">Bank transfer</option>
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="CHEQUE">Cheque</option>
        </select>
      </div>
      <table style={{ maxWidth: 460, marginBottom: 8 }}>
        <thead><tr><th>Invoice ID</th><th>Allocated amount</th></tr></thead>
        <tbody>
          {allocations.map((a, i) => (
            <tr key={i}>
              <td><input value={a.invoiceId} onChange={(e) => updateAllocation(i, { invoiceId: e.target.value })} /></td>
              <td><input type="number" value={a.amount} onChange={(e) => updateAllocation(i, { amount: Number(e.target.value) })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="state" style={{ padding: 0, marginBottom: 12 }}>
        Allocated: {allocatedTotal} / Receipt amount: {amount}
        {allocatedTotal !== amount && <span style={{ color: "var(--red)" }}> — must match before the API will accept this.</span>}
      </p>
      <button onClick={() => setAllocations((p) => [...p, { invoiceId: "", amount: 0 }])}>+ Add allocation</button>{" "}
      <button onClick={submit}>Confirm receipt</button>
      {result && <p className="state">{result}</p>}
    </div>
  );
}
