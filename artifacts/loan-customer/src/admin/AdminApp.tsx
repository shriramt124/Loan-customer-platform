import { useCallback, useEffect, useState, type ButtonHTMLAttributes, type FormEvent, type ReactNode } from "react";
import { Link, Route, Switch, useLocation, useParams } from "wouter";
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowRight, Banknote, BriefcaseBusiness,
  CalendarDays, Check, CheckCheck, ChevronLeft, ChevronRight, CircleHelp,
  Clock3, FileText, Filter, LayoutDashboard,
  ListChecks, LockKeyhole, LogOut, Menu, MessageSquareText, Search, ShieldCheck, UserCheck,
  UserRound, Users, Wallet, X, AlertTriangle, Plus, Pencil, Power, RotateCcw,
} from "lucide-react";
import { ApiError, DOC_LABEL, TEAM_ROLES, api, download, get, login, logout, openFile, patch, post, type DocumentApi, type LoanTypeApi, type Role as ApiRole, type User } from "../lib/api";
import { useUser } from "../lib/live";
import "./admin.css";

type Status = "Submitted" | "Assigned" | "Contacted" | "Documents Pending" | "Documents Verified" | "In Process" | "Approved" | "Disbursed" | "Rejected" | "Not Reachable / Closed";
type Page<T> = { items: T[]; total: number; page: number; page_size: number };
type LeadRow = { id: number; app_number: string; name: string; mobile: string; email: string; city: string; loan_type: { id: number; name: string; slug: string }; amount: number; status: Status; source: string; assignee: { id: number; name: string } | null; mobile_confirmed: boolean; created_at: string; updated_at: string };
type LeadFull = LeadRow & {
  income: number; existing_emi: number; documents: DocumentApi[];
  notes: { id: number; note: string; author: string | null; created_at: string }[];
  history: { id: number; old_status: Status | null; new_status: Status; reason: string | null; changed_by: string | null; created_at: string }[];
  followups: { id: number; due_at: string; note: string | null; done: boolean; done_at: string | null; overdue: boolean }[];
  allowed_transitions: { status: Status; reason_required: boolean; reopen: boolean }[];
};
type TeamUser = { id: number; name: string; role: string };
type Followup = { id: number; lead_id: number; app_number: string; customer: string; due_at: string; note: string | null; overdue: boolean; owner: string | null; status: string };
type DashboardData = { scope: string; leads_today: number; leads_this_week: number; leads_this_month: number; by_status: Record<string, number>; unassigned_leads: number; pending_followups: number; overdue_followups: number; due_followups: Followup[]; trend: { date: string; count: number }[]; team_totals: { user_id: number; name: string; role: string; assigned: number; open: number; closed: number }[] | null };
type Enquiry = { id: number; type: "contact" | "callback"; name: string; mobile: string | null; email: string | null; message: string | null; handled: boolean; created_at: string };
type StaffUser = { id: number; name: string; email: string; role: ApiRole; is_active: boolean; created_at: string; locked_until: string | null };
type AuditEntry = { id: number; user_name: string | null; action: string; entity: string; entity_id: string | null; ip: string | null; created_at: string };

const STATUSES: Status[] = ["Submitted", "Assigned", "Contacted", "Documents Pending", "Documents Verified", "In Process", "Approved", "Disbursed", "Rejected", "Not Reachable / Closed"];
const CLOSED: string[] = ["Disbursed", "Rejected", "Not Reachable / Closed"];
const SOURCE_LABEL: Record<string, string> = { web: "Web", "walk-in": "Walk-in", phone: "Phone" };
const ROLE_LABEL: Record<string, string> = { admin: "Admin", manager: "Manager", staff: "Staff" };
const DOC_TYPES = ["pan", "aadhaar", "salary_slip", "bank_statement", "other"];

const isoDate = (d: string | Date) => new Date(d).toISOString().slice(0, 10);
const fmtDate = (d: string) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
const fmtTime = (d: string) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
const rupees = (n: number) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;
const slug = (s: string) => s.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/(^-|-$)/g, "");
const errText = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
const toast = (text: string) => window.dispatchEvent(new CustomEvent("ad-toast", { detail: text }));
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return isoDate(d); };

