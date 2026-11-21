import { CARDS, ROLES, SPECIAL_ROLES } from './constants.js';
import {
  alivePlayers,
  fail,
  getPlayer,
  makeCode,
  nick,
  notify,
  pickRandom,
  pushFeed,
  pushInbox,
  requireAlive,
  requireTarget,
  shuffle,
  topOf,
  uid,
} from './util.js';

/* ------------------------------------------------------------------ */
/* Creation & lobby                                                    */
/* ------------------------------------------------------------------ */

export function createGame({ name, mafiaCount = 2, revealRoles = true }, existingCodes) {
  let code;
  do code = makeCode();
  while (existingCodes.has(code));
  return {
    code,
    name: (name || 'Kozia Mafia').slice(0, 60),
    createdAt: Date.now(),
    settings: { mafiaCount: Math.max(1, Number(mafiaCount) || 1), revealRoles: !!revealRoles },
    status: 'lobby', // lobby | running | ended
    phase: 'lobby', // lobby | day | city_vote | night | ended
    day: 0,
    winner: null,
    players: [],
    bodyguardId: null,
    sheriffId: null,
    awardedCards: [],
    vote: null,
    lastVote: null,
    night: null,
    lastNight: null,
    minigame: null,
    minigameHistory: [],
    feed: [],
    mafiaChat: [],
  };
}

export function addPlayer(g, nickRaw) {
  if (g.status !== 'lobby') fail('Gra już trwa – nie można dołączyć.');
  const nickName = String(nickRaw || '').trim().slice(0, 20);
  if (nickName.length < 2) fail('Nick musi mieć co najmniej 2 znaki.');
  if (g.players.some((p) => p.nick.toLowerCase() === nickName.toLowerCase()))
    fail('Ten nick jest już zajęty.');
  if (g.players.length >= 30) fail('Gra jest pełna.');
  const player = {
    id: uid(6),
    token: uid(24),
    nick: nickName,
    role: null,
    alive: true,
    revealedRole: null,
    cards: [],
    effects: { doubleVote: false, immunity: false, mafiaShield: false },
    sheriffLastDay: null,
    inbox: [],
    pushSubs: [],
    joinedAt: Date.now(),
  };
  g.players.push(player);
  pushFeed(g, `${nickName} dołącza do gry.`, 'join');
  return player;
}

export function kickPlayer(g, playerId) {
  const p = getPlayer(g, playerId);
  if (!p) fail('Nie ma takiego gracza.');
  if (g.status !== 'lobby') fail('Usuwać graczy można tylko w poczekalni. W trakcie gry użyj eliminacji.');
  g.players = g.players.filter((x) => x.id !== playerId);
  pushFeed(g, `${p.nick} opuszcza grę.`, 'leave');
}

export function updateSettings(g, { mafiaCount, revealRoles, name }) {
  if (mafiaCount !== undefined) {
    if (g.status !== 'lobby') fail('Liczbę mafiozów można zmienić tylko przed startem.');
    g.settings.mafiaCount = Math.max(1, Math.min(10, Number(mafiaCount) || 1));
  }
  if (revealRoles !== undefined) g.settings.revealRoles = !!revealRoles;
  if (name) g.name = String(name).slice(0, 60);
}

export function startGame(g) {
  if (g.status !== 'lobby') fail('Gra już wystartowała.');
  const n = g.players.length;
  const m = g.settings.mafiaCount;
  if (n < 3) fail('Potrzeba co najmniej 3 graczy.');
  if (m < 1) fail('Potrzeba co najmniej 1 mafiozy.');
  if (m >= n - m) fail(`Za dużo mafiozów (${m}) na ${n} graczy – mafia musi być w mniejszości.`);

  const order = shuffle(g.players.map((p) => p.id));
  const mafiaIds = new Set(order.slice(0, m));
  for (const p of g.players) {
    p.role = mafiaIds.has(p.id) ? 'mafia' : 'citizen';
    pushInbox(
      p,
      p.role === 'mafia'
        ? 'Zostałeś MAFIOZĄ. Eliminuj obywateli i nie daj się wykryć.'
        : 'Zostałeś OBYWATELEM. Znajdź mafię i wygłosuj ją z domu.',
      'role'
    );
  }
  g.status = 'running';
  g.phase = 'day';
  g.day = 1;
  pushFeed(g, 'Gra rozpoczęta! Role zostały rozlosowane. Dzień 1.', 'phase');
  notify(g, 'all', 'Kozia Mafia: gra się zaczęła!', 'Twoja rola została wylosowana. Sprawdź ją w ukryciu…');
}

