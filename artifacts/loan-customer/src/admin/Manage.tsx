import { useEffect, useState, type FormEvent } from 'react';
import { Pencil, Plus, Power, Search, ShieldCheck, Unlock } from 'lucide-react';
import { DOC_LABEL, get, patch, post, type LoanTypeApi, type Page } from '../lib/api';
import { fmt } from '../lib/data';
import { Button, Loading, Modal, PageHead, Pagination, Problem, StatusPill, errText, fmtDate, fmtTime, toast, useLoad } from './ui';
import type { Audit, UserAdmin } from './types';

// ---------- staff & access ----------
export function UsersPage() {
  const [q, setQ] = useState(''); const [qs, setQs] = useState(''); const [role, setRole] = useState(''); const [page, setPage] = useState(1);
  const [modal, setModal] = useState<UserAdmin | 'new' | null>(null); const pageSize = 15;
  useEffect(() => { const t = setTimeout(() => { setQs(q.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);
  const { data, error, loading, reload } = useLoad(() => get<Page<UserAdmin>>('/users', { q: qs, role, page, page_size: pageSize }), [qs, role, page]);
  const [busy, setBusy] = useState(0);
  const act = async (u: UserAdmin, body: Record<string, unknown>, ok: string) => { setBusy(u.id); try { await patch(`/users/${u.id}`, body); toast(ok); reload(); } catch (x) { toast(errText(x)); } finally { setBusy(0); } };
  const rows = (data?.items ?? []).filter(u => u.role !== 'customer');
  return <>
    <PageHead title="Staff & access" description="Add team members, change their role and switch their access on or off." action={<Button onClick={() => setModal('new')} data-testid="button-add-user"><Plus size={15}/> Add team member</Button>}/>
    <div className="ad-toolbar"><label className="ad-search"><Search size={15}/><input className="ad-input" placeholder="Search name or email" value={q} onChange={e => setQ(e.target.value)} data-testid="input-search-users"/></label>
      <select className="ad-select" value={role} onChange={e => { setRole(e.target.value); setPage(1); }} aria-label="Filter by role"><option value="">All roles</option><option value="staff">Staff</option><option value="manager">Managers</option><option value="admin">Admins</option></select><span className="ad-demo-pill">{data?.total ?? 0} people</span></div>
    {error && <Problem text={error} retry={reload}/>}
    <section className="ad-card"><div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Team member</th><th>Role</th><th>Open leads</th><th>Joined</th><th>State</th><th>Actions</th></tr></thead>
      <tbody>{rows.map(u => <tr key={u.id} data-testid={`row-user-${u.id}`}><td data-label="Team member"><strong>{u.name}</strong><small>{u.email}{u.mobile ? ` · ${u.mobile}` : ''}</small></td><td data-label="Role" style={{ textTransform: 'capitalize' }}>{u.role}</td><td data-label="Open leads">{u.open_leads}</td><td data-label="Joined">{fmtDate(u.created_at)}</td>
        <td data-label="State"><StatusPill value={u.locked_until && new Date(u.locked_until) > new Date() ? 'Locked' : u.is_active ? 'Active' : 'Inactive'}/></td>
        <td data-label="Actions"><div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{u.role !== 'admin' && <>
          <Button className="soft compact" onClick={() => setModal(u)} data-testid={`button-edit-user-${u.id}`}><Pencil size={12}/> Edit</Button>
          <Button className="text compact" disabled={busy === u.id} onClick={() => void act(u, { is_active: !u.is_active }, u.is_active ? `${u.name} deactivated.` : `${u.name} reactivated.`)} data-testid={`button-toggle-user-${u.id}`}><Power size={12}/> {u.is_active ? 'Deactivate' : 'Activate'}</Button>
          {u.locked_until && new Date(u.locked_until) > new Date() && <Button className="text compact" disabled={busy === u.id} onClick={() => void act(u, { unlock: true }, 'Account unlocked.')}><Unlock size={12}/> Unlock</Button>}</>}</div></td></tr>)}</tbody></table>
      {loading && !rows.length && <Loading what="Loading team"/>}{!loading && !rows.length && !error && <div className="ad-empty">No team members match.</div>}</div>
      <Pagination page={page} pageSize={pageSize} total={data?.total ?? 0} onPage={setPage} noun="people"/></section>
    {modal && <UserModal user={modal === 'new' ? null : modal} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }}/>}
  </>;
}

function UserModal({ user, onClose, onDone }: { user: UserAdmin | null; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: user?.name ?? '', email: user?.email ?? '', mobile: user?.mobile ?? '', role: user?.role === 'manager' ? 'manager' : 'staff' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const mobile = f.mobile.replace(/\D/g, '').slice(-10);
      if (user) { await patch(`/users/${user.id}`, { name: f.name.trim(), role: f.role, ...(mobile ? { mobile } : {}) }); toast('Team member updated.'); }
      else { await post('/users', { name: f.name.trim(), email: f.email.trim(), role: f.role, ...(mobile ? { mobile } : {}) }); toast('Team member added. We emailed them a link to choose a password.'); }
      onDone();
    } catch (x) { setErr(errText(x)); } finally { setBusy(false); }
  };
  return <Modal title={user ? 'Edit team member' : 'Add team member'} description={user ? undefined : 'They get an email with a link to choose their own password. Nobody types or sees a password here.'} onClose={onClose} footer={<><Button className="soft" onClick={onClose} data-testid="button-cancel-user">Cancel</Button><Button type="submit" form="user-form" disabled={busy} data-testid="button-save-user">{busy ? 'Saving…' : 'Save'}</Button></>}>
    <form id="user-form" onSubmit={submit} style={{ display: 'contents' }}>
      <label className="ad-field">Full name<input className="ad-input" required minLength={2} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} data-testid="input-user-name"/></label>
      <label className="ad-field">Work email<input className="ad-input" type="email" required disabled={!!user} value={f.email} onChange={e => setF({ ...f, email: e.target.value })} data-testid="input-user-email"/></label>
      <div className="ad-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <label className="ad-field">Role<select className="ad-select" value={f.role} onChange={e => setF({ ...f, role: e.target.value })} data-testid="select-user-role"><option value="staff">Staff</option><option value="manager">Manager</option></select></label>
        <label className="ad-field">Mobile (optional)<input className="ad-input" inputMode="numeric" value={f.mobile} onChange={e => setF({ ...f, mobile: e.target.value })} data-testid="input-user-mobile"/></label></div>
      {err && <Problem text={err}/>}
    </form>
  </Modal>;
}

