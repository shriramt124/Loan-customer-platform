import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'wouter';
import { ArrowRight, CircleHelp, Sparkles } from 'lucide-react';
import { PageIntro, Shell } from '../components/shell';
import { ApiError, post } from '../lib/api';
import { fmt, useLoanTypes, useSiteConfig } from '../lib/data';

type Result = {
  eligible: boolean; reason: string | null; estimated_min_amount: number; estimated_max_amount: number; max_emi: number;
  tenure_months: number; indicative_rate: number; disclaimer: string;
  apply_prefill: { loan_type: string; income: number; existing_emi: number; city: string | null; amount: number | null };
};

export function Eligibility() {
  const { loanTypes } = useLoanTypes();
  const site = useSiteConfig();
  const [form, setForm] = useState({ age: '29', income: '85000', existingEmi: '10000', city: '', type: 'personal' });
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [e.target.name]: e.target.value });
  const chosen = loanTypes.find(l => l.id === form.type) ?? loanTypes[0];

  const check = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      setResult(await post<Result>('/eligibility/check', {
        loan_type: chosen.id, age: Number(form.age), monthly_income: Number(form.income),
        existing_emi: Number(form.existingEmi || 0), city: form.city.trim() || undefined,
      }, false));
    } catch (x) { setResult(null); setError(x instanceof ApiError ? x.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  };

  const prefill = result ? new URLSearchParams({
    type: result.apply_prefill.loan_type, income: String(result.apply_prefill.income), emi: String(result.apply_prefill.existing_emi),
    ...(result.apply_prefill.amount ? { amount: String(result.apply_prefill.amount) } : {}), ...(form.city.trim() ? { city: form.city.trim() } : {}),
  }).toString() : '';

  return <Shell>
    <PageIntro eyebrow="A quick check, not a decision" title="Could this loan suit you?" desc="A simple estimate using basic rules. Only the partner lender can decide your real eligibility and approval."/>
    <div className="page-wrap grid gap-8 py-12 md:grid-cols-[1fr_.78fr]">
      <form className="card p-6 md:p-9" onSubmit={check}>
        <h2 className="text-xl font-bold text-[#182d57]">Tell us a little about yourself</h2>
        <p className="mt-2 text-sm leading-6 text-[#5a6f99]">We do not save anything you type here.</p>
        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <label><span className="field-label">Age</span><input className="field" name="age" type="number" min="18" max="100" required value={form.age} onChange={update} data-testid="input-age"/></label>
          <label><span className="field-label">Monthly income (₹)</span><input className="field" name="income" type="number" min="1" required value={form.income} onChange={update} data-testid="input-income"/></label>
          <label><span className="field-label">City</span><input className="field" name="city" value={form.city} onChange={update} placeholder="Your city (optional)" autoComplete="address-level2" data-testid="input-city"/></label>
          <label><span className="field-label">EMIs you already pay each month (₹)</span><input className="field" name="existingEmi" type="number" min="0" required value={form.existingEmi} onChange={update} data-testid="input-existing-emi"/></label>
          <label className="sm:col-span-2"><span className="field-label">Loan type</span>
            <select className="field" name="type" value={form.type} onChange={update} data-testid="select-eligibility-loan-type">{loanTypes.map(l => <option key={l.id} value={l.id}>{l.name} · {l.rate}</option>)}</select>
            <span className="mt-1 block text-xs text-[#7b8980]">Indicative rate and longest repayment time: {chosen.annualRate}% p.a. · {chosen.maxMonths} months</span>
          </label>
        </div>
        {error && <p className="mt-5 rounded-lg bg-[#f9e9e6] px-3 py-2 text-sm font-semibold text-[#a23a27]" role="alert" data-testid="eligibility-error">{error}</p>}
        <button className="btn btn-primary mt-7 disabled:opacity-70" type="submit" disabled={busy} data-testid="button-check-estimate">{busy ? 'Checking…' : 'Show my possible loan amount'} <ArrowRight size={16}/></button>
        <p className="mt-4 text-xs leading-5 text-[#7f8b82]">How we calculate: your maximum EMI is half of your monthly income minus the EMIs you already pay. We then work out the loan amount from that EMI, the loan’s interest rate and its longest repayment time.</p>
      </form>
      <aside className="rounded-[22px] bg-[#e4eaf6] p-7 md:p-9">
        {result ? <div className="reveal" data-testid="eligibility-estimate-result">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#c5d4f3] text-[#213f7a]"><Sparkles/></span>
          <p className="eyebrow mt-6">Indicative estimate</p>
          {result.eligible ? <>
            <h2 className="serif mt-2 text-3xl text-[#10244d]">Loan amount you may get</h2>
            <p className="serif mt-4 text-4xl text-[#20396a]" data-testid="text-estimated-range">₹{fmt(result.estimated_min_amount)} – ₹{fmt(result.estimated_max_amount)}</p>
            <p className="mt-3 text-xs leading-5 text-[#596e99]">Product: {chosen.name} · EMI you can manage about ₹{fmt(result.max_emi)}/month · Repayment up to {result.tenure_months} months · Rate from {result.indicative_rate}% p.a.</p>
          </> : <>
            <h2 className="serif mt-2 text-3xl text-[#10244d]">This may not fit right now</h2>
            <p className="mt-4 rounded-lg bg-[#d0e1f8] p-3 text-sm leading-6 text-[#255d8b]" data-testid="eligibility-reason">{result.reason ?? 'Based on the details you gave, this loan may not be available.'}</p>
          </>}
          <p className="mt-5 text-sm leading-6 text-[#4b608b]">{result.disclaimer || site.eligibilityDisclaimer} Approval is never promised.</p>
          {result.eligible && <Link href={`/apply?${prefill}`} className="btn btn-primary mt-6" data-testid="button-apply-from-eligibility">Continue to apply <ArrowRight size={16}/></Link>}
          {result.eligible && <p className="mt-3 text-xs text-[#596e99]">The application form will be filled in with {chosen.name} and ₹{fmt(result.estimated_max_amount)}.</p>}
        </div> : <>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#c5d4f3] text-[#213f7a]"><CircleHelp/></div>
          <p className="eyebrow mt-6">What this means</p>
          <h2 className="serif mt-2 text-3xl text-[#10244d]">A simple idea of what you can repay.</h2>
          <p className="mt-4 text-sm leading-6 text-[#4c618c]">We turn the EMI you can manage into a loan amount, using the loan’s interest rate and its longest repayment time. The result stays within the minimum and maximum amount for the loan.</p>
          <div className="mt-6 border-t border-[#becce9] pt-5 text-xs leading-5 text-[#4f6592]">No credit score check · Nothing is saved · Only the partner NBFC takes the real decision</div>
        </>}
      </aside>
    </div>
  </Shell>;
}
