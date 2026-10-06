import { useEffect, useState, type ComponentType } from 'react';
import { BriefcaseBusiness, Building2, GraduationCap, Home as HomeIcon, IndianRupee, Wallet } from 'lucide-react';
import { DOC_LABEL, get, type LoanTypeApi } from './api';

// ---------- small cache + hook ----------
function useCached<T>(key: string, load: () => Promise<T>, fallback: T): { data: T; loading: boolean; failed: boolean } {
  const [state, set] = useState<{ data: T; loading: boolean; failed: boolean }>(() => {
    const hit = cache.get(key) as T | undefined;
    return hit !== undefined ? { data: hit, loading: false, failed: false } : { data: fallback, loading: true, failed: false };
  });
  useEffect(() => {
    if (cache.has(key)) return;
    let off = false;
    (pending.get(key) ?? pending.set(key, load().then(v => { cache.set(key, v); return v; }).finally(() => pending.delete(key))).get(key)!)
      .then(v => { if (!off) set({ data: v as T, loading: false, failed: false }); })
      .catch(() => { if (!off) set({ data: fallback, loading: false, failed: true }); });
    return () => { off = true; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}
const cache = new Map<string, unknown>();
const pending = new Map<string, Promise<unknown>>();
export const clearDataCache = () => cache.clear();

// ---------- formatting ----------
export const fmt = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
export function inr(n: number): string {
  if (n >= 1e7) return `₹${+(n / 1e7).toFixed(2)} crore`;
  if (n >= 1e5) return `₹${+(n / 1e5).toFixed(2)} lakh`;
  return `₹${fmt(n)}`;
}
const termText = (min: number, max: number) => (max > 60 ? `Up to ${+(max / 12).toFixed(1)} years` : min === max ? `${max} months` : `${min}–${max} months`);

// ---------- loan types ----------
export type LoanUi = {
  id: string; dbId: number; name: string; amount: string; rate: string; term: string;
  min: number; max: number; annualRate: number; minMonths: number; maxMonths: number;
  icon: ComponentType<{ size?: number; className?: string }>; intro: string; tag: string;
  eligibility: string; documents: string; fees: string; requiredDocs: string[];
};

const META: Record<string, { icon: LoanUi['icon']; intro: string; tag: string }> = {
  personal: { icon: Wallet, tag: 'For everyday needs', intro: 'Help for life’s big and small needs, like a wedding, a medical bill or a home repair.' },
  home: { icon: HomeIcon, tag: 'For your own home', intro: 'Take a step towards a home of your own.' },
  business: { icon: BriefcaseBusiness, tag: 'For your business', intro: 'Money to grow your shop, workshop or business.' },
  education: { icon: GraduationCap, tag: 'For studies', intro: 'Support your child’s studies, or your own, with a clear plan.' },
  gold: { icon: IndianRupee, tag: 'For urgent needs', intro: 'Use the gold you already own to meet an urgent need.' },
  property: { icon: Building2, tag: 'For bigger needs', intro: 'Use your property to raise a bigger amount for important needs.' },
  'loan-against-property': { icon: Building2, tag: 'For bigger needs', intro: 'Use your property to raise a bigger amount for important needs.' },
};

export function toUi(t: LoanTypeApi): LoanUi {
  const m = META[t.slug] ?? { icon: Wallet, tag: 'Loan option', intro: `${t.name}, explained in simple words.` };
  const docs = t.required_docs.map(d => DOC_LABEL[d] ?? d);
  return {
    id: t.slug, dbId: t.id, name: t.name, ...m,
    amount: `${inr(t.min_amount)} – ${inr(t.max_amount)}`, rate: `From ${t.min_rate}% p.a.*`, term: termText(t.min_tenure, t.max_tenure),
    min: t.min_amount, max: t.max_amount, annualRate: t.min_rate, minMonths: t.min_tenure, maxMonths: t.max_tenure,
    eligibility: t.eligibility_text || 'Eligibility rules are set by the partner NBFC and will be confirmed.',
    documents: docs.length ? docs.join(', ') : 'The partner NBFC will confirm the documents you need.',
    fees: t.fees ?? '', requiredDocs: t.required_docs,
  };
}

// Used only if the server cannot be reached, so the public pages never go blank.
const FALLBACK_API: LoanTypeApi[] = [
  { id: 1, name: 'Personal loan', slug: 'personal', min_rate: 11.5, min_amount: 25000, max_amount: 2500000, min_tenure: 12, max_tenure: 60, fees: null, eligibility_text: '', required_docs: ['pan', 'salary_slip', 'bank_statement'], is_active: true, sort_order: 1 },
  { id: 2, name: 'Home loan', slug: 'home', min_rate: 8.5, min_amount: 100000, max_amount: 50000000, min_tenure: 12, max_tenure: 360, fees: null, eligibility_text: '', required_docs: ['pan', 'salary_slip', 'bank_statement'], is_active: true, sort_order: 2 },
  { id: 3, name: 'Business loan', slug: 'business', min_rate: 14, min_amount: 100000, max_amount: 7500000, min_tenure: 12, max_tenure: 60, fees: null, eligibility_text: '', required_docs: ['pan', 'bank_statement'], is_active: true, sort_order: 3 },
  { id: 4, name: 'Education loan', slug: 'education', min_rate: 10.5, min_amount: 50000, max_amount: 4000000, min_tenure: 12, max_tenure: 180, fees: null, eligibility_text: '', required_docs: ['pan'], is_active: true, sort_order: 4 },
  { id: 5, name: 'Gold loan', slug: 'gold', min_rate: 9.5, min_amount: 10000, max_amount: 5000000, min_tenure: 3, max_tenure: 36, fees: null, eligibility_text: '', required_docs: ['pan'], is_active: true, sort_order: 5 },
  { id: 6, name: 'Loan against property', slug: 'loan-against-property', min_rate: 11, min_amount: 100000, max_amount: 50000000, min_tenure: 12, max_tenure: 180, fees: null, eligibility_text: '', required_docs: ['pan', 'bank_statement'], is_active: true, sort_order: 6 },
];
const FALLBACK = FALLBACK_API.map(toUi);

export function useLoanTypes() {
  const r = useCached<LoanUi[]>('loan-types', async () => (await get<LoanTypeApi[]>('/loan-types')).filter(t => t.is_active).sort((a, b) => a.sort_order - b.sort_order).map(toUi), FALLBACK);
  return { loanTypes: r.data, loading: r.loading, failed: r.failed };
}

// ---------- company / lender / grievance / consent ----------
export type SiteConfig = {
  brand: string; company: string; address: string; cin: string; phone: string; whatsapp: string; email: string;
  nbfc: { name: string; url: string }; grievance: { name: string; email: string; phone: string | null };
  lspStatement: string; noFeeLine: string; ratesDisclaimer: string; eligibilityDisclaimer: string; consentText: string; consentVersion: string;
};
const TBC = 'To be confirmed';
const SITE_FALLBACK: SiteConfig = {
  brand: 'Chakrapay', company: 'Chakrapay Technology', address: TBC, cin: TBC, phone: TBC, whatsapp: TBC, email: TBC,
  nbfc: { name: TBC, url: '' }, grievance: { name: TBC, email: TBC, phone: null },
  lspStatement: 'We are a lending service provider. Loans are sanctioned and disbursed by our partner NBFC.',
  noFeeLine: 'We do not charge any advance or processing fee.',
  ratesDisclaimer: 'Rates are indicative. Final approval, rate and terms are decided by the lender.',
  eligibilityDisclaimer: 'This is an indicative estimate only. Final approval is by the lender.',
  consentText: 'I agree that my details may be shared with the partner NBFC and that the team may call me about my loan enquiry.', consentVersion: '',
};
const tbc = (v: unknown) => (typeof v === 'string' && v && !/^TO BE CONFIRMED/i.test(v) ? v : TBC);

export function useSiteConfig(): SiteConfig {
  return useCached<SiteConfig>('site-config', async () => {
    const c: any = await get('/config/site');
    return {
      brand: 'Chakrapay', company: tbc(c.companyName), address: tbc(c.address), cin: tbc(c.cin),
      phone: tbc(c.contact?.phone), whatsapp: tbc(c.contact?.whatsapp), email: tbc(c.contact?.email),
      nbfc: { name: tbc(c.partnerNbfc?.name), url: c.partnerNbfc?.url ?? '' },
      grievance: { name: tbc(c.grievanceOfficer?.name), email: tbc(c.grievanceOfficer?.email), phone: c.grievanceOfficer?.phone ?? null },
      lspStatement: c.legal?.lspStatement ?? SITE_FALLBACK.lspStatement, noFeeLine: c.legal?.noFeeLine ?? SITE_FALLBACK.noFeeLine,
      ratesDisclaimer: c.legal?.ratesDisclaimer ?? SITE_FALLBACK.ratesDisclaimer, eligibilityDisclaimer: c.legal?.eligibilityDisclaimer ?? SITE_FALLBACK.eligibilityDisclaimer,
      consentText: c.consent?.text ?? SITE_FALLBACK.consentText, consentVersion: c.consent?.version ?? '',
    };
  }, SITE_FALLBACK).data;
}
