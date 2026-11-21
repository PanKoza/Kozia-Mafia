import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HAPTIC, vibrate } from '../lib/haptics.js';
import { gsap, lockScroll, reducedMotion, useTweenNumber } from '../lib/motion.js';
import Icon from './Icon.jsx';

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

const BTN = {
  primary: 'bg-blood text-cream border border-ink shadow-[inset_0_0_0_3px_#B3121B,inset_0_0_0_4px_rgba(244,234,213,.55),0_5px_0_#0E0D0C]',
  gold: 'bg-gold text-ink border border-ink shadow-[inset_0_0_0_3px_#E8B53A,inset_0_0_0_4px_rgba(14,13,12,.45),0_5px_0_#0E0D0C]',
  cream: 'paper text-ink border border-ink shadow-[0_5px_0_#0E0D0C]',
  ghost: 'bg-transparent text-cream border border-cream/30',
  dark: 'bg-ink-raised text-cream border border-cream/15 shadow-[0_4px_0_#000]',
  danger: 'bg-transparent text-blood-light border border-blood-light/70',
};

export function Button({ variant = 'primary', className = '', busy, children, onClick, disabled, icon, ...rest }) {
  const ref = useRef(null);
  const press = () => {
    if (reducedMotion() || !ref.current) return;
    gsap.fromTo(ref.current, { scale: 0.96 }, { scale: 1, duration: 0.45, ease: 'elastic.out(1, 0.45)' });
  };
  return (
    <button
      ref={ref}
      {...rest}
      disabled={disabled || busy}
      onPointerDown={press}
      onClick={(e) => {
        vibrate(HAPTIC.tap);
        onClick?.(e);
      }}
      className={`group relative overflow-hidden font-cond uppercase tracking-[0.14em] text-[15px] px-5 py-3.5 rounded-[3px] transition-[transform,box-shadow,opacity] active:translate-y-[3px] active:shadow-none select-none disabled:opacity-35 disabled:pointer-events-none ${BTN[variant]} ${className}`}
    >
      {(variant === 'primary' || variant === 'gold') && (
        <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-sweep" />
      )}
      <span className="relative inline-flex items-center justify-center gap-2">
        {busy ? <Spinner className="h-5 w-5" /> : (
          <>
            {icon && <Icon name={icon} size={18} />}
            {children}
          </>
        )}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Surfaces & type                                                     */
/* ------------------------------------------------------------------ */

const PANEL = {
  dark: 'frame bg-ink-soft/85 text-cream backdrop-blur-[2px]',
  cream: 'paper text-ink shadow-[0_18px_40px_-18px_rgba(0,0,0,.8)]',
  paper: 'paper text-ink shadow-[0_18px_40px_-18px_rgba(0,0,0,.8)]',
  red: 'bg-blood text-cream shadow-[inset_0_0_0_6px_#B3121B,inset_0_0_0_7px_rgba(244,234,213,.5)]',
  night: 'frame bg-night/80 text-cream',
};

export function Panel({ className = '', children, tone = 'dark', ...rest }) {
  return (
    <div {...rest} className={`relative p-4 rounded-[3px] ${PANEL[tone]} ${className}`}>
      {children}
    </div>
  );
}

/** Case-file sheet with a tab label sticking out on top. */
export function Dossier({ tab, no, children, className = '', tone = 'paper', ...rest }) {
  return (
    <div {...rest} className={`relative mt-4 ${className}`}>
      {tab && (
        <div className={`absolute -top-4 left-4 px-3 h-5 flex items-center kicker !text-[10px] rounded-t-[3px] ${tone === 'paper' ? 'paper text-ink/80' : 'bg-ink-raised text-cream/70 border border-b-0 border-cream/15'}`}>
          {tab}
        </div>
      )}
      <Panel tone={tone} className="pt-5">
        {no && <div className="absolute top-2 right-3 font-mono text-[11px] opacity-50">Nº {no}</div>}
        {children}
      </Panel>
    </div>
  );
}

/** Paper header used by every minigame. */
export function GameHeader({ icon, kicker, title, right, children, tone = 'paper' }) {
  const dark = tone === 'red';
  return (
    <div data-reveal className={`relative px-5 pt-4 pb-4 shadow-[0_24px_50px_-20px_rgba(0,0,0,.9)] ${dark ? 'bg-blood text-cream shadow-[inset_0_0_0_5px_#B3121B,inset_0_0_0_6px_rgba(244,234,213,.45)]' : 'paper text-ink'}`}>
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className={`kicker ${dark ? 'text-cream/80' : 'text-blood'}`}>{kicker}</div>
          <h2 className="font-display text-[2.3rem] leading-[0.92] mt-1">{title}</h2>
        </div>
        {right ?? (icon && <Icon name={icon} size={38} stroke={1.3} className="opacity-75 mt-1" />)}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function Title({ children, className = '' }) {
  return <h2 className={`font-display text-[2rem] leading-[0.95] tracking-[-0.01em] ${className}`}>{children}</h2>;
}

export function Label({ children, className = '' }) {
  return <div className={`kicker text-cream/55 ${className}`}>{children}</div>;
}

/** Kicker + thin rule. */
export function Rule({ children, className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="kicker text-cream/55 whitespace-nowrap">{children}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-cream/25 to-transparent" />
    </div>
  );
}

export function Stamp({ children, className = '', color = 'text-blood' }) {
  return <span className={`stamp text-sm ${color} ${className}`}>{children}</span>;
}

export function Spinner({ className = 'h-6 w-6' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".2" strokeWidth="2.5" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function Input({ label, className = '', ...rest }) {
  return (
    <label className="block group">
      {label && <span className="kicker text-ink/60">{label}</span>}
      <input
        {...rest}
        className={`mt-1 w-full bg-transparent border-0 border-b-2 border-ink/40 px-0.5 py-2 font-mono text-xl text-ink outline-none placeholder:text-ink/30 focus:border-blood transition-colors ${className}`}
      />
    </label>
  );
}

/** Animated number (GSAP tween, flashes gold up / red down). */
export function Num({ value, className = '', format }) {
  const ref = useTweenNumber(value, format ? { format } : undefined);
  const [initial] = useState(() => (format ? format(value) : Math.round(value).toLocaleString('pl-PL')));
  return (
    <span ref={ref} className={`inline-block tabular-nums ${className}`}>
      {initial}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Modal – bottom sheet that slides up like a file drawer              */
/* ------------------------------------------------------------------ */

export function Modal({ open, onClose, children, tone = 'cream', dismissable = true }) {
  const [mounted, setMounted] = useState(open);
  const back = useRef(null);
  const sheet = useRef(null);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useLayoutEffect(() => {
    if (!mounted) return;
    const b = back.current;
    const s = sheet.current;
    if (!b || !s) return;
    if (open) {
      lockScroll(true);
      gsap.fromTo(b, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 });
      gsap.fromTo(s, { yPercent: 105, rotate: 1.5 }, { yPercent: 0, rotate: 0, duration: 0.6, ease: 'expo.out' });
    } else {
      gsap.to(s, { yPercent: 105, duration: 0.35, ease: 'power3.in' });
      gsap.to(b, { autoAlpha: 0, duration: 0.3, delay: 0.1, onComplete: () => setMounted(false) });
      lockScroll(false);
    }
  }, [open, mounted]);

  useEffect(() => () => lockScroll(false), []);

  if (!mounted) return null;
  const tones = {
    cream: 'paper text-ink',
    dark: 'bg-ink-soft text-cream border-t border-cream/15',
    red: 'bg-blood text-cream',
  };
  return createPortal(
    <div ref={back} className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-[3px]" onClick={() => dismissable && onClose?.()}>
      <div
        ref={sheet}
        data-lenis-prevent
        className={`relative w-full sm:max-w-md max-h-[88dvh] overflow-y-auto rounded-t-[6px] sm:rounded-[4px] px-6 pt-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_rgba(0,0,0,.6)] ${tones[tone]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 h-1 w-10 rounded-full bg-current opacity-20" />
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ------------------------------------------------------------------ */
/* Toasts → telegrams                                                  */
/* ------------------------------------------------------------------ */

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

function Telegram({ t, onClose }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    gsap.fromTo(ref.current, { y: -80, rotate: -3, autoAlpha: 0 }, { y: 0, rotate: t.kind === 'error' ? 1 : -0.6, autoAlpha: 1, duration: 0.55, ease: 'back.out(1.6)' });
  }, [t.kind]);
  const close = () => gsap.to(ref.current, { y: -60, autoAlpha: 0, duration: 0.25, onComplete: onClose });
  useEffect(() => {
    const id = setTimeout(close, t.kind === 'error' ? 3500 : t.kind === 'notify' ? 3200 : 4500);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const style = {
    info: 'paper text-ink',
    notify: 'paper text-ink',
    success: 'bg-gold text-ink',
    error: 'bg-blood text-cream',
  }[t.kind];
  return (
    <div ref={ref} onClick={close} className={`pointer-events-auto max-w-sm w-full px-4 py-3 shadow-[0_14px_30px_-10px_rgba(0,0,0,.8)] border border-ink/70 ${style}`}>
      <div className="flex items-center justify-between kicker !text-[10px] opacity-70">
        <span>{t.title || (t.kind === 'error' ? 'Odmowa' : 'Telegram')}</span>
        <span className="font-mono normal-case tracking-normal">{new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div className="font-mono text-[15px] leading-snug mt-1 uppercase tracking-wide">{t.text}</div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((text, kind = 'info', title) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-1), { id, text, kind, title }]);
    if (kind === 'error') vibrate(HAPTIC.error);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {createPortal(
        <div className="fixed top-0 inset-x-0 z-[80] flex flex-col items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pointer-events-none">
          {toasts.map((t) => (
            <Telegram key={t.id} t={t} onClose={() => setToasts((x) => x.filter((y) => y.id !== t.id))} />
          ))}
        </div>,
        document.body
      )}
    </ToastCtx.Provider>
  );
}

/** Wraps an async action with busy state + error toast. */
export function useAction(fn) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (...args) => {
      setBusy(true);
      try {
        return await fn(...args);
      } catch (e) {
        toast(e.message, 'error');
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [fn, toast]
  );
  return [run, busy];
}

/* ------------------------------------------------------------------ */
/* Player picker – suspect cards                                       */
/* ------------------------------------------------------------------ */

export function PlayerPicker({ players, selected, onSelect, disabledIds = [], tags = {}, columns = 2, stampText = 'Wybrany' }) {
  const refs = useRef({});
  useEffect(() => {
    const el = refs.current[selected];
    if (el && !reducedMotion()) gsap.fromTo(el.querySelector('[data-stamp]'), { scale: 2.4, autoAlpha: 0, rotate: -20 }, { scale: 1, autoAlpha: 1, rotate: -9, duration: 0.45, ease: 'back.out(2)' });
  }, [selected]);
  return (
    <div className={`grid gap-2.5 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {players.map((p, i) => {
        const disabled = disabledIds.includes(p.id);
        const active = selected === p.id;
        return (
          <button
            key={p.id}
            ref={(el) => (refs.current[p.id] = el)}
            disabled={disabled}
            data-reveal
            onClick={() => {
              vibrate(HAPTIC.tap);
              onSelect(p.id);
            }}
            className={`relative overflow-hidden text-left rounded-[3px] px-3 py-3 transition-all duration-300 disabled:opacity-30 ${
              active ? 'paper text-ink -rotate-[0.6deg] shadow-[0_10px_24px_-10px_rgba(0,0,0,.9)]' : 'frame bg-ink-soft text-cream active:bg-ink-raised'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 shrink-0 flex items-center justify-center font-display text-lg ${active ? 'bg-ink text-cream' : 'bg-cream/10 text-cream'}`}>
                {p.nick[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate leading-tight">{p.nick}</div>
                <div className={`font-mono text-[10px] leading-tight mt-0.5 ${active ? 'text-ink/60' : 'text-cream/35'}`}>
                  {tags[p.id] || `AKTA ${String(i + 1).padStart(3, '0')}`}
                </div>
              </div>
            </div>
            <span data-stamp className={`absolute right-1.5 bottom-1 stamp !text-[10px] !border-2 text-blood ${active ? '' : 'invisible'}`}>
              {stampText}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hold-to-reveal                                                      */
/* ------------------------------------------------------------------ */

export function HoldToReveal({ children, hint = 'Przytrzymaj, aby odsłonić', className = '' }) {
  const [shown, setShown] = useState(false);
  const timer = useRef(null);
  const start = (e) => {
    e.preventDefault();
    timer.current = setTimeout(() => {
      setShown(true);
      vibrate(HAPTIC.ok);
    }, 250);
  };
  const end = () => {
    clearTimeout(timer.current);
    setShown(false);
  };
  return (
    <div className={`relative select-none touch-none ${className}`} onPointerDown={start} onPointerUp={end} onPointerLeave={end} onPointerCancel={end} onContextMenu={(e) => e.preventDefault()}>
      <div className={`transition-all duration-200 ${shown ? '' : 'blur-xl opacity-0'}`}>{children}</div>
      {!shown && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 border border-dashed border-cream/25 bg-ink/85">
          <Icon name="hand" size={30} className="text-cream/70" />
          <div className="kicker text-cream/70">{hint}</div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export function Badge({ children, tone = 'cream', className = '' }) {
  const tones = {
    cream: 'bg-cream text-ink',
    red: 'bg-blood text-cream',
    gold: 'bg-gold text-ink',
    dark: 'bg-transparent text-cream/80 border border-cream/25',
  };
  return <span className={`inline-flex items-center gap-1 rounded-[2px] px-2 py-0.5 font-cond uppercase tracking-[0.16em] text-[10px] ${tones[tone]} ${className}`}>{children}</span>;
}

export function Empty({ icon = 'fedora', children }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 text-cream/45">
      <Icon name={icon} size={44} stroke={1.2} />
      <div className="max-w-xs mt-3 font-mono text-sm">{children}</div>
    </div>
  );
}
