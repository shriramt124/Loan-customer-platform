import { useEffect, useMemo, useState, type ButtonHTMLAttributes, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react";
import { Link, Route, Switch, useLocation, useParams } from "wouter";
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowRight, Banknote, BriefcaseBusiness,
  CalendarDays, Check, CheckCheck, ChevronLeft, ChevronRight, CircleHelp,
  Clock3, FileText, Filter, LayoutDashboard,
  ListChecks, LockKeyhole, Menu, MessageSquareText, Search, ShieldCheck, UserCheck,
  UserRound, Users, Wallet, X, AlertTriangle, Plus, Pencil, Power, RotateCcw,
} from "lucide-react";
import "./admin.css";

type Status = "Submitted" | "Assigned" | "Contacted" | "Documents Pending" | "Documents Verified" | "In Process" | "Approved" | "Disbursed" | "Rejected" | "Not Reachable / Closed";
type DocState = "Pending" | "Verified" | "Rejected";
type Role = "Admin" | "Manager" | "Staff";
type HistoryItem = { status: Status; from?: Status; at: string; by: string; note: string };
type DocumentItem = { id: string; name: string; state: DocState; reason?: string };
type Followup = { id: string; due: string; note: string; done: boolean };
type Lead = {
  id: string; name: string; phone: string; email: string; type: string; amount: number; city: string;
  income: number; existingEmi: number; source: string; status: Status; assigned: string; created: string; lastTouched: string; contactedAt?: string;
  mobileConfirmed: boolean; notes: { id: string; body: string; by: string; at: string }[];
  documents: DocumentItem[]; history: HistoryItem[]; followups: Followup[];
};
type StaffUser = { id: string; name: string; email: string; role: Role; active: boolean; joined: string };
type LoanProduct = { id: string; name: string; min: number; max: number; rate: number; minTenure: number; tenure: number; fee: number; eligibility: string; documents: string; active: boolean };
type Enquiry = { id: string; name: string; phone: string; email: string; type: "Contact" | "Callback"; created: string; message: string; handled: boolean };
type AuditEntry = { id: string; action: string; entity: string; user: string; time: string; ip: string };

const STATUSES: Status[] = ["Submitted", "Assigned", "Contacted", "Documents Pending", "Documents Verified", "In Process", "Approved", "Disbursed", "Rejected", "Not Reachable / Closed"];
const OPEN_PROGRESS = STATUSES.slice(0, 8) as Status[];
const LOAN_NAMES = ["Personal loan", "Home loan", "Business loan", "Education loan", "Gold loan", "Loan against property"];
const CITIES = ["Pune", "Jaipur", "Indore", "Kochi", "Lucknow", "Surat", "Nagpur", "Coimbatore", "Mysuru", "Bhopal"];
const SOURCES = ["Web", "Walk-in", "Phone"];
const FIRST_NAMES = ["Aarav", "Anaya", "Kabir", "Meera", "Ishaan", "Tara", "Rohan", "Nisha", "Dev", "Aditi", "Kunal", "Diya", "Arjun", "Mira", "Samar", "Ira", "Neel", "Kavya", "Rehan", "Leela"];
const LAST_NAMES = ["Shah", "Iyer", "Kapoor", "Menon", "Bose", "Kulkarni", "Rao", "Sethi", "Joshi", "Dutta", "Nair", "Desai", "Khan", "Pillai", "Bhat"];
const STAFF_SEED: StaffUser[] = [
  { id: "usr-2", name: "Kabir Menon", email: "kabir.menon@demo.saanjh.local", role: "Manager", active: true, joined: "2024-03-04" },
  { id: "usr-3", name: "Mira Shah", email: "mira.shah@demo.saanjh.local", role: "Staff", active: true, joined: "2024-05-10" },
  { id: "usr-4", name: "Dev Iyer", email: "dev.iyer@demo.saanjh.local", role: "Staff", active: true, joined: "2024-06-18" },
  { id: "usr-5", name: "Tara Bose", email: "tara.bose@demo.saanjh.local", role: "Staff", active: true, joined: "2024-07-02" },
];
const PRODUCTS_SEED: LoanProduct[] = [
  { id: "personal", name: "Personal loan", min: 25000, max: 2500000, rate: 12.5, minTenure: 12, tenure: 60, fee: 0, eligibility: "Demo criteria: age and income requirements need lender confirmation.", documents: "Identity proof, address proof, income proof", active: true },
  { id: "home", name: "Home loan", min: 250000, max: 50000000, rate: 8.65, minTenure: 12, tenure: 360, fee: 0, eligibility: "Demo criteria: property, age and repayment terms need lender confirmation.", documents: "Identity proof, income proof, property papers", active: true },
  { id: "business", name: "Business loan", min: 100000, max: 7500000, rate: 14, minTenure: 12, tenure: 60, fee: 0, eligibility: "Demo criteria: business vintage, turnover and credit terms need confirmation.", documents: "Identity proof, business registration, bank statements", active: true },
  { id: "education", name: "Education loan", min: 50000, max: 4000000, rate: 10.5, minTenure: 12, tenure: 180, fee: 0, eligibility: "Demo criteria: course and co-applicant terms need lender confirmation.", documents: "Identity proof, admission letter, fee schedule", active: true },
  { id: "gold", name: "Gold loan", min: 10000, max: 5000000, rate: 9.5, minTenure: 3, tenure: 36, fee: 0, eligibility: "Demo criteria: purity, valuation and repayment terms need lender confirmation.", documents: "Identity proof, address proof", active: true },
  { id: "property", name: "Loan against property", min: 100000, max: 50000000, rate: 11, minTenure: 12, tenure: 180, fee: 0, eligibility: "Demo criteria: property value, ownership and repayment terms need confirmation.", documents: "Identity proof, income proof, property ownership papers", active: true },
];
const dateOffset = (days: number, hour = 11) => {
  const d = new Date(); d.setDate(d.getDate() - days); d.setHours(hour, (days * 7) % 60, 0, 0); return d.toISOString();
};
const isoDate = (d: string) => new Date(d).toISOString().slice(0, 10);
const fmtDate = (d: string) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
const fmtTime = (d: string) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
const rupees = (n: number) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;
const slug = (s: string) => s.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/(^-|-$)/g, "");
const makeLeads = (): Lead[] => Array.from({ length: 40 }, (_, i) => {
  const idx = i + 1, status = STATUSES[(idx * 7 + Math.floor(idx / 5)) % 10];
  const assigned = idx % 7 === 0 || status === "Submitted" ? "Unassigned" : STAFF_SEED[1 + (idx % 3)].name;
  const name = `${FIRST_NAMES[(idx * 3) % FIRST_NAMES.length]} ${LAST_NAMES[(idx * 7) % LAST_NAMES.length]}`;
  const createdOffset = (idx * 3) % 45 + 1;
  const statusAt = dateOffset((idx % 18) + 1, 9 + idx % 7);
  const contactedAt = !["Submitted", "Assigned"].includes(status) ? dateOffset(Math.max(0, createdOffset - 1), 12) : undefined;
  return {
    id: `SA-${2400 + idx}`, name, phone: `Demo mobile · ${String(10000 + idx)}`,
    email: `${slug(name)}${idx}@sample.saanjh.local`, type: LOAN_NAMES[idx % LOAN_NAMES.length],
    amount: [85000, 240000, 650000, 1250000, 320000][idx % 5], city: CITIES[(idx * 3) % CITIES.length],
    income: [32000, 48000, 65000, 85000, 110000][idx % 5], existingEmi: [0, 2500, 5000, 8000][idx % 4],
    source: SOURCES[(idx * 2) % SOURCES.length], status, assigned, created: dateOffset(createdOffset),
    lastTouched: dateOffset((idx * 5) % 12, 10), contactedAt, mobileConfirmed: idx % 4 !== 0,
    notes: idx % 4 === 0 ? [{ id: `note-${idx}`, body: "Requested a callback after 4 pm. Demo note.", by: STAFF_SEED[2].name, at: dateOffset(1) }] : [],
    documents: ["Identity proof", "Address proof", ...(idx % 2 ? ["Income proof"] : [])].map((nameDoc, j) => ({
      id: `${idx}-doc-${j}`, name: nameDoc, state: j === 0 && ["Documents Verified", "In Process", "Approved", "Disbursed"].includes(status) ? "Verified" : "Pending",
    })),
    history: [{ status, at: statusAt, by: assigned === "Unassigned" ? "System" : assigned, note: "Sample application created" }],
    followups: idx % 5 === 0 ? [{ id: `fu-${idx}`, due: dateOffset(1), note: "Confirm preferred callback time", done: false }] : [],
  };
});
const ENQUIRIES_SEED: Enquiry[] = [
  { id: "EN-101", name: "Riya Nair", phone: "Demo contact · 01", email: "riya01@sample.saanjh.local", type: "Callback", created: dateOffset(0, 10), message: "Would like to understand the application steps.", handled: false },
  { id: "EN-102", name: "Arman Shah", phone: "Demo contact · 02", email: "arman02@sample.saanjh.local", type: "Contact", created: dateOffset(1, 14), message: "Question about indicative home loan tenure.", handled: false },
  { id: "EN-103", name: "Sana Iyer", phone: "Demo contact · 03", email: "sana03@sample.saanjh.local", type: "Callback", created: dateOffset(2, 12), message: "Callback requested in the afternoon.", handled: true },
  { id: "EN-104", name: "Nikhil Bose", phone: "Demo contact · 04", email: "nikhil04@sample.saanjh.local", type: "Contact", created: dateOffset(3, 9), message: "Asked which documents are useful to prepare.", handled: false },
];
const AUDIT_SEED: AuditEntry[] = [
  { id: "AU-5101", action: "Lead created", entity: "SA-2412", user: "Anika Rao", time: dateOffset(0, 9), ip: "10.24.3.14" },
  { id: "AU-5100", action: "Document verified", entity: "SA-2407 · Identity proof", user: "Mira Shah", time: dateOffset(0, 8), ip: "10.24.3.26" },
  { id: "AU-5099", action: "Status changed", entity: "SA-2404 · Contacted", user: "Kabir Menon", time: dateOffset(1, 16), ip: "10.24.3.19" },
  { id: "AU-5098", action: "Staff updated", entity: "usr-4", user: "Anika Rao", time: dateOffset(2, 11), ip: "10.24.3.14" },
  { id: "AU-5097", action: "Enquiry handled", entity: "EN-103", user: "Tara Bose", time: dateOffset(2, 10), ip: "10.24.3.31" },
];

