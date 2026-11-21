import 'dotenv/config';
import { timingSafeEqual } from 'crypto';
import http from 'http';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';

import * as E from './game/engine.js';
import * as M from './game/minigames.js';
import { GameError } from './game/util.js';
import { adminView, gameSummary, playerView } from './game/views.js';
import { initPush, publicKey, pushToPlayer } from './push.js';
import { dbStatus, deleteGame, games, initStore, saveGame } from './store.js';

const {
  PORT = 4000,
  MONGODB_URI,
  ADMIN_PASSWORD = 'admin',
  JWT_SECRET = 'dev-secret-change-me',
  CLIENT_URL = '*',
} = process.env;

if (!process.env.ADMIN_PASSWORD) console.warn('⚠️  Brak ADMIN_PASSWORD – domyślne hasło hosta to "admin".');

const origins = CLIENT_URL.split(',').map((s) => s.trim()).filter(Boolean);
const corsOrigin = origins.includes('*') ? true : origins;

const app = express();
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '50kb' }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: corsOrigin }, pingInterval: 20000, pingTimeout: 25000 });

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const safeEqual = (a, b) => {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
};

const verifyAdmin = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET)?.admin === true;
  } catch {
    return false;
  }
};

const requireAdmin = (req, res, next) => {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!verifyAdmin(token)) return res.status(401).json({ error: 'Brak autoryzacji.' });
  next();
};

const findGame = (code) => games.get(String(code || '').toUpperCase());
const room = (code) => `g:${code}`;

/** Push the fresh, personalised state to every socket of the game + deliver notifications. */
async function broadcast(g) {
  const sockets = await io.in(room(g.code)).fetchSockets();
  const visiblePlayers = new Set();
  for (const s of sockets) {
    if (s.data.admin) {
      s.emit('state', adminView(g));
      continue;
    }
    const p = g.players.find((x) => x.id === s.data.playerId);
    if (!p) {
      s.emit('kicked');
      s.leave(room(g.code));
      continue;
    }
    if (s.data.visible) visiblePlayers.add(p.id);
    s.emit('state', playerView(g, p));
  }

  const queue = g._notify || [];
  g._notify = [];
  let subsChanged = false;
  for (const n of queue) {
    const targets = g.players.filter((p) =>
      n.to === 'all' ? true : n.to === 'mafia' ? p.role === 'mafia' && p.alive : p.id === n.to
    );
    const ids = new Set(targets.map((p) => p.id));
    for (const s of sockets) if (!s.data.admin && ids.has(s.data.playerId)) s.emit('notify', { title: n.title, body: n.body });
    for (const p of targets) {
      if (visiblePlayers.has(p.id)) continue; // app is open – in-app toast is enough
      if (await pushToPlayer(p, { title: n.title, body: n.body, url: `/play/${g.code}`, tag: `km-${g.code}` })) subsChanged = true;
    }
  }
  if (subsChanged) saveGame(g);
}

async function commit(g) {
  saveGame(g);
  await broadcast(g);
}

/* ------------------------------------------------------------------ */
/* REST API                                                            */
/* ------------------------------------------------------------------ */

app.get('/api/health', (_req, res) => res.json({ ok: true, games: games.size, db: dbStatus() }));

app.get('/api/push/key', (_req, res) => res.json({ publicKey }));

app.post('/api/admin/login', (req, res) => {
  if (!safeEqual(req.body?.password ?? '', ADMIN_PASSWORD)) return res.status(401).json({ error: 'Złe hasło.' });
  res.json({ token: jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '30d' }) });
});

app.get('/api/admin/games', requireAdmin, (_req, res) => {
  res.json([...games.values()].map(gameSummary).sort((a, b) => b.createdAt - a.createdAt));
});

app.post('/api/admin/games', requireAdmin, (req, res) => {
  const { name, password, mafiaCount, revealRoles = true } = req.body || {};
  if (!password || String(password).length < 3) return res.status(400).json({ error: 'Hasło do gry musi mieć min. 3 znaki.' });
  const g = E.createGame({ name, mafiaCount, revealRoles }, new Set(games.keys()));
  g.password = String(password).slice(0, 40);
  games.set(g.code, g);
  saveGame(g);
  res.json(gameSummary(g));
});

app.delete('/api/admin/games/:code', requireAdmin, async (req, res) => {
  const g = findGame(req.params.code);
  if (!g) return res.status(404).json({ error: 'Nie ma takiej gry.' });
  io.in(room(g.code)).emit('kicked');
  await deleteGame(g.code);
  res.json({ ok: true });
});

app.get('/api/games/:code', (req, res) => {
  const g = findGame(req.params.code);
  if (!g) return res.status(404).json({ error: 'Nie znaleziono gry. Sprawdź link.' });
  res.json({ code: g.code, name: g.name, status: g.status, players: g.players.length });
});

app.post('/api/games/:code/join', async (req, res) => {
  const g = findGame(req.params.code);
  if (!g) return res.status(404).json({ error: 'Nie znaleziono gry.' });
  if (!safeEqual(String(req.body?.password ?? '').trim(), g.password))
    return res.status(401).json({ error: 'Nieprawidłowe hasło do gry.' });
  try {
    const p = E.addPlayer(g, req.body?.nick);
    await commit(g);
    res.json({ token: p.token, playerId: p.id, code: g.code });
  } catch (e) {
    if (e instanceof GameError) return res.status(400).json({ error: e.message });
    throw e;
  }
});

/* ------------------------------------------------------------------ */
/* Socket.io                                                           */
/* ------------------------------------------------------------------ */

