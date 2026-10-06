import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Route, Switch, useLocation } from 'wouter';
import { Activity, ArrowRight, BriefcaseBusiness, Check, CircleHelp, LayoutDashboard, LockKeyhole, LogOut, Menu, MessageSquareText, ShieldCheck, UserRound, Users, Wallet, X } from 'lucide-react';
import { login, logout, TEAM_ROLES, type Role } from '../lib/api';
import { useUser } from '../components/shell';
import { Button, errText, initials, slug } from './ui';
import { Dashboard } from './Dashboard';
import { LeadDetail, LeadsPage } from './Leads';
import { EnquiriesPage } from './Enquiries';
import { ReportsPage, TeamPage } from './Reports';
import { AuditPage, LoanTypesPage, UsersPage } from './Manage';
import './admin.css';

type Level = 'team' | 'manager' | 'admin';
const NAV: { label: string; href: string; icon: (p: { size?: number }) => ReactNode; group: string; level: Level }[] = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard, group: 'WORKSPACE', level: 'team' },
  { label: 'Loan leads', href: '/admin/leads', icon: BriefcaseBusiness, group: 'WORKSPACE', level: 'team' },
  { label: 'Enquiries', href: '/admin/enquiries', icon: MessageSquareText, group: 'WORKSPACE', level: 'team' },
  { label: 'Team workload', href: '/admin/team', icon: Users, group: 'WORKSPACE', level: 'manager' },
  { label: 'Reports', href: '/admin/reports', icon: Activity, group: 'MANAGE', level: 'manager' },
  { label: 'Staff & access', href: '/admin/users', icon: UserRound, group: 'MANAGE', level: 'admin' },
  { label: 'Loan products', href: '/admin/loan-types', icon: Wallet, group: 'MANAGE', level: 'admin' },
  { label: 'Audit log', href: '/admin/audit', icon: ShieldCheck, group: 'MANAGE', level: 'admin' },
];
const allowed = (role: Role, level: Level) => level === 'team' ? TEAM_ROLES.includes(role) : level === 'manager' ? role === 'manager' || role === 'admin' : role === 'admin';
const ROLE_LABEL: Record<string, string> = { admin: 'Admin', manager: 'Manager', staff: 'Staff', customer: 'Customer' };

function Toasts() {
  const [text, setText] = useState('');
  useEffect(() => {
    let t: number;
    const on = (e: Event) => { setText(String((e as CustomEvent).detail)); window.clearTimeout(t); t = window.setTimeout(() => setText(''), 3200); };
    window.addEventListener('ad-toast', on); return () => { window.removeEventListener('ad-toast', on); window.clearTimeout(t); };
  }, []);
  return text ? <div className="ad-toast" role="status" data-testid="toast-message"><Check size={16}/>{text}</div> : null;
}

function Login() {
  const [path, navigate] = useLocation(); const user = useUser();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { const u = await login(email.trim(), password); if (!TEAM_ROLES.includes(u.role)) { logout(); setErr('This area is only for the Chakrapay team. Customers can log in from the main website.'); } else if (path === '/admin/login') navigate('/admin'); }
    catch (x) { setErr(errText(x)); } finally { setBusy(false); }
  };
  return <div className="sa-admin ad-login-wrap"><section className="ad-card ad-login-card">
    <div className="ad-brand"><span className="ad-brand-mark"><img src="/chakrapay-mark.png" alt="" /></span><span><span className="ad-brand-name">Chakrapay<i>.</i></span><small>Operations desk</small></span></div>
    <p className="ad-kicker">Team sign-in</p><h1>Welcome to the desk.</h1><p>Sign in with your work email and password. Staff, managers and admins use the same screen.</p>
    {user && !TEAM_ROLES.includes(user.role) && <div className="ad-login-alert">You are signed in as a customer. <button type="button" className="ad-link" onClick={logout}>Log out</button> to use a team account.</div>}
    <form className="ad-login-form" onSubmit={submit}>
      <label className="ad-field">Work email<input className="ad-input" type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} data-testid="input-admin-email"/></label>
      <label className="ad-field">Password<input className="ad-input" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} data-testid="input-admin-password"/></label>
      {err && <div className="ad-login-alert" role="alert" data-testid="admin-login-error"><LockKeyhole size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }}/>{err}</div>}
      <Button type="submit" disabled={busy} data-testid="button-admin-login">{busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={14}/></Button>
    </form>
    <p style={{ marginTop: 16, fontSize: 11 }}>Accounts are created by your Admin. After 5 wrong tries an account is locked for 15 minutes.</p>
    <Link href="/" className="ad-link" data-testid="link-back-to-site">Back to the website</Link>
  </section></div>;
}