function csvDownload(filename: string, headers: string[], rows: (string | number)[][]) {
  const quote = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  const content = [headers, ...rows].map(row => row.map(quote).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = filename; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const NAV = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, group: "WORKSPACE" },
  { label: "Loan leads", href: "/admin/leads", icon: BriefcaseBusiness, group: "WORKSPACE" },
  { label: "Enquiries", href: "/admin/enquiries", icon: MessageSquareText, group: "WORKSPACE" },
  { label: "Team workload", href: "/admin/team", icon: Users, group: "WORKSPACE" },
  { label: "Reports", href: "/admin/reports", icon: Activity, group: "MANAGE" },
  { label: "Staff & access", href: "/admin/users", icon: UserRound, group: "MANAGE" },
  { label: "Loan products", href: "/admin/loan-types", icon: Wallet, group: "MANAGE" },
  { label: "Audit log", href: "/admin/audit", icon: ShieldCheck, group: "MANAGE" },
];

function DemoFlag() { return <div className="ad-demo-notice" data-testid="notice-admin-demo"><ShieldCheck size={14}/> Admin demo · Fictional sample data only · Changes stay in this browser session and reset on reload</div>; }
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

type AppData = {
  leads: Lead[]; setLeads: Dispatch<SetStateAction<Lead[]>>;
  users: StaffUser[]; setUsers: Dispatch<SetStateAction<StaffUser[]>>;
  products: LoanProduct[]; setProducts: Dispatch<SetStateAction<LoanProduct[]>>;
  enquiries: Enquiry[]; setEnquiries: Dispatch<SetStateAction<Enquiry[]>>;
  audit: AuditEntry[]; log: (action: string, entity: string) => void;
  toast: (text: string) => void; toastMessage: string;
};

function AdminShell({ children, data }: { children: ReactNode; data: AppData }) {
  const [path] = useLocation(); const [menu, setMenu] = useState(false);
  const groups = ["WORKSPACE", "MANAGE"];
  return <div className="sa-admin ad-frame">
    <aside className={`ad-sidebar ${menu ? "open" : ""}`}>
      <Link href="/admin" className="ad-brand" data-testid="link-admin-brand"><span className="ad-brand-mark"><img src="/chakrapay-mark.png" alt="" /></span><span><span className="ad-brand-name">Chakrapay<i>.</i></span><small>Operations desk</small></span></Link>
      {groups.map(group => <div key={group}><p className="ad-nav-label">{group}</p><nav className="ad-nav">{NAV.filter(n => n.group === group).map(n => {
        const active = n.href === "/admin" ? path === n.href : path === n.href || path.startsWith(`${n.href}/`);
        const Icon = n.icon; return <Link key={n.href} href={n.href} onClick={() => setMenu(false)} className={active ? "active" : ""} data-testid={`link-admin-${slug(n.label)}`}><Icon size={16}/>{n.label}</Link>;
      })}</nav></div>)}
      <div className="ad-sidebar-bottom"><div className="ad-sidebar-demo"><strong><CircleHelp size={13}/> ADMIN · DEMO</strong>Sample workspace only. No live customer records or authentication.</div><div className="ad-user-chip"><span className="ad-avatar">AR</span><span><strong>Anika Rao</strong><small>Admin · Demo session</small></span></div></div>
    </aside>
    <main className="ad-main">
      <header className="ad-topbar"><div className="ad-top-left"><button type="button" className="ad-menu-button" onClick={() => setMenu(!menu)} aria-label="Toggle navigation" data-testid="button-mobile-navigation">{menu ? <X size={18}/> : <Menu size={18}/>}</button><span className="ad-topbar-title">LSP admin workbench</span></div><div className="ad-top-actions"><span className="ad-top-date">{new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(new Date())}</span><span className="ad-demo-pill"><span>DEMO</span> Admin role</span></div></header>
      <div className="ad-content"><DemoFlag/>{children}</div>
    </main>
    <nav className="ad-mobile-nav">{NAV.slice(0, 4).map(n => { const I = n.icon; return <Link key={n.href} href={n.href} className={(path === n.href || (n.href !== "/admin" && path.startsWith(`${n.href}/`))) ? "active" : ""} data-testid={`mobile-link-${slug(n.label)}`}><I/><span>{n.label.split(" ")[0]}</span></Link>; })}</nav>
    {data.toastMessage && <div className="ad-toast" role="status" data-testid="toast-message"><Check size={16}/>{data.toastMessage}</div>}
  </div>;
}

function Login({ toast }: { toast: (s: string) => void }) {
  const [, navigate] = useLocation(); const [email, setEmail] = useState("admin@demo.saanjh.local"); const [password, setPassword] = useState("");
  const submit = (e: FormEvent) => { e.preventDefault(); toast("Demo only — no authentication was performed."); navigate("/admin"); };
  return <div className="sa-admin ad-login-wrap"><section className="ad-card ad-login-card">
    <div className="ad-brand"><span className="ad-brand-mark"><img src="/chakrapay-mark.png" alt="" /></span><span><span className="ad-brand-name">Chakrapay<i>.</i></span><small>Admin demo workbench</small></span></div>
    <p className="ad-kicker">Local visual demo</p><h1>Welcome to the desk.</h1><p>Sign-in form preview for the Chakrapay LSP operations team. This page is not connected to a user system.</p>
    <div className="ad-login-alert"><LockKeyhole size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }}/>This form does not authenticate or secure anything. Any values are ignored; this demo has no access control.</div>
    <form className="ad-login-form" onSubmit={submit}><label className="ad-field">Work email<input className="ad-input" type="email" value={email} onChange={e => setEmail(e.target.value)} data-testid="input-admin-email"/></label><label className="ad-field">Password<input className="ad-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Demo input only" data-testid="input-admin-password"/></label><Button type="submit" data-testid="button-demo-login">Open admin demo <ArrowRight size={15}/></Button></form>
    <p style={{ marginTop: 16, fontSize: 10 }} data-testid="text-sample-data">ADMIN / DEMO · Sample data only · No information is submitted</p><Link href="/admin" className="ad-link" data-testid="link-skip-login">Continue to dashboard without signing in</Link>
  </section></div>;
}

