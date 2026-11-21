import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import LightRays from '../components/bits/LightRays.jsx';
import ShinyText from '../components/bits/ShinyText.jsx';
import Icon from '../components/Icon.jsx';
import { Diamonds, GoatMark } from '../components/Logo.jsx';
import { Button, Input, Spinner, useToast } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { HAPTIC, vibrate } from '../lib/haptics.js';
import { gsap, useGSAP } from '../lib/motion.js';
import { session } from '../lib/storage.js';

export default function Join() {
  const { code: rawCode } = useParams();
  const code = rawCode.toUpperCase();
  const [params] = useSearchParams();
  const rejoinToken = params.get('t');
  const navigate = useNavigate();
  const toast = useToast();

  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('tap'); // tap | intro | form

  const existing = session.get(code);

  useEffect(() => {
    if (rejoinToken) {
      session.set(code, { code, token: rejoinToken });
      navigate(`/play/${code}`, { replace: true });
      return;
    }
    api(`/games/${code}`).then(setInfo).catch((e) => setError(e.message));
  }, [code, rejoinToken, navigate]);

  if (existing && !rejoinToken) return <Navigate to={`/play/${code}`} replace />;

  if (error)
    return (
      <div className="room min-h-dvh flex flex-col items-center justify-center p-8 text-center">
        <GoatMark className="w-28 opacity-50 grayscale" />
        <div className="stamp text-blood-light mt-8 text-lg">Brak akt</div>
        <p className="mt-6 font-mono text-cream/70">{error}</p>
      </div>
    );

  if (step === 'tap') return <TapScreen info={info} onEnter={() => setStep('intro')} />;
  if (step === 'intro') return <Intro onDone={() => setStep('form')} />;
  return <JoinForm code={code} info={info} toast={toast} navigate={navigate} />;
}

/* ------------------------------------------------------------------ */
/* 1. Dark room, single lamp. Tap unlocks vibration.                   */
/* ------------------------------------------------------------------ */

