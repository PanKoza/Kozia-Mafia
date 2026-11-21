import { useRef, useState } from 'react';
import Stack from '../components/bits/Stack.jsx';
import LightRays from '../components/bits/LightRays.jsx';
import Icon from '../components/Icon.jsx';
import { Button } from '../components/ui.jsx';
import { HAPTIC, vibrate } from '../lib/haptics.js';
import { gsap, useGSAP } from '../lib/motion.js';
import { RULE_SLIDES } from './rules.jsx';
import RoleCard from './RoleCard.jsx';

export default function Onboarding({ state, onDone }) {
  const [step, setStep] = useState('warning'); // warning | rules | role
  if (step === 'warning') return <Warning onNext={() => setStep('rules')} />;
  if (step === 'rules') return <Rules onNext={() => setStep('role')} />;
  return <RoleReveal state={state} onDone={onDone} />;
}

/* ------------------------------------------------------------------ */

function Warning({ onNext }) {
  const scope = useRef(null);
  useGSAP(
    () => {
      vibrate(HAPTIC.alert);
      const tl = gsap.timeline();
      tl.fromTo('[data-siren]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, repeat: 5, yoyo: true })
        .from('[data-card]', { y: 80, scale: 0.9, rotate: -4, autoAlpha: 0, duration: 0.7, ease: 'back.out(1.6)' }, 0.2)
        .from('[data-icon]', { scale: 0, rotate: 180, duration: 0.6, ease: 'back.out(2)' }, 0.55)
        .from('[data-li]', { x: -20, autoAlpha: 0, stagger: 0.08, duration: 0.4 }, 0.9)
        .from('[data-btn]', { y: 20, autoAlpha: 0, duration: 0.4 }, 1.3);
      gsap.to('[data-siren]', { opacity: 0.35, duration: 0.9, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1.4 });
      // Short glitch bursts on the headline (stays inside the card)
      gsap.timeline({ repeat: -1, repeatDelay: 2.2, delay: 1.6 })
        .to('[data-glitch]', { x: -3, skewX: -8, duration: 0.05 })
        .to('[data-ghost]', { opacity: 0.8, x: 4, duration: 0.05 }, '<')
        .to('[data-glitch]', { x: 2, skewX: 4, duration: 0.05 })
        .to('[data-ghost]', { x: -3, duration: 0.05 }, '<')
        .to('[data-glitch]', { x: 0, skewX: 0, duration: 0.06 })
        .to('[data-ghost]', { opacity: 0, x: 0, duration: 0.06 }, '<');
    },
    { scope }
  );
  const tips = [
    ['lock', 'Ustaw blokadę ekranu.'],
    ['eyeOff', 'Przyciemnij jasność, gdy ktoś jest obok.'],
    ['fingerprint', 'Rolę widać tylko, gdy trzymasz kartę.'],
    ['bell', 'Nie pokazuj nikomu powiadomień.'],
  ];
  return (
    <div ref={scope} className="fixed inset-0 z-40 bg-ink flex items-center justify-center p-5 overflow-hidden">
      <div data-siren className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(224,51,60,.55),transparent_65%)]" />
      <div data-card className="relative w-full max-w-sm bg-blood text-cream px-6 pt-7 pb-6 shadow-[inset_0_0_0_6px_#B3121B,inset_0_0_0_7px_rgba(244,234,213,.55),0_30px_60px_rgba(0,0,0,.7)]">
        <div className="flex items-center justify-between kicker !text-[10px] text-cream/80">
          <span>Komunikat Nº 001</span>
          <span className="animate-blink">● Pilne</span>
        </div>
        <div data-icon className="mt-5 w-16 h-16 border-2 border-cream rounded-full flex items-center justify-center">
          <Icon name="phoneOff" size={30} stroke={1.5} />
        </div>
        <h2 className="font-display text-[2.6rem] leading-[0.92] mt-4">
          Strzeż
          <br />
          <span data-glitch className="relative inline-block">
            swojego telefonu!
            <span aria-hidden="true" data-ghost className="absolute inset-0 text-gold mix-blend-screen opacity-0">
              swojego telefonu!
            </span>
          </span>
        </h2>
        <p className="mt-4 font-mono text-[14px] leading-snug text-cream/90">
          Jedno spojrzenie na Twój ekran wystarczy, by <b className="bg-ink px-1">zdradzić Twoją rolę</b>.
        </p>
        <ul className="mt-5 space-y-2.5 border-t border-cream/25 pt-4">
          {tips.map(([i, t]) => (
            <li data-li key={t} className="flex items-center gap-3 text-[14px]">
              <Icon name={i} size={18} />
              {t}
            </li>
          ))}
        </ul>
        <div data-btn>
          <Button variant="cream" className="w-full mt-6" onClick={onNext} icon="check">
            Rozumiem
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Rules({ onNext }) {
  const [seen, setSeen] = useState(() => new Set([0]));
  const [top, setTop] = useState(0);
  const scope = useRef(null);
  useGSAP(() => {
    gsap.from('[data-head] > *', { y: -20, autoAlpha: 0, stagger: 0.08 });
    gsap.from('[data-hint]', { autoAlpha: 0, delay: 0.8 });
  }, { scope });

  const cards = RULE_SLIDES.map((s, i) => (
    <div key={s.title} className="paper-ruled paper absolute inset-0 flex flex-col px-6 pt-5 pb-6 text-ink">
      <div className="flex items-center justify-between kicker !text-[9px] text-ink/55">
        <span>Regulamin domu</span>
        <span className="font-mono normal-case tracking-normal text-[11px]">
          {String(i + 1).padStart(2, '0')} / {String(RULE_SLIDES.length).padStart(2, '0')}
        </span>
      </div>
      <div className="mt-6 w-14 h-14 rounded-full border-2 border-ink flex items-center justify-center text-blood">
        <Icon name={s.icon} size={28} stroke={1.5} />
      </div>
      <h3 className="font-display text-[2.2rem] leading-none mt-4">{s.title}</h3>
      <div className="mt-4 text-[15px] leading-relaxed text-ink/85">{s.body}</div>
    </div>
  ));

  const all = seen.size >= RULE_SLIDES.length;
  return (
    <div ref={scope} className="fixed inset-0 z-40 room flex flex-col safe-top safe-bottom overflow-hidden">
      <div data-head className="px-5 pt-4 flex items-end justify-between">
        <div>
          <div className="kicker text-cream/45">Odprawa</div>
          <div className="font-display text-3xl">Zasady gry</div>
        </div>
        <div className="flex gap-1 pb-2">
          {RULE_SLIDES.map((_, i) => (
            <span key={i} className={`h-1.5 transition-all duration-500 ${i === top ? 'w-5 bg-gold' : seen.has(i) ? 'w-1.5 bg-cream/60' : 'w-1.5 bg-cream/15'}`} />
          ))}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="relative w-full max-w-[330px] h-[440px]">
          <Stack
            cards={cards}
            layout="pile"
            visible={3}
            radius={4}
            tilt={22}
            threshold={70}
            sendToBackOnClick
            onChange={(i) => {
              vibrate(12);
              setTop(i);
              setSeen((s) => new Set(s).add(i));
            }}
          />
        </div>
      </div>
      <div className="px-5 pb-3">
        <p data-hint className="text-center font-mono text-xs text-cream/45 mb-3 flex items-center justify-center gap-2">
          <Icon name="hand" size={14} /> Przesuń kartę lub stuknij, aby czytać dalej
        </p>
        <Button
          className="w-full"
          variant={all ? 'primary' : 'ghost'}
          icon="fingerprint"
          onClick={() => {
            vibrate(HAPTIC.heartbeat);
            onNext();
          }}
        >
          {all ? 'Poznaj swoją rolę' : 'Pomiń i poznaj rolę'}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function RoleReveal({ state, onDone }) {
  const [revealedOnce, setRevealedOnce] = useState(false);
  const scope = useRef(null);
  useGSAP(
    () => {
      gsap.from('[data-lamp]', { autoAlpha: 0, duration: 1.6, ease: 'power1.in' });
      gsap.from('[data-t] > *', { y: 20, autoAlpha: 0, stagger: 0.12, delay: 0.4 });
    },
    { scope }
  );
  return (
    <div ref={scope} className="fixed inset-0 z-40 bg-ink flex flex-col items-center justify-center px-6 safe-top safe-bottom overflow-hidden">
      <div data-lamp className="absolute inset-0">
        <LightRays raysOrigin="top-center" raysColor="#FFF1CC" raysSpeed={0.5} lightSpread={0.3} rayLength={1.5} intensity={1.2} followMouse={false} clickPulse={false} maxDevicePixelRatio={1.25} />
      </div>
      <div data-t className="relative text-center mb-6">
        <div className="kicker text-cream/45">Przesłuchanie</div>
        <h2 className="font-display text-4xl mt-1">Kim jesteś?</h2>
        <p className="font-mono text-xs text-cream/55 mt-2">Rozejrzyj się. Nikt nie patrzy? Przytrzymaj kartę.</p>
      </div>
      <div className="relative">
        <RoleCard state={state} onReveal={() => setRevealedOnce(true)} />
      </div>
      <Button variant={revealedOnce ? 'gold' : 'ghost'} className="relative w-full max-w-sm mt-8" disabled={!revealedOnce} onClick={onDone} icon={revealedOnce ? 'arrow' : 'fingerprint'}>
        {revealedOnce ? 'Zapamiętałem – do gry' : 'Najpierw odsłoń kartę'}
      </Button>
    </div>
  );
}
