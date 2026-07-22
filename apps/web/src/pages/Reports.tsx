import { useEffect, useState } from "react";
import { apiGet } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface SalesSummary { invoiceCount: number; totalSales: number }
interface AgeingBuckets { current: number; "1-30": number; "31-60": number; "61-90": number; "90+": number }

export default function Reports() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [sales, setSales] = useState<SalesSummary | null>(null);
  const [ageing, setAgeing] = useState<AgeingBuckets | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      apiGet<SalesSummary>(`/companies/${companyId}/reports/sales-summary`),
      apiGet<AgeingBuckets>(`/companies/${companyId}/reports/receivable-ageing`),
    ]).then(([s, a]) => { setSales(s); setAgeing(a); }).catch((e) => setError(e.message));
  }, [companyId]);

  return (
    <div>
      <h2>Reports</h2>
      <p className="state">Appendix B: daily/monthly sales summary and receivable ageing — real Prisma aggregations.</p>
      {!companyId && <p className="state">No company is assigned to your account yet — ask an admin to assign one in Settings.</p>}
      {error && <p className="state">Could not reach the API ({error}).</p>}
      {sales && (
        <div className="kpi-row" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
          <div className="kpi-card"><div className="label">Invoices posted</div><div className="value">{sales.invoiceCount}</div></div>
          <div className="kpi-card"><div className="label">Total sales</div><div className="value">QAR {sales.totalSales.toLocaleString()}</div></div>
        </div>
      )}
      {ageing && (
        <table>
          <thead><tr><th>Current</th><th>1-30 days</th><th>31-60 days</th><th>61-90 days</th><th>90+ days</th></tr></thead>
          <tbody>
            <tr><td>QAR {ageing.current.toLocaleString()}</td><td>QAR {ageing["1-30"].toLocaleString()}</td><td>QAR {ageing["31-60"].toLocaleString()}</td><td>QAR {ageing["61-90"].toLocaleString()}</td><td>QAR {ageing["90+"].toLocaleString()}</td></tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