function csvDownload(filename: string, headers: string[], rows: (string | number)[][]) {
  const quote = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  const content = [headers, ...rows].map(row => row.map(quote).join(",")).join("\r\n");
  const blob = new Blob([`﻿${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = filename; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, set] = useState<{ data: T | null; error: string; loading: boolean }>({ data: null, error: "", loading: true });
  const reload = useCallback(() => {
    set(s => ({ ...s, loading: true, error: "" }));
    load().then(d => set({ data: d, error: "", loading: false })).catch(e => set(s => ({ data: s.data, error: errText(e), loading: false })));
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}
const act = async (fn: () => Promise<unknown>, ok: string, then?: () => void) => {
  try { await fn(); toast(ok); then?.(); } catch (e) { toast(errText(e)); }
};

const NAV = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, group: "WORKSPACE", level: 0 },
  { label: "Loan leads", href: "/admin/leads", icon: BriefcaseBusiness, group: "WORKSPACE", level: 0 },
  { label: "Enquiries", href: "/admin/enquiries", icon: MessageSquareText, group: "WORKSPACE", level: 0 },
  { label: "Team workload", href: "/admin/team", icon: Users, group: "WORKSPACE", level: 1 },
  { label: "Reports", href: "/admin/reports", icon: Activity, group: "MANAGE", level: 1 },
  { label: "Staff & access", href: "/admin/users", icon: UserRound, group: "MANAGE", level: 2 },
  { label: "Loan products", href: "/admin/loan-types", icon: Wallet, group: "MANAGE", level: 2 },
  { label: "Audit log", href: "/admin/audit", icon: ShieldCheck, group: "MANAGE", level: 2 },
];
const levelOf = (role: ApiRole) => (role === "admin" ? 2 : role === "manager" ? 1 : 0);

function PageHead({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="ad-page-head"><div><p className="ad-kicker">Chakrapay operations workbench</p><h1>{title}</h1><p className="ad-subtitle">{description}</p></div>{action && <div className="ad-head-actions">{action}</div>}</div>;
}
function Button({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`ad-button ${className}`}>{children}</button>;
}
function Modal({ title, description, onClose, children, footer }: { title: string; description?: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [onClose]);
  return <div className="ad-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="ad-modal" role="dialog" aria-modal="true" aria-label={title}>
      <header className="ad-modal-head"><div><h2>{title}</h2>{description && <p>{description}</p>}</div><button type="button" className="ad-close" onClick={onClose} aria-label="Close dialog" data-testid="button-dialog-close"><X size={17}/></button></header>
      <div className="ad-modal-body">{children}</div>{footer && <footer className="ad-modal-foot">{footer}</footer>}
    </section>
  </div>;
}
function StatusPill({ value }: { value: string }) { return <span className={`ad-status ${slug(value)}`} data-testid={`status-${slug(value)}`}>{value}</span>; }
const Problem = ({ text, retry }: { text: string; retry?: () => void }) => <div className="ad-login-alert" role="alert">{text}{retry && <> <button type="button" className="ad-link" onClick={retry}>Try again</button></>}</div>;
const Loading = () => <div className="ad-empty" role="status">Loading…</div>;

function Toasts() {
  const [text, setText] = useState("");
  useEffect(() => {
    let t: number;
    const on = (e: Event) => { setText(String((e as CustomEvent).detail)); window.clearTimeout(t); t = window.setTimeout(() => setText(""), 2800); };
    window.addEventListener("ad-toast", on); return () => { window.removeEventListener("ad-toast", on); window.clearTimeout(t); };
  }, []);
  return text ? <div className="ad-toast" role="status" data-testid="toast-message"><Check size={16}/>{text}</div> : null;
}

function AdminShell({ children, user }: { children: ReactNode; user: User }) {
  const [path] = useLocation(); const [menu, setMenu] = useState(false);
  const groups = ["WORKSPACE", "MANAGE"]; const lvl = levelOf(user.role);
  const nav = NAV.filter(n => n.level <= lvl);
  const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join("");
  return <div className="sa-admin ad-frame">
    <aside className={`ad-sidebar ${menu ? "open" : ""}`}>
      <Link href="/admin" className="ad-brand" data-testid="link-admin-brand"><span className="ad-brand-mark"><img src="/chakrapay-mark.png" alt="" /></span><span><span className="ad-brand-name">Chakrapay<i>.</i></span><small>Operations desk</small></span></Link>
      {groups.map(group => nav.some(n => n.group === group) && <div key={group}><p className="ad-nav-label">{group}</p><nav className="ad-nav">{nav.filter(n => n.group === group).map(n => {
        const active = n.href === "/admin" ? path === n.href : path === n.href || path.startsWith(`${n.href}/`);
        const Icon = n.icon; return <Link key={n.href} href={n.href} onClick={() => setMenu(false)} className={active ? "active" : ""} data-testid={`link-admin-${slug(n.label)}`}><Icon size={16}/>{n.label}</Link>;
      })}</nav></div>)}
      <div className="ad-sidebar-bottom"><div className="ad-sidebar-demo"><strong><CircleHelp size={13}/> {ROLE_LABEL[user.role].toUpperCase()}</strong>{user.role === "staff" ? "You see the leads assigned to you." : user.role === "manager" ? "You see all leads and your team." : "You have full access."}</div><div className="ad-user-chip"><span className="ad-avatar">{initials}</span><span><strong>{user.name}</strong><small>{ROLE_LABEL[user.role]}</small></span></div><Button className="soft compact" onClick={logout} data-testid="button-admin-logout" style={{ marginTop: 8, width: "100%" }}><LogOut size={13}/> Log out</Button></div>
    </aside>
    <main className="ad-main">
      <header className="ad-topbar"><div className="ad-top-left"><button type="button" className="ad-menu-button" onClick={() => setMenu(!menu)} aria-label="Toggle navigation" data-testid="button-mobile-navigation">{menu ? <X size={18}/> : <Menu size={18}/>}</button><span className="ad-topbar-title">LSP admin workbench</span></div><div className="ad-top-actions"><span className="ad-top-date">{new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(new Date())}</span><Link href="/" className="ad-link">View website</Link></div></header>
      <div className="ad-content">{children}</div>
    </main>
    <nav className="ad-mobile-nav">{nav.slice(0, 4).map(n => { const I = n.icon; return <Link key={n.href} href={n.href} className={(path === n.href || (n.href !== "/admin" && path.startsWith(`${n.href}/`))) ? "active" : ""} data-testid={`mobile-link-${slug(n.label)}`}><I/><span>{n.label.split(" ")[0]}</span></Link>; })}</nav>
    <Toasts/>
  </div>;
}

function Login() {
  const [path, navigate] = useLocation(); const user = useUser();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try { const u = await login(email.trim(), password); if (!TEAM_ROLES.includes(u.role)) { logout(); setErr("This area is only for the Chakrapay team. Customers can log in from the main website."); } else if (path === "/admin/login") navigate("/admin"); }
    catch (x) { setErr(errText(x)); } finally { setBusy(false); }
  };
  return <div className="sa-admin ad-login-wrap"><section className="ad-card ad-login-card">
    <div className="ad-brand"><span className="ad-brand-mark"><img src="/chakrapay-mark.png" alt="" /></span><span><span className="ad-brand-name">Chakrapay<i>.</i></span><small>Operations desk</small></span></div>
    <p className="ad-kicker">Team sign-in</p><h1>Welcome to the desk.</h1><p>Sign in with your work email and password. Staff, managers and admins use the same screen.</p>
    {user && !TEAM_ROLES.includes(user.role) && <div className="ad-login-alert">You are signed in as a customer. <button type="button" className="ad-link" onClick={logout}>Log out</button> to use a team account.</div>}
    {err && <div className="ad-login-alert" role="alert" data-testid="admin-login-error"><LockKeyhole size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }}/>{err}</div>}
    <form className="ad-login-form" onSubmit={submit}><label className="ad-field">Work email<input className="ad-input" type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} data-testid="input-admin-email"/></label><label className="ad-field">Password<input className="ad-input" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} data-testid="input-admin-password"/></label><Button type="submit" disabled={busy} data-testid="button-admin-login">{busy ? "Signing in…" : "Sign in"} <ArrowRight size={15}/></Button></form>
    <p style={{ marginTop: 16, fontSize: 10 }}>Accounts are created by your Admin. After 5 wrong tries an account is locked for 15 minutes.</p><Link href="/" className="ad-link" data-testid="link-back-to-site">Back to the website</Link>
  </section></div>;
}

function Dashboard({ user }: { user: User }) {
  const lvl = levelOf(user.role);
  const { data: d, error, reload } = useLoad(() => get<DashboardData>("/dashboard"), []);
  const recent = useLoad(() => get<Page<LeadRow>>("/leads", { page_size: 5 }), []);
  const unassigned = useLoad(() => (lvl >= 1 ? get<Page<LeadRow>>("/leads", { assigned_to: "unassigned", page_size: 5 }) : Promise.resolve({ items: [], total: 0, page: 1, page_size: 5 } as Page<LeadRow>)), [lvl]);
  const team = useLoad(() => (lvl >= 1 ? get<TeamUser[]>("/team") : Promise.resolve([] as TeamUser[])), [lvl]);
  const products = useLoad(() => get<LoanTypeApi[]>("/loan-types"), []);
  if (error && !d) return <Problem text={error} retry={reload}/>;
  if (!d) return <Loading/>;
  const open = STATUSES.filter(s => !CLOSED.includes(s)).reduce((sum, s) => sum + (d.by_status[s] || 0), 0);
  const counts = STATUSES.map(status => ({ status, count: d.by_status[status] || 0 }));
  const max = Math.max(1, ...counts.map(c => c.count));
  const overdue = d.due_followups.filter(f => f.overdue);
  const trend = d.trend; const trendMax = Math.max(1, ...trend.map(t => t.count));
  const trendPoints = trend.map((t, i) => `${28 + i * 54},${92 - (t.count / trendMax) * 66}`).join(" ");
  const day = (s: string) => new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(new Date(`${s}T12:00:00`));
  const totals = d.team_totals ?? []; const totalsMax = Math.max(1, ...totals.map(t => t.assigned));
  const waiting = unassigned.data?.items ?? [];
  const quick = [{ label: "Review incoming", note: `${d.by_status["Submitted"] || 0} awaiting assignment`, href: "/admin/leads?status=Submitted", icon: ListChecks }, { label: "Check follow-ups", note: `${d.overdue_followups} overdue actions`, href: lvl >= 1 ? "/admin/team" : "/admin/leads", icon: Clock3 }, ...(lvl >= 2 ? [{ label: "Manage products", note: `${(products.data ?? []).length} active products`, href: "/admin/loan-types", icon: Banknote }] : []), ...(lvl >= 1 ? [{ label: "Open reports", note: "Review the funnel", href: "/admin/reports", icon: Activity }] : [])];
  const hour = new Date().getHours();
  const metrics = [{ label: "Leads today", value: d.leads_today, note: "New applications today", icon: BriefcaseBusiness }, { label: "Leads this week", value: d.leads_this_week, note: "Since Monday", icon: Activity }, { label: "Leads this month", value: d.leads_this_month, note: "Calendar month to date", icon: CheckCheck }, ...(lvl >= 1 ? [{ label: "Unassigned leads", value: d.unassigned_leads, note: "Waiting for an owner", icon: UserCheck }] : []), { label: "Pending follow-ups", value: d.pending_followups, note: `${d.overdue_followups} overdue`, icon: Clock3 }, { label: "Open applications", value: open, note: "Excludes closed outcomes", icon: ListChecks }, ...(lvl >= 1 ? [{ label: "Active team", value: totals.length, note: `${totals.reduce((s, t) => s + t.assigned, 0)} assigned leads`, icon: Users }] : [])];
  return <>
    <PageHead title={`${hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"}, ${user.name.split(" ")[0]}`} description="A clear view of incoming applications, open work and the team's next actions." action={<Link href="/admin/leads" className="ad-button" data-testid="link-view-leads">Review loan leads <ArrowRight size={14}/></Link>}/>
    <section className="ad-grid ad-metrics ad-dashboard-metrics">
      {metrics.map(m => { const I = m.icon; return <article className="ad-card ad-metric" key={m.label} data-testid={`metric-${slug(m.label)}`}><div className="ad-metric-top"><span>{m.label}</span><span className="ad-metric-icon"><I size={16}/></span></div><strong>{m.value}</strong><small>{m.note}</small></article>; })}
    </section>
    <section className="ad-grid ad-dashboard-grid">
      <article className="ad-card"><div className="ad-card-title"><div><h2>Applications by status</h2><p>Current counts across all workflow outcomes</p></div></div>
        <div className="ad-funnel">{counts.map(({ status, count }) => <div className="ad-funnel-row" key={status}><span>{status}</span><div className="ad-funnel-track"><div className="ad-funnel-fill" style={{ width: `${Math.max(count ? 8 : 0, count / max * 100)}%` }}/></div><strong>{count}</strong></div>)}</div>
      </article>
      <article className="ad-card"><div className="ad-card-title"><div><h2>Follow-up queue</h2><p>Overdue items, oldest due first</p></div>{lvl >= 1 && <Link href="/admin/team" className="ad-link" data-testid="link-team-queue">Team view</Link>}</div><div className="ad-card-body ad-list">{overdue.length ? overdue.slice(0, 5).map(f => <Link href={`/admin/leads/${f.lead_id}`} className="ad-list-item" key={f.id} data-testid={`row-overdue-${f.id}`}><span className="ad-list-main"><strong>{f.customer}</strong><small>{f.note || "Follow up"} · {fmtDate(f.due_at)}</small></span><span className="ad-small-count">›</span></Link>) : <div className="ad-empty">No overdue actions</div>}</div></article>
    </section>
    <section className="ad-grid ad-dashboard-extra">
      <article className="ad-card ad-card-pad"><div className="ad-section-title"><div><h2>New leads · last 7 days</h2><p>Applications received each day</p></div><Activity size={16}/></div>
        <svg className="ad-trend-chart" viewBox="0 0 370 132" role="img" aria-label={`New leads per day over the last seven days: ${trend.map(t => `${day(t.date)} ${t.count}`).join(", ")}`}>
          <path d="M24 94H352M24 60H352M24 26H352" stroke="#e8e9df" strokeDasharray="3 5"/>
          <polyline points={trendPoints} fill="none" stroke="#3d5c99" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          {trend.map((t, i) => <g key={t.date}><circle cx={28 + i * 54} cy={92 - (t.count / trendMax) * 66} r="4" fill="#f9fbfd" stroke="#3d5c99" strokeWidth="2"/><text x={28 + i * 54} y="119" textAnchor="middle">{day(t.date)}</text></g>)}
        </svg>
      </article>
      {lvl >= 1 && <article className="ad-card"><div className="ad-card-title"><div><h2>Team totals</h2><p>Assigned applications across active staff and managers</p></div><Link href="/admin/team" className="ad-link" data-testid="link-dashboard-team-totals">Open team view</Link></div><div className="ad-team-totals">{totals.map(t => <div className="ad-team-total-row" key={t.user_id}><span>{t.name}<small>{ROLE_LABEL[t.role]}</small></span><div className="ad-team-total-track"><i style={{ width: `${Math.max(4, t.assigned / totalsMax * 100)}%` }}/></div><strong>{t.assigned}</strong></div>)}</div></article>}
    </section>
    {lvl >= 1 && <section className="ad-card" style={{ margin: "16px 0" }}><div className="ad-card-title"><div><h2>Needs an owner</h2><p>Unassigned open leads — assign without leaving the dashboard</p></div><span className="ad-demo-pill">{unassigned.data?.total ?? 0} WAITING</span></div><div className="ad-card-body">{waiting.length ? waiting.map(l => <div className="ad-assign-row" key={l.id}><Link href={`/admin/leads/${l.id}`}><strong>{l.name}</strong><small>{l.app_number} · {l.loan_type.name} · {rupees(l.amount)}</small></Link><select className="ad-select" value="" aria-label={`Assign ${l.name}`} onChange={e => { const id = Number(e.target.value); const name = (team.data ?? []).find(u => u.id === id)?.name ?? ""; if (id) void act(() => post(`/leads/${l.id}/assign`, { assigned_to: id }), `${l.app_number} assigned to ${name}.`, () => { unassigned.reload(); reload(); recent.reload(); }); }} data-testid={`select-quick-assign-${l.id}`}><option value="">Unassigned</option>{(team.data ?? []).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>) : <div className="ad-empty">Every open lead has an owner.</div>}</div></section>}
    <section className="ad-grid ad-quick-grid">{quick.map(item => { const I = item.icon; return <Link className="ad-card ad-quick" href={item.href} key={item.label} data-testid={`quick-${slug(item.label)}`}><span className="ad-quick-icon"><I size={17}/></span><span><strong>{item.label}</strong><small>{item.note}</small></span><ArrowRight size={14}/></Link>; })}</section>
    <section className="ad-card" style={{ marginTop: 16 }}><div className="ad-card-title"><div><h2>Recently added leads</h2><p>The newest applications</p></div><Link href="/admin/leads" className="ad-link" data-testid="link-all-recent-leads">All leads <ArrowRight size={13}/></Link></div><div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Applicant</th><th>Loan product</th><th>City</th><th>Stage</th><th>Amount</th></tr></thead><tbody>{(recent.data?.items ?? []).map(l => <tr key={l.id}><td data-label="Applicant"><Link href={`/admin/leads/${l.id}`} className="ad-cell-primary" data-testid={`link-lead-${l.app_number}`}>{l.name}<small>{l.app_number} · {fmtDate(l.created_at)}</small></Link></td><td data-label="Loan product">{l.loan_type.name}</td><td data-label="City">{l.city}</td><td data-label="Stage"><StatusPill value={l.status}/></td><td data-label="Amount">{rupees(l.amount)}</td></tr>)}</tbody></table>{recent.data && !recent.data.items.length && <div className="ad-empty">No applications yet.</div>}</div></section>
  </>;
}

type SortKey = "name" | "amount" | "created" | "status";
const SORT_API: Record<SortKey, string> = { name: "name", amount: "amount", created: "created_at", status: "status" };

function LeadsPage({ user }: { user: User }) {
  const lvl = levelOf(user.role);
  const [query, setQuery] = useState(""); const [status, setStatus] = useState(() => new URLSearchParams(window.location.search).get("status") || "All stages"); const [type, setType] = useState("All products"); const [city, setCity] = useState("All cities"); const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [staff, setStaff] = useState("All staff"); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const blank = { name: "", phone: "", email: "", type: "", amount: "250000", income: "50000", existingEmi: "0", city: "", source: "walk-in", consent: false };
  const [form, setForm] = useState(blank);
  const [cities, setCities] = useState<string[]>([]);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "created", dir: -1 });
  const pageSize = 10;
  const products = useLoad(() => get<LoanTypeApi[]>("/loan-types"), []);
  const team = useLoad(() => (lvl >= 1 ? get<TeamUser[]>("/team") : Promise.resolve([] as TeamUser[])), [lvl]);
  const typeId = products.data?.find(p => p.name === type)?.id;
  const staffId = staff === "Unassigned" ? "unassigned" : (team.data ?? []).find(u => u.name === staff)?.id;
  const leads = useLoad(() => get<Page<LeadRow>>("/leads", { q: query.trim() || undefined, status: status === "All stages" ? undefined : status, loan_type_id: typeId, city: city === "All cities" ? undefined : city, assigned_to: staffId, date_from: from || undefined, date_to: to || undefined, sort: SORT_API[sort.key], order: sort.dir === 1 ? "asc" : "desc", page, page_size: pageSize }), [query, status, typeId, city, staffId, from, to, sort, page]);
  useEffect(() => { const rows = leads.data?.items ?? []; if (rows.length) setCities(c => [...new Set([...c, ...rows.map(r => r.city)])].sort()); }, [leads.data]);
  const toggleSort = (key: SortKey) => { setSort(s => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "name" || key === "status" ? 1 : -1 })); setPage(1); };
  const filtersActive = !!query || status !== "All stages" || type !== "All products" || city !== "All cities" || staff !== "All staff" || !!from || !!to;
  const clearFilters = () => { setQuery(""); setStatus("All stages"); setType("All products"); setCity("All cities"); setStaff("All staff"); setFrom(""); setTo(""); setPage(1); };
  const visible = leads.data?.items ?? []; const total = leads.data?.total ?? 0;
  const exportLeads = () => {
    if (lvl >= 1) { void act(() => download("/reports/export.csv", "chakrapay-leads.csv", { kind: "leads", date_from: from || undefined, date_to: to || undefined }), "Leads exported to CSV."); return; }
    csvDownload("chakrapay-leads.csv", ["Application", "Applicant", "Loan type", "City", "Source", "Status", "Staff", "Amount (INR)", "Created"], visible.map(l => [l.app_number, l.name, l.loan_type.name, l.city, SOURCE_LABEL[l.source] ?? l.source, l.status, l.assignee?.name ?? "Unassigned", l.amount, isoDate(l.created_at)])); toast(`${visible.length} leads exported to CSV.`);
  };
  const sortTh = (key: SortKey, label: string) => <th className="ad-th-sort" aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : undefined} onClick={() => toggleSort(key)} data-testid={`sort-${key}`}>{label}{sort.key === key ? (sort.dir === 1 ? " ↑" : " ↓") : ""}</th>;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const add = async (e: FormEvent) => {
    e.preventDefault();
    const lt = products.data?.find(p => p.name === (form.type || products.data?.[0]?.name));
    await act(() => post("/leads", { name: form.name.trim(), mobile: form.phone.trim(), email: form.email.trim(), city: form.city.trim(), loan_type_id: lt?.id, amount: Number(form.amount), income: Number(form.income), existing_emi: Number(form.existingEmi || 0), source: form.source, consent: form.consent }), "Lead added to the queue.", () => { setAdding(false); setForm(blank); setPage(1); leads.reload(); });
  };
  return <>
    <PageHead title="Loan leads" description="Find an application, check its stage and move the next action forward." action={<><Button className="soft" onClick={exportLeads} data-testid="button-export-leads"><ArrowDownToLine size={14}/> Export CSV</Button><Button onClick={() => { setForm({ ...blank, type: products.data?.[0]?.name ?? "" }); setAdding(true); }} data-testid="button-add-lead"><Plus size={15}/> Add lead</Button></>}/>
    <div className="ad-toolbar">
      <label className="ad-search"><Search size={15}/><input className="ad-input" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Search name, ID, phone or email" aria-label="Search leads" data-testid="input-search-leads"/></label>
      <select className="ad-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status" data-testid="select-lead-status"><option>All stages</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
      <select className="ad-select" value={type} onChange={e => { setType(e.target.value); setPage(1); }} aria-label="Filter by product" data-testid="select-lead-product"><option>All products</option>{(products.data ?? []).map(t => <option key={t.id}>{t.name}</option>)}</select>
      <select className="ad-select" value={city} onChange={e => { setCity(e.target.value); setPage(1); }} aria-label="Filter by city" data-testid="select-lead-city"><option>All cities</option>{cities.map(c => <option key={c}>{c}</option>)}</select>
      {lvl >= 1 && <select className="ad-select" value={staff} onChange={e => { setStaff(e.target.value); setPage(1); }} aria-label="Filter by assigned staff" data-testid="select-lead-staff"><option>All staff</option><option>Unassigned</option>{(team.data ?? []).map(u => <option key={u.id}>{u.name}</option>)}</select>}
      <label className="ad-field">From<input className="ad-input" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} aria-label="Filter leads from date" data-testid="input-lead-date-from"/></label>
      <label className="ad-field">To<input className="ad-input" type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} aria-label="Filter leads to date" data-testid="input-lead-date-to"/></label>
      <span className="ad-demo-pill"><Filter size={12}/>{total} records</span>{filtersActive && <Button className="text compact" onClick={clearFilters} data-testid="button-clear-filters"><X size={12}/> Clear filters</Button>}
    </div>
    {leads.error && <Problem text={leads.error} retry={leads.reload}/>}
    <section className="ad-card"><div className="ad-table-wrap"><table className="ad-table"><thead><tr>{sortTh("name", "Applicant")}<th>Loan product</th><th>Location / source</th>{sortTh("status", "Stage")}<th>Assigned to</th>{sortTh("amount", "Requested")}{sortTh("created", "Created")}</tr></thead><tbody>{visible.map(l => <tr key={l.id} data-testid={`row-lead-${l.app_number}`}><td data-label="Applicant"><Link href={`/admin/leads/${l.id}`} className="ad-cell-primary" data-testid={`link-lead-${l.app_number}`}>{l.name}<small>{l.app_number} · {l.mobile}</small></Link></td><td data-label="Loan product">{l.loan_type.name}</td><td data-label="Location / source">{l.city}<small>{SOURCE_LABEL[l.source] ?? l.source}</small></td><td data-label="Stage"><StatusPill value={l.status}/></td><td data-label="Assigned to">{l.assignee?.name ?? "Unassigned"}</td><td data-label="Requested">{rupees(l.amount)}</td><td data-label="Created">{fmtDate(l.created_at)}</td></tr>)}</tbody></table>{leads.loading && !leads.data ? <Loading/> : visible.length === 0 && <div className="ad-empty"><Search size={20}/><strong>No matching applications</strong><p>Try changing your search or filters.</p></div>}</div>
      <div className="ad-pagination"><span>Showing {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} of {total} leads</span><div className="ad-page-buttons"><button type="button" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} aria-label="Previous page" data-testid="button-page-previous"><ChevronLeft size={15}/></button><button className="current" type="button" data-testid="text-current-page">{page}</button><button type="button" onClick={() => setPage(Math.min(pageCount, page + 1))} disabled={page >= pageCount} aria-label="Next page" data-testid="button-page-next"><ChevronRight size={15}/></button></div></div>
    </section>
    {adding && <Modal title="Add a lead" description="Enter a walk-in or phone enquiry. It joins the same queue as website applications." onClose={() => setAdding(false)} footer={<><Button className="soft" onClick={() => setAdding(false)} data-testid="button-cancel-add-lead">Cancel</Button><Button type="submit" form="add-lead-form" data-testid="button-save-lead">Add to queue</Button></>}>
      <form id="add-lead-form" onSubmit={add} style={{ display: "contents" }}><label className="ad-field">Applicant name<input className="ad-input" required minLength={2} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="input-new-lead-name"/></label><div className="ad-grid" style={{ gridTemplateColumns: "1fr 1fr" }}><label className="ad-field">Mobile number<input className="ad-input" required inputMode="numeric" maxLength={10} pattern="[6-9][0-9]{9}" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="10-digit mobile number" data-testid="input-new-lead-phone"/></label><label className="ad-field">Email<input className="ad-input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" data-testid="input-new-lead-email"/></label></div><div className="ad-grid" style={{ gridTemplateColumns: "1fr 1fr" }}><label className="ad-field">Loan product<select className="ad-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} data-testid="select-new-lead-product">{(products.data ?? []).map(t => <option key={t.id}>{t.name}</option>)}</select></label><label className="ad-field">Requested amount (₹)<input className="ad-input" type="number" min="1000" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} data-testid="input-new-lead-amount"/></label></div><div className="ad-grid" style={{ gridTemplateColumns: "1fr 1fr" }}><label className="ad-field">Monthly income (₹)<input className="ad-input" type="number" min="1" required value={form.income} onChange={e => setForm({ ...form, income: e.target.value })} data-testid="input-new-lead-income"/></label><label className="ad-field">Existing EMI (₹)<input className="ad-input" type="number" min="0" value={form.existingEmi} onChange={e => setForm({ ...form, existingEmi: e.target.value })} data-testid="input-new-lead-existing-emi"/></label></div><div className="ad-grid" style={{ gridTemplateColumns: "1fr 1fr" }}><label className="ad-field">City<input className="ad-input" required minLength={2} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} data-testid="select-new-lead-city"/></label><label className="ad-field">Source<select className="ad-select" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} data-testid="select-new-lead-source"><option value="walk-in">Walk-in</option><option value="phone">Phone</option></select></label></div><label className="ad-field" style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}><input type="checkbox" required checked={form.consent} onChange={e => setForm({ ...form, consent: e.target.checked })} data-testid="input-new-lead-consent"/><span>The customer agreed to share these details with the partner NBFC.</span></label></form>
    </Modal>}
  </>;
}

