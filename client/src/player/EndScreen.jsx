import { useRef } from 'react';
import LightRays from '../components/bits/LightRays.jsx';
import SplitText from '../components/bits/SplitText.jsx';
import Icon from '../components/Icon.jsx';
import { GoatMark } from '../components/Logo.jsx';
import { Rule } from '../components/ui.jsx';
import { HAPTIC, vibrate } from '../lib/haptics.js';
import { gsap, useGSAP } from '../lib/motion.js';

export default function EndScreen({ state }) {
  const { game, players, me } = state;
  const mafiaWon = game.winner === 'mafia';
  const iWon = game.winner && (me.role === 'mafia') === mafiaWon;
  const scope = useRef(null);

  useGSAP(
    () => {
      vibrate(HAPTIC.dramatic);
      const tl = gsap.timeline({ delay: 0.3 });
      tl.from('[data-goat]', { y: -120, rotate: -30, autoAlpha: 0, duration: 1.2, ease: 'bounce.out' })
        .from('[data-verdict]', { scale: 2.6, autoAlpha: 0, rotate: -18, duration: 0.5, ease: 'back.out(2)' }, '+=0.6')
        .add(() => vibrate([60, 40, 160]))
        .from('[data-me]', { autoAlpha: 0, y: 14 }, '-=0.1')
        .from('[data-file]', { y: 60, autoAlpha: 0, rotate: 3, duration: 0.8, ease: 'expo.out' })
        .from('[data-row]', { x: -24, autoAlpha: 0, stagger: 0.07, duration: 0.45 }, '-=0.4')
        .from('[data-mafia-stamp]', { scale: 2.4, autoAlpha: 0, rotate: -25, stagger: 0.12, duration: 0.35, ease: 'back.out(2.4)' }, '-=0.2');
    },
    { scope }
  );

  const title = game.winner === 'mafia' ? 'Mafia wygrywa' : game.winner === 'citizens' ? 'Obywatele wygrywają' : 'Gra przerwana';
  const sorted = [...players].sort((a, b) => (a.role === 'mafia' ? -1 : 1) - (b.role === 'mafia' ? -1 : 1));

  return (
    <div ref={scope} className={`relative min-h-dvh overflow-hidden px-5 pb-12 safe-top ${mafiaWon ? 'bg-ink' : 'poster'}`}>
      <div className="absolute inset-0 opacity-80 pointer-events-none">
        <LightRays raysOrigin="top-center" raysColor={mafiaWon ? '#E0333C' : '#FFF1CC'} raysSpeed={0.8} lightSpread={0.5} rayLength={1.8} intensity={1} followMouse={false} clickPulse={false} maxDevicePixelRatio={1.25} />
      </div>
      <div className="relative z-10 max-w-md mx-auto pt-10 text-center">
        <div data-goat>
          <GoatMark className="w-32 mx-auto drop-shadow-[0_20px_30px_rgba(0,0,0,.6)]" animated />
        </div>
        <div className={`kicker mt-5 ${mafiaWon ? 'text-cream/50' : 'text-cream'}`}>Sprawa zamknięta</div>
        <SplitText text={title} tag="h1" className={`font-display text-[3.2rem] leading-[0.9] mt-2 ${mafiaWon ? 'text-blood-light' : 'text-ink'}`} splitType="words" effect="skew" delay={120} trigger="load" />
        {game.winner && (
          <div data-verdict className={`stamp text-2xl mt-6 ${mafiaWon ? 'text-gold' : 'text-ink'}`}>
            {mafiaWon ? 'Dom przejęty' : 'Mafia rozbita'}
          </div>
        )}
        {game.winner && (
          <p data-me className={`mt-5 font-mono ${mafiaWon ? 'text-cream/80' : 'text-cream'}`}>
            {iWon ? 'Twoja drużyna zwyciężyła.' : 'Tym razem się nie udało.'}
          </p>
        )}

        <div data-file className="paper text-ink text-left mt-10 px-5 pt-5 pb-4 -rotate-[0.8deg] shadow-[0_30px_60px_-20px_rgba(0,0,0,.9)]">
          <div className="flex items-center justify-between border-b-2 border-ink pb-1.5 mb-2">
            <span className="kicker !text-[10px] text-ink/70">Akta odtajnione</span>
            <Icon name="fingerprint" size={18} className="text-ink/50" />
          </div>
          {sorted.map((p) => (
            <div key={p.id} data-row className="flex items-center justify-between py-2.5 border-b border-ink/10 last:border-0">
              <span className={`font-display text-lg ${p.alive ? '' : 'line-through text-ink/45'}`}>
                {p.nick}
                {p.id === me.id && <span className="font-mono text-xs text-ink/45"> (Ty)</span>}
              </span>
              {p.role === 'mafia' ? (
                <span data-mafia-stamp className="stamp !text-[11px] !border-2 text-blood">
                  Mafioza
                </span>
              ) : (
                <span className="font-mono text-xs text-ink/60 uppercase">Obywatel</span>
              )}
            </div>
          ))}
        </div>
        <Rule className="mt-8 opacity-60">Dziękujemy za grę</Rule>
      </div>
    </div>
  );
}
