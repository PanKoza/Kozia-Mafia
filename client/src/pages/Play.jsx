import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import DarkVeil from '../components/bits/DarkVeil.jsx';
import Icon from '../components/Icon.jsx';
import { GoatMark } from '../components/Logo.jsx';
import { Spinner, useToast } from '../components/ui.jsx';
import { HAPTIC, vibrate } from '../lib/haptics.js';
import { gsap, reducedMotion, scrollToTop } from '../lib/motion.js';
import { localNotify } from '../lib/push.js';
import { flags, session } from '../lib/storage.js';
import { useGame } from '../lib/useGame.js';
import EndScreen from '../player/EndScreen.jsx';
import FeedTab from '../player/FeedTab.jsx';
import GameTab from '../player/GameTab.jsx';
import Lobby from '../player/Lobby.jsx';
import MafiaTab from '../player/MafiaTab.jsx';
import Onboarding from '../player/Onboarding.jsx';
import PhaseSplash from '../player/PhaseSplash.jsx';
import PlayersTab from '../player/PlayersTab.jsx';
import PowersTab from '../player/PowersTab.jsx';
import { RulesList } from '../player/rules.jsx';

const TABS = [
  { key: 'game', icon: 'dice', label: 'Gra' },
  { key: 'powers', icon: 'id', label: 'Akta' },
  { key: 'players', icon: 'users', label: 'Gracze' },
  { key: 'feed', icon: 'scroll', label: 'Kronika' },
  { key: 'mafia', icon: 'chat', label: 'Mafia', mafiaOnly: true },
  { key: 'rules', icon: 'book', label: 'Zasady' },
];

const PHASE_NAME = { day: 'Dzień', city_vote: 'Obrady', night: 'Noc', ended: 'Koniec' };

export default function Play() {
  const { code: rawCode } = useParams();
  const code = rawCode.toUpperCase();
  const sess = session.get(code);
  const toast = useToast();

  const onNotify = useCallback(
    (n) => {
      vibrate(HAPTIC.alert);
      if (document.visibilityState === 'visible') toast(n.body, 'notify', n.title);
      else localNotify(n.title, n.body);
    },
    [toast]
  );

  const auth = useMemo(() => (sess?.token ? { token: sess.token } : null), [sess?.token]);
  const { state, connected, gone, act, emitRaw } = useGame(code, auth, { onNotify });

  if (!sess?.token) return <Navigate to={`/join/${code}`} replace />;

  if (gone)
    return (
      <div className="room min-h-dvh flex flex-col items-center justify-center p-8 text-center">
        <GoatMark className="w-24 opacity-50 grayscale" />
        <div className="stamp text-blood-light text-lg mt-8">Akta zamknięte</div>
        <p className="mt-6 font-mono text-cream/70 max-w-xs">{gone}</p>
        <Link to={`/join/${code}`} onClick={() => session.clear(code)} className="mt-8 border border-cream/30 px-6 py-3 font-cond uppercase tracking-[0.2em] text-sm">
          Dołącz ponownie
        </Link>
      </div>
    );

  if (!state?.me)
    return (
      <div className="room min-h-dvh flex flex-col items-center justify-center gap-5">
        <GoatMark className="w-24" animated />
        <Spinner className="h-6 w-6 text-cream/50" />
        <p className="font-mono text-cream/45 text-xs">Łączenie z domem… (serwer może się budzić do minuty)</p>
      </div>
    );

  if (state.game.status === 'lobby')
    return (
      <>
        <ConnectionBar connected={connected} />
        <Lobby state={state} emitRaw={emitRaw} />
      </>
    );

  return <PlayerApp code={code} state={state} act={act} connected={connected} toast={toast} />;
}

function ConnectionBar({ connected }) {
  if (connected) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-[65] bg-blood text-cream text-center py-1 kicker !text-[10px] safe-top flex items-center justify-center gap-2">
      <Spinner className="h-3 w-3" /> Brak połączenia – ponawiam
    </div>
  );
}

