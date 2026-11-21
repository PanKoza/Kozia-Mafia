import { useState } from 'react';
import { Button, Label, Panel, PlayerPicker, Title } from '../components/ui.jsx';
import { CARD_INFO, cardLabel, FRUIT_INFO, SPECIAL } from '../lib/labels.js';

export default function MinigameAdmin({ g, run, busy, ask }) {
  const mg = g.minigame;
  const nick = (id) => g.players.find((p) => p.id === id)?.nick ?? '—';
  const [nominee, setNominee] = useState(null);

  const title =
    mg.type === 'war' ? 'Wojna' : mg.type === 'market' ? 'Targ' : CARD_INFO[mg.card].game;

  const advanceLabel = (() => {
    if (mg.type === 'skill') return mg.stage === 'playing' ? 'Zakończ i wyłoń zwycięzcę' : null;
    if (mg.stage === 'nomination' || mg.stage === 'finished') return null;
    if (mg.type === 'war') {
      if (mg.stage === 'negotiation') return 'Rozpocznij rundę 1';
      if (mg.stage === 'round') return 'Wymuś koniec rundy';
      if (mg.stage === 'round_result') return mg.round >= mg.totalRounds ? 'Ogłoś zwycięzcę' : `Rozpocznij rundę ${mg.round + 1}`;
    }
    if (mg.type === 'market') {
      if (mg.stage === 'negotiation') return `Otwórz konfesjonał (runda ${mg.round})`;
      if (mg.stage === 'pricing') return 'Zamknij ceny i pokaż wyniki';
      if (mg.stage === 'results') return mg.round >= mg.totalRounds ? 'Ogłoś zwycięzcę' : `Negocjacje – runda ${mg.round + 1}`;
    }
    return null;
  })();

  return (
    <Panel tone="cream">
      <div className="flex items-start justify-between">
        <div>
          <Label className="!text-ink/60">Mini-gra · etap: {mg.stage}</Label>
          <Title className="mt-1">{title}</Title>
          {mg.rewardRole && <div className="text-sm">Nagroda: nominacja na {SPECIAL[mg.rewardRole].name}a</div>}
          {mg.card && <div className="text-sm">Nagroda: {CARD_INFO[mg.card].full}</div>}
        </div>
      </div>

      {/* WAR details */}
      {mg.type === 'war' && (
        <div className="mt-4 text-sm">
          <div className="font-semibold">
            Runda {mg.round}/{mg.totalRounds}
            {mg.byeId && ` · pauzuje: ${nick(mg.byeId)}`}
          </div>
          {mg.stage === 'round' && (
            <div className="mt-2 space-y-1">
              {mg.pairs.map((p, i) => (
                <div key={i} className="flex justify-between gap-2 bg-white/50 rounded-lg px-2 py-1">
                  <span>
                    {nick(p.a)} {p.pickA ? `(${cardLabel(p.pickA)})` : ''}
                  </span>
                  <span className="text-xs opacity-60">{p.done ? (p.winner ? `wygrywa ${nick(p.winner)}` : 'remis') : p.stake > 1 ? `wojna x${p.stake}` : '…'}</span>
                  <span>
                    {p.pickB ? `(${cardLabel(p.pickB)})` : ''} {nick(p.b)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3">
            {Object.entries(mg.scores)
              .sort((a, b) => b[1] - a[1])
              .map(([id, s]) => (
                <span key={id} className="inline-block mr-3">
                  {nick(id)}: <b>{s}</b>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* MARKET details */}
      {mg.type === 'market' && (
        <div className="mt-4 text-sm">
          <div className="font-semibold">
            Runda {mg.round}/{mg.totalRounds}
            {mg.stage === 'pricing' && ` · ceny: ${Object.keys(mg.prices).length}/${mg.participants.length}`}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1">
            {mg.participants.map((id) => (
              <div key={id} className="bg-white/50 rounded-lg px-2 py-1 flex justify-between">
                <span>
                  {nick(id)} {mg.holdings[id].map((f) => FRUIT_INFO[f].emoji).join('')}
                  {mg.prices[id] && ` ${Object.values(mg.prices[id]).map((v) => '$' + v).join('/')}`}
                </span>
                <b>${mg.money[id]}</b>
              </div>
            ))}
          </div>
          {mg.secretFruits.length > 0 && <div className="mt-2">Utajnione w tej rundzie: {mg.secretFruits.map((f) => FRUIT_INFO[f].emoji).join(' ')}</div>}
        </div>
      )}

      {/* SKILL details */}
      {mg.type === 'skill' && (
        <div className="mt-4 text-sm">
          {mg.game === 'poker' && mg.poker ? (
            <div className="rounded-[3px] bg-white/50 p-3 space-y-1">
              <div className="font-semibold">
                Rozdanie {mg.poker.handNo} · pula {mg.poker.hand ? Object.values(mg.poker.hand.contrib).reduce((a, b) => a + b, 0) : 0} · ciemne {mg.poker.hand?.sb}/{mg.poker.hand?.bb}
              </div>
              <div>
                {mg.poker.hand?.over ? 'Rozdanie zakończone' : `Ruch: ${nick(mg.poker.hand?.toAct)} (${mg.poker.hand?.street})`}
              </div>
              {mg.stage === 'playing' && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button variant="cream" className="text-xs !px-2" busy={busy} disabled={mg.poker.hand?.over} onClick={() => run('poker_force')}>
                    ⏱️ Wymuś ruch
                  </Button>
                  <Button variant="cream" className="text-xs !px-2" busy={busy} disabled={!mg.poker.hand?.over} onClick={() => run('poker_next')}>
                    ▶️ Następne rozdanie
                  </Button>
                </div>
              )}
              <p className="text-[11px] opacity-60">„Wymuś ruch” = czekanie, a jeśli trzeba dopłacić – pas (dla gracza, który zwleka).</p>
            </div>
          ) : (
            <div className="font-semibold">
              Zagrało: {Object.keys(mg.scores).length}/{mg.participants.length}
            </div>
          )}
          <div className="mt-2 space-y-0.5">
            {Object.entries(mg.scores)
              .sort((a, b) => b[1] - a[1])
              .map(([id, s], i) => (
                <div key={id}>
                  {i + 1}. {nick(id)} – <b>{s}</b>
                </div>
              ))}
          </div>
          {mg.stage === 'finished' && <div className="mt-2 font-semibold">Kartę otrzymał(a): {mg.winnerId ? nick(mg.winnerId) : 'nikt'}</div>}
        </div>
      )}

      {/* Nomination */}
      {mg.stage === 'nomination' && (
        <div className="mt-4">
          <p className="font-semibold">
            Wygrał(a) {nick(mg.winnerId)}
            {mg.tiebreak && ' (losowanie z remisu)'} – czekamy na nominację w aplikacji.
          </p>
          <details className="mt-2">
            <summary className="text-sm opacity-70">Nominuj w imieniu zwycięzcy</summary>
            <div className="mt-2 bg-ink rounded-[3px] p-2">
              <PlayerPicker players={g.players.filter((p) => p.alive)} selected={nominee} onSelect={setNominee} />
            </div>
            <Button className="w-full mt-2" disabled={!nominee} busy={busy} onClick={() => run('host_nominate', { targetId: nominee })}>
              Zatwierdź nominację
            </Button>
          </details>
        </div>
      )}
      {mg.stage === 'finished' && mg.nomineeId && (
        <p className="mt-4 font-semibold">
          {nick(mg.nomineeId)} zostaje: {SPECIAL[mg.rewardRole].name}
        </p>
      )}

      <div className="grid gap-2 mt-5">
        {advanceLabel && (
          <Button busy={busy} onClick={() => run('minigame_advance')}>
            {advanceLabel}
          </Button>
        )}
        <Button
          variant={mg.stage === 'finished' ? 'primary' : 'cream'}
          onClick={() => (mg.stage === 'finished' ? run('minigame_close') : ask('Przerwać mini-grę? Nagroda nie zostanie przyznana.', () => run('minigame_close')))}
        >
          {mg.stage === 'finished' ? 'Zamknij mini-grę' : 'Przerwij mini-grę'}
        </Button>
      </div>
    </Panel>
  );
}
