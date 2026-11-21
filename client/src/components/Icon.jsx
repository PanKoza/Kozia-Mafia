/* Hand-drawn-ish line icon set (24×24, stroke = currentColor). Replaces emoji across the app. */
const P = {
  house: <><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>,
  fedora: <><path d="M2 16c3 2 17 2 20 0" /><path d="M5 15.5c0-4 1-9 3-9 1.5 0 2.5 1.2 4 1.2S14.5 6.5 16 6.5c2 0 3 5 3 9" /><path d="M5.3 12.5h13.4" /></>,
  knife: <><path d="M4 20 15 9" /><path d="M15 9l4-5c1 3 0 6-2 8l-2-3Z" /><path d="M7 17l-2-2" /></>,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  ballot: <><path d="M4 12h16v8H4z" /><path d="M8 12 10 4h7l-2 8" /><path d="M9 16h6" /></>,
  star: <path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7L12 3Z" />,
  badge: <><path d="m12 2 2.2 3.2 3.8-.6-.6 3.8L20.6 11l-3.2 2.2.6 3.8-3.8-.6L12 19.6l-2.2-3.2-3.8.6.6-3.8L3.4 11l3.2-2.2-.6-3.8 3.8.6L12 2Z" /><circle cx="12" cy="11" r="2.5" /></>,
  shield: <><path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></>,
  vest: <><path d="M8 3 5 6v14h5v-6h4v6h5V6l-3-3" /><path d="M8 3c0 3 1.8 5 4 5s4-2 4-5" /></>,
  lens: <><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></>,
  votes: <><path d="M4 7h16" /><path d="M7 7v10M12 7v10M17 7v10" /><path d="M4 17h16" /></>,
  double: <><path d="M5 6h9v12H5z" /><path d="M10 3h9v12" /></>,
  skull: <><path d="M5 11a7 7 0 1 1 14 0c0 2.5-1.2 4-3 5v3H8v-3c-1.8-1-3-2.5-3-5Z" /><circle cx="9" cy="11" r="1.4" /><circle cx="15" cy="11" r="1.4" /><path d="M11 19v-2M13 19v-2" /></>,
  crown: <><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8Z" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 6.1A10 10 0 0 1 12 6c5 0 9 6 9 6a17 17 0 0 1-2.6 3.2M6.6 7.6C4.1 9.2 3 12 3 12s4 6 9 6c1.4 0 2.7-.4 3.8-1" /></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  bell: <><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2Z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  chat: <><path d="M4 5h16v11H9l-5 4V5Z" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.5-3.5 3.2-5.5 6.5-5.5s6 2 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.2 2.5 3.5 5.2" /></>,
  scroll: <><path d="M6 3h11a2 2 0 0 1 2 2v12" /><path d="M6 3a2 2 0 0 0-2 2v2h4" /><path d="M8 7v12a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-2H10" /><path d="M11 9h5M11 12h5" /></>,
  book: <><path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4V4Z" /><path d="M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6V4Z" /></>,
  id: <><rect x="3" y="5" width="18" height="14" rx="1" /><circle cx="9" cy="11" r="2.2" /><path d="M5.8 16c.5-1.6 1.7-2.4 3.2-2.4s2.7.8 3.2 2.4M15 10h3M15 13h3" /></>,
  dice: <><rect x="4" y="4" width="16" height="16" rx="2" /><circle cx="9" cy="9" r="1" /><circle cx="15" cy="15" r="1" /><circle cx="15" cy="9" r="1" /><circle cx="9" cy="15" r="1" /></>,
  swords: <><path d="M4 4l9 9M20 4l-9 9" /><path d="M4 4h3v3M20 4h-3v3" /><path d="M8 16l-3 3M16 16l3 3M6 14l4 4M18 14l-4 4" /></>,
  basket: <><path d="M3 10h18l-2 10H5L3 10Z" /><path d="M8 10l3-6M16 10l-3-6" /><path d="M9 14v3M12 14v3M15 14v3" /></>,
  spade: <><path d="M12 3s-7 5.5-7 10a3.5 3.5 0 0 0 6 2.5L10 20h4l-1-4.5a3.5 3.5 0 0 0 6-2.5c0-4.5-7-10-7-10Z" /></>,
  chip: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r=".8" /></>,
  brain: <><path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1Z" /><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1" /></>,
  phoneOff: <><rect x="6" y="2.5" width="12" height="19" rx="2" /><path d="M3 3l18 18" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="1" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  hand: <><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v8c0 4-2.5 7-6.5 7-2.5 0-4-1-5.5-3L3 14.5a1.5 1.5 0 0 1 2.5-1.6L8 15" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  check: <path d="m5 12 5 5 9-10" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  send: <path d="M4 12 20 4l-6 16-3-7-7-1Z" />,
  megaphone: <><path d="M3 10v4h4l8 5V5L7 10H3Z" /><path d="M18 9a4 4 0 0 1 0 6" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="1" /><path d="M16 8V4H4v12h4" /></>,
  share: <><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" /></>,
  play: <path d="M7 4v16l13-8L7 4Z" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></>,
  sleep: <><path d="M4 8h5l-5 6h5" /><path d="M13 4h4l-4 5h4" /><path d="M14 15h6l-6 6h6" /></>,
  coin: <><circle cx="12" cy="12" r="8.5" /><path d="M14.5 9.5c-.5-1-1.4-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.2 0-2.1-.6-2.5-1.5M12 6.5v1.5M12 16v1.5" /></>,
  swap: <><path d="M4 8h13l-3-3M20 16H7l3 3" /></>,
  hush: <><circle cx="12" cy="12" r="8.5" /><path d="M8.5 10h.01M15.5 10h.01" /><path d="M9 15.5h6" /></>,
  door: <><path d="M5 21V4h11v17" /><path d="M3 21h16" /><circle cx="13" cy="12.5" r=".8" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H4c0 3 1.5 5 4 5M16 6h4c0 3-1.5 5-4 5" /><path d="M12 13v4M8 21h8M9 17h6v4H9z" /></>,
  fingerprint: <><path d="M6 10a6 6 0 0 1 12 0c0 3-.5 6-2 8.5" /><path d="M9 10a3 3 0 0 1 6 0c0 3.5-.8 6.5-2.5 9" /><path d="M12 10c0 4-1 7.5-3 10M6.5 14.5c0 2-.6 3.6-1.5 5" /></>,
};

export default function Icon({ name, size = 22, stroke = 1.75, className = '', style }) {
  const paths = P[name];
  if (!paths) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      style={style}
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
}