function LeadDetail({ user }: { user: User }) {
  const lvl = levelOf(user.role);
  const { id = "" } = useParams<{ id: string }>();
  const { data: lead, error, reload } = useLoad(() => get<LeadFull>(`/leads/${Number(id)}`), [id]);
  const team = useLoad(() => (lvl >= 1 ? get<TeamUser[]>("/team") : Promise.resolve([] as TeamUser[])), [lvl]);
  const [targetStatus, setTargetStatus] = useState<Status | "">("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [follow, setFollow] = useState({ due: isoDate(new Date(Date.now() + 86400000)), time: "10:00", note: "" });
  const [rejectDoc, setRejectDoc] = useState<DocumentApi | null>(null);
  const [docReason, setDocReason] = useState("");
  if (!lead) return error ? <div className="ad-not-found"><FileText size={28}/><h1>Application not found</h1><p>{error}</p><Link href="/admin/leads" className="ad-button" data-testid="link-return-leads"><ArrowLeft size={14}/> Back to leads</Link></div> : <Loading/>;
  const choice = lead.allowed_transitions.find(t => t.status === targetStatus);
  const statusChoices = lead.allowed_transitions.map(t => t.status);
  const assigned = lead.assignee?.name ?? "Unassigned";
  const docName = (d: DocumentApi) => DOC_LABEL[d.doc_type] ?? d.doc_type;
  const docState = (d: DocumentApi) => (d.verification === "verified" ? "Verified" : d.verification === "rejected" ? "Rejected" : "Pending");
  const changeStatus = async () => {
    if (!targetStatus) return;
    if (choice?.reason_required && !reason.trim()) { toast("A reason is required for this status."); return; }
    await act(() => api("PATCH", `/leads/${lead.id}/status`, { body: { status: targetStatus, reason: reason.trim() || undefined } }), `${lead.app_number} moved to ${targetStatus}.`, () => { setTargetStatus(""); setReason(""); reload(); });
  };
  const addNote = async (e: FormEvent) => { e.preventDefault(); await act(() => post(`/leads/${lead.id}/notes`, { note: note.trim() }), "Note added to the application.", () => { setNote(""); reload(); }); };
  const addFollow = async (e: FormEvent) => { e.preventDefault(); const due = new Date(`${follow.due}T${follow.time}:00`).toISOString(); await act(() => post(`/leads/${lead.id}/followups`, { due_at: due, note: follow.note.trim() }), "Follow-up added to the queue.", () => { setFollow({ due: isoDate(new Date(Date.now() + 86400000)), time: "10:00", note: "" }); reload(); }); };
  const resolveDoc = (doc: DocumentApi, verification: "verified" | "rejected", why = "") => act(() => patch(`/documents/${doc.id}/verify`, { verification, reject_reason: why || undefined }), `${docName(doc)} marked ${verification}.`, () => { setRejectDoc(null); setDocReason(""); reload(); });
  const assign = (userId: number) => { if (userId) void act(() => post(`/leads/${lead.id}/assign`, { assigned_to: userId }), `Assigned to ${(team.data ?? []).find(u => u.id === userId)?.name}.`, reload); };
  const changeFollowState = (f: LeadFull["followups"][number]) => act(() => patch(`/leads/${lead.id}/followups/${f.id}`, { done: !f.done }), f.done ? "Follow-up reopened." : "Follow-up marked complete.", reload);
  return <>
    <div style={{ marginBottom: 15 }}><Link href="/admin/leads" className="ad-link" data-testid="link-back-to-leads"><ArrowLeft size={13} style={{ verticalAlign: "middle" }}/> All loan leads</Link></div>
    <PageHead title={lead.name} description={`${lead.app_number} · Added ${fmtDate(lead.created_at)} · ${lead.city}`} action={<><StatusPill value={lead.status}/><Button className="soft" onClick={() => { setTargetStatus(statusChoices[0] || ""); setReason(""); }} disabled={!statusChoices.length} data-testid="button-change-status"><RotateCcw size={14}/> Change stage</Button></>}/>
    <div className="ad-detail-grid">
      <div className="ad-detail-stack">
        <section className="ad-card ad-card-pad"><div className="ad-section-title"><div><h2>Application & customer</h2><p>Details the customer submitted</p></div></div>
          <div className="ad-info-grid">{[["Loan product", lead.loan_type.name], ["Requested amount", rupees(lead.amount)], ["Monthly income", rupees(lead.income)], ["Existing EMI", rupees(lead.existing_emi)], ["City", lead.city], ["Source", SOURCE_LABEL[lead.source] ?? lead.source], ["Phone", lead.mobile], ["Email", lead.email], ["Created", fmtDate(lead.created_at)], ["Last touched", fmtTime(lead.updated_at)]].map(([label, value]) => <div key={label}><span className="ad-info-label">{label}</span><span className="ad-info-value" data-testid={`value-${slug(label)}`}>{value}</span></div>)}</div>
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #e7eef7", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}><span><span className="ad-info-label">Mobile number confirmed</span><strong className="ad-info-value">{lead.mobile_confirmed ? "Confirmed" : "Not confirmed"}</strong></span><Button className="soft compact" onClick={() => act(() => patch(`/leads/${lead.id}/mobile-confirmed`, { confirmed: !lead.mobile_confirmed }), lead.mobile_confirmed ? "Mobile marked unconfirmed." : "Mobile marked confirmed.", reload)} data-testid="button-toggle-mobile-confirmed">{lead.mobile_confirmed ? "Mark unconfirmed" : "Confirm mobile"}</Button></div>
        </section>
        <section className="ad-card ad-card-pad"><div className="ad-section-title"><div><h2>Documents</h2><p>Open each file the customer uploaded and mark it verified or rejected</p></div><span className="ad-demo-pill">{lead.documents.filter(d => d.verification === "verified").length}/{lead.documents.length} verified</span></div>
          {lead.documents.map(doc => <div className="ad-doc-row" key={doc.id} data-testid={`document-${doc.id}`}><div className="ad-doc-name"><span className="ad-metric-icon"><FileText size={15}/></span><span><strong>{docName(doc)}</strong><small>{doc.reject_reason ? `Reason: ${doc.reject_reason}` : `${doc.original_name} · ${Math.max(1, Math.round(doc.size / 1024))} KB`}</small></span></div><StatusPill value={docState(doc)}/><div className="ad-doc-actions"><Button className="soft compact" onClick={() => openFile(`/documents/${doc.id}/file`).catch(x => toast(errText(x)))} data-testid={`button-open-document-${doc.id}`}><FileText size={13}/> Open</Button>{doc.verification !== "verified" && <Button className="soft compact" onClick={() => resolveDoc(doc, "verified")} data-testid={`button-verify-document-${doc.id}`}><Check size={13}/> Verify</Button>}{doc.verification !== "rejected" && <Button className="text compact" onClick={() => { setRejectDoc(doc); setDocReason(""); }} data-testid={`button-reject-document-${doc.id}`}>Reject</Button>}</div></div>)}
          {!lead.documents.length && <div className="ad-empty">The customer has not uploaded any documents yet.</div>}
        </section>
        <section className="ad-card ad-card-pad"><div className="ad-section-title"><div><h2>Internal notes</h2><p>Visible to the team only</p></div></div>
          <form onSubmit={addNote}><label className="ad-field">Add a note<textarea className="ad-textarea" value={note} onChange={e => setNote(e.target.value)} placeholder="Capture a helpful next step…" required data-testid="input-lead-note"/></label><Button type="submit" style={{ marginTop: 9 }} data-testid="button-add-note"><Plus size={14}/> Add note</Button></form>
          <div className="ad-timeline" style={{ marginTop: 17 }}>{lead.notes.length ? lead.notes.map(n => <div className="ad-timeline-item" key={n.id}><i className="ad-timeline-dot"/><div className="ad-timeline-copy"><strong>{n.author ?? "Team"}</strong><p>{n.note}</p><small>{fmtTime(n.created_at)}</small></div></div>) : <div className="ad-empty">No notes have been added to this application.</div>}</div>
        </section>
        <section className="ad-card ad-card-pad"><div className="ad-section-title"><div><h2>Status history</h2><p>Every stage update is recorded in the audit log</p></div></div>
          <div className="ad-timeline">{[...lead.history].reverse().map((h, i) => <div className="ad-timeline-item" key={h.id} data-testid={`history-entry-${i}`}><i className="ad-timeline-dot"/><div className="ad-timeline-copy"><strong>{h.old_status ? `${h.old_status} → ${h.new_status}` : h.new_status}</strong><p>{h.reason || "—"} · {h.changed_by ?? "System"}</p><small>{fmtTime(h.created_at)}</small></div></div>)}</div>
        </section>
      </div>
      <aside className="ad-detail-stack">
        <section className="ad-card ad-card-pad"><div className="ad-section-title"><div><h2>Ownership</h2><p>Coordinate the next staff action</p></div></div>{lvl >= 1 && <label className="ad-field">Assigned staff<select className="ad-select" value={lead.assignee?.id ?? ""} onChange={e => assign(Number(e.target.value))} data-testid="select-lead-assignee"><option value="" disabled>Unassigned</option>{(team.data ?? []).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>}<div className="ad-info-label" style={{ marginTop: 14 }}>Current owner</div><div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 7 }}><span className="ad-avatar">{assigned === "Unassigned" ? "—" : assigned.split(" ").map(s => s[0]).join("")}</span><div><strong style={{ fontSize: 12 }}>{assigned}</strong><small style={{ display: "block", color: "#89958b", fontSize: 10 }}>Last touched {fmtDate(lead.updated_at)}</small></div></div></section>
        <section className="ad-card ad-card-pad"><div className="ad-section-title"><div><h2>Follow-ups</h2><p>Schedule and close the loop</p></div></div>
          <form onSubmit={addFollow} style={{ display: "grid", gap: 9 }}><div className="ad-grid" style={{ gridTemplateColumns: "1fr 1fr" }}><label className="ad-field">Due date<input className="ad-input" type="date" value={follow.due} onChange={e => setFollow({ ...follow, due: e.target.value })} required data-testid="input-followup-date"/></label><label className="ad-field">Due time<input className="ad-input" type="time" value={follow.time} onChange={e => setFollow({ ...follow, time: e.target.value })} required data-testid="input-followup-time"/></label></div><label className="ad-field">Next action<input className="ad-input" value={follow.note} onChange={e => setFollow({ ...follow, note: e.target.value })} placeholder="e.g. Confirm callback window" required data-testid="input-followup-note"/></label><Button className="soft" type="submit" data-testid="button-add-followup"><CalendarDays size={14}/> Schedule follow-up</Button></form>
          <div style={{ marginTop: 13 }}>{lead.followups.length ? lead.followups.map(f => <div className="ad-follow-card" key={f.id}><span><strong>{f.note || "Follow up"}</strong><small>{fmtTime(f.due_at)} · {f.done ? "Completed" : f.overdue ? "Overdue" : "Upcoming"}</small></span><Button className="text compact" onClick={() => changeFollowState(f)} data-testid={`button-followup-${f.id}`}>{f.done ? "Reopen" : "Done"}</Button></div>) : <div className="ad-empty">No follow-ups scheduled.</div>}</div>
        </section>
        <section className="ad-card ad-card-pad"><div className="ad-section-title"><div><h2>Stage guidance</h2><p>Normal sequence is one stage at a time</p></div></div><p style={{ margin: 0, color: "#596e98", fontSize: 11, lineHeight: 1.65 }}>Submitted → Assigned → Contacted → Documents Pending → Documents Verified → In Process → Approved → Disbursed. Rejected and Not Reachable / Closed are available from any open stage and require a reason. Only an Admin can reopen a closed record.</p></section>
      </aside>
    </div>
    {targetStatus && <Modal title={`Move application to ${targetStatus}`} description="Status changes are added to history and the audit trail." onClose={() => { setTargetStatus(""); setReason(""); }} footer={<><Button className="soft" onClick={() => setTargetStatus("")} data-testid="button-cancel-status">Cancel</Button><Button className={choice?.reason_required ? "danger" : ""} onClick={changeStatus} data-testid="button-confirm-status">Confirm stage change</Button></>}>
      <label className="ad-field">Next valid stage<select className="ad-select" value={targetStatus} onChange={e => { setTargetStatus(e.target.value as Status); setReason(""); }} data-testid="select-next-status">{statusChoices.map(s => <option key={s}>{s}</option>)}</select></label>
      <div className="ad-login-alert"><AlertTriangle size={14} style={{ display: "inline", marginRight: 6 }}/>Current: <strong>{lead.status}</strong> · Next: <strong>{targetStatus}</strong></div>
      {choice?.reason_required && <label className="ad-field">Reason required<textarea className="ad-textarea" value={reason} onChange={e => setReason(e.target.value)} required placeholder="Record the reason for this outcome" data-testid="input-status-reason"/></label>}
      {choice?.reopen && <p style={{ color: "#6e7c73", fontSize: 12 }}>Reopen this record to the Submitted stage. This action is only available to an Admin.</p>}
    </Modal>}
    {rejectDoc && <Modal title={`Reject ${docName(rejectDoc)}`} description="A clear reason helps the customer upload the right file." onClose={() => setRejectDoc(null)} footer={<><Button className="soft" onClick={() => setRejectDoc(null)} data-testid="button-cancel-document-rejection">Cancel</Button><Button className="danger" disabled={!docReason.trim()} onClick={() => resolveDoc(rejectDoc, "rejected", docReason.trim())} data-testid="button-confirm-document-rejection">Reject document</Button></>}><label className="ad-field">Rejection reason<textarea className="ad-textarea" required value={docReason} onChange={e => setDocReason(e.target.value)} placeholder="Explain what needs to be corrected" data-testid="input-document-rejection-reason"/></label></Modal>}
  </>;
}

