// One client for the whole Chakrapay backend (loan-platform-backend).
// Base URL: VITE_API_URL, or same-origin /api/v1 (the dev server and nginx proxy /api to the backend).
const ROOT = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
export const BASE = `${ROOT}/api/v1`;
const KEY = 'chakrapay.session';

export type Role = 'customer' | 'staff' | 'manager' | 'admin';
export type User = { id: number; name: string; email: string; mobile: string | null; city: string | null; role: Role; email_verified: boolean; photo_url?: string | null };
type Session = { access_token: string; refresh_token: string; user: User };
export const TEAM_ROLES: Role[] = ['staff', 'manager', 'admin'];

export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }

// ---------- session ----------
function read(): Session | null { try { const r = localStorage.getItem(KEY); return r ? (JSON.parse(r) as Session) : null; } catch { return null; } }
function write(s: Session | null) {
  try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event('chakrapay-auth'));
}
export const getUser = (): User | null => read()?.user ?? null;
export const setSession = (s: Session) => write(s);
export const clearSession = () => write(null);

// ---------- requests ----------
type Opts = { query?: Record<string, string | number | boolean | null | undefined>; body?: unknown; form?: FormData; auth?: boolean };

function message(status: number, data: any): string {
  const d = data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d) && d[0]?.msg) {
    const loc = Array.isArray(d[0].loc) ? String(d[0].loc[d[0].loc.length - 1]) : '';
    const msg = String(d[0].msg).replace(/^Value error, /, '');
    return loc && !['body', 'query'].includes(loc) && !msg.toLowerCase().includes(loc.toLowerCase()) ? `${loc.replace(/_/g, ' ')}: ${msg}` : msg;
  }
  if (status === 429) return 'Too many tries. Please wait a little and try again.';
  if (status === 401) return 'Please log in again.';
  if (status === 403) return 'You do not have permission to do this.';
  return 'Something went wrong. Please try again.';
}

let refreshing: Promise<boolean> | null = null;
async function refresh(): Promise<boolean> {
  const s = read(); if (!s) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.refresh_token }) });
      if (!res.ok) { clearSession(); return false; }
      const t = await res.json(); write({ access_token: t.access_token, refresh_token: t.refresh_token, user: t.user }); return true;
    } catch { return false; } finally { setTimeout(() => { refreshing = null; }, 0); }
  })();
  return refreshing;
}

async function raw(method: string, path: string, o: Opts = {}, retry = true): Promise<Response> {
  const qs = o.query ? Object.entries(o.query).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&') : '';
  const headers: Record<string, string> = {};
  const s = read();
  if (o.auth !== false && s) headers.Authorization = `Bearer ${s.access_token}`;
  let body: BodyInit | undefined;
  if (o.form) body = o.form; else if (o.body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(o.body); }
  let res: Response;
  try { res = await fetch(`${BASE}${path}${qs ? `?${qs}` : ''}`, { method, headers, body }); }
  catch { throw new ApiError('We could not reach the server. Please check your internet and try again.', 0); }
  if (res.status === 401 && retry && s && !path.startsWith('/auth/') && await refresh()) return raw(method, path, o, false);
  return res;
}

export async function api<T>(method: string, path: string, o: Opts = {}): Promise<T> {
  const res = await raw(method, path, o);
  let data: any = null;
  try { data = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) throw new ApiError(message(res.status, data), res.status);
  if (data === null) throw new ApiError('The service is not available right now. Please try again later.', res.status);
  return data as T;
}
export const get = <T,>(path: string, query?: Opts['query']) => api<T>('GET', path, { query });
export const post = <T,>(path: string, body?: unknown, auth = true) => api<T>('POST', path, { body, auth });
export const patch = <T,>(path: string, body?: unknown) => api<T>('PATCH', path, { body });
export const upload = <T,>(path: string, form: FormData) => api<T>('POST', path, { form });
export const del = <T,>(path: string) => api<T>('DELETE', path);

/** Downloads a protected file (document or CSV) with the user's token and saves it. */
export async function download(path: string, filename: string, query?: Opts['query']) {
  const res = await raw('GET', path, { query });
  if (!res.ok) { let d: any = null; try { d = await res.json(); } catch { /* */ } throw new ApiError(message(res.status, d), res.status); }
  const blob = await res.blob(); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
/** Opens a protected file in a new tab (e.g. a PDF or image). */
export async function openFile(path: string) {
  const res = await raw('GET', path);
  if (!res.ok) throw new ApiError(message(res.status, null), res.status);
  const url = URL.createObjectURL(await res.blob()); window.open(url, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** Fetches a protected file and returns a temporary browser URL for it (for in-page previews). Call URL.revokeObjectURL when done. */
export async function fileBlobUrl(path: string): Promise<{ url: string; mime: string }> {
  const res = await raw('GET', path);
  if (!res.ok) { let d: any = null; try { d = await res.json(); } catch { /* */ } throw new ApiError(message(res.status, d), res.status); }
  const blob = await res.blob();
  return { url: URL.createObjectURL(blob), mime: blob.type };
}

// ---------- auth ----------
export async function login(email: string, password: string): Promise<User> {
  const t = await post<Session>('/auth/login', { email, password }, false);
  setSession({ access_token: t.access_token, refresh_token: t.refresh_token, user: t.user });
  return t.user;
}
export const signup = (v: { name: string; email: string; mobile: string; password: string }) =>
  post<{ message: string; verification_required?: boolean }>('/auth/signup', v, false);
export const verifyEmail = (token: string) => post<{ message: string }>('/auth/verify-email', { token }, false);
export const forgotPassword = (email: string) => post<{ message: string }>('/auth/forgot-password', { email }, false);
export const resetPassword = (token: string, new_password: string) => post<{ message: string }>('/auth/reset-password', { token, new_password }, false);
export const logout = () => clearSession();
export const refreshMe = async () => { const u = await get<User>('/me'); const s = read(); if (s) write({ ...s, user: u }); return u; };

// ---------- shared types ----------
export type Page<T> = { items: T[]; total: number; page: number; page_size: number };
export type Status = 'Submitted' | 'Assigned' | 'Contacted' | 'Documents Pending' | 'Documents Verified' | 'In Process' | 'Approved' | 'Disbursed' | 'Rejected' | 'Not Reachable / Closed';
export const STATUSES: Status[] = ['Submitted', 'Assigned', 'Contacted', 'Documents Pending', 'Documents Verified', 'In Process', 'Approved', 'Disbursed', 'Rejected', 'Not Reachable / Closed'];
export type DocType = 'pan' | 'aadhaar' | 'salary_slip' | 'bank_statement' | 'other';
export const DOC_LABEL: Record<string, string> = { pan: 'PAN card', aadhaar: 'Aadhaar', salary_slip: 'Salary slip', bank_statement: 'Bank statement (6 months)', other: 'Other document' };
export type LoanTypeApi = { id: number; name: string; slug: string; min_rate: number; min_amount: number; max_amount: number; min_tenure: number; max_tenure: number; fees: string | null; eligibility_text: string; required_docs: string[]; is_active: boolean; sort_order: number };
export type DocumentApi = { id: number; doc_type: DocType; original_name: string; mime: string; size: number; verification: 'pending' | 'verified' | 'rejected'; reject_reason: string | null; uploaded_at: string; verified_at?: string | null };
