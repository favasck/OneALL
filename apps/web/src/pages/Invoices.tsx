import { useEffect, useState } from "react";
import { apiGet } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface Invoice { id: string; number: string; status: string; subtotal: string; taxTotal: string; grandTotal: string; invoiceDate: string; }

export default function Invoices() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    apiGet<Invoice[]>(`/companies/${companyId}/invoices`).then(setInvoices).catch((e) => setError(e.message));
  }, [companyId]);

  return (
    <div>
      <h2>Invoices</h2>
      {!companyId && <p className="state">No company is assigned to your account yet — ask an admin to assign one in Settings.</p>}
      {error && <p className="state">Could not reach the API ({error}).</p>}
      {companyId && !error && !invoices && <p className="state">Loading…</p>}
      {invoices && (
        <table>
          <thead><tr><th>Number</th><th>Date</th><th>Status</th><th>Subtotal</th><th>Tax</th><th>Total</th></tr></thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id}><td>{i.number}</td><td>{new Date(i.invoiceDate).toLocaleDateString()}</td><td>{i.status}</td><td>{i.subtotal}</td><td>{i.taxTotal}</td><td>{i.grandTotal}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