function Dashboard({ data }: { data: AppData }) {
  const open = data.leads.filter(l => !["Disbursed", "Rejected", "Not Reachable / Closed"].includes(l.status));
  const overdue = data.leads.flatMap(l => l.followups.filter(f => !f.done && new Date(f.due) < new Date()).map(f => ({ lead: l, follow: f })));
  const pendingFollowups = data.leads.flatMap(l => l.followups.filter(f => !f.done));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const createdSince = (start: Date) => data.leads.filter(l => new Date(l.created) >= start).length;
  const counts = STATUSES.map(status => ({ status, count: data.leads.filter(l => l.status === status).length }));
  const max = Math.max(1, ...counts.map(c => c.count));
  const recent = [...data.leads].sort((a, b) => b.created.localeCompare(a.created)).slice(0, 5);
  const activeTeam = data.users.filter(u => u.active && u.role !== "Admin");
  const unassigned = data.leads.filter(l => l.assigned === "Unassigned" && !["Disbursed", "Rejected", "Not Reachable / Closed"].includes(l.status));
  const teamTotals = activeTeam.map(user => ({ user, leads: data.leads.filter(l => l.assigned === user.name).length }));
  const trend = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - 6 + i);
    const nextDay = new Date(day); nextDay.setDate(nextDay.getDate() + 1);
    return { date: day, count: data.leads.filter(l => new Date(l.created) >= day && new Date(l.created) < nextDay).length };
  });
  const trendMax = Math.max(1, ...trend.map(d => d.count));
  const trendPoints = trend.map((d, i) => `${28 + i * 54},${92 - (d.count / trendMax) * 66}`).join(" ");
  const quick = [{ label: "Review incoming", note: `${data.leads.filter(l => l.status === "Submitted").length} awaiting assignment`, href: "/admin/leads?status=Submitted", icon: ListChecks }, { label: "Check follow-ups", note: `${overdue.length} overdue actions`, href: "/admin/team", icon: Clock3 }, { label: "Manage products", note: `${data.products.filter(p => p.active).length} active products`, href: "/admin/loan-types", icon: Banknote }, { label: "Open reports", note: "Review the sample funnel", href: "/admin/reports", icon: Activity }];
  return <>
    <PageHead title={`${new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening"}, Anika`} description="A clear view of incoming applications, open work and the team's next actions." action={<Link href="/admin/leads" className="ad-button" data-testid="link-view-leads">Review loan leads <ArrowRight size={14}/></Link>}/>
    <section className="ad-grid ad-metrics ad-dashboard-metrics">
      {[{ label: "Leads today", value: createdSince(today), note: "New applications today", icon: BriefcaseBusiness }, { label: "Leads this week", value: createdSince(weekStart), note: "Since Monday", icon: Activity }, { label: "Leads this month", value: createdSince(monthStart), note: "Calendar month to date", icon: CheckCheck }, { label: "Unassigned leads", value: data.leads.filter(l => l.assigned === "Unassigned" && !["Disbursed", "Rejected", "Not Reachable / Closed"].includes(l.status)).length, note: "Waiting for an owner", icon: UserCheck }, { label: "Pending follow-ups", value: pendingFollowups.length, note: `${overdue.length} overdue`, icon: Clock3 }, { label: "Open applications", value: open.length, note: "Excludes closed outcomes", icon: ListChecks }, { label: "Active team", value: activeTeam.length, note: `${teamTotals.reduce((sum, t) => sum + t.leads, 0)} assigned sample leads`, icon: Users }].map(m => { const I = m.icon; return <article className="ad-card ad-metric" key={m.label} data-testid={`metric-${slug(m.label)}`}><div className="ad-metric-top"><span>{m.label}</span><span className="ad-metric-icon"><I size={16}/></span></div><strong>{m.value}</strong><small>{m.note}</small></article>; })}
    </section>
    <section className="ad-grid ad-dashboard-grid">
      <article className="ad-card"><div className="ad-card-title"><div><h2>Applications by status</h2><p>Current counts across all workflow outcomes</p></div><span className="ad-demo-pill">SAMPLE</span></div>
        <div className="ad-funnel">{counts.map(({ status, count }) => <div className="ad-funnel-row" key={status}><span>{status}</span><div className="ad-funnel-track"><div className="ad-funnel-fill" style={{ width: `${Math.max(count ? 8 : 0, count / max * 100)}%` }}/></div><strong>{count}</strong></div>)}</div>
      </article>
      <article className="ad-card"><div className="ad-card-title"><div><h2>Follow-up queue</h2><p>Overdue items, oldest due first</p></div><Link href="/admin/team" className="ad-link" data-testid="link-team-queue">Team view</Link></div><div className="ad-card-body ad-list">{overdue.length ? overdue.slice(0, 5).map(({ lead, follow }) => <Link href={`/admin/leads/${lead.id}`} className="ad-list-item" key={follow.id} data-testid={`row-overdue-${follow.id}`}><span className="ad-list-main"><strong>{lead.name}</strong><small>{follow.note} · {fmtDate(follow.due)}</small></span><span className="ad-small-count">›</span></Link>) : <div className="ad-empty">No overdue actions</div>}</div></article>
    </section>
    <section className="ad-grid ad-dashboard-extra">
      <article className="ad-card ad-card-pad"><div className="ad-section-title"><div><h2>New leads · last 7 days</h2><p>Sample applications received each day</p></div><Activity size={16}/></div>
        <svg className="ad-trend-chart" viewBox="0 0 370 132" role="img" aria-label={`New leads per day over the last seven days: ${trend.map(d => `${new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(d.date)} ${d.count}`).join(", ")}`}>
          <path d="M24 94H352M24 60H352M24 26H352" stroke="#e8e9df" strokeDasharray="3 5"/>
          <polyline points={trendPoints} fill="none" stroke="#3d5c99" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          {trend.map((d, i) => <g key={d.date.toISOString()}><circle cx={28 + i * 54} cy={92 - (d.count / trendMax) * 66} r="4" fill="#f9fbfd" stroke="#3d5c99" strokeWidth="2"/><text x={28 + i * 54} y="119" textAnchor="middle">{new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(d.date)}</text></g>)}
        </svg>
      </article>
      <article className="ad-card"><div className="ad-card-title"><div><h2>Team totals</h2><p>Assigned applications across active staff and managers</p></div><Link href="/admin/team" className="ad-link" data-testid="link-dashboard-team-totals">Open team view</Link></div><div className="ad-team-totals">{teamTotals.map(({ user, leads }) => <div className="ad-team-total-row" key={user.id}><span>{user.name}<small>{user.role}</small></span><div className="ad-team-total-track"><i style={{ width: `${Math.max(4, leads / Math.max(1, ...teamTotals.map(t => t.leads)) * 100)}%` }}/></div><strong>{leads}</strong></div>)}</div></article>
    </section>
    <section className="ad-card" style={{ margin: "16px 0" }}><div className="ad-card-title"><div><h2>Needs an owner</h2><p>Unassigned open leads — assign without leaving the dashboard</p></div><span className="ad-demo-pill">{unassigned.length} WAITING</span></div><div className="ad-card-body">{unassigned.length ? unassigned.slice(0, 5).map(l => <div className="ad-assign-row" key={l.id}><Link href={`/admin/leads/${l.id}`}><strong>{l.name}</strong><small>{l.id} · {l.type} · {rupees(l.amount)}</small></Link><select className="ad-select" value="Unassigned" aria-label={`Assign ${l.name}`} onChange={e => { const name = e.target.value; data.setLeads(prev => prev.map(x => x.id === l.id ? { ...x, assigned: name, lastTouched: new Date().toISOString() } : x)); data.log("Lead assigned", `${l.id} · ${name}`); data.toast(`${l.id} assigned to ${name}.`); }} data-testid={`select-quick-assign-${l.id}`}><option>Unassigned</option>{activeTeam.map(u => <option key={u.id}>{u.name}</option>)}</select></div>) : <div className="ad-empty">Every open lead has an owner.</div>}</div></section>
    <section className="ad-grid ad-quick-grid">{quick.map(item => { const I = item.icon; return <Link className="ad-card ad-quick" href={item.href} key={item.label} data-testid={`quick-${slug(item.label)}`}><span className="ad-quick-icon"><I size={17}/></span><span><strong>{item.label}</strong><small>{item.note}</small></span><ArrowRight size={14}/></Link>; })}</section>
    <section className="ad-card" style={{ marginTop: 16 }}><div className="ad-card-title"><div><h2>Recently added leads</h2><p>New applications in the sample workspace</p></div><Link href="/admin/leads" className="ad-link" data-testid="link-all-recent-leads">All leads <ArrowRight size={13}/></Link></div><div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Applicant</th><th>Loan product</th><th>City</th><th>Stage</th><th>Amount</th></tr></thead><tbody>{recent.map(l => <tr key={l.id}><td data-label="Applicant"><Link href={`/admin/leads/${l.id}`} className="ad-cell-primary" data-testid={`link-lead-${l.id}`}>{l.name}<small>{l.id} · {fmtDate(l.created)}</small></Link></td><td data-label="Loan product">{l.type}</td><td data-label="City">{l.city}</td><td data-label="Stage"><StatusPill value={l.status}/></td><td data-label="Amount">{rupees(l.amount)}</td></tr>)}</tbody></table></div></section>
  </>;
}

