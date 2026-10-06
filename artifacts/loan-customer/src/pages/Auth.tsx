import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowRight, Check, ShieldCheck, X } from 'lucide-react';
import { Shell } from '../components/shell';
import { ApiError, forgotPassword, login, resetPassword, signup, TEAM_ROLES, verifyEmail } from '../lib/api';

type Kind = 'login' | 'signup' | 'forgot' | 'reset' | 'verify';
const TITLES: Record<Kind, string> = { login: 'Welcome back.', signup: 'Create your account.', forgot: 'Forgot your password?', reset: 'Choose a new password.', verify: 'Please verify your email.' };

export function AuthPage({ kind }: { kind: Kind }) {
  const [, navigate] = useLocation();
  const q = new URLSearchParams(window.location.search);
  const token = q.get('token');
  const [notice, setNotice] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [verify, setVerify] = useState<'idle' | 'working' | 'ok' | 'bad'>('idle');

  useEffect(() => {
    if (kind !== 'verify' || !token) return;
    let off = false; setVerify('working');
    verifyEmail(token).then(() => { if (!off) setVerify('ok'); }).catch((e: ApiError) => { if (!off) { setVerify('bad'); setErr(e.message); } });
    return () => { off = true; };
  }, [kind, token]);

  const desc: Record<Kind, string> = {
    login: 'Log in to see your applications and upload your documents.',
    signup: 'Create an account to upload your documents and follow your application.',
    forgot: 'Enter your email and we will send you a link to set a new password.',
    reset: token ? 'Enter a new password for your account.' : 'This reset link is not complete. Please ask for a new one.',
    verify: token ? 'One moment while we confirm your email address.' : 'Open the link we sent to your email to finish creating your account.',
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget); const v = (k: string) => String(f.get(k) ?? '').trim(); const pw = String(f.get('password') ?? '');
    setErr(''); setBusy(true);
    try {
      if (kind === 'login') {
        const u = await login(v('email'), pw);
        const next = q.get('next');
        navigate(TEAM_ROLES.includes(u.role) ? (next?.startsWith('/admin') ? next : '/admin') : (next?.startsWith('/') && !next.startsWith('//') ? next : '/account/applications'));
      } else if (kind === 'signup') {
        const r = await signup({ name: v('name'), email: v('email'), mobile: v('mobile'), password: pw });
        if (r.verification_required === false) navigate('/login?registered=1'); else setNotice(r.message);
      } else if (kind === 'forgot') { setNotice((await forgotPassword(v('email'))).message); }
      else if (kind === 'reset' && token) { await resetPassword(token, pw); navigate('/login?reset=1'); }
    } catch (x) { setErr(x instanceof ApiError ? x.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  };

  const banner = kind === 'login' && !err ? (q.get('registered') ? 'Your account is ready. Please log in.' : q.get('reset') ? 'Your password has been changed. Please log in.' : '') : '';
  const shield = 'Your password is stored in encrypted form';

  return <Shell><div className="min-h-[62vh] bg-[#ebf1f8] py-12 md:py-16"><div className="page-wrap grid max-w-5xl gap-8 md:grid-cols-[.9fr_1.1fr]">
    <div className="flex flex-col justify-center">
      <p className="eyebrow">Your Chakrapay account</p>
      <h1 className="serif mt-3 text-5xl leading-tight text-[#10244d]">{TITLES[kind]}</h1>
      <p className="mt-5 max-w-sm leading-7 text-[#50658f]">{desc[kind]}</p>
      <div className="mt-8 flex items-center gap-3 text-xs text-[#576d99]"><ShieldCheck size={17}/>{shield}</div>
    </div>
    <div className="card p-6 md:p-9">{kind === 'verify' ? <div className="py-4">
      <span className={`flex h-12 w-12 items-center justify-center rounded-full ${verify === 'bad' ? 'bg-[#f5e3e0] text-[#b0432e]' : 'bg-[#e1e8f5] text-[#213f7a]'}`}>{verify === 'bad' ? <X/> : <Check/>}</span>
      <h2 className="serif mt-5 text-3xl text-[#10244d]">{!token ? 'Check your inbox' : verify === 'ok' ? 'Email verified' : verify === 'bad' ? 'We could not verify this link' : 'Verifying…'}</h2>
      <p className="mt-3 leading-6 text-[#50658f]" role={verify === 'bad' ? 'alert' : undefined}>{!token ? 'We sent a verification link to your email. Open it to finish creating your account. It may take a minute to arrive.' : verify === 'ok' ? 'Thank you. Your account is ready, so you can log in now.' : verify === 'bad' ? err || 'This link is not valid or has expired. Please sign up again to get a new one.' : 'Please wait a moment.'}</p>
      {(verify === 'ok' || verify === 'bad' || !token) && <Link className="btn btn-primary mt-6" href={verify === 'bad' ? '/signup' : '/login'}>{verify === 'bad' ? 'Sign up again' : 'Log in'} <ArrowRight size={16}/></Link>}
    </div>
    : notice ? <div className="reveal py-7"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e1e8f5] text-[#213f7a]"><Check/></span><h2 className="serif mt-5 text-3xl text-[#10244d]">Check your email</h2><p className="mt-3 leading-6 text-[#50658f]">{notice}</p><Link className="btn btn-primary mt-6" href="/login">Go to log in <ArrowRight size={16}/></Link></div>
    : kind === 'reset' && !token ? <div className="py-4"><h2 className="serif text-3xl text-[#10244d]">This link is not complete</h2><p className="mt-3 leading-6 text-[#50658f]">Please request a new password reset link.</p><Link className="btn btn-primary mt-6" href="/forgot-password">Get a new link <ArrowRight size={16}/></Link></div>
    : <form onSubmit={submit}>
      <p className="eyebrow">{kind === 'login' ? 'Sign in' : kind === 'signup' ? 'Create account' : kind === 'forgot' ? 'Password help' : 'New password'}</p>
      <h2 className="mt-2 text-xl font-bold text-[#182d57]">{kind === 'login' ? 'Log in to your account' : kind === 'signup' ? 'Tell us a little about you' : kind === 'forgot' ? 'Request a reset link' : 'Set a new password'}</h2>
      <div className="mt-6 grid gap-4">
        {kind === 'signup' && <>
          <label><span className="field-label">Full name</span><input name="name" className="field" required minLength={2} maxLength={80} autoComplete="name" defaultValue={q.get('name') ?? ''} placeholder="As on your ID" data-testid="auth-name"/></label>
          <label><span className="field-label">Mobile number</span><div className="flex"><span className="flex items-center rounded-l-[10px] border border-r-0 border-[#c1cce3] bg-[#eaf0f8] px-3 text-sm text-[#435883]">+91</span><input name="mobile" className="field rounded-l-none" required inputMode="numeric" autoComplete="tel-national" maxLength={10} pattern="[6-9][0-9]{9}" defaultValue={q.get('mobile') ?? ''} placeholder="10-digit mobile number" data-testid="auth-mobile"/></div></label>
        </>}
        {kind !== 'reset' && <label><span className="field-label">Email address</span><input name="email" className="field" type="email" required autoComplete={kind === 'login' ? 'username' : 'email'} defaultValue={q.get('email') ?? ''} placeholder="you@example.com" data-testid="auth-email"/></label>}
        {(kind === 'login' || kind === 'signup' || kind === 'reset') && <label><span className="field-label">{kind === 'reset' ? 'New password' : 'Password'}</span><input name="password" className="field" type="password" required minLength={kind === 'login' ? 1 : 8} autoComplete={kind === 'login' ? 'current-password' : 'new-password'} placeholder={kind === 'login' ? 'Your password' : 'At least 8 characters, with a letter and a number'} data-testid="auth-password"/></label>}
        {kind === 'signup' && <label className="flex items-start gap-3 text-xs leading-5 text-[#586d98]"><input type="checkbox" required className="mt-1 accent-[#213f7a]" data-testid="auth-consent"/><span>I agree to the <Link href="/legal" className="underline">terms and privacy policy</Link>.</span></label>}
      </div>
      {banner && <p className="mt-4 rounded-lg bg-[#e3f0fb] px-3 py-2 text-sm font-semibold text-[#1f5d8f]" role="status" data-testid="auth-registered">{banner}</p>}
      {err && <p className="mt-4 rounded-lg bg-[#f9e9e6] px-3 py-2 text-sm font-semibold text-[#a23a27]" role="alert" data-testid="auth-error">{err}</p>}
      <button className="btn btn-primary mt-6 w-full disabled:opacity-70" type="submit" disabled={busy} data-testid="auth-submit">{busy ? 'Please wait…' : kind === 'login' ? 'Log in' : kind === 'signup' ? 'Create account' : kind === 'forgot' ? 'Send reset link' : 'Change password'}<ArrowRight size={16}/></button>
      <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-[#c9daf1] pt-5 text-sm font-semibold text-[#29447a]">
        {kind === 'login' && <><Link href="/forgot-password">Forgot password?</Link><Link href="/signup">Create an account</Link></>}
        {kind === 'signup' && <Link href="/login">Already have an account? Log in</Link>}
        {(kind === 'forgot' || kind === 'reset') && <Link href="/login">Back to log in</Link>}
      </div>
    </form>}</div>
  </div></div></Shell>;
}
