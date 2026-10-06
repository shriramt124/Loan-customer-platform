import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowRight, ArrowUpRight, Menu, MessageCircle, ShieldCheck, X } from 'lucide-react';
import { TopProgress, RevealOnScroll } from './scroll-effects';
import { getUser, logout, TEAM_ROLES, type User } from '../lib/api';
import { useSiteConfig } from '../lib/data';

export function useUser(): User | null {
 const[user,setUser]=useState<User|null>(getUser);
 useEffect(()=>{const f=()=>setUser(getUser());window.addEventListener('chakrapay-auth',f);window.addEventListener('storage',f);return()=>{window.removeEventListener('chakrapay-auth',f);window.removeEventListener('storage',f)}},[]);
 return user;
}
export function ButtonLink({ href, children, secondary=false, testid }: { href:string;children:ReactNode;secondary?:boolean;testid?:string }) {
  return <Link href={href} className={`btn ${secondary?'btn-outline':'btn-primary'}`} data-testid={testid}>{children}<ArrowRight size={16}/></Link>;
}

function Header() {
  const site=useSiteConfig();
  const [open,setOpen]=useState(false);
  const [path]=useLocation();
  const user=useUser();
  const links=[['Loans','/loans'],['How it works','/about'],['EMI calculator','/calculator'],['Help','/contact']];
  return <>
    <div className="demo-strip"><div className="page-wrap flex items-center justify-center gap-2 py-2 text-center"><span className="inline-block h-1.5 w-1.5 rounded-full bg-[#218cce]"/><span>{site.brand} is a loan service provider · Rates are indicative and the final decision is by our partner NBFC</span></div></div>
    <header className="sticky top-0 z-40 border-b border-[#cedef2] bg-[#f9fbfd]/95 backdrop-blur-md">
      <div className="page-wrap flex h-[76px] items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5" data-testid="link-brand">
          <img src="/chakrapay-logo.png" alt="Chakrapay Technology" className="h-9 w-auto md:h-10" width="170" height="37"/>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map(([label,href])=><Link key={href} href={href} data-testid={`nav-${label.toLowerCase().replaceAll(' ','-')}`} className={`text-[.84rem] font-semibold transition-colors hover:text-[#34a7ee] ${path===href?'text-[#34a7ee]':'text-[#2f436c]'}`}>{label}</Link>)}
        </nav>
        <div className="hidden items-center gap-4 md:flex">
          {user?<>{TEAM_ROLES.includes(user.role)&&<Link href="/admin" className="text-sm font-bold text-[#2f6fb0]" data-testid="nav-admin">Admin panel</Link>}<Link href={user.role==='customer'?"/account/applications":"/admin"} className="text-sm font-bold text-[#10244d]" data-testid="nav-account">Hi, {user.name.split(' ')[0]}</Link><button onClick={logout} className="text-sm font-semibold text-[#4f648d] underline-offset-4 hover:underline" data-testid="nav-logout">Log out</button></>:<Link href="/login" className="text-sm font-bold text-[#10244d]" data-testid="nav-login">Log in</Link>}
          <ButtonLink href="/eligibility" testid="nav-check-eligibility">Check eligibility</ButtonLink>
        </div>
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c3d1ec] md:hidden" aria-label={open?'Close menu':'Open menu'} onClick={()=>setOpen(!open)} data-testid="button-mobile-menu">{open?<X size={19}/>:<Menu size={19}/>}</button>
      </div>
      {open&&<div className="border-t border-[#cedef2] bg-[#f9fbfd] px-5 py-4 md:hidden"><nav className="mx-auto flex max-w-lg flex-col gap-1">{links.map(([label,href])=><Link key={href} href={href} onClick={()=>setOpen(false)} className="rounded-lg px-3 py-3 font-semibold text-[#1b2f58]" data-testid={`mobile-nav-${label.toLowerCase().replaceAll(' ','-')}`}>{label}</Link>)}<Link href="/account/applications" className="rounded-lg px-3 py-3 font-semibold text-[#1b2f58]" onClick={()=>setOpen(false)}>My applications</Link>{user&&TEAM_ROLES.includes(user.role)&&<Link href="/admin" className="rounded-lg px-3 py-3 font-semibold text-[#2f6fb0]" onClick={()=>setOpen(false)}>Admin panel</Link>}{user?<button className="btn btn-outline mt-2" onClick={()=>{logout();setOpen(false)}}>Log out ({user.name.split(' ')[0]})</button>:<Link href="/login" className="btn btn-primary mt-2" onClick={()=>setOpen(false)}>Log in / Sign up <ArrowRight size={16}/></Link>}</nav></div>}
    </header>
  </>;
}

