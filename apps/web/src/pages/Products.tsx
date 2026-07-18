import { useEffect, useState } from "react";
import { apiGet } from "../api/client";

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  sellingPrice: string;
  reorderLevel: string;
}

const COMPANY_ID = "REPLACE_WITH_REAL_COMPANY_ID";

export default function Products() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Product[]>(`/companies/${COMPANY_ID}/products`)
      .then(setProducts)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h2>Products</h2>
      {error && <p className="state">Could not reach the API ({error}). Expected without a live database.</p>}
      {!error && !products && <p className="state">Loading…</p>}
      {products && (
        <table>
          <thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>Price</th><th>Reorder level</th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.sku}</td><td>{p.name}</td><td>{p.category ?? "—"}</td>
                <td>{p.sellingPrice}</td><td>{p.reorderLevel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
