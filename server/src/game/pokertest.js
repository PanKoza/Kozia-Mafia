// Poker engine tests: node src/game/pokertest.js
import assert from 'assert/strict';
import { bestHand, compareRanks, initPoker, pokerAct, pokerView, startHand, refundPokerHand, pokerForce } from './poker.js';

const C = (str) =>
  str.split(' ').map((t) => {
    const r = { A: 14, K: 13, Q: 12, J: 11, T: 10 }[t[0]] ?? Number(t[0]);
    const s = 'shdc'.indexOf(t[1]);
    return { r, s };
  });

/* ---------- evaluator ---------- */
const name = (s) => bestHand(C(s)).name;
assert.equal(name('As Ks Qs Js Ts 2d 3c'), 'Poker królewski');
assert.equal(name('9h 8h 7h 6h 5h Ad Ac'), 'Poker');
assert.equal(name('9h 9d 9s 9c 5h Ad Ac'), 'Kareta');
assert.equal(name('9h 9d 9s 5c 5h Ad 2c'), 'Full');
assert.equal(name('2h 7h 9h Jh Kh Ad Ac'), 'Kolor');
assert.equal(name('Ah 2d 3s 4c 5h Kd Kc'), 'Strit');
assert.equal(name('Th Jd Qs Kc Ah 2d 2c'), 'Strit');
assert.equal(name('9h 9d 9s 5c 4h Ad 2c'), 'Trójka');
assert.equal(name('9h 9d 5s 5c 4h Ad 2c'), 'Dwie pary');
assert.equal(name('9h 9d 6s 5c 4h Ad 2c'), 'Para');
assert.equal(name('9h 8d 6s 5c 3h Ad 2c'), 'Wysoka karta');
const r = (s) => bestHand(C(s)).rank;
assert.ok(compareRanks(r('Ah 2d 3s 4c 5h 9d Jc'), r('2h 3d 4s 5c 6h 9d Jc')) < 0, 'wheel < 6-high straight');
assert.ok(compareRanks(r('Ah Ad Ks 7c 5h 3d 2c'), r('Ah Ad Qs 7c 5h 3d 2c')) > 0, 'kicker');
assert.ok(compareRanks(r('Kh Kd 9s 9c 2h 3d 4c'), r('Kh Kd 8s 8c Ah 3d 4c')) > 0, 'two pair second pair');
assert.equal(compareRanks(r('Ah Kd Qs Jc 9h 2d 3c'), r('Ad Kc Qh Js 9d 2s 3h')), 0, 'split');

/* ---------- table mechanics ---------- */
const total = (pk) => Object.values(pk.chips).reduce((a, b) => a + b, 0) + (pk.hand && !pk.hand.over ? Object.values(pk.hand.contrib).reduce((a, b) => a + b, 0) : 0);

// heads-up blinds: dealer posts SB and acts first preflop
{
  const pk = initPoker(['a', 'b']);
  startHand(pk);
  assert.equal(pk.dealer, 'a');
  assert.equal(pk.hand.bets.a, 10);
  assert.equal(pk.hand.bets.b, 20);
  assert.equal(pk.hand.toAct, 'a');
  pokerAct(pk, 'a', 'call');
  assert.equal(pk.hand.toAct, 'b'); // BB option
  pokerAct(pk, 'b', 'check');
  assert.equal(pk.hand.street, 'flop');
  assert.equal(pk.hand.board.length, 3);
  assert.equal(pk.hand.toAct, 'b'); // postflop: non-dealer first
  assert.throws(() => pokerAct(pk, 'a', 'check'), /nie Twoja kolej/);
  pokerAct(pk, 'b', 'raise', 50);
  assert.throws(() => pokerAct(pk, 'a', 'raise', 60), /Minimalne przebicie/);
  pokerAct(pk, 'a', 'fold');
  assert.ok(pk.hand.over);
  assert.equal(pk.chips.b, 1020); // pot 20+20+50
  assert.equal(pk.chips.a, 980);
  const v = pokerView(pk, 'a');
  assert.equal(v.seats.find((s) => s.id === 'b').cards, null, 'uncontested hand stays hidden');
}

// 3 players: hole cards of others are never in a player's view during the hand
{
  const pk = initPoker(['a', 'b', 'c']);
  startHand(pk);
  const v = pokerView(pk, 'a');
  assert.equal(v.hand.myHole.length, 2);
  assert.ok(v.seats.every((s) => s.cards === null));
  assert.ok(!JSON.stringify(v).includes('"deck"'));
}

// side pot: short all-in can only win what it covered
{
  const pk = initPoker(['a', 'b', 'c']);
  pk.chips = { a: 100, b: 1000, c: 1000 };
  startHand(pk); // dealer a, sb b, bb c, a acts first
  // rig cards: a has the nuts, b second best, c worst
  pk.hand.hole = { a: C('As Ah'), b: C('Ks Kh'), c: C('2c 7d') };
  pk.hand.deck = [...C('3d 8s 9c Jh Ad 4c 5d 6h'), ...pk.hand.deck];
  // deck pops from the end – put the board at the end
  pk.hand.deck = [...pk.hand.deck.slice(8), ...C('Jh 9c 8s 4d Ac').reverse()];
  pokerAct(pk, 'a', 'allin'); // 100
  pokerAct(pk, 'b', 'raise', 400);
  pokerAct(pk, 'c', 'call');
  // flop: b bets, c folds
  pokerAct(pk, 'b', 'raise', 200);
  pokerAct(pk, 'c', 'fold');
  assert.ok(pk.hand.over);
  // main pot 300 → a (aces); side pot (300+300 from b,c + b's uncalled 200) → b
  assert.equal(pk.chips.a, 300);
  assert.equal(pk.chips.b, 1000 - 600 + 600 + 200);
  assert.equal(pk.chips.c, 600);
  assert.equal(total(pk), 2100);
}

// randomized simulation: chips are conserved, hands always terminate
{
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  for (let game = 0; game < 30; game++) {
    const pk = initPoker(ids);
    for (let hand = 0; hand < 60; hand++) {
      if (ids.filter((id) => pk.chips[id] > 0).length < 2) break;
      startHand(pk);
      let guard = 0;
      while (!pk.hand.over) {
        assert.ok(guard++ < 200, 'hand did not terminate');
        const id = pk.hand.toAct;
        const v = pokerView(pk, id).hand;
        const roll = Math.random();
        try {
          if (roll < 0.03) pokerForce(pk);
          else if (roll < 0.15) pokerAct(pk, id, 'fold');
          else if (roll < 0.25) pokerAct(pk, id, 'allin');
          else if (roll < 0.45 && v.maxRaiseTo > v.minRaiseTo) pokerAct(pk, id, 'raise', v.minRaiseTo + Math.floor(Math.random() * (v.maxRaiseTo - v.minRaiseTo)));
          else pokerAct(pk, id, v.canCheck ? 'check' : 'call');
        } catch (e) {
          throw new Error(`hand ${hand}: ${e.message}`);
        }
        assert.equal(total(pk), ids.length * 1000, 'chips leaked mid-hand');
        assert.ok(Object.values(pk.chips).every((c) => c >= 0));
      }
      assert.equal(total(pk), ids.length * 1000, 'chips leaked after hand');
    }
  }
}

// refund when the host closes the table mid-hand
{
  const pk = initPoker(['a', 'b', 'c']);
  startHand(pk);
  pokerAct(pk, 'a', 'raise', 100);
  refundPokerHand(pk);
  assert.deepEqual(pk.chips, { a: 1000, b: 1000, c: 1000 });
}

console.log('✅ Testy pokera przeszły.');