function PlayerApp({ code, state, act, connected, toast }) {
  const { me, game } = state;
  const onboardKey = `onboard:${code}:${me.id}`;
  const [onboarded, setOnboarded] = useState(() => flags.get(onboardKey));
  const [tab, setTab] = useState('game');
  const [splash, setSplash] = useState(null);
  const mainRef = useRef(null);
  const navRef = useRef(null);

  /* Phase change → shutters + vibration */
  const prevPhase = useRef(`${game.phase}:${game.day}`);
  useEffect(() => {
    const key = `${game.phase}:${game.day}`;
    if (prevPhase.current === key) return;
    prevPhase.current = key;
    if (!onboarded) return;
    if (['city_vote', 'night', 'day', 'ended'].includes(game.phase)) {
      setSplash({ phase: game.phase, day: game.day, id: key });
      vibrate(HAPTIC.dramatic);
      setTab('game');
    }
  }, [game.phase, game.day, onboarded]);

  /* Minigame start → game tab */
  const prevMg = useRef(state.minigame?.id);
  useEffect(() => {
    if (state.minigame?.id && state.minigame.id !== prevMg.current) setTab('game');
    prevMg.current = state.minigame?.id;
  }, [state.minigame?.id]);

  /* New private messages → telegram */
  const lastInbox = useRef(me.inbox.at(-1)?.id);
  useEffect(() => {
    const items = me.inbox;
    const idx = items.findIndex((x) => x.id === lastInbox.current);
    const fresh = idx === -1 && lastInbox.current ? items.slice(-1) : items.slice(idx + 1);
    lastInbox.current = items.at(-1)?.id;
    for (const m of fresh) {
      if (m.kind === 'role') continue;
      toast(m.text, m.kind === 'danger' ? 'error' : m.kind === 'success' ? 'success' : 'info', 'Tylko dla Ciebie');
    }
  }, [me.inbox, toast]);

  /* Tab transition */
  useLayoutEffect(() => {
    if (!mainRef.current || reducedMotion()) return;
    gsap.fromTo(mainRef.current, { autoAlpha: 0, y: 14, filter: 'blur(6px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.45, ease: 'expo.out', clearProps: 'filter,transform' });
  }, [tab]);

  /* Sliding nav indicator */
  const tabs = TABS.filter((t) => !t.mafiaOnly || me.role === 'mafia');
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const btn = nav.querySelector(`[data-tab="${tab}"]`);
    const bar = nav.querySelector('[data-bar]');
    if (btn && bar) gsap.to(bar, { x: btn.offsetLeft + btn.offsetWidth / 2 - 14, duration: 0.5, ease: 'expo.out' });
  }, [tab, tabs.length, onboarded]);

  if (!onboarded)
    return (
      <Onboarding
        state={state}
        onDone={() => {
          flags.set(onboardKey);
          setOnboarded(true);
        }}
      />
    );

  if (game.status === 'ended') return <EndScreen state={state} />;

  const night = game.phase === 'night';

  return (
    <div className={`relative min-h-dvh flex flex-col ${night ? 'room-night' : 'room'}`}>
      {night && (
        <div className="fixed inset-0 z-0 opacity-60 pointer-events-none">
          <DarkVeil color="#6E0A10" speed={0.35} warp={0.3} glow={0.25} grain={0.02} quality={0.35} mouseInteraction={false} dpr={1} />
        </div>
      )}
      <ConnectionBar connected={connected} />
      {splash && <PhaseSplash key={splash.id} {...splash} onDone={() => setSplash(null)} />}

      {/* Header – masthead */}
      <header className="sticky top-0 z-30 bg-ink/85 backdrop-blur-md border-b border-cream/10 safe-top">
        <div className="max-w-md mx-auto flex items-center gap-3 px-4 py-2.5">
          <GoatMark className="w-9" />
          <div className="flex-1 min-w-0 leading-none">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[1.35rem]">{game.phase === 'day' ? `Dzień ${game.day}` : PHASE_NAME[game.phase] ?? game.phase}</span>
              {game.phase !== 'day' && <span className="font-mono text-xs text-cream/45">dzień {game.day}</span>}
            </div>
            <div className="kicker !text-[9px] text-cream/40 mt-1 truncate">
              {me.nick}
              {!me.alive && ' · poza grą'}
            </div>
          </div>
          {state.minigame && <span className="stamp !text-[10px] !border-2 text-gold rotate-[4deg]">Mini-gra</span>}
          {!me.alive && <Icon name="skull" size={20} className="text-blood-light" />}
        </div>
      </header>

      <main ref={mainRef} className="relative z-10 flex-1 w-full max-w-md mx-auto px-4 pt-5 pb-32">
        {tab === 'game' && <GameTab state={state} act={act} />}
        {tab === 'powers' && <PowersTab state={state} act={act} />}
        {tab === 'players' && <PlayersTab state={state} />}
        {tab === 'feed' && <FeedTab state={state} />}
        {tab === 'mafia' && <MafiaTab state={state} act={act} />}
        {tab === 'rules' && <RulesList />}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-ink/90 backdrop-blur-md border-t border-cream/10 safe-bottom">
        <div ref={navRef} className="relative max-w-md mx-auto flex">
          <span data-bar className="absolute top-0 left-0 h-[2px] w-7 bg-gold shadow-[0_0_12px_#E8B53A]" />
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                data-tab={t.key}
                onClick={() => {
                  if (t.key === tab) return scrollToTop();
                  vibrate(HAPTIC.tap);
                  setTab(t.key);
                  scrollToTop(true);
                }}
                className={`flex-1 flex flex-col items-center pt-3 pb-1.5 transition-colors duration-300 ${active ? 'text-cream' : 'text-cream/35'}`}
              >
                <Icon name={t.icon} size={21} stroke={active ? 2 : 1.6} className={`transition-transform duration-300 ${active ? '-translate-y-0.5' : ''}`} />
                <span className="font-cond uppercase tracking-[0.14em] text-[9.5px] mt-1">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