function LeadsPage({ data }: { data: AppData }) {
  const [query, setQuery] = useState(""); const [status, setStatus] = useState(() => new URLSearchParams(window.location.search).get("status") || "All stages"); const [type, setType] = useState("All products"); const [city, setCity] = useState("All cities"); const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [staff, setStaff] = useState("All staff"); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", type: LOAN_NAMES[0], amount: "250000", income: "50000", existingEmi: "0", city: CITIES[0], source: "Web" });
  const pageSize = 10;
  const [sort, setSort] = useState<{ key: "name" | "amount" | "created" | "status"; dir: 1 | -1 }>({ key: "created", dir: -1 });
  const toggleSort = (key: "name" | "amount" | "created" | "status") => { setSort(s => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "name" || key === "status" ? 1 : -1 })); setPage(1); };
  const filtered0 = useMemo(() => data.leads.filter(l => {
    const q = query.toLowerCase().trim();
    return (!q || `${l.name} ${l.id} ${l.phone} ${l.email}`.toLowerCase().includes(q)) &&
      (status === "All stages" || l.status === status) && (type === "All products" || l.type === type) && (city === "All cities" || l.city === city) &&
      (staff === "All staff" || l.assigned === staff) && (!from || isoDate(l.created) >= from) && (!to || isoDate(l.created) <= to);
  }), [data.leads, query, status, type, city, staff, from, to]);
  const filtered = useMemo(() => [...filtered0].sort((a, b) => {
    const va = sort.key === "amount" ? a.amount : sort.key === "created" ? a.created : sort.key === "status" ? STATUSES.indexOf(a.status) : a.name;
    const vb = sort.key === "amount" ? b.amount : sort.key === "created" ? b.created : sort.key === "status" ? STATUSES.indexOf(b.status) : b.name;
    return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
  }), [filtered0, sort]);
  const filtersActive = !!query || status !== "All stages" || type !== "All products" || city !== "All cities" || staff !== "All staff" || !!from || !!to;
  const clearFilters = () => { setQuery(""); setStatus("All stages"); setType("All products"); setCity("All cities"); setStaff("All staff"); setFrom(""); setTo(""); setPage(1); };
  const exportLeads = () => { csvDownload("saanjh-demo-leads.csv", ["Lead ID", "Applicant", "Loan type", "City", "Source", "Status", "Staff", "Amount (INR)", "Created"], filtered.map(l => [l.id, l.name, l.type, l.city, l.source, l.status, l.assigned, l.amount, isoDate(l.created)])); data.log("Leads CSV exported", `${filtered.length} sample leads`); data.toast(`${filtered.length} leads exported to CSV.`); };
  const sortTh = (key: "name" | "amount" | "created" | "status", label: string) => <th className="ad-th-sort" aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : undefined} onClick={() => toggleSort(key)} data-testid={`sort-${key}`}>{label}{sort.key === key ? (sort.dir === 1 ? " ↑" : " ↓") : ""}</th>;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const add = (e: FormEvent) => {
    e.preventDefault(); const id = `SA-${2400 + Math.max(0, ...data.leads.map(l => Number(l.id.slice(3)) - 2400)) + 1}`;
    const lead: Lead = { id, ...form, amount: Number(form.amount), income: Number(form.income), existingEmi: Number(form.existingEmi), assigned: "Unassigned", status: "Submitted", created: new Date().toISOString(), lastTouched: new Date().toISOString(), mobileConfirmed: false, notes: [], documents: ["Identity proof", "Address proof", "Income proof"].map((name, i) => ({ id: `${id}-${i}`, name, state: "Pending" })), history: [{ status: "Submitted", at: new Date().toISOString(), by: "Anika Rao", note: "Lead created in local demo" }], followups: [] };
    data.setLeads(prev => [lead, ...prev]); data.log("Lead created", id); data.toast(`${id} added to the sample queue.`); setAdding(false); setForm({ name: "", phone: "", email: "", type: LOAN_NAMES[0], amount: "250000", income: "50000", existingEmi: "0", city: CITIES[0], source: "Web" }); setPage(1);
  };
  return <>
    <PageHead title="Loan leads" description="Find an application, check its stage and move the next action forward." action={<><Button className="soft" onClick={exportLeads} data-testid="button-export-leads"><ArrowDownToLine size={14}/> Export CSV</Button><Button onClick={() => setAdding(true)} data-testid="button-add-lead"><Plus size={15}/> Add lead</Button></>}/>
    <div className="ad-toolbar">
      <label className="ad-search"><Search size={15}/><input className="ad-input" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Search name, ID, phone or email" aria-label="Search leads" data-testid="input-search-leads"/></label>
      <select className="ad-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status" data-testid="select-lead-status"><option>All stages</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
      <select className="ad-select" value={type} onChange={e => { setType(e.target.value); setPage(1); }} aria-label="Filter by product" data-testid="select-lead-product"><option>All products</option>{LOAN_NAMES.map(t => <option key={t}>{t}</option>)}</select>
      <select className="ad-select" value={city} onChange={e => { setCity(e.target.value); setPage(1); }} aria-label="Filter by city" data-testid="select-lead-city"><option>All cities</option>{CITIES.map(c => <option key={c}>{c}</option>)}</select>
      <select className="ad-select" value={staff} onChange={e => { setStaff(e.target.value); setPage(1); }} aria-label="Filter by assigned staff" data-testid="select-lead-staff"><option>All staff</option><option>Unassigned</option>{data.users.filter(u => u.role !== "Admin").map(u => <option key={u.id}>{u.name}{u.active ? "" : " · inactive"}</option>)}</select>
      <label className="ad-field">From<input className="ad-input" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} aria-label="Filter leads from date" data-testid="input-lead-date-from"/></label>
      <label className="ad-field">To<input className="ad-input" type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} aria-label="Filter leads to date" data-testid="input-lead-date-to"/></label>
      <span className="ad-demo-pill"><Filter size={12}/>{filtered.length} sample records</span>{filtersActive && <Button className="text compact" onClick={clearFilters} data-testid="button-clear-filters"><X size={12}/> Clear filters</Button>}
    </div>
    <section className="ad-card"><div className="ad-table-wrap"><table className="ad-table"><thead><tr>{sortTh("name", "Applicant")}<th>Loan product</th><th>Location / source</th>{sortTh("status", "Stage")}<th>Assigned to</th>{sortTh("amount", "Requested")}{sortTh("created", "Created")}</tr></thead><tbody>{visible.map(l => <tr key={l.id} data-testid={`row-lead-${l.id}`}><td data-label="Applicant"><Link href={`/admin/leads/${l.id}`} className="ad-cell-primary" data-testid={`link-lead-${l.id}`}>{l.name}<small>{l.id} · {l.phone}</small></Link></td><td data-label="Loan product">{l.type}</td><td data-label="Location / source">{l.city}<small>{l.source}</small></td><td data-label="Stage"><StatusPill value={l.status}/></td><td data-label="Assigned to">{l.assigned}</td><td data-label="Requested">{rupees(l.amount)}</td><td data-label="Created">{fmtDate(l.created)}</td></tr>)}</tbody></table>{visible.length === 0 && <div className="ad-empty"><Search size={20}/><strong>No matching applications</strong><p>Try changing your search or filters.</p></div>}</div>
      <div className="ad-pagination"><span>Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} leads</span><div className="ad-page-buttons"><button type="button" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} aria-label="Previous page" data-testid="button-page-previous"><ChevronLeft size={15}/></button><button className="current" type="button" data-testid="text-current-page">{page}</button><button type="button" onClick={() => setPage(Math.min(pageCount, page + 1))} disabled={page === pageCount} aria-label="Next page" data-testid="button-page-next"><ChevronRight size={15}/></button></div></div>
    </section>
    {adding && <Modal title="Add a sample lead" description="Create a fictional application in local demo state." onClose={() => setAdding(false)} footer={<><Button className="soft" onClick={() => setAdding(false)} data-testid="button-cancel-add-lead">Cancel</Button><Button type="submit" form="add-lead-form" data-testid="button-save-lead">Add to queue</Button></>}>
      <form id="add-lead-form" onSubmit={add} style={{ display: "contents" }}><label className="ad-field">Applicant name<input className="ad-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="input-new-lead-name"/></label><div className="ad-grid" style={{ gridTemplateColumns: "1fr 1fr" }}><label className="ad-field">Demo mobile label<input className="ad-input" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Demo mobile · 10041" data-testid="input-new-lead-phone"/></label><label className="ad-field">Sample email<input className="ad-input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@sample.saanjh.local" data-testid="input-new-lead-email"/></label></div><div className="ad-grid" style={{ gridTemplateColumns: "1fr 1fr" }}><label className="ad-field">Loan product<select className="ad-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} data-testid="select-new-lead-product">{LOAN_NAMES.map(t => <option key={t}>{t}</option>)}</select></label><label className="ad-field">Requested amount (₹)<input className="ad-input" type="number" min="1000" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} data-testid="input-new-lead-amount"/></label></div><div className="ad-grid" style={{ gridTemplateColumns: "1fr 1fr" }}><label className="ad-field">Monthly income (₹)<input className="ad-input" type="number" min="1" required value={form.income} onChange={e => setForm({ ...form, income: e.target.value })} data-testid="input-new-lead-income"/></label><label className="ad-field">Existing EMI (₹)<input className="ad-input" type="number" min="0" value={form.existingEmi} onChange={e => setForm({ ...form, existingEmi: e.target.value })} data-testid="input-new-lead-existing-emi"/></label></div><div className="ad-grid" style={{ gridTemplateColumns: "1fr 1fr" }}><label className="ad-field">City<select className="ad-select" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} data-testid="select-new-lead-city">{CITIES.map(c => <option key={c}>{c}</option>)}</select></label><label className="ad-field">Source<select className="ad-select" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} data-testid="select-new-lead-source">{SOURCES.map(c => <option key={c}>{c}</option>)}</select></label></div></form>
    </Modal>}
  </>;
}

