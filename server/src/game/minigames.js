import { CARD_VALUES, CARDS, FRUITS, MARKET_ROUNDS, SCORE_LIMITS, SPECIAL_ROLES } from './constants.js';
import { assignSpecialRole, giveCard } from './engine.js';
import { BJ_START_CHIPS, blackjackMove, initBlackjack, refundOpenHand } from './blackjack.js';
import { initPoker, PK_START_CHIPS, pokerAct, pokerForce, pokerStack, refundPokerHand, startHand } from './poker.js';
import {
  alivePlayers,
  fail,
  getPlayer,
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

const MINIGAME_NAMES = { war: 'Wojna', market: 'Targ' };

function requireMinigame(g, type) {
  const mg = g.minigame;
  if (!mg || (type && mg.type !== type)) fail('Ta mini-gra nie trwa.');
  return mg;
}

function requireParticipant(mg, p) {
  requireAlive(p);
  if (!mg.participants.includes(p.id)) fail('Nie bierzesz udziału w tej mini-grze.');
}

/* ------------------------------------------------------------------ */
/* Start / close (host)                                                */
/* ------------------------------------------------------------------ */

export function startMinigame(g, { kind, rewardRole, card, rounds }) {
  if (g.status !== 'running') fail('Gra nie jest w toku.');
  if (g.phase !== 'day') fail('Mini-gry rozgrywa się w dzień.');
  if (g.minigame) fail('Inna mini-gra już trwa.');
  const participants = alivePlayers(g).map((p) => p.id);
  if (participants.length < 2) fail('Za mało żywych graczy.');

  if (kind === 'war' || kind === 'market') {
    if (!SPECIAL_ROLES[rewardRole]) fail('Wybierz rolę, o którą toczy się gra.');
    const base = { id: uid(4), type: kind, rewardRole, participants, stage: 'negotiation', round: 0, winnerId: null, startedAt: Date.now() };
    g.minigame = kind === 'war' ? initWar(base, rounds) : initMarket(base);
    pushFeed(
      g,
      `🎲 Mini-gra: ${MINIGAME_NAMES[kind]}! Stawka: nominacja na rolę ${SPECIAL_ROLES[rewardRole].name}. Czas na negocjacje i sojusze.`,
      'minigame'
    );
    notify(g, 'all', `Mini-gra: ${MINIGAME_NAMES[kind]}`, `Do wygrania nominacja na ${SPECIAL_ROLES[rewardRole].name}a!`);
    return;
  }
  if (kind === 'skill') {
    if (!CARDS[card]) fail('Wybierz kartę.');
    if (g.awardedCards.includes(card)) fail('Ta karta została już zdobyta w tej grze.');
    const game = CARDS[card].game;
    g.minigame = {
      id: uid(4),
      type: 'skill',
      card,
      game,
      participants,
      stage: 'playing',
      scores: {},
      submittedAt: {},
      winnerId: null,
      startedAt: Date.now(),
    };
    if (game === 'poker') {
      const pk = initPoker(participants);
      g.minigame.poker = pk;
      startHand(pk);
      g.minigame.scores = Object.fromEntries(participants.map((id) => [id, pokerStack(pk, id)]));
      pushFeed(g, `♠️ ${CARDS[card].gameName}! Nagroda: ${CARDS[card].name}. Wszyscy przy jednym stole, ${PK_START_CHIPS} żetonów na start.`, 'minigame');
      notify(g, 'all', CARDS[card].gameName, `Texas Hold'em o ${CARDS[card].name}. Siadaj do stołu!`);
      return;
    }
    if (game === 'blackjack') {
      g.minigame.bj = initBlackjack(participants);
      g.minigame.scores = Object.fromEntries(participants.map((id) => [id, BJ_START_CHIPS]));
      pushFeed(g, `🃏 ${CARDS[card].gameName}! Nagroda: ${CARDS[card].name}. Każdy dostaje ${BJ_START_CHIPS} żetonów – najwięcej na koniec wygrywa.`, 'minigame');
      notify(g, 'all', CARDS[card].gameName, `Nagroda: ${CARDS[card].name}. Masz ${BJ_START_CHIPS} żetonów – graj lub pilnuj puli!`);
      return;
    }
    pushFeed(g, `🎯 Gra zręcznościowa: ${CARDS[card].gameName}! Nagroda: ${CARDS[card].name}. Każdy ma jedną próbę.`, 'minigame');
    notify(g, 'all', CARDS[card].gameName, `Nagroda: ${CARDS[card].name}. Masz jedną próbę!`);
    return;
  }
  fail('Nieznana mini-gra.');
}

export function closeMinigame(g) {
  const mg = requireMinigame(g);
  if (mg.stage !== 'finished') pushFeed(g, 'Mini-gra została przerwana przez hosta.', 'minigame');
  g.minigameHistory.push({
    id: mg.id,
    type: mg.type,
    card: mg.card,
    rewardRole: mg.rewardRole,
    winnerId: mg.winnerId,
    nomineeId: mg.nomineeId ?? null,
    day: g.day,
  });
  g.minigame = null;
}

/** Host-driven "next step" for the current minigame. */
export function advanceMinigame(g) {
  const mg = requireMinigame(g);
  if (mg.type === 'war') return warAdvance(g, mg);
  if (mg.type === 'market') return marketAdvance(g, mg);
  if (mg.type === 'skill') return skillFinish(g, mg);
}

/* ------------------------------------------------------------------ */
/* Nomination (reward of war / market)                                 */
/* ------------------------------------------------------------------ */

function declareWinner(g, mg, scores, label) {
  const top = topOf(scores);
  if (!top.length) {
    mg.stage = 'finished';
    pushFeed(g, `${label}: brak zwycięzcy.`, 'minigame');
    return;
  }
  mg.winnerId = pickRandom(top);
  mg.tiebreak = top.length > 1 ? top : null;
  mg.stage = 'nomination';
  const tieTxt = top.length > 1 ? ` (remis: ${top.map((id) => nick(g, id)).join(', ')} – zwycięzca wylosowany)` : '';
  pushFeed(g, `🏆 ${label}: wygrywa ${nick(g, mg.winnerId)}${tieTxt}! Teraz nominuje kogoś na rolę ${SPECIAL_ROLES[mg.rewardRole].name}.`, 'minigame');
  notify(g, mg.winnerId, 'Wygrałeś mini-grę!', `Nominuj gracza na rolę ${SPECIAL_ROLES[mg.rewardRole].name}.`);
}

export function nominate(g, p, targetId) {
  const mg = requireMinigame(g);
  if (mg.stage !== 'nomination') fail('Teraz nie ma nominacji.');
  if (mg.winnerId !== p.id) fail('Tylko zwycięzca mini-gry nominuje.');
  requireTarget(g, targetId, { allowSelf: true });
  assignSpecialRole(g, mg.rewardRole, targetId, p.nick);
  mg.nomineeId = targetId;
  mg.stage = 'finished';
}

export function hostNominate(g, targetId) {
  const mg = requireMinigame(g);
  if (mg.stage !== 'nomination') fail('Teraz nie ma nominacji.');
  requireTarget(g, targetId, { allowSelf: true });
  assignSpecialRole(g, mg.rewardRole, targetId, nick(g, mg.winnerId));
  mg.nomineeId = targetId;
  mg.stage = 'finished';
}

/* ------------------------------------------------------------------ */
/* WOJNA                                                               */
/* ------------------------------------------------------------------ */

function initWar(base, rounds) {
  const totalRounds = Math.max(1, Math.min(10, Number(rounds) || 5));
  return {
    ...base,
    totalRounds,
    hands: Object.fromEntries(base.participants.map((id) => [id, [...CARD_VALUES]])),
    scores: Object.fromEntries(base.participants.map((id) => [id, 0])),
    byes: Object.fromEntries(base.participants.map((id) => [id, 0])),
    pairs: [],
    byeId: null,
    history: [],
  };
}

function warAdvance(g, mg) {
  if (mg.stage === 'round') {
    // Force-close unresolved duels (no points awarded).
    for (const pair of mg.pairs) if (!pair.done) {
      pair.done = true;
      pair.forced = true;
    }
    mg.stage = 'round_result';
    mg.history.push({ round: mg.round, pairs: mg.pairs, byeId: mg.byeId });
    return;
  }
  if (mg.stage === 'negotiation' || mg.stage === 'round_result') {
    if (mg.round >= mg.totalRounds) return declareWinner(g, mg, mg.scores, 'Wojna');
    const alive = mg.participants.filter((id) => getPlayer(g, id)?.alive);
    let order = shuffle(alive);
    mg.byeId = null;
    if (order.length % 2 === 1) {
      const minBye = Math.min(...order.map((id) => mg.byes[id]));
      mg.byeId = pickRandom(order.filter((id) => mg.byes[id] === minBye));
      mg.byes[mg.byeId] += 1;
      order = order.filter((id) => id !== mg.byeId);
    }
    mg.pairs = [];
    for (let i = 0; i < order.length; i += 2) {
      const a = order[i];
      const b = order[i + 1];
      const pair = { a, b, pickA: null, pickB: null, stake: 1, log: [], done: false, winner: null };
      if (!mg.hands[a].length || !mg.hands[b].length) pair.done = true;
      mg.pairs.push(pair);
    }
    mg.round += 1;
    mg.stage = 'round';
    pushFeed(g, `⚔️ Wojna – runda ${mg.round}/${mg.totalRounds}. Do stołów!`, 'minigame');
    return;
  }
  if (mg.stage === 'nomination') fail('Czekamy na nominację zwycięzcy (lub nominuj za niego).');
  fail('Mini-gra zakończona – zamknij ją.');
}

export function warPlay(g, p, valueRaw) {
  const mg = requireMinigame(g, 'war');
  requireParticipant(mg, p);
  if (mg.stage !== 'round') fail('Teraz nie ma pojedynków.');
  const value = Number(valueRaw);
  const pair = mg.pairs.find((x) => x.a === p.id || x.b === p.id);
  if (!pair) fail('W tej rundzie pauzujesz.');
  if (pair.done) fail('Twój pojedynek jest już rozstrzygnięty.');
  const side = pair.a === p.id ? 'A' : 'B';
  if (pair[`pick${side}`] !== null) fail('Już wyłożyłeś kartę – czekaj na rywala.');
  const hand = mg.hands[p.id];
  const idx = hand.indexOf(value);
  if (idx === -1) fail('Nie masz już tej karty.');
  hand.splice(idx, 1);
  pair[`pick${side}`] = value;

  if (pair.pickA !== null && pair.pickB !== null) {
    pair.log.push({ a: pair.pickA, b: pair.pickB });
    if (pair.pickA === pair.pickB) {
      pair.stake += 1;
      pair.pickA = null;
      pair.pickB = null;
      if (!mg.hands[pair.a].length || !mg.hands[pair.b].length) pair.done = true;
    } else {
      pair.winner = pair.pickA > pair.pickB ? pair.a : pair.b;
      mg.scores[pair.winner] += pair.stake;
      pair.done = true;
    }
  }
  if (mg.pairs.every((x) => x.done)) {
    mg.stage = 'round_result';
    mg.history.push({ round: mg.round, pairs: mg.pairs, byeId: mg.byeId });
  }
}

/* ------------------------------------------------------------------ */
/* TARG                                                                */
/* ------------------------------------------------------------------ */

function initMarket(base) {
  const ids = shuffle(base.participants);
  const n = ids.length;
  const typeCount = Math.max(2, Math.min(FRUITS.length, n));
  const fruits = shuffle(FRUITS.map((f) => f.key)).slice(0, typeCount);
  // Balanced distribution of 2n rights across fruit types.
  const total = 2 * n;
  const seq = [];
  fruits.forEach((f, i) => {
    const count = Math.floor(total / typeCount) + (i < total % typeCount ? 1 : 0);
    for (let k = 0; k < count; k++) seq.push(f);
  });
  // seq[i] and seq[i+n] are always different fruits because each count <= n.
  const holdings = {};
  ids.forEach((id, i) => {
    holdings[id] = [seq[i], seq[i + n]];
  });
  return {
    ...base,
    round: 1,
    totalRounds: MARKET_ROUNDS,
    fruits,
    holdings,
    tokens: Object.fromEntries(ids.map((id) => [id, { change: true, secret: true }])),
    tokenRound: {},
    secretFruits: [],
    prices: {},
    money: Object.fromEntries(ids.map((id) => [id, 0])),
    results: [],
    announcements: [],
  };
}

export const sellersOf = (mg, fruit) =>
  Object.entries(mg.holdings)
    .filter(([, fs]) => fs.includes(fruit))
    .map(([id]) => id);

export function marketToken(g, p, { kind, from, to, fruit }) {
  const mg = requireMinigame(g, 'market');
  requireParticipant(mg, p);
  if (mg.stage !== 'negotiation') fail('Żetonów używa się przed rundą (w czasie negocjacji).');
  if (mg.tokenRound[p.id] === mg.round) fail('W tej rundzie użyłeś już żetonu.');
  const tokens = mg.tokens[p.id];
  if (kind === 'change') {
    if (!tokens.change) fail('Żeton Zmiany został już wykorzystany.');
    const hand = mg.holdings[p.id];
    if (!hand.includes(from)) fail('Nie masz tego owocu.');
    if (!mg.fruits.includes(to) || hand.includes(to)) fail('Wybierz inny owoc, którego nie masz.');
    hand[hand.indexOf(from)] = to;
    tokens.change = false;
    mg.announcements.push({ round: mg.round, text: 'Ktoś użył Żetonu Zmiany! Liczebność grup się zmieniła.' });
    pushFeed(g, '🔄 Targ: ktoś użył Żetonu Zmiany!', 'minigame');
  } else if (kind === 'secret') {
    if (!tokens.secret) fail('Żeton Sekretu został już wykorzystany.');
    if (!mg.fruits.includes(fruit)) fail('Nieznany owoc.');
    if (!mg.secretFruits.includes(fruit)) mg.secretFruits.push(fruit);
    tokens.secret = false;
  } else fail('Nieznany żeton.');
  mg.tokenRound[p.id] = mg.round;
}

export function marketSetPrices(g, p, prices) {
  const mg = requireMinigame(g, 'market');
  requireParticipant(mg, p);
  if (mg.stage !== 'pricing') fail('Teraz nie ustala się cen.');
  const hand = mg.holdings[p.id];
  const clean = {};
  for (const f of hand) {
    const v = Number(prices?.[f]);
    if (!Number.isInteger(v) || v < 1 || v > 5) fail('Cena musi być pełną kwotą od $1 do $5.');
    clean[f] = v;
  }
  mg.prices[p.id] = clean;
}

function marketResolve(g, mg) {
  const perFruit = {};
  const personal = {};
  for (const fruit of mg.fruits) {
    const sellers = sellersOf(mg, fruit);
    const demand = sellers.length;
    const priced = sellers.filter((id) => mg.prices[id]?.[fruit] !== undefined);
    const hidden = mg.secretFruits.includes(fruit);
    if (!priced.length) {
      perFruit[fruit] = { sellers: demand, winningPrice: null, winners: 0, hidden };
      continue;
    }
    const min = Math.min(...priced.map((id) => mg.prices[id][fruit]));
    const winners = priced.filter((id) => mg.prices[id][fruit] === min);
    const units = demand / winners.length;
    const earn = Math.round(units * min * 100) / 100;
    for (const id of priced) {
      personal[id] ??= {};
      const won = winners.includes(id);
      personal[id][fruit] = { price: mg.prices[id][fruit], units: won ? units : 0, earned: won ? earn : 0 };
      if (won) mg.money[id] = Math.round((mg.money[id] + earn) * 100) / 100;
    }
    perFruit[fruit] = { sellers: demand, winningPrice: min, winners: winners.length, priced: priced.length, hidden };
  }
  for (const id of mg.participants) {
    personal[id] ??= {};
    for (const fruit of mg.holdings[id] ?? []) {
      personal[id][fruit] ??= { price: null, units: 0, earned: 0 };
    }
  }
  mg.results.push({ round: mg.round, perFruit, personal });
}

function marketAdvance(g, mg) {
  if (mg.stage === 'negotiation') {
    mg.stage = 'pricing';
    mg.prices = {};
    pushFeed(g, `🍎 Targ – runda ${mg.round}/${mg.totalRounds}: konfesjonał otwarty, ustalcie ceny w tajemnicy!`, 'minigame');
    return;
  }
  if (mg.stage === 'pricing') {
    marketResolve(g, mg);
    mg.stage = 'results';
    pushFeed(g, `🍎 Targ – wyniki rundy ${mg.round} są już znane.`, 'minigame');
    return;
  }
  if (mg.stage === 'results') {
    if (mg.round >= mg.totalRounds) {
      for (const id of mg.participants) pushInbox(getPlayer(g, id), `Targ zakończony. Zarobiłeś łącznie $${mg.money[id]}.`, 'info');
      return declareWinner(g, mg, mg.money, 'Targ');
    }
    mg.round += 1;
    mg.secretFruits = [];
    mg.prices = {};
    mg.stage = 'negotiation';
    pushFeed(g, `🍎 Targ – runda ${mg.round}/${mg.totalRounds}: czas na negocjacje.`, 'minigame');
    return;
  }
  if (mg.stage === 'nomination') fail('Czekamy na nominację zwycięzcy (lub nominuj za niego).');
  fail('Mini-gra zakończona – zamknij ją.');
}

/* ------------------------------------------------------------------ */
/* Gry zręcznościowe (karty)                                           */
/* ------------------------------------------------------------------ */

export function skillSubmit(g, p, scoreRaw) {
  const mg = requireMinigame(g, 'skill');
  requireParticipant(mg, p);
  if (mg.stage !== 'playing') fail('Gra już się zakończyła.');
  if (mg.game === 'blackjack' || mg.game === 'poker') fail('W tej grze wynik liczy serwer.');
  if (mg.scores[p.id] !== undefined) fail('Masz tylko jedną próbę.');
  const [min, max] = SCORE_LIMITS[mg.game];
  const score = Number(scoreRaw);
  if (!Number.isFinite(score)) fail('Nieprawidłowy wynik.');
  mg.scores[p.id] = Math.round(Math.max(min, Math.min(max, score)));
  mg.submittedAt[p.id] = Date.now();
}

export function blackjackAction(g, p, { move, bet }) {
  const mg = requireMinigame(g, 'skill');
  if (mg.game !== 'blackjack') fail('To nie jest blackjack.');
  requireParticipant(mg, p);
  if (mg.stage !== 'playing') fail('Kasyno jest już zamknięte.');
  const seat = mg.bj[p.id];
  blackjackMove(seat, move, bet);
  mg.scores[p.id] = seat.chips + (seat.hand?.status === 'playing' ? seat.hand.bet : 0);
}

function requirePoker(g) {
  const mg = requireMinigame(g, 'skill');
  if (mg.game !== 'poker') fail('To nie jest poker.');
  if (mg.stage !== 'playing') fail('Stół jest już zamknięty.');
  return mg;
}

const syncPokerScores = (mg) => {
  for (const id of mg.participants) mg.scores[id] = pokerStack(mg.poker, id);
};

/** Player move: fold | check | call | raise (amount = raise to) | allin | next (deal next hand). */
export function pokerAction(g, p, { move, amount }) {
  const mg = requirePoker(g);
  requireParticipant(mg, p);
  if (move === 'next') startHand(mg.poker);
  else pokerAct(mg.poker, p.id, move, amount);
  syncPokerScores(mg);
}

export function pokerHost(g, what) {
  const mg = requirePoker(g);
  if (what === 'next') startHand(mg.poker);
  else if (what === 'force') pokerForce(mg.poker);
  syncPokerScores(mg);
}

function skillFinish(g, mg) {
  if (mg.stage !== 'playing') fail('Gra już zakończona – zamknij ją.');
  if (mg.game === 'poker') {
    refundPokerHand(mg.poker);
    syncPokerScores(mg);
  }
  if (mg.game === 'blackjack') {
    for (const [id, seat] of Object.entries(mg.bj)) {
      refundOpenHand(seat);
      mg.scores[id] = seat.chips;
    }
  }
  const lower = CARDS[mg.card].lowerIsBetter;
  const top = topOf(mg.scores, lower);
  mg.stage = 'finished';
  if (!top.length) {
    pushFeed(g, `${CARDS[mg.card].gameName}: nikt nie zagrał – karta pozostaje w puli.`, 'minigame');
    return;
  }
  // Tie → blackjack: random draw; other games: the earliest submission wins.
  mg.winnerId =
    mg.game === 'blackjack' || mg.game === 'poker' ? pickRandom(top) : top.sort((a, b) => mg.submittedAt[a] - mg.submittedAt[b])[0];
  giveCard(g, getPlayer(g, mg.winnerId), mg.card);
  pushFeed(g, `🎯 ${CARDS[mg.card].gameName} zakończona. Zwycięzca w sekrecie otrzymał nagrodę…`, 'minigame');
}
