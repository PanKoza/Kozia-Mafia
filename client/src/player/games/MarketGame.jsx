import { useEffect, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { Badge, Button, GameHeader, Label, Modal, Num, Panel, Title, useAction, useToast } from '../../components/ui.jsx';
import { useReveal } from '../../lib/motion.js';
import { HAPTIC, vibrate } from '../../lib/haptics.js';
import { FRUIT_INFO, SPECIAL } from '../../lib/labels.js';

const F = (k) => FRUIT_INFO[k] ?? { name: k, emoji: '❓' };
const money = (v) => `$${Number(v).toLocaleString('pl-PL', { maximumFractionDigits: 2 })}`;

export default function MarketGame({ state, act }) {
  const { players, minigame: mg } = state;
  const toast = useToast();
  const nick = (id) => players.find((p) => p.id === id)?.nick ?? '?';
  const [prices, setPrices] = useState(() => mg.myPrices ?? {});
  const [tokenModal, setTokenModal] = useState(null);
  const [run, busy] = useAction(async (type, payload, okMsg) => {
    await act(type, payload);
    vibrate(HAPTIC.ok);
    if (okMsg) toast(okMsg, 'success');
  });

  useEffect(() => {
    if (mg.stage === 'pricing') setPrices(mg.myPrices ?? {});
  }, [mg.stage, mg.round]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastResult = mg.results.at(-1);
  const pricesComplete = mg.myFruits.every((f) => prices[f]);
  const scope = useReveal([mg.stage, mg.round]);

  return (
    <div ref={scope} className="space-y-4">
      <GameHeader
        kicker={`Mini-gra · runda ${mg.round}/${mg.totalRounds}`}
        title="Targ"
        right={
          <div className="text-right">
            <div className="font-display text-4xl leading-none">
              $<Num value={mg.myMoney} format={(n) => (Math.round(n * 100) / 100).toLocaleString('pl-PL')} />
            </div>
            <div className="kicker !text-[9px] text-ink/50 mt-1">Twój zarobek</div>
          </div>
        }
      >
        <Badge tone="red">
          <Icon name={SPECIAL[mg.rewardRole].icon} size={11} /> Nagroda: {SPECIAL[mg.rewardRole].name}
        </Badge>
      </GameHeader>

      {/* My stall */}
      <Panel>
        <Label className="mb-2">Twoje stoisko – masz prawo sprzedawać</Label>
        <div className="grid grid-cols-2 gap-3">
          {mg.myFruits.map((f) => (
            <div key={f} className="rounded-[3px] bg-cream text-ink border-2 border-ink p-3 text-center">
              <div className="text-4xl">{F(f).emoji}</div>
              <div className="font-display text-lg">{F(f).name}</div>
              <div className="text-xs opacity-70">Sprzedawców: {mg.groupSizes[f]} · popyt: {mg.groupSizes[f]} szt.</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Market overview */}
      <Panel>
        <Label className="mb-2">Rynek – liczebność grup</Label>
        <div className="grid grid-cols-3 gap-2">
          {mg.fruits.map((f) => (
            <div key={f} className={`rounded-[3px] px-2 py-2 text-center ${mg.myFruits.includes(f) ? 'bg-blood/30 border border-blood' : 'bg-ink'}`}>
              <div className="text-2xl">{F(f).emoji}</div>
              <div className="text-xs">{mg.groupSizes[f]} os.</div>
            </div>
          ))}
        </div>
        {mg.announcements.length > 0 && (
          <div className="mt-3 space-y-1">
            {mg.announcements.slice(-3).map((a, i) => (
              <p key={i} className="text-xs text-gold">
                Runda {a.round}: {a.text}
              </p>
            ))}
          </div>
        )}
      </Panel>

      {/* NEGOTIATION – tokens */}
      {mg.stage === 'negotiation' && (
        <Panel className="border-gold/40">
          <Label className="mb-1 !text-gold">Negocjacje</Label>
          <p className="text-sm text-cream/80">
            Znajdź osoby z tym samym owocem i umówcie się na cenę. Najniższa cena zgarnia <b>cały</b> popyt – zdrada się opłaca… jednorazowo.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <TokenButton icon="swap" name="Zmiana" available={mg.myTokens?.change} blocked={mg.tokenUsedThisRound} onClick={() => setTokenModal('change')} />
            <TokenButton icon="hush" name="Sekret" available={mg.myTokens?.secret} blocked={mg.tokenUsedThisRound} onClick={() => setTokenModal('secret')} />
          </div>
          {mg.tokenUsedThisRound && <p className="text-xs text-cream/50 mt-2">W tej rundzie użyłeś już żetonu (max 1 na rundę).</p>}
        </Panel>
      )}

      {/* PRICING */}
      {mg.stage === 'pricing' && (
        <Panel className="border-blood/50">
          <Label className="mb-1 !text-blood-light">Konfesjonał – tajne ceny</Label>
          <p className="text-sm text-cream/70 mb-4">Ustal cenę dla każdego owocu. Bez ceny = nic nie sprzedasz. Ustawiło ceny: {mg.pricedCount}/{mg.participantCount}</p>
          {mg.myFruits.map((f) => (
            <div key={f} className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{F(f).emoji}</span>
                <span className="font-semibold">{F(f).name}</span>
                {mg.myPrices?.[f] && <span className="ml-auto text-xs text-gold">zapisano: ${mg.myPrices[f]}</span>}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      vibrate(HAPTIC.tap);
                      setPrices((p) => ({ ...p, [f]: v }));
                    }}
                    className={`rounded-[3px] py-3 font-display text-xl border-2 transition-all ${prices[f] === v ? 'bg-gold text-ink border-ink scale-105' : 'bg-ink border-cream/20'}`}
                  >
                    ${v}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <Button className="w-full" disabled={!pricesComplete} busy={busy} onClick={() => run('market_prices', { prices }, 'Ceny zapisane w tajemnicy. Możesz je zmienić do zamknięcia konfesjonału.')}>
            {mg.myPrices ? 'Zmień ceny' : 'Zatwierdź ceny'}
          </Button>
        </Panel>
      )}

      {/* RESULTS */}
      {lastResult && (mg.stage === 'results' || mg.stage === 'negotiation') && <RoundResult r={lastResult} myFruits={mg.myFruits} latest={mg.stage === 'results'} />}

      {mg.results.length > 1 && (
        <details className="rounded-[4px] bg-ink-soft border border-cream/10 p-4">
          <summary className="font-cond uppercase tracking-widest text-xs text-cream/60">Historia rund</summary>
          <div className="space-y-3 mt-3">
            {mg.results.slice(0, -1).reverse().map((r) => (
              <RoundResult key={r.round} r={r} myFruits={mg.myFruits} compact />
            ))}
          </div>
        </details>
      )}

      {mg.ranking && (
        <Panel>
          <Label className="mb-2">Ranking końcowy</Label>
          {mg.ranking.map((r, i) => (
            <div key={r.id} className="flex justify-between py-1">
              <span>
                {i + 1}. {nick(r.id)}
              </span>
              <span className="font-display">{money(r.money)}</span>
            </div>
          ))}
        </Panel>
      )}

      <TokenModal kind={tokenModal} mg={mg} onClose={() => setTokenModal(null)} busy={busy} onUse={async (payload, msg) => {
        await run('market_token', payload, msg);
        setTokenModal(null);
      }} />
    </div>
  );
}

function TokenButton({ icon, name, available, blocked, onClick }) {
  return (
    <button
      disabled={!available || blocked}
      onClick={onClick}
      className="rounded-[3px] border-2 border-gold/60 bg-gold/10 p-3 text-center disabled:opacity-30 active:scale-95 transition-transform"
    >
      <Icon name={icon} size={28} className="mx-auto text-gold" />
      <div className="font-cond uppercase tracking-wider text-sm mt-1">Żeton {name}</div>
      <div className="text-[11px] text-cream/60">{available ? 'dostępny' : 'wykorzystany'}</div>
    </button>
  );
}

function TokenModal({ kind, mg, onClose, onUse, busy }) {
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [fruit, setFruit] = useState(null);
  useEffect(() => {
    setFrom(null);
    setTo(null);
    setFruit(null);
  }, [kind]);
  if (!kind) return null;
  const FruitBtn = ({ f, active, onClick, disabled }) => (
    <button disabled={disabled} onClick={onClick} className={`rounded-[3px] p-2 border-2 text-center disabled:opacity-25 ${active ? 'bg-gold border-ink text-ink' : 'bg-ink border-cream/20'}`}>
      <div className="text-2xl">{F(f).emoji}</div>
      <div className="text-[11px]">{F(f).name}</div>
    </button>
  );
  return (
    <Modal open onClose={onClose} tone="dark">
      {kind === 'change' ? (
        <>
          <Title>Żeton Zmiany</Title>
          <p className="text-sm text-cream/70 mt-1">Wymień jeden swój owoc na inny. Wszyscy dowiedzą się, że ktoś użył zmiany – ale nie kto.</p>
          <Label className="mt-4 mb-2">Oddajesz</Label>
          <div className="grid grid-cols-2 gap-2">
            {mg.myFruits.map((f) => (
              <FruitBtn key={f} f={f} active={from === f} onClick={() => setFrom(f)} />
            ))}
          </div>
          <Label className="mt-4 mb-2">Bierzesz</Label>
          <div className="grid grid-cols-3 gap-2">
            {mg.fruits.map((f) => (
              <FruitBtn key={f} f={f} active={to === f} disabled={mg.myFruits.includes(f)} onClick={() => setTo(f)} />
            ))}
          </div>
          <Button variant="gold" className="w-full mt-5" disabled={!from || !to} busy={busy} onClick={() => onUse({ kind: 'change', from, to }, 'Owoc wymieniony!')}>
            Wymieniam
          </Button>
        </>
      ) : (
        <>
          <Title>Żeton Sekretu</Title>
          <p className="text-sm text-cream/70 mt-1">Ukryj wyniki wybranego owocu po tej rundzie. Możesz wybrać także owoc, którego nie sprzedajesz.</p>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {mg.fruits.map((f) => (
              <FruitBtn key={f} f={f} active={fruit === f} onClick={() => setFruit(f)} />
            ))}
          </div>
          <Button variant="gold" className="w-full mt-5" disabled={!fruit} busy={busy} onClick={() => onUse({ kind: 'secret', fruit }, 'Wyniki tego owocu zostaną utajnione.')}>
            Utajniam
          </Button>
        </>
      )}
    </Modal>
  );
}

function RoundResult({ r, myFruits, latest, compact }) {
  const myTotal = r.mine ? Object.values(r.mine).reduce((s, x) => s + x.earned, 0) : 0;
  return (
    <div className={compact ? '' : 'rounded-[4px] bg-ink-soft border border-gold/40 p-4'}>
      <div className="flex justify-between items-center mb-2">
        <Label className={latest ? '!text-gold' : ''}>Wyniki rundy {r.round}</Label>
        <span className="text-sm">Ty: <b className="text-gold">{money(myTotal)}</b></span>
      </div>
      <div className="space-y-1.5">
        {Object.entries(r.perFruit).map(([f, v]) => (
          <div key={f} className={`flex items-center gap-2 text-sm rounded-[3px] px-2 py-1 ${myFruits.includes(f) ? 'bg-blood/20' : ''}`}>
            <span className="text-xl">{F(f).emoji}</span>
            <span className="flex-1">{F(f).name}</span>
            {v.hidden ? (
              <span className="redact px-6 text-xs">utajnione</span>
            ) : v.winningPrice == null ? (
              <span className="text-cream/50">brak sprzedaży</span>
            ) : (
              <span>
                ${v.winningPrice} · sprzedało {v.winners}/{v.sellers}
                {v.winners < v.sellers && v.winners > 0 && <span className="text-blood-light"> · zdrada</span>}
              </span>
            )}
          </div>
        ))}
      </div>
      {r.mine && !compact && (
        <div className="mt-3 text-xs text-cream/60 space-y-0.5">
          {Object.entries(r.mine).map(([f, x]) => (
            <div key={f}>
              {F(f).emoji} Twoja cena: {x.price ? `$${x.price}` : 'brak'} → sprzedane {Number(x.units.toFixed(2))} szt. = {money(x.earned)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
