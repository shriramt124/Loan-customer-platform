// Small hooks that connect the existing screens to the backend. Nothing here changes how a page looks.
import { useEffect, useState } from 'react';
import { getUser, get, type LoanTypeApi, type User } from './api';

export function useUser(): User | null {
  const [u, setU] = useState<User | null>(getUser());
  useEffect(() => {
    const on = () => setU(getUser());
    window.addEventListener('chakrapay-auth', on); window.addEventListener('storage', on);
    return () => { window.removeEventListener('chakrapay-auth', on); window.removeEventListener('storage', on); };
  }, []);
  return u;
}

const cache = new Map<string, unknown>();
function useFetched<T>(key: string, load: () => Promise<T>): T | null {
  const [v, setV] = useState<T | null>((cache.get(key) as T | undefined) ?? null);
  useEffect(() => {
    if (cache.has(key)) return;
    let off = false;
    load().then(r => { cache.set(key, r); if (!off) setV(r); }).catch(() => { /* the page keeps its built-in text */ });
    return () => { off = true; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}
export const clearLiveCache = () => cache.clear();

export const useApiLoanTypes = () => useFetched<LoanTypeApi[]>('loan-types', () => get<LoanTypeApi[]>('/loan-types'));

export type Site = { company?: string; nbfc?: string; grievance?: string; email?: string; phone?: string; whatsapp?: string; address?: string; consentText?: string; consentVersion?: string };
const real = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() && !/^TO BE CONFIRMED/i.test(v) ? v : undefined);
export const useSite = (): Site => useFetched<Site>('site', async () => {
  const c: any = await get('/config/site');
  const g = c.grievanceOfficer ?? {};
  const gv = [real(g.name), real(g.email), real(g.phone)].filter(Boolean).join(' · ');
  return {
    company: real(c.companyName), nbfc: real(c.partnerNbfc?.name), grievance: gv || undefined, email: real(c.contact?.email),
    phone: real(c.contact?.phone), whatsapp: real(c.contact?.whatsapp), address: real(c.address),
    consentText: real(c.consent?.text), consentVersion: c.consent?.version,
  };
}) ?? {};
