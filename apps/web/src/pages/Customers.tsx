import { useEffect, useState } from "react";
import { apiGet } from "../api/client";

interface Customer {
  id: string;
  name: string;
  creditLimit: string;
}

// Real API call (Section 4.2 customer master) — will show the error state
// below until apps/api is running against a live Postgres with a seeded
// companyId, since neither exists in this scaffold.
const COMPANY_ID = "REPLACE_WITH_REAL_COMPANY_ID";

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Customer[]>(`/companies/${COMPANY_ID}/customers`)
      .then(setCustomers)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h2>Customers</h2>
      {error && (
        <p className="state">
          Could not reach the API ({error}). Expected until apps/api is running with a real
          database and COMPANY_ID is set — this page is wired for real, not mocked.
        </p>
      )}
      {!error && !customers && <p className="state">Loading…</p>}
      {customers && (
        <table>
          <thead>
            <tr><th>Name</th><th>Credit limit</th></tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}><td>{c.name}</td><td>{c.creditLimit}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
