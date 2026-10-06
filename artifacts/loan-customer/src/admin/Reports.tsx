import { useState } from 'react';
import { Link } from 'wouter';
import { AlertTriangle, ArrowDownToLine, BriefcaseBusiness, Clock3, Users } from 'lucide-react';
import { download, get } from '../lib/api';
import { Button, Loading, Metric, PageHead, Problem, StatusPill, errText, fmtTime, toast, useLoad } from './ui';

type Count = { key: string; count: number };
type Summary = { total_leads: number; by_loan_type: Count[]; by_city: Count[]; by_source: Count[]; by_status: Count[]; by_staff: Count[]; conversion: { disbursed: number; total: number; rate_percent: number }; avg_hours_new_to_contacted: number | null; contacted_leads: number };
type Conv = { id: number | null; name: string; leads: number; disbursed: number; conversion_rate_percent: number; avg_hours_new_to_contacted: number | null };
type Member = { user_id: number; name: string; role: string; assigned: number; open: number; closed: number; untouched: number; overdue_followups: number; oldest_untouched: { id: number; app_number: string; customer: string; created_at: string; age_hours: number }[] };
type Monitoring = { members: Member[]; unassigned: number; oldest_unassigned: { id: number; app_number: string; customer: string; created_at: string; age_hours: number }[] };

const day = (d: Date) => d.toISOString().slice(0, 10);
const hours = (h: number | null) => h === null ? '—' : h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} days`;
const age = (h: number) => h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} days`;

export function TeamPage() {
  const { data, error, loading, reload } = useLoad(() => get<Monitoring>('/monitoring'), []);
  const members = data?.members ?? [];
  const open = members.reduce((n, m) => n + m.open, 0), untouched = members.reduce((n, m) => n + m.untouched, 0), overdue = members.reduce((n, m) => n + m.overdue_followups, 0);
  return <>
    <PageHead title="Team workload" description="Balance open applications, first calls that are waiting and follow-ups that are overdue." action={<Link href="/admin/users" className="ad-button soft" data-testid="link-manage-staff">Manage staff <Users size={14}/></Link>}/>
    {error && <Problem text={error} retry={reload}/>}{loading && !data && <Loading what="Loading the team view"/>}
    {data && <>
      <div className="ad-grid ad-metrics"><Metric label="Active team members" value={members.length} note="Staff and managers" icon={Users}/><Metric label="Open applications" value={open} note="Across the team" icon={BriefcaseBusiness}/><Metric label="Unassigned" value={data.unassigned} note="Waiting for an owner" icon={Clock3}/><Metric label="Overdue follow-ups" value={overdue} note={`${untouched} leads not yet touched`} icon={AlertTriangle}/></div>
      <section className="ad-card"><div className="ad-card-title"><div><h2>Staff queue health</h2><p>Open workload and the oldest leads nobody has touched</p></div></div><div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Team member</th><th>Role</th><th>Assigned</th><th>Open</th><th>Untouched</th><th>Overdue follow-ups</th><th>Oldest untouched</th></tr></thead>
        <tbody>{members.map(m => <tr key={m.user_id} data-testid={`row-workload-${m.user_id}`}><td data-label="Team member"><strong>{m.name}</strong></td><td data-label="Role">{m.role}</td><td data-label="Assigned">{m.assigned}</td><td data-label="Open"><span className="ad-cell-primary">{m.open}</span></td><td data-label="Untouched">{m.untouched}</td><td data-label="Overdue follow-ups"><StatusPill value={m.overdue_followups ? 'Overdue' : 'Clear'}/></td><td data-label="Oldest untouched">{m.oldest_untouched[0] ? <Link className="ad-cell-primary" href={`/admin/leads/${m.oldest_untouched[0].id}`}>{m.oldest_untouched[0].customer}<small>{m.oldest_untouched[0].app_number} · {age(m.oldest_untouched[0].age_hours)} old</small></Link> : '—'}</td></tr>)}</tbody></table>{!members.length && <div className="ad-empty">No team members yet.</div>}</div></section>
      <section className="ad-card" style={{ marginTop: 15 }}><div className="ad-card-title"><div><h2>Oldest unassigned leads</h2><p>Waiting longest for an owner</p></div></div><div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Lead</th><th>Received</th><th>Waiting</th></tr></thead><tbody>{data.oldest_unassigned.map(l => <tr key={l.id}><td data-label="Lead"><Link className="ad-cell-primary" href={`/admin/leads/${l.id}`}>{l.customer}<small>{l.app_number}</small></Link></td><td data-label="Received">{fmtTime(l.created_at)}</td><td data-label="Waiting">{age(l.age_hours)}</td></tr>)}</tbody></table>{!data.oldest_unassigned.length && <div className="ad-empty">Every submitted lead has an owner.</div>}</div></section>
    </>}
  </>;
}