function EnquiriesPage() {
  const [filter, setFilter] = useState("Open");
  const { data, error, reload } = useLoad(() => get<Page<Enquiry>>("/enquiries", { page_size: 100 }), []);
  const all = data?.items ?? [];
  const rows = all.filter(e => filter === "All" || (filter === "Open" ? !e.handled : e.handled));
  const handle = (item: Enquiry) => act(() => patch(`/enquiries/${item.id}`, { handled: !item.handled }), item.handled ? "Enquiry returned to the open queue." : "Enquiry marked handled.", reload);
  return <><PageHead title="Enquiries" description="Contact requests and callback items, ready for a staff response."/><div className="ad-toolbar">{["Open", "Handled", "All"].map(f => <Button className={filter === f ? "" : "soft"} key={f} onClick={() => setFilter(f)} data-testid={`tab-enquiries-${slug(f)}`}>{f} <span style={{ opacity: .72 }}>({all.filter(e => f === "All" || e.handled === (f === "Handled")).length})</span></Button>)}</div>
    {error && <Problem text={error} retry={reload}/>}
     <section className="ad-card"><div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Request</th><th>Type</th><th>Contact</th><th>Message</th><th>Received</th><th>State</th><th>Action</th></tr></thead><tbody>{rows.map(e => <tr key={e.id} data-testid={`row-enquiry-${e.id}`}><td data-label="Request"><strong>EN-{e.id}</strong><small>{e.name}</small></td><td data-label="Type">{e.type === "callback" ? "Callback" : "Contact"}</td><td data-label="Contact">{e.mobile || "—"}<small>{e.email}</small></td><td data-label="Message">{e.message || "—"}</td><td data-label="Received">{fmtTime(e.created_at)}</td><td data-label="State"><StatusPill value={e.handled ? "Handled" : "Pending"}/></td><td data-label="Action"><Button className={e.handled ? "soft compact" : "compact"} onClick={() => handle(e)} data-testid={`button-handle-enquiry-${e.id}`}>{e.handled ? "Reopen" : "Mark handled"}</Button></td></tr>)}</tbody></table>{!data ? <Loading/> : rows.length === 0 && <div className="ad-empty"><MessageSquareText size={22}/><strong>Nothing in this view</strong><p>New website messages and call-back requests appear here.</p></div>}</div></section>
  </>;
}

