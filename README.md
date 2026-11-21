# 🐐 Kozia Mafia

Gra imprezowa na telefony inspirowana formatem „Mafia IRL”. Host (admin) prowadzi rozgrywkę z panelu, gracze dołączają przez link i grają w przeglądarce telefonu.

```
client/   React + Vite + Tailwind (PWA) → Vercel
server/   Node + Express + Socket.io + MongoDB → Render
```

## Uruchomienie lokalne

```bash
# 1. Backend
cd server
cp .env.example .env        # ustaw ADMIN_PASSWORD (MONGODB_URI opcjonalnie)
npm install
npm run dev                 # http://localhost:4000

# 2. Frontend
cd client
cp .env.example .env        # VITE_SERVER_URL=http://localhost:4000
npm install
npm run dev                 # http://localhost:5173 (też w sieci LAN – patrz adres „Network”)
```

Panel hosta: `/admin`. Test silnika gry: `cd server && npm test`.

Żeby przetestować na telefonach w tej samej sieci Wi‑Fi, ustaw w `client/.env` adres IP komputera, np. `VITE_SERVER_URL=http://192.168.1.20:4000`. Wibracje i powiadomienia działają w pełni dopiero na HTTPS (czyli po wdrożeniu).

## Wdrożenie

### 1. MongoDB Atlas
Załóż darmowy klaster M0, utwórz użytkownika bazy i skopiuj connection string (`mongodb+srv://…/kozia-mafia`). W „Network Access” dodaj `0.0.0.0/0` (Render nie ma stałego IP).

### 2. Klucze powiadomień push
```bash
cd server && npm run vapid
```
Zapisz `Public Key` i `Private Key`.

### 3. Backend → Render
New → Blueprint → wskaż repozytorium (plik `render.yaml`) **albo** New → Web Service z `Root Directory: server`, `Build: npm install`, `Start: npm start`.
Zmienne środowiskowe:

| Zmienna | Wartość |
|---|---|
| `MONGODB_URI` | connection string z Atlasa |
| `ADMIN_PASSWORD` | hasło do panelu hosta |
| `JWT_SECRET` | długi losowy ciąg |
| `CLIENT_URL` | adres z Vercela, np. `https://kozia-mafia.vercel.app` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | z kroku 2 |

> Darmowy plan Render usypia serwer po 15 min bezczynności (pierwsze połączenie trwa do ~1 min). Na czas wyjazdu warto przejść na płatny plan Starter albo otworzyć grę chwilę przed startem.

### 4. Frontend → Vercel
New Project → repozytorium → `Root Directory: client`, framework Vite. Zmienna: `VITE_SERVER_URL=https://<twoj-serwis>.onrender.com`. `vercel.json` obsługuje routing SPA i service workera.

## Jak grać

1. Host loguje się na `/admin`, tworzy grę (nazwa, hasło, liczba mafiozów) i udostępnia link/QR.
2. Gracze otwierają link → animowane intro z wibracją → nick + hasło → poczekalnia (warto włączyć powiadomienia).
3. Host klika **Rozpocznij grę** → losowanie ról, powiadomienie, ostrzeżenie o ochronie telefonu, samouczek, odsłonięcie roli (przytrzymaj kartę).
4. Każdy dzień host steruje fazami:
   - **Mini-gry**: ⚔️ Wojna i 🍎 Targ (nagroda: nominacja na Szeryfa/Ochroniarza), 4 gry zręcznościowe (nagroda: karty).
   - **🏛️ Obrady miasta**: wszyscy głosują, najwięcej głosów = eliminacja (remis/wstrzymanie = nikt).
   - **🌙 Noc mafii**: mafia wybiera ofiarę (głosy na żywo + tajny czat), Ochroniarz chroni.
5. Gra kończy się automatycznie: brak mafii → wygrywają Obywatele; mafii tyle co obywateli → wygrywa Mafia.

### Role specjalne
- **⭐ Szeryf** – raz dziennie sprawdza, czy gracz jest mafią.
- **💪 Ochroniarz** – co noc chroni jedną osobę (także siebie).
Obie role może dostać mafioza. Nominacja jest publiczna.

### Karty (każda może zostać zdobyta raz na grę) i gry o nie
| Karta | Gra zręcznościowa | Działanie |
|---|---|---|
| ✌️ Podwójny Głos | **Kozi Poker** – Texas Hold'em wszystkich graczy przy jednym stole; największy stos, gdy host zamknie stół | głos x2 w najbliższych obradach (aktywacja w dzień) |
| 🔎 Sprawdzenie | **Pamięć Capo** – najdłuższa zapamiętana sekwencja | sprawdza rolę jednego gracza |
| 🛡️ Immunitet | **Kozi Blackjack** – każdy ma 100 żetonów, gra przeciw krupierowi (lub nie gra); najwięcej żetonów, gdy host zamknie kasyno | nie można na Ciebie głosować w najbliższych obradach |
| 🦺 Ochrona przed Mafią | **Strzelnica Don Kozła** – trafiaj kapelusze, omijaj mleko (20 s) | mafia nie może Cię wyeliminować najbliższej nocy |

W grach zręcznościowych każdy gracz ma jedną próbę; zwycięzca dostaje kartę w tajemnicy.

**Kozi Poker** (No-Limit Texas Hold'em) liczony jest na serwerze: 1000 żetonów na start, ciemne 10/20 podwajane co 10 rozdań, pule poboczne przy all-in, karty przeciwników widać tylko przy odkryciu na końcu. Kolejne rozdanie startuje, gdy ktoś przy stole (albo host) kliknie „Następne rozdanie”. Host może „wymusić ruch” gracza, który zwleka (czekanie lub pas). Zamknięcie stołu w trakcie rozdania zwraca stawki; remis na szczycie rozstrzyga losowanie.

**Kozi Blackjack** liczony jest na serwerze (uczciwe losowanie). Zasady: min. zakład 5, krupier dobiera do 17, blackjack płaci 3:2, podwojenie na dwóch pierwszych kartach, bez splitu. Gracz sam decyduje, ile i czy w ogóle gra. Gdy host kończy grę, otwarte rozdania są zwracane, a remis na szczycie rozstrzyga losowanie.

### Wojna
Każdy ma talię 2–A, każdej wartości używa raz. Losowe pary co rundę, wyższa karta = punkt, remis = WOJNA (kolejne karty, stawka +1). Najwięcej punktów po N rundach (ustawia host) = nominacja. Remis na szczycie rozstrzyga losowanie.

### Targ
6 owoców (przy mniejszej liczbie graczy mniej rodzajów, żeby każda grupa miała ≥2 osoby), każdy gracz ma 2 różne, rozkład zrównoważony. 4 rundy: negocjacje → tajne ceny $1–5 → wyniki. Popyt = liczba sprzedawców owocu; całość sprzedaje najniższa cena (remis = podział). Żetony: 🔄 Zmiana (ogłaszana publicznie) i 🤐 Sekret (ukrywa wyniki owocu, także cudzego) – po jednym, max 1 na rundę.

## Zapamiętywanie sesji
Token gracza i ostatni stan gry są w `localStorage` – odświeżenie lub zamknięcie przeglądarki nie wylogowuje. Gdy ktoś wyczyści dane, host w panelu (klik w gracza → **Link powrotu**) wysyła mu osobisty link powrotu.

## Ograniczenia przeglądarek
- **iPhone**: wibracje nie działają w Safari (ograniczenie Apple). Powiadomienia push działają tylko po dodaniu gry do ekranu początkowego (iOS 16.4+).