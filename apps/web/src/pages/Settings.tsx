import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface Company { id: string; name: string; baseCurrency: string; crNumber: string | null; }

export default function Settings() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<string | null>(null);

  const load = () => {
    if (!tenantId) return;
    setError(null);
    apiGet<Company[]>(`/tenants/${tenantId}/companies`).then(setCompanies).catch((e) => setError(e.message));
  };

  useEffect(load, [tenantId]);

  const createCompany = async () => {
    if (!tenantId) { setCreateResult("No tenant on this account."); return; }
    setCreateResult(null);
    setCreating(true);
    try {
      await apiPost(`/tenants/${tenantId}/companies`, { name: newName });
      setNewName("");
      setCreateResult("Created.");
      load();
    } catch (e) {
      setCreateResult(`Error: ${(e as Error).message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h2>Settings — Companies</h2>
      {error && <p className="state">Could not reach the API ({error}).</p>}
      {!error && !companies && <p className="state">Loading…</p>}
      {companies && (
        <table style={{ marginBottom: 20, maxWidth: 600 }}>
          <thead><tr><th>Name</th><th>Currency</th><th>CR number</th></tr></thead>
          <tbody>{companies.map((c) => (<tr key={c.id}><td>{c.name}</td><td>{c.baseCurrency}</td><td>{c.crNumber ?? "—"}</td></tr>))}</tbody>
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
