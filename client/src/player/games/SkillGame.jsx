import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { Button, GameHeader, Label, Num, Panel, useAction } from '../../components/ui.jsx';
import { HAPTIC, vibrate } from '../../lib/haptics.js';
import { CARD_INFO } from '../../lib/labels.js';
import { flags } from '../../lib/storage.js';
import BlackjackGame from './BlackjackGame.jsx';
import PokerGame from './PokerGame.jsx';

const UNIT = { poker: 'żetonów', memory: 'w sekwencji', blackjack: 'żetonów', targets: 'pkt' };

export default function SkillGame({ state, act }) {
  const mg = state.minigame;
  const info = CARD_INFO[mg.card];
  // Remember a started attempt so a reload can't give a second try.
  const attemptKey = `skill:${mg.id}:${state.me.id}`;
  const [phase, setPhase] = useState(() => (flags.get(attemptKey) ? 'abandoned' : 'intro'));
  const [localScore, setLocalScore] = useState(null);
  const [submit, busy] = useAction((score) => act('skill_submit', { score }));

  const finish = useCallback(
    async (score) => {
      setLocalScore(score);
      setPhase('done');
      vibrate(HAPTIC.ok);
      try {
        await submit(score);
      } catch {
        /* toast shown */
      }
    },
    [submit]
  );

  if (mg.stage === 'finished')
    return (
      <div className="space-y-4">
        <GameHeader tone={mg.iWon ? 'red' : 'paper'} icon={mg.iWon ? info.icon : 'target'} kicker={info.game} title={mg.iWon ? 'Wygrywasz!' : 'Koniec gry'}>
          {mg.iWon ? (
            <p className="font-mono text-sm">Zdobywasz <b>{info.full}</b>. Znajdziesz ją w zakładce Akta. Nikt nie wie, że ją masz.</p>
          ) : (
            <p className="font-mono text-sm text-ink/70">{mg.myScore != null ? `Twój wynik: ${mg.myScore} ${UNIT[mg.game]} · miejsce ${mg.myPlace}.` : 'Nie zagrałeś w tej rundzie.'} Karta trafiła do kogoś innego…</p>
          )}
          <p className="font-mono text-[11px] mt-3 opacity-55">Czekamy, aż host zamknie mini-grę.</p>
        </GameHeader>
      </div>
    );

  // Blackjack & poker are played on the server – no single client-side attempt.
  if (mg.game === 'blackjack') return <BlackjackGame state={state} act={act} />;
  if (mg.game === 'poker') return <PokerGame state={state} act={act} />;

  if (mg.myScore != null || phase === 'done')
    return (
      <Panel className="text-center py-8">
        <Icon name="check" size={34} className="mx-auto text-gold" />
        <div className="kicker text-cream/50 mt-3">Wynik zapisany</div>
        <div className="font-display text-6xl text-gold mt-2"><Num value={mg.myScore ?? localScore ?? 0} /></div>
        <div className="kicker text-cream/45 mt-1">{UNIT[mg.game]}</div>
        <p className="font-mono text-xs text-cream/55 mt-5">
          Zagrało {mg.submittedCount}/{mg.participantCount}. Zwycięzcę poznasz, gdy host zakończy grę.
        </p>
      </Panel>
    );

  if (phase === 'abandoned')
    return (
      <Panel className="text-center py-8">
        <Icon name="x" size={34} className="mx-auto text-blood-light" />
        <p className="mt-3 font-mono text-sm text-cream/70">Próba została przerwana (np. odświeżenie strony). Masz tylko jedną szansę.</p>
        <Button variant="ghost" className="mt-5" busy={busy} onClick={() => finish(0)}>
          Zgłoś wynik 0
        </Button>
      </Panel>
    );

  if (phase === 'intro')
    return (
      <div className="space-y-4">
        <GameHeader icon={info.icon} kicker={`Nagroda: ${info.full}`} title={info.game}>
          <p className="font-mono text-[13px] text-ink/75 leading-snug">{info.gameDesc}</p>
        </GameHeader>
        <div data-reveal className="flex items-center gap-3 border border-blood-light/40 px-4 py-3 font-mono text-xs text-cream/75">
          <Icon name="bolt" size={16} className="text-blood-light" /> Masz <b>jedną próbę</b>. Nie odświeżaj strony w trakcie gry!
        </div>
        <Button
          className="w-full text-lg"
          icon="play"
          onClick={() => {
            flags.set(attemptKey);
            setPhase('play');
          }}
        >
          Gram
        </Button>
      </div>
    );

  const Game = { memory: MemoryGame, targets: TargetsGame }[mg.game];
  return <Game onFinish={finish} />;
}

