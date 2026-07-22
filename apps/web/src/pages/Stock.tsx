import { useEffect, useState } from "react";
import { apiGet } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface StockRow {
  productId: string; sku: string; name: string; onHand: number; valuationRate: number; stockValue: number;
  reorderLevel: number; lowStock: boolean;
}

export default function Stock() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [rows, setRows] = useState<StockRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    apiGet<StockRow[]>(`/companies/${companyId}/reports/stock-on-hand`).then(setRows).catch((e) => setError(e.message));
  }, [companyId]);

  const totalValue = rows?.reduce((s, r) => s + r.stockValue, 0) ?? 0;

  return (
    <div>
      <h2>Stock on hand</h2>
      <p className="state">Moving-average valuation — real report endpoint reading Product + StockBalance via Prisma.</p>
      {!companyId && <p className="state">No company is assigned to your account yet — ask an admin to assign one in Settings.</p>}
      {error && <p className="state">Could not reach the API ({error}).</p>}
      {companyId && !error && !rows && <p className="state">Loading…</p>}
      {rows && (
        <>
          <table>
            <thead><tr><th>SKU</th><th>Name</th><th>On hand</th><th>Avg. cost</th><th>Stock value</th><th>Reorder level</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.productId}>
                  <td>{r.sku}</td><td>{r.name}</td><td>{r.onHand}</td>
                  <td>{r.valuationRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                  <td>{r.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td>{r.reorderLevel}</td><td>{r.lowStock ? "Low stock" : "OK"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="state">Total inventory value: QAR {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </>
      )}
    </div>
  );
}
