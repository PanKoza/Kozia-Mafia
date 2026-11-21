import { useState } from 'react';
import DecryptedText from '../components/bits/DecryptedText.jsx';
import Icon from '../components/Icon.jsx';
import { Button, Modal, Panel, PlayerPicker, Rule, Title, useAction } from '../components/ui.jsx';
import { HAPTIC, vibrate } from '../lib/haptics.js';
import { CARD_INFO, SPECIAL } from '../lib/labels.js';
import { useReveal } from '../lib/motion.js';
import RoleCard from './RoleCard.jsx';

export default function PowersTab({ state, act }) {
  const { me, game } = state;
  const scope = useReveal([]);
  const [picker, setPicker] = useState(null);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [confirmCard, setConfirmCard] = useState(null);

  const [run, busy] = useAction(async (type, payload) => {
    const res = await act(type, payload);
    vibrate(HAPTIC.ok);
    return res;
  });

  const doInvestigate = async () => {
    const res =
      picker.kind === 'sheriff'
        ? await run('sheriff_check', { targetId: selected })
        : await run('use_card', { cardId: picker.card.id, targetId: selected });
    setPicker(null);
    setSelected(null);
    if (res) {
      vibrate(res.isMafia ? HAPTIC.dramatic : HAPTIC.ok);
      setResult(res);
    }
  };

  const others = state.players.filter((p) => p.alive && p.id !== me.id);

  return (
    <div ref={scope} className="space-y-6">
      <div data-reveal>
        <div className="kicker text-cream/45">Teczka osobowa</div>
        <h2 className="font-display text-4xl mt-1">Twoje akta</h2>
      </div>

      <div data-reveal className="flex flex-col items-center">
        <RoleCard state={state} width={228} height={338} />
        <p className="font-mono text-[11px] text-cream/40 mt-4 flex items-center gap-1.5">
          <Icon name="fingerprint" size={13} /> Przytrzymaj kartę, by zobaczyć rolę. Puść – zniknie.
        </p>
      </div>

      {(me.isSheriff || me.isBodyguard) && (
        <section className="space-y-3">
          <Rule>Rola specjalna</Rule>
          {me.isSheriff && (
            <Panel data-reveal className="!border-gold/40">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full border border-gold text-gold flex items-center justify-center">
                  <Icon name="badge" size={24} />
                </div>
                <div className="flex-1">
                  <div className="font-display text-2xl leading-none">Szeryf</div>
                  <p className="font-mono text-xs text-cream/60 mt-1.5">{SPECIAL.sheriff.desc}</p>
                </div>
              </div>
              <Button variant="gold" className="w-full mt-4" disabled={me.sheriffUsedToday || !me.alive} onClick={() => setPicker({ kind: 'sheriff' })} icon="lens">
                {me.sheriffUsedToday ? 'Wróć jutro' : 'Przeprowadź śledztwo'}
              </Button>
            </Panel>
          )}
          {me.isBodyguard && (
            <Panel data-reveal className="!border-gold/40">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full border border-gold text-gold flex items-center justify-center">
                  <Icon name="hand" size={24} />
                </div>
                <div className="flex-1">
                  <div className="font-display text-2xl leading-none">Ochroniarz</div>
                  <p className="font-mono text-xs text-cream/60 mt-1.5">{SPECIAL.bodyguard.desc}</p>
                  <p className="font-mono text-xs text-gold mt-2">{game.phase === 'night' ? 'Jest noc – wybierz osobę w zakładce Gra.' : 'Ochronę wybierasz w nocy.'}</p>
                </div>
              </div>
            </Panel>
          )}
        </section>
      )}

      <section className="space-y-3">
        <Rule>Karty w rękawie</Rule>
        {me.cards.length === 0 ? (
          <div data-reveal className="border border-dashed border-cream/15 py-8 text-center font-mono text-xs text-cream/40">
            Brak kart. Wygrywaj gry o karty, by je zdobyć.
          </div>
        ) : (
          me.cards.map((c) => {
            const info = CARD_INFO[c.type];
            return (
              <div key={c.id} data-reveal className={`relative ticket ${c.used ? 'bg-ink-soft text-cream/40' : 'paper text-ink'}`}>
                <div className="flex items-stretch">
                  <div className={`w-20 flex items-center justify-center border-r-2 border-dashed ${c.used ? 'border-cream/10' : 'border-ink/25 text-blood'}`}>
                    <Icon name={info.icon} size={32} stroke={1.4} />
                  </div>
                  <div className="flex-1 px-4 py-4">
                    <div className="kicker !text-[9px] opacity-60">Karta jednorazowa</div>
                    <div className="font-display text-xl leading-tight mt-0.5">{info.full}</div>
                    <p className="font-mono text-[12px] opacity-75 mt-1.5 leading-snug">{info.desc}</p>
                    {!c.used && me.alive && (
                      <Button className="mt-3 !py-2.5 !text-xs" onClick={() => (c.type === 'check' ? setPicker({ kind: 'card', card: c }) : setConfirmCard(c))}>
                        Użyj karty
                      </Button>
                    )}
                  </div>
                </div>
                {c.used && <span className="absolute right-4 top-4 stamp !text-xs text-blood-light/80">Użyta · dzień {c.usedDay}</span>}
              </div>
            );
          })
        )}
      </section>

      {Object.values(me.effects).some(Boolean) && (
        <Panel data-reveal className="!border-gold/40">
          <Rule className="mb-3">
            <span className="text-gold">Aktywne efekty</span>
          </Rule>
          <ul className="space-y-2 text-sm">
            {me.effects.doubleVote && <li className="flex gap-2.5"><Icon name="double" size={17} className="text-gold" /> Podwójny głos w najbliższych obradach</li>}
            {me.effects.immunity && <li className="flex gap-2.5"><Icon name="shield" size={17} className="text-gold" /> Immunitet w najbliższych obradach</li>}
            {me.effects.mafiaShield && <li className="flex gap-2.5"><Icon name="vest" size={17} className="text-gold" /> Ochrona przed mafią najbliższej nocy</li>}
          </ul>
        </Panel>
      )}

      <Modal open={!!picker} onClose={() => setPicker(null)} tone="dark">
        <div className="kicker text-gold">{picker?.kind === 'sheriff' ? 'Śledztwo szeryfa' : 'Karta sprawdzenia'}</div>
        <Title className="mt-1">Kogo prześwietlasz?</Title>
        <p className="font-mono text-xs text-cream/55 mt-2 mb-5">Wynik zobaczysz tylko Ty.</p>
        <PlayerPicker players={others} selected={selected} onSelect={setSelected} stampText="Sprawdź" />
        <Button className="w-full mt-5" disabled={!selected} busy={busy} onClick={doInvestigate} icon="lens">
          Sprawdź akta
        </Button>
      </Modal>

      <Modal open={!!confirmCard} onClose={() => setConfirmCard(null)}>
        {confirmCard && (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full border-2 border-ink flex items-center justify-center text-blood">
              <Icon name={CARD_INFO[confirmCard.type].icon} size={30} />
            </div>
            <Title className="mt-4">{CARD_INFO[confirmCard.type].full}</Title>
            <p className="font-mono text-sm text-ink/70 mt-3">{CARD_INFO[confirmCard.type].desc}</p>
            <p className="kicker text-blood mt-4">Karta działa tylko raz</p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <Button variant="cream" onClick={() => setConfirmCard(null)}>
                Anuluj
              </Button>
              <Button
                busy={busy}
                onClick={async () => {
                  await run('use_card', { cardId: confirmCard.id });
                  setConfirmCard(null);
                }}
              >
                Używam
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!result} onClose={() => setResult(null)} tone={result?.isMafia ? 'red' : 'cream'}>
        {result && (
          <div className="text-center py-3">
            <div className="kicker opacity-70">Raport z akt</div>
            <div className="font-display text-3xl mt-3">{result.targetNick}</div>
            <div className="font-mono text-sm mt-1 opacity-70">jest</div>
            <div className="font-display text-[3.2rem] leading-none mt-2">
              <DecryptedText text={result.isMafia ? 'MAFIOZĄ' : 'OBYWATELEM'} animateOn="view" sequential revealDirection="start" speed={45} characters="ABCDEFGHIJKLMNOPRSTUWYZ#%" />
            </div>
            <div className={`stamp mt-5 text-lg ${result.isMafia ? 'text-cream' : 'text-blood'}`}>{result.isMafia ? 'Winny' : 'Czysty'}</div>
            <p className="font-mono text-[11px] mt-5 opacity-70">Zapisano w Twoich tajnych notatkach (Kronika).</p>
            <Button variant={result.isMafia ? 'cream' : 'primary'} className="w-full mt-5" onClick={() => setResult(null)}>
              Zamknij teczkę
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