function LeadDetail({ data }: { data: AppData }) {
  const { id = "" } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const lead = data.leads.find(l => l.id === id);
  const [targetStatus, setTargetStatus] = useState<Status | "">("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [follow, setFollow] = useState({ due: isoDate(new Date(Date.now() + 86400000).toISOString()), time: "10:00", note: "" });
  const [rejectDoc, setRejectDoc] = useState<DocumentItem | null>(null);
  const [docReason, setDocReason] = useState("");
  if (!lead) return <div className="ad-not-found"><FileText size={28}/><h1>Application not found</h1><p>This identifier is not part of the fictional demo dataset.</p><Link href="/admin/leads" className="ad-button" data-testid="link-return-leads"><ArrowLeft size={14}/> Back to leads</Link></div>;
  const update = (fn: (old: Lead) => Lead) => data.setLeads(prev => prev.map(l => l.id === lead.id ? fn(l) : l));
  const isClosed = ["Disbursed", "Rejected", "Not Reachable / Closed"].includes(lead.status);
  const nextStep = OPEN_PROGRESS.indexOf(lead.status) >= 0 && OPEN_PROGRESS.indexOf(lead.status) < OPEN_PROGRESS.length - 1 ? OPEN_PROGRESS[OPEN_PROGRESS.indexOf(lead.status) + 1] : null;
  const statusChoices: Status[] = isClosed
    ? ["Submitted"] : [...(nextStep ? [nextStep] : []), "Rejected", "Not Reachable / Closed"];
  const changeStatus = () => {
    if (!targetStatus) return;
    if ((targetStatus === "Rejected" || targetStatus === "Not Reachable / Closed") && !reason.trim()) { data.toast("A reason is required for this status."); return; }
    const now = new Date().toISOString(); const why = reason.trim() || (isClosed && targetStatus === "Submitted" ? "Reopened by Admin" : "Progressed to next review stage");
    update(l => ({ ...l, status: targetStatus, lastTouched: now, contactedAt: targetStatus === "Contacted" ? (l.contactedAt || now) : l.contactedAt, history: [{ from: l.status, status: targetStatus, at: now, by: "Anika Rao", note: why }, ...l.history] }));
    data.log("Status changed", `${lead.id} · ${targetStatus}${reason ? ` · ${reason}` : ""}`); data.toast(`${lead.id} moved to ${targetStatus}.`); setTargetStatus(""); setReason("");
  };
  const addNote = (e: FormEvent) => { e.preventDefault(); const now = new Date().toISOString(); update(l => ({ ...l, notes: [{ id: `note-${Date.now()}`, body: note.trim(), by: "Anika Rao", at: now }, ...l.notes], lastTouched: now })); data.log("Note added", lead.id); data.toast("Note added to the application."); setNote(""); };
  const addFollow = (e: FormEvent) => { e.preventDefault(); const due = new Date(`${follow.due}T${follow.time}:00`).toISOString(); update(l => ({ ...l, followups: [{ id: `follow-${Date.now()}`, due, note: follow.note.trim(), done: false }, ...l.followups] })); data.log("Follow-up scheduled", lead.id); data.toast("Follow-up added to the queue."); setFollow({ due: isoDate(new Date(Date.now() + 86400000).toISOString()), time: "10:00", note: "" }); };
  const resolveDoc = (doc: DocumentItem, state: DocState, why = "") => {
    update(l => ({ ...l, documents: l.documents.map(d => d.id === doc.id ? { ...d, state, reason: why || undefined } : d), lastTouched: new Date().toISOString() }));
    data.log(state === "Verified" ? "Document verified" : "Document rejected", `${lead.id} · ${doc.name}${why ? ` · ${why}` : ""}`); data.toast(`${doc.name} marked ${state.toLowerCase()}.`); setRejectDoc(null); setDocReason("");
  };
  const assign = (name: string) => { update(l => ({ ...l, assigned: name, lastTouched: new Date().toISOString() })); data.log("Lead assigned", `${lead.id} · ${name}`); data.toast(name === "Unassigned" ? "Lead assignment cleared." : `Assigned to ${name}.`); };
  const changeFollowState = (f: Followup) => { update(l => ({ ...l, followups: l.followups.map(item => item.id === f.id ? { ...item, done: !item.done } : item) })); data.log(f.done ? "Follow-up reopened" : "Follow-up completed", lead.id); data.toast(f.done ? "Follow-up reopened." : "Follow-up marked complete."); };
  return <>
    <div style={{ marginBottom: 15 }}><Link href="/admin/leads" className="ad-link" data-testid="link-back-to-leads"><ArrowLeft size={13} style={{ verticalAlign: "middle" }}/> All loan leads</Link></div>
    <PageHead title={lead.name} description={`${lead.id} · Added ${fmtDate(lead.created)} · ${lead.city}`} action={<><StatusPill value={lead.status}/><Button className="soft" onClick={() => { setTargetStatus(statusChoices[0] || ""); setReason(""); }} disabled={!statusChoices.length} data-testid="button-change-status"><RotateCcw size={14}/> Change stage</Button></>}/>
    <div className="ad-detail-grid">
      <div className="ad-detail-stack">
        <section className="ad-card ad-card-pad"><div className="ad-section-title"><div><h2>Application & customer</h2><p>Fictional sample record · do not use for a lending decision</p></div><span className="ad-demo-pill">SAMPLE</span></div>
          <div className="ad-info-grid">{[["Loan product", lead.type], ["Requested amount", rupees(lead.amount)], ["Monthly income", rupees(lead.income)], ["Existing EMI", rupees(lead.existingEmi)], ["City", lead.city], ["Source", lead.source], ["Phone", lead.phone], ["Email", lead.email], ["Created", fmtDate(lead.created)], ["Last touched", fmtTime(lead.lastTouched)]].map(([label, value]) => <div key={label}><span className="ad-info-label">{label}</span><span className="ad-info-value" data-testid={`value-${slug(label)}`}>{value}</span></div>)}</div>
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #e7eef7", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}><span><span className="ad-info-label">Mobile number confirmed</span><strong className="ad-info-value">{lead.mobileConfirmed ? "Confirmed" : "Not confirmed"}</strong></span><Button className="soft compact" onClick={() => { update(l => ({ ...l, mobileConfirmed: !l.mobileConfirmed, lastTouched: new Date().toISOString() })); data.log("Mobile confirmation updated", lead.id); data.toast(lead.mobileConfirmed ? "Mobile marked unconfirmed." : "Mobile marked confirmed."); }} data-testid="button-toggle-mobile-confirmed">{lead.mobileConfirmed ? "Mark unconfirmed" : "Confirm mobile"}</Button></div>
        </section>
        <section className="ad-card ad-card-pad"><div className="ad-section-title"><div><h2>Documents</h2><p>Review the provided sample checklist</p></div><span className="ad-demo-pill">{lead.documents.filter(d => d.state === "Verified").length}/{lead.documents.length} verified</span></div>
          {lead.documents.map(doc => <div className="ad-doc-row" key={doc.id} data-testid={`document-${doc.id}`}><div className="ad-doc-name"><span className="ad-metric-icon"><FileText size={15}/></span><span><strong>{doc.name}</strong><small>{doc.reason ? `Reason: ${doc.reason}` : "Sample checklist item"}</small></span></div><StatusPill value={doc.state}/><div className="ad-doc-actions">{doc.state !== "Verified" && <Button className="soft compact" onClick={() => resolveDoc(doc, "Verified")} data-testid={`button-verify-document-${doc.id}`}><Check size={13}/> Verify</Button>}{doc.state !== "Rejected" && <Button className="text compact" onClick={() => { setRejectDoc(doc); setDocReason(""); }} data-testid={`button-reject-document-${doc.id}`}>Reject</Button>}{doc.state === "Rejected" && <Button className="text compact" onClick={() => resolveDoc(doc, "Pending")} data-testid={`button-reset-document-${doc.id}`}>Reset</Button>}</div></div>)}
        </section>
        <section className="ad-card ad-card-pad"><div className="ad-section-title"><div><h2>Internal notes</h2><p>Team-only demo notes, stored in local component state</p></div></div>
          <form onSubmit={addNote}><label className="ad-field">Add a note<textarea className="ad-textarea" value={note} onChange={e => setNote(e.target.value)} placeholder="Capture a helpful next step…" required data-testid="input-lead-note"/></label><Button type="submit" style={{ marginTop: 9 }} data-testid="button-add-note"><Plus size={14}/> Add note</Button></form>
          <div className="ad-timeline" style={{ marginTop: 17 }}>{lead.notes.length ? lead.notes.map(n => <div className="ad-timeline-item" key={n.id}><i className="ad-timeline-dot"/><div className="ad-timeline-copy"><strong>{n.by}</strong><p>{n.body}</p><small>{fmtTime(n.at)}</small></div></div>) : <div className="ad-empty">No notes have been added to this sample application.</div>}</div>
        </section>
        <section className="ad-card ad-card-pad"><div className="ad-section-title"><div><h2>Status history</h2><p>Every stage update is recorded in the demo audit trail</p></div></div>
          <div className="ad-timeline">{lead.history.map((h, i) => <div className="ad-timeline-item" key={`${h.at}-${i}`} data-testid={`history-entry-${i}`}><i className="ad-timeline-dot"/><div className="ad-timeline-copy"><strong>{h.from ? `${h.from} → ${h.status}` : h.status}</strong><p>{h.note} · {h.by}</p><small>{fmtTime(h.at)}</small></div></div>)}</div>
        </section>
      </div>
      <aside className="ad-detail-stack">
        <section className="ad-card ad-card-pad"><div className="ad-section-title"><div><h2>Ownership</h2><p>Coordinate the next staff action</p></div></div><label className="ad-field">Assigned staff<select className="ad-select" value={lead.assigned} onChange={e => assign(e.target.value)} data-testid="select-lead-assignee"><option>Unassigned</option>{data.users.filter(u => u.active && u.role !== "Admin").map(u => <option key={u.id}>{u.name}</option>)}</select></label><div className="ad-info-label" style={{ marginTop: 14 }}>Current owner</div><div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 7 }}><span className="ad-avatar">{lead.assigned === "Unassigned" ? "—" : lead.assigned.split(" ").map(s => s[0]).join("")}</span><div><strong style={{ fontSize: 12 }}>{lead.assigned}</strong><small style={{ display: "block", color: "#89958b", fontSize: 10 }}>Last touched {fmtDate(lead.lastTouched)}</small></div></div></section>
        <section className="ad-card ad-card-pad"><div className="ad-section-title"><div><h2>Follow-ups</h2><p>Schedule and close the loop</p></div></div>
          <form onSubmit={addFollow} style={{ display: "grid", gap: 9 }}><div className="ad-grid" style={{ gridTemplateColumns: "1fr 1fr" }}><label className="ad-field">Due date<input className="ad-input" type="date" value={follow.due} onChange={e => setFollow({ ...follow, due: e.target.value })} required data-testid="input-followup-date"/></label><label className="ad-field">Due time<input className="ad-input" type="time" value={follow.time} onChange={e => setFollow({ ...follow, time: e.target.value })} required data-testid="input-followup-time"/></label></div><label className="ad-field">Next action<input className="ad-input" value={follow.note} onChange={e => setFollow({ ...follow, note: e.target.value })} placeholder="e.g. Confirm callback window" required data-testid="input-followup-note"/></label><Button className="soft" type="submit" data-testid="button-add-followup"><CalendarDays size={14}/> Schedule follow-up</Button></form>
          <div style={{ marginTop: 13 }}>{lead.followups.length ? lead.followups.map(f => <div className="ad-follow-card" key={f.id}><span><strong>{f.note}</strong><small>{fmtTime(f.due)} · {f.done ? "Completed" : new Date(f.due) < new Date() ? "Overdue" : "Upcoming"}</small></span><Button className="text compact" onClick={() => changeFollowState(f)} data-testid={`button-followup-${f.id}`}>{f.done ? "Reopen" : "Done"}</Button></div>) : <div className="ad-empty">No follow-ups scheduled.</div>}</div>
        </section>
        <section className="ad-card ad-card-pad"><div className="ad-section-title"><div><h2>Stage guidance</h2><p>Normal sequence is one stage at a time</p></div></div><p style={{ margin: 0, color: "#596e98", fontSize: 11, lineHeight: 1.65 }}>Submitted → Assigned → Contacted → Documents Pending → Documents Verified → In Process → Approved → Disbursed. Rejected and Not Reachable / Closed are available from any open stage and require a reason. This Admin demo can reopen a closed record.</p></section>
      </aside>
    </div>
    {targetStatus && <Modal title={`Move application to ${targetStatus}`} description="Status changes are added to history and the audit trail." onClose={() => { setTargetStatus(""); setReason(""); }} footer={<><Button className="soft" onClick={() => setTargetStatus("")} data-testid="button-cancel-status">Cancel</Button><Button className={targetStatus === "Rejected" || targetStatus === "Not Reachable / Closed" ? "danger" : ""} onClick={changeStatus} data-testid="button-confirm-status">Confirm stage change</Button></>}>
      <label className="ad-field">Next valid stage<select className="ad-select" value={targetStatus} onChange={e => { setTargetStatus(e.target.value as Status); setReason(""); }} data-testid="select-next-status">{statusChoices.map(s => <option key={s}>{s}</option>)}</select></label>
      <div className="ad-login-alert"><AlertTriangle size={14} style={{ display: "inline", marginRight: 6 }}/>Current: <strong>{lead.status}</strong> · Next: <strong>{targetStatus}</strong></div>
      {(targetStatus === "Rejected" || targetStatus === "Not Reachable / Closed") && <label className="ad-field">Reason required<textarea className="ad-textarea" value={reason} onChange={e => setReason(e.target.value)} required placeholder="Record the reason for this outcome" data-testid="input-status-reason"/></label>}
      {targetStatus === "Submitted" && <p style={{ color: "#6e7c73", fontSize: 12 }}>Reopen this sample record to the Submitted stage. This action is enabled for the Admin demo role.</p>}
    </Modal>}
    {rejectDoc && <Modal title={`Reject ${rejectDoc.name}`} description="A clear reason helps the team follow up consistently." onClose={() => setRejectDoc(null)} footer={<><Button className="soft" onClick={() => setRejectDoc(null)} data-testid="button-cancel-document-rejection">Cancel</Button><Button className="danger" disabled={!docReason.trim()} onClick={() => resolveDoc(rejectDoc, "Rejected", docReason.trim())} data-testid="button-confirm-document-rejection">Reject document</Button></>}><label className="ad-field">Rejection reason<textarea className="ad-textarea" required value={docReason} onChange={e => setDocReason(e.target.value)} placeholder="Explain what needs to be corrected" data-testid="input-document-rejection-reason"/></label></Modal>}
  </>;
}

