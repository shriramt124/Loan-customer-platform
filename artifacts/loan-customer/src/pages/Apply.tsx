import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Check, FileText, LockKeyhole } from 'lucide-react';
import { PageIntro, Shell, useUser } from '../components/shell';
import { ApiError, post } from '../lib/api';
import { fmt, inr, useLoanTypes, useSiteConfig } from '../lib/data';

type Created = { id: number; application_number: string; status: string; duplicate: boolean; message: string; next_steps: string[] };

export function Apply() {
  const { loanTypes } = useLoanTypes();
  const site = useSiteConfig();
  const user = useUser();
  const params = new URLSearchParams(window.location.search);
  const amount0 = Number(params.get('amount'));
  const [values, setValues] = useState({
    name: user?.name ?? '', email: user?.email ?? '', phone: user?.mobile ?? '', type: params.get('type') || 'personal',
    amount: Number.isFinite(amount0) && amount0 > 0 ? String(Math.round(amount0)) : '500000',
    city: params.get('city') || user?.city || '', income: params.get('income') || '', emi: params.get('emi') || '', consent: false, website: '',
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Created | null>(null);

  // fill in the account details once the user is known (they may log in after the page opens)
  useEffect(() => { if (user) setValues(v => ({ ...v, name: v.name || user.name, email: v.email || user.email, phone: v.phone || user.mobile || '', city: v.city || user.city || '' })); }, [user]);

  const chosen = loanTypes.find(l => l.id === values.type) ?? loanTypes[0];
  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues(e.target.name === 'consent' ? { ...values, consent: (e.target as HTMLInputElement).checked } : { ...values, [e.target.name]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const er: string[] = [];
    if (values.name.trim().length < 2) er.push('Please enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) er.push('Please enter a valid email address.');
    if (!/^[6-9]\d{9}$/.test(values.phone.replace(/\D/g, '').slice(-10))) er.push('Enter a 10-digit Indian mobile number.');
    if (values.city.trim().length < 2) er.push('Please add your city.');
    const amount = Number(values.amount), income = Number(values.income);
    if (!Number.isFinite(amount) || amount < chosen.min || amount > chosen.max) er.push(`Loan amount for ${chosen.name} must be between ₹${fmt(chosen.min)} and ₹${fmt(chosen.max)}.`);
    if (!Number.isFinite(income) || income <= 0) er.push('Enter monthly income greater than ₹0.');
    if (!values.consent) er.push('Please tick the consent box to continue.');
    setErrors(er);
    if (er.length) return;
    setBusy(true);
    try {
      setDone(await post<Created>('/applications', {
        name: values.name.trim(), email: values.email.trim(), mobile: values.phone.replace(/\D/g, '').slice(-10), city: values.city.trim(),
        loan_type: chosen.id, amount, income, existing_emi: Number(values.emi || 0), consent: true,
        consent_text_version: site.consentVersion || undefined, website: values.website,
      }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (x) { setErrors([x instanceof ApiError ? x.message : 'Something went wrong. Please try again.']); }
    finally { setBusy(false); }
  };

  const signupLink = `/signup?${new URLSearchParams({ name: values.name.trim(), email: values.email.trim(), mobile: values.phone.replace(/\D/g, '').slice(-10) })}`;

  return <Shell>
    <PageIntro eyebrow="Apply for a loan" title="Tell us the basics." desc="Fill this short form. It takes about two minutes, and you do not need an account to apply."/>
    <div className="page-wrap grid gap-8 py-12 md:grid-cols-[1fr_.65fr]">
      <section className="card p-6 md:p-9">
        {done ? <div className="reveal py-6" data-testid="application-submitted">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e1e8f5] text-[#213f7a]"><Check size={25}/></span>
          <p className="eyebrow mt-6">{done.duplicate ? 'Already received' : 'Application submitted'}</p>
          <h2 className="serif mt-2 text-4xl text-[#10244d]">Your application number</h2>
          <p className="serif mt-3 text-4xl tracking-wide text-[#0040b8]" data-testid="text-application-number">{done.application_number}</p>
          <p className="mt-4 max-w-lg leading-7 text-[#4f648d]">{done.message}</p>
          {done.next_steps.length > 0 && <><p className="mt-6 text-sm font-bold text-[#182d57]">What happens next</p><ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-6 text-[#4f648d]">{done.next_steps.map(s => <li key={s}>{s}</li>)}</ol></>}
          <div className="mt-7 rounded-2xl bg-[#e4eaf6] p-5">
            {user ? <><p className="font-bold text-[#182d57]">Upload your documents</p><p className="mt-1 text-sm leading-6 text-[#4f648d]">Open your application to upload your documents and follow its status.</p><Link href={`/account/applications/${done.id}`} className="btn btn-primary mt-4" data-testid="link-open-my-application">Open my application <ArrowRight size={16}/></Link></>
              : <><p className="font-bold text-[#182d57]">Create an account to upload documents</p><p className="mt-1 text-sm leading-6 text-[#4f648d]">It takes a minute. Your name, email and mobile are filled in for you. Then you can upload your documents and see every update on your application.</p><div className="mt-4 flex flex-wrap gap-3"><Link href={signupLink} className="btn btn-primary" data-testid="link-create-account">Create my account <ArrowRight size={16}/></Link><Link href="/login" className="btn btn-outline">I already have an account</Link></div></>}
          </div>
        </div> : <form onSubmit={submit} noValidate>
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e4eaf6] text-[#234486]"><FileText size={19}/></span><div><p className="eyebrow">Step 1</p><h2 className="font-bold text-[#182d57]">Your details</h2></div></div>
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className="field-label">Full name</span><input className="field" name="name" required value={values.name} onChange={onChange} autoComplete="name" placeholder="As on your ID" data-testid="input-full-name"/></label>
            <label><span className="field-label">Email address</span><input className="field" name="email" type="email" required value={values.email} onChange={onChange} autoComplete="email" placeholder="you@example.com" data-testid="input-apply-email"/></label>
            <label><span className="field-label">Mobile number</span><div className="flex"><span className="flex items-center rounded-l-[10px] border border-r-0 border-[#c1cce3] bg-[#eaf0f8] px-3 text-sm text-[#435883]">+91</span><input className="field rounded-l-none" name="phone" required value={values.phone} onChange={onChange} inputMode="numeric" maxLength={13} autoComplete="tel-national" placeholder="10-digit mobile number" data-testid="input-phone"/></div></label>
            <label><span className="field-label">Loan type</span><select className="field" name="type" value={values.type} onChange={onChange} data-testid="select-loan-type">{loanTypes.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
            <label><span className="field-label">Loan amount you need (₹)</span><input className="field" type="number" min={chosen.min} max={chosen.max} name="amount" required value={values.amount} onChange={onChange} data-testid="input-loan-amount"/><span className="mt-1 block text-xs text-[#7b8980]">Between {inr(chosen.min)} and {inr(chosen.max)}</span></label>
            <label><span className="field-label">Monthly income (₹)</span><input className="field" name="income" type="number" min="1" required value={values.income} onChange={onChange} placeholder="For example 50000" data-testid="input-application-income"/></label>
            <label><span className="field-label">EMIs you already pay each month (₹)</span><input className="field" name="emi" type="number" min="0" value={values.emi} onChange={onChange} placeholder="0 if none" data-testid="input-existing-emi"/></label>
            <label className="sm:col-span-2"><span className="field-label">City</span><input className="field" name="city" required value={values.city} onChange={onChange} autoComplete="address-level2" placeholder="Your city" data-testid="input-city"/></label>
          </div>
          {/* spam trap: real people never see or fill this field */}
          <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}><label>Website<input name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={onChange}/></label></div>
          <label className="mt-6 flex items-start gap-3 text-sm leading-6 text-[#3e5480]"><input className="mt-1 h-4 w-4 accent-[#213f7a]" type="checkbox" name="consent" checked={values.consent} onChange={onChange} required data-testid="checkbox-application-consent"/><span>{site.consentText} <Link href="/legal" className="font-semibold underline">Privacy policy</Link></span></label>
          {errors.length > 0 && <div role="alert" className="mt-5 rounded-xl bg-[#f9e9e6] p-4 text-sm font-semibold text-[#a23a27]" data-testid="form-errors">{errors.map(e => <p key={e}>{e}</p>)}</div>}
          <button className="btn btn-primary mt-7 disabled:opacity-70" type="submit" disabled={busy} data-testid="button-continue-application">{busy ? 'Submitting…' : 'Submit application'} <ArrowRight size={16}/></button>
          <p className="mt-4 text-xs leading-5 text-[#7f8b82]">Submitting is free. Approval, rate and terms are decided by the partner NBFC.</p>
        </form>}
      </section>
      <aside className="h-fit rounded-[22px] bg-[#10244d] p-7 text-[#ebf1f8]">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-[#96d1f5]"><LockKeyhole size={19}/></span>
        <p className="eyebrow mt-5 !text-[#78b4da]">Good to know</p>
        <h3 className="serif mt-2 text-3xl">Your details stay private.</h3>
        <p className="mt-4 text-sm leading-6 text-[#b4c1dc]">We only ask for what is needed. Your details are shared with our partner NBFC for assessment, and our team may call you about the next steps.</p>
        <div className="mt-6 border-t border-white/15 pt-5 text-sm font-bold">{site.noFeeLine}</div>
      </aside>
    </div>
  </Shell>;
}