export function ReportsPage() {
  const [from, setFrom] = useState(day(new Date(Date.now() - 30 * 86400000))); const [to, setTo] = useState(day(new Date()));
  const q = { date_from: from, date_to: to };
  const sum = useLoad(() => get<Summary>('/reports/summary', q), [from, to]);
  const staff = useLoad(() => get<Conv[]>('/reports/by-staff', q), [from, to]);
  const types = useLoad(() => get<Conv[]>('/reports/by-loan-type', q), [from, to]);
  const [busy, setBusy] = useState('');
  const exp = async (kind: 'leads' | 'summary') => { setBusy(kind); try { await download('/reports/export.csv', `chakrapay-${kind}.csv`, { kind, ...q }); toast('Exported. The export is recorded in the audit log.'); } catch (x) { toast(errText(x)); } finally { setBusy(''); } };
  const s = sum.data;
  const groups: [string, Count[]][] = s ? [['Loan product', s.by_loan_type], ['City', s.by_city], ['Source', s.by_source], ['Status', s.by_status], ['Assigned staff', s.by_staff]] : [];
  return <>
    <PageHead title="Reports" description="Funnel, source and workload breakdowns for the dates you pick." action={<><Button className="soft" onClick={() => void exp('summary')} disabled={!!busy} data-testid="button-export-report"><ArrowDownToLine size={14}/> {busy === 'summary' ? 'Preparing…' : 'Summary CSV'}</Button><Button className="soft" onClick={() => void exp('leads')} disabled={!!busy} data-testid="button-export-report-leads"><ArrowDownToLine size={14}/> {busy === 'leads' ? 'Preparing…' : 'Leads CSV'}</Button></>}/>
    <div className="ad-toolbar"><label className="ad-field">From<input className="ad-input" type="date" value={from} onChange={e => setFrom(e.target.value)} data-testid="input-report-from"/></label><label className="ad-field">To<input className="ad-input" type="date" value={to} onChange={e => setTo(e.target.value)} data-testid="input-report-to"/></label><span className="ad-demo-pill">{s?.total_leads ?? 0} leads in range</span></div>
    {sum.error && <Problem text={sum.error} retry={sum.reload}/>}{sum.loading && !s && <Loading what="Building the report"/>}
    {s && <>
      <div className="ad-report-summary"><article className="ad-card"><small>Applications</small><strong data-testid="report-total">{s.total_leads}</strong></article><article className="ad-card"><small>Disbursed conversion</small><strong data-testid="report-conversion">{s.conversion.rate_percent.toFixed(1)}%</strong></article><article className="ad-card"><small>Average time from New to Contacted</small><strong data-testid="report-time-to-contact">{hours(s.avg_hours_new_to_contacted)}</strong></article></div>
      <section className="ad-card" style={{ marginBottom: 15 }}><div className="ad-card-title"><div><h2>Breakdown</h2><p>Counts for the selected dates</p></div></div><div className="ad-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', padding: '0 15px 15px' }}>{groups.map(([name, rows]) => { const max = Math.max(1, ...rows.map(r => r.count)); return <article className="ad-card" key={name}><div className="ad-card-title"><div><h2>{name}</h2></div></div><div className="ad-bar-chart">{rows.length ? rows.map(r => <div className="ad-bar-row" key={r.key}><span title={r.key}>{r.key}</span><div className="ad-bar"><i style={{ width: `${Math.max(6, r.count / max * 100)}%` }}/></div><strong>{r.count}</strong></div>) : <div className="ad-empty">No data</div>}</div></article>; })}</div></section>
      <section className="ad-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', marginBottom: 15 }}>{([['By staff', staff], ['By loan type', types]] as const).map(([title, r]) => <article className="ad-card" key={title}><div className="ad-card-title"><div><h2>Conversion {title.toLowerCase()}</h2><p>Disbursed ÷ all leads in range</p></div></div><div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>{title === 'By staff' ? 'Staff member' : 'Loan type'}</th><th>Leads</th><th>Disbursed</th><th>Rate</th><th>To contact</th></tr></thead><tbody>{(r.data ?? []).map(x => <tr key={x.id ?? 'none'}><td data-label={title}>{x.name}</td><td data-label="Leads">{x.leads}</td><td data-label="Disbursed">{x.disbursed}</td><td data-label="Rate">{x.conversion_rate_percent.toFixed(1)}%</td><td data-label="To contact">{hours(x.avg_hours_new_to_contacted)}</td></tr>)}</tbody></table>{r.data && !r.data.length && <div className="ad-empty">No data in this range.</div>}</div></article>)}</section>
      <section className="ad-card ad-card-pad"><h2 style={{ margin: '0 0 9px', fontSize: 13 }}>How these are worked out</h2><p style={{ margin: 0, color: '#78867d', fontSize: 11, lineHeight: 1.7 }}>Conversion is the number of Disbursed applications divided by all applications created in the period. Time to contact is the time between an application being submitted and first being marked Contacted.</p></section>
    </>}
  </>;
}