function TapScreen({ info, onEnter }) {
  const scope = useRef(null);
  useGSAP(
    () => {
      if (info) gsap.from('[data-line]', { autoAlpha: 0, y: 14, stagger: 0.18, delay: 0.3 });
    },
    { scope, dependencies: [!!info] }
  );
  useGSAP(
    () => {
      gsap.fromTo('[data-goat]', { autoAlpha: 0, scale: 0.8, y: 30 }, { autoAlpha: 1, scale: 1, y: 0, duration: 1.8, ease: 'expo.out' });
      gsap.to('[data-goat] svg', { y: -8, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    },
    { scope }
  );
  return (
    <button ref={scope} onClick={onEnter} disabled={!info} className="relative min-h-dvh w-full overflow-hidden bg-ink flex flex-col items-center justify-center gap-7 px-8">
      <div className="absolute inset-0">
        <LightRays raysOrigin="top-center" raysColor="#F6E7C1" raysSpeed={0.7} lightSpread={0.35} rayLength={1.4} intensity={1.1} pulsating followMouse={false} clickPulse={false} maxDevicePixelRatio={1.25} />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink to-transparent" />
      <div data-goat className="relative">
        <GoatMark className="w-40 drop-shadow-[0_40px_30px_rgba(0,0,0,.9)]" animated />
      </div>
      {info ? (
        <div className="relative flex flex-col items-center gap-4 text-center">
          <div data-line className="kicker text-cream/45">Zaproszenie Nº {info.code}</div>
          <div data-line className="font-display text-3xl text-cream leading-none">{info.name}</div>
          <div data-line className="mt-6 flex items-center gap-3">
            <span className="h-px w-8 bg-cream/40" />
            <ShinyText text="DOTKNIJ, ABY WEJŚĆ" className="font-cond tracking-ultra text-sm" color="#9C9280" shineColor="#FFF6DE" speed={2.2} />
            <span className="h-px w-8 bg-cream/40" />
          </div>
        </div>
      ) : (
        <Spinner className="relative h-7 w-7 text-cream/50" />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Light switch → red poster wipes in → title slams                 */
/* ------------------------------------------------------------------ */

function Intro({ onDone }) {
  const scope = useRef(null);
  useGSAP(
    () => {
      vibrate(HAPTIC.dramatic);
      const tl = gsap.timeline({ onComplete: onDone });
      tl.set('[data-flash]', { autoAlpha: 1 })
        .to('[data-flash]', { autoAlpha: 0, duration: 0.5, ease: 'power2.out' })
        .fromTo('[data-poster]', { clipPath: 'circle(0% at 50% 42%)' }, { clipPath: 'circle(150% at 50% 42%)', duration: 1.1, ease: 'expo.inOut' }, 0.05)
        .from('[data-frame]', { scale: 1.15, autoAlpha: 0, duration: 0.8, ease: 'expo.out' }, 0.6)
        .from('[data-goat]', { y: -260, rotate: -24, duration: 1.1, ease: 'bounce.out' }, 0.55)
        .from('[data-kicker] span', { autoAlpha: 0, y: 12, stagger: 0.035, duration: 0.4 }, 1.25)
        .from('[data-w1]', { scale: 3.2, autoAlpha: 0, filter: 'blur(12px)', duration: 0.45, ease: 'power4.in' }, 1.6)
        .add(() => vibrate(60), 2.05)
        .from('[data-w2]', { scale: 3.2, autoAlpha: 0, filter: 'blur(12px)', duration: 0.45, ease: 'power4.in' }, 2.05)
        .add(() => vibrate([80, 40, 140]), 2.5)
        .fromTo('[data-poster]', { x: 0 }, { x: 8, duration: 0.05, repeat: 5, yoyo: true }, 2.5)
        .from('[data-dia]', { scaleX: 0, duration: 0.6, ease: 'expo.out' }, 2.55)
        .to('[data-poster]', { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, 4.1);
    },
    { scope }
  );
  const kicker = 'WITAJCIE W GRZE';
  return (
    <div ref={scope} className="fixed inset-0 bg-ink overflow-hidden" onClick={onDone}>
      <div data-poster className="poster absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
        <div data-frame className="absolute inset-0 halftone opacity-30" />
        <div className="relative z-10 flex flex-col items-center">
          <div data-goat>
            <GoatMark className="w-56 drop-shadow-[0_16px_0_rgba(0,0,0,.25)]" animated />
          </div>
          <div data-kicker className="mt-6 font-cond text-cream text-sm tracking-ultra">
            {kicker.split('').map((c, i) => (
              <span key={i} className="inline-block">
                {c === ' ' ? ' ' : c}
              </span>
            ))}
          </div>
          <h1 className="font-display text-[5.2rem] text-ink leading-[0.85] text-center mt-2">
            <span data-w1 className="block">KOZIA</span>
            <span data-w2 className="block">MAFIA!</span>
          </h1>
          <div data-dia className="mt-5">
            <Diamonds />
          </div>
        </div>
      </div>
      <div data-flash className="absolute inset-0 bg-[#FFF6DE] invisible" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Newspaper headline + join slip                                   */
/* ------------------------------------------------------------------ */

function JoinForm({ code, info, toast, navigate }) {
  const scope = useRef(null);
  const [nick, setNick] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const today = new Date().toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

  useGSAP(
    () => {
      vibrate(HAPTIC.heartbeat);
      const tl = gsap.timeline();
      tl.from('[data-paper]', { y: 120, rotate: 6, autoAlpha: 0, duration: 0.9, ease: 'expo.out' })
        .from('[data-mast] > *', { autoAlpha: 0, y: -10, stagger: 0.08, duration: 0.4 }, '-=0.4')
        .from('[data-head] [data-word]', { yPercent: 110, stagger: 0.07, duration: 0.7, ease: 'expo.out' }, '-=0.1')
        .from('[data-stampbig]', { scale: 3, autoAlpha: 0, rotate: -30, duration: 0.45, ease: 'back.out(2.2)' }, '-=0.15')
        .add(() => vibrate([40, 30, 90]))
        .from('[data-slip]', { y: 60, autoAlpha: 0, duration: 0.7, ease: 'expo.out' }, '-=0.1')
        .from('[data-field]', { autoAlpha: 0, x: -14, stagger: 0.1 }, '-=0.4');
      // Neon-sign flicker on MAFIA!
      gsap.timeline({ repeat: -1, repeatDelay: 2.4, delay: 2 })
        .to('[data-mafia]', { opacity: 0.25, duration: 0.05 })
        .to('[data-mafia]', { opacity: 1, duration: 0.05 })
        .to('[data-mafia]', { opacity: 0.4, x: 2, duration: 0.04 })
        .to('[data-mafia]', { opacity: 1, x: 0, duration: 0.06 });
    },
    { scope }
  );

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api(`/games/${code}/join`, { method: 'POST', body: { nick, password } });
      session.set(code, { code, token: res.token, playerId: res.playerId, nick: nick.trim() });
      vibrate(HAPTIC.ok);
      await gsap.to(scope.current, { autoAlpha: 0, scale: 0.96, duration: 0.35 });
      navigate(`/play/${code}`, { replace: true });
    } catch (err) {
      toast(err.message, 'error');
      gsap.fromTo('[data-slip]', { x: -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1,0.3)' });
      setBusy(false);
    }
  };

  const words = ['Ten', 'dom', 'przejęła'];
  return (
    <div ref={scope} className="room min-h-dvh px-4 py-8 safe-top safe-bottom flex flex-col justify-center">
      <div className="relative w-full max-w-sm mx-auto">
        {/* Newspaper */}
        <div data-paper className="paper px-5 pt-4 pb-6 -rotate-[1.2deg] shadow-[0_30px_60px_-20px_rgba(0,0,0,.9)]">
          <div data-mast className="flex items-center justify-between border-b-2 border-ink pb-1.5">
            <span className="kicker !text-[9px] text-ink/70">Kurier Górski</span>
            <span className="kicker !text-[9px] text-blood">Wydanie specjalne</span>
            <span className="font-mono text-[10px] text-ink/60">{today}</span>
          </div>
          <div className="border-b border-ink/40 h-1 mb-3" />
          <h1 data-head className="font-display text-[2.9rem] leading-[0.9] text-ink">
            {words.map((w) => (
              <span key={w} className="inline-block overflow-hidden align-bottom mr-2">
                <span data-word className="inline-block">
                  {w}
                </span>
              </span>
            ))}
            <span className="block overflow-hidden">
              <span data-word data-mafia className="inline-block text-blood">
                MAFIA!
              </span>
            </span>
          </h1>
          <p className="mt-3 font-mono text-[13px] leading-snug text-ink/75 columns-2 gap-4 [column-rule:1px_solid_rgba(14,13,12,.2)]">
            Mieszkańcy domku w górach w szoku. Wśród nich ukrywa się mafia. Każdy jest podejrzany. Władze proszą o zgłaszanie się wszystkich gości…
          </p>
          <div data-stampbig className="absolute right-3 top-[8.6rem] stamp text-blood text-base rotate-[-10deg]">
            Ściśle tajne
          </div>
        </div>

        {/* Registration slip */}
        <form data-slip onSubmit={submit} className="relative mt-6 bg-ink-soft frame px-5 pt-5 pb-6 rotate-[0.6deg]">
          <div className="flex items-center justify-between">
            <span className="kicker text-cream/55">Zgłoszenie gościa</span>
            <span className="font-mono text-xs text-gold">{info?.name ? `Nº ${code}` : ''}</span>
          </div>
          <div className="paper mt-3 px-4 pt-3 pb-4 space-y-4">
            <div data-field>
              <Input label="Pseudonim" value={nick} onChange={(e) => setNick(e.target.value)} maxLength={20} autoComplete="nickname" placeholder="np. Don Kozioł" required />
            </div>
            <div data-field>
              <Input label="Hasło do gry" value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="off" placeholder="••••••" required />
            </div>
          </div>
          <Button type="submit" className="w-full mt-5 text-base" busy={busy} disabled={nick.trim().length < 2 || !password} icon="door">
            Wchodzę do domu
          </Button>
          <p className="text-center font-mono text-[11px] text-cream/35 mt-4 flex items-center justify-center gap-1.5">
            <Icon name="lock" size={13} /> Zapamiętamy Cię na tym telefonie
          </p>
        </form>
      </div>
    </div>
  );
}