/* ------------------------------------------------------------------ */
/* Elimination & win check                                             */
/* ------------------------------------------------------------------ */

function eliminate(g, p, cause) {
  p.alive = false;
  p.effects = { doubleVote: false, immunity: false, mafiaShield: false };
  if (g.settings.revealRoles) p.revealedRole = p.role;
  const roleTxt = g.settings.revealRoles ? ` Był(a) ${p.role === 'mafia' ? 'MAFIOZĄ' : 'OBYWATELEM'}.` : '';
  const causeTxt = {
    city: 'został(a) wygłosowany(a) przez miasto.',
    mafia: 'został(a) zamordowany(a) przez mafię.',
    host: 'został(a) wyeliminowany(a) przez hosta.',
  }[cause];
  pushFeed(g, `☠️ ${p.nick} ${causeTxt}${roleTxt}`, 'death');
  pushInbox(p, 'Zostałeś wyeliminowany. Możesz dalej obserwować grę, ale nie zdradzaj niczego!', 'death');
  if (g.bodyguardId === p.id) g.bodyguardId = null;
  if (g.sheriffId === p.id) g.sheriffId = null;
}

export function checkWin(g) {
  if (g.status !== 'running') return;
  const alive = alivePlayers(g);
  const mafia = alive.filter((p) => p.role === 'mafia').length;
  const citizens = alive.length - mafia;
  let winner = null;
  if (mafia === 0) winner = 'citizens';
  else if (mafia >= citizens) winner = 'mafia';
  if (winner) endGame(g, winner);
}

export function endGame(g, winner) {
  g.status = 'ended';
  g.phase = 'ended';
  g.winner = winner;
  g.vote = null;
  g.night = null;
  g.minigame = null;
  for (const p of g.players) p.revealedRole = p.role;
  const txt =
    winner === 'citizens'
      ? '🏆 OBYWATELE WYGRYWAJĄ! Mafia została rozbita.'
      : winner === 'mafia'
        ? '🏆 MAFIA WYGRYWA! Dom należy do Kozich Mafiozów.'
        : 'Gra została zakończona przez hosta.';
  pushFeed(g, txt, 'end');
  notify(g, 'all', 'Koniec gry!', txt);
}

export function hostEliminate(g, playerId) {
  requireRunning(g);
  const p = getPlayer(g, playerId);
  if (!p || !p.alive) fail('Ten gracz nie żyje lub nie istnieje.');
  eliminate(g, p, 'host');
  checkWin(g);
}

export function hostRevive(g, playerId) {
  requireRunning(g);
  const p = getPlayer(g, playerId);
  if (!p || p.alive) fail('Ten gracz żyje lub nie istnieje.');
  p.alive = true;
  p.revealedRole = null;
  pushFeed(g, `✨ ${p.nick} wraca do gry (decyzja hosta).`, 'info');
}

/* ------------------------------------------------------------------ */
/* Phases                                                              */
/* ------------------------------------------------------------------ */

function requireRunning(g) {
  if (g.status !== 'running') fail('Gra nie jest w toku.');
}

function requireFreeDay(g) {
  requireRunning(g);
  if (g.phase !== 'day') fail('Najpierw zakończ bieżącą fazę.');
  if (g.minigame) fail('Najpierw zakończ mini-grę.');
}

