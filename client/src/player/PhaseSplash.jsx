import { useRef } from 'react';
import Icon from '../components/Icon.jsx';
import { gsap, useGSAP } from '../lib/motion.js';

const CONTENT = {
  city_vote: { icon: 'ballot', kicker: 'Wszyscy do salonu', title: 'Obrady miasta', sub: 'Kto opuści dziś dom?', panel: '#EDE1C6', text: '#0E0D0C', accent: '#B3121B' },
  night: { icon: 'moon', kicker: 'Gasimy światła', title: 'Zapada noc', sub: 'Mafia wychodzi na łowy', panel: '#090A12', text: '#F4EAD5', accent: '#E0333C' },
  day: { icon: 'sun', kicker: 'Poranna gazeta', title: 'Nowy dzień', sub: 'Zobaczmy, co przyniosła noc', panel: '#E8B53A', text: '#0E0D0C', accent: '#0E0D0C' },
  ended: { icon: 'fedora', kicker: 'Sprawa zamknięta', title: 'Koniec gry', sub: 'Czas poznać prawdę', panel: '#B3121B', text: '#F4EAD5', accent: '#0E0D0C' },
};

/** Two shutters slam shut, title slams in, shutters open. */
export default function PhaseSplash({ phase, day, onDone }) {
  const c = CONTENT[phase];
  const scope = useRef(null);
  useGSAP(
    () => {
      if (!c) return onDone();
      const tl = gsap.timeline({ onComplete: onDone });
      tl.fromTo('[data-top]', { yPercent: -100 }, { yPercent: 0, duration: 0.5, ease: 'power4.in' })
        .fromTo('[data-bot]', { yPercent: 100 }, { yPercent: 0, duration: 0.5, ease: 'power4.in' }, 0)
        .fromTo('[data-seam]', { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: 'expo.out' }, 0.45)
        .from('[data-icon]', { scale: 0, rotate: -90, duration: 0.6, ease: 'back.out(2)' }, 0.5)
        .from('[data-kick] span', { autoAlpha: 0, y: 10, stagger: 0.025, duration: 0.3 }, 0.6)
        .from('[data-title] span', { yPercent: 120, rotate: 6, stagger: 0.035, duration: 0.6, ease: 'expo.out' }, 0.65)
        .from('[data-sub]', { autoAlpha: 0, y: 10, duration: 0.4 }, 1.0)
        .to('[data-content]', { autoAlpha: 0, y: -20, duration: 0.3, ease: 'power2.in' }, 2.15)
        .to('[data-top]', { yPercent: -100, duration: 0.6, ease: 'expo.inOut' }, 2.3)
        .to('[data-bot]', { yPercent: 100, duration: 0.6, ease: 'expo.inOut' }, 2.3)
        .to('[data-seam]', { autoAlpha: 0, duration: 0.2 }, 2.3);
    },
    { scope }
  );
  if (!c) return null;
  return (
    <div ref={scope} className="fixed inset-0 z-[60] overflow-hidden" onClick={onDone}>
      <div data-top className="absolute inset-x-0 top-0 h-1/2" style={{ background: c.panel }} />
      <div data-bot className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: c.panel }} />
      <div data-seam className="absolute inset-x-6 top-1/2 h-px" style={{ background: c.accent, opacity: 0.6 }} />
      <div data-content className="absolute inset-0 flex flex-col items-center justify-center text-center px-6" style={{ color: c.text }}>
        <div data-icon className="w-20 h-20 rounded-full border-2 flex items-center justify-center" style={{ borderColor: c.accent, color: c.accent }}>
          <Icon name={c.icon} size={40} stroke={1.4} />
        </div>
        <div data-kick className="kicker mt-6 opacity-70">
          {`Dzień ${day} · ${c.kicker}`.split('').map((ch, i) => (
            <span key={i} className="inline-block">
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </div>
        <h1 data-title className="font-display text-[3.4rem] leading-[0.92] mt-3">
          {c.title.split(' ').map((word, w) => (
            <span key={w} className="inline-block whitespace-nowrap overflow-hidden align-bottom mx-[0.12em] pb-[0.14em] -mb-[0.14em]">
              {word.split('').map((ch, i) => (
                <span key={i} className="inline-block">
                  {ch}
                </span>
              ))}
            </span>
          ))}
        </h1>
        <p data-sub className="mt-4 font-mono text-sm opacity-75">
          {c.sub}
        </p>
      </div>
    </div>
  );
}