function AdminShell({ children }: { children: ReactNode }) {
  const user = useUser()!; const [path] = useLocation(); const [menu, setMenu] = useState(false);
  const nav = NAV.filter(n => allowed(user.role, n.level));
  return <div className="sa-admin ad-frame">
    <aside className={`ad-sidebar ${menu ? 'open' : ''}`}>
      <Link href="/admin" className="ad-brand" data-testid="link-admin-brand"><span className="ad-brand-mark"><img src="/chakrapay-mark.png" alt="" /></span><span><span className="ad-brand-name">Chakrapay<i>.</i></span><small>Operations desk</small></span></Link>
      {['WORKSPACE', 'MANAGE'].map(group => nav.some(n => n.group === group) && <div key={group}><p className="ad-nav-label">{group}</p><nav className="ad-nav">{nav.filter(n => n.group === group).map(n => {
        const active = n.href === '/admin' ? path === n.href : path === n.href || path.startsWith(`${n.href}/`); const Icon = n.icon;
        return <Link key={n.href} href={n.href} onClick={() => setMenu(false)} className={active ? 'active' : ''} data-testid={`link-admin-${slug(n.label)}`}><Icon size={16}/>{n.label}</Link>;
      })}</nav></div>)}
      <div className="ad-sidebar-bottom">
        <div className="ad-sidebar-demo"><strong><CircleHelp size={13}/> {ROLE_LABEL[user.role].toUpperCase()}</strong>{user.role === 'staff' ? 'You see the leads assigned to you.' : user.role === 'manager' ? 'You see all leads and your team.' : 'You have full access.'}</div>
        <div className="ad-user-chip"><span className="ad-avatar">{initials(user.name)}</span><span><strong>{user.name}</strong><small>{ROLE_LABEL[user.role]}</small></span></div>
        <Button className="soft compact" onClick={logout} data-testid="button-admin-logout" style={{ marginTop: 8, width: '100%' }}><LogOut size={13}/> Log out</Button>
      </div>
    </aside>
    <main className="ad-main">
      <header className="ad-topbar"><div className="ad-top-left"><button type="button" className="ad-menu-button" onClick={() => setMenu(!menu)} aria-label="Toggle navigation" data-testid="button-mobile-navigation">{menu ? <X size={18}/> : <Menu size={18}/>}</button><span className="ad-topbar-title">LSP admin workbench</span></div>
        <div className="ad-top-actions"><span className="ad-top-date">{new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date())}</span><Link href="/" className="ad-link">View website</Link></div></header>
      <div className="ad-content">{children}</div>
    </main>
    <nav className="ad-mobile-nav">{nav.slice(0, 4).map(n => { const I = n.icon; return <Link key={n.href} href={n.href} className={(path === n.href || (n.href !== '/admin' && path.startsWith(`${n.href}/`))) ? 'active' : ''} data-testid={`mobile-link-${slug(n.label)}`}><I/><span>{n.label.split(' ')[0]}</span></Link>; })}</nav>
    <Toasts/>
  </div>;
}

function NotFound() {
  const user = useUser();
  return <div className="ad-not-found"><CircleHelp size={31}/><p className="ad-kicker">Admin</p><h1>This page does not exist.</h1><p>Choose a place to go from the options below.</p><div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>{NAV.filter(n => user && allowed(user.role, n.level)).slice(0, 4).map(n => <Link className="ad-button soft" href={n.href} key={n.href}>{n.label}</Link>)}</div></div>;
}
function Guard({ level, children }: { level: Level; children: ReactNode }) {
  const user = useUser();
  if (user && allowed(user.role, level)) return <>{children}</>;
  return <div className="ad-not-found"><ShieldCheck size={31}/><p className="ad-kicker">No access</p><h1>This page is not available to your role.</h1><p>Ask an Admin if you need access.</p><Link href="/admin" className="ad-button">Back to overview</Link></div>;
}

export function AdminApp() {
  const user = useUser();
  if (!user || !TEAM_ROLES.includes(user.role)) return <><Login/><Toasts/></>;
  return <AdminShell><Switch>
    <Route path="/admin">{() => <Dashboard/>}</Route>
    <Route path="/admin/login">{() => <Dashboard/>}</Route>
    <Route path="/admin/leads">{() => <LeadsPage/>}</Route>
    <Route path="/admin/leads/:id">{p => <LeadDetail id={p.id}/>}</Route>
    <Route path="/admin/enquiries">{() => <EnquiriesPage/>}</Route>
    <Route path="/admin/team">{() => <Guard level="manager"><TeamPage/></Guard>}</Route>
    <Route path="/admin/reports">{() => <Guard level="manager"><ReportsPage/></Guard>}</Route>
    <Route path="/admin/users">{() => <Guard level="admin"><UsersPage/></Guard>}</Route>
    <Route path="/admin/loan-types">{() => <Guard level="admin"><LoanTypesPage/></Guard>}</Route>
    <Route path="/admin/audit">{() => <Guard level="admin"><AuditPage/></Guard>}</Route>
    <Route component={NotFound}/>
  </Switch></AdminShell>;
}
