import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, MessageCircle } from 'lucide-react';
import { PageIntro, Shell } from '../components/shell';
import { ApiError, post } from '../lib/api';
import { useSiteConfig } from '../lib/data';

const digits = (s: string) => s.replace(/\D/g, '');

export function Contact() {
  const site = useSiteConfig();
  const [sent, setSent] = useState('');
  const [callback, setCallback] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget); const v = (k: string) => String(f.get(k) ?? '').trim();
    setError(''); setBusy(true);
    try {
      const mobile = digits(v('mobile')).slice(-10);
      const common = { name: v('name'), email: v('email'), message: v('message'), website: v('website') };
      const r = callback
        ? await post<{ message: string }>('/callbacks', { ...common, mobile, email: common.email || undefined, message: common.message || undefined }, false)
        : await post<{ message: string }>('/enquiries', { ...common, mobile: mobile || undefined }, false);
      setSent(r.message);
    } catch (x) { setError(x instanceof ApiError ? x.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  };

  const wa = digits(site.whatsapp);
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => <div className="mt-5 border-t border-white/15 pt-5"><span className="eyebrow !text-[#78b4da]">{label}</span><p className="mt-2 text-sm">{children}</p></div>;

  return <Shell>
    <PageIntro eyebrow="We are here to help" title="Talk to us in simple language." desc="Have a question about loans or how this site works? Send us a message or ask for a call back. We will get back to you soon."/>
    <div className="page-wrap grid gap-8 py-12 md:grid-cols-[.7fr_1.3fr]">
      <aside className="rounded-[22px] bg-[#10244d] p-7 text-[#ebf1f8]">
        <MessageCircle className="text-[#80c6f2]"/>
        <h2 className="serif mt-5 text-3xl">Happy to explain.</h2>
        <p className="mt-4 text-sm leading-6 text-[#b4c1dc]">Ask us about the EMI calculator, loan types or what happens next. No question is too small.</p>
        <Row label="Email">{site.email}</Row>
        <Row label="Phone">{site.phone}</Row>
        <Row label="WhatsApp">{wa.length >= 10 ? <a className="underline underline-offset-4" href={`https://wa.me/${wa.length === 10 ? `91${wa}` : wa}`} target="_blank" rel="noopener noreferrer">{site.whatsapp}</a> : site.whatsapp}</Row>
        <Row label="Address">{site.address}</Row>
        <Row label="Grievance officer">{site.grievance.name}<br/>{site.grievance.email}{site.grievance.phone ? <><br/>{site.grievance.phone}</> : null}</Row>
      </aside>
      <section className="card p-6 md:p-9">
        {sent ? <div className="reveal py-8" data-testid="contact-sent"><Check className="text-[#314f8a]" size={34}/><h2 className="serif mt-4 text-3xl text-[#10244d]">{callback ? 'We will call you back.' : 'Thank you for your message.'}</h2><p className="mt-3 text-[#526893]">{sent}</p><button className="btn btn-outline mt-5" onClick={() => { setSent(''); setCallback(false); }} data-testid="button-new-message">Send another message</button></div>
        : <form onSubmit={submit}>
          <p className="eyebrow">Send us a message</p>
          <h2 className="serif mt-2 text-3xl text-[#10244d]">What would you like to know?</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label><span className="field-label">Your name</span><input name="name" required minLength={2} className="field" autoComplete="name" placeholder="Your name" data-testid="input-contact-name"/></label>
            <label><span className="field-label">Email address</span><input name="email" required={!callback} type="email" className="field" autoComplete="email" placeholder="you@example.com" data-testid="input-contact-email"/></label>
            <label className="sm:col-span-2"><span className="field-label">Your question</span><textarea name="message" required={!callback} className="field min-h-36 resize-y" placeholder="Tell us what you would like to understand..." data-testid="input-contact-message"/></label>
          </div>
          <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
          <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-[#3e5480]"><input className="mt-1 h-4 w-4 accent-[#213f7a]" type="checkbox" checked={callback} onChange={e => setCallback(e.target.checked)} data-testid="checkbox-callback-request"/><span><b>I’d like a call back.</b><span className="block text-xs text-[#7c8981]">Our team will call you on the number below.</span></span></label>
          {callback && <label className="mt-4 block"><span className="field-label">Your mobile number</span><div className="flex"><span className="flex items-center rounded-l-[10px] border border-r-0 border-[#c1cce3] bg-[#eaf0f8] px-3 text-sm text-[#435883]">+91</span><input name="mobile" required className="field rounded-l-none" type="tel" inputMode="numeric" maxLength={13} autoComplete="tel-national" placeholder="10-digit mobile number" data-testid="input-callback-number"/></div></label>}
          {error && <p className="mt-5 rounded-lg bg-[#f9e9e6] px-3 py-2 text-sm font-semibold text-[#a23a27]" role="alert" data-testid="contact-error">{error}</p>}
          <button className="btn btn-primary mt-6 disabled:opacity-70" type="submit" disabled={busy} data-testid="button-contact-submit">{busy ? 'Sending…' : callback ? 'Request a call back' : 'Send message'} <ArrowRight size={16}/></button>
        </form>}
      </section>
    </div>
  </Shell>;
}
