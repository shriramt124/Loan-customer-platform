import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { AlertTriangle, ArrowDownToLine, ArrowLeft, CalendarDays, Check, ExternalLink, FileText, Filter, Plus, RotateCcw, Search, X } from 'lucide-react';
import { api, DOC_LABEL, download, get, openFile, patch, post, STATUSES, type Page, type Status } from '../lib/api';
import { useUser } from '../components/shell';
import { useLoanTypes } from '../lib/data';
import { Button, Loading, Modal, PageHead, Pagination, Problem, StatusPill, errText, fmtDate, fmtTime, initials, rupees, toast, useLoad } from './ui';
import { CLOSED, SOURCE_LABEL, type LeadFull, type LeadItem, type TeamUser } from './types';

const SORTS: Record<string, string> = { name: 'name', amount: 'amount', created: 'created_at', status: 'status' };

export function LeadsPage() {
  const user = useUser()!; const mgr = user.role !== 'staff';
  const { loanTypes } = useLoanTypes();
  const initial = new URLSearchParams(window.location.search);
  const [q, setQ] = useState(''); const [qs, setQs] = useState('');
  const [status, setStatus] = useState(initial.get('status') ?? ''); const [type, setType] = useState(''); const [city, setCity] = useState('');
  const [source, setSource] = useState(''); const [staff, setStaff] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [sort, setSort] = useState<{ key: keyof typeof SORTS; dir: 'asc' | 'desc' }>({ key: 'created', dir: 'desc' });
  const [page, setPage] = useState(1); const [adding, setAdding] = useState(false); const [busyExport, setBusyExport] = useState(false);
  const pageSize = 10;
  useEffect(() => { const t = setTimeout(() => { setQs(q.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);
  const team = useLoad(() => mgr ? get<TeamUser[]>('/team') : Promise.resolve([] as TeamUser[]), [mgr]);
  const leads = useLoad(() => get<Page<LeadItem>>('/leads', {
    q: qs, status, loan_type_id: type, city: city.trim(), source, assigned_to: staff, date_from: from, date_to: to,
    sort: SORTS[sort.key], order: sort.dir, page, page_size: pageSize,
  }), [qs, status, type, city, source, staff, from, to, sort.key, sort.dir, page]);
  const filtersActive = !!(q || status || type || city || source || staff || from || to);
  const clear = () => { setQ(''); setQs(''); setStatus(''); setType(''); setCity(''); setSource(''); setStaff(''); setFrom(''); setTo(''); setPage(1); };
  const toggleSort = (key: keyof typeof SORTS) => { setSort(s => ({ key, dir: s.key === key ? (s.dir === 'asc' ? 'desc' : 'asc') : key === 'name' || key === 'status' ? 'asc' : 'desc' })); setPage(1); };
  const th = (key: keyof typeof SORTS, label: string) => <th className="ad-th-sort" aria-sort={sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined} onClick={() => toggleSort(key)} data-testid={`sort-${key}`}>{label}{sort.key === key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}</th>;
  const exportCsv = async () => { setBusyExport(true); try { await download('/reports/export.csv', 'chakrapay-leads.csv', { kind: 'leads', date_from: from, date_to: to }); toast('Leads exported. The export is recorded in the audit log.'); } catch (x) { toast(errText(x)); } finally { setBusyExport(false); } };
  const rows = leads.data?.items ?? [];
  return <>
    <PageHead title="Loan leads" description={mgr ? 'Find an application, check its stage and move the next action forward.' : 'The applications assigned to you.'} action={<>{mgr && <Button className="soft" onClick={() => void exportCsv()} disabled={busyExport} data-testid="button-export-leads"><ArrowDownToLine size={14}/> {busyExport ? 'Preparing…' : 'Export CSV'}</Button>}<Button onClick={() => setAdding(true)} data-testid="button-add-lead"><Plus size={15}/> Add lead</Button></>}/>
    <div className="ad-toolbar">
      <label className="ad-search"><Search size={15}/><input className="ad-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, mobile or application number" aria-label="Search leads" data-testid="input-search-leads"/></label>
      <select className="ad-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status" data-testid="select-lead-status"><option value="">All stages</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
      <select className="ad-select" value={type} onChange={e => { setType(e.target.value); setPage(1); }} aria-label="Filter by product" data-testid="select-lead-product"><option value="">All products</option>{loanTypes.map(t => <option key={t.dbId} value={t.dbId}>{t.name}</option>)}</select>
      <input className="ad-input" style={{ maxWidth: 150 }} value={city} onChange={e => { setCity(e.target.value); setPage(1); }} placeholder="City" aria-label="Filter by city" data-testid="input-lead-city"/>
      <select className="ad-select" value={source} onChange={e => { setSource(e.target.value); setPage(1); }} aria-label="Filter by source" data-testid="select-lead-source"><option value="">All sources</option>{Object.entries(SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      {mgr && <select className="ad-select" value={staff} onChange={e => { setStaff(e.target.value); setPage(1); }} aria-label="Filter by assigned staff" data-testid="select-lead-staff"><option value="">All staff</option><option value="unassigned">Unassigned</option>{(team.data ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>}
      <label className="ad-field">From<input className="ad-input" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} aria-label="From date" data-testid="input-lead-date-from"/></label>
      <label className="ad-field">To<input className="ad-input" type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} aria-label="To date" data-testid="input-lead-date-to"/></label>
      <span className="ad-demo-pill"><Filter size={12}/>{leads.data?.total ?? 0} records</span>{filtersActive && <Button className="text compact" onClick={clear} data-testid="button-clear-filters"><X size={12}/> Clear filters</Button>}
    </div>
    {leads.error && <Problem text={leads.error} retry={leads.reload}/>}
    <section className="ad-card"><div className="ad-table-wrap"><table className="ad-table"><thead><tr>{th('name', 'Applicant')}<th>Loan product</th><th>Location / source</th>{th('status', 'Stage')}<th>Assigned to</th>{th('amount', 'Requested')}{th('created', 'Created')}</tr></thead>
      <tbody>{rows.map(l => <tr key={l.id} data-testid={`row-lead-${l.id}`}><td data-label="Applicant"><Link href={`/admin/leads/${l.id}`} className="ad-cell-primary" data-testid={`link-lead-${l.id}`}>{l.name}<small>{l.app_number} · {l.mobile}</small></Link></td><td data-label="Loan product">{l.loan_type.name}</td><td data-label="Location / source">{l.city}<small>{SOURCE_LABEL[l.source]}</small></td><td data-label="Stage"><StatusPill value={l.status}/></td><td data-label="Assigned to">{l.assignee?.name ?? 'Unassigned'}</td><td data-label="Requested">{rupees(l.amount)}</td><td data-label="Created">{fmtDate(l.created_at)}</td></tr>)}</tbody></table>
      {leads.loading && !rows.length && <Loading what="Loading leads"/>}{!leads.loading && !rows.length && !leads.error && <div className="ad-empty"><Search size={22}/><strong>No leads match</strong><p>{filtersActive ? 'Try clearing a filter.' : 'New applications will appear here.'}</p></div>}</div>
      <Pagination page={page} pageSize={pageSize} total={leads.data?.total ?? 0} onPage={setPage} noun="leads"/></section>
    {adding && <AddLead mgr={mgr} team={team.data ?? []} onClose={() => setAdding(false)} onDone={() => { setAdding(false); leads.reload(); }}/>}
  </>;
}

function AddLead({ mgr, team, onClose, onDone }: { mgr: boolean; team: TeamUser[]; onClose: () => void; onDone: () => void }) {
  const { loanTypes } = useLoanTypes();
  const [f, setF] = useState({ name: '', mobile: '', email: '', city: '', type: '', amount: '250000', income: '50000', emi: '0', source: 'walk-in', consent: false, assigned: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: string, v: string | boolean) => setF(p => ({ ...p, [k]: v }));
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const lead = await post<LeadFull>('/leads', { name: f.name.trim(), mobile: f.mobile.replace(/\D/g, '').slice(-10), email: f.email.trim(), city: f.city.trim(), loan_type_id: Number(f.type || loanTypes[0]?.dbId), amount: Number(f.amount), income: Number(f.income), existing_emi: Number(f.emi || 0), source: f.source, consent: f.consent, ...(mgr && f.assigned ? { assigned_to: Number(f.assigned) } : {}) });
      toast(`${lead.app_number} added.`); onDone();
    } catch (x) { setErr(errText(x)); } finally { setBusy(false); }
  };
  return <Modal title="Add a lead" description="For a walk-in or phone enquiry. The customer must agree to share their details." onClose={onClose} footer={<><Button className="soft" onClick={onClose} data-testid="button-cancel-add-lead">Cancel</Button><Button type="submit" form="add-lead-form" disabled={busy} data-testid="button-save-lead">{busy ? 'Saving…' : 'Add to queue'}</Button></>}>
    <form id="add-lead-form" onSubmit={submit} style={{ display: 'contents' }}>
      <label className="ad-field">Applicant name<input className="ad-input" required value={f.name} onChange={e => set('name', e.target.value)} data-testid="input-new-lead-name"/></label>
      <div className="ad-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <label className="ad-field">Mobile (10 digits)<input className="ad-input" required inputMode="numeric" value={f.mobile} onChange={e => set('mobile', e.target.value)} data-testid="input-new-lead-phone"/></label>
        <label className="ad-field">Email<input className="ad-input" type="email" required value={f.email} onChange={e => set('email', e.target.value)} data-testid="input-new-lead-email"/></label>
        <label className="ad-field">Loan product<select className="ad-select" value={f.type || loanTypes[0]?.dbId} onChange={e => set('type', e.target.value)} data-testid="select-new-lead-type">{loanTypes.map(t => <option key={t.dbId} value={t.dbId}>{t.name}</option>)}</select></label>
        <label className="ad-field">City<input className="ad-input" required value={f.city} onChange={e => set('city', e.target.value)} data-testid="input-new-lead-city"/></label>
        <label className="ad-field">Amount (₹)<input className="ad-input" type="number" min="1" required value={f.amount} onChange={e => set('amount', e.target.value)} data-testid="input-new-lead-amount"/></label>
        <label className="ad-field">Monthly income (₹)<input className="ad-input" type="number" min="1" required value={f.income} onChange={e => set('income', e.target.value)} data-testid="input-new-lead-income"/></label>
        <label className="ad-field">Existing EMI (₹)<input className="ad-input" type="number" min="0" value={f.emi} onChange={e => set('emi', e.target.value)}/></label>
        <label className="ad-field">Source<select className="ad-select" value={f.source} onChange={e => set('source', e.target.value)} data-testid="select-new-lead-source"><option value="walk-in">Walk-in</option><option value="phone">Phone</option></select></label>
      </div>
      {mgr && <label className="ad-field">Assign to (optional)<select className="ad-select" value={f.assigned} onChange={e => set('assigned', e.target.value)}><option value="">Leave unassigned</option>{team.map(t => <option key={t.id} value={t.id}>{t.name} ({t.role})</option>)}</select></label>}
      <label style={{ display: 'flex', gap: 8, fontSize: 12, alignItems: 'flex-start' }}><input type="checkbox" checked={f.consent} onChange={e => set('consent', e.target.checked)} required data-testid="checkbox-new-lead-consent"/><span>The customer agreed (in person or by phone) that their details are shared with the partner NBFC and that we may call them.</span></label>
      {err && <Problem text={err}/>}
    </form>
  </Modal>;
}

// ---------- lead detail ----------
const verLabel = (v: string) => v === 'verified' ? 'Verified' : v === 'rejected' ? 'Rejected' : 'Pending';

export function LeadDetail({ id }: { id?: string }) {
  const user = useUser()!; const mgr = user.role !== 'staff'; const [, navigate] = useLocation();
  const { data: lead, error, loading, reload } = useLoad(() => get<LeadFull>(`/leads/${id}`), [id]);
  const team = useLoad(() => mgr ? get<TeamUser[]>('/team') : Promise.resolve([] as TeamUser[]), [mgr]);
  const [target, setTarget] = useState<Status | ''>(''); const [reason, setReason] = useState('');
  const [note, setNote] = useState(''); const [fu, setFu] = useState({ date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), time: '10:00', note: '' });
  const [rejecting, setRejecting] = useState<number | null>(null); const [docReason, setDocReason] = useState(''); const [busy, setBusy] = useState('');

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => { setBusy(key); try { await fn(); toast(ok); reload(); } catch (x) { toast(errText(x)); } finally { setBusy(''); } };

  if (loading && !lead) return <Loading what="Loading the application"/>;
  if (error && !lead) return <div className="ad-not-found"><FileText size={28}/><h1>Application not found</h1><p>{error}</p><Link href="/admin/leads" className="ad-button" data-testid="link-return-leads"><ArrowLeft size={14}/> Back to leads</Link></div>;
  if (!lead) return null;
  const tr = lead.allowed_transitions.find(t => t.status === target);
  const closed = CLOSED.includes(lead.status);
  const changeStatus = () => { if (!target) return; void run('status', () => patch(`/leads/${lead.id}/status`, { status: target, reason: reason.trim() || undefined }), `Moved to ${target}.`).then(() => { setTarget(''); setReason(''); }); };
  const verified = lead.documents.filter(d => d.verification === 'verified').length;

  return <>
    <div style={{ marginBottom: 15 }}><Link href="/admin/leads" className="ad-link" data-testid="link-back-to-leads"><ArrowLeft size={13} style={{ verticalAlign: 'middle' }}/> All loan leads</Link></div>
    <PageHead title={lead.name} description={`${lead.app_number} · Added ${fmtDate(lead.created_at)} · ${lead.city}`} action={<><StatusPill value={lead.status}/><Button className="soft" onClick={() => { setTarget(lead.allowed_transitions[0]?.status ?? ''); setReason(''); }} disabled={!lead.allowed_transitions.length} data-testid="button-change-status"><RotateCcw size={14}/> Change stage</Button></>}/>
    <div className="ad-detail-grid">
      <div className="ad-detail-stack">
        <section className="ad-card ad-card-pad"><div className="ad-section-title"><div><h2>Application & customer</h2><p>{lead.has_account ? 'The customer has an account and can upload documents.' : 'The customer has not created an account yet.'}</p></div></div>
          <div className="ad-info-grid">{([['Loan product', lead.loan_type.name], ['Requested amount', rupees(lead.amount)], ['Monthly income', rupees(lead.income)], ['Existing EMI', rupees(lead.existing_emi)], ['City', lead.city], ['Source', SOURCE_LABEL[lead.source]], ['Mobile', lead.mobile], ['Email', lead.email], ['Created', fmtDate(lead.created_at)], ['Last updated', fmtTime(lead.updated_at)], ['Consent', lead.consent ? `Given ${lead.consent_at ? fmtDate(lead.consent_at) : ''}${lead.consent_text_version ? ` (v${lead.consent_text_version})` : ''}` : 'Not recorded']] as [string, string][]).map(([l, v]) => <div key={l}><span className="ad-info-label">{l}</span><span className="ad-info-value">{v}</span></div>)}</div>
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #e7eef7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><span><span className="ad-info-label">Mobile number confirmed</span><strong className="ad-info-value">{lead.mobile_confirmed ? 'Confirmed on a call' : 'Not confirmed yet'}</strong></span><Button className="soft compact" disabled={busy === 'mobile'} onClick={() => void run('mobile', () => patch(`/leads/${lead.id}/mobile-confirmed`, { confirmed: !lead.mobile_confirmed }), lead.mobile_confirmed ? 'Marked unconfirmed.' : 'Mobile confirmed.')} data-testid="button-toggle-mobile-confirmed">{lead.mobile_confirmed ? 'Mark unconfirmed' : 'Confirm mobile'}</Button></div>
        </section>
        <section className="ad-card ad-card-pad"><div className="ad-section-title"><div><h2>Documents</h2><p>Open a file to review it, then verify or reject it</p></div><span className="ad-demo-pill">{verified}/{lead.documents.length} verified</span></div>
          {lead.documents.length === 0 && <div className="ad-empty">No documents uploaded yet.</div>}
          {lead.documents.map(doc => <div className="ad-doc-row" key={doc.id} data-testid={`document-${doc.id}`}><div className="ad-doc-name"><span className="ad-metric-icon"><FileText size={15}/></span><span><strong>{DOC_LABEL[doc.doc_type] ?? doc.doc_type}</strong><small>{doc.original_name} · {Math.max(1, Math.round(doc.size / 1024))} KB{doc.reject_reason ? ` · Reason: ${doc.reject_reason}` : ''}</small></span></div><StatusPill value={verLabel(doc.verification)}/>
            <div className="ad-doc-actions"><Button className="text compact" onClick={() => void openFile(`/documents/${doc.id}/file`).catch(x => toast(errText(x)))} data-testid={`button-open-document-${doc.id}`}><ExternalLink size={13}/> Open</Button>
              {doc.verification !== 'verified' && <Button className="soft compact" disabled={busy === `d${doc.id}`} onClick={() => void run(`d${doc.id}`, () => patch(`/documents/${doc.id}/verify`, { verification: 'verified' }), 'Document verified.')} data-testid={`button-verify-document-${doc.id}`}><Check size={13}/> Verify</Button>}
              {doc.verification !== 'rejected' && <Button className="text compact" onClick={() => { setRejecting(doc.id); setDocReason(''); }} data-testid={`button-reject-document-${doc.id}`}>Reject</Button>}</div></div>)}
        </section>
        <section className="ad-card ad-card-pad"><div className="ad-section-title"><div><h2>Internal notes</h2><p>Only the team can see these</p></div></div>
          <form onSubmit={e => { e.preventDefault(); void run('note', () => post(`/leads/${lead.id}/notes`, { note: note.trim() }), 'Note added.').then(() => setNote('')); }}><label className="ad-field">Add a note<textarea className="ad-textarea" value={note} onChange={e => setNote(e.target.value)} placeholder="Capture a helpful next step…" required data-testid="input-lead-note"/></label><Button type="submit" style={{ marginTop: 9 }} disabled={busy === 'note'} data-testid="button-add-note"><Plus size={14}/> Add note</Button></form>
          <div className="ad-timeline" style={{ marginTop: 17 }}>{lead.notes.length ? lead.notes.map(n => <div className="ad-timeline-item" key={n.id}><i className="ad-timeline-dot"/><div className="ad-timeline-copy"><strong>{n.author ?? 'Team'}</strong><p>{n.note}</p><small>{fmtTime(n.created_at)}</small></div></div>) : <div className="ad-empty">No notes yet.</div>}</div>
        </section>
        <section className="ad-card ad-card-pad"><div className="ad-section-title"><div><h2>Status history</h2><p>Every stage change, with who made it</p></div></div>
          <div className="ad-timeline">{lead.history.map((h, i) => <div className="ad-timeline-item" key={h.id} data-testid={`history-entry-${i}`}><i className="ad-timeline-dot"/><div className="ad-timeline-copy"><strong>{h.old_status ? `${h.old_status} → ${h.new_status}` : h.new_status}</strong><p>{h.reason ? `${h.reason} · ` : ''}{h.changed_by ?? 'System'}</p><small>{fmtTime(h.created_at)}</small></div></div>)}</div>
        </section>
      </div>
      <aside className="ad-detail-stack">
        <section className="ad-card ad-card-pad"><div className="ad-section-title"><div><h2>Ownership</h2><p>{mgr ? 'Assign or reassign this lead' : 'This lead is assigned to you'}</p></div></div>
          {mgr && <label className="ad-field">Assigned staff<select className="ad-select" value={lead.assignee?.id ?? ''} disabled={busy === 'assign'} onChange={e => e.target.value && void run('assign', () => post(`/leads/${lead.id}/assign`, { assigned_to: Number(e.target.value) }), 'Lead assigned. The staff member has been notified.')} data-testid="select-lead-assignee"><option value="">Unassigned</option>{(team.data ?? []).map(t => <option key={t.id} value={t.id}>{t.name} ({t.role})</option>)}</select></label>}
          <div className="ad-info-label" style={{ marginTop: 14 }}>Current owner</div><div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 7 }}><span className="ad-avatar">{lead.assignee ? initials(lead.assignee.name) : '—'}</span><div><strong style={{ fontSize: 12 }}>{lead.assignee?.name ?? 'Unassigned'}</strong></div></div></section>
        <section className="ad-card ad-card-pad"><div className="ad-section-title"><div><h2>Follow-ups</h2><p>Schedule and close the loop</p></div></div>
          <form onSubmit={e => { e.preventDefault(); void run('fu', () => post(`/leads/${lead.id}/followups`, { due_at: new Date(`${fu.date}T${fu.time}:00`).toISOString(), note: fu.note.trim() || undefined }), 'Follow-up scheduled.').then(() => setFu({ ...fu, note: '' })); }} style={{ display: 'grid', gap: 9 }}>
            <div className="ad-grid" style={{ gridTemplateColumns: '1fr 1fr' }}><label className="ad-field">Due date<input className="ad-input" type="date" value={fu.date} onChange={e => setFu({ ...fu, date: e.target.value })} required data-testid="input-followup-date"/></label><label className="ad-field">Due time<input className="ad-input" type="time" value={fu.time} onChange={e => setFu({ ...fu, time: e.target.value })} required data-testid="input-followup-time"/></label></div>
            <label className="ad-field">Next action<input className="ad-input" value={fu.note} onChange={e => setFu({ ...fu, note: e.target.value })} placeholder="e.g. Confirm callback window" data-testid="input-followup-note"/></label><Button className="soft" type="submit" disabled={busy === 'fu'} data-testid="button-add-followup"><CalendarDays size={14}/> Schedule follow-up</Button></form>
          <div style={{ marginTop: 13 }}>{lead.followups.length ? lead.followups.map(f => <div className="ad-follow-card" key={f.id}><span><strong>{f.note || 'Follow up'}</strong><small>{fmtTime(f.due_at)} · {f.done ? 'Completed' : f.overdue ? 'Overdue' : 'Upcoming'}</small></span><Button className="text compact" onClick={() => void run(`f${f.id}`, () => patch(`/leads/${lead.id}/followups/${f.id}`, { done: !f.done }), f.done ? 'Follow-up reopened.' : 'Follow-up completed.')} data-testid={`button-followup-${f.id}`}>{f.done ? 'Reopen' : 'Done'}</Button></div>) : <div className="ad-empty">No follow-ups scheduled.</div>}</div>
        </section>
        <section className="ad-card ad-card-pad"><div className="ad-section-title"><div><h2>Stage guidance</h2><p>The server only allows valid steps</p></div></div><p style={{ margin: 0, color: '#596e98', fontSize: 11, lineHeight: 1.65 }}>Submitted → Assigned → Contacted → Documents Pending → Documents Verified → In Process → Approved → Disbursed. Rejected and Not Reachable / Closed can be set from any open stage and need a reason. Only a manager or admin can reopen a closed lead.</p></section>
      </aside>
    </div>
    {target && <Modal title={`Move application to ${target}`} description="Status changes are recorded in the history and the audit log, and the customer is notified." onClose={() => { setTarget(''); setReason(''); }} footer={<><Button className="soft" onClick={() => setTarget('')} data-testid="button-cancel-status">Cancel</Button><Button className={tr?.reason_required ? 'danger' : ''} disabled={busy === 'status' || (!!tr?.reason_required && !reason.trim())} onClick={changeStatus} data-testid="button-confirm-status">Confirm stage change</Button></>}>
      <label className="ad-field">Next valid stage<select className="ad-select" value={target} onChange={e => { setTarget(e.target.value as Status); setReason(''); }} data-testid="select-next-status">{lead.allowed_transitions.map(t => <option key={t.status} value={t.status}>{t.status}{t.reopen ? ' (reopen)' : ''}</option>)}</select></label>
      <div className="ad-login-alert"><AlertTriangle size={14} style={{ display: 'inline', marginRight: 6 }}/>Current: <strong>{lead.status}</strong> · Next: <strong>{target}</strong></div>
      {(tr?.reason_required || closed) && <label className="ad-field">Reason {tr?.reason_required ? '(required)' : '(optional)'}<textarea className="ad-textarea" value={reason} onChange={e => setReason(e.target.value)} placeholder="Record the reason for this outcome" data-testid="input-status-reason"/></label>}
    </Modal>}
    {rejecting !== null && <Modal title="Reject this document" description="A clear reason helps the customer fix it, and they will see it." onClose={() => setRejecting(null)} footer={<><Button className="soft" onClick={() => setRejecting(null)} data-testid="button-cancel-document-rejection">Cancel</Button><Button className="danger" disabled={!docReason.trim() || busy === `d${rejecting}`} onClick={() => void run(`d${rejecting}`, () => patch(`/documents/${rejecting}/verify`, { verification: 'rejected', reject_reason: docReason.trim() }), 'Document rejected. The customer has been told why.').then(() => setRejecting(null))} data-testid="button-confirm-document-rejection">Reject document</Button></>}><label className="ad-field">Rejection reason<textarea className="ad-textarea" required value={docReason} onChange={e => setDocReason(e.target.value)} placeholder="Explain what needs to be corrected" data-testid="input-document-rejection-reason"/></label></Modal>}
  </>;
}
