import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, useGSAP);
gsap.defaults({ ease: 'power3.out', duration: 0.6 });

export { gsap, useGSAP, ScrollTrigger };

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ */
/* Lenis smooth scroll, driven by the GSAP ticker                      */
/* ------------------------------------------------------------------ */

let lenis = null;

export function useSmoothScroll() {
  useEffect(() => {
    if (reducedMotion()) return;
    lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true, syncTouch: false });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time) => lenis?.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis?.destroy();
      lenis = null;
    };
  }, []);
}

export const scrollToTop = (immediate = false) => {
  if (lenis) lenis.scrollTo(0, { immediate, duration: 0.8 });
  else window.scrollTo({ top: 0, behavior: immediate ? 'auto' : 'smooth' });
};

/** Lock / unlock page scrolling (modals). */
export const lockScroll = (locked) => {
  if (!lenis) return;
  if (locked) lenis.stop();
  else lenis.start();
};

/* ------------------------------------------------------------------ */
/* Reveal helpers                                                      */
/* ------------------------------------------------------------------ */

/**
 * Staggered entrance for every `[data-reveal]` element inside the container.
 * Re-runs when `deps` change (e.g. a new phase / tab).
 */
export function useReveal(deps = []) {
  const scope = useRef(null);
  useGSAP(
    () => {
      if (reducedMotion()) return;
      const items = gsap.utils.toArray('[data-reveal]', scope.current);
      if (!items.length) return;
      gsap.fromTo(
        items,
        { autoAlpha: 0, y: 26, rotateX: -12, transformPerspective: 700 },
        { autoAlpha: 1, y: 0, rotateX: 0, duration: 0.7, stagger: 0.07, ease: 'expo.out', clearProps: 'transform,opacity,visibility' }
      );
    },
    { scope, dependencies: deps }
  );
  return scope;
}

/** Animate a number in an element from its previous value to `value`. */
export function useTweenNumber(value, { duration = 0.9, format = (n) => Math.round(n).toLocaleString('pl-PL') } = {}) {
  const ref = useRef(null);
  const prev = useRef(value);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obj = { n: prev.current };
    prev.current = value;
    if (reducedMotion()) {
      el.textContent = format(value);
      return;
    }
    const t = gsap.to(obj, { n: value, duration, ease: 'power2.out', onUpdate: () => (el.textContent = format(obj.n)) });
    if (obj.n !== value)
      gsap.fromTo(el, { scale: 1.12, color: value > obj.n ? '#E8B53A' : '#E0333C' }, { scale: 1, color: 'inherit', duration: 0.8, clearProps: 'color,transform' });
    return () => t.kill();
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}
