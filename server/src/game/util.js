import { randomBytes, randomInt } from 'crypto';

export class GameError extends Error {}

export const fail = (msg) => {
  throw new GameError(msg);
};

export const uid = (n = 8) => randomBytes(n).toString('hex');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const makeCode = (len = 6) =>
  Array.from({ length: len }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');

export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const pickRandom = (arr) => arr[randomInt(arr.length)];

export const alivePlayers = (g) => g.players.filter((p) => p.alive);
export const getPlayer = (g, id) => g.players.find((p) => p.id === id);
export const nick = (g, id) => getPlayer(g, id)?.nick ?? '???';

export const pushFeed = (g, text, kind = 'info') => {
  g.feed.push({ id: uid(4), ts: Date.now(), text, kind });
  if (g.feed.length > 300) g.feed.splice(0, g.feed.length - 300);
};

export const pushInbox = (p, text, kind = 'info') => {
  p.inbox.push({ id: uid(4), ts: Date.now(), text, kind });
  if (p.inbox.length > 100) p.inbox.splice(0, p.inbox.length - 100);
};

/** Queue a notification (socket + web push). `to`: 'all' | 'mafia' | playerId */
export const notify = (g, to, title, body) => {
  if (!g._notify) g._notify = [];
  g._notify.push({ to, title, body });
};

export const requireAlive = (p) => {
  if (!p.alive) fail('Zostałeś wyeliminowany – nie możesz już tego zrobić.');
};

export const requireTarget = (g, targetId, { allowSelf = false, self } = {}) => {
  const t = getPlayer(g, targetId);
  if (!t) fail('Nie ma takiego gracza.');
  if (!t.alive) fail('Ten gracz został już wyeliminowany.');
  if (!allowSelf && self && t.id === self.id) fail('Nie możesz wybrać siebie.');
  return t;
};

/** Returns ids with the highest score in a {id: number} map. */
export const topOf = (scores, lowerIsBetter = false) => {
  const entries = Object.entries(scores);
  if (!entries.length) return [];
  const best = lowerIsBetter
    ? Math.min(...entries.map(([, v]) => v))
    : Math.max(...entries.map(([, v]) => v));
  return entries.filter(([, v]) => v === best).map(([k]) => k);
};
