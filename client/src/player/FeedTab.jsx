import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Empty } from '../components/ui.jsx';
import { useReveal } from '../lib/motion.js';

const KIND = {
  death: { icon: 'skull', cls: 'text-blood-light' },
  phase: { icon: 'clock', cls: 'text-cream/70' },
  end: { icon: 'trophy', cls: 'text-gold' },
  role: { icon: 'badge', cls: 'text-gold' },
  host: { icon: 'megaphone', cls: 'text-gold' },
  minigame: { icon: 'dice', cls: 'text-cream/60' },
  danger: { icon: 'fedora', cls: 'text-blood-light' },
  success: { icon: 'check', cls: 'text-gold' },
  join: { icon: 'door', cls: 'text-cream/40' },
  leave: { icon: 'door', cls: 'text-cream/40' },
};

const time = (ts) => new Date(ts).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
const clean = (t) => t.replace(/^[\p{Extended_Pictographic}️\s]+/u, '');

export default function FeedTab({ state }) {
  const [view, setView] = useState('feed');
  const scope = useReveal([view]);
  const items = view === 'feed' ? [...state.game.feed].reverse() : [...state.me.inbox].reverse();
  return (
    <div ref={scope}>
      <div data-reveal className="mb-5">
        <div className="kicker text-cream/45">{view === 'feed' ? 'Dziennik zdarzeń' : 'Tylko do Twojej wiadomości'}</div>
        <h2 className="font-display text-4xl mt-1">{view === 'feed' ? 'Kronika' : 'Notatki'}</h2>
      </div>
      <div data-reveal className="grid grid-cols-2 mb-5 border border-cream/15">
        {[
          ['feed', 'Kronika domu', 'scroll'],
          ['inbox', 'Moje notatki', 'eyeOff'],
        ].map(([k, l, i]) => (
          <button key={k} onClick={() => setView(k)} className={`flex items-center justify-center gap-2 py-2.5 font-cond uppercase tracking-[0.16em] text-xs transition-colors ${view === k ? 'paper text-ink' : 'text-cream/50'}`}>
            <Icon name={i} size={15} /> {l}
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <Empty icon="scroll">Na razie cisza…</Empty>
      ) : view === 'inbox' ? (
        <div className="paper paper-ruled px-5 py-5 space-y-4 text-ink">
          {items.map((f) => (
            <div key={f.id} data-reveal className="border-b border-ink/15 pb-3 last:border-0">
              <div className="font-mono text-[10px] text-ink/45">{time(f.ts)}</div>
              <div className={`font-mono text-[14px] leading-snug mt-0.5 ${f.kind === 'danger' ? 'text-blood font-bold' : ''}`}>{clean(f.text)}</div>
            </div>
          ))}
        </div>
      ) : (
        <ol className="relative border-l border-cream/15 ml-3 space-y-1">
          {items.map((f) => {
            const k = KIND[f.kind] || { icon: 'scroll', cls: 'text-cream/50' };
            return (
              <li key={f.id} data-reveal className="relative pl-6 py-2.5">
                <span className={`absolute -left-[11px] top-3 w-[22px] h-[22px] rounded-full bg-ink border border-cream/20 flex items-center justify-center ${k.cls}`}>
                  <Icon name={k.icon} size={12} />
                </span>
                <div className="font-mono text-[10px] text-cream/35">{time(f.ts)}</div>
                <div className={`text-[14px] leading-snug mt-0.5 ${f.kind === 'death' || f.kind === 'end' ? 'font-semibold' : 'text-cream/85'}`}>{clean(f.text)}</div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
