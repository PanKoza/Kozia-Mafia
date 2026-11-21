import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Button, useAction } from '../components/ui.jsx';
import { gsap } from '../lib/motion.js';

export default function MafiaTab({ state, act }) {
  const { me, players, mafiaChat = [] } = state;
  const [text, setText] = useState('');
  const endRef = useRef(null);
  const listRef = useRef(null);
  const count = useRef(mafiaChat.length);
  const [send, busy] = useAction(async () => {
    await act('mafia_chat', { text });
    setText('');
  });
  const family = players.filter((p) => p.role === 'mafia');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    if (mafiaChat.length > count.current) {
      const nodes = listRef.current?.querySelectorAll('[data-msg]');
      const fresh = Array.from(nodes || []).slice(count.current - mafiaChat.length);
      gsap.from(fresh, { y: 16, autoAlpha: 0, scale: 0.96, duration: 0.4, stagger: 0.05, ease: 'back.out(1.6)' });
    }
    count.current = mafiaChat.length;
  }, [mafiaChat.length]);

  return (
    <div className="flex flex-col h-[calc(100dvh-12.5rem)]">
      <div className="bg-night frame !border-blood/40 px-4 py-3 mb-3">
        <div className="flex items-center justify-between">
          <span className="kicker text-blood-light flex items-center gap-2">
            <Icon name="fedora" size={15} /> Rodzina
          </span>
          <span className="font-mono text-[10px] text-cream/35">kanał szyfrowany</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {family.map((p) => (
            <span key={p.id} className={`font-display text-lg ${p.alive ? 'text-cream' : 'text-cream/30 line-through'}`}>
              {p.nick}
            </span>
          ))}
        </div>
      </div>
      <div ref={listRef} data-lenis-prevent className="flex-1 overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
        {mafiaChat.length === 0 && <p className="text-center font-mono text-xs text-cream/35 py-10">Tajny kanał rodziny. Nikt poza mafią tego nie widzi.</p>}
        {mafiaChat.map((m) => {
          const mine = m.playerId === me.id;
          return (
            <div key={m.id} data-msg className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[82%] px-3.5 py-2 ${mine ? 'bg-blood text-cream' : 'paper text-ink'}`}>
                {!mine && <div className="kicker !text-[9px] text-blood mb-0.5">{m.nick}</div>}
                <div className="font-mono text-[14px] leading-snug break-words">{m.text}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {me.alive ? (
        <form
          className="flex gap-2 mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) send();
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={300}
            placeholder="Szepnij coś rodzinie…"
            className="flex-1 bg-ink-soft border border-cream/15 px-4 py-3 font-mono text-[14px] outline-none focus:border-blood-light rounded-[3px]"
          />
          <Button type="submit" busy={busy} disabled={!text.trim()} className="!px-4">
            <Icon name="send" size={18} />
          </Button>
        </form>
      ) : (
        <p className="text-center font-mono text-xs text-cream/40 mt-3">Wyeliminowani nie piszą na czacie.</p>
      )}
    </div>
  );
}
