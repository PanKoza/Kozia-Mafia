import mongoose from 'mongoose';

const GameSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    data: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true, minimize: false }
);
const GameModel = mongoose.model('Game', GameSchema);

/** In-memory game cache, persisted to MongoDB (if configured). */
export const games = new Map();
let useDb = false;
const timers = new Map();

export const dbStatus = () => (useDb ? 'connected' : 'memory-only');

/**
 * Connects to MongoDB without ever crashing the server: on failure it retries in the background.
 * Until connected, games live in memory; once connected, stored games are loaded (in-memory ones win)
 * and everything created in the meantime is persisted.
 */
export async function initStore(uri) {
  if (!uri) {
    console.warn('⚠️  Brak MONGODB_URI – gry będą trzymane tylko w pamięci (znikną po restarcie).');
    return;
  }
  let attempt = 0;
  const tryConnect = async () => {
    attempt += 1;
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
      const docs = await GameModel.find({}).lean();
      let loaded = 0;
      for (const d of docs) {
        if (d.data?.code && !games.has(d.code)) {
          games.set(d.code, d.data);
          loaded += 1;
        }
      }
      useDb = true;
      for (const g of games.values()) saveGame(g); // persist games created while offline
      console.log(`✅ MongoDB połączone, wczytano gier: ${loaded}`);
    } catch (e) {
      await mongoose.disconnect().catch(() => {});
      const wait = Math.min(60, 5 * attempt);
      console.error(`❌ Nie można połączyć z MongoDB (próba ${attempt}): ${e.message.split('\n')[0]}`);
      if (/whitelist|SSL|TLS|alert/i.test(e.message))
        console.error('   → Sprawdź w MongoDB Atlas: Network Access → dodaj 0.0.0.0/0 (Render nie ma stałego IP).');
      console.error(`   Ponawiam za ${wait} s. Do tego czasu gry są tylko w pamięci.`);
      setTimeout(tryConnect, wait * 1000);
    }
  };
  await tryConnect();
}

const serialize = (g) => {
  const out = {};
  for (const [k, v] of Object.entries(g)) if (!k.startsWith('_')) out[k] = v;
  return JSON.parse(JSON.stringify(out));
};

/** Debounced save of one game. */
export function saveGame(g) {
  if (!useDb) return;
  clearTimeout(timers.get(g.code));
  timers.set(
    g.code,
    setTimeout(async () => {
      timers.delete(g.code);
      try {
        await GameModel.updateOne({ code: g.code }, { code: g.code, data: serialize(g) }, { upsert: true });
      } catch (e) {
        console.error('Błąd zapisu gry', g.code, e.message);
      }
    }, 250)
  );
}

export async function deleteGame(code) {
  games.delete(code);
  clearTimeout(timers.get(code));
  if (useDb) await GameModel.deleteOne({ code });
}
