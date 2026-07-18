import { useEffect, useState } from "react";
import { apiGet } from "../api/client";

interface StockRow {
  productId: string;
  sku: string;
  name: string;
  onHand: number;
  reorderLevel: number;
  lowStock: boolean;
}

const COMPANY_ID = "REPLACE_WITH_REAL_COMPANY_ID";

export default function Stock() {
  const [rows, setRows] = useState<StockRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<StockRow[]>(`/companies/${COMPANY_ID}/reports/stock-on-hand`)
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h2>Stock on hand</h2>
      <p className="state">Real report endpoint (Appendix B) — reads Product + StockBalance via Prisma.</p>
      {error && <p className="state">Could not reach the API ({error}). Expected without a live database.</p>}
      {!error && !rows && <p className="state">Loading…</p>}
      {rows && (
        <table>
          <thead><tr><th>SKU</th><th>Name</th><th>On hand</th><th>Reorder level</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.productId}>
                <td>{r.sku}</td><td>{r.name}</td><td>{r.onHand}</td><td>{r.reorderLevel}</td>
                <td>{r.lowStock ? "Low stock" : "OK"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