// ---------- loan products ----------
const DOC_TYPES = ['pan', 'aadhaar', 'salary_slip', 'bank_statement', 'other'];
const slugify = (s: string) => s.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/(^-|-$)/g, '');

export function LoanTypesPage() {
  const { data, error, loading, reload } = useLoad(() => get<LoanTypeApi[]>('/loan-types', { include_inactive: true }), []);
  const [modal, setModal] = useState<LoanTypeApi | 'new' | null>(null); const [busy, setBusy] = useState(0);
  const toggle = async (p: LoanTypeApi) => { setBusy(p.id); try { await patch(`/loan-types/${p.id}`, { is_active: !p.is_active }); toast(p.is_active ? `${p.name} hidden from the website.` : `${p.name} is now shown on the website.`); reload(); } catch (x) { toast(errText(x)); } finally { setBusy(0); } };
  const rows = [...(data ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return <>
    <PageHead title="Loan products" description="Rates, amounts, tenures, fees and documents. The website reads these, so changes show up right away." action={<Button onClick={() => setModal('new')} data-testid="button-add-loan-type"><Plus size={15}/> Add product</Button>}/>
    {error && <Problem text={error} retry={reload}/>}
    <section className="ad-card"><div className="ad-card-title"><div><h2>Product catalogue</h2><p>Only products switched on are shown to customers. Rates are indicative and come from the partner NBFC rate sheet.</p></div><span className="ad-demo-pill">{rows.length} PRODUCTS</span></div>
      <div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Product</th><th>Amount range</th><th>Rate from</th><th>Tenure (months)</th><th>Documents</th><th>State</th><th>Actions</th></tr></thead>
        <tbody>{rows.map(p => <tr key={p.id} data-testid={`row-loan-type-${p.slug}`}><td data-label="Product"><strong>{p.name}</strong><small>{p.slug}</small></td><td data-label="Amount range">₹{fmt(p.min_amount)} – ₹{fmt(p.max_amount)}</td><td data-label="Rate from">{p.min_rate}% p.a.</td><td data-label="Tenure">{p.min_tenure}–{p.max_tenure}</td><td data-label="Documents">{p.required_docs.map(d => DOC_LABEL[d] ?? d).join(', ') || '—'}</td><td data-label="State"><StatusPill value={p.is_active ? 'Active' : 'Inactive'}/></td>
          <td data-label="Actions"><div style={{ display: 'flex', gap: 5 }}><Button className="soft compact" onClick={() => setModal(p)} data-testid={`button-edit-loan-type-${p.slug}`}><Pencil size={12}/> Edit</Button><Button className="text compact" disabled={busy === p.id} onClick={() => void toggle(p)} data-testid={`button-toggle-loan-type-${p.slug}`}><Power size={12}/> {p.is_active ? 'Hide' : 'Show'}</Button></div></td></tr>)}</tbody></table>
        {loading && !rows.length && <Loading what="Loading products"/>}</div></section>
    <div className="ad-login-alert" style={{ marginTop: 14 }}>{`Rates and terms here are placeholders until the partner NBFC's rate sheet is added in Loan products. Chakrapay does not charge an advance or processing fee; the "fees" field is only for lender charges the NBFC confirms.`}</div>
    {modal && <ProductModal p={modal === 'new' ? null : modal} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }}/>}
  </>;
}

