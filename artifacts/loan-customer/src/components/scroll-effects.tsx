import { useEffect, useRef, type ReactNode } from 'react';

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Runs `fn` on every animation frame while the page scrolls or resizes. */
function useScrollFrame(fn: () => void) {
  useEffect(() => {
    if (reduced()) return;
    let raf = 0;
    const run = () => { raf = 0; fn(); };
    const on = () => { if (!raf) raf = requestAnimationFrame(run); };
    fn();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); };
  }, [fn]);
}

/** Children marked data-depth="0.2" drift at that fraction of the scroll speed. */
export function Parallax({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollFrame(() => {
    const el = ref.current; if (!el) return;
    const offset = window.scrollY - el.offsetTop;
    el.querySelectorAll<HTMLElement>('[data-depth]').forEach(c => {
      c.style.translate = `0 ${(offset * Number(c.dataset.depth)).toFixed(1)}px`;
    });
  });
  return <div ref={ref} className={className}>{children}</div>;
}

/** Cards pin to the top as you scroll; each one shrinks slightly as the next slides over it. */
export function CardStack({ children }: { children: ReactNode[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollFrame(() => {
    const cards = ref.current?.querySelectorAll<HTMLElement>('[data-stack-card]'); if (!cards) return;
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      let p = 0;
      if (next) {
        const gap = next.getBoundingClientRect().top - card.getBoundingClientRect().top;
        p = Math.min(1, Math.max(0, 1 - gap / card.offsetHeight));
      }
      card.style.setProperty('--stack-p', p.toFixed(3));
    });
  });
  return <div ref={ref} className="stack">{children.map((c, i) => <div key={i} data-stack-card className="stack-card" style={{ ['--i' as string]: i }}>{c}</div>)}</div>;
}

/** A vertical line that fills as the section scrolls through the viewport. */
export function ScrollProgress({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollFrame(() => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (window.innerHeight * 0.6 - r.top) / r.height));
    el.style.setProperty('--progress', p.toFixed(3));
    const steps = el.querySelectorAll<HTMLElement>('[data-step]');
    steps.forEach(s => s.classList.toggle('is-active', s.getBoundingClientRect().top < window.innerHeight * 0.6));
  });
  return <div ref={ref} className="progress-track">{children}</div>;
}

/** Fades each top-level section of the page in once as it scrolls into view. Skips sections that contain sticky stacks. */
export function RevealOnScroll() {
  const pending = useRef<HTMLElement[]>([]);
  useEffect(() => {
    if (reduced()) return;
    pending.current = [...document.querySelectorAll<HTMLElement>('main > section, main > div > section')].filter(e => !e.querySelector('.stack') && e.getBoundingClientRect().top > window.innerHeight * 0.9);
    pending.current.forEach(e => e.classList.add('will-reveal'));
    return () => pending.current.forEach(e => e.classList.remove('will-reveal', 'revealed'));
  }, []);
  useScrollFrame(() => {
    pending.current = pending.current.filter(e => {
      if (e.getBoundingClientRect().top > window.innerHeight * 0.88) return true;
      e.classList.add('revealed');
      return false;
    });
  });
  return null;
}

/** Thin reading-progress bar at the very top; also marks <html data-scrolled> so the header can gain depth. */
export function TopProgress() {
  const bar = useRef<HTMLDivElement>(null);
  useScrollFrame(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.current?.style.setProperty('--sp', max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : '0');
    document.documentElement.toggleAttribute('data-scrolled', window.scrollY > 8);
  });
  return <div ref={bar} className="top-progress" aria-hidden="true" />;
}