export function startCityVote(g) {
  requireFreeDay(g);
  const immune = alivePlayers(g)
    .filter((p) => p.effects.immunity)
    .map((p) => p.id);
  g.vote = { votes: {}, immune, startedAt: Date.now() };
  g.phase = 'city_vote';
  pushFeed(g, `🏛️ Obrady miasta – dzień ${g.day}. Głosujcie, kogo wyrzucić z domu!`, 'phase');
  if (immune.length)
    pushFeed(g, `🛡️ Immunitet w tym głosowaniu: ${immune.map((id) => nick(g, id)).join(', ')}.`, 'info');
  notify(g, 'all', 'Obrady miasta!', 'Głosowanie się rozpoczęło. Oddaj swój głos.');
}

export function castCityVote(g, p, targetId) {
  if (g.phase !== 'city_vote' || !g.vote) fail('Głosowanie nie trwa.');
  requireAlive(p);
  if (targetId === 'skip') {
    g.vote.votes[p.id] = 'skip';
    return;
  }
  requireTarget(g, targetId, { self: p });
  if (g.vote.immune.includes(targetId)) fail('Ten gracz ma immunitet w tym głosowaniu.');
  g.vote.votes[p.id] = targetId;
}

export function endCityVote(g) {
  if (g.phase !== 'city_vote' || !g.vote) fail('Głosowanie nie trwa.');
  const tally = {};
  let skip = 0;
  for (const [voterId, targetId] of Object.entries(g.vote.votes)) {
    const voter = getPlayer(g, voterId);
    if (!voter?.alive) continue;
    const weight = voter.effects.doubleVote ? 2 : 1;
    if (targetId === 'skip') skip += weight;
    else if (getPlayer(g, targetId)?.alive) tally[targetId] = (tally[targetId] || 0) + weight;
  }
  for (const p of g.players) {
    p.effects.doubleVote = false;
    p.effects.immunity = false;
  }
  const top = topOf(tally);
  const topCount = top.length ? tally[top[0]] : 0;
  let eliminatedId = null;
  let outcome;
  if (!top.length || topCount <= skip) outcome = 'skip';
  else if (top.length > 1) outcome = 'tie';
  else {
    outcome = 'eliminated';
    eliminatedId = top[0];
  }

  g.lastVote = {
    day: g.day,
    tally: Object.entries(tally)
      .map(([id, count]) => ({ id, nick: nick(g, id), count }))
      .sort((a, b) => b.count - a.count),
    skip,
    voters: Object.keys(g.vote.votes).length,
    outcome,
    eliminatedId,
  };
  g.vote = null;
  g.phase = 'day';

  if (outcome === 'skip') pushFeed(g, 'Miasto nie zdecydowało się nikogo wyrzucić.', 'phase');
  if (outcome === 'tie') pushFeed(g, 'Remis w głosowaniu – nikt nie opuszcza domu.', 'phase');
  if (eliminatedId) eliminate(g, getPlayer(g, eliminatedId), 'city');
  notify(g, 'all', 'Wyniki głosowania', 'Miasto zdecydowało. Sprawdź wyniki.');
  checkWin(g);
}

export function startNight(g) {
  requireFreeDay(g);
  g.night = { votes: {}, protectId: null, startedAt: Date.now() };
  g.phase = 'night';
  pushFeed(g, `🌙 Zapada noc ${g.day}. Mafia wychodzi na obrady…`, 'phase');
  notify(g, 'all', 'Zapada noc…', 'Mafia wybiera ofiarę. Obywatele – śpijcie spokojnie (o ile możecie).');
  notify(g, 'mafia', 'Obrady mafii', 'Zdecydujcie, kogo dziś wyeliminujecie.');
  if (g.bodyguardId) notify(g, g.bodyguardId, 'Ochroniarzu!', 'Wybierz, kogo chronisz tej nocy.');
}