function EnquiriesPage({ data }: { data: AppData }) {
  const [filter, setFilter] = useState("Open");
  const rows = data.enquiries.filter(e => filter === "All" || (filter === "Open" ? !e.handled : e.handled));
  const handle = (item: Enquiry) => { data.setEnquiries(p => p.map(e => e.id === item.id ? { ...e, handled: !e.handled } : e)); data.log(item.handled ? "Enquiry reopened" : "Enquiry handled", item.id); data.toast(item.handled ? "Enquiry returned to the open queue." : "Enquiry marked handled."); };
  return <><PageHead title="Enquiries" description="Contact requests and callback items, ready for a staff response."/><div className="ad-toolbar">{["Open", "Handled", "All"].map(f => <Button className={filter === f ? "" : "soft"} key={f} onClick={() => setFilter(f)} data-testid={`tab-enquiries-${slug(f)}`}>{f} <span style={{ opacity: .72 }}>({data.enquiries.filter(e => f === "All" || e.handled === (f === "Handled")).length})</span></Button>)}<span className="ad-demo-pill">DEMO · local queue</span></div>
     <section className="ad-card"><div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Request</th><th>Type</th><th>Contact</th><th>Message</th><th>Received</th><th>State</th><th>Action</th></tr></thead><tbody>{rows.map(e => <tr key={e.id} data-testid={`row-enquiry-${e.id}`}><td data-label="Request"><strong>{e.id}</strong><small>{e.name}</small></td><td data-label="Type">{e.type}</td><td data-label="Contact">{e.phone}<small>{e.email}</small></td><td data-label="Message">{e.message}</td><td data-label="Received">{fmtTime(e.created)}</td><td data-label="State"><StatusPill value={e.handled ? "Handled" : "Pending"}/></td><td data-label="Action"><Button className={e.handled ? "soft compact" : "compact"} onClick={() => handle(e)} data-testid={`button-handle-enquiry-${e.id}`}>{e.handled ? "Reopen" : "Mark handled"}</Button></td></tr>)}</tbody></table>{rows.length === 0 && <div className="ad-empty"><MessageSquareText size={22}/><strong>Nothing in this view</strong><p>Enquiry updates are local to this demo.</p></div>}</div></section>
  </>;
}

function TeamPage({ data }: { data: AppData }) {
  const active = data.users.filter(u => u.active && u.role !== "Admin");
  const openStatuses = new Set<Status>(OPEN_PROGRESS.slice(0, -1));
  const overdue = data.leads.flatMap(l => l.followups.filter(f => !f.done && new Date(f.due) < new Date()).map(f => ({ lead: l, follow: f })));
  const workloads = active.map(u => {
    const owned = data.leads.filter(l => l.assigned === u.name && openStatuses.has(l.status));
    const untouched = owned.filter(l => l.status === "Assigned" || l.status === "Submitted").sort((a, b) => a.created.localeCompare(b.created));
    return { user: u, owned, untouched, overdue: overdue.filter(o => o.lead.assigned === u.name).length };
  });
  return <><PageHead title="Team workload" description="Balance active applications, stale first contacts and overdue commitments." action={<Link href="/admin/users" className="ad-button soft" data-testid="link-manage-staff">Manage staff <Users size={14}/></Link>}/>
    <div className="ad-grid ad-metrics">{[{ label: "Active staff", value: active.length, note: "Staff and managers", icon: Users }, { label: "Open applications", value: data.leads.filter(l => openStatuses.has(l.status)).length, note: "Across the team", icon: BriefcaseBusiness }, { label: "Oldest untouched", value: data.leads.filter(l => ["Submitted", "Assigned"].includes(l.status)).length, note: "Awaiting a first touch", icon: Clock3 }, { label: "Overdue follow-ups", value: overdue.length, note: "Sample actions past due", icon: AlertTriangle }].map(m => { const I = m.icon; return <div className="ad-card ad-metric" key={m.label}><div className="ad-metric-top"><span>{m.label}</span><span className="ad-metric-icon"><I size={16}/></span></div><strong>{m.value}</strong><small>{m.note}</small></div>; })}</div>
    <section className="ad-card"><div className="ad-card-title"><div><h2>Staff queue health</h2><p>Open workload and the oldest untouched sample leads</p></div><span className="ad-demo-pill">ADMIN DEMO</span></div><div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Staff member</th><th>Role</th><th>Open leads</th><th>Untouched</th><th>Overdue follow-ups</th><th>Oldest lead</th></tr></thead><tbody>{workloads.map(w => <tr key={w.user.id} data-testid={`row-workload-${w.user.id}`}><td data-label="Staff member"><strong>{w.user.name}</strong><small>{w.user.email}</small></td><td data-label="Role">{w.user.role}</td><td data-label="Open leads"><span className="ad-cell-primary">{w.owned.length}</span></td><td data-label="Untouched">{w.untouched.length}</td><td data-label="Overdue follow-ups"><StatusPill value={w.overdue ? "Overdue" : "Clear"}/></td><td data-label="Oldest lead">{w.untouched[0] ? <Link href={`/admin/leads/${w.untouched[0].id}`} className="ad-link">{w.untouched[0].name}<small>{fmtDate(w.untouched[0].created)}</small></Link> : "—"}</td></tr>)}</tbody></table></div></section>
    <section className="ad-card" style={{ marginTop: 15 }}><div className="ad-card-title"><div><h2>Overdue follow-ups</h2><p>Items past their due date that still need a disposition</p></div></div><div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Lead</th><th>Owner</th><th>Action</th><th>Due</th><th>Stage</th></tr></thead><tbody>{overdue.map(({ lead, follow }) => <tr key={follow.id}><td data-label="Lead"><Link className="ad-cell-primary" href={`/admin/leads/${lead.id}`} data-testid={`link-overdue-lead-${follow.id}`}>{lead.name}<small>{lead.id}</small></Link></td><td data-label="Owner">{lead.assigned}</td><td data-label="Action">{follow.note}</td><td data-label="Due">{fmtTime(follow.due)}</td><td data-label="Stage"><StatusPill value="Overdue"/></td></tr>)}</tbody></table>{!overdue.length && <div className="ad-empty">No overdue follow-ups in the sample data.</div>}</div></section>
  </>;
}

