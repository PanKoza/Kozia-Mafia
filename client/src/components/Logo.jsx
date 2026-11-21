const INK = '#121212';
const CREAM = '#F4EAD5';

/** The goat-in-a-fedora mark from the logo design. */
export function GoatMark({ className = '', animated = false, style }) {
  return (
    <svg viewBox="0 0 400 440" className={className} style={style} role="img" aria-label="Kozia głowa w mafijnym kapeluszu z cygarem">
      <defs>
        <clipPath id="km-crown">
          <path d="M128,148 C126,115 132,82 146,62 C165,52 182,60 200,66 C218,60 235,52 254,62 C268,82 274,115 272,148 Z" />
        </clipPath>
      </defs>
      {/* ears */}
      <path d="M145,170 C120,165 85,172 60,193 C88,204 122,201 148,193 Z" fill={CREAM} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d="M140,177 C118,176 97,183 80,192 C102,197 124,195 142,189 Z" fill="#D9A48C" />
      <path d="M255,170 C280,165 315,172 340,193 C312,204 278,201 252,193 Z" fill={CREAM} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d="M260,177 C282,176 303,183 320,192 C298,197 276,195 258,189 Z" fill="#D9A48C" />
      {/* head */}
      <path d="M140,145 C138,210 160,270 168,320 C172,350 185,362 200,362 C215,362 228,350 232,320 C240,270 262,210 260,145 Z" fill={CREAM} stroke={INK} strokeWidth="7" strokeLinejoin="round" />
      <ellipse cx="200" cy="332" rx="31" ry="25" fill="#E6D4B2" />
      <path d="M200,232 C197,262 196,290 198,306" fill="none" stroke="#D2BC95" strokeWidth="4" strokeLinecap="round" />
      {/* eyes */}
      <g className={animated ? 'km-blink' : ''}>
        <path d="M150,200 L188,208 C186,220 176,225 166,223 C156,221 150,212 150,200 Z" fill="#E8B53A" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <rect x="159" y="211" width="20" height="6" rx="3" fill={INK} />
        <path d="M250,200 L212,208 C214,220 224,225 234,223 C244,221 250,212 250,200 Z" fill="#E8B53A" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <rect x="221" y="211" width="20" height="6" rx="3" fill={INK} />
      </g>
      <path d="M144,193 L193,204" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <path d="M256,193 L207,204" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      {/* nose & mouth */}
      <path d="M185,321 C188,327 193,329 197,326" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <path d="M215,321 C212,327 207,329 203,326" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <path d="M186,344 C194,349 204,349 214,343" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      {/* beard */}
      <path d="M181,356 C184,388 191,414 200,438 C209,414 216,388 219,356 C212,362 188,362 181,356 Z" fill={INK} />
      <path d="M193,372 C195,392 198,408 200,420 M207,372 C205,392 202,408 200,420" fill="none" stroke="#3A3A3A" strokeWidth="2.5" strokeLinecap="round" />
      {/* cigar */}
      <g transform="rotate(10 214 344)">
        <rect x="210" y="338" width="78" height="13" rx="5" fill="#5A3A22" stroke={INK} strokeWidth="3" />
        <rect x="226" y="338" width="10" height="13" fill={CREAM} stroke={INK} strokeWidth="2" />
        <rect x="282" y="339.5" width="7" height="10" rx="3" fill="#F28C28" className={animated ? 'animate-flicker' : ''} />
      </g>
      <g className={animated ? 'km-smoke' : ''}>
        <path d="M290,352 C300,338 284,328 296,314 C306,302 292,292 302,280" fill="none" stroke={CREAM} strokeWidth="3" strokeLinecap="round" opacity="0.75" />
        <path d="M298,350 C310,340 302,330 312,320" fill="none" stroke={CREAM} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      </g>
      {/* hat */}
      <g transform="rotate(-7 200 140)">
        <ellipse cx="200" cy="164" rx="88" ry="10" fill="#000" opacity="0.18" />
        <path d="M128,148 C126,115 132,82 146,62 C165,52 182,60 200,66 C218,60 235,52 254,62 C268,82 274,115 272,148 Z" fill="#121212" />
        <rect x="120" y="112" width="160" height="20" fill={CREAM} clipPath="url(#km-crown)" />
        <rect x="120" y="112" width="160" height="3" fill={INK} clipPath="url(#km-crown)" opacity="0.4" />
        <path d="M170,70 C175,88 178,100 176,110" fill="none" stroke="#2E2E2E" strokeWidth="4" strokeLinecap="round" />
        <path d="M230,70 C225,88 222,100 224,110" fill="none" stroke="#2E2E2E" strokeWidth="4" strokeLinecap="round" />
        <path d="M184,64 C194,73 206,73 216,64" fill="none" stroke="#2E2E2E" strokeWidth="4" strokeLinecap="round" />
        <path d="M40,152 C70,128 330,128 360,152 C340,171 60,171 40,152 Z" fill="#121212" />
        <path d="M58,156 C120,166 280,166 342,156" fill="none" stroke={CREAM} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      </g>
    </svg>
  );
}

export function Diamonds({ className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <div className="h-[2px] w-12 bg-cream" />
      {[CREAM, INK, CREAM].map((c, i) => (
        <svg key={i} width="10" height="10" viewBox="0 0 18 18" aria-hidden="true">
          <path d="M9,1 L17,9 L9,17 L1,9 Z" fill={c} />
        </svg>
      ))}
      <div className="h-[2px] w-12 bg-cream" />
    </div>
  );
}

/** Full logo lockup: mark + wordmark + diamond divider. */
export function Logo({ size = 'md', animated = false }) {
  const s = { sm: ['w-20', 'text-3xl'], md: ['w-40', 'text-5xl'], lg: ['w-56', 'text-6xl'] }[size];
  return (
    <div className="flex flex-col items-center">
      <GoatMark className={`${s[0]} ${animated ? 'animate-swing origin-bottom' : ''}`} animated={animated} />
      <h1 className={`font-display ${s[1]} tracking-wider text-ink leading-none mt-1 whitespace-nowrap`}>KOZIA MAFIA</h1>
      <Diamonds className="mt-2" />
    </div>
  );
}
