import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, Camera, Check, Clock3, FileCheck2, FileText, Trash2, UserRound, X } from 'lucide-react';
import { Shell, useUser } from '../components/shell';
import { ApiError, DOC_LABEL, get, patch, refreshMe, STATUSES, upload, type DocumentApi, type Status } from '../lib/api';
import { fmt } from '../lib/data';

const when = (iso: string) => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
const whenTime = (iso: string) => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const FLOW: Status[] = ['Submitted', 'Assigned', 'Contacted', 'Documents Pending', 'Documents Verified', 'In Process', 'Approved', 'Disbursed'];
const stepOf = (s: Status) => Math.max(0, FLOW.indexOf(s));
const CLOSED_BAD: Status[] = ['Rejected', 'Not Reachable / Closed'];
const tone = (s: Status) => s === 'Disbursed' || s === 'Approved' ? 'bg-[#dcefe4] text-[#2f6b47]' : CLOSED_BAD.includes(s) ? 'bg-[#f6e1dc] text-[#9a4332]' : 'bg-[#dbe8fb] text-[#1f4f8f]';

type AppRow = { id: number; app_number: string; loan_type: { id: number; name: string; slug: string }; amount: number; status: Status; created_at: string; updated_at: string };
type Detail = AppRow & {
  city: string; income: number; source: string; can_upload: boolean;
  timeline: { status: Status; at: string; reason: string | null }[];
  documents: DocumentApi[];
  required_documents: { doc_type: string; uploaded: boolean; verified: boolean }[];
};

