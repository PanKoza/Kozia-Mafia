import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Button, useToast } from '../components/ui.jsx';
import { enableNotifications, pushSupported, subscribePush } from '../lib/push.js';

export default function NotifyPrompt({ emitRaw, className = '' }) {
  const toast = useToast();
  const [perm, setPerm] = useState(() => (pushSupported() ? Notification.permission : 'unsupported'));

  useEffect(() => {
    if (perm === 'granted') subscribePush((sub) => emitRaw('push:subscribe', sub));
  }, [perm, emitRaw]);

  if (perm === 'granted' || perm === 'unsupported') return null;
  if (perm === 'denied')
    return <div className={`font-mono text-xs text-cream/45 text-center ${className}`}>Powiadomienia zablokowane – włącz je w ustawieniach przeglądarki.</div>;

  return (
    <div className={`frame bg-ink-soft p-4 flex items-center gap-4 ${className}`}>
      <div className="relative w-11 h-11 rounded-full border border-gold/60 flex items-center justify-center text-gold animate-pulsering">
        <Icon name="bell" size={20} />
      </div>
      <div className="flex-1 text-[13px] leading-snug text-cream/80">Włącz powiadomienia, żeby nie przegapić startu i obrad.</div>
      <Button
        variant="gold"
        className="!px-3 !py-2 !text-xs"
        onClick={async () => {
          const r = await enableNotifications((sub) => emitRaw('push:subscribe', sub));
          setPerm(r);
          if (r === 'granted') toast('Powiadomienia włączone', 'success');
        }}
      >
        Włącz
      </Button>
    </div>
  );
}
