import { fail, shuffle } from './util.js';

/* Kozi Poker – Texas Hold'em No-Limit dla wszystkich graczy przy jednym stole.
 * Całość liczona na serwerze. Karty: { r: 2..14 (14 = As), s: 0..3 }.
 * Uproszczenie: każde przebicie (także krótki all-in) ponownie otwiera licytację.
 */

export const PK_START_CHIPS = 1000;
export const PK_HANDS_PER_LEVEL = 10;

export const blindsFor = (handNo) => {
  const bb = 20 * 2 ** Math.floor(Math.max(0, handNo - 1) / PK_HANDS_PER_LEVEL);
  return { sb: bb / 2, bb };
};

const newDeck = () => shuffle(Array.from({ length: 52 }, (_, i) => ({ r: (i % 13) + 2, s: Math.floor(i / 13) })));

/* ------------------------------------------------------------------ */
/* Hand evaluation                                                     */
/* ------------------------------------------------------------------ */

export const HAND_NAMES = ['Wysoka karta', 'Para', 'Dwie pary', 'Trójka', 'Strit', 'Kolor', 'Full', 'Kareta', 'Poker'];

function rank5(cs) {
  const rs = cs.map((c) => c.r).sort((a, b) => b - a);
  const flush = cs.every((c) => c.s === cs[0].s);
  const uniq = new Set(rs);
  let straightHigh = 0;
  if (uniq.size === 5) {
    if (rs[0] - rs[4] === 4) straightHigh = rs[0];
    else if (rs[0] === 14 && rs[1] === 5) straightHigh = 5; // A-2-3-4-5
  }
  const counts = {};
  rs.forEach((r) => (counts[r] = (counts[r] || 0) + 1));
  const groups = Object.entries(counts)
    .map(([r, c]) => [c, Number(r)])
    .sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const gr = groups.map((g) => g[1]);
  if (straightHigh && flush) return [8, straightHigh];
  if (groups[0][0] === 4) return [7, ...gr];
  if (groups[0][0] === 3 && groups[1][0] === 2) return [6, ...gr];
  if (flush) return [5, ...rs];
  if (straightHigh) return [4, straightHigh];
  if (groups[0][0] === 3) return [3, ...gr];
  if (groups[0][0] === 2 && groups[1][0] === 2) return [2, ...gr];
  if (groups[0][0] === 2) return [1, ...gr];
  return [0, ...rs];
}

export const compareRanks = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d;
  }
  return 0;
};

/** Best 5-card hand out of 5–7 cards. */
export function bestHand(cards) {
  let best = null;
  const n = cards.length;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let c = b + 1; c < n; c++)
        for (let d = c + 1; d < n; d++)
          for (let e = d + 1; e < n; e++) {
            const five = [cards[a], cards[b], cards[c], cards[d], cards[e]];
            const rank = rank5(five);
            if (!best || compareRanks(rank, best.rank) > 0) best = { rank, cards: five };
          }
  const name = best.rank[0] === 8 && best.rank[1] === 14 ? 'Poker królewski' : HAND_NAMES[best.rank[0]];
  return { ...best, name };
}

/* ------------------------------------------------------------------ */
/* Table                                                               */
/* ------------------------------------------------------------------ */

export function initPoker(participants) {
  return {
    seats: [...participants],
    chips: Object.fromEntries(participants.map((id) => [id, PK_START_CHIPS])),
    handNo: 0,
    dealer: null,
    hand: null,
  };
}

/** Next seat after `fromId` (circular) satisfying `pred`. */
function nextSeat(order, fromId, pred) {
  const start = fromId === null ? -1 : order.indexOf(fromId);
  for (let k = 1; k <= order.length; k++) {
    const id = order[(start + k + order.length) % order.length];
    if (pred(id)) return id;
  }
  return null;
}

