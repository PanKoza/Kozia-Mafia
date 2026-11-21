import { lazy, Suspense, useRef } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ClickSpark from './components/bits/ClickSpark.jsx';
import Noise from './components/bits/Noise.jsx';
import LightRays from './components/bits/LightRays.jsx';
import SplitText from './components/bits/SplitText.jsx';
import ShinyText from './components/bits/ShinyText.jsx';
import Icon from './components/Icon.jsx';
import { Diamonds, GoatMark } from './components/Logo.jsx';
import { gsap, useGSAP, useSmoothScroll } from './lib/motion.js';
import { session } from './lib/storage.js';
import Join from './pages/Join.jsx';
import Play from './pages/Play.jsx';
const AdminHome = lazy(() => import('./admin/AdminHome.jsx'));
const AdminGame = lazy(() => import('./admin/AdminGame.jsx'));

function Home() {
  const last = session.last();
  const scope = useRef(null);
  useGSAP(
    () => {
      gsap.from('[data-goat]', { y: -60, rotate: -14, autoAlpha: 0, duration: 1.4, ease: 'elastic.out(1, 0.5)' });
      gsap.from('[data-fade]', { autoAlpha: 0, y: 16, stagger: 0.12, delay: 0.9 });
    },
    { scope }
  );
  return (
    <div ref={scope} className="room relative min-h-dvh overflow-hidden flex flex-col items-center justify-center px-6">
      <div className="absolute inset-0 opacity-70">
        <LightRays raysOrigin="top-center" raysColor="#F4EAD5" raysSpeed={0.6} lightSpread={0.45} rayLength={1.6} intensity={0.8} followMouse={false} clickPulse={false} maxDevicePixelRatio={1.25} />
      </div>
      <div className="relative z-10 flex flex-col items-center text-center">
        <div data-goat>
          <GoatMark className="w-44 drop-shadow-[0_30px_40px_rgba(0,0,0,.8)]" animated />
        </div>
        <SplitText text="KOZIA MAFIA" tag="h1" className="font-display text-[3.4rem] leading-none mt-3 text-cream" effect="flip" splitType="chars" delay={45} trigger="load" />
        <div data-fade>
          <Diamonds className="mt-3" />
        </div>
        <p data-fade className="mt-6 font-mono text-sm text-cream/60 max-w-[17rem]">
          Wejście tylko z zaproszeniem. Poproś hosta o link do gry.
        </p>
        {last && (
          <Link data-fade to={`/play/${last}`} className="mt-8 inline-flex items-center gap-3 border border-cream/30 px-6 py-3.5 rounded-[3px] font-cond uppercase tracking-[0.2em] text-sm">
            <ShinyText text={`Wróć do gry ${last}`} color="#C9BEA6" shineColor="#FFFFFF" speed={2.4} />
            <Icon name="arrow" size={18} />
          </Link>
        )}
      </div>
      <Link to="/admin" className="absolute bottom-6 z-10 kicker text-cream/30 safe-bottom">
        Panel hosta
      </Link>
    </div>
  );
}

export default function App() {
  useSmoothScroll();
  const location = useLocation();
  return (
    <ClickSpark sparkColor="#E8B53A" sparkSize={9} sparkRadius={24} sparkCount={7} duration={420} shape="line" glow={0.4}>
      <Suspense fallback={<div className="room min-h-dvh" />}>
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/join/:code" element={<Join />} />
        <Route path="/play/:code" element={<Play />} />
        <Route path="/admin" element={<AdminHome />} />
        <Route path="/admin/game/:code" element={<AdminGame />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      {/* Film grain, dust & scratches over everything */}
      <Noise fixed zIndex={90} opacity={0.11} size={1} fps={18} blendMode="overlay" contrast={0.7} dust={0.35} scratches={0.25} flicker={0.12} />
    </ClickSpark>
  );
}
