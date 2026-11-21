import Icon from '../components/Icon.jsx';
import { useReveal } from '../lib/motion.js';
import { CARD_INFO, SPECIAL } from '../lib/labels.js';

/** Onboarding / rules slides. */
export const RULE_SLIDES = [
  {
    icon: 'house',
    title: 'Witaj w domu',
    body: (
      <>
        <p>W tym domu ukrywa się <b>Kozia Mafia</b>. Każdy dostał tajną rolę: <b>Obywatel</b> albo <b>Mafioza</b>.</p>
        <p className="mt-3">Nikt poza Tobą nie zna Twojej roli. Mafiozi znają siebie nawzajem.</p>
      </>
    ),
  },
  {
    icon: 'target',
    title: 'Cel gry',
    body: (
      <>
        <p><b>Obywatele</b> – odkryjcie mafię i wygłosujcie ją z domu.</p>
        <p className="mt-3"><b>Mafia</b> – eliminujcie po cichu. Wygrywacie, gdy Was jest tylu co obywateli.</p>
      </>
    ),
  },
  {
    icon: 'ballot',
    title: 'Obrady miasta',
    body: (
      <>
        <p>Każdego dnia host zwołuje <b>obrady</b>. Żywi gracze głosują w aplikacji, kogo wyrzucić.</p>
        <p className="mt-3">Najwięcej głosów – odpada. Remis lub przewaga „wstrzymuję się” – nikt.</p>
      </>
    ),
  },
  {
    icon: 'moon',
    title: 'Obrady mafii',
    body: (
      <>
        <p>Nocą <b>mafia</b> wybiera ofiarę. Mafiozi widzą swoje głosy na żywo i mają tajny czat.</p>
        <p className="mt-3">Rano dowiecie się, czy ktoś zginął.</p>
      </>
    ),
  },
  {
    icon: 'dice',
    title: 'Mini-gry',
    body: (
      <>
        <p><b>Wojna</b> i <b>Targ</b> wymagają sojuszy – zwycięzca nominuje kogoś na <b>rolę specjalną</b>.</p>
        <p className="mt-3">Gry o <b>karty</b> dają ułatwienia. Każda karta istnieje tylko raz w grze!</p>
      </>
    ),
  },
  {
    icon: 'badge',
    title: 'Role specjalne',
    body: (
      <>
        {Object.values(SPECIAL).map((r) => (
          <p key={r.name} className="mb-3 flex gap-2">
            <Icon name={r.icon} size={18} className="mt-0.5" />
            <span>
              <b>{r.name}</b> – {r.desc}
            </span>
          </p>
        ))}
        <p className="text-sm opacity-70">Rolę specjalną może dostać także mafioza!</p>
      </>
    ),
  },
  {
    icon: 'double',
    title: 'Karty ułatwień',
    body: (
      <ul className="space-y-2 text-left">
        {Object.values(CARD_INFO).map((c) => (
          <li key={c.name} className="flex gap-2">
            <Icon name={c.icon} size={18} className="mt-0.5" />
            <span>
              <b>{c.name}</b> – {c.desc}
            </span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    icon: 'id',
    title: 'Twoja aplikacja',
    body: (
      <ul className="space-y-2 text-left">
        {[
          ['dice', 'Gra', 'bieżąca faza: głosowania, mini-gry'],
          ['id', 'Akta', 'rola (przytrzymaj), karty i moce'],
          ['users', 'Gracze', 'kto żyje, kto ma rolę specjalną'],
          ['scroll', 'Kronika', 'wydarzenia i Twoje tajne notatki'],
          ['chat', 'Mafia', 'tylko dla mafii: tajny czat'],
        ].map(([i, n, d]) => (
          <li key={n} className="flex gap-2">
            <Icon name={i} size={18} className="mt-0.5" />
            <span>
              <b>{n}</b> – {d}
            </span>
          </li>
        ))}
      </ul>
    ),
  },
];

export function RulesList() {
  const scope = useReveal([]);
  return (
    <div ref={scope} className="space-y-3">
      <div data-reveal className="mb-5">
        <div className="kicker text-cream/50">Regulamin domu</div>
        <h2 className="font-display text-4xl mt-1">Zasady gry</h2>
      </div>
      {RULE_SLIDES.map((s, i) => (
        <details key={s.title} data-reveal className="group frame bg-ink-soft open:bg-ink-raised transition-colors">
          <summary className="flex items-center gap-4 cursor-pointer list-none px-4 py-4">
            <span className="font-mono text-xs text-cream/35 w-5">{String(i + 1).padStart(2, '0')}</span>
            <Icon name={s.icon} size={22} className="text-gold" />
            <span className="font-display text-xl flex-1">{s.title}</span>
            <Icon name="plus" size={18} className="text-cream/40 transition-transform duration-300 group-open:rotate-45" />
          </summary>
          <div className="px-4 pb-5 pl-[4.25rem] text-cream/80 leading-relaxed text-[15px]">{s.body}</div>
        </details>
      ))}
    </div>
  );
}
