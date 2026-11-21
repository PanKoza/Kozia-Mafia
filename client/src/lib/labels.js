export const CARD_INFO = {
  double_vote: {
    name: 'Podwójny Głos',
    full: 'Karta Podwójnego Głosu',
    icon: 'double',
    desc: 'Użyj w dzień, przed obradami miasta. W najbliższym głosowaniu Twój głos liczy się podwójnie.',
    game: 'Kozi Poker',
    gameDesc: "Texas Hold'em przy jednym stole dla wszystkich. Każdy zaczyna z 1000 żetonów, ciemne rosną co 10 rozdań. Kto ma najwięcej żetonów, gdy host zamknie stół, wygrywa.",
  },
  check: {
    name: 'Sprawdzenie',
    full: 'Karta Sprawdzenia',
    icon: 'lens',
    desc: 'Sprawdź jednego gracza – dowiesz się, czy jest Obywatelem, czy Mafiozą.',
    game: 'Pamięć Capo',
    gameDesc: 'Zapamiętaj i powtórz coraz dłuższą sekwencję. Najdłuższa poprawna sekwencja wygrywa.',
  },
  immunity: {
    name: 'Immunitet',
    full: 'Karta Immunitetu',
    icon: 'shield',
    desc: 'Użyj w dzień, przed obradami. W najbliższym głosowaniu miasta nikt nie może na Ciebie głosować.',
    game: 'Kozi Blackjack',
    gameDesc: 'Każdy dostaje 100 żetonów i gra przeciw krupierowi. Obstawiaj, ile chcesz – albo nie graj wcale. Kto ma najwięcej żetonów, gdy host zamknie kasyno, wygrywa.',
  },
  shield: {
    name: 'Ochrona przed Mafią',
    full: 'Karta Ochrony przed Mafią',
    icon: 'vest',
    desc: 'Użyj w dzień. Najbliższej nocy mafia nie może Cię wyeliminować.',
    game: 'Strzelnica Don Kozła',
    gameDesc: 'Strzelaj do mafiosów w kapeluszach, oszczędzaj obywateli. 20 sekund.',
  },
};

export const SPECIAL = {
  bodyguard: { name: 'Ochroniarz', icon: 'hand', desc: 'Każdej nocy może ochronić jedną osobę (także siebie) przed mafią.' },
  sheriff: { name: 'Szeryf', icon: 'badge', desc: 'Raz dziennie może sprawdzić, czy wybrany gracz jest mafią.' },
};

export const FRUIT_INFO = {
  apple: { name: 'Jabłka', emoji: '🍎' },
  banana: { name: 'Banany', emoji: '🍌' },
  grape: { name: 'Winogrona', emoji: '🍇' },
  orange: { name: 'Pomarańcze', emoji: '🍊' },
  cherry: { name: 'Wiśnie', emoji: '🍒' },
  pear: { name: 'Gruszki', emoji: '🍐' },
};

export const cardLabel = (v) => ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' })[v] || String(v);

export const PHASE_LABEL = {
  lobby: 'Poczekalnia',
  day: 'Dzień',
  city_vote: 'Obrady miasta',
  night: 'Noc',
  ended: 'Koniec gry',
};
