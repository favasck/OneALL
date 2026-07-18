import { useEffect, useState } from "react";
import { apiGet } from "../api/client";

interface Supplier {
  id: string;
  name: string;
  paymentTerms: string | null;
}

const COMPANY_ID = "REPLACE_WITH_REAL_COMPANY_ID";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Supplier[]>(`/companies/${COMPANY_ID}/suppliers`)
      .then(setSuppliers)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h2>Suppliers</h2>
      {error && <p className="state">Could not reach the API ({error}). Expected without a live database.</p>}
      {!error && !suppliers && <p className="state">Loading…</p>}
      {suppliers && (
        <table>
          <thead><tr><th>Name</th><th>Payment terms</th></tr></thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id}><td>{s.name}</td><td>{s.paymentTerms ?? "—"}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