type Monitoring = { members: { user_id: number; name: string; role: string; assigned: number; open: number; closed: number; untouched: number; overdue_followups: number; oldest_untouched: { id: number; app_number: string; customer: string; created_at: string }[] }[]; unassigned: number };

function TeamPage() {
  const mon = useLoad(() => get<Monitoring>("/monitoring"), []);
  const dash = useLoad(() => get<DashboardData>("/dashboard"), []);
  if (mon.error && !mon.data) return <Problem text={mon.error} retry={mon.reload}/>;
  if (!mon.data) return <Loading/>;
  const members = mon.data.members;
  const overdue = (dash.data?.due_followups ?? []).filter(f => f.overdue);
  return <><PageHead title="Team workload" description="Balance active applications, stale first contacts and overdue commitments." action={<Link href="/admin/users" className="ad-button soft" data-testid="link-manage-staff">Manage staff <Users size={14}/></Link>}/>
    <div className="ad-grid ad-metrics">{[{ label: "Active staff", value: members.length, note: "Staff and managers", icon: Users }, { label: "Open applications", value: members.reduce((s, m) => s + m.open, 0), note: "Across the team", icon: BriefcaseBusiness }, { label: "Oldest untouched", value: members.reduce((s, m) => s + m.untouched, 0), note: "Awaiting a first touch", icon: Clock3 }, { label: "Overdue follow-ups", value: dash.data?.overdue_followups ?? 0, note: "Actions past due", icon: AlertTriangle }].map(m => { const I = m.icon; return <div className="ad-card ad-metric" key={m.label}><div className="ad-metric-top"><span>{m.label}</span><span className="ad-metric-icon"><I size={16}/></span></div><strong>{m.value}</strong><small>{m.note}</small></div>; })}</div>
    <section className="ad-card"><div className="ad-card-title"><div><h2>Staff queue health</h2><p>Open workload and the oldest untouched leads</p></div></div><div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Staff member</th><th>Role</th><th>Open leads</th><th>Untouched</th><th>Overdue follow-ups</th><th>Oldest lead</th></tr></thead><tbody>{members.map(w => <tr key={w.user_id} data-testid={`row-workload-${w.user_id}`}><td data-label="Staff member"><strong>{w.name}</strong></td><td data-label="Role">{ROLE_LABEL[w.role] ?? w.role}</td><td data-label="Open leads"><span className="ad-cell-primary">{w.open}</span></td><td data-label="Untouched">{w.untouched}</td><td data-label="Overdue follow-ups"><StatusPill value={w.overdue_followups ? "Overdue" : "Clear"}/></td><td data-label="Oldest lead">{w.oldest_untouched[0] ? <Link href={`/admin/leads/${w.oldest_untouched[0].id}`} className="ad-link">{w.oldest_untouched[0].customer}<small>{fmtDate(w.oldest_untouched[0].created_at)}</small></Link> : "—"}</td></tr>)}</tbody></table>{!members.length && <div className="ad-empty">No active staff yet. Add team members under Staff & access.</div>}</div></section>
    <section className="ad-card" style={{ marginTop: 15 }}><div className="ad-card-title"><div><h2>Overdue follow-ups</h2><p>Items past their due date that still need a disposition</p></div></div><div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Lead</th><th>Owner</th><th>Action</th><th>Due</th><th>Stage</th></tr></thead><tbody>{overdue.map(f => <tr key={f.id}><td data-label="Lead"><Link className="ad-cell-primary" href={`/admin/leads/${f.lead_id}`} data-testid={`link-overdue-lead-${f.id}`}>{f.customer}<small>{f.app_number}</small></Link></td><td data-label="Owner">{f.owner ?? "Unassigned"}</td><td data-label="Action">{f.note || "Follow up"}</td><td data-label="Due">{fmtTime(f.due_at)}</td><td data-label="Stage"><StatusPill value="Overdue"/></td></tr>)}</tbody></table>{!overdue.length && <div className="ad-empty">No overdue follow-ups.</div>}</div></section>
  </>;
}