function Footer() {
  const site=useSiteConfig();
  return <footer className="mt-24 bg-[#0c1f46] text-[#eff0e5]">
    <div className="page-wrap grid gap-12 py-14 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
      <div><span className="inline-flex rounded-xl bg-white px-3 py-2"><img src="/chakrapay-logo.png" alt="Chakrapay Technology" className="h-8 w-auto" width="150" height="33"/></span><p className="mt-4 max-w-xs text-sm leading-6 text-[#b8c4db]">Understand your loan options in simple words. No pressure and no confusing fine print.</p><div className="mt-5 inline-flex rounded-full border border-[#4e6798] px-3 py-1.5 text-[.7rem] text-[#c7d4ee]"><ShieldCheck size={14} className="mr-2"/>Honest and transparent</div></div>
      <div><p className="eyebrow !text-[#6db0da]">Explore</p><div className="mt-4 grid gap-3 text-sm text-[#c7d4ed]"><Link href="/loans">Loan options</Link><Link href="/calculator">EMI calculator</Link><Link href="/eligibility">Check eligibility</Link><Link href="/about">How it works</Link></div></div>
      <div><p className="eyebrow !text-[#6db0da]">Your account</p><div className="mt-4 grid gap-3 text-sm text-[#c7d4ed]"><Link href="/login">Log in</Link><Link href="/account/applications">Applications</Link><Link href="/account/profile">Profile</Link><Link href="/contact">Get help</Link></div></div>
      <div><p className="eyebrow !text-[#6db0da]">Good to know</p><p className="mt-4 text-sm leading-6 text-[#c7d4ed]">{site.lspStatement}</p><p className="mt-3 text-xs leading-5 text-[#9eadca]">Lender: {site.nbfc.url?<a href={site.nbfc.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{site.nbfc.name}</a>:site.nbfc.name}<br/>Grievance officer: {site.grievance.name} · {site.grievance.email}{site.grievance.phone?` · ${site.grievance.phone}`:''}</p><Link href="/legal" className="mt-3 inline-flex items-center gap-1 text-sm underline underline-offset-4">Legal & disclosures <ArrowUpRight size={14}/></Link></div>
    </div>
    <div className="border-t border-white/10"><div className="page-wrap flex flex-col justify-between gap-3 py-5 text-xs text-[#9eadca] md:flex-row"><span>{site.brand} · {site.company}</span><span>{site.noFeeLine}</span></div></div>
  </footer>;
}
export function Shell({children}:{children:ReactNode}) { return <><Header/><TopProgress/><main><RevealOnScroll/>{children}</main><Footer/><Link href="/contact" className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-[#10244d] px-4 py-3 text-sm font-bold text-[#ebf1f8] shadow-lg transition-transform hover:-translate-y-1" aria-label="Contact us about a callback or WhatsApp" data-testid="persistent-contact-entry"><MessageCircle size={17}/><span>Callback / WhatsApp</span></Link></>; }

export function PageIntro({eyebrow,title,desc}:{eyebrow:string;title:ReactNode;desc:string}) {
 return <section className="bg-[#e4eaf6] py-14 md:py-[72px]"><div className="page-wrap"><p className="eyebrow">{eyebrow}</p><h1 className="serif mt-3 max-w-3xl text-5xl leading-[1.02] tracking-[-.035em] text-[#10244d] md:text-[4.4rem]">{title}</h1><p className="mt-5 max-w-2xl text-lg leading-7 text-[#465b86]">{desc}</p></div></section>;
}