function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, set] = useState<{ data: T | null; error: string; loading: boolean }>({ data: null, error: '', loading: true });
  const reload = useCallback(() => { set(s => ({ ...s, loading: true })); load().then(d => set({ data: d, error: '', loading: false })).catch((e: ApiError) => set({ data: null, error: e.message, loading: false })); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}

export function AccountShell({ children }: { children: ReactNode }) {
  const user = useUser(); const [, navigate] = useLocation();
  useEffect(() => {
    if (!user) navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    else if (user.role !== 'customer') navigate('/admin');
  }, [user, navigate]);
  if (!user || user.role !== 'customer') return <Shell><div className="page-wrap py-24 text-center text-[#50658f]">Taking you to the right place…</div></Shell>;
  return <Shell>
    <div className="bg-[#ebf1f8] py-8"><div className="page-wrap"><p className="eyebrow">Your space</p><h1 className="serif mt-1 text-4xl text-[#10244d]">Hello, {user.name.split(' ')[0]}.</h1></div></div>
    <div className="page-wrap grid gap-8 py-8 md:grid-cols-[220px_1fr]">
      <aside className="h-fit rounded-2xl bg-[#e4eaf6] p-3">
        <p className="px-3 py-2 text-[.65rem] font-bold uppercase tracking-[.15em] text-[#78877e]">Your account</p>
        <Link href="/account/applications" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-[#20396a] hover:bg-white/70" data-testid="account-nav-applications"><FileText size={17}/>Applications</Link>
        <Link href="/account/profile" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-[#20396a] hover:bg-white/70" data-testid="account-nav-profile"><UserRound size={17}/>Profile</Link>
        <Link href="/" className="mt-3 flex items-center gap-3 border-t border-[#c1d0ed] px-3 pt-4 text-sm font-semibold text-[#596e99]"><ArrowLeft size={16}/>Back to Chakrapay</Link>
      </aside>
      <section>{children}</section>
    </div>
  </Shell>;
}

const Problem = ({ text, retry }: { text: string; retry?: () => void }) => <div className="card p-6 text-sm text-[#a23a27]" role="alert">{text}{retry && <button onClick={retry} className="ml-3 font-bold underline">Try again</button>}</div>;

export function Applications() {
  const { data, error, loading, reload } = useLoad(() => get<AppRow[]>('/me/applications'), []);
  return <AccountShell>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Applications</p><h2 className="serif mt-1 text-3xl text-[#10244d]">Your applications at a glance.</h2></div><Link href="/apply" className="btn btn-primary" data-testid="link-new-application">Start a new application <ArrowRight size={16}/></Link></div>
    <div className="mt-6 grid gap-4">
      {loading && <div className="card p-6 text-[#50658f]">Loading your applications…</div>}
      {error && <Problem text={error} retry={reload}/>}
      {data?.length === 0 && <div className="card p-8 text-center" data-testid="no-applications"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e4eaf6] text-[#213f7a]"><FileText/></span><h3 className="serif mt-4 text-2xl text-[#10244d]">No applications yet</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#50658f]">When you apply for a loan, it will show up here. Applications you made with the same email before signing up are added automatically.</p><Link href="/apply" className="btn btn-primary mt-5">Apply for a loan <ArrowRight size={16}/></Link></div>}
      {data?.map(a => <Link key={a.id} href={`/account/applications/${a.id}`} className="card block p-5 transition-transform hover:-translate-y-0.5" data-testid={`application-${a.id}`}>
        <div className="flex items-start justify-between gap-4"><div className="flex gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e4eaf6] text-[#213f7a]"><FileText size={18}/></span><div><p className="text-xs text-[#6a7ea7]">{a.app_number} · {when(a.created_at)}</p><h3 className="mt-1 font-bold text-[#10244d]">{a.loan_type.name}</h3><p className="mt-1 text-sm text-[#50658f]">Requested amount ₹{fmt(a.amount)}</p></div></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${tone(a.status)}`}>{a.status}</span></div>
        {!CLOSED_BAD.includes(a.status) && <div className="mt-4 grid grid-cols-8 gap-1">{FLOW.map((s, i) => <span key={s} className={`h-1.5 rounded-full ${i <= stepOf(a.status) ? 'bg-[#1a5be0]' : 'bg-[#d6e0f2]'}`}/>)}</div>}
      </Link>)}
    </div>
  </AccountShell>;
}

export function ApplicationDetail({ id }: { id?: string }) {
  const { data: a, error, loading, reload } = useLoad(() => get<Detail>(`/me/applications/${id}`), [id]);
  const [busy, setBusy] = useState(''); const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const send = async (docType: string, file: File | undefined) => {
    if (!file) return;
    if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) { setMsg({ ok: false, text: 'Please choose a PDF, JPG or PNG file.' }); return; }
    if (file.size > 5 * 1024 * 1024) { setMsg({ ok: false, text: 'Each file must be 5 MB or smaller.' }); return; }
    setBusy(docType); setMsg(null);
    try {
      const f = new FormData(); f.append('doc_type', docType); f.append('file', file);
      await upload(`/applications/${id}/documents`, f);
      setMsg({ ok: true, text: `${DOC_LABEL[docType] ?? 'Document'} uploaded. Our team will check it soon.` }); reload();
    } catch (x) { setMsg({ ok: false, text: x instanceof ApiError ? x.message : 'Upload failed. Please try again.' }); }
    finally { setBusy(''); }
  };

  const docsOf = (t: string) => a?.documents.filter(d => d.doc_type === t) ?? [];
  const verTone = (v: string) => v === 'verified' ? 'text-[#2f6b47]' : v === 'rejected' ? 'text-[#a23a27]' : 'text-[#8a6a2a]';
  const types = Array.from(new Set([...(a?.required_documents.map(r => r.doc_type) ?? []), ...(a?.documents.map(d => d.doc_type) ?? [])]));

  return <AccountShell>
    <Link href="/account/applications" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1f4f8f]"><ArrowLeft size={16}/>All applications</Link>
    {loading && <div className="card mt-5 p-6 text-[#50658f]">Loading…</div>}
    {error && <div className="mt-5"><Problem text={error} retry={reload}/></div>}
    {a && <>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Application · {a.app_number}</p><h2 className="serif mt-2 text-4xl text-[#10244d]">{a.loan_type.name}</h2><p className="mt-2 text-sm text-[#50658f]">Requested amount ₹{fmt(a.amount)} · {a.city} · Applied {when(a.created_at)}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${tone(a.status)}`} data-testid="application-status">{a.status}</span></div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_.9fr]">
        <section className="card p-6"><p className="eyebrow">Journey so far</p>
          <div className="relative mt-7 space-y-7"><div className="timeline-line"/>{[...a.timeline].reverse().map((t, i) => <div className="relative flex gap-4" key={`${t.status}-${t.at}`}><span className={`status-dot mt-0.5 ${i === 0 ? '' : '!border-[#e4ebf8] !bg-[#c3cfe6]'}`}/><div className="pb-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-[#1b2f58]">{t.status}</h3>{i === 0 && <span className="rounded-full bg-[#dbe8fb] px-2 py-0.5 text-[.65rem] font-bold text-[#1f4f8f]">Current</span>}</div>{t.reason && <p className="mt-1 text-sm leading-6 text-[#5d7098]">{t.reason}</p>}<span className="mt-2 block text-xs text-[#8b99b8]">{whenTime(t.at)}</span></div></div>)}</div>
        </section>
        <section className="card h-fit p-6"><p className="eyebrow">Document checklist</p><h3 className="serif mt-2 text-2xl text-[#10244d]">Your documents</h3>
          <p className="mt-2 text-sm leading-6 text-[#5a6f99]">{a.can_upload ? 'Upload clear photos or scans. PDF, JPG or PNG, up to 5 MB each.' : 'This application is closed, so new documents cannot be added.'}</p>
          {msg && <p className={`mt-4 rounded-lg px-3 py-2 text-sm font-semibold ${msg.ok ? 'bg-[#e1f1e8] text-[#2f6b47]' : 'bg-[#f9e9e6] text-[#a23a27]'}`} role="status" data-testid="upload-message">{msg.text}</p>}
          <div className="mt-5 grid gap-4">{types.length === 0 && <p className="text-sm text-[#5a6f99]">The partner NBFC has not asked for documents yet.</p>}
            {types.map(t => { const have = docsOf(t); const req = a.required_documents.find(r => r.doc_type === t);
              return <div key={t} className="rounded-xl border border-[#d6e0f2] p-4" data-testid={`doc-${t}`}>
                <div className="flex items-center justify-between gap-3"><span className="font-semibold text-[#2f436c]">{DOC_LABEL[t] ?? t}{req && <span className="ml-2 text-[.65rem] font-bold uppercase tracking-wider text-[#8b99b8]">required</span>}</span>
                  {have.length === 0 ? <span className="flex items-center gap-1 text-xs font-bold text-[#8a6a2a]"><Clock3 size={14}/>Not provided</span> : <span className={`flex items-center gap-1 text-xs font-bold ${verTone(have[have.length - 1].verification)}`}><Check size={14}/>{have[have.length - 1].verification === 'pending' ? 'Waiting for check' : have[have.length - 1].verification === 'verified' ? 'Verified' : 'Rejected'}</span>}</div>
                {have.map(d => <p key={d.id} className="mt-2 text-xs text-[#7b8bb0]">{d.original_name} · {Math.max(1, Math.round(d.size / 1024))} KB · {when(d.uploaded_at)}{d.verification === 'rejected' && d.reject_reason ? <span className="block font-semibold text-[#a23a27]">Reason: {d.reject_reason}</span> : null}</p>)}
                {a.can_upload && <label className="btn btn-outline mt-3 cursor-pointer !px-4 !py-2 text-xs">{busy === t ? 'Uploading…' : have.length ? 'Upload again' : 'Choose file'} <FileCheck2 size={14}/><input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png" disabled={!!busy} onChange={e => { void send(t, e.target.files?.[0]); e.target.value = ''; }} data-testid={`upload-${t}`}/></label>}
              </div>; })}
          </div>
        </section>
      </div>
    </>}
  </AccountShell>;
}

// ---------- profile ----------
function ProfilePhoto({ userId, name, complete }: { userId: number; name: string; complete: number }) {
  const key = `chakrapay.photo.${userId}`;
  const [src, setSrc] = useState<string | null>(() => { try { return localStorage.getItem(key); } catch { return null; } });
  const [zoom, setZoom] = useState(1); const [err, setErr] = useState(''); const inp = useRef<HTMLInputElement>(null);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'U';
  const pct = Math.min(100, complete + (src ? 15 : 0));
  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) { setErr('Please choose a JPG, PNG or WebP image.'); return; }
    if (f.size > 5 * 1024 * 1024) { setErr('Please choose an image under 5 MB.'); return; }
    setErr('');
    const img = new Image(); const url = URL.createObjectURL(f);
    img.onload = () => { // keep a small copy on this device only
      const c = document.createElement('canvas'); const s = 320; const r = Math.min(img.width, img.height); c.width = c.height = s;
      c.getContext('2d')?.drawImage(img, (img.width - r) / 2, (img.height - r) / 2, r, r, 0, 0, s, s);
      const data = c.toDataURL('image/jpeg', 0.85); URL.revokeObjectURL(url); setSrc(data); setZoom(1);
      try { localStorage.setItem(key, data); } catch { /* storage full */ }
    };
    img.src = url;
  };
  const remove = () => { setSrc(null); try { localStorage.removeItem(key); } catch { /* */ } };
  return <section className="card mt-6 flex max-w-2xl flex-col items-center gap-6 p-6 sm:flex-row md:p-8" data-testid="profile-photo-card">
    <div className="avatar-ring flex h-36 w-36 shrink-0 items-center justify-center rounded-full p-[5px]" style={{ ['--pct' as string]: pct }}>
      <div className="relative h-full w-full overflow-hidden rounded-full bg-[#e4eaf6]">
        {src ? <img src={src} alt="Your profile" className="h-full w-full object-cover" style={{ transform: `scale(${zoom})` }} data-testid="profile-photo-img"/> : <span className="serif flex h-full w-full items-center justify-center text-5xl text-[#213f7a]">{initials}</span>}
        <button onClick={() => inp.current?.click()} className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-[#10244d]/70 py-1.5 text-[.65rem] font-bold text-white" aria-label="Change photo"><Camera size={13}/>Change</button>
      </div>
    </div>
    <div className="w-full">
      <p className="eyebrow">Profile {pct}% complete</p>
      <h3 className="serif mt-1 text-2xl text-[#10244d]">Put a face to your name.</h3>
      <p className="mt-2 text-sm leading-6 text-[#5a6f99]">A photo helps the team recognise you on calls. It stays on this device and is not uploaded.</p>
      <input ref={inp} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={pick} data-testid="input-profile-photo"/>
      <div className="mt-4 flex flex-wrap items-center gap-3"><button className="btn btn-primary !px-4 !py-2 text-xs" onClick={() => inp.current?.click()}><Camera size={14}/>{src ? 'Replace photo' : 'Add photo'}</button>{src && <button className="btn btn-outline !px-4 !py-2 text-xs" onClick={remove}><Trash2 size={14}/>Remove</button>}</div>
      {err && <p className="mt-3 text-xs font-semibold text-[#b0432e]" role="alert">{err}</p>}
    </div>
  </section>;
}

export function Profile() {
  const user = useUser();
  const [edit, setEdit] = useState(false); const [saved, setSaved] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { void refreshMe().catch(() => undefined); }, []);
  if (!user) return <AccountShell><div/></AccountShell>;
  const filled = [user.name, user.email, user.mobile, user.city].filter(Boolean).length;
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); const v = (k: string) => String(f.get(k) ?? '').trim();
    setErr(''); setSaved(''); setBusy(true);
    try {
      const body: Record<string, string> = {}; if (v('name') && v('name') !== user.name) body.name = v('name'); if (v('email') && v('email').toLowerCase() !== user.email) body.email = v('email');
      if (v('city') && v('city') !== (user.city ?? '')) body.city = v('city'); if (v('mobile') && v('mobile') !== (user.mobile ?? '')) body.mobile = v('mobile');
      if (Object.keys(body).length) { await patch('/me', body); await refreshMe(); setSaved(body.email ? 'Saved. We sent a link to your new email address. Please verify it.' : 'Your changes are saved.'); } else setSaved('Nothing to change.');
      setEdit(false);
    } catch (x) { setErr(x instanceof ApiError ? x.message : 'Could not save. Please try again.'); } finally { setBusy(false); }
  };
  return <AccountShell>
    <p className="eyebrow">Profile</p><h2 className="serif mt-1 text-3xl text-[#10244d]">Your details.</h2>
    <ProfilePhoto userId={user.id} name={user.name} complete={Math.round(filled / 4 * 85)}/>
    <section className="card mt-6 max-w-2xl p-6 md:p-8">
      <div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e4eaf6] text-[#213f7a]"><UserRound/></span><div><p className="eyebrow">Customer</p><h3 className="font-bold text-[#1b2f58]">{user.name}</h3></div></div><button onClick={() => { setEdit(!edit); setSaved(''); setErr(''); }} className="btn btn-outline !px-4 !py-2 text-xs" data-testid="button-profile-edit">{edit ? 'Cancel' : 'Edit profile'}</button></div>
      <form onSubmit={save} key={`${edit}-${user.email}-${user.name}-${user.city}-${user.mobile}`}>
        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <label><span className="field-label">Full name</span><input className="field disabled:opacity-70" name="name" defaultValue={user.name} disabled={!edit} data-testid="profile-name"/></label>
          <label><span className="field-label">Email address</span><input className="field disabled:opacity-70" name="email" type="email" defaultValue={user.email} disabled={!edit} data-testid="profile-email"/></label>
          <label><span className="field-label">Mobile number</span><input className="field disabled:opacity-70" name="mobile" defaultValue={user.mobile ?? ''} disabled={!edit} inputMode="numeric" placeholder="10-digit mobile number" data-testid="profile-mobile"/></label>
          <label><span className="field-label">City</span><input className="field disabled:opacity-70" name="city" defaultValue={user.city ?? ''} disabled={!edit} placeholder="Your city" data-testid="profile-city"/></label>
        </div>
        {edit && <><p className="mt-4 text-xs leading-5 text-[#7b8bb0]">If you change your email we will ask you to verify it again. If you change your mobile number, our team will confirm it on the next call.</p><button className="btn btn-primary mt-4 disabled:opacity-70" type="submit" disabled={busy} data-testid="button-profile-save">{busy ? 'Saving…' : 'Save changes'} <Check size={16}/></button></>}
        {err && <p className="mt-3 rounded-lg bg-[#f9e9e6] px-3 py-2 text-sm font-semibold text-[#a23a27]" role="alert">{err}</p>}
        {saved && <p className="mt-3 text-sm font-semibold text-[#2f6b47]" role="status">{saved}</p>}
      </form>
    </section>
  </AccountShell>;
}
