import { useEffect, useRef, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { Button, Label, Modal, Num, Panel, Title, useAction } from '../../components/ui.jsx';
import { HAPTIC, vibrate } from '../../lib/haptics.js';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANK = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A', 10: '10' };
const STREET = { preflop: 'Przed flopem', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Odkrycie kart' };

function PCard({ c, size = 'md', dim, highlight }) {
  const s = { sm: 'w-7 h-10 text-xs', md: 'w-11 h-16 text-lg', lg: 'w-16 h-24 text-3xl' }[size];
  if (c === undefined)
    return <div className={`${s} rounded-md border-2 border-dashed border-cream/20`} />;
  if (c === null)
    return <div className={`${s} rounded-md border-2 border-ink bg-blood flex items-center justify-center shadow-[0_2px_0_#0E0D0C] text-cream halftone`}><Icon name="fedora" size={size === 'lg' ? 26 : size === 'md' ? 18 : 12} /></div>;
  const red = c.s === 1 || c.s === 2;
  return (
    <div
      className={`${s} playing-card rounded-md flex flex-col items-center justify-center font-display leading-none animate-pop ${red ? 'text-blood' : 'text-ink'} ${
        dim ? 'opacity-40' : ''
      } ${highlight ? 'ring-2 ring-gold' : ''}`}
    >
      <span>{RANK[c.r] ?? c.r}</span>
      <span className="text-[0.6em] mt-0.5">{SUITS[c.s]}</span>
    </div>
  );
}

const same = (a, b) => a && b && a.r === b.r && a.s === b.s;

export default function PokerGame({ state, act }) {
  const { me, players, minigame: mg } = state;
  const pk = mg.poker;
  const h = pk?.hand;
  const nick = (id) => players.find((p) => p.id === id)?.nick ?? '?';
  const myTurn = h && !h.over && h.toAct === me.id;
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [raiseTo, setRaiseTo] = useState(0);
  const [send, busy] = useAction(async (move, extra = {}) => {
    await act('poker', { move, ...extra });
    vibrate(HAPTIC.tap);
  });

  // Buzz when it becomes my turn / when a hand finishes.
  const wasMyTurn = useRef(false);
  const actionsRef = useRef(null);
  useEffect(() => {
    if (myTurn && !wasMyTurn.current) {
      vibrate(HAPTIC.alert);
      setTimeout(() => actionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }
    wasMyTurn.current = myTurn;
  }, [myTurn]);
  const wasOver = useRef(h?.over);
  useEffect(() => {
    if (h?.over && !wasOver.current) {
      const iWon = h.results?.winners?.some((w) => w.id === me.id);
      vibrate(iWon ? HAPTIC.dramatic : HAPTIC.ok);
    }
    wasOver.current = h?.over;
  }, [h?.over]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!pk) return null;
  const mySeat = pk.seats.find((s) => s.id === me.id);
  const winners = new Set(h?.results?.winners?.map((w) => w.id) ?? []);
  const myBest = h?.results?.hands?.[me.id]?.best;
  const board = h ? [0, 1, 2, 3, 4].map((i) => h.board[i]) : [];

  const openRaise = () => {
    setRaiseTo(h.minRaiseTo);
    setRaiseOpen(true);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <Panel tone="cream" className="flex items-center gap-3 !py-3">
        <Icon name="double" size={30} stroke={1.4} className="text-blood" />
        <div className="flex-1 min-w-0">
          <Label className="!text-ink/60">Kozi Poker · nagroda: Podwójny Głos</Label>
          <div className="font-display text-3xl leading-none mt-1">
            <Num value={mySeat?.chips ?? 0} /> <span className="text-base">żetonów</span>
          </div>
        </div>
        <div className="text-right text-xs text-ink/60">
          Rozdanie {pk.handNo}
          <div className="font-cond text-ink text-sm">
            ciemne {h?.sb ?? pk.nextBlinds.sb}/{h?.bb ?? pk.nextBlinds.bb}
          </div>
        </div>
      </Panel>

      {/* Table */}
      <div className="rounded-[2rem] border-4 border-ink bg-[radial-gradient(ellipse_at_50%_40%,#1f6b45,#0e3b26)] px-3 py-4 shadow-[0_8px_0_#000]">
        <div className="text-center">
          <Label className="!text-cream/60">{h ? STREET[h.street] : 'Czekamy na rozdanie'}</Label>
          <div className="font-display text-3xl text-gold leading-tight">Pula {h?.pot ?? 0}</div>
        </div>
        <div className="flex justify-center gap-1.5 mt-3">
          {board.map((c, i) => (
            <PCard key={i} c={c} highlight={myBest?.some((b) => same(b, c))} />
          ))}
        </div>

        {/* Seats */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {pk.seats.map((s) => {
            const busted = s.chips === 0 && !s.inHand;
            return (
              <div
                key={s.id}
                className={`relative rounded-[3px] px-2.5 py-2 border-2 transition-all ${
                  s.turn ? 'border-gold bg-ink/80 shadow-[0_0_16px_rgba(232,181,58,.5)]' : winners.has(s.id) ? 'border-gold bg-gold/20' : 'border-transparent bg-ink/50'
                } ${s.folded || busted ? 'opacity-45' : ''}`}
              >
                <div className="flex items-center gap-1.5">
                  {s.dealer && <span className="w-5 h-5 rounded-full bg-cream text-ink text-[10px] font-bold flex items-center justify-center shrink-0">D</span>}
                  <span className={`font-semibold text-sm truncate ${s.id === me.id ? 'text-gold' : ''}`}>{s.id === me.id ? 'Ty' : nick(s.id)}</span>
                  <span className="ml-auto text-xs font-display">{s.chips}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 min-h-[1.25rem]">
                  {s.cards ? (
                    <div className="flex gap-0.5">
                      {s.cards.map((c, i) => (
                        <PCard key={i} c={c} size="sm" />
                      ))}
                    </div>
                  ) : s.inHand && !s.folded && s.id !== me.id ? (
                    <div className="flex gap-0.5">
                      <PCard c={null} size="sm" />
                      <PCard c={null} size="sm" />
                    </div>
                  ) : null}
                  <span className="text-[11px] text-cream/70 truncate">
                    {busted ? 'bez żetonów' : s.handName ?? (s.turn ? 'myśli…' : s.last ?? '')}
                  </span>
                  {s.bet > 0 && !h?.over && <span className="ml-auto rounded-full bg-blood px-1.5 text-[11px] font-bold shrink-0">{s.bet}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* My hand */}
      {h?.myHole && (
        <div className="flex items-center gap-3 rounded-[4px] bg-ink-soft border border-cream/10 p-3">
          <div className="flex gap-1.5">
            {h.myHole.map((c, i) => (
              <PCard key={i} c={c} size="lg" dim={mySeat?.folded} highlight={myBest?.some((b) => same(b, c))} />
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <Label>Twoje karty</Label>
            <div className="font-display text-xl leading-tight">{mySeat?.folded ? 'Spasowane' : h.myHandName ?? '—'}</div>
            {mySeat?.allIn && !h.over && <div className="text-gold text-sm font-cond uppercase tracking-wider">All-in!</div>}
          </div>
        </div>
      )}
      {!h?.myHole && mySeat?.chips === 0 && <Panel className="text-center text-sm text-cream/70">Skończyły Ci się żetony. Możesz dalej kibicować.</Panel>}

      {/* Actions */}
      {myTurn && (
        <div ref={actionsRef} className="scroll-mb-28 rounded-[4px] bg-ink border-2 border-gold p-3 shadow-2xl animate-rise">
          <div className="text-center font-cond uppercase tracking-widest text-xs text-gold mb-2">Twój ruch{h.toCall > 0 ? ` · do sprawdzenia ${h.toCall}` : ''}</div>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="danger" className="!px-2" busy={busy} onClick={() => send('fold')}>
              Pas
            </Button>
            <Button variant="cream" className="!px-2" busy={busy} onClick={() => send(h.canCheck ? 'check' : 'call')}>
              {h.canCheck ? 'Czekam' : h.toCall >= mySeat.chips ? 'All-in' : `Sprawdzam ${h.toCall}`}
            </Button>
            <Button variant="gold" className="!px-2" busy={busy} disabled={h.maxRaiseTo <= h.currentBet} onClick={openRaise}>
              {h.currentBet === 0 ? 'Stawiam' : 'Przebijam'}
            </Button>
          </div>
        </div>
      )}

      {/* Result */}
      {h?.over && h.results && (
        <Panel className="border-gold/60 text-center">
          {h.results.refunded ? (
            <p>Rozdanie przerwane – stawki zwrócone.</p>
          ) : (
            h.results.winners.map((w) => (
              <div key={w.id} className="font-display text-xl">
                <Icon name="trophy" size={20} className="inline text-gold mr-2 -mt-1" />{w.id === me.id ? 'Wygrywasz' : nick(w.id)} +{w.amount}
                {w.hand && <span className="block font-cond text-sm text-cream/70 tracking-wider uppercase">{w.hand}</span>}
              </div>
            ))
          )}
          {mySeat?.chips > 0 || pk.seats.filter((s) => s.chips > 0).length >= 2 ? (
            <Button variant="gold" className="w-full mt-3" busy={busy} disabled={pk.seats.filter((s) => s.chips > 0).length < 2} onClick={() => send('next')}>
              {pk.seats.filter((s) => s.chips > 0).length < 2 ? 'Został jeden gracz – czekamy na hosta' : 'Następne rozdanie'}
            </Button>
          ) : null}
        </Panel>
      )}

      <Modal open={raiseOpen && myTurn} onClose={() => setRaiseOpen(false)} tone="dark">
        {h && (
          <>
            <Title>{h.currentBet === 0 ? 'Stawiam' : 'Przebijam'} do</Title>
            <div className="font-display text-6xl text-center text-gold my-4">{raiseTo}</div>
            <input
              type="range"
              min={h.minRaiseTo}
              max={h.maxRaiseTo}
              step={h.bb >= 20 ? 10 : 5}
              value={raiseTo}
              onChange={(e) => setRaiseTo(Number(e.target.value))}
              className="w-full accent-gold"
            />
            <div className="flex justify-between text-xs text-cream/50">
              <span>min {h.minRaiseTo}</span>
              <span>max {h.maxRaiseTo}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-4">
              {[
                ['Min', h.minRaiseTo],
                ['½ puli', h.currentBet + Math.floor(h.pot / 2)],
                ['Pula', h.currentBet + h.pot],
                ['All-in', h.maxRaiseTo],
              ].map(([l, v]) => (
                <button
                  key={l}
                  onClick={() => setRaiseTo(Math.max(h.minRaiseTo, Math.min(h.maxRaiseTo, v)))}
                  className="rounded-[3px] bg-ink-line py-2 text-sm font-cond uppercase tracking-wider active:bg-blood"
                >
                  {l}
                </button>
              ))}
            </div>
            <Button
              variant="gold"
              className="w-full mt-5"
              busy={busy}
              onClick={async () => {
                await send(raiseTo >= h.maxRaiseTo ? 'allin' : 'raise', { amount: raiseTo });
                setRaiseOpen(false);
              }}
            >
              {raiseTo >= h.maxRaiseTo ? `All-in (${raiseTo})` : `Potwierdź ${raiseTo}`}
            </Button>
          </>
        )}
      </Modal>

      <p className="text-center text-[11px] text-cream/40">
        Texas Hold'em No-Limit · {1000} żetonów na start · ciemne rosną co 10 rozdań · wygrywa największy stos, gdy host zamknie stół.
      </p>
    </div>
  );
}