const needsAction = (h, id) => !h.folded[id] && !h.allIn[id] && (!h.acted[id] || (h.bets[id] || 0) < h.currentBet);
const potOf = (h) => Object.values(h.contrib).reduce((a, b) => a + b, 0);

function put(pk, id, amount) {
  const h = pk.hand;
  const pay = Math.min(amount, pk.chips[id]);
  pk.chips[id] -= pay;
  h.bets[id] = (h.bets[id] || 0) + pay;
  h.contrib[id] = (h.contrib[id] || 0) + pay;
  if (pk.chips[id] === 0) h.allIn[id] = true;
  return pay;
}

export const handInProgress = (pk) => !!pk.hand && !pk.hand.over;

export function startHand(pk) {
  if (handInProgress(pk)) fail('Rozdanie wciąż trwa.');
  const active = pk.seats.filter((id) => pk.chips[id] > 0);
  if (active.length < 2) fail('Przy stole został tylko jeden gracz z żetonami – gra skończona.');
  pk.handNo += 1;
  const { sb, bb } = blindsFor(pk.handNo);
  pk.dealer = nextSeat(pk.seats, pk.dealer, (id) => pk.chips[id] > 0);
  const inHand = [];
  // order of play starting left of the dealer, dealer last
  for (let k = 1; k <= pk.seats.length; k++) {
    const id = pk.seats[(pk.seats.indexOf(pk.dealer) + k) % pk.seats.length];
    if (pk.chips[id] > 0) inHand.push(id);
  }
  const h = {
    deck: newDeck(),
    hole: {},
    board: [],
    street: 'preflop',
    inHand,
    bets: {},
    contrib: {},
    folded: {},
    allIn: {},
    acted: {},
    lastAction: {},
    currentBet: 0,
    minRaise: bb,
    sb,
    bb,
    toAct: null,
    over: false,
    results: null,
  };
  pk.hand = h;
  const headsUp = inHand.length === 2;
  const sbId = headsUp ? pk.dealer : inHand[0];
  const bbId = headsUp ? inHand[0] : inHand[1];
  put(pk, sbId, sb);
  put(pk, bbId, bb);
  h.lastAction[sbId] = 'mała ciemna';
  h.lastAction[bbId] = 'duża ciemna';
  h.currentBet = Math.max(h.bets[sbId], h.bets[bbId]);
  for (const id of inHand) h.hole[id] = [h.deck.pop(), h.deck.pop()];
  h.toAct = nextSeat(inHand, bbId, (id) => needsAction(h, id));
  if (!h.toAct) runOutAndShowdown(pk);
}

export function pokerAct(pk, id, type, amountRaw) {
  const h = pk.hand;
  if (!handInProgress(pk)) fail('Rozdanie się nie toczy.');
  if (h.toAct !== id) fail('To nie Twoja kolej.');
  const bet = h.bets[id] || 0;
  const chips = pk.chips[id];
  const toCall = h.currentBet - bet;

  const raiseTo = (to, enforceMin) => {
    const maxTo = bet + chips;
    if (to <= h.currentBet) fail('Przebicie musi być wyższe od obecnej stawki.');
    if (to > maxTo) fail('Nie masz tylu żetonów.');
    const size = to - h.currentBet;
    if (enforceMin && size < h.minRaise && to < maxTo) fail(`Minimalne przebicie: do ${h.currentBet + h.minRaise}.`);
    put(pk, id, to - bet);
    if (size >= h.minRaise) h.minRaise = size;
    h.currentBet = to;
    for (const o of h.inHand) if (o !== id) h.acted[o] = false;
  };

  switch (type) {
    case 'fold':
      h.folded[id] = true;
      h.lastAction[id] = 'pas';
      break;
    case 'check':
      if (toCall > 0) fail('Nie możesz czekać – sprawdź albo spasuj.');
      h.lastAction[id] = 'czeka';
      break;
    case 'call':
      if (toCall <= 0) fail('Nie ma czego sprawdzać – możesz czekać.');
      put(pk, id, toCall);
      h.lastAction[id] = h.allIn[id] ? 'all-in' : `sprawdza ${h.bets[id]}`;
      break;
    case 'raise': {
      const to = Math.floor(Number(amountRaw));
      if (!Number.isFinite(to)) fail('Nieprawidłowa kwota.');
      raiseTo(to, true);
      h.lastAction[id] = h.allIn[id] ? `all-in ${h.bets[id]}` : `${bet === 0 && toCall === 0 ? 'stawia' : 'przebija do'} ${h.bets[id]}`;
      break;
    }
    case 'allin': {
      const to = bet + chips;
      if (to <= h.currentBet) put(pk, id, chips);
      else raiseTo(to, false);
      h.lastAction[id] = `all-in ${h.bets[id]}`;
      break;
    }
    default:
      fail('Nieznany ruch.');
  }
  h.acted[id] = true;
  advance(pk, id);
}

