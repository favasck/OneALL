// Thin fetch wrapper. Base URL points at apps/api (Section 8.3: "API-first
// design so Web, Mobile and connectors use governed services").
//
// Defaults to a same-origin relative "/api" path -- in production the web
// app and the NestJS API are one Vercel deployment (vercel.json rewrites
// /api/* to the serverless function), so no env var is required for the
// deployed site to work. Local dev (vite on :5173, API on :3000) sets
// VITE_API_BASE=http://localhost:3000/api in apps/web/.env.local to
// override this, since those run on different ports.
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";
const TOKEN_KEY = "oneall_session_token";

// Session token storage. This is a real deployed web app (not a Claude
// artifact), so localStorage is the normal, correct place for a session
// token cache — it survives a tab refresh, which a bare in-memory variable
// would not. The server-side session itself is still the source of truth
// (Section 9.1: revocation is a single DB write); this is just the
// client's copy of the opaque token from POST /auth/login.
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { ...authHeaders() } });
  if (res.status === 401) clearToken();
  if (!res.ok) throw new ApiError(res.status, `GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (res.status === 401) clearToken();
  if (!res.ok) throw new ApiError(res.status, `POST ${path} failed: ${res.status}`);
  return res.json();
}