export function mafiaVote(g, p, targetId) {
  if (g.phase !== 'night' || !g.night) fail('Obrady mafii trwają tylko w nocy.');
  requireAlive(p);
  if (p.role !== 'mafia') fail('Tylko mafia może tu głosować.');
  if (targetId === null) {
    delete g.night.votes[p.id];
    return;
  }
  const t = requireTarget(g, targetId, { self: p });
  if (t.role === 'mafia') fail('Nie możecie eliminować członków mafii.');
  g.night.votes[p.id] = targetId;
}

export function mafiaChat(g, p, text) {
  if (p.role !== 'mafia') fail('Brak dostępu.');
  requireAlive(p);
  const t = String(text || '').trim().slice(0, 300);
  if (!t) return;
  g.mafiaChat.push({ id: uid(4), ts: Date.now(), playerId: p.id, nick: p.nick, text: t });
  if (g.mafiaChat.length > 200) g.mafiaChat.splice(0, g.mafiaChat.length - 200);
}

export function bodyguardProtect(g, p, targetId) {
  if (g.phase !== 'night' || !g.night) fail('Ochronę wybiera się w nocy.');
  requireAlive(p);
  if (g.bodyguardId !== p.id) fail('Nie jesteś Ochroniarzem.');
  requireTarget(g, targetId, { allowSelf: true });
  g.night.protectId = targetId;
}

export function endNight(g) {
  if (g.phase !== 'night' || !g.night) fail('Noc nie trwa.');
  const tally = {};
  for (const [mid, tid] of Object.entries(g.night.votes)) {
    const m = getPlayer(g, mid);
    const t = getPlayer(g, tid);
    if (m?.alive && m.role === 'mafia' && t?.alive) tally[tid] = (tally[tid] || 0) + 1;
  }
  const top = topOf(tally);
  const targetId = top.length ? pickRandom(top) : null;
  const target = targetId ? getPlayer(g, targetId) : null;
  const protectedByGuard = !!target && g.night.protectId === targetId;
  const protectedByCard = !!target && target.effects.mafiaShield;
  const killed = !!target && !protectedByGuard && !protectedByCard;

  g.lastNight = { day: g.day, targetId, killedId: killed ? targetId : null, saved: !!target && !killed };
  for (const p of g.players) p.effects.mafiaShield = false;
  g.night = null;
  g.day += 1;
  g.phase = 'day';

  pushFeed(g, `☀️ Nastaje dzień ${g.day}.`, 'phase');
  if (killed) eliminate(g, target, 'mafia');
  else pushFeed(g, 'Tej nocy nikt nie zginął.', 'info');
  if (target && protectedByGuard && g.bodyguardId) {
    const bg = getPlayer(g, g.bodyguardId);
    if (bg) pushInbox(bg, `Twoja ochrona uratowała gracza ${target.nick} przed mafią!`, 'success');
  }
  if (target && protectedByCard) pushInbox(target, 'Karta Ochrony uratowała Cię tej nocy przed mafią!', 'success');
  notify(g, 'all', `Dzień ${g.day}`, killed ? 'Mafia uderzyła tej nocy…' : 'Tej nocy nikt nie zginął.');
  checkWin(g);
}

/* ------------------------------------------------------------------ */
/* Special roles                                                       */
/* ------------------------------------------------------------------ */

export function assignSpecialRole(g, roleKey, playerId, byNick) {
  const role = SPECIAL_ROLES[roleKey];
  if (!role) fail('Nieznana rola.');
  if (playerId === null) {
    g[role.field] = null;
    pushFeed(g, `Rola ${role.name} jest teraz wolna.`, 'info');
    return;
  }
  const p = getPlayer(g, playerId);
  if (!p?.alive) fail('Ten gracz nie bierze udziału w grze.');
  g[role.field] = p.id;
  pushFeed(
    g,
    byNick
      ? `⭐ ${byNick} nominuje gracza ${p.nick} na rolę: ${role.name}!`
      : `⭐ ${p.nick} otrzymuje rolę: ${role.name}.`,
    'role'
  );
  pushInbox(
    p,
    roleKey === 'sheriff'
      ? 'Jesteś SZERYFEM. Raz dziennie możesz sprawdzić, czy wybrany gracz jest mafią.'
      : 'Jesteś OCHRONIARZEM. Każdej nocy możesz ochronić jedną osobę (także siebie) przed mafią.',
    'role'
  );
  notify(g, p.id, `Zostałeś: ${role.name}`, 'Sprawdź swoje nowe możliwości w zakładce Moce.');
}