/** Host/stall helper: check if possible, otherwise fold. */
export function pokerForce(pk) {
  const h = pk.hand;
  if (!handInProgress(pk) || !h.toAct) fail('Nikt teraz nie decyduje.');
  const toCall = h.currentBet - (h.bets[h.toAct] || 0);
  pokerAct(pk, h.toAct, toCall > 0 ? 'fold' : 'check');
}

function advance(pk, lastId) {
  const h = pk.hand;
  const live = h.inHand.filter((id) => !h.folded[id]);
  if (live.length === 1) return awardUncontested(pk, live[0]);
  const next = nextSeat(h.inHand, lastId, (id) => needsAction(h, id));
  if (next) {
    h.toAct = next;
    return;
  }
  const canAct = live.filter((id) => !h.allIn[id]);
  if (h.street === 'river' || canAct.length <= 1) return runOutAndShowdown(pk);
  // next street
  h.bets = {};
  h.currentBet = 0;
  h.minRaise = h.bb;
  h.acted = {};
  for (const id of live) if (!h.allIn[id]) delete h.lastAction[id];
  if (h.street === 'preflop') {
    h.board.push(h.deck.pop(), h.deck.pop(), h.deck.pop());
    h.street = 'flop';
  } else if (h.street === 'flop') {
    h.board.push(h.deck.pop());
    h.street = 'turn';
  } else {
    h.board.push(h.deck.pop());
    h.street = 'river';
  }
  h.toAct = nextSeat(h.inHand, pk.dealer, (id) => needsAction(h, id));
  if (!h.toAct) runOutAndShowdown(pk);
}

function awardUncontested(pk, winnerId) {
  const h = pk.hand;
  const pot = potOf(h);
  pk.chips[winnerId] += pot;
  h.results = { uncontested: true, winners: [{ id: winnerId, amount: pot }], hands: {} };
  finish(h);
}

