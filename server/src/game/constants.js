export const ROLES = {
  citizen: 'Obywatel',
  mafia: 'Mafioza',
};

export const SPECIAL_ROLES = {
  bodyguard: { field: 'bodyguardId', name: 'Ochroniarz' },
  sheriff: { field: 'sheriffId', name: 'Szeryf' },
};

/** Individual advantage cards — each can be won only once per game. */
export const CARDS = {
  double_vote: {
    name: 'Karta Podwójnego Głosu',
    game: 'poker',
    gameName: 'Kozi Poker',
    lowerIsBetter: false,
  },
  check: {
    name: 'Karta Sprawdzenia',
    game: 'memory',
    gameName: 'Pamięć Capo',
    lowerIsBetter: false,
  },
  immunity: {
    name: 'Karta Immunitetu',
    game: 'blackjack',
    gameName: 'Kozi Blackjack',
    lowerIsBetter: false,
  },
  shield: {
    name: 'Karta Ochrony przed Mafią',
    game: 'targets',
    gameName: 'Strzelnica Don Kozła',
    lowerIsBetter: false,
  },
};

/** Sanity limits for skill-game scores (anti-nonsense, not anti-cheat). */
export const SCORE_LIMITS = {
  memory: [0, 60],
  targets: [0, 200],
};

export const FRUITS = [
  { key: 'apple', name: 'Jabłka', emoji: '🍎' },
  { key: 'banana', name: 'Banany', emoji: '🍌' },
  { key: 'grape', name: 'Winogrona', emoji: '🍇' },
  { key: 'orange', name: 'Pomarańcze', emoji: '🍊' },
  { key: 'cherry', name: 'Wiśnie', emoji: '🍒' },
  { key: 'pear', name: 'Gruszki', emoji: '🍐' },
];

export const MARKET_ROUNDS = 4;
export const CARD_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 11=J 12=Q 13=K 14=A
