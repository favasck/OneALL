// Business Pulse — Section 6.2 dashboard rules: every metric must show
// company, date range, currency and last-update time. Values below are
// placeholders; wire to GET /companies/:id/reports/pulse once that
// endpoint exists (not built in this scaffold).
export default function Dashboard() {
  const kpis = [
    { label: "Today's sales", value: "QAR 12,450" },
    { label: "Cash & bank", value: "QAR 84,200" },
    { label: "Receivables", value: "QAR 156,300" },
    { label: "Payables", value: "QAR 42,100" },
  ];
  return (
    <div>
      <h2>Business Pulse</h2>
      <p className="state">Al Waha Trading Co. · Doha branch · QAR · placeholder data, not yet wired to the API</p>
      <div className="kpi-row">
        {kpis.map((k) => (
          <div className="kpi-card" key={k.label}>
            <div className="label">{k.label}</div>
            <div className="value">{k.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