function runOutAndShowdown(pk) {
  const h = pk.hand;
  while (h.board.length < 5) h.board.push(h.deck.pop());
  const live = h.inHand.filter((id) => !h.folded[id]);
  const evals = Object.fromEntries(live.map((id) => [id, bestHand([...h.hole[id], ...h.board])]));

  // Side pots by contribution levels.
  const won = {};
  const levels = [...new Set(live.map((id) => h.contrib[id] || 0))].sort((a, b) => a - b);
  let prev = 0;
  const allIds = Object.keys(h.contrib);
  const slice = (lo, hi) => allIds.reduce((s, id) => s + Math.max(0, Math.min(h.contrib[id], hi) - lo), 0);
  for (const level of levels) {
    const amount = slice(prev, level);
    if (amount > 0) {
      const eligible = live.filter((id) => (h.contrib[id] || 0) >= level);
      let best = [];
      for (const id of eligible) {
        if (!best.length) best = [id];
        else {
          const c = compareRanks(evals[id].rank, evals[best[0]].rank);
          if (c > 0) best = [id];
          else if (c === 0) best.push(id);
        }
      }
      const share = Math.floor(amount / best.length);
      let rest = amount - share * best.length;
      // odd chips go to the first winner left of the dealer
      for (const id of h.inHand) {
        if (!best.includes(id)) continue;
        won[id] = (won[id] || 0) + share + (rest > 0 ? 1 : 0);
        if (rest > 0) rest -= 1;
      }
    }
    prev = level;
  }
  // Money above the highest live contribution (folded over-contributions) → biggest live contributor.
  const leftover = slice(prev, Infinity);
  if (leftover > 0) {
    const top = live.reduce((a, b) => ((h.contrib[b] || 0) > (h.contrib[a] || 0) ? b : a));
    won[top] = (won[top] || 0) + leftover;
  }
  for (const [id, amount] of Object.entries(won)) pk.chips[id] += amount;

  h.results = {
    uncontested: false,
    winners: Object.entries(won)
      .map(([id, amount]) => ({ id, amount, hand: evals[id].name }))
      .sort((a, b) => b.amount - a.amount),
    hands: Object.fromEntries(live.map((id) => [id, { name: evals[id].name, best: evals[id].cards }])),
  };
  finish(h);
}

function finish(h) {
  h.street = 'showdown';
  h.over = true;
  h.toAct = null;
}

/** Host ends the minigame mid-hand → everyone gets their stake back. */
export function refundPokerHand(pk) {
  if (!handInProgress(pk)) return;
  for (const [id, c] of Object.entries(pk.hand.contrib)) pk.chips[id] += c;
  pk.hand.over = true;
  pk.hand.toAct = null;
  pk.hand.results = { refunded: true, winners: [], hands: {} };
}

/** Chips including what is currently in the pot (live standings). */
export const pokerStack = (pk, id) => pk.chips[id] + (handInProgress(pk) ? pk.hand.contrib[id] || 0 : 0);

/* ------------------------------------------------------------------ */
/* Player view                                                         */
/* ------------------------------------------------------------------ */

export function pokerView(pk, viewerId) {
  const h = pk.hand;
  const showdown = h?.over && h.results && !h.results.uncontested && !h.results.refunded;
  const seats = pk.seats.map((id) => ({
    id,
    chips: pk.chips[id],
    bet: h?.bets[id] || 0,
    inHand: !!h?.inHand.includes(id),
    folded: !!h?.folded[id],
    allIn: !!h?.allIn[id],
    dealer: pk.dealer === id,
    turn: h?.toAct === id,
    last: h?.lastAction[id] ?? null,
    cards: showdown && h.results.hands[id] ? h.hole[id] : null,
    handName: showdown ? h.results.hands[id]?.name ?? null : null,
  }));
  const next = blindsFor(pk.handNo + 1);
  if (!h) return { seats, hand: null, handNo: pk.handNo, nextBlinds: next, myChips: pk.chips[viewerId] ?? 0 };
  const bet = h.bets[viewerId] || 0;
  const chips = pk.chips[viewerId] ?? 0;
  const toCall = Math.max(0, h.currentBet - bet);
  return {
    seats,
    handNo: pk.handNo,
    nextBlinds: next,
    myChips: chips,
    hand: {
      street: h.street,
      board: h.board,
      pot: potOf(h),
      currentBet: h.currentBet,
      sb: h.sb,
      bb: h.bb,
      over: h.over,
      toAct: h.toAct,
      myHole: h.hole[viewerId] ?? null,
      myHandName: h.hole[viewerId] && h.board.length >= 3 && !h.folded[viewerId] ? bestHand([...h.hole[viewerId], ...h.board]).name : null,
      toCall: Math.min(toCall, chips),
      canCheck: toCall === 0,
      minRaiseTo: Math.min(h.currentBet + h.minRaise, bet + chips),
      maxRaiseTo: bet + chips,
      myBet: bet,
      results: h.results,
    },
  };
}