type Summary = { total_leads: number; by_loan_type: { key: string; count: number }[]; by_city: { key: string; count: number }[]; by_source: { key: string; count: number }[]; by_status: { key: string; count: number }[]; by_staff: { key: string; count: number }[]; conversion: { disbursed: number; total: number; rate_percent: number }; avg_hours_new_to_contacted: number | null; contacted_leads: number };
type ConvRow = { id: number | null; name: string; leads: number; disbursed: number; conversion_rate_percent: number };

function ReportsPage() {
  const [from, setFrom] = useState(daysAgo(30)); const [to, setTo] = useState(isoDate(new Date()));
  const q = { date_from: from || undefined, date_to: to || undefined };
  const sum = useLoad(() => get<Summary>("/reports/summary", q), [from, to]);
  const staffRows = useLoad(() => get<ConvRow[]>("/reports/by-staff", q), [from, to]);
  const typeRows = useLoad(() => get<ConvRow[]>("/reports/by-loan-type", q), [from, to]);
  const s = sum.data;
  const groups = s ? [{ name: "Loan product", data: s.by_loan_type }, { name: "City", data: s.by_city }, { name: "Source", data: s.by_source.map(x => ({ ...x, key: SOURCE_LABEL[x.key] ?? x.key })) }, { name: "Status", data: s.by_status }, { name: "Assigned staff", data: s.by_staff }] : [];
  const conversionGroups = [{ name: "By staff", rows: staffRows.data ?? [] }, { name: "By loan type", rows: typeRows.data ?? [] }];
  const exportCsv = () => act(() => download("/reports/export.csv", "chakrapay-report.csv", { kind: "leads", ...q }), "Report downloaded; the export is noted in the audit log.");
  return <><PageHead title="Reports" description="Date-filtered funnel, source and workload breakdowns." action={<Button className="soft" onClick={exportCsv} data-testid="button-export-report"><ArrowDownToLine size={14}/> Download CSV</Button>}/>
    <div className="ad-toolbar"><label className="ad-field">From<input className="ad-input" type="date" value={from} onChange={e => setFrom(e.target.value)} data-testid="input-report-from"/></label><label className="ad-field">To<input className="ad-input" type="date" value={to} onChange={e => setTo(e.target.value)} data-testid="input-report-to"/></label><span className="ad-demo-pill">{s?.total_leads ?? 0} leads in range</span></div>
    {sum.error && <Problem text={sum.error} retry={sum.reload}/>}
    {!s ? <Loading/> : <>
    <div className="ad-report-summary"><article className="ad-card"><small>Applications</small><strong data-testid="report-total">{s.total_leads}</strong></article><article className="ad-card"><small>Disbursed conversion</small><strong data-testid="report-conversion">{s.conversion.rate_percent.toFixed(1)}%</strong></article><article className="ad-card"><small>Average time from Submitted to Contacted</small><strong data-testid="report-time-to-contact">{s.avg_hours_new_to_contacted != null ? `${(s.avg_hours_new_to_contacted / 24).toFixed(1)} days` : "—"}</strong></article></div>
    <section className="ad-card" style={{ marginBottom: 15 }}><div className="ad-card-title"><div><h2>Breakdown by dimension</h2><p>Counts use the selected created-date range</p></div></div><div className="ad-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", padding: "0 15px 15px" }}>{groups.map(group => { const max = Math.max(1, ...group.data.map(x => x.count)); return <article className="ad-card" key={group.name}><div className="ad-card-title"><div><h2>{group.name}</h2></div></div><div className="ad-bar-chart">{group.data.length ? group.data.map(({ key, count }) => <div className="ad-bar-row" key={key}><span title={key}>{key}</span><div className="ad-bar"><i style={{ width: `${count / max * 100}%` }}/></div><strong>{count}</strong></div>) : <div className="ad-empty">No records for these dates.</div>}</div></article>; })}</div></section>
    <section className="ad-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", marginBottom: 15 }}>{conversionGroups.map(group => <article className="ad-card" key={group.name}><div className="ad-card-title"><div><h2>Disbursed conversion {group.name.toLowerCase()}</h2><p>Disbursed leads divided by all leads in this date range</p></div></div><div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>{group.name === "By staff" ? "Staff member" : "Loan type"}</th><th>Leads</th><th>Disbursed</th><th>Rate</th></tr></thead><tbody>{group.rows.map(r => <tr key={r.name}><td data-label={group.name}>{r.name}</td><td data-label="Leads">{r.leads}</td><td data-label="Disbursed">{r.disbursed}</td><td data-label="Rate">{r.conversion_rate_percent.toFixed(1)}%</td></tr>)}</tbody></table>{!group.rows.length && <div className="ad-empty">No records in this date range.</div>}</div></article>)}</section>
    </>}
    <section className="ad-card ad-card-pad"><h2 style={{ margin: "0 0 9px", fontSize: 13 }}>Metric notes</h2><p style={{ margin: 0, color: "#78867d", fontSize: 11, lineHeight: 1.7 }}>Conversion is disbursed records divided by all leads created in the selected period. Time-to-contact uses the first recorded move to the Contacted stage. These figures are operational indicators and are not credit-performance evidence.</p></section>
  </>;
}

