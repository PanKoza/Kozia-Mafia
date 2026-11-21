import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { Button, GameHeader, Panel, PlayerPicker, useAction } from '../../components/ui.jsx';
import { HAPTIC, vibrate } from '../../lib/haptics.js';
import { SPECIAL } from '../../lib/labels.js';
import MarketGame from './MarketGame.jsx';
import SkillGame from './SkillGame.jsx';
import WarGame from './WarGame.jsx';

export default function MinigameView({ state, act }) {
  const mg = state.minigame;
  if (mg.stage === 'nomination' || (mg.stage === 'finished' && mg.type !== 'skill')) return <Nomination state={state} act={act} />;
  if (!mg.participating && mg.stage !== 'finished')
    return (
      <Panel data-reveal className="text-center py-8">
        <Icon name="eye" size={36} stroke={1.3} className="mx-auto text-cream/50" />
        <p className="mt-3 font-mono text-sm text-cream/65">Trwa mini-gra. Nie bierzesz w niej udziału – możesz kibicować.</p>
      </Panel>
    );
  if (mg.type === 'war') return <WarGame state={state} act={act} />;
  if (mg.type === 'market') return <MarketGame state={state} act={act} />;
  if (mg.type === 'skill') return <SkillGame state={state} act={act} />;
  return null;
}

function Nomination({ state, act }) {
  const { me, players, minigame: mg } = state;
  const [selected, setSelected] = useState(null);
  const [run, busy] = useAction((targetId) => act('nominate', { targetId }).then(() => vibrate(HAPTIC.dramatic)));
  const role = SPECIAL[mg.rewardRole];
  const winner = players.find((p) => p.id === mg.winnerId);
  const nominee = players.find((p) => p.id === mg.nomineeId);
  const iWon = mg.winnerId === me.id;

  if (mg.stage === 'finished')
    return (
      <GameHeader icon={role.icon} kicker="Mini-gra zakończona" title={nominee ? nominee.nick : 'Brak zwycięzcy'}>
        {nominee && (
          <p className="font-mono text-sm text-ink/75">
            zostaje: <b>{role.name}</b> · nominacja: {winner?.nick}
          </p>
        )}
        <p className="font-mono text-[11px] text-ink/45 mt-3">Czekamy, aż host zamknie mini-grę.</p>
      </GameHeader>
    );

  return (
    <>
      <GameHeader tone={iWon ? 'red' : 'paper'} icon="trophy" kicker="Zwycięzca" title={iWon ? 'Wygrałeś!' : winner?.nick}>
        {mg.tiebreak && <p className="font-mono text-xs opacity-70">Remis rozstrzygnięty losowaniem.</p>}
        <p className="font-mono text-sm mt-1">{iWon ? `Nominuj gracza (lub siebie) na rolę: ${role.name}.` : `${winner?.nick} wybiera, kto zostanie: ${role.name}.`}</p>
      </GameHeader>
      {iWon && (
        <>
          <Panel data-reveal className="flex gap-4 items-start">
            <Icon name={role.icon} size={26} className="text-gold mt-0.5" />
            <p className="text-sm text-cream/80">
              <b>{role.name}</b> – {role.desc}
            </p>
          </Panel>
          <PlayerPicker players={players.filter((p) => p.alive)} selected={selected} onSelect={setSelected} stampText="Nominuję" />
          <Button variant="gold" className="w-full" disabled={!selected} busy={busy} onClick={() => run(selected)} icon="badge">
            Nominuję
          </Button>
        </>
      )}
    </>
  );
}