function ProductModal({ p, onClose, onDone }: { p: LoanTypeApi | null; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: p?.name ?? '', slug: p?.slug ?? '', min_rate: String(p?.min_rate ?? 12), min_amount: String(p?.min_amount ?? 25000), max_amount: String(p?.max_amount ?? 500000), min_tenure: String(p?.min_tenure ?? 12), max_tenure: String(p?.max_tenure ?? 60), fees: p?.fees ?? '', eligibility_text: p?.eligibility_text ?? '', required_docs: p?.required_docs ?? ['pan'], is_active: p?.is_active ?? true, sort_order: String(p?.sort_order ?? 10) });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: string, v: unknown) => setF(s => ({ ...s, [k]: v }));
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true);
    const body = { name: f.name.trim(), slug: (f.slug || slugify(f.name)).trim(), min_rate: Number(f.min_rate), min_amount: Number(f.min_amount), max_amount: Number(f.max_amount), min_tenure: Number(f.min_tenure), max_tenure: Number(f.max_tenure), fees: f.fees.trim() || null, eligibility_text: f.eligibility_text.trim() || (p ? undefined : ''), required_docs: f.required_docs, is_active: f.is_active, sort_order: Number(f.sort_order) };
    try { if (p) await patch(`/loan-types/${p.id}`, body); else await post('/loan-types', body); toast(p ? 'Product updated.' : 'Product added.'); onDone(); }
    catch (x) { setErr(errText(x)); } finally { setBusy(false); }
  };
  const num = (k: string, label: string, props: Record<string, unknown> = {}) => <label className="ad-field">{label}<input className="ad-input" type="number" required value={(f as Record<string, any>)[k]} onChange={e => set(k, e.target.value)} {...props}/></label>;
  return <Modal title={p ? 'Edit loan product' : 'Add loan product'} description="These values are shown on the website and used by the calculator, the eligibility check and the apply form." onClose={onClose} footer={<><Button className="soft" onClick={onClose} data-testid="button-cancel-product">Cancel</Button><Button type="submit" form="product-form" disabled={busy} data-testid="button-save-product">{busy ? 'Saving…' : 'Save product'}</Button></>}>
    <form id="product-form" onSubmit={submit} style={{ display: 'contents' }}>
      <label className="ad-field">Product name<input className="ad-input" required minLength={2} value={f.name} onChange={e => setF(s => ({ ...s, name: e.target.value, slug: p ? s.slug : slugify(e.target.value) }))} data-testid="input-product-name"/></label>
      <label className="ad-field">Web address name (slug)<input className="ad-input" required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={f.slug} onChange={e => set('slug', e.target.value)} data-testid="input-product-slug"/></label>
      <div className="ad-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>{num('min_amount', 'Minimum amount (₹)', { min: 0, 'data-testid': 'input-product-min' })}{num('max_amount', 'Maximum amount (₹)', { min: 0, 'data-testid': 'input-product-max' })}{num('min_rate', 'Interest rate from (% p.a.)', { step: '0.01', min: 0.01, max: 60, 'data-testid': 'input-product-rate' })}{num('sort_order', 'Order on the website', { min: 0, max: 1000 })}{num('min_tenure', 'Minimum tenure (months)', { min: 1, max: 600 })}{num('max_tenure', 'Maximum tenure (months)', { min: 1, max: 600 })}</div>
      <label className="ad-field">Lender fees (text)<input className="ad-input" value={f.fees} onChange={e => set('fees', e.target.value)} placeholder="As per the partner NBFC's schedule"/></label>
      <label className="ad-field">Who can apply<textarea className="ad-textarea" value={f.eligibility_text} onChange={e => set('eligibility_text', e.target.value)} placeholder="Short, plain description of the basic rules"/></label>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="ad-info-label" style={{ marginBottom: 6 }}>Documents required</legend><div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>{DOC_TYPES.map(d => <label key={d} style={{ display: 'flex', gap: 6, fontSize: 12 }}><input type="checkbox" checked={f.required_docs.includes(d)} onChange={e => set('required_docs', e.target.checked ? [...f.required_docs, d] : f.required_docs.filter(x => x !== d))}/>{DOC_LABEL[d]}</label>)}</div></fieldset>
      <label style={{ display: 'flex', gap: 8, fontSize: 12 }}><input type="checkbox" checked={f.is_active} onChange={e => set('is_active', e.target.checked)}/>Show this product on the website</label>
      {err && <Problem text={err}/>}
    </form>
  </Modal>;
}

