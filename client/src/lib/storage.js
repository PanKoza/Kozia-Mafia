// Every access wrapped – storage can be blocked (private mode etc.).
const read = (k, fallback = null) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const write = (k, v) => {
  try {
    if (v === null || v === undefined) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* ignore */
  }
};

/** Player session: { code, token, playerId, nick } – keyed by game code, plus "last game" pointer. */
export const session = {
  get: (code) => read(`km:session:${code}`),
  set: (code, s) => {
    write(`km:session:${code}`, s);
    write('km:last', code);
  },
  clear: (code) => {
    write(`km:session:${code}`, null);
    write(`km:state:${code}`, null);
    if (read('km:last') === code) write('km:last', null);
  },
  last: () => read('km:last'),
};

/** Last known game state – instant render on reload / bad connection. */
export const stateCache = {
  get: (code) => read(`km:state:${code}`),
  set: (code, s) => write(`km:state:${code}`, s),
};

export const flags = {
  get: (k) => read(`km:flag:${k}`, false),
  set: (k, v = true) => write(`km:flag:${k}`, v),
};

export const adminAuth = {
  get: () => read('km:admin'),
  set: (t) => write('km:admin', t),
};
