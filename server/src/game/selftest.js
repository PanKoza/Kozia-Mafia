// Quick engine self-test: node src/game/selftest.js
import assert from 'assert/strict';
import * as E from './engine.js';
import * as M from './minigames.js';
import { playerView, adminView } from './views.js';
import * as BJ from './blackjack.js';

const g = E.createGame({ name: 'Test', mafiaCount: 2 }, new Set());
const names = ['Ala', 'Bartek', 'Celina', 'Darek', 'Ewa', 'Franek', 'Gosia'];
for (const n of names) E.addPlayer(g, n);
assert.throws(() => E.addPlayer(g, 'ala'), /zajęty/);
E.startGame(g);
assert.equal(g.players.filter((p) => p.role === 'mafia').length, 2);

const mafia = g.players.filter((p) => p.role === 'mafia');
const cits = g.players.filter((p) => p.role === 'citizen');

// Views hide roles
const cv = playerView(g, cits[0]);
assert.ok(cv.players.every((p) => p.role === null));
const mv = playerView(g, mafia[0]);
assert.equal(mv.players.filter((p) => p.role === 'mafia').length, 2);
assert.ok(!JSON.stringify(cv).includes('token'));

// Skill game (client-scored) → card
M.startMinigame(g, { kind: 'skill', card: 'shield' });
M.skillSubmit(g, cits[1], 12);
M.skillSubmit(g, cits[2], 9);
assert.throws(() => M.skillSubmit(g, cits[1], 100), /jedną próbę/);
M.advanceMinigame(g);
assert.equal(g.minigame.winnerId, cits[1].id);
M.closeMinigame(g);

// Blackjack → immunity card
assert.equal(BJ.handValue([{ r: 1 }, { r: 13 }]), 21);
assert.equal(BJ.handValue([{ r: 1 }, { r: 1 }, { r: 9 }]), 21);
assert.equal(BJ.handValue([{ r: 10 }, { r: 6 }, { r: 1 }, { r: 9 }]), 26);
M.startMinigame(g, { kind: 'skill', card: 'immunity' });
const bjSeat = g.minigame.bj[cits[0].id];
assert.equal(bjSeat.chips, 100);
assert.throws(() => M.blackjackAction(g, cits[0], { move: 'deal', bet: 500 }), /tylu żetonów/);
assert.throws(() => M.blackjackAction(g, cits[0], { move: 'hit' }), /postaw zakład/);
for (let i = 0; i < 40 && bjSeat.chips >= 5; i++) {
  const before = bjSeat.chips;
  M.blackjackAction(g, cits[0], { move: 'deal', bet: 5 });
  while (bjSeat.hand.status === 'playing') M.blackjackAction(g, cits[0], { move: BJ.handValue(bjSeat.hand.player) < 15 ? 'hit' : 'stand' });
  const delta = bjSeat.chips - before;
  assert.ok([-5, 0, 5, 7].includes(delta), `nieoczekiwany wynik rozdania: ${delta}`);
  const pv = playerView(g, cits[0]).minigame.bj;
  assert.equal(pv.chips, bjSeat.chips);
}
// open hand gets refunded when host ends; force a known winner
if (bjSeat.chips >= 5) M.blackjackAction(g, cits[0], { move: 'deal', bet: 5 });
const hidden = playerView(g, cits[0]).minigame.bj.hand;
if (hidden.status === 'playing') assert.equal(hidden.dealer[1], null);
bjSeat.chips += 1000;
M.advanceMinigame(g);
assert.equal(g.minigame.winnerId, cits[0].id);
assert.ok(cits[0].cards.some((c) => c.type === 'immunity'));
M.closeMinigame(g);
assert.throws(() => M.startMinigame(g, { kind: 'skill', card: 'immunity' }), /już zdobyta/);

// Poker → double vote card
M.startMinigame(g, { kind: 'skill', card: 'double_vote' });
const pk = g.minigame.poker;
assert.equal(pk.handNo, 1);
const actor = g.players.find((x) => x.id === pk.hand.toAct);
assert.throws(() => M.pokerAction(g, g.players.find((x) => x.id !== actor.id && pk.hand.inHand.includes(x.id)), { move: 'fold' }), /nie Twoja kolej/);
M.pokerAction(g, actor, { move: 'raise', amount: 100 });
while (!pk.hand.over) M.pokerHost(g, 'force');
assert.ok(pk.hand.results.winners.length >= 1);
M.pokerAction(g, actor, { move: 'next' });
assert.equal(pk.handNo, 2);
assert.equal(Object.values(g.minigame.scores).reduce((a, b) => a + b, 0), g.players.length * 1000);
const pview = playerView(g, cits[3]).minigame.poker;
assert.ok(pview.seats.every((s) => s.cards === null));
M.advanceMinigame(g);
assert.ok(g.players.find((x) => x.id === g.minigame.winnerId).cards.some((c) => c.type === 'double_vote'));
M.closeMinigame(g);