// ---------- audit log ----------
export function AuditPage() {
  const [action, setAction] = useState(''); const [entity, setEntity] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [page, setPage] = useState(1); const pageSize = 25;
  const { data, error, loading, reload } = useLoad(() => get<Page<Audit>>('/audit-log', { action: action.trim(), entity: entity.trim(), date_from: from, date_to: to, page, page_size: pageSize }), [action, entity, from, to, page]);
  const rows = data?.items ?? [];
  return <>
    <PageHead title="Audit log" description="A permanent record of important actions: who did what, and when. It cannot be edited."/>
    <div className="ad-toolbar"><label className="ad-search"><Search size={15}/><input className="ad-input" value={action} onChange={e => { setAction(e.target.value); setPage(1); }} placeholder="Action, e.g. status_changed" data-testid="input-search-audit"/></label>
      <input className="ad-input" style={{ maxWidth: 160 }} value={entity} onChange={e => { setEntity(e.target.value); setPage(1); }} placeholder="Entity, e.g. lead" aria-label="Entity"/>
      <label className="ad-field">From<input className="ad-input" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }}/></label><label className="ad-field">To<input className="ad-input" type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }}/></label><span className="ad-demo-pill">{data?.total ?? 0} entries</span></div>
    {error && <Problem text={error} retry={reload}/>}
    <section className="ad-card"><div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Action</th><th>Entity</th><th>User</th><th>Time</th><th>IP address</th></tr></thead>
      <tbody>{rows.map(a => <tr key={a.id} data-testid={`row-audit-${a.id}`}><td data-label="Action"><strong>{a.action}</strong>{a.details ? <small>{Object.entries(a.details).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(' · ')}</small> : null}</td><td data-label="Entity">{a.entity}{a.entity_id ? ` #${a.entity_id}` : ''}</td><td data-label="User">{a.user_name ?? 'System'}</td><td data-label="Time">{fmtTime(a.created_at)}</td><td data-label="IP address"><code>{a.ip ?? '—'}</code></td></tr>)}</tbody></table>
      {loading && !rows.length && <Loading what="Loading the log"/>}{!loading && !rows.length && !error && <div className="ad-empty"><ShieldCheck size={22}/><strong>No matching entries</strong></div>}</div>
      <Pagination page={page} pageSize={pageSize} total={data?.total ?? 0} onPage={setPage} noun="entries"/></section>
  </>;
}
