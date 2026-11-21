import Icon from '../components/Icon.jsx';
import { Badge, Num, Rule } from '../components/ui.jsx';
import { useReveal } from '../lib/motion.js';

export default function PlayersTab({ state }) {
  const { players, game, me } = state;
  const scope = useReveal([]);
  const alive = players.filter((p) => p.alive);
  const dead = players.filter((p) => !p.alive);

  const Row = ({ p, i }) => (
    <div data-reveal className={`relative flex items-center gap-4 px-4 py-3.5 ${p.alive ? 'frame bg-ink-soft' : 'border border-cream/5 bg-ink/50'}`}>
      <span className="font-mono text-[11px] text-cream/30 w-5">{String(i + 1).padStart(2, '0')}</span>
      <div className={`w-10 h-10 flex items-center justify-center font-display text-xl ${p.alive ? 'paper text-ink' : 'bg-ink-line text-cream/30'}`}>
        {p.alive ? p.nick[0].toUpperCase() : <Icon name="skull" size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-semibold truncate ${p.alive ? '' : 'line-through text-cream/40'}`}>
          {p.nick}
          {p.id === me.id && <span className="font-mono text-xs text-cream/40 font-normal"> (Ty)</span>}
        </div>
        <div className="flex gap-1.5 mt-1 flex-wrap">
          {game.sheriffId === p.id && <Badge tone="gold"><Icon name="badge" size={11} /> Szeryf</Badge>}
          {game.bodyguardId === p.id && <Badge tone="gold"><Icon name="hand" size={11} /> Ochroniarz</Badge>}
          {p.role === 'citizen' && <Badge tone="dark">Obywatel</Badge>}
        </div>
      </div>
      {p.role === 'mafia' && <span className="stamp !text-[10px] !border-2 text-blood-light">Mafia</span>}
    </div>
  );

  return (
    <div ref={scope} className="space-y-6">
      <div data-reveal className="flex items-end justify-between">
        <div>
          <div className="kicker text-cream/45">Lista lokatorów</div>
          <h2 className="font-display text-4xl mt-1">Gracze</h2>
        </div>
        <div className="text-right">
          <div className="font-display text-4xl leading-none">
            <Num value={alive.length} />
            <span className="text-cream/30 text-2xl">/{players.length}</span>
          </div>
          <div className="kicker !text-[9px] text-cream/45">w grze</div>
        </div>
      </div>
      <section className="space-y-2">
        <Rule>W domu</Rule>
        {alive.map((p, i) => (
          <Row key={p.id} p={p} i={i} />
        ))}
      </section>
      {dead.length > 0 && (
        <section className="space-y-2">
          <Rule>Cmentarz</Rule>
          {dead.map((p, i) => (
            <Row key={p.id} p={p} i={i} />
          ))}
        </section>
      )}
      {me.role === 'mafia' && <p className="font-mono text-[11px] text-cream/35 text-center">Pieczątkę „Mafia” u żywych widzi tylko rodzina.</p>}
    </div>
  );
}
