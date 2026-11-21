import { useEffect, useRef, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { Badge, Button, GameHeader, Label, Num, Panel, Rule, useAction } from '../../components/ui.jsx';
import { useReveal } from '../../lib/motion.js';
import { HAPTIC, vibrate } from '../../lib/haptics.js';
import { cardLabel, SPECIAL } from '../../lib/labels.js';

const ALL = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const SUITS = ['♠', '♥', '♦', '♣'];

export function PlayingCard({ value, size = 'md', dim, selected, onClick, faceDown }) {
  const s = { sm: 'w-10 h-14 text-base', md: 'w-14 h-20 text-xl', lg: 'w-24 h-36 text-5xl' }[size];
  const suit = SUITS[value % 4];
  const red = suit === '♥' || suit === '♦';
  if (faceDown)
    return (
      <div className={`${s} rounded-[4px] border-2 border-ink bg-blood halftone flex items-center justify-center shadow-[0_3px_0_#0E0D0C] text-cream`}>
        <Icon name="fedora" size={size === 'lg' ? 34 : 18} />
      </div>
    );
  return (
    <button
      type="button"
      disabled={dim || !onClick}
      onClick={onClick}
      className={`${s} playing-card rounded-[3px] flex flex-col items-center justify-center font-display transition-all ${dim ? 'opacity-20' : ''} ${
        selected ? '-translate-y-3 ring-4 ring-gold' : ''
      } ${red ? 'text-blood' : 'text-ink'}`}
    >
      <span className="leading-none">{cardLabel(value)}</span>
      <span className="text-[0.6em] leading-none mt-0.5">{suit}</span>
    </button>
  );
}

export default function WarGame({ state, act }) {
  const { players, minigame: mg } = state;
  const nick = (id) => players.find((p) => p.id === id)?.nick ?? '?';
  const [selected, setSelected] = useState(null);
  const [run, busy] = useAction(async (value) => {
    await act('war_play', { value });
    vibrate(HAPTIC.ok);
    setSelected(null);
  });
  const duel = mg.duel;

  // Haptic feedback when a duel resolves.
  const prevLog = useRef(duel?.log.length ?? 0);
  useEffect(() => {
    const len = duel?.log.length ?? 0;
    if (len > prevLog.current) {
      const last = duel.log[len - 1];
      vibrate(last.me === last.them ? HAPTIC.alert : last.me > last.them ? HAPTIC.ok : HAPTIC.error);
    }
    prevLog.current = len;
  }, [duel?.log.length]);

  const scores = Object.entries(mg.scores).sort((a, b) => b[1] - a[1]);
  const scope = useReveal([mg.stage, mg.round]);

  return (
    <div ref={scope} className="space-y-4">
      <GameHeader icon="swords" kicker={`Mini-gra · runda ${mg.round}/${mg.totalRounds}`} title="Wojna">
        <Badge tone="red">
          <Icon name={SPECIAL[mg.rewardRole].icon} size={11} /> Nagroda: {SPECIAL[mg.rewardRole].name}
        </Badge>
      </GameHeader>

      {mg.stage === 'negotiation' && (
        <Panel>
          <Label className="mb-2">Czas na sojusze</Label>
          <p className="text-sm text-cream/80 leading-relaxed">
            Każdy ma talię od <b>2</b> do <b>Asa</b> – każdą wartość możesz użyć <b>tylko raz</b>. W pojedynku wyższa karta wygrywa punkt. Remis to <b>WOJNA</b> – dokładacie kolejne karty, a stawka rośnie.
            Najwięcej punktów po {mg.totalRounds} rundach = nominacja na rolę specjalną.
          </p>
          <p className="text-sm text-gold mt-3">Negocjujcie! Host zaraz otworzy pierwszą rundę.</p>
        </Panel>
      )}

      {mg.stage === 'round' && mg.bye && (
        <Panel className="text-center">
          <Icon name="clock" size={34} stroke={1.3} className="mx-auto text-cream/50" />
          <p className="mt-2">W tej rundzie pauzujesz (nieparzysta liczba graczy).</p>
        </Panel>
      )}

      {(mg.stage === 'round' || mg.stage === 'round_result') && duel && (
        <Panel className="border-blood/40">
          <div className="flex items-center justify-between">
            <Label>Pojedynek</Label>
            {duel.stake > 1 && !duel.done && <Badge tone="gold">Stawka x{duel.stake}</Badge>}
          </div>
          <div className="flex items-center justify-around mt-4">
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-semibold">Ty</span>
              {duel.myPick ? <PlayingCard value={duel.myPick} size="lg" /> : duel.log.length && duel.done ? <PlayingCard value={duel.log.at(-1).me} size="lg" /> : <div className="w-24 h-36 rounded-[3px] border-2 border-dashed border-cream/30" />}
            </div>
            <div className="font-display text-3xl text-blood-light">VS</div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-semibold truncate max-w-[6rem]">{nick(duel.opponentId)}</span>
              {duel.done && duel.log.length ? (
                <PlayingCard value={duel.log.at(-1).them} size="lg" />
              ) : duel.opponentPicked ? (
                <PlayingCard faceDown size="lg" />
              ) : (
                <div className="w-24 h-36 rounded-[3px] border-2 border-dashed border-cream/30 flex items-center justify-center text-cream/30 text-xs">myśli…</div>
              )}
            </div>
          </div>

          {duel.log.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {duel.log.map((l, i) => (
                <span key={i} className={`text-xs rounded-full px-2 py-1 ${l.me === l.them ? 'bg-gold text-ink' : l.me > l.them ? 'bg-cream text-ink' : 'bg-blood'}`}>
                  {cardLabel(l.me)} vs {cardLabel(l.them)} {l.me === l.them ? ' · WOJNA' : ''}
                </span>
              ))}
            </div>
          )}

          {duel.done ? (
            <div className="mt-4 text-center font-display text-2xl">
              {duel.winner === state.me.id ? <span className="stamp text-gold">Wygrywasz</span> : duel.winner ? <span className="stamp text-blood-light">Przegrywasz</span> : 'Bez rozstrzygnięcia'}
            </div>
          ) : duel.myPick ? (
            <p className="mt-4 text-center text-cream/70 text-sm">Karta wyłożona. Czekamy na rywala…</p>
          ) : (
            <>
              {duel.log.length > 0 && duel.log.at(-1).me === duel.log.at(-1).them && (
                <p className="mt-3 text-center text-gold font-display text-xl animate-shake">WOJNA! Wyłóż kolejną kartę.</p>
              )}
              <div className="mt-4 grid grid-cols-7 gap-1.5 justify-items-center">
                {ALL.map((v) => (
                  <PlayingCard key={v} value={v} size="sm" dim={!mg.hand.includes(v)} selected={selected === v} onClick={() => setSelected(v)} />
                ))}
              </div>
              <Button className="w-full mt-4" disabled={!selected} busy={busy} onClick={() => run(selected)}>
                {selected ? `Wykładam ${cardLabel(selected)}` : 'Wybierz kartę'}
              </Button>
            </>
          )}
        </Panel>
      )}

      {mg.stage !== 'round' && (
        <Panel>
          <Label className="mb-2">Twoja talia ({mg.hand.length} kart)</Label>
          <div className="flex flex-wrap gap-1.5">
            {ALL.map((v) => (
              <PlayingCard key={v} value={v} size="sm" dim={!mg.hand.includes(v)} />
            ))}
          </div>
        </Panel>
      )}

      {mg.stage === 'round_result' && (
        <Panel>
          <Label className="mb-2">Wyniki rundy {mg.round}</Label>
          <div className="space-y-1.5 text-sm">
            {mg.pairs.map((p, i) => (
              <div key={i} className="flex justify-between gap-2">
                <span className={p.winner === p.a ? 'text-gold font-semibold' : ''}>{nick(p.a)}</span>
                <span className="text-cream/40 text-xs">{p.log.map((l) => `${cardLabel(l.a)}:${cardLabel(l.b)}`).join(' → ') || '—'}</span>
                <span className={p.winner === p.b ? 'text-gold font-semibold' : ''}>{nick(p.b)}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel>
        <Label className="mb-2">Punktacja</Label>
        <div className="space-y-1">
          {scores.map(([id, s], i) => (
            <div key={id} className={`flex justify-between rounded-[3px] px-3 py-1.5 ${id === state.me.id ? 'bg-blood/30' : ''}`}>
              <span>
                {i + 1}. {nick(id)}
              </span>
              <span className="font-display">{s}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
