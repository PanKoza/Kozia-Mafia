import { useEffect, useRef, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { Button, Label, Num, Panel, useAction } from '../../components/ui.jsx';
import { HAPTIC, vibrate } from '../../lib/haptics.js';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANK = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
const MIN_BET = 5;

const RESULT = {
  blackjack: { text: 'BLACKJACK!', tone: 'bg-gold text-ink', haptic: HAPTIC.dramatic },
  win: { text: 'Wygrywasz!', tone: 'bg-gold text-ink', haptic: HAPTIC.ok },
  push: { text: 'Remis – stawka wraca', tone: 'bg-cream text-ink', haptic: HAPTIC.tap },
  lose: { text: 'Krupier wygrywa', tone: 'bg-blood text-cream', haptic: HAPTIC.error },
  bust: { text: 'Fura! Ponad 21', tone: 'bg-blood text-cream', haptic: HAPTIC.error },
  refund: { text: 'Stawka zwrócona', tone: 'bg-cream text-ink', haptic: HAPTIC.tap },
};

function Card({ c, i }) {
  if (!c)
    return (
      <div className="w-14 h-20 rounded-[3px] border-2 border-ink bg-blood flex items-center justify-center text-2xl shadow-[0_3px_0_#121212] animate-pop" style={{ animationDelay: `${i * 0.08}s` }}>
        <Icon name="fedora" size={24} />
      </div>
    );
  const red = c.s === 1 || c.s === 2;
  return (
    <div
      className={`w-14 h-20 playing-card rounded-[3px] flex flex-col items-center justify-center font-display animate-pop ${red ? 'text-blood' : 'text-ink'}`}
      style={{ animationDelay: `${i * 0.08}s` }}
    >
      <span className="text-2xl leading-none">{RANK[c.r] ?? c.r}</span>
      <span className="text-sm leading-none mt-0.5">{SUITS[c.s]}</span>
    </div>
  );
}

function Hand({ label, cards, value }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2 mb-2">
        <Label className="!text-cream/80">{label}</Label>
        {cards?.length > 0 && <span className="rounded-full bg-ink/60 px-2 text-sm font-display">{value}</span>}
      </div>
      <div className="flex -space-x-5 min-h-20">
        {cards?.length ? cards.map((c, i) => <Card key={i} c={c} i={i} />) : <div className="w-14 h-20 rounded-[3px] border-2 border-dashed border-cream/20" />}
      </div>
    </div>
  );
}

