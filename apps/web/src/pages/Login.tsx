import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";

// Section 5.8 step 3: "User signs in, verifies identity and registers
// device/session." Real submit against POST /auth/login via AuthContext —
// not mocked. Seed script (packages/db/prisma/seed.ts) creates a real
// login: owner@alwaha-trading.qa / ChangeMe123!.
export default function Login() {
  const { login, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
    } catch {
      // error state is already surfaced via useAuth().error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: 32,
          width: 320,
          display: "grid",
          gap: 12,
        }}
      >
        <h1 style={{ color: "var(--navy)", fontSize: 20, margin: "0 0 4px" }}>OneAll</h1>
        <p className="state" style={{ margin: "0 0 8px", padding: 0 }}>
          Sign in to Al Waha Trading Co.
        </p>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p style={{ color: "var(--red)", fontSize: 13, margin: 0 }}>{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