const PLAYER_ACTIONS = {
  city_vote: (g, p, a) => E.castCityVote(g, p, a.targetId),
  mafia_vote: (g, p, a) => E.mafiaVote(g, p, a.targetId ?? null),
  mafia_chat: (g, p, a) => E.mafiaChat(g, p, a.text),
  protect: (g, p, a) => E.bodyguardProtect(g, p, a.targetId),
  sheriff_check: (g, p, a) => E.sheriffCheck(g, p, a.targetId),
  use_card: (g, p, a) => E.useCard(g, p, a.cardId, a.targetId),
  nominate: (g, p, a) => M.nominate(g, p, a.targetId),
  war_play: (g, p, a) => M.warPlay(g, p, a.value),
  market_token: (g, p, a) => M.marketToken(g, p, a),
  market_prices: (g, p, a) => M.marketSetPrices(g, p, a.prices),
  skill_submit: (g, p, a) => M.skillSubmit(g, p, a.score),
  blackjack: (g, p, a) => M.blackjackAction(g, p, a),
  poker: (g, p, a) => M.pokerAction(g, p, a),
};

const ADMIN_ACTIONS = {
  start: (g) => E.startGame(g),
  settings: (g, a) => E.updateSettings(g, a),
  set_password: (g, a) => {
    if (!a.password || String(a.password).length < 3) throw new GameError('Hasło musi mieć min. 3 znaki.');
    g.password = String(a.password).slice(0, 40);
  },
  kick: (g, a) => E.kickPlayer(g, a.playerId),
  city_vote_start: (g) => E.startCityVote(g),
  city_vote_end: (g) => E.endCityVote(g),
  night_start: (g) => E.startNight(g),
  night_end: (g) => E.endNight(g),
  minigame_start: (g, a) => M.startMinigame(g, a),
  minigame_advance: (g) => M.advanceMinigame(g),
  minigame_close: (g) => M.closeMinigame(g),
  poker_next: (g) => M.pokerHost(g, 'next'),
  poker_force: (g) => M.pokerHost(g, 'force'),
  host_nominate: (g, a) => M.hostNominate(g, a.targetId),
  eliminate: (g, a) => E.hostEliminate(g, a.playerId),
  revive: (g, a) => E.hostRevive(g, a.playerId),
  set_role: (g, a) => E.assignSpecialRole(g, a.role, a.playerId ?? null),
  give_card: (g, a) => {
    const p = g.players.find((x) => x.id === a.playerId);
    if (!p) throw new GameError('Nie ma takiego gracza.');
    E.giveCard(g, p, a.card);
  },
  end_game: (g, a) => E.endGame(g, a.winner ?? null),
  announce: (g, a) => E.announce(g, a.text),
};

io.on('connection', (socket) => {
  socket.on('auth', async (msg = {}, ack = () => {}) => {
    const g = findGame(msg.code);
    if (!g) return ack({ error: 'Nie znaleziono gry.', gone: true });
    if (msg.admin) {
      if (!verifyAdmin(msg.jwt)) return ack({ error: 'Brak autoryzacji.' });
      socket.data = { code: g.code, admin: true };
      socket.join(room(g.code));
      ack({ ok: true });
      return socket.emit('state', adminView(g));
    }
    const p = g.players.find((x) => x.token === msg.token);
    if (!p) return ack({ error: 'Sesja wygasła lub zostałeś usunięty z gry.', gone: true });
    socket.data = { code: g.code, playerId: p.id, visible: msg.visible !== false };
    socket.join(room(g.code));
    ack({ ok: true });
    socket.emit('state', playerView(g, p));
  });

  socket.on('visibility', (visible) => {
    if (socket.data?.playerId) socket.data.visible = !!visible;
  });

  socket.on('push:subscribe', async (sub, ack = () => {}) => {
    const g = findGame(socket.data?.code);
    const p = g?.players.find((x) => x.id === socket.data.playerId);
    if (!p || !sub?.endpoint) return ack({ error: 'Brak sesji.' });
    if (!p.pushSubs.some((s) => s.endpoint === sub.endpoint)) {
      p.pushSubs.push({ endpoint: sub.endpoint, keys: sub.keys });
      if (p.pushSubs.length > 5) p.pushSubs.shift();
      saveGame(g);
    }
    ack({ ok: true });
  });

  socket.on('action', async ({ type, ...payload } = {}, ack = () => {}) => {
    const g = findGame(socket.data?.code);
    const p = g?.players.find((x) => x.id === socket.data.playerId);
    if (!p) return ack({ error: 'Brak sesji – odśwież stronę.' });
    const fn = PLAYER_ACTIONS[type];
    if (!fn) return ack({ error: 'Nieznana akcja.' });
    try {
      const result = fn(g, p, payload);
      ack({ ok: true, result });
      await commit(g);
    } catch (e) {
      if (e instanceof GameError) return ack({ error: e.message });
      console.error(e);
      ack({ error: 'Błąd serwera.' });
    }
  });

  socket.on('admin', async ({ type, ...payload } = {}, ack = () => {}) => {
    const g = findGame(socket.data?.code);
    if (!g || !socket.data.admin) return ack({ error: 'Brak autoryzacji.' });
    const fn = ADMIN_ACTIONS[type];
    if (!fn) return ack({ error: 'Nieznana akcja.' });
    try {
      fn(g, payload);
      ack({ ok: true });
      await commit(g);
    } catch (e) {
      if (e instanceof GameError) return ack({ error: e.message });
      console.error(e);
      ack({ error: 'Błąd serwera.' });
    }
  });
});

/* ------------------------------------------------------------------ */

initPush(process.env);
server.listen(PORT, () => console.log(`🐐 Kozia Mafia server na porcie ${PORT}`));
initStore(MONGODB_URI); // never throws – retries in the background