export default function BlackjackGame({ state, act }) {
  const bj = state.minigame.bj;
  const chips = bj?.chips ?? 0;
  const hand = bj?.hand;
  const playing = hand?.status === 'playing';
  const [bet, setBet] = useState(Math.min(10, chips));
  const [send, busy] = useAction((move, extra = {}) => act('blackjack', { move, ...extra }));

  // Keep the bet within the bankroll.
  useEffect(() => {
    if (bet > chips) setBet(chips);
    else if (bet < Math.min(MIN_BET, chips)) setBet(Math.min(MIN_BET, chips));
  }, [chips]); // eslint-disable-line react-hooks/exhaustive-deps

  // Haptics when a hand resolves.
  const prev = useRef(hand?.status);
  useEffect(() => {
    if (prev.current === 'playing' && hand?.status === 'done') vibrate(RESULT[hand.result]?.haptic ?? HAPTIC.tap);
    prev.current = hand?.status;
  }, [hand?.status, hand?.result]);

  const add = (v) => {
    vibrate(HAPTIC.tap);
    setBet((b) => Math.min(chips, b + v));
  };

  const net = hand && hand.status === 'done' ? hand.payout - hand.bet : 0;

  return (
    <div className="space-y-4">
      {/* Bankroll */}
      <Panel tone="cream" className="flex items-center gap-4">
        <Icon name="shield" size={34} stroke={1.4} className="text-blood" />
        <div className="flex-1">
          <Label className="!text-ink/60">Kozi Blackjack · nagroda: Immunitet</Label>
          <div className="font-display text-4xl leading-none mt-1"><Num value={chips} /> <span className="text-lg">żetonów</span></div>
        </div>
        <div className="text-right text-xs text-ink/60">
          rozdań
          <div className="font-display text-2xl text-ink">{bj?.handsPlayed ?? 0}</div>
        </div>
      </Panel>

      {/* Table */}
      <div className="rounded-[6px] border-4 border-ink bg-[radial-gradient(circle_at_50%_30%,#1f6b45,#0e3b26)] p-5 shadow-[0_8px_0_#000] space-y-6">
        <Hand label="Krupier" cards={hand?.dealer} value={hand?.dealerValue} />
        <div className="text-center font-cond uppercase tracking-[0.3em] text-[10px] text-cream/50">Krupier dobiera do 17 · Blackjack płaci 3:2</div>
        <Hand label="Ty" cards={hand?.player} value={hand?.playerValue} />
        {hand && (
          <div className="text-center text-sm text-cream/80">
            Stawka: <b>{hand.bet}</b>
            {hand.doubled && ' (podwojona)'}
          </div>
        )}
        {hand?.status === 'done' && RESULT[hand.result] && (
          <div className={`rounded-[3px] px-4 py-2 text-center font-display text-2xl animate-stamp ${RESULT[hand.result].tone}`}>
            {RESULT[hand.result].text}
            {net !== 0 && <span className="block text-base font-cond tracking-wider">{net > 0 ? `+${net}` : net} żetonów</span>}
          </div>
        )}
      </div>

      {/* Controls */}
      {playing ? (
        <div className="grid grid-cols-3 gap-2">
          <Button variant="cream" busy={busy} onClick={() => send('hit')}>
            Dobierz
          </Button>
          <Button busy={busy} onClick={() => send('stand')}>
            Pas
          </Button>
          <Button variant="gold" busy={busy} disabled={hand.player.length !== 2 || chips < hand.bet} onClick={() => send('double')}>
            Podwój
          </Button>
        </div>
      ) : chips <= 0 ? (
        <Panel className="text-center">
          <Icon name="coin" size={34} stroke={1.3} className="mx-auto text-blood-light" />
          <p className="mt-2">Kasyno Cię ograło – nie masz już żetonów. Czekamy na koniec gry.</p>
        </Panel>
      ) : (
        <Panel>
          <div className="flex items-center justify-between">
            <Label>Twój zakład</Label>
            <button className="text-xs text-cream/50 underline" onClick={() => setBet(Math.min(MIN_BET, chips))}>
              wyczyść
            </button>
          </div>
          <div className="font-display text-5xl text-center my-2">{bet}</div>
          <div className="grid grid-cols-5 gap-2">
            {[5, 10, 25, 50].map((v) => (
              <button
                key={v}
                onClick={() => add(v)}
                disabled={bet >= chips}
                className="aspect-square rounded-full border-4 border-dashed border-cream/70 bg-blood font-display text-lg disabled:opacity-30 active:scale-90 transition-transform"
              >
                {v}
              </button>
            ))}
            <button
              onClick={() => {
                vibrate(HAPTIC.alert);
                setBet(chips);
              }}
              className="aspect-square rounded-full border-4 border-dashed border-ink bg-gold text-ink font-cond text-xs uppercase leading-tight active:scale-90 transition-transform"
            >
              Va
              <br />
              banque
            </button>
          </div>
          <Button className="w-full mt-4 text-lg" busy={busy} disabled={bet < Math.min(MIN_BET, chips) || bet > chips} onClick={() => send('deal', { bet })}>
            Rozdaj ({bet})
          </Button>
          <p className="text-xs text-cream/50 text-center mt-3">
            Nie musisz grać – żetony, których nie postawisz, są bezpieczne. Wygrywa najwyższa pula, gdy host zamknie kasyno.
          </p>
        </Panel>
      )}
    </div>
  );
}