function ReportsPage({ data }: { data: AppData }) {
  const [from, setFrom] = useState(isoDate(dateOffset(30))); const [to, setTo] = useState(isoDate(new Date().toISOString()));
  const rows = data.leads.filter(l => isoDate(l.created) >= from && isoDate(l.created) <= to);
  const breakdown = (key: (l: Lead) => string) => {
    const map = new Map<string, number>(); rows.forEach(l => map.set(key(l), (map.get(key(l)) || 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };
  const groups = [{ name: "Loan product", data: breakdown(l => l.type) }, { name: "City", data: breakdown(l => l.city) }, { name: "Source", data: breakdown(l => l.source) }, { name: "Status", data: breakdown(l => l.status) }, { name: "Assigned staff", data: breakdown(l => l.assigned) }];
  const disbursed = rows.filter(l => l.status === "Disbursed").length;
   const contacted = rows.filter(l => l.contactedAt);
   const avgDays = contacted.length ? contacted.reduce((sum, l) => sum + Math.max(0, (new Date(l.contactedAt!).getTime() - new Date(l.created).getTime()) / 86400000), 0) / contacted.length : 0;
  const convert = rows.length ? disbursed / rows.length * 100 : 0;
   const conversions = (key: (l: Lead) => string) => {
     const map = new Map<string, { total: number; disbursed: number }>();
     rows.forEach(l => { const group = key(l); const current = map.get(group) || { total: 0, disbursed: 0 }; current.total += 1; if (l.status === "Disbursed") current.disbursed += 1; map.set(group, current); });
     return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
   };
   const conversionGroups = [{ name: "By staff", rows: conversions(l => l.assigned) }, { name: "By loan type", rows: conversions(l => l.type) }];
   const exportCsv = () => { csvDownload("saanjh-demo-report.csv", ["Lead ID", "Applicant", "Loan type", "City", "Source", "Status", "Staff", "Amount (INR)", "Created", "Contacted"], rows.map(l => [l.id, l.name, l.type, l.city, l.source, l.status, l.assigned, l.amount, isoDate(l.created), l.contactedAt ? isoDate(l.contactedAt) : ""])); data.log("Report CSV exported", `${rows.length} sample leads`); data.toast("Sample report downloaded; export noted in the demo audit log."); };
  return <><PageHead title="Reports" description="Date-filtered sample funnel, source and workload breakdowns." action={<Button className="soft" onClick={exportCsv} data-testid="button-export-report"><ArrowDownToLine size={14}/> Download CSV</Button>}/>
    <div className="ad-toolbar"><label className="ad-field">From<input className="ad-input" type="date" value={from} onChange={e => setFrom(e.target.value)} data-testid="input-report-from"/></label><label className="ad-field">To<input className="ad-input" type="date" value={to} onChange={e => setTo(e.target.value)} data-testid="input-report-to"/></label><span className="ad-demo-pill">DEMO · {rows.length} leads in range</span></div>
    <div className="ad-report-summary"><article className="ad-card"><small>Sample applications</small><strong data-testid="report-total">{rows.length}</strong></article><article className="ad-card"><small>Disbursed conversion</small><strong data-testid="report-conversion">{convert.toFixed(1)}%</strong></article><article className="ad-card"><small>Average time from Submitted to Contacted</small><strong data-testid="report-time-to-contact">{contacted.length ? `${avgDays.toFixed(1)} days` : "—"}</strong></article></div>
    <section className="ad-card" style={{ marginBottom: 15 }}><div className="ad-card-title"><div><h2>Breakdown by dimension</h2><p>Counts use the selected created-date range · indicative demo data only</p></div></div><div className="ad-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", padding: "0 15px 15px" }}>{groups.map(group => { const max = Math.max(1, ...group.data.map(([, n]) => n)); return <article className="ad-card" key={group.name}><div className="ad-card-title"><div><h2>{group.name}</h2></div></div><div className="ad-bar-chart">{group.data.length ? group.data.map(([label, count]) => <div className="ad-bar-row" key={label}><span title={label}>{label}</span><div className="ad-bar"><i style={{ width: `${count / max * 100}%` }}/></div><strong>{count}</strong></div>) : <div className="ad-empty">No records for these dates.</div>}</div></article>; })}</div></section>
    <section className="ad-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", marginBottom: 15 }}>{conversionGroups.map(group => <article className="ad-card" key={group.name}><div className="ad-card-title"><div><h2>Disbursed conversion {group.name.toLowerCase()}</h2><p>Disbursed leads divided by all leads in this date range</p></div></div><div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>{group.name === "By staff" ? "Staff member" : "Loan type"}</th><th>Leads</th><th>Disbursed</th><th>Rate</th></tr></thead><tbody>{group.rows.map(([name, counts]) => <tr key={name}><td data-label={group.name}>{name}</td><td data-label="Leads">{counts.total}</td><td data-label="Disbursed">{counts.disbursed}</td><td data-label="Rate">{(counts.disbursed / counts.total * 100).toFixed(1)}%</td></tr>)}</tbody></table>{!group.rows.length && <div className="ad-empty">No records in this date range.</div>}</div></article>)}</section>
    <section className="ad-card ad-card-pad"><h2 style={{ margin: "0 0 9px", fontSize: 13 }}>Metric notes</h2><p style={{ margin: 0, color: "#78867d", fontSize: 11, lineHeight: 1.7 }}>Conversion is disbursed records divided by all created sample leads in the selected period. Time-to-contact uses the first recorded Submitted-to-Contacted interval. These figures are illustrative and are not operational or credit-performance evidence.</p></section>
  </>;
}