export function sheriffCheck(g, p, targetId) {
  requireRunning(g);
  requireAlive(p);
  if (g.sheriffId !== p.id) fail('Nie jesteś Szeryfem.');
  if (p.sheriffLastDay === g.day) fail('Dziś już przeprowadziłeś śledztwo. Spróbuj jutro.');
  const t = requireTarget(g, targetId, { self: p });
  p.sheriffLastDay = g.day;
  const isMafia = t.role === 'mafia';
  pushInbox(p, `🔎 Śledztwo Szeryfa: ${t.nick} jest ${isMafia ? 'MAFIOZĄ' : 'OBYWATELEM'}.`, isMafia ? 'danger' : 'success');
  return { targetNick: t.nick, isMafia };
}

/* ------------------------------------------------------------------ */
/* Cards                                                               */
/* ------------------------------------------------------------------ */

export function giveCard(g, p, type) {
  if (!CARDS[type]) fail('Nieznana karta.');
  if (g.awardedCards.includes(type)) fail('Ta karta została już zdobyta w tej grze.');
  g.awardedCards.push(type);
  p.cards.push({ id: uid(4), type, used: false, wonDay: g.day });
  pushInbox(p, `🃏 Zdobywasz: ${CARDS[type].name}! Użyj jej mądrze.`, 'success');
  notify(g, p.id, 'Nowa karta!', `Zdobywasz: ${CARDS[type].name}`);
}

export function useCard(g, p, cardId, targetId) {
  requireRunning(g);
  requireAlive(p);
  const card = p.cards.find((c) => c.id === cardId);
  if (!card) fail('Nie masz takiej karty.');
  if (card.used) fail('Ta karta została już użyta.');
  let result = null;
  switch (card.type) {
    case 'double_vote':
      if (g.phase !== 'day') fail('Kartę Podwójnego Głosu aktywujesz w dzień, przed obradami miasta.');
      p.effects.doubleVote = true;
      pushInbox(p, 'Aktywowano Podwójny Głos – w najbliższym głosowaniu miasta Twój głos liczy się x2.', 'success');
      break;
    case 'immunity':
      if (g.phase !== 'day') fail('Kartę Immunitetu aktywujesz w dzień, przed obradami miasta.');
      p.effects.immunity = true;
      pushInbox(p, 'Aktywowano Immunitet – nie można Cię wygłosować w najbliższych obradach miasta.', 'success');
      break;
    case 'shield':
      if (g.phase !== 'day') fail('Kartę Ochrony aktywujesz w dzień – działa przez najbliższą noc.');
      p.effects.mafiaShield = true;
      pushInbox(p, 'Aktywowano Ochronę przed Mafią – najbliższej nocy mafia nie może Cię wyeliminować.', 'success');
      break;
    case 'check': {
      const t = requireTarget(g, targetId, { self: p });
      const isMafia = t.role === 'mafia';
      result = { targetNick: t.nick, isMafia };
      pushInbox(p, `🔎 Karta Sprawdzenia: ${t.nick} jest ${isMafia ? 'MAFIOZĄ' : 'OBYWATELEM'}.`, isMafia ? 'danger' : 'success');
      break;
    }
    default:
      fail('Nieznana karta.');
  }
  card.used = true;
  card.usedDay = g.day;
  return result;
}

export function announce(g, text) {
  const t = String(text || '').trim().slice(0, 300);
  if (!t) fail('Pusta wiadomość.');
  pushFeed(g, `📣 Host: ${t}`, 'host');
  notify(g, 'all', 'Wiadomość od hosta', t);
}

export { ROLES };
