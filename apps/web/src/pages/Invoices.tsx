import { useEffect, useState } from "react";
import { apiGet } from "../api/client";

interface Invoice {
  id: string;
  number: string;
  status: string;
  subtotal: string;
  taxTotal: string;
  grandTotal: string;
  invoiceDate: string;
}

const COMPANY_ID = "REPLACE_WITH_REAL_COMPANY_ID";

// Section 5.2: lists invoices posted via GET /companies/:id/invoices.
export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Invoice[]>(`/companies/${COMPANY_ID}/invoices`)
      .then(setInvoices)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h2>Invoices</h2>
      {error && <p className="state">Could not reach the API ({error}). Expected without a live database.</p>}
      {!error && !invoices && <p className="state">Loading…</p>}
      {invoices && (
        <table>
          <thead>
            <tr>
              <th>Number</th><th>Date</th><th>Status</th><th>Subtotal</th><th>Tax</th><th>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id}>
                <td>{i.number}</td>
                <td>{new Date(i.invoiceDate).toLocaleDateString()}</td>
                <td>{i.status}</td>
                <td>{i.subtotal}</td>
                <td>{i.taxTotal}</td>
                <td>{i.grandTotal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
