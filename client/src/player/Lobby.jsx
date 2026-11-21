import { useEffect, useRef } from 'react';
import SplitText from '../components/bits/SplitText.jsx';
import Icon from '../components/Icon.jsx';
import { GoatMark } from '../components/Logo.jsx';
import { Num, Rule } from '../components/ui.jsx';
import { gsap, useGSAP } from '../lib/motion.js';
import NotifyPrompt from './NotifyPrompt.jsx';

export default function Lobby({ state, emitRaw }) {
  const { me, players, game } = state;
  const scope = useRef(null);
  const listRef = useRef(null);
  const known = useRef(new Set(players.map((p) => p.id)));

  useGSAP(
    () => {
      gsap.from('[data-goat]', { y: -40, autoAlpha: 0, duration: 1.2, ease: 'elastic.out(1,0.5)' });
      gsap.from('[data-in]', { y: 20, autoAlpha: 0, stagger: 0.1, delay: 0.5 });
      gsap.from('[data-row]', { x: -24, autoAlpha: 0, stagger: 0.06, delay: 0.8 });
    },
    { scope }
  );

  // New arrivals: slide + typewriter flash
  useEffect(() => {
    for (const p of players) {
      if (known.current.has(p.id)) continue;
      known.current.add(p.id);
      const el = listRef.current?.querySelector(`[data-id="${p.id}"]`);
      if (el) gsap.fromTo(el, { x: 40, autoAlpha: 0, backgroundColor: 'rgba(232,181,58,.35)' }, { x: 0, autoAlpha: 1, backgroundColor: 'rgba(0,0,0,0)', duration: 0.9, ease: 'expo.out' });
    }
  }, [players]);

  return (
    <div ref={scope} className="room min-h-dvh pb-10 safe-top">
      {/* Ticker */}
      <div className="overflow-hidden border-y border-cream/10 bg-ink/80 py-1.5">
        <div className="flex w-max animate-marquee font-cond uppercase tracking-[0.3em] text-[11px] text-cream/50">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k} className="flex">
              {['Czekamy na gości', 'Nikomu nie ufaj', `Gra ${game.code}`, 'Mafia już tu jest', 'Host zaraz zacznie'].map((t) => (
                <span key={t} className="px-6 flex items-center gap-6">
                  {t} <span className="text-blood-light">◆</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <div className="relative max-w-md mx-auto px-5">
        <div className="flex flex-col items-center text-center pt-8">
          <div data-goat className="relative">
            <div className="absolute inset-0 bg-gold/20 blur-3xl rounded-full" />
            <GoatMark className="relative w-28" animated />
          </div>
          <div data-in className="kicker text-cream/45 mt-4">{game.name}</div>
          <SplitText text={`Witaj, ${me.nick}.`} tag="h1" className="font-display text-[2.6rem] leading-none mt-2" splitType="chars" effect="rise" delay={30} trigger="load" />
          <p data-in className="mt-3 font-mono text-sm text-cream/60 max-w-[18rem]">
            Rozgość się. Gdy wszyscy dotrą, host zamknie drzwi i rozda role
            <span className="animate-blink">_</span>
          </p>
        </div>

        <div data-in>
          <NotifyPrompt emitRaw={emitRaw} className="mt-8" />
        </div>

        <div data-in className="mt-8 flex items-end justify-between">
          <Rule className="flex-1 mr-4">Lista gości</Rule>
          <div className="font-display text-5xl leading-none">
            <Num value={players.length} />
          </div>
        </div>

        <ol ref={listRef} className="mt-3 border-t border-cream/10">
          {players.map((p, i) => (
            <li
              key={p.id}
              data-id={p.id}
              data-row
              className={`flex items-center gap-4 py-3 border-b border-cream/10 ${p.id === me.id ? 'text-gold' : ''}`}
            >
              <span className="font-mono text-xs text-cream/30 w-6">{String(i + 1).padStart(2, '0')}</span>
              <span className="font-display text-xl flex-1 truncate">{p.nick}</span>
              {p.id === me.id ? <span className="kicker !text-[9px]">To Ty</span> : <Icon name="fedora" size={18} className="text-cream/25" />}
            </li>
          ))}
        </ol>

        <p data-in className="mt-8 font-mono text-[12px] text-cream/40 leading-relaxed flex gap-2">
          <Icon name="bell" size={15} className="mt-0.5" />
          Na iPhonie dodaj grę do ekranu głównego (Udostępnij → „Do ekranu początkowego”), żeby dostawać powiadomienia.
        </p>
      </div>
    </div>
  );
}
