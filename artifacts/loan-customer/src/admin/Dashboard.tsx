import { useState } from 'react';
import { Link } from 'wouter';
import { Activity, ArrowRight, Banknote, BriefcaseBusiness, CheckCheck, Clock3, ListChecks } from 'lucide-react';
import { get, post, STATUSES, type Page } from '../lib/api';
import { useUser } from '../components/shell';
import { Loading, Metric, PageHead, Problem, StatusPill, errText, fmtTime, rupees, toast, useLoad } from './ui';
import type { LeadItem, TeamUser } from './types';

type Dash = {
  scope: string; leads_today: number; leads_this_week: number; leads_this_month: number; by_status: Record<string, number>;
  unassigned_leads: number; pending_followups: number; overdue_followups: number;
  due_followups: { id: number; lead_id: number; app_number: string; customer: string; due_at: string; note: string | null; overdue: boolean }[];
  team_totals: { user_id: number; name: string; role: string; assigned: number; open: number; closed: number }[] | null;
};

export function Dashboard() {
  const user = useUser()!; const mgr = user.role !== 'staff';
  const dash = useLoad(() => get<Dash>('/dashboard'), []);
  const recent = useLoad(() => get<Page<LeadItem>>('/leads', { page_size: 5 }), []);
  const unassigned = useLoad(() => mgr ? get<Page<LeadItem>>('/leads', { assigned_to: 'unassigned', page_size: 5 }) : Promise.resolve(null), [mgr]);
  const team = useLoad(() => mgr ? get<TeamUser[]>('/team') : Promise.resolve([] as TeamUser[]), [mgr]);
  const [busy, setBusy] = useState(0);
  const d = dash.data;
  const max = Math.max(1, ...Object.values(d?.by_status ?? {}));
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const assign = async (leadId: number, to: string) => {
    if (!to) return; setBusy(leadId);
    try { await post(`/leads/${leadId}/assign`, { assigned_to: Number(to) }); toast('Lead assigned. The staff member has been notified.'); unassigned.reload(); dash.reload(); recent.reload(); }
    catch (x) { toast(errText(x)); } finally { setBusy(0); }
  };
  const quick = [
    { label: 'Review incoming', note: `${d?.by_status.Submitted ?? 0} awaiting assignment`, href: '/admin/leads?status=Submitted', icon: ListChecks },
    { label: 'Check follow-ups', note: `${d?.overdue_followups ?? 0} overdue actions`, href: mgr ? '/admin/team' : '/admin/leads', icon: Clock3 },
    ...(user.role === 'admin' ? [{ label: 'Manage products', note: 'Rates, limits and documents', href: '/admin/loan-types', icon: Banknote }] : []),
    ...(mgr ? [{ label: 'Open reports', note: 'Funnel and conversion', href: '/admin/reports', icon: Activity }] : []),
  ];
  return <>
    <PageHead title={`${greet}, ${user.name.split(' ')[0]}`} description={mgr ? "A clear view of incoming applications, open work and the team's next actions." : 'Your assigned applications and the follow-ups that are due.'} action={<Link href="/admin/leads" className="ad-button" data-testid="link-view-leads">Review loan leads <ArrowRight size={14}/></Link>}/>
    {dash.error && <Problem text={dash.error} retry={dash.reload}/>}
    {dash.loading && !d && <Loading what="Loading the overview"/>}
    {d && <>
      <section className="ad-grid ad-metrics ad-dashboard-metrics">
        <Metric label="Leads today" value={d.leads_today} note={mgr ? 'New applications today' : 'Assigned to you today'} icon={BriefcaseBusiness}/>
        <Metric label="Leads this week" value={d.leads_this_week} note="Since Monday" icon={Activity}/>
        <Metric label="Leads this month" value={d.leads_this_month} note="Calendar month to date" icon={CheckCheck}/>
        {mgr ? <Metric label="Unassigned leads" value={d.unassigned_leads} note="Waiting for an owner" icon={ListChecks}/> : <Metric label="Pending follow-ups" value={d.pending_followups} note={`${d.overdue_followups} overdue`} icon={Clock3}/>}
      </section>
      <section className="ad-grid ad-dashboard-grid">
        <article className="ad-card"><div className="ad-card-title"><div><h2>Applications by status</h2><p>Current counts across all workflow stages</p></div></div>
          <div className="ad-funnel">{STATUSES.map(s => { const n = d.by_status[s] ?? 0; return <div className="ad-funnel-row" key={s}><span>{s}</span><div className="ad-funnel-track"><div className="ad-funnel-fill" style={{ width: `${Math.max(n ? 8 : 0, n / max * 100)}%` }}/></div><strong>{n}</strong></div>; })}</div></article>
        <article className="ad-card"><div className="ad-card-title"><div><h2>Follow-up queue</h2><p>{d.pending_followups} pending · {d.overdue_followups} overdue</p></div></div>
          <div className="ad-card-body ad-list">{d.due_followups.length ? d.due_followups.slice(0, 6).map(f => <Link href={`/admin/leads/${f.lead_id}`} className="ad-list-item" key={f.id} data-testid={`row-followup-${f.id}`}><span className="ad-list-main"><strong>{f.customer}</strong><small>{f.note || 'Follow up'} · {f.app_number}</small></span><span><StatusPill value={f.overdue ? 'Overdue' : 'Upcoming'}/><small style={{ display: 'block', textAlign: 'right' }}>{fmtTime(f.due_at)}</small></span></Link>) : <div className="ad-empty">No follow-ups are due. Nice work.</div>}</div></article>
      </section>
      {mgr && d.team_totals && <section className="ad-card" style={{ margin: '16px 0' }}><div className="ad-card-title"><div><h2>Team totals</h2><p>Assigned applications per staff member and manager</p></div><Link href="/admin/team" className="ad-link">Open team view</Link></div>
        <div className="ad-team-totals">{d.team_totals.map(t => { const top = Math.max(1, ...d.team_totals!.map(x => x.assigned)); return <div className="ad-team-total-row" key={t.user_id}><span>{t.name}<small>{t.role}</small></span><div className="ad-team-total-track"><i style={{ width: `${Math.max(4, t.assigned / top * 100)}%` }}/></div><strong>{t.assigned}</strong></div>; })}{!d.team_totals.length && <div className="ad-empty">No team members yet. Add some under Staff & access.</div>}</div></section>}
      {mgr && <section className="ad-card" style={{ margin: '16px 0' }}><div className="ad-card-title"><div><h2>Needs an owner</h2><p>Unassigned open leads. Assign without leaving the dashboard.</p></div><span className="ad-demo-pill">{unassigned.data?.total ?? 0} WAITING</span></div>
        <div className="ad-card-body">{unassigned.data?.items.length ? unassigned.data.items.map(l => <div className="ad-assign-row" key={l.id}><Link href={`/admin/leads/${l.id}`}><strong>{l.name}</strong><small>{l.app_number} · {l.loan_type.name} · {rupees(l.amount)}</small></Link>
          <select className="ad-select" value="" disabled={busy === l.id} onChange={e => void assign(l.id, e.target.value)} aria-label={`Assign ${l.name}`} data-testid={`select-quick-assign-${l.id}`}><option value="">Assign to…</option>{(team.data ?? []).map(t => <option key={t.id} value={t.id}>{t.name} ({t.role})</option>)}</select></div>) : <div className="ad-empty">Every open lead has an owner.</div>}</div></section>}
      <section className="ad-grid ad-quick-grid">{quick.map(q => { const I = q.icon; return <Link className="ad-card ad-quick" href={q.href} key={q.label}><span className="ad-quick-icon"><I size={17}/></span><span><strong>{q.label}</strong><small>{q.note}</small></span><ArrowRight size={14}/></Link>; })}</section>
      <section className="ad-card" style={{ marginTop: 16 }}><div className="ad-card-title"><div><h2>Recently added leads</h2><p>The newest applications you can see</p></div><Link href="/admin/leads" className="ad-link">All leads <ArrowRight size={13}/></Link></div>
        <div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Applicant</th><th>Loan product</th><th>City</th><th>Stage</th><th>Amount</th></tr></thead><tbody>{(recent.data?.items ?? []).map(l => <tr key={l.id}><td data-label="Applicant"><Link href={`/admin/leads/${l.id}`} className="ad-cell-primary">{l.name}<small>{l.app_number}</small></Link></td><td data-label="Loan product">{l.loan_type.name}</td><td data-label="City">{l.city}</td><td data-label="Stage"><StatusPill value={l.status}/></td><td data-label="Amount">{rupees(l.amount)}</td></tr>)}</tbody></table>{recent.data && !recent.data.items.length && <div className="ad-empty">No leads yet. They appear here as soon as someone applies.</div>}</div></section>
    </>}
  </>;
}
