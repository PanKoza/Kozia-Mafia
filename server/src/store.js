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

export async function initStore(uri) {
  if (!uri) {
    console.warn('⚠️  Brak MONGODB_URI – gry będą trzymane tylko w pamięci (znikną po restarcie).');
    return;
  }
  await mongoose.connect(uri);
  useDb = true;
  const docs = await GameModel.find({}).lean();
  for (const d of docs) if (d.data?.code) games.set(d.code, d.data);
  console.log(`✅ MongoDB połączone, wczytano gier: ${games.size}`);
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
