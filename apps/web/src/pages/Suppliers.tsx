import { useEffect, useState } from "react";
import { apiGet } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface Supplier { id: string; name: string; paymentTerms: string | null; }

export default function Suppliers() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    apiGet<Supplier[]>(`/companies/${companyId}/suppliers`).then(setSuppliers).catch((e) => setError(e.message));
  }, [companyId]);

  return (
    <div>
      <h2>Suppliers</h2>
      {!companyId && <p className="state">No company is assigned to your account yet — ask an admin to assign one in Settings.</p>}
      {error && <p className="state">Could not reach the API ({error}).</p>}
      {companyId && !error && !suppliers && <p className="state">Loading…</p>}
      {suppliers && (
        <table>
          <thead><tr><th>Name</th><th>Payment terms</th></tr></thead>
          <tbody>{suppliers.map((s) => (<tr key={s.id}><td>{s.name}</td><td>{s.paymentTerms ?? "—"}</td></tr>))}</tbody>
        </table>
      )}
    </div>
  );
}
