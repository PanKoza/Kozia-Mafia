import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoatMark } from '../components/Logo.jsx';
import { Badge, Button, Input, Label, Panel, Spinner, useToast } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { adminAuth } from '../lib/storage.js';

const STATUS = { lobby: ['Poczekalnia', 'gold'], running: ['W toku', 'red'], ended: ['Zakończona', 'dark'] };

export default function AdminHome() {
  const [authed, setAuthed] = useState(() => !!adminAuth.get());
  return authed ? <Dashboard onLogout={() => { adminAuth.set(null); setAuthed(false); }} /> : <Login onLogin={() => setAuthed(true)} />;
}

function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <div className="room min-h-dvh flex items-center justify-center p-6">
      <form
        className="relative z-10 w-full max-w-sm bg-cream text-ink rounded-3xl border-2 border-ink p-6 space-y-4 shadow-[0_8px_0_#7A0C12]"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const { token } = await api('/admin/login', { method: 'POST', body: { password } });
            adminAuth.set(token);
            onLogin();
          } catch (err) {
            toast(err.message, 'error');
          } finally {
            setBusy(false);
          }
        }}
      >
        <GoatMark className="w-24 mx-auto" />
        <h1 className="font-display text-3xl text-center">Panel hosta</h1>
        <Input label="Hasło admina" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        <Button type="submit" className="w-full" busy={busy}>
          Zaloguj
        </Button>
      </form>
    </div>
  );
}

function Dashboard({ onLogout }) {
  const [games, setGames] = useState(null);
  const [form, setForm] = useState({ name: 'Kozia Mafia – Domek w górach', password: '', mafiaCount: 2, revealRoles: true });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const load = () =>
    api('/admin/games', { admin: true })
      .then(setGames)
      .catch((e) => {
        if (e.status === 401) onLogout();
        else toast(e.message, 'error');
      });

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const g = await api('/admin/games', { method: 'POST', admin: true, body: form });
      navigate(`/admin/game/${g.code}`);
    } catch (err) {
      toast(err.message, 'error');
      setBusy(false);
    }
  };

  return (
    <div className="room min-h-dvh p-4 safe-top safe-bottom">
      <div className="relative z-10 max-w-2xl mx-auto space-y-6">
        <header className="flex items-center gap-3 pt-2">
          <GoatMark className="w-12" />
          <div className="flex-1">
            <h1 className="font-display text-3xl leading-none">Panel hosta</h1>
            <Label>Kozia Mafia</Label>
          </div>
          <Button variant="ghost" className="!px-3 !py-2 text-xs" onClick={onLogout}>
            Wyloguj
          </Button>
        </header>

        <form onSubmit={create} className="bg-cream text-ink rounded-3xl border-2 border-ink p-5 space-y-4">
          <h2 className="font-display text-2xl">Nowa gra</h2>
          <Input label="Nazwa gry" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Hasło do gry (podajesz graczom)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={3} />
          <div>
            <span className="font-cond uppercase tracking-widest text-xs text-ink/70">Liczba mafiozów</span>
            <div className="flex items-center gap-3 mt-1">
              <Button type="button" variant="cream" className="!px-4" onClick={() => setForm({ ...form, mafiaCount: Math.max(1, form.mafiaCount - 1) })}>
                −
              </Button>
              <span className="font-display text-4xl w-12 text-center">{form.mafiaCount}</span>
              <Button type="button" variant="cream" className="!px-4" onClick={() => setForm({ ...form, mafiaCount: Math.min(10, form.mafiaCount + 1) })}>
                +
              </Button>
            </div>
          </div>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="w-5 h-5 accent-blood" checked={form.revealRoles} onChange={(e) => setForm({ ...form, revealRoles: e.target.checked })} />
            <span className="text-sm">Ujawniaj rolę gracza po jego eliminacji</span>
          </label>
          <Button type="submit" className="w-full" busy={busy}>
            Utwórz grę
          </Button>
        </form>

        <section>
          <Label className="mb-2">Twoje gry</Label>
          {!games ? (
            <Spinner />
          ) : games.length === 0 ? (
            <p className="text-cream/50 text-sm">Brak gier.</p>
          ) : (
            <div className="space-y-2">
              {games.map((g) => (
                <Link key={g.code} to={`/admin/game/${g.code}`} className="block">
                  <Panel className="flex items-center gap-3 active:bg-ink-line">
                    <div className="font-mono text-gold text-lg">{g.code}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{g.name}</div>
                      <div className="text-xs text-cream/50">
                        {g.players} graczy · {g.status === 'running' ? `dzień ${g.day}` : new Date(g.createdAt).toLocaleDateString('pl-PL')}
                      </div>
                    </div>
                    <Badge tone={STATUS[g.status][1]}>{STATUS[g.status][0]}</Badge>
                  </Panel>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