function UsersPage() {
  const blank = { name: "", email: "", role: "staff" as "staff" | "manager", active: true };
  const [editing, setEditing] = useState<StaffUser | null>(null); const [modal, setModal] = useState(false); const [form, setForm] = useState(blank); const [query, setQuery] = useState("");
  const { data, error, reload } = useLoad(() => get<Page<StaffUser>>("/users", { page_size: 100 }), []);
  const begin = (user?: StaffUser) => { setEditing(user || null); setForm(user ? { name: user.name, email: user.email, role: user.role as "staff" | "manager", active: user.is_active } : { ...blank }); setModal(true); };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (editing) await act(() => patch(`/users/${editing.id}`, { name: form.name.trim(), role: form.role, is_active: form.active }), "Staff profile updated.", () => { setModal(false); reload(); });
    else await act(() => post("/users", { name: form.name.trim(), email: form.email.trim(), role: form.role }), "Staff member added. They will get an email to set a password.", () => { setModal(false); reload(); });
  };
  const toggle = (u: StaffUser) => act(() => patch(`/users/${u.id}`, { is_active: !u.is_active }), u.is_active ? `${u.name} deactivated.` : `${u.name} reactivated.`, reload);
  const unlock = (u: StaffUser) => act(() => patch(`/users/${u.id}`, { unlock: true }), `${u.name} unlocked.`, reload);
  const users = (data?.items ?? []).filter(u => u.role !== "admin" && `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(query.toLowerCase()));
  const locked = (u: StaffUser) => !!u.locked_until && new Date(u.locked_until) > new Date();
  return <>
    <PageHead title="Staff & access" description="Manage team profiles, roles and who can sign in." action={<Button onClick={() => begin()} data-testid="button-add-user"><Plus size={15}/> Add staff member</Button>}/>
    <div className="ad-toolbar"><label className="ad-search"><Search size={15}/><input className="ad-input" placeholder="Search staff name, email or role" value={query} onChange={e => setQuery(e.target.value)} data-testid="input-search-users"/></label></div>
    {error && <Problem text={error} retry={reload}/>}
    <section className="ad-card"><div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Staff member</th><th>Role</th><th>Joined</th><th>Active state</th><th>Actions</th></tr></thead><tbody>{users.map(u => <tr key={u.id} data-testid={`row-user-${u.id}`}><td data-label="Staff member"><strong>{u.name}</strong><small>{u.email}</small></td><td data-label="Role">{ROLE_LABEL[u.role]}</td><td data-label="Joined">{fmtDate(u.created_at)}</td><td data-label="Active state"><StatusPill value={locked(u) ? "Locked" : u.is_active ? "Active" : "Inactive"}/></td><td data-label="Actions"><div style={{ display: "flex", gap: 5 }}><Button className="soft compact" onClick={() => begin(u)} data-testid={`button-edit-user-${u.id}`}><Pencil size={12}/> Edit</Button><Button className="text compact" onClick={() => toggle(u)} data-testid={`button-toggle-user-${u.id}`}><Power size={12}/>{u.is_active ? "Deactivate" : "Activate"}</Button>{locked(u) && <Button className="text compact" onClick={() => unlock(u)} data-testid={`button-unlock-user-${u.id}`}>Unlock</Button>}</div></td></tr>)}</tbody></table>{!data ? <Loading/> : users.length === 0 && <div className="ad-empty">No matching staff profiles.</div>}</div></section>
    {modal && <Modal title={editing ? "Edit staff profile" : "Add staff member"} description={editing ? "Change the name, role or access of this team member." : "They will receive an email with a link to set their own password."} onClose={() => setModal(false)} footer={<><Button className="soft" onClick={() => setModal(false)} data-testid="button-cancel-user">Cancel</Button><Button type="submit" form="user-form" data-testid="button-save-user">Save profile</Button></>}>
       <form id="user-form" onSubmit={save} style={{ display: "contents" }}><label className="ad-field">Full name<input className="ad-input" required minLength={2} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="input-user-name"/></label><label className="ad-field">Work email<input className="ad-input" type="email" required disabled={!!editing} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@yourcompany.com" data-testid="input-user-email"/></label><div className="ad-grid" style={{ gridTemplateColumns: "1fr 1fr" }}><label className="ad-field">Role<select className="ad-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value as "staff" | "manager" })} data-testid="select-user-role"><option value="staff">Staff</option><option value="manager">Manager</option></select></label>{editing && <label className="ad-field">Active<select className="ad-select" value={form.active ? "yes" : "no"} onChange={e => setForm({ ...form, active: e.target.value === "yes" })} data-testid="select-user-active"><option value="yes">Active</option><option value="no">Inactive</option></select></label>}</div></form>
    </Modal>}
  </>;
}

function LoanTypesPage() {
  const empty = { name: "", min_amount: 10000, max_amount: 500000, min_rate: 12, fees: "", min_tenure: 1, max_tenure: 36, eligibility_text: "", required_docs: ["pan"] as string[], is_active: true };
  const [modal, setModal] = useState(false); const [editing, setEditing] = useState<LoanTypeApi | null>(null); const [form, setForm] = useState(empty);
  const { data, error, reload } = useLoad(() => get<LoanTypeApi[]>("/loan-types", { include_inactive: true }), []);
  const begin = (p?: LoanTypeApi) => { setEditing(p || null); setForm(p ? { name: p.name, min_amount: p.min_amount, max_amount: p.max_amount, min_rate: p.min_rate, fees: p.fees ?? "", min_tenure: p.min_tenure, max_tenure: p.max_tenure, eligibility_text: p.eligibility_text, required_docs: p.required_docs, is_active: p.is_active } : { ...empty }); setModal(true); };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const body = { ...form, name: form.name.trim(), fees: form.fees.trim() || null };
    if (editing) await act(() => patch(`/loan-types/${editing.id}`, body), `${body.name} product updated.`, () => { setModal(false); reload(); });
    else await act(() => post("/loan-types", { ...body, slug: slug(body.name), sort_order: (data?.length ?? 0) + 1 }), `${body.name} product added.`, () => { setModal(false); reload(); });
  };
  const toggle = (p: LoanTypeApi) => act(() => patch(`/loan-types/${p.id}`, { is_active: !p.is_active }), `${p.name} ${p.is_active ? "deactivated" : "activated"}.`, reload);
  const products = data ?? [];
  const docs = (list: string[]) => list.map(d => DOC_LABEL[d] ?? d).join(", ") || "No documents set";
  return <>
    <PageHead title="Loan products" description="Maintain the loan products, rates and limits shown on the website." action={<Button onClick={() => begin()} data-testid="button-add-loan-type"><Plus size={15}/> Add product</Button>}/>
     <section className="ad-card"><div className="ad-card-title"><div><h2>Product catalogue</h2><p>Changes appear on the public website straight away. Rates are indicative until the partner NBFC confirms them</p></div><span className="ad-demo-pill">{products.length} PRODUCTS</span></div>{error && <Problem text={error} retry={reload}/>}<div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Product</th><th>Indicative amount range</th><th>Rate p.a.</th><th>Tenure range</th><th>Fees note</th><th>State</th><th>Actions</th></tr></thead><tbody>{products.map(p => <tr key={p.id} data-testid={`row-loan-type-${p.slug}`}><td data-label="Product"><strong>{p.name}</strong><small>{docs(p.required_docs)}</small></td><td data-label="Indicative amount range">{rupees(p.min_amount)} – {rupees(p.max_amount)}</td><td data-label="Rate p.a.">From {p.min_rate}%</td><td data-label="Tenure range">{p.min_tenure}–{p.max_tenure} months</td><td data-label="Fees note">{p.fees || "None"}</td><td data-label="State"><StatusPill value={p.is_active ? "Active" : "Inactive"}/></td><td data-label="Actions"><div style={{ display: "flex", gap: 4 }}><Button className="soft compact" onClick={() => begin(p)} data-testid={`button-edit-product-${p.slug}`}><Pencil size={12}/> Edit</Button><Button className="text compact" onClick={() => toggle(p)} data-testid={`button-toggle-product-${p.slug}`} aria-label={`${p.is_active ? "Deactivate" : "Activate"} ${p.name}`}><Power size={12}/></Button></div></td></tr>)}</tbody></table>{!data ? <Loading/> : products.length === 0 && <div className="ad-empty"><Banknote size={22}/><strong>No products configured</strong><p>Add a product to the catalogue.</p></div>}</div></section>
     <div className="ad-login-alert" style={{ marginTop: 14 }}>All values require partner-lender confirmation. Chakrapay does not charge an advance or processing fee; the fees note is only for charges the lender may apply.</div>
    {modal && <Modal title={editing ? "Edit loan product" : "Add loan product"} description="Changes are saved and shown on the website straight away." onClose={() => setModal(false)} footer={<><Button className="soft" onClick={() => setModal(false)} data-testid="button-cancel-product">Cancel</Button><Button type="submit" form="product-form" data-testid="button-save-product">Save product</Button></>}>
       <form id="product-form" onSubmit={save} style={{ display: "contents" }}><label className="ad-field">Product name<input className="ad-input" required minLength={2} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="input-product-name"/></label><div className="ad-grid" style={{ gridTemplateColumns: "1fr 1fr" }}><label className="ad-field">Minimum amount (₹)<input className="ad-input" type="number" min="0" required value={form.min_amount} onChange={e => setForm({ ...form, min_amount: Number(e.target.value) })} data-testid="input-product-min"/></label><label className="ad-field">Maximum amount (₹)<input className="ad-input" type="number" min={form.min_amount} required value={form.max_amount} onChange={e => setForm({ ...form, max_amount: Number(e.target.value) })} data-testid="input-product-max"/></label></div><div className="ad-grid" style={{ gridTemplateColumns: "1fr 1fr" }}><label className="ad-field">Indicative rate from (% p.a.)<input className="ad-input" type="number" min="0.1" max="60" step=".05" required value={form.min_rate} onChange={e => setForm({ ...form, min_rate: Number(e.target.value) })} data-testid="input-product-rate"/></label><label className="ad-field">Fees note<input className="ad-input" value={form.fees} onChange={e => setForm({ ...form, fees: e.target.value })} placeholder="e.g. Set by the partner NBFC" data-testid="input-product-fee"/></label></div><div className="ad-grid" style={{ gridTemplateColumns: "1fr 1fr" }}><label className="ad-field">Minimum tenure (months)<input className="ad-input" type="number" min="1" max={form.max_tenure} required value={form.min_tenure} onChange={e => setForm({ ...form, min_tenure: Number(e.target.value) })} data-testid="input-product-min-tenure"/></label><label className="ad-field">Maximum tenure (months)<input className="ad-input" type="number" min={form.min_tenure} required value={form.max_tenure} onChange={e => setForm({ ...form, max_tenure: Number(e.target.value) })} data-testid="input-product-tenure"/></label></div><label className="ad-field">Eligibility criteria<textarea className="ad-textarea" value={form.eligibility_text} onChange={e => setForm({ ...form, eligibility_text: e.target.value })} data-testid="input-product-eligibility"/></label><div className="ad-field">Required documents<div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 6 }}>{DOC_TYPES.map(d => <label key={d} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}><input type="checkbox" checked={form.required_docs.includes(d)} onChange={e => setForm({ ...form, required_docs: e.target.checked ? [...form.required_docs, d] : form.required_docs.filter(x => x !== d) })} data-testid={`input-product-doc-${d}`}/>{DOC_LABEL[d]}</label>)}</div></div><label className="ad-field">Catalogue state<select className="ad-select" value={form.is_active ? "active" : "inactive"} onChange={e => setForm({ ...form, is_active: e.target.value === "active" })} data-testid="select-product-active"><option value="active">Active</option><option value="inactive">Inactive</option></select></label></form>
    </Modal>}
  </>;
}

function AuditPage() {
  const [query, setQuery] = useState("");
  const { data, error, reload } = useLoad(() => get<Page<AuditEntry>>("/audit-log", { page_size: 200 }), []);
  const rows = data?.items ?? [];
  const entity = (a: AuditEntry) => `${a.entity}${a.entity_id ? ` · ${a.entity_id}` : ""}`;
  const visible = rows.filter(a => `${a.action} ${entity(a)} ${a.user_name ?? ""} ${a.ip ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  const exportAudit = () => { csvDownload("chakrapay-audit.csv", ["Action", "Entity", "User", "Time", "IP"], visible.map(a => [a.action, entity(a), a.user_name ?? "System", a.created_at, a.ip ?? ""])); toast("Audit log downloaded."); };
  return <>
    <PageHead title="Audit log" description="A trace of key actions: who did what, and when." action={<Button className="soft" onClick={exportAudit} data-testid="button-export-audit"><ArrowDownToLine size={14}/> Export CSV</Button>}/>
    <div className="ad-toolbar"><label className="ad-search"><Search size={15}/><input className="ad-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search actions, entities, users or IP" data-testid="input-search-audit"/></label><span className="ad-demo-pill">Latest {rows.length} of {data?.total ?? 0}</span></div>
    {error && <Problem text={error} retry={reload}/>}
    <section className="ad-card"><div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Action</th><th>Entity</th><th>User</th><th>Time</th><th>IP address</th></tr></thead><tbody>{visible.map(a => <tr key={a.id} data-testid={`row-audit-${a.id}`}><td data-label="Action"><strong>{a.action.replaceAll("_", " ")}</strong><small>AU-{a.id}</small></td><td data-label="Entity">{entity(a)}</td><td data-label="User">{a.user_name ?? "System"}</td><td data-label="Time">{fmtTime(a.created_at)}</td><td data-label="IP address"><code>{a.ip ?? "—"}</code></td></tr>)}</tbody></table>{!data ? <Loading/> : visible.length === 0 && <div className="ad-empty"><ShieldCheck size={22}/><strong>No matching audit actions</strong><p>Actions recorded by the system appear here.</p></div>}</div></section>
  </>;
}

function NotFound() { const user = useUser(); const lvl = user ? levelOf(user.role) : 0; return <div className="ad-not-found"><CircleHelp size={31}/><p className="ad-kicker">Admin</p><h1>This desk view does not exist.</h1><p>Choose a workspace destination below.</p><div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>{NAV.filter(n => n.level <= lvl).slice(0, 4).map(n => <Link className="ad-button soft" href={n.href} key={n.href} data-testid={`link-not-found-${slug(n.label)}`}>{n.label}</Link>)}</div></div>; }
function Guard({ level, user, children }: { level: number; user: User; children: ReactNode }) {
  if (levelOf(user.role) >= level) return <>{children}</>;
  return <div className="ad-not-found"><ShieldCheck size={31}/><p className="ad-kicker">No access</p><h1>This page is not available to your role.</h1><p>Ask an Admin if you need access.</p><Link href="/admin" className="ad-button">Back to overview</Link></div>;
}

export function AdminApp() {
  const user = useUser();
  if (!user || !TEAM_ROLES.includes(user.role)) return <><Login/><Toasts/></>;
  return <AdminShell user={user}><Switch>
    <Route path="/admin">{() => <Dashboard user={user}/>}</Route>
    <Route path="/admin/login">{() => <Dashboard user={user}/>}</Route>
    <Route path="/admin/leads">{() => <LeadsPage user={user}/>}</Route>
    <Route path="/admin/leads/:id">{() => <LeadDetail user={user}/>}</Route>
    <Route path="/admin/enquiries">{() => <EnquiriesPage/>}</Route>
    <Route path="/admin/team">{() => <Guard level={1} user={user}><TeamPage/></Guard>}</Route>
    <Route path="/admin/reports">{() => <Guard level={1} user={user}><ReportsPage/></Guard>}</Route>
    <Route path="/admin/users">{() => <Guard level={2} user={user}><UsersPage/></Guard>}</Route>
    <Route path="/admin/loan-types">{() => <Guard level={2} user={user}><LoanTypesPage/></Guard>}</Route>
    <Route path="/admin/audit">{() => <Guard level={2} user={user}><AuditPage/></Guard>}</Route>
    <Route component={NotFound}/>
  </Switch></AdminShell>;
}

export default AdminApp;