function UsersPage({ data }: { data: AppData }) {
  const blank = { name: "", email: "", role: "Staff" as Role, active: true, joined: isoDate(new Date().toISOString()) };
  const [editing, setEditing] = useState<StaffUser | null>(null); const [modal, setModal] = useState(false); const [form, setForm] = useState(blank); const [query, setQuery] = useState("");
  const begin = (user?: StaffUser) => { setEditing(user || null); setForm(user ? { name: user.name, email: user.email, role: user.role, active: user.active, joined: user.joined } : { ...blank }); setModal(true); };
  const save = (e: FormEvent) => { e.preventDefault(); if (editing) { data.setUsers(prev => prev.map(u => u.id === editing.id ? { ...u, ...form } : u)); data.log("Staff updated", editing.id); data.toast("Staff profile updated."); } else { const created: StaffUser = { ...form, id: `usr-${Date.now()}` }; data.setUsers(prev => [...prev, created]); data.log("Staff created", created.id); data.toast("Staff member added to the sample workspace."); } setModal(false); };
  const toggle = (u: StaffUser) => { data.setUsers(prev => prev.map(item => item.id === u.id ? { ...item, active: !item.active } : item)); data.log(u.active ? "Staff deactivated" : "Staff activated", u.id); data.toast(u.active ? `${u.name} deactivated in demo.` : `${u.name} reactivated in demo.`); };
  const users = data.users.filter(u => u.role !== "Admin" && `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <PageHead title="Staff & access" description="Manage demo team profiles, roles and active state." action={<Button onClick={() => begin()} data-testid="button-add-user"><Plus size={15}/> Add staff member</Button>}/>
    <div className="ad-toolbar"><label className="ad-search"><Search size={15}/><input className="ad-input" placeholder="Search staff name, email or role" value={query} onChange={e => setQuery(e.target.value)} data-testid="input-search-users"/></label><span className="ad-demo-pill">LOCAL DEMO · No authentication</span></div>
    <section className="ad-card"><div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Staff member</th><th>Role</th><th>Joined</th><th>Active state</th><th>Actions</th></tr></thead><tbody>{users.map(u => <tr key={u.id} data-testid={`row-user-${u.id}`}><td data-label="Staff member"><strong>{u.name}</strong><small>{u.email}</small></td><td data-label="Role">{u.role}</td><td data-label="Joined">{fmtDate(u.joined)}</td><td data-label="Active state"><StatusPill value={u.active ? "Active" : "Inactive"}/></td><td data-label="Actions"><div style={{ display: "flex", gap: 5 }}><Button className="soft compact" onClick={() => begin(u)} data-testid={`button-edit-user-${u.id}`}><Pencil size={12}/> Edit</Button><Button className="text compact" onClick={() => toggle(u)} data-testid={`button-toggle-user-${u.id}`}><Power size={12}/>{u.active ? "Deactivate" : "Activate"}</Button></div></td></tr>)}</tbody></table>{users.length === 0 && <div className="ad-empty">No matching staff profiles.</div>}</div></section>
    {modal && <Modal title={editing ? "Edit staff profile" : "Add staff member"} description="Demo directory only. This does not create a login or grant real access." onClose={() => setModal(false)} footer={<><Button className="soft" onClick={() => setModal(false)} data-testid="button-cancel-user">Cancel</Button><Button type="submit" form="user-form" data-testid="button-save-user">Save profile</Button></>}>
       <form id="user-form" onSubmit={save} style={{ display: "contents" }}><label className="ad-field">Full name<input className="ad-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="input-user-name"/></label><label className="ad-field">Work email<input className="ad-input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@demo.saanjh.local" data-testid="input-user-email"/></label><div className="ad-grid" style={{ gridTemplateColumns: "1fr 1fr" }}><label className="ad-field">Role<select className="ad-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Role })} data-testid="select-user-role"><option>Staff</option><option>Manager</option></select></label><label className="ad-field">Active<select className="ad-select" value={form.active ? "yes" : "no"} onChange={e => setForm({ ...form, active: e.target.value === "yes" })} data-testid="select-user-active"><option value="yes">Active</option><option value="no">Inactive</option></select></label></div></form>
    </Modal>}
  </>;
}

function LoanTypesPage({ data }: { data: AppData }) {
  const empty: LoanProduct = { id: "", name: "", min: 10000, max: 500000, rate: 12, minTenure: 1, tenure: 36, fee: 0, eligibility: "", documents: "", active: true };
  const [modal, setModal] = useState(false); const [editingId, setEditingId] = useState<string | null>(null); const [form, setForm] = useState<LoanProduct>(empty); const [deleteProduct, setDeleteProduct] = useState<LoanProduct | null>(null);
  const begin = (product?: LoanProduct) => { setEditingId(product?.id || null); setForm(product ? { ...product } : { ...empty }); setModal(true); };
  const save = (e: FormEvent) => {
    e.preventDefault(); const name = form.name.trim(); const id = editingId || `${slug(name)}-${Date.now().toString().slice(-4)}`;
    const item = { ...form, id, name };
    if (editingId) { data.setProducts(prev => prev.map(p => p.id === editingId ? item : p)); data.log("Loan product updated", id); data.toast(`${name} product updated.`); }
    else { data.setProducts(prev => [...prev, item]); data.log("Loan product created", id); data.toast(`${name} product added.`); }
    setModal(false);
  };
  const toggle = (p: LoanProduct) => { data.setProducts(prev => prev.map(x => x.id === p.id ? { ...x, active: !x.active } : x)); data.log(p.active ? "Loan product deactivated" : "Loan product activated", p.id); data.toast(`${p.name} ${p.active ? "deactivated" : "activated"}.`); };
  const remove = () => { if (!deleteProduct) return; data.setProducts(prev => prev.filter(p => p.id !== deleteProduct.id)); data.log("Loan product deleted", deleteProduct.id); data.toast(`${deleteProduct.name} removed from the demo catalogue.`); setDeleteProduct(null); };
  return <>
    <PageHead title="Loan products" description="Maintain the six illustrative product terms shown in this sample workspace." action={<Button onClick={() => begin()} data-testid="button-add-loan-type"><Plus size={15}/> Add product</Button>}/>
     <section className="ad-card"><div className="ad-card-title"><div><h2>Product catalogue</h2><p>Rates, fees and criteria here are examples only and are not an offer</p></div><span className="ad-demo-pill">{data.products.length} PRODUCTS</span></div><div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Product</th><th>Indicative amount range</th><th>Rate p.a.</th><th>Tenure range</th><th>Lender fee (demo)</th><th>State</th><th>Actions</th></tr></thead><tbody>{data.products.map(p => <tr key={p.id} data-testid={`row-loan-type-${p.id}`}><td data-label="Product"><strong>{p.name}</strong><small>{p.documents}</small></td><td data-label="Indicative amount range">{rupees(p.min)} – {rupees(p.max)}</td><td data-label="Rate p.a.">From {p.rate}%</td><td data-label="Tenure range">{p.minTenure}–{p.tenure} months</td><td data-label="Lender fee (demo)">{rupees(p.fee)}</td><td data-label="State"><StatusPill value={p.active ? "Active" : "Inactive"}/></td><td data-label="Actions"><div style={{ display: "flex", gap: 4 }}><Button className="soft compact" onClick={() => begin(p)} data-testid={`button-edit-product-${p.id}`}><Pencil size={12}/> Edit</Button><Button className="text compact" onClick={() => toggle(p)} data-testid={`button-toggle-product-${p.id}`} aria-label={`${p.active ? "Deactivate" : "Activate"} ${p.name}` }><Power size={12}/></Button><Button className="text compact" onClick={() => setDeleteProduct(p)} data-testid={`button-delete-product-${p.id}`}>Delete</Button></div></td></tr>)}</tbody></table>{data.products.length === 0 && <div className="ad-empty"><Banknote size={22}/><strong>No products configured</strong><p>Add a sample product to the catalogue.</p></div>}</div></section>
     <div className="ad-login-alert" style={{ marginTop: 14 }}>All values are illustrative and require partner-lender confirmation. Chakrapay does not charge an advance or processing fee; any lender-side fee shown here is only a sample field.</div>
    {modal && <Modal title={editingId ? "Edit loan product" : "Add loan product"} description="Edit the local sample catalogue only." onClose={() => setModal(false)} footer={<><Button className="soft" onClick={() => setModal(false)} data-testid="button-cancel-product">Cancel</Button><Button type="submit" form="product-form" data-testid="button-save-product">Save product</Button></>}>
       <form id="product-form" onSubmit={save} style={{ display: "contents" }}><label className="ad-field">Product name<input className="ad-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="input-product-name"/></label><div className="ad-grid" style={{ gridTemplateColumns: "1fr 1fr" }}><label className="ad-field">Minimum amount (₹)<input className="ad-input" type="number" min="0" required value={form.min} onChange={e => setForm({ ...form, min: Number(e.target.value) })} data-testid="input-product-min"/></label><label className="ad-field">Maximum amount (₹)<input className="ad-input" type="number" min={form.min} required value={form.max} onChange={e => setForm({ ...form, max: Number(e.target.value) })} data-testid="input-product-max"/></label></div><div className="ad-grid" style={{ gridTemplateColumns: "1fr 1fr" }}><label className="ad-field">Indicative rate from (% p.a.)<input className="ad-input" type="number" min="0" step=".05" required value={form.rate} onChange={e => setForm({ ...form, rate: Number(e.target.value) })} data-testid="input-product-rate"/></label><label className="ad-field">Illustrative lender fee (₹)<input className="ad-input" type="number" min="0" required value={form.fee} onChange={e => setForm({ ...form, fee: Number(e.target.value) })} data-testid="input-product-fee"/></label></div><div className="ad-grid" style={{ gridTemplateColumns: "1fr 1fr" }}><label className="ad-field">Minimum tenure (months)<input className="ad-input" type="number" min="1" max={form.tenure} required value={form.minTenure} onChange={e => setForm({ ...form, minTenure: Number(e.target.value) })} data-testid="input-product-min-tenure"/></label><label className="ad-field">Maximum tenure (months)<input className="ad-input" type="number" min={form.minTenure} required value={form.tenure} onChange={e => setForm({ ...form, tenure: Number(e.target.value) })} data-testid="input-product-tenure"/></label></div><label className="ad-field">Eligibility criteria<textarea className="ad-textarea" required value={form.eligibility} onChange={e => setForm({ ...form, eligibility: e.target.value })} data-testid="input-product-eligibility"/></label><label className="ad-field">Required documents<textarea className="ad-textarea" required value={form.documents} onChange={e => setForm({ ...form, documents: e.target.value })} data-testid="input-product-documents"/></label><label className="ad-field">Catalogue state<select className="ad-select" value={form.active ? "active" : "inactive"} onChange={e => setForm({ ...form, active: e.target.value === "active" })} data-testid="select-product-active"><option value="active">Active</option><option value="inactive">Inactive</option></select></label></form>
    </Modal>}
    {deleteProduct && <Modal title="Remove this product?" description={`${deleteProduct.name} will be removed from the local demo catalogue.`} onClose={() => setDeleteProduct(null)} footer={<><Button className="soft" onClick={() => setDeleteProduct(null)} data-testid="button-cancel-delete-product">Keep product</Button><Button className="danger" onClick={remove} data-testid="button-confirm-delete-product">Remove product</Button></>}><p style={{ color: "#75837a", fontSize: 12 }}>This action affects only this page session and can be reset by reloading.</p></Modal>}
  </>;
}

function AuditPage({ data }: { data: AppData }) {
  const [query, setQuery] = useState("");
  const visible = data.audit.filter(a => `${a.action} ${a.entity} ${a.user} ${a.ip}`.toLowerCase().includes(query.toLowerCase()));
  const exportAudit = () => { csvDownload("saanjh-demo-audit.csv", ["Action", "Entity", "User", "Time", "IP"], visible.map(a => [a.action, a.entity, a.user, a.time, a.ip])); data.log("Audit CSV exported", `${visible.length} sample actions`); data.toast("Sample audit log downloaded; export noted in this session."); };
  return <>
    <PageHead title="Audit log" description="A trace of key actions within the current sample session." action={<Button className="soft" onClick={exportAudit} data-testid="button-export-audit"><ArrowDownToLine size={14}/> Export CSV</Button>}/>
    <div className="ad-toolbar"><label className="ad-search"><Search size={15}/><input className="ad-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search actions, entities, users or IP" data-testid="input-search-audit"/></label><span className="ad-demo-pill">LOCAL SESSION · fictional IPs</span></div>
    <section className="ad-card"><div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Action</th><th>Entity</th><th>User</th><th>Time</th><th>IP address</th></tr></thead><tbody>{visible.map(a => <tr key={a.id} data-testid={`row-audit-${a.id}`}><td data-label="Action"><strong>{a.action}</strong><small>{a.id}</small></td><td data-label="Entity">{a.entity}</td><td data-label="User">{a.user}</td><td data-label="Time">{fmtTime(a.time)}</td><td data-label="IP address"><code>{a.ip}</code></td></tr>)}</tbody></table>{visible.length === 0 && <div className="ad-empty"><ShieldCheck size={22}/><strong>No matching audit actions</strong><p>Actions recorded during this session appear here.</p></div>}</div></section>
    <p style={{ color: "#7f8b82", fontSize: 10, marginTop: 10 }}>Demo audit history is held in React state only, is not tamper-resistant, and resets on reload. It is not a compliance record.</p>
  </>;
}

function NotFound() { return <div className="ad-not-found"><CircleHelp size={31}/><p className="ad-kicker">Admin demo</p><h1>This desk view does not exist.</h1><p>The path is outside the available Chakrapay admin demo routes. Choose a workspace destination below.</p><div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>{NAV.slice(0, 4).map(n => <Link className="ad-button soft" href={n.href} key={n.href} data-testid={`link-not-found-${slug(n.label)}`}>{n.label}</Link>)}</div></div>; }

export function AdminApp() {
  const [leads, setLeads] = useState<Lead[]>(makeLeads);
  const [users, setUsers] = useState<StaffUser[]>(STAFF_SEED);
  const [products, setProducts] = useState<LoanProduct[]>(PRODUCTS_SEED);
  const [enquiries, setEnquiries] = useState<Enquiry[]>(ENQUIRIES_SEED);
  const [audit, setAudit] = useState<AuditEntry[]>(AUDIT_SEED);
  const [toastMessage, setToastMessage] = useState("");
  const [path] = useLocation();
  const notify = (text: string) => setToastMessage(text);
  const log = (action: string, entity: string) => setAudit(prev => [{ id: `AU-${Date.now()}`, action, entity, user: "Anika Rao", time: new Date().toISOString(), ip: "10.24.3.14" }, ...prev]);
  useEffect(() => { if (!toastMessage) return; const timer = window.setTimeout(() => setToastMessage(""), 2800); return () => window.clearTimeout(timer); }, [toastMessage]);
  const data: AppData = { leads, setLeads, users, setUsers, products, setProducts, enquiries, setEnquiries, audit, log, toast: notify, toastMessage };
  if (path === "/admin/login") return <Login toast={notify}/>;
  if (!path.startsWith("/admin")) return <div className="sa-admin"><NotFound/></div>;
  return <AdminShell data={data}><Switch>
    <Route path="/admin">{() => <Dashboard data={data}/>}</Route>
    <Route path="/admin/leads">{() => <LeadsPage data={data}/>}</Route>
    <Route path="/admin/leads/:id">{() => <LeadDetail data={data}/>}</Route>
    <Route path="/admin/enquiries">{() => <EnquiriesPage data={data}/>}</Route>
    <Route path="/admin/team">{() => <TeamPage data={data}/>}</Route>
    <Route path="/admin/reports">{() => <ReportsPage data={data}/>}</Route>
    <Route path="/admin/users">{() => <UsersPage data={data}/>}</Route>
    <Route path="/admin/loan-types">{() => <LoanTypesPage data={data}/>}</Route>
    <Route path="/admin/audit">{() => <AuditPage data={data}/>}</Route>
    <Route component={NotFound}/>
  </Switch></AdminShell>;
}

export default AdminApp;