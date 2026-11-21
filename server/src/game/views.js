import { CARDS } from './constants.js';
import { sellersOf } from './minigames.js';
import { seatView } from './blackjack.js';
import { pokerView } from './poker.js';

const stripPrivate = (obj) => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (!k.startsWith('_')) out[k] = v;
  return out;
};

/* ------------------------------------------------------------------ */
/* Player view – only what this player is allowed to know              */
/* ------------------------------------------------------------------ */

export function playerView(g, p) {
  const isMafia = p.role === 'mafia';
  const ended = g.status === 'ended';

  const players = g.players.map((x) => ({
    id: x.id,
    nick: x.nick,
    alive: x.alive,
    role: ended ? x.role : x.revealedRole || (isMafia && x.role === 'mafia' ? 'mafia' : null),
  }));

  let vote = null;
  if (g.phase === 'city_vote' && g.vote) {
    vote = {
      myVote: g.vote.votes[p.id] ?? null,
      immune: g.vote.immune,
      votedCount: Object.keys(g.vote.votes).length,
      totalVoters: g.players.filter((x) => x.alive).length,
    };
  }

  let night = null;
  if (g.phase === 'night' && g.night) {
    night = {};
    if (isMafia) night.mafiaVotes = g.night.votes;
    if (g.bodyguardId === p.id) night.protectId = g.night.protectId;
  }

  return {
    serverTime: Date.now(),
    me: {
      id: p.id,
      nick: p.nick,
      role: p.role,
      alive: p.alive,
      cards: p.cards,
      effects: p.effects,
      isBodyguard: g.bodyguardId === p.id,
      isSheriff: g.sheriffId === p.id,
      sheriffUsedToday: p.sheriffLastDay === g.day,
      inbox: p.inbox.slice(-50),
    },
    game: {
      code: g.code,
      name: g.name,
      status: g.status,
      phase: g.phase,
      day: g.day,
      winner: g.winner,
      settings: g.settings,
      bodyguardId: g.bodyguardId,
      sheriffId: g.sheriffId,
      awardedCards: g.awardedCards,
      feed: g.feed.slice(-80),
      lastVote: g.lastVote,
    },
    players,
    vote,
    night,
    mafiaChat: isMafia ? g.mafiaChat.slice(-100) : null,
    minigame: minigamePlayerView(g, p),
  };
}

function minigamePlayerView(g, p) {
  const mg = g.minigame;
  if (!mg) return null;
  const common = {
    id: mg.id,
    type: mg.type,
    stage: mg.stage,
    round: mg.round,
    totalRounds: mg.totalRounds,
    rewardRole: mg.rewardRole,
    participating: mg.participants.includes(p.id),
    participantCount: mg.participants.length,
    winnerId: mg.type === 'skill' ? (mg.winnerId === p.id ? p.id : null) : mg.winnerId,
    nomineeId: mg.nomineeId ?? null,
    tiebreak: mg.tiebreak ?? null,
  };

  if (mg.type === 'war') {
    const myPair = mg.pairs.find((x) => x.a === p.id || x.b === p.id);
    let duel = null;
    if (myPair) {
      const side = myPair.a === p.id ? 'A' : 'B';
      const other = side === 'A' ? 'B' : 'A';
      duel = {
        opponentId: side === 'A' ? myPair.b : myPair.a,
        myPick: myPair[`pick${side}`],
        opponentPicked: myPair[`pick${other}`] !== null,
        stake: myPair.stake,
        log: myPair.log.map((l) => ({ me: side === 'A' ? l.a : l.b, them: side === 'A' ? l.b : l.a })),
        done: myPair.done,
        winner: myPair.winner,
      };
    }
    return {
      ...common,
      hand: mg.hands[p.id] ?? [],
      scores: mg.scores,
      duel,
      bye: mg.byeId === p.id,
      // Finished duels are public (cards played + winner).
      pairs: mg.pairs.map((x) => ({ a: x.a, b: x.b, done: x.done, winner: x.winner, log: x.done ? x.log : [] })),
    };
  }

  if (mg.type === 'market') {
    const groupSizes = Object.fromEntries(mg.fruits.map((f) => [f, sellersOf(mg, f).length]));
    const results = mg.results.map((r) => ({
      round: r.round,
      perFruit: Object.fromEntries(
        Object.entries(r.perFruit).map(([f, v]) =>
          v.hidden ? [f, { sellers: v.sellers, hidden: true }] : [f, v]
        )
      ),
      mine: r.personal[p.id] ?? null,
    }));
    return {
      ...common,
      fruits: mg.fruits,
      groupSizes,
      myFruits: mg.holdings[p.id] ?? [],
      myTokens: mg.tokens[p.id] ?? null,
      tokenUsedThisRound: mg.tokenRound[p.id] === mg.round,
      myPrices: mg.prices[p.id] ?? null,
      pricedCount: Object.keys(mg.prices).length,
      myMoney: mg.money[p.id] ?? 0,
      results,
      announcements: mg.announcements,
      ranking:
        mg.stage === 'nomination' || mg.stage === 'finished'
          ? Object.entries(mg.money).map(([id, money]) => ({ id, money })).sort((a, b) => b.money - a.money)
          : null,
    };
  }

  if (mg.type === 'skill') {
    const lower = CARDS[mg.card].lowerIsBetter;
    const myScore = mg.scores[p.id];
    let myPlace = null;
    if (mg.stage === 'finished' && myScore !== undefined) {
      myPlace = 1 + Object.values(mg.scores).filter((s) => (lower ? s < myScore : s > myScore)).length;
    }
    return {
      ...common,
      card: mg.card,
      game: mg.game,
      myScore: myScore ?? null,
      submittedCount: Object.keys(mg.scores).length,
      myPlace,
      iWon: mg.winnerId === p.id,
      bj: mg.game === 'blackjack' ? seatView(mg.bj?.[p.id]) : undefined,
      poker: mg.game === 'poker' ? pokerView(mg.poker, p.id) : undefined,
    };
  }
  return common;
}

/* ------------------------------------------------------------------ */
/* Admin view – everything                                             */
/* ------------------------------------------------------------------ */

export function adminView(g) {
  const rest = stripPrivate(g);
  return {
    serverTime: Date.now(),
    ...rest,
    players: g.players.map(({ pushSubs, ...pl }) => ({ ...pl, hasPush: pushSubs.length > 0 })),
  };
}

export function gameSummary(g) {
  return {
    code: g.code,
    name: g.name,
    status: g.status,
    phase: g.phase,
    day: g.day,
    players: g.players.length,
    createdAt: g.createdAt,
    winner: g.winner,
  };
}
