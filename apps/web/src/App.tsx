import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import Products from "./pages/Products";
import SalesOrders from "./pages/SalesOrders";
import DeliveryNotes from "./pages/DeliveryNotes";
import Invoices from "./pages/Invoices";
import NewInvoice from "./pages/NewInvoice";
import PurchaseOrders from "./pages/PurchaseOrders";
import PurchaseReceipts from "./pages/PurchaseReceipts";
import NewPurchaseBill from "./pages/NewPurchaseBill";
import LandedCosts from "./pages/LandedCosts";
import RecordReceipt from "./pages/RecordReceipt";
import RecordSupplierPayment from "./pages/RecordSupplierPayment";
import Stock from "./pages/Stock";
import Inventory from "./pages/Inventory";
import Accounting from "./pages/Accounting";
import BankReconciliation from "./pages/BankReconciliation";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import { useAuth } from "./auth/AuthContext";

const NAV = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/customers", label: "Customers" },
  { to: "/suppliers", label: "Suppliers" },
  { to: "/products", label: "Products" },
  { to: "/sales-orders", label: "Sales orders" },
  { to: "/delivery-notes", label: "Delivery notes" },
  { to: "/invoices", label: "Invoices" },
  { to: "/invoices/new", label: "New invoice" },
  { to: "/purchase-orders", label: "Purchase orders" },
  { to: "/purchase-receipts", label: "Purchase receipts" },
  { to: "/purchase-bills/new", label: "New purchase bill" },
  { to: "/landed-costs", label: "Landed costs" },
  { to: "/receipts/new", label: "Record receipt" },
  { to: "/supplier-payments/new", label: "Record supplier payment" },
  { to: "/stock", label: "Stock" },
  { to: "/inventory", label: "Inventory" },
  { to: "/accounting", label: "Accounting" },
  { to: "/bank-reconciliation", label: "Bank reconciliation" },
  { to: "/reports", label: "Reports" },
  { to: "/settings", label: "Settings" },
];

export default function App() {
  const { user, loading, logout } = useAuth();

  // Section 9.1 / 5.8: every route below is behind a real session — this
  // is not a UI-only gate, the API's SessionAuthGuard rejects unauthorized
  // requests independently, but there is no reason to render the app shell
  // for a signed-out visitor.
  if (loading) return null;
  if (!user) return <Login />;

  return (
    <BrowserRouter>
      <aside className="sidebar">
        <h1>OneAll</h1>
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "active" : "")}>
            {item.label}
          </NavLink>
        ))}
        <div style={{ marginTop: 24, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.15)" }}>
          <div style={{ color: "rgba(255,255,255,.7)", fontSize: 12, marginBottom: 6 }}>{user.fullName}</div>
          <button
            onClick={logout}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,.3)",
              color: "#fff",
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/products" element={<Products />} />
          <Route path="/sales-orders" element={<SalesOrders />} />
          <Route path="/delivery-notes" element={<DeliveryNotes />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/new" element={<NewInvoice />} />
          <Route path="/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/purchase-receipts" element={<PurchaseReceipts />} />
          <Route path="/purchase-bills/new" element={<NewPurchaseBill />} />
          <Route path="/landed-costs" element={<LandedCosts />} />
          <Route path="/receipts/new" element={<RecordReceipt />} />
          <Route path="/supplier-payments/new" element={<RecordSupplierPayment />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/accounting" element={<Accounting />} />
          <Route path="/bank-reconciliation" element={<BankReconciliation />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
