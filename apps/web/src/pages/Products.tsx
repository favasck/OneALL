import { useEffect, useState } from "react";
import { apiGet } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface Product { id: string; sku: string; name: string; category: string | null; sellingPrice: string; reorderLevel: string; }

export default function Products() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    apiGet<Product[]>(`/companies/${companyId}/products`).then(setProducts).catch((e) => setError(e.message));
  }, [companyId]);

  return (
    <div>
      <h2>Products</h2>
      {!companyId && <p className="state">No company is assigned to your account yet — ask an admin to assign one in Settings.</p>}
      {error && <p className="state">Could not reach the API ({error}).</p>}
      {companyId && !error && !products && <p className="state">Loading…</p>}
      {products && (
        <table>
          <thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>Price</th><th>Reorder level</th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}><td>{p.sku}</td><td>{p.name}</td><td>{p.category ?? "—"}</td><td>{p.sellingPrice}</td><td>{p.reorderLevel}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
