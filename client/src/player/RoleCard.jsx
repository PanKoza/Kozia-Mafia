import { useRef, useState } from 'react';
import TiltedCard from '../components/bits/TiltedCard.jsx';
import DecryptedText from '../components/bits/DecryptedText.jsx';
import Icon from '../components/Icon.jsx';
import { GoatMark } from '../components/Logo.jsx';
import { HAPTIC, vibrate } from '../lib/haptics.js';

/** Face-down card that tilts with the phone; press & hold flips it to the secret role. */
export default function RoleCard({ state, onReveal, width = 248, height = 368 }) {
  const [shown, setShown] = useState(false);
  const [reveals, setReveals] = useState(0);
  const timer = useRef(null);
  const { me, players } = state;
  const isMafia = me.role === 'mafia';
  const teammates = players.filter((p) => p.role === 'mafia' && p.id !== me.id);

  const start = (e) => {
    if (e.button && e.button !== 0) return;
    timer.current = setTimeout(() => {
      setShown(true);
      setReveals((n) => n + 1);
      vibrate(isMafia ? HAPTIC.dramatic : HAPTIC.ok);
      onReveal?.();
    }, 180);
  };
  const end = () => {
    clearTimeout(timer.current);
    setShown(false);
  };

  const back = (
    <div className="poster absolute inset-0 flex flex-col items-center justify-center">
      <div className="absolute inset-0 halftone opacity-25" />
      <GoatMark className="relative z-10 w-32" />
      <div className="relative z-10 font-display text-2xl text-ink mt-1">KOZIA MAFIA</div>
      <div className="relative z-10 mt-8 flex flex-col items-center gap-2 text-cream">
        <Icon name="fingerprint" size={34} stroke={1.3} />
        <span className="kicker !text-[10px] text-cream/90">Przytrzymaj kciuk</span>
      </div>
    </div>
  );

  const front = (
    <div className={`absolute inset-0 flex flex-col items-center justify-between py-6 px-5 text-center ${isMafia ? 'bg-ink text-cream' : 'paper text-ink'}`}>
      <div className="w-full flex items-center justify-between kicker !text-[9px] opacity-60">
        <span>Akta osobowe</span>
        <span className="font-mono normal-case tracking-normal">{me.nick}</span>
      </div>
      <div className="flex flex-col items-center">
        <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center ${isMafia ? 'border-blood-light text-blood-light' : 'border-ink text-ink'}`}>
          <Icon name={isMafia ? 'fedora' : 'house'} size={42} stroke={1.3} />
        </div>
        <div className="kicker mt-5 opacity-60">Twoja rola</div>
        <div className={`font-display text-[2.3rem] leading-none mt-1 ${isMafia ? 'text-blood-light' : 'text-blood'}`}>
          {shown ? (
            <DecryptedText
              key={reveals}
              text={isMafia ? 'MAFIOZA' : 'OBYWATEL'}
              animateOn="view"
              sequential
              revealDirection="center"
              speed={35}
              characters="ABCDEFGHIJKLMNOPRSTUWYZ#%&"
            />
          ) : (
            '········'
          )}
        </div>
        <p className="font-mono text-[12px] mt-3 opacity-75 leading-snug">
          {isMafia ? 'Eliminuj obywateli. Nie daj się wygłosować.' : 'Znajdź mafię i wygłosuj ją z domu.'}
        </p>
      </div>
      <div className="w-full">
        {isMafia && teammates.length > 0 && (
          <div className="border-t border-cream/15 pt-3">
            <div className="kicker !text-[9px] opacity-50">Rodzina</div>
            <div className="font-semibold text-gold text-sm mt-1">{teammates.map((t) => t.nick).join(' · ')}</div>
          </div>
        )}
        {(me.isSheriff || me.isBodyguard) && (
          <div className="mt-2 inline-flex items-center gap-1.5 bg-gold text-ink px-2.5 py-1 font-cond uppercase tracking-widest text-xs">
            <Icon name={me.isSheriff ? 'badge' : 'hand'} size={14} />
            {me.isSheriff ? 'Szeryf' : 'Ochroniarz'}
            {me.isSheriff && me.isBodyguard && ' + Ochroniarz'}
          </div>
        )}
        {!me.alive && <div className="stamp text-blood-light mt-2">Wyeliminowany</div>}
      </div>
    </div>
  );

  return (
    <div
      className="select-none touch-none"
      onPointerDown={start}
      onPointerUp={end}
      onPointerLeave={end}
      onPointerCancel={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      <TiltedCard
        containerWidth={width}
        containerHeight={height}
        imageWidth={width}
        imageHeight={height}
        radius={6}
        rotateAmplitude={14}
        scaleOnHover={1.03}
        showTooltip={false}
        flipOnClick={false}
        flipped={shown}
        backContent={front}
        glare={0.45}
        glareColor="#FFF6DE"
        shadow={0.7}
        gyroscope
        intro
      >
        {back}
      </TiltedCard>
    </div>
  );
}
