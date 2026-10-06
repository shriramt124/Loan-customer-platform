import { useCallback, useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ApiError } from '../lib/api';

export const slug = (s: string) => s.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/(^-|-$)/g, '');
export const fmtDate = (d: string) => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d));
export const fmtTime = (d: string) => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
export const rupees = (n: number) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;
export const errText = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');

// ---------- toast ----------
export const toast = (text: string) => window.dispatchEvent(new CustomEvent('ad-toast', { detail: text }));

// ---------- data loading ----------
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, set] = useState<{ data: T | null; error: string; loading: boolean }>({ data: null, error: '', loading: true });
  const reload = useCallback(() => {
    set(s => ({ ...s, loading: true, error: '' }));
    load().then(d => set({ data: d, error: '', loading: false })).catch(e => set(s => ({ data: s.data, error: errText(e), loading: false })));
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}

// ---------- building blocks ----------
export function PageHead({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="ad-page-head"><div><p className="ad-kicker">Chakrapay operations workbench</p><h1>{title}</h1><p className="ad-subtitle">{description}</p></div>{action && <div className="ad-head-actions">{action}</div>}</div>;
}
export function Button({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`ad-button ${className}`}>{children}</button>;
}
export function Modal({ title, description, onClose, children, footer }: { title: string; description?: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return <div className="ad-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="ad-modal" role="dialog" aria-modal="true" aria-label={title}>
      <header className="ad-modal-head"><div><h2>{title}</h2>{description && <p>{description}</p>}</div><button type="button" className="ad-close" onClick={onClose} aria-label="Close dialog" data-testid="button-dialog-close"><X size={17}/></button></header>
      <div className="ad-modal-body">{children}</div>{footer && <footer className="ad-modal-foot">{footer}</footer>}
    </section>
  </div>;
}
export function StatusPill({ value }: { value: string }) { return <span className={`ad-status ${slug(value)}`} data-testid={`status-${slug(value)}`}>{value}</span>; }
export const Loading = ({ what = 'Loading' }: { what?: string }) => <div className="ad-empty" role="status">{what}…</div>;
export const Problem = ({ text, retry }: { text: string; retry?: () => void }) => <div className="ad-login-alert" role="alert">{text}{retry && <> <button type="button" className="ad-link" onClick={retry}>Try again</button></>}</div>;
export function Metric({ label, value, note, icon: I }: { label: string; value: ReactNode; note: string; icon: (p: { size?: number }) => ReactNode }) {
  return <div className="ad-card ad-metric"><div className="ad-metric-top"><span>{label}</span><span className="ad-metric-icon"><I size={16}/></span></div><strong>{value}</strong><small>{note}</small></div>;
}
export function Pagination({ page, pageSize, total, onPage, noun = 'records' }: { page: number; pageSize: number; total: number; onPage: (p: number) => void; noun?: string }) {
  const count = Math.max(1, Math.ceil(total / pageSize));
  return <div className="ad-pagination"><span>Showing {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} of {total} {noun}</span>
    <div className="ad-page-buttons"><button type="button" onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1} aria-label="Previous page" data-testid="button-page-previous"><ChevronLeft size={15}/></button><button className="current" type="button" data-testid="text-current-page">{page}</button><button type="button" onClick={() => onPage(Math.min(count, page + 1))} disabled={page >= count} aria-label="Next page" data-testid="button-page-next"><ChevronRight size={15}/></button></div></div>;
}
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '—';
