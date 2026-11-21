import { randomInt } from 'crypto';
import { fail } from './util.js';

/* Kozi Blackjack – rozgrywany na serwerze (uczciwe losowanie, brak oszukiwania).
 * Każdy gracz gra solo przeciw krupierowi swoją pulą żetonów.
 * Zasady: talia nieskończona (każda karta losowana z 52), krupier dobiera do 17,
 * blackjack płaci 3:2, podwojenie na dwóch pierwszych kartach, bez splitu.
 */

export const BJ_START_CHIPS = 100;
export const BJ_MIN_BET = 5;

const draw = () => ({ r: randomInt(13) + 1, s: randomInt(4) }); // r: 1=A … 11=J 12=Q 13=K

export function handValue(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.r === 1) {
      aces += 1;
      total += 11;
    } else total += Math.min(10, c.r);
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

const isBlackjack = (cards) => cards.length === 2 && handValue(cards) === 21;

export function initBlackjack(participants) {
  return Object.fromEntries(participants.map((id) => [id, { chips: BJ_START_CHIPS, hand: null, handsPlayed: 0, biggestWin: 0 }]));
}

function settle(seat, result) {
  const h = seat.hand;
  const payout = { blackjack: h.bet + Math.floor(h.bet * 1.5), win: h.bet * 2, push: h.bet, lose: 0, bust: 0 }[result];
  h.status = 'done';
  h.result = result;
  h.payout = payout;
  seat.chips += payout;
  seat.biggestWin = Math.max(seat.biggestWin, payout - h.bet);
}

function dealerPlay(seat) {
  const h = seat.hand;
  const pv = handValue(h.player);
  while (handValue(h.dealer) < 17) h.dealer.push(draw());
  const dv = handValue(h.dealer);
  if (dv > 21 || pv > dv) settle(seat, 'win');
  else if (pv === dv) settle(seat, 'push');
  else settle(seat, 'lose');
}

/** Applies one move. Returns nothing; seat is mutated. */
export function blackjackMove(seat, move, betRaw) {
  const h = seat.hand;
  if (move === 'deal') {
    if (h && h.status === 'playing') fail('Najpierw dokończ bieżące rozdanie.');
    const bet = Number(betRaw);
    if (!Number.isInteger(bet) || bet < 1) fail('Nieprawidłowa stawka.');
    if (seat.chips < 1) fail('Nie masz już żetonów.');
    if (bet > seat.chips) fail('Nie masz tylu żetonów.');
    if (bet < Math.min(BJ_MIN_BET, seat.chips)) fail(`Minimalna stawka to ${BJ_MIN_BET} żetonów.`);
    seat.chips -= bet;
    seat.handsPlayed += 1;
    seat.hand = { bet, player: [draw(), draw()], dealer: [draw(), draw()], status: 'playing', result: null, payout: 0, doubled: false };
    const pBJ = isBlackjack(seat.hand.player);
    const dBJ = isBlackjack(seat.hand.dealer);
    if (pBJ || dBJ) settle(seat, pBJ && dBJ ? 'push' : pBJ ? 'blackjack' : 'lose');
    return;
  }
  if (!h || h.status !== 'playing') fail('Najpierw postaw zakład i rozdaj karty.');
  if (move === 'hit') {
    h.player.push(draw());
    const v = handValue(h.player);
    if (v > 21) settle(seat, 'bust');
    else if (v === 21) dealerPlay(seat);
    return;
  }
  if (move === 'stand') return dealerPlay(seat);
  if (move === 'double') {
    if (h.player.length !== 2) fail('Podwoić można tylko na dwóch pierwszych kartach.');
    if (seat.chips < h.bet) fail('Za mało żetonów, by podwoić.');
    seat.chips -= h.bet;
    h.bet *= 2;
    h.doubled = true;
    h.player.push(draw());
    if (handValue(h.player) > 21) settle(seat, 'bust');
    else dealerPlay(seat);
    return;
  }
  fail('Nieznany ruch.');
}

/** When the host ends the game mid-hand, the stake is returned. */
export function refundOpenHand(seat) {
  if (seat.hand?.status === 'playing') {
    seat.chips += seat.hand.bet;
    seat.hand.status = 'done';
    seat.hand.result = 'refund';
    seat.hand.payout = seat.hand.bet;
  }
}

/** Player-safe view: hides the dealer's hole card while the hand is in play. */
export function seatView(seat) {
  if (!seat) return null;
  const h = seat.hand;
  return {
    chips: seat.chips,
    handsPlayed: seat.handsPlayed,
    hand: h && {
      bet: h.bet,
      status: h.status,
      result: h.result,
      payout: h.payout,
      doubled: h.doubled,
      player: h.player,
      playerValue: handValue(h.player),
      dealer: h.status === 'playing' ? [h.dealer[0], null] : h.dealer,
      dealerValue: h.status === 'playing' ? handValue([h.dealer[0]]) : handValue(h.dealer),
    },
  };
}
