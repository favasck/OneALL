import { useEffect, useState } from "react";
import { apiGet } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface Customer { id: string; name: string; creditLimit: string; }

export default function Customers() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    apiGet<Customer[]>(`/companies/${companyId}/customers`).then(setCustomers).catch((e) => setError(e.message));
  }, [companyId]);

  return (
    <div>
      <h2>Customers</h2>
      {!companyId && <p className="state">No company is assigned to your account yet — ask an admin to assign one in Settings.</p>}
      {error && <p className="state">Could not reach the API ({error}).</p>}
      {companyId && !error && !customers && <p className="state">Loading…</p>}
      {customers && (
        <table>
          <thead><tr><th>Name</th><th>Credit limit</th></tr></thead>
          <tbody>{customers.map((c) => (<tr key={c.id}><td>{c.name}</td><td>{c.creditLimit}</td></tr>))}</tbody>
        </table>
      )}
    </div>
  );
}
