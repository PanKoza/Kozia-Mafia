import { useEffect, useRef, useState } from 'react';
import ElectricBorder from '../components/bits/ElectricBorder.jsx';
import Icon from '../components/Icon.jsx';
import { Badge, Button, Num, Panel, PlayerPicker, Rule, Stamp, useAction, useToast } from '../components/ui.jsx';
import { HAPTIC, vibrate } from '../lib/haptics.js';
import { CARD_INFO } from '../lib/labels.js';
import { gsap, useReveal } from '../lib/motion.js';
import MinigameView from './games/MinigameView.jsx';

export default function GameTab({ state, act }) {
  const { me, game, minigame } = state;
  const scope = useReveal([game.phase, game.day, !!minigame]);
  return (
    <div ref={scope} className="space-y-5">
      {!me.alive && (
        <div data-reveal className="relative bg-blood text-cream px-5 py-4 flex items-center gap-4 shadow-[inset_0_0_0_5px_#B3121B,inset_0_0_0_6px_rgba(244,234,213,.45)]">
          <Icon name="skull" size={34} stroke={1.4} />
          <div>
            <div className="font-display text-2xl leading-none">Jesteś poza grą</div>
            <p className="font-mono text-xs mt-1 text-cream/85">Obserwuj, ale nie zdradzaj niczego żywym.</p>
          </div>
        </div>
      )}
      {minigame ? (
        <MinigameView state={state} act={act} />
      ) : game.phase === 'city_vote' ? (
        <CityVote state={state} act={act} />
      ) : game.phase === 'night' ? (
        <Night state={state} act={act} />
      ) : (
        <Day state={state} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DAY – morning paper                                                 */
/* ------------------------------------------------------------------ */

function Day({ state }) {
  const { me, game, players } = state;
  const lv = game.lastVote;
  const deaths = game.feed.filter((f) => f.kind === 'death').slice(-2).reverse();
  const unusedCards = me.cards.filter((c) => !c.used);
  const alive = players.filter((p) => p.alive).length;
  const date = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <div data-reveal className="paper px-5 pt-4 pb-5 shadow-[0_24px_50px_-20px_rgba(0,0,0,.9)]">
        <div className="flex items-center justify-between border-b-2 border-ink pb-1">
          <span className="kicker !text-[9px] text-ink/60">Kurier Górski</span>
          <span className="font-mono text-[10px] text-ink/55 capitalize">{date}</span>
        </div>
        <div className="h-1 border-b border-ink/40 mb-3" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="kicker text-blood">Dzień {game.day}</div>
            <h2 className="font-display text-[2.6rem] leading-[0.9] mt-1">Dzień w domu</h2>
          </div>
          <Icon name="sun" size={40} stroke={1.3} className="text-ink/70 mt-1" />
        </div>
        <p className="font-mono text-[13px] text-ink/70 mt-3 leading-snug">Rozmawiajcie, obserwujcie, zawierajcie sojusze. Host wkrótce ogłosi mini-grę lub obrady.</p>
        {deaths.length > 0 && (
          <div className="mt-4 border-t border-ink/25 pt-3 space-y-1.5">
            {deaths.map((f) => (
              <p key={f.id} className="font-mono text-[13px] leading-snug flex gap-2">
                <Icon name="skull" size={15} className="mt-0.5 text-blood shrink-0" />
                {f.text.replace(/^☠️\s*/, '')}
              </p>
            ))}
          </div>
        )}
      </div>

      <div data-reveal className="grid grid-cols-2 gap-3">
        <Stat label="W grze" value={alive} icon="users" />
        <Stat label="Odpadło" value={players.length - alive} icon="skull" tone="text-blood-light" />
      </div>

      {lv && <VoteResult lv={lv} />}

      {me.alive && (me.isSheriff || unusedCards.length > 0 || Object.values(me.effects).some(Boolean)) && (
        <Panel data-reveal className="!border-gold/40">
          <Rule className="mb-3">
            <span className="text-gold">Twoje atuty · zakładka Akta</span>
          </Rule>
          <ul className="space-y-2 text-sm">
            {me.isSheriff && (
              <li className="flex items-center gap-2.5">
                <Icon name="badge" size={17} className="text-gold" /> Śledztwo Szeryfa {me.sheriffUsedToday ? <span className="text-cream/40">– jutro</span> : <Badge tone="gold">dostępne</Badge>}
              </li>
            )}
            {unusedCards.map((c) => (
              <li key={c.id} className="flex items-center gap-2.5">
                <Icon name={CARD_INFO[c.type].icon} size={17} className="text-gold" /> {CARD_INFO[c.type].full}
              </li>
            ))}
            {me.effects.doubleVote && <li className="text-gold flex gap-2.5"><Icon name="double" size={17} /> Aktywny podwójny głos</li>}
            {me.effects.immunity && <li className="text-gold flex gap-2.5"><Icon name="shield" size={17} /> Aktywny immunitet</li>}
            {me.effects.mafiaShield && <li className="text-gold flex gap-2.5"><Icon name="vest" size={17} /> Ochrona na najbliższą noc</li>}
          </ul>
        </Panel>
      )}
    </>
  );
}

function Stat({ label, value, icon, tone = '' }) {
  return (
    <Panel className="!py-4 flex items-center gap-3">
      <Icon name={icon} size={22} stroke={1.4} className="text-cream/40" />
      <div>
        <div className={`font-display text-4xl leading-none ${tone}`}>
          <Num value={value} />
        </div>
        <div className="kicker !text-[9px] text-cream/45 mt-1">{label}</div>
      </div>
    </Panel>
  );
}

function VoteResult({ lv }) {
  const ref = useRef(null);
  const max = Math.max(1, ...lv.tally.map((t) => t.count), lv.skip);
  useEffect(() => {
    gsap.fromTo(ref.current.querySelectorAll('[data-bar]'), { scaleX: 0 }, { scaleX: 1, duration: 1.1, stagger: 0.12, ease: 'expo.out', delay: 0.3 });
  }, [lv.day, lv.voters]);
  return (
    <Panel data-reveal>
      <div ref={ref}>
        <Rule className="mb-4">Protokół obrad · dzień {lv.day}</Rule>
        <div className="space-y-3">
          {lv.tally.map((t) => {
            const out = t.id === lv.eliminatedId;
            return (
              <div key={t.id}>
                <div className="flex justify-between items-baseline">
                  <span className={`font-semibold ${out ? 'text-blood-light' : ''}`}>
                    {t.nick}
                    {out && <Stamp className="ml-3 !text-[10px] !border-2 text-blood-light">Wyrzucony</Stamp>}
                  </span>
                  <span className="font-mono text-sm">{t.count}</span>
                </div>
                <div className="h-[6px] bg-cream/10 mt-1.5 overflow-hidden">
                  <div data-bar className={`h-full origin-left ${out ? 'bg-blood-light' : 'bg-cream/45'}`} style={{ width: `${(t.count / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
          {lv.skip > 0 && (
            <div className="flex justify-between font-mono text-sm text-cream/50">
              <span>Wstrzymało się</span>
              <span>{lv.skip}</span>
            </div>
          )}
        </div>
        {(lv.outcome === 'tie' || lv.outcome === 'skip') && (
          <p className="mt-4 font-mono text-sm text-cream/65">{lv.outcome === 'tie' ? 'Remis – nikt nie odpadł.' : 'Miasto nikogo nie wyrzuciło.'}</p>
        )}
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* CITY VOTE                                                           */
/* ------------------------------------------------------------------ */

function CityVote({ state, act }) {
  const { me, players, vote } = state;
  const [selected, setSelected] = useState(null);
  const toast = useToast();
  const [cast, busy] = useAction(async (targetId) => {
    await act('city_vote', { targetId });
    vibrate(HAPTIC.ok);
    toast('Głos wrzucony do urny. Możesz go zmienić do końca obrad.', 'success');
    setSelected(null);
  });
  if (!vote) return null;
  const alive = players.filter((p) => p.alive && p.id !== me.id);
  const myVote = vote.myVote;
  const myVoteNick = myVote === 'skip' ? 'Wstrzymuję się' : players.find((p) => p.id === myVote)?.nick;
  const pending = selected && selected !== myVote;
  const pct = Math.round((vote.votedCount / Math.max(1, vote.totalVoters)) * 100);

  return (
    <>
      <div data-reveal className="paper px-5 pt-5 pb-5 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <div className="kicker text-blood">Obrady miasta</div>
            <h2 className="font-display text-[2.5rem] leading-[0.9] mt-1">Kto jest z mafii?</h2>
          </div>
          <Icon name="ballot" size={40} stroke={1.3} className="text-ink/70" />
        </div>
        <div className="mt-4">
          <div className="flex justify-between kicker !text-[9px] text-ink/60">
            <span>Głosy w urnie</span>
            <span className="font-mono normal-case tracking-normal text-xs">
              {vote.votedCount}/{vote.totalVoters}
            </span>
          </div>
          <div className="h-1.5 bg-ink/15 mt-1.5">
            <div className="h-full bg-blood transition-[width] duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {(me.effects.doubleVote || me.effects.immunity) && (
          <div className="flex gap-2 mt-3">
            {me.effects.doubleVote && <Badge tone="gold">Twój głos ×2</Badge>}
            {me.effects.immunity && <Badge tone="gold">Masz immunitet</Badge>}
          </div>
        )}
      </div>

      {!me.alive ? (
        <Panel data-reveal className="text-center font-mono text-sm text-cream/60">
          Wyeliminowani nie głosują.
        </Panel>
      ) : (
        <>
          {myVote && (
            <div data-reveal className="flex items-center justify-between frame bg-ink-soft px-4 py-3">
              <span className="kicker text-cream/50">Twój głos</span>
              <span className="font-display text-xl text-gold">{myVoteNick}</span>
            </div>
          )}
          <Rule>Podejrzani</Rule>
          <PlayerPicker
            players={alive}
            selected={selected ?? (myVote !== 'skip' ? myVote : null)}
            onSelect={setSelected}
            disabledIds={vote.immune}
            tags={Object.fromEntries(vote.immune.map((id) => [id, 'IMMUNITET']))}
            stampText="Winny"
          />
          <div data-reveal className="grid grid-cols-5 gap-2 pt-1">
            <Button variant="ghost" className="col-span-2 !px-2 !text-xs" busy={busy && selected === 'skip'} onClick={() => cast('skip')}>
              Wstrzymuję
            </Button>
            <div className="col-span-3">
              {pending ? (
                <ElectricBorder color="#E8B53A" speed={1.2} chaos={0.4} thickness={1.5} borderRadius={4} glow={0.6} interactive={false}>
                  <Button className="w-full" busy={busy} onClick={() => cast(selected)} icon="ballot">
                    Głosuję
                  </Button>
                </ElectricBorder>
              ) : (
                <Button className="w-full" disabled icon="ballot">
                  Głosuję
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* NIGHT                                                               */
/* ------------------------------------------------------------------ */

function Night({ state, act }) {
  const { me } = state;
  const isMafia = me.role === 'mafia' && me.alive;
  const isGuard = me.isBodyguard && me.alive;
  return (
    <>
      <div data-reveal className="text-center pt-6 pb-2">
        <Icon name="moon" size={54} stroke={1.1} className="mx-auto text-cream/80 drop-shadow-[0_0_24px_rgba(244,234,213,.35)]" />
        <div className="kicker text-cream/45 mt-5">Godzina policyjna</div>
        <h2 className="font-display text-[3rem] leading-none mt-1">Noc</h2>
        <p className="font-mono text-sm text-cream/55 mt-3 max-w-[17rem] mx-auto">
          {isMafia ? 'Rodzina się zbiera. Wybierzcie ofiarę.' : 'Zamknij oczy. Rano poznasz prawdę.'}
        </p>
      </div>
      {isMafia && <MafiaVote state={state} act={act} />}
      {isGuard && <GuardPick state={state} act={act} />}
      {!isMafia && !isGuard && (
        <div data-reveal className="flex flex-col items-center text-cream/35 py-10">
          <Icon name="sleep" size={44} stroke={1.2} className="animate-pulse" />
          <p className="mt-4 font-mono text-xs max-w-[15rem] text-center">Odłóż telefon ekranem w dół. Nikt nie powinien wiedzieć, czy coś klikasz.</p>
        </div>
      )}
    </>
  );
}

function MafiaVote({ state, act }) {
  const { me, players, night } = state;
  const [run, busy] = useAction((targetId) => act('mafia_vote', { targetId }).then(() => vibrate(HAPTIC.ok)));
  const targets = players.filter((p) => p.alive && p.role !== 'mafia');
  const votes = night?.mafiaVotes ?? {};
  const mafia = players.filter((p) => p.role === 'mafia' && p.alive);
  const counts = {};
  Object.values(votes).forEach((t) => (counts[t] = (counts[t] || 0) + 1));
  const tags = {};
  for (const [mid, tid] of Object.entries(votes)) {
    const n = players.find((p) => p.id === mid)?.nick;
    tags[tid] = (tags[tid] ? tags[tid] + ', ' : 'CEL: ') + n;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const tie = top.length > 1 && top[0][1] === top[1][1];

  return (
    <Panel data-reveal tone="night" className="!border-blood/50">
      <div className="flex items-center justify-between mb-1">
        <span className="kicker text-blood-light flex items-center gap-2">
          <Icon name="knife" size={15} /> Obrady rodziny
        </span>
        <span className="font-mono text-xs text-cream/50">
          {Object.keys(votes).length}/{mafia.length}
        </span>
      </div>
      <p className="font-mono text-xs text-cream/55 mb-4">Głosy widzicie na żywo. Decyduje większość, przy remisie – los.</p>
      <PlayerPicker players={targets} selected={votes[me.id]} onSelect={(id) => !busy && run(id)} tags={tags} stampText="Cel" />
      {tie && <p className="mt-3 font-mono text-xs text-gold">Remis – ustalcie wspólny cel, inaczej zdecyduje los.</p>}
      {votes[me.id] && (
        <Button variant="ghost" className="w-full mt-4 !text-xs" onClick={() => run(null)}>
          Wycofaj głos
        </Button>
      )}
    </Panel>
  );
}

function GuardPick({ state, act }) {
  const { players, night } = state;
  const [run] = useAction((targetId) => act('protect', { targetId }).then(() => vibrate(HAPTIC.ok)));
  return (
    <Panel data-reveal tone="night" className="!border-gold/40">
      <div className="kicker text-gold flex items-center gap-2 mb-1">
        <Icon name="hand" size={15} /> Ochroniarz
      </div>
      <p className="font-mono text-xs text-cream/55 mb-4">Kogo chronisz tej nocy? Możesz wybrać siebie. Wybór zmienisz do świtu.</p>
      <PlayerPicker players={players.filter((p) => p.alive)} selected={night?.protectId} onSelect={run} stampText="Chroniony" />
    </Panel>
  );
}