/* ------------------------------------------------------------------ */
/* Countdown helper                                                    */
/* ------------------------------------------------------------------ */

function useCountdown(onGo) {
  const [count, setCount] = useState(3);
  useEffect(() => {
    if (count === 0) {
      vibrate(80);
      onGo?.();
      return;
    }
    vibrate(30);
    const t = setTimeout(() => setCount((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [count]); // eslint-disable-line react-hooks/exhaustive-deps
  return count;
}

function CountdownOverlay({ count }) {
  if (count <= 0) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80">
      <div key={count} className="w-48 h-48 rounded-full border-2 border-cream/40 flex items-center justify-center font-display text-[8rem] leading-none text-cream animate-pop">
        {count}
      </div>
    </div>
  );
}
/* ------------------------------------------------------------------ */
/* 1. Pamięć Capo – Simon says (Sprawdzenie)                            */
/* ------------------------------------------------------------------ */

const PADS = [
  { icon: 'fedora', color: 'bg-ink', lit: 'bg-cream' },
  { icon: 'knife', color: 'bg-cigar', lit: 'bg-ember' },
  { icon: 'skull', color: 'bg-blood-dark', lit: 'bg-blood-light' },
  { icon: 'coin', color: 'bg-gold-dark', lit: 'bg-gold' },
];

function MemoryGame({ onFinish }) {
  const [seq, setSeq] = useState([]);
  const [lit, setLit] = useState(null);
  const [input, setInput] = useState(0);
  const [mode, setMode] = useState('wait'); // wait | show | input | fail
  const count = useCountdown(() => nextLevel([]));

  const nextLevel = (prev) => {
    const next = [...prev, Math.floor(Math.random() * 4)];
    setSeq(next);
    setInput(0);
    setMode('show');
  };

  useEffect(() => {
    if (mode !== 'show') return;
    let i = 0;
    const speed = Math.max(280, 650 - seq.length * 25);
    const timers = [];
    const step = () => {
      if (i >= seq.length) {
        setLit(null);
        setMode('input');
        return;
      }
      setLit(seq[i]);
      vibrate(20);
      timers.push(setTimeout(() => setLit(null), speed * 0.7));
      i += 1;
      timers.push(setTimeout(step, speed));
    };
    timers.push(setTimeout(step, 600));
    return () => timers.forEach(clearTimeout);
  }, [mode, seq]);

  const press = (idx) => {
    if (mode !== 'input') return;
    setLit(idx);
    setTimeout(() => setLit(null), 150);
    if (seq[input] !== idx) {
      setMode('fail');
      vibrate(HAPTIC.error);
      setTimeout(() => onFinish(seq.length - 1), 900);
      return;
    }
    vibrate(15);
    if (input + 1 === seq.length) {
      setMode('wait');
      setTimeout(() => nextLevel(seq), 500);
    } else setInput(input + 1);
  };

  return (
    <div className="select-none">
      <CountdownOverlay count={count} />
      <div className="text-center mb-4">
        <Label>Poziom</Label>
        <div className="font-display text-5xl">{Math.max(0, seq.length)}</div>
        <div className={`font-cond uppercase tracking-widest text-sm mt-1 ${mode === 'fail' ? 'text-blood-light animate-shake' : 'text-cream/70'}`}>
          {mode === 'show' ? 'Zapamiętaj…' : mode === 'input' ? `Powtórz (${input}/${seq.length})` : mode === 'fail' ? 'Pomyłka!' : 'Dobrze!'}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {PADS.map((p, i) => (
          <button
            key={i}
            onPointerDown={(e) => {
              e.preventDefault();
              press(i);
            }}
            className={`aspect-square rounded-[4px] border-2 border-ink flex items-center justify-center transition-all duration-100 touch-none ${lit === i ? `${p.lit} text-ink scale-95 shadow-[0_0_40px_rgba(244,234,213,.55)]` : `${p.color} text-cream/80`}`}
          >
            <Icon name={p.icon} size={56} stroke={1.3} />
          </button>
        ))}
      </div>
    </div>
  );
}
/* ------------------------------------------------------------------ */
/* 2. Strzelnica Don Kozła – whack-a-target (Ochrona przed Mafią)       */
/* ------------------------------------------------------------------ */

function TargetsGame({ onFinish }) {
  const DURATION = 20000;
  const [targets, setTargets] = useState([]);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(DURATION);
  const [running, setRunning] = useState(false);
  const [pops, setPops] = useState([]);
  const scoreRef = useRef(0);
  const count = useCountdown(() => setRunning(true));

  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    const tick = setInterval(() => {
      const l = Math.max(0, DURATION - (performance.now() - start));
      setLeft(l);
      if (l <= 0) {
        clearInterval(tick);
        clearInterval(spawn);
        setRunning(false);
        setTargets([]);
        onFinish(Math.max(0, scoreRef.current));
      }
    }, 100);
    const spawn = setInterval(() => {
      const elapsed = performance.now() - start;
      const life = Math.max(650, 1300 - elapsed / 30);
      const bad = Math.random() < 0.22;
      const t = { id: Math.random(), x: 8 + Math.random() * 76, y: 6 + Math.random() * 80, bad, born: performance.now() };
      setTargets((ts) => [...ts, t]);
      setTimeout(() => setTargets((ts) => ts.filter((x) => x.id !== t.id)), life);
    }, 520);
    return () => {
      clearInterval(tick);
      clearInterval(spawn);
    };
  }, [running, onFinish]);

  const hit = (t) => {
    setTargets((ts) => ts.filter((x) => x.id !== t.id));
    const delta = t.bad ? -2 : 1;
    scoreRef.current += delta;
    setScore(scoreRef.current);
    vibrate(t.bad ? HAPTIC.error : 12);
    const p = { id: t.id, x: t.x, y: t.y, delta };
    setPops((ps) => [...ps, p]);
    setTimeout(() => setPops((ps) => ps.filter((x) => x.id !== p.id)), 600);
  };

  return (
    <div className="select-none">
      <CountdownOverlay count={count} />
      <div className="flex justify-between items-end mb-3">
        <div>
          <Label>Punkty</Label>
          <div className="font-display text-5xl">{score}</div>
        </div>
        <div className="text-right">
          <Label>Czas</Label>
          <div className="font-display text-3xl">{Math.ceil(left / 1000)}s</div>
        </div>
      </div>
      <div className="relative w-full h-[58dvh] rounded-[4px] border border-cream/15 halftone bg-[radial-gradient(circle_at_50%_40%,#2a1a12,#0E0D0C)] overflow-hidden touch-none">
        {targets.map((t) => (
          <button
            key={t.id}
            onPointerDown={(e) => {
              e.preventDefault();
              hit(t);
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full flex items-center justify-center animate-pop border-2 ${t.bad ? 'bg-cream text-ink border-ink' : 'bg-blood text-cream border-cream'}`}
            style={{ left: `${t.x}%`, top: `${t.y}%` }}
          >
            <Icon name={t.bad ? 'house' : 'fedora'} size={34} stroke={1.5} />
          </button>
        ))}
        {pops.map((p) => (
          <div key={p.id} className="absolute pointer-events-none font-display text-2xl animate-floatup" style={{ left: `${p.x}%`, top: `${p.y}%`, color: p.delta > 0 ? '#E8B53A' : '#D42A33' }}>
            {p.delta > 0 ? '+1' : '-2'}
          </div>
        ))}
        {!running && count === 0 && <div className="absolute inset-0 flex items-center justify-center font-display text-3xl">Koniec!</div>}
      </div>
      <p className="text-center font-mono text-xs text-cream/50 mt-3 flex items-center justify-center gap-4"><span className="flex items-center gap-1.5"><Icon name="fedora" size={14} /> mafia = +1</span><span className="flex items-center gap-1.5"><Icon name="house" size={14} /> obywatel = −2</span></p>
    </div>
  );
}