// War
M.startMinigame(g, { kind: 'war', rewardRole: 'sheriff', rounds: 3 });
for (let r = 0; r < 3; r++) {
  M.advanceMinigame(g); // start round
  const mg = g.minigame;
  for (const pair of mg.pairs) {
    while (!pair.done) {
      const pa = g.players.find((p) => p.id === pair.a);
      const pb = g.players.find((p) => p.id === pair.b);
      M.warPlay(g, pa, mg.hands[pa.id][mg.hands[pa.id].length - 1]);
      M.warPlay(g, pb, mg.hands[pb.id][0]);
    }
  }
  assert.equal(mg.stage, 'round_result');
}
M.advanceMinigame(g); // → winner
assert.equal(g.minigame.stage, 'nomination');
const winner = g.players.find((p) => p.id === g.minigame.winnerId);
M.nominate(g, winner, cits[2].id);
assert.equal(g.sheriffId, cits[2].id);
M.closeMinigame(g);

// Market
M.startMinigame(g, { kind: 'market', rewardRole: 'bodyguard' });
const mk = g.minigame;
for (const [id, fs] of Object.entries(mk.holdings)) assert.notEqual(fs[0], fs[1]);
const counts = {};
Object.values(mk.holdings).flat().forEach((f) => (counts[f] = (counts[f] || 0) + 1));
assert.ok(Math.max(...Object.values(counts)) - Math.min(...Object.values(counts)) <= 1);
const p0 = g.players[0];
M.marketToken(g, p0, { kind: 'secret', fruit: mk.fruits[0] });
assert.throws(() => M.marketToken(g, p0, { kind: 'change', from: mk.holdings[p0.id][0], to: 'x' }), /użyłeś już/);
for (let r = 0; r < 4; r++) {
  M.advanceMinigame(g); // pricing
  for (const p of g.players) {
    const prices = {};
    for (const f of mk.holdings[p.id]) prices[f] = p === p0 ? 4 : 5;
    M.marketSetPrices(g, p, prices);
  }
  M.advanceMinigame(g); // results
  M.advanceMinigame(g); // next round / winner
}
assert.equal(mk.stage, 'nomination');
assert.equal(mk.winnerId, p0.id);
const pv = playerView(g, g.players[1]);
assert.ok(pv.minigame.results[0].perFruit[mk.fruits[0]].hidden);
M.hostNominate(g, cits[3].id);
assert.equal(g.bodyguardId, cits[3].id);
M.closeMinigame(g);

// Card use + city vote with immunity
const immCard = cits[0].cards.find((c) => c.type === 'immunity');
E.useCard(g, cits[0], immCard.id);
E.startCityVote(g);
assert.deepEqual(g.vote.immune, [cits[0].id]);
assert.throws(() => E.castCityVote(g, mafia[0], cits[0].id), /immunitet/);
for (const p of g.players) E.castCityVote(g, p, p.id === mafia[0].id ? cits[1].id : mafia[0].id);
E.endCityVote(g);
assert.equal(mafia[0].alive, false);
assert.equal(g.lastVote.outcome, 'eliminated');

// Night: bodyguard saves target
E.startNight(g);
E.mafiaVote(g, mafia[1], cits[4].id);
E.bodyguardProtect(g, cits[3], cits[4].id);
E.endNight(g);
assert.equal(cits[4].alive, true);
assert.equal(g.day, 2);

// Sheriff
const res = E.sheriffCheck(g, cits[2], mafia[1].id);
assert.equal(res.isMafia, true);
assert.throws(() => E.sheriffCheck(g, cits[2], cits[0].id), /jutro/);

// Night kill then vote out last mafia → citizens win
E.startNight(g);
E.mafiaVote(g, mafia[1], cits[0].id);
E.endNight(g);
assert.equal(cits[0].alive, false);
E.startCityVote(g);
for (const p of g.players.filter((x) => x.alive)) E.castCityVote(g, p, p.id === mafia[1].id ? 'skip' : mafia[1].id);
E.endCityVote(g);
assert.equal(g.status, 'ended');
assert.equal(g.winner, 'citizens');
assert.ok(adminView(g).players[0].token);
console.log('✅ Wszystkie testy silnika przeszły. Feed:');
console.log(g.feed.map((f) => '  ' + f.text).join('\n'));
