import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";

interface Company {
  id: string;
  name: string;
  baseCurrency: string;
  crNumber: string | null;
}

const TENANT_ID = "REPLACE_WITH_REAL_TENANT_ID";

// Section 4.1: company identity/config. Only the piece the API actually
// supports today — list + create companies under a tenant
// (GET/POST /tenants/:tenantId/companies, tenants.service.ts). CR/tax
// details, branches, warehouses and numbering are Section 4.1 scope too,
// but there's no endpoint for them yet — see the TODO in
// tenants.service.ts before extending this page to cover them.
export default function Settings() {
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<string | null>(null);

  const load = () => {
    setError(null);
    apiGet<Company[]>(`/tenants/${TENANT_ID}/companies`)
      .then(setCompanies)
      .catch((e) => setError(e.message));
  };

  useEffect(load, []);

  const createCompany = async () => {
    setCreateResult(null);
    setCreating(true);
    try {
      await apiPost(`/tenants/${TENANT_ID}/companies`, { name: newName });
      setNewName("");
      setCreateResult("Created.");
      load();
    } catch (e) {
      setCreateResult(`Error (expected without a live database): ${(e as Error).message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h2>Settings — Companies</h2>
      {error && <p className="state">Could not reach the API ({error}). Expected without a live database.</p>}
      {!error && !companies && <p className="state">Loading…</p>}
      {companies && (
        <table style={{ marginBottom: 20, maxWidth: 600 }}>
          <thead><tr><th>Name</th><th>Currency</th><th>CR number</th></tr></thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id}><td>{c.name}</td><td>{c.baseCurrency}</td><td>{c.crNumber ?? "—"}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 style={{ fontSize: 14, color: "var(--muted)", textTransform: "uppercase" }}>Add a company</h3>
      <div style={{ display: "flex", gap: 10, maxWidth: 420 }}>
        <input placeholder="Company name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button onClick={createCompany} disabled={creating || !newName.trim()}>
          {creating ? "Creating…" : "Create"}
        </button>
      </div>
      {createResult && <p className="state">{createResult}</p>}
    </div>
  );
}
