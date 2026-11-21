import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { GoatMark } from '../components/Logo.jsx';
import { Badge, Button, Label, Modal, Panel, Spinner, Title, useAction, useToast } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { CARD_INFO, PHASE_LABEL, SPECIAL } from '../lib/labels.js';
import { adminAuth } from '../lib/storage.js';
import { useGame } from '../lib/useGame.js';
import MinigameAdmin from './MinigameAdmin.jsx';
import Icon from '../components/Icon.jsx';

export default function AdminGame() {
  const { code } = useParams();
  const jwt = adminAuth.get();
  const auth = useMemo(() => (jwt ? { admin: true, jwt } : null), [jwt]);
  const { state: g, connected, gone, act } = useGame(code.toUpperCase(), auth);

  if (!jwt) return <Navigate to="/admin" replace />;
  if (gone)
    return (
      <div className="room min-h-dvh flex flex-col items-center justify-center p-8 text-center">
        <p className="relative z-10">{gone}</p>
        <Link to="/admin" className="relative z-10 mt-4 underline">
          Wróć do listy gier
        </Link>
      </div>
    );
  if (!g)
    return (
      <div className="room min-h-dvh flex items-center justify-center">
        <Spinner />
      </div>
    );
  return <Control g={g} act={act} connected={connected} />;
}

function Control({ g, act, connected }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [run, busy] = useAction(async (type, payload, okMsg) => {
    await act(type, payload);
    if (okMsg) toast(okMsg, 'success');
  });
  const [confirm, setConfirm] = useState(null);
  const [announce, setAnnounce] = useState('');

  const ask = (text, onYes) => setConfirm({ text, onYes });
  const inviteUrl = `${window.location.origin}/join/${g.code}`;
  const nick = (id) => g.players.find((p) => p.id === id)?.nick ?? '—';
  const alive = g.players.filter((p) => p.alive);
  const aliveMafia = alive.filter((p) => p.role === 'mafia').length;

  return (
    <div className="room min-h-dvh pb-16">
      <header className="sticky top-0 z-30 bg-ink/95 backdrop-blur border-b border-cream/10 safe-top">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-2">
          <Link to="/admin">
            <GoatMark className="w-10" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="font-display text-xl leading-none truncate">{g.name}</div>
            <div className="text-xs text-cream/50">
              <span className="font-mono text-gold">{g.code}</span> · {PHASE_LABEL[g.phase]}
              {g.status === 'running' && ` · dzień ${g.day}`}
            </div>
          </div>
          <span className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-blood-light animate-pulse'}`} title={connected ? 'Połączono' : 'Brak połączenia'} />
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto p-4 space-y-5">
        {/* ---------------- LOBBY ---------------- */}
        {g.status === 'lobby' && (
          <>
            <Panel tone="cream" className="text-center">
              <Label className="!text-ink/60">Zaproś graczy</Label>
              <div className="bg-white inline-block p-3 rounded-[4px] border-2 border-ink mt-3">
                <QRCodeSVG value={inviteUrl} size={180} fgColor="#121212" />
              </div>
              <div className="font-mono text-sm mt-3 break-all">{inviteUrl}</div>
              <div className="mt-2 text-sm">
                Hasło do gry: <b className="font-mono text-blood text-lg">{g.password}</b>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button
                  variant="cream"
                  onClick={() => {
                    navigator.clipboard?.writeText(`Kozia Mafia – dołącz do gry: ${inviteUrl}\nHasło: ${g.password}`);
                    toast('Skopiowano zaproszenie', 'success');
                  }}
                >
                  Kopiuj
                </Button>
                <Button
                  onClick={() =>
                    navigator.share
                      ? navigator.share({ title: 'Kozia Mafia', text: `Dołącz do gry! Hasło: ${g.password}`, url: inviteUrl }).catch(() => {})
                      : toast('Udostępnianie niedostępne – użyj Kopiuj', 'error')
                  }
                >
                  Udostępnij
                </Button>
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center justify-between">
                <Label>Liczba mafiozów</Label>
                <div className="flex items-center gap-3">
                  <Button variant="dark" className="!px-3 !py-1" onClick={() => run('settings', { mafiaCount: g.settings.mafiaCount - 1 })}>
                    −
                  </Button>
                  <span className="font-display text-3xl w-8 text-center">{g.settings.mafiaCount}</span>
                  <Button variant="dark" className="!px-3 !py-1" onClick={() => run('settings', { mafiaCount: g.settings.mafiaCount + 1 })}>
                    +
                  </Button>
                </div>
              </div>
              <p className="text-xs text-cream/50 mt-2">
                Sugestia: ok. 1 mafioza na 4 graczy (dla {g.players.length} graczy: {Math.max(1, Math.round(g.players.length / 4))}).
              </p>
              <label className="flex items-center gap-3 mt-3">
                <input type="checkbox" className="w-5 h-5 accent-blood" checked={g.settings.revealRoles} onChange={(e) => run('settings', { revealRoles: e.target.checked })} />
                <span className="text-sm">Ujawniaj rolę po eliminacji</span>
              </label>
            </Panel>

            <Panel>
              <Label className="mb-3">Gracze w poczekalni ({g.players.length})</Label>
              {g.players.length === 0 && <p className="text-sm text-cream/50">Czekamy na pierwszych graczy…</p>}
              <div className="flex flex-wrap gap-2">
                {g.players.map((p) => (
                  <span key={p.id} className="inline-flex items-center gap-2 rounded-full bg-ink border border-cream/20 pl-3 pr-1 py-1 text-sm">
                    {p.nick}
                    {p.hasPush && <span title="Powiadomienia włączone" className="text-gold"><Icon name="bell" size={13} /></span>}
                    <button className="w-6 h-6 rounded-full bg-blood/40 text-xs" onClick={() => ask(`Usunąć gracza ${p.nick}?`, () => run('kick', { playerId: p.id }))}>
                      <Icon name="x" size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </Panel>

            <Button className="w-full text-xl py-4" busy={busy} onClick={() => ask(`Rozpocząć grę? ${g.players.length} graczy, ${g.settings.mafiaCount} mafiozów. Role zostaną wylosowane.`, () => run('start', {}, 'Gra rozpoczęta!'))}>
              <Icon name="play" size={20} /> Rozpocznij grę
            </Button>
          </>
        )}

        {/* ---------------- RUNNING ---------------- */}
        {g.status === 'running' && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Żywi" value={alive.length} />
              <Stat label="Mafia" value={aliveMafia} tone="text-blood-light" />
              <Stat label="Obywatele" value={alive.length - aliveMafia} />
            </div>

            {g.minigame ? (
              <MinigameAdmin g={g} run={run} busy={busy} ask={ask} />
            ) : g.phase === 'city_vote' ? (
              <CityVoteAdmin g={g} run={run} busy={busy} nick={nick} ask={ask} />
            ) : g.phase === 'night' ? (
              <NightAdmin g={g} run={run} busy={busy} nick={nick} ask={ask} />
            ) : (
              <DayAdmin g={g} run={run} busy={busy} ask={ask} />
            )}

            <PlayersAdmin g={g} run={run} ask={ask} />

            <Panel>
              <Label className="mb-2">Ogłoszenie do wszystkich</Label>
              <div className="flex gap-2">
                <input value={announce} onChange={(e) => setAnnounce(e.target.value)} placeholder="np. Za 10 minut obrady w salonie!" className="flex-1 rounded-[3px] bg-ink border border-cream/15 px-3 py-2 outline-none" />
                <Button
                  className="!px-4"
                  disabled={!announce.trim()}
                  onClick={async () => {
                    await run('announce', { text: announce }, 'Wysłano');
                    setAnnounce('');
                  }}
                >
                  <Icon name="megaphone" size={18} />
                </Button>
              </div>
            </Panel>

            <Panel>
              <Label className="mb-2">Zakończ grę ręcznie</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="cream" className="text-xs !px-2" onClick={() => ask('Ogłosić wygraną obywateli?', () => run('end_game', { winner: 'citizens' }))}>
                  Obywatele
                </Button>
                <Button variant="primary" className="text-xs !px-2" onClick={() => ask('Ogłosić wygraną mafii?', () => run('end_game', { winner: 'mafia' }))}>
                  Mafia
                </Button>
                <Button variant="ghost" className="text-xs !px-2" onClick={() => ask('Przerwać grę bez zwycięzcy?', () => run('end_game', { winner: null }))}>
                  Przerwij
                </Button>
              </div>
            </Panel>
          </>
        )}

        {g.status === 'ended' && (
          <Panel tone="cream" className="text-center">
            <Icon name="trophy" size={40} stroke={1.3} className="mx-auto" />
            <Title>{g.winner === 'mafia' ? 'Mafia wygrała' : g.winner === 'citizens' ? 'Obywatele wygrali' : 'Gra przerwana'}</Title>
            <div className="mt-4 text-left space-y-1">
              {g.players.map((p) => (
                <div key={p.id} className="flex justify-between">
                  <span className={p.alive ? '' : 'line-through opacity-60'}>{p.nick}</span>
                  <span className={p.role === 'mafia' ? 'text-blood font-semibold' : ''}>{p.role === 'mafia' ? 'Mafioza' : 'Obywatel'}</span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Feed */}
        <Panel>
          <Label className="mb-2">Kronika</Label>
          <div className="max-h-72 overflow-y-auto space-y-1 text-sm">
            {[...g.feed].reverse().map((f) => (
              <div key={f.id} className="border-b border-cream/5 pb-1">
                <span className="text-cream/40 text-xs mr-2">{new Date(f.ts).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span>
                {f.text}
              </div>
            ))}
          </div>
        </Panel>

        {g.mafiaChat?.length > 0 && (
          <details className="rounded-[4px] bg-ink-soft border border-blood/30 p-4">
            <summary className="font-cond uppercase tracking-widest text-xs text-blood-light">Podgląd czatu mafii ({g.mafiaChat.length})</summary>
            <div className="mt-3 max-h-60 overflow-y-auto space-y-1 text-sm">
              {g.mafiaChat.map((m) => (
                <div key={m.id}>
                  <b className="text-gold">{m.nick}:</b> {m.text}
                </div>
              ))}
            </div>
          </details>
        )}

        <Button
          variant="danger"
          className="w-full text-sm"
          onClick={() =>
            ask('Usunąć tę grę na zawsze? Wszyscy gracze zostaną rozłączeni.', async () => {
              await api(`/admin/games/${g.code}`, { method: 'DELETE', admin: true });
              navigate('/admin');
            })
          }
        >
          Usuń grę
        </Button>
      </main>

      <Modal open={!!confirm} onClose={() => setConfirm(null)}>
        <p className="text-lg text-center">{confirm?.text}</p>
        <div className="grid grid-cols-2 gap-3 mt-6">
          <Button variant="cream" onClick={() => setConfirm(null)}>
            Nie
          </Button>
          <Button
            busy={busy}
            onClick={async () => {
              try {
                await confirm.onYes();
              } finally {
                setConfirm(null);
              }
            }}
          >
            Tak
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Stat({ label, value, tone = '' }) {
  return (
    <Panel className="text-center !p-3">
      <div className={`font-display text-3xl ${tone}`}>{value}</div>
      <Label>{label}</Label>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Phase panels                                                        */
/* ------------------------------------------------------------------ */

function DayAdmin({ g, run, busy, ask }) {
  const [mgModal, setMgModal] = useState(null);
  return (
    <>
      <Panel tone="cream">
        <Label className="!text-ink/60">Faza: dzień {g.day}</Label>
        <Title className="mt-1">Co teraz?</Title>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Button busy={busy} onClick={() => ask('Rozpocząć obrady miasta?', () => run('city_vote_start'))}>
            <Icon name="ballot" size={16} /> Obrady miasta
          </Button>
          <Button variant="dark" busy={busy} onClick={() => ask('Rozpocząć noc (obrady mafii)?', () => run('night_start'))}>
            <Icon name="moon" size={16} /> Noc mafii
          </Button>
        </div>
      </Panel>

      <Panel>
        <Label className="mb-3">Mini-gry o role specjalne</Label>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="gold" onClick={() => setMgModal({ kind: 'war', rewardRole: 'sheriff', rounds: 5 })}>
            <Icon name="swords" size={16} /> Wojna
          </Button>
          <Button variant="gold" onClick={() => setMgModal({ kind: 'market', rewardRole: 'bodyguard' })}>
            <Icon name="basket" size={16} /> Targ
          </Button>
        </div>
        <Label className="mb-3 mt-5">Gry zręcznościowe o karty</Label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(CARD_INFO).map(([k, c]) => {
            const taken = g.awardedCards.includes(k);
            return (
              <button
                key={k}
                disabled={taken}
                onClick={() => ask(`Rozpocząć „${c.game}” o kartę: ${c.full}?`, () => run('minigame_start', { kind: 'skill', card: k }))}
                className="rounded-[3px] bg-ink border border-cream/15 p-3 text-left disabled:opacity-30 active:bg-ink-line"
              >
                <Icon name={c.icon} size={24} className="text-gold" />
                <div className="font-semibold text-sm">{c.game}</div>
                <div className="text-[11px] text-cream/50">{taken ? 'karta już zdobyta' : c.full}</div>
              </button>
            );
          })}
        </div>
      </Panel>

      <Modal open={!!mgModal} onClose={() => setMgModal(null)} tone="dark">
        {mgModal && (
          <>
            <Title>{mgModal.kind === 'war' ? 'Wojna' : 'Targ'}</Title>
            <Label className="mt-4 mb-2">O jaką rolę gracie?</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(SPECIAL).map(([k, r]) => (
                <button key={k} onClick={() => setMgModal({ ...mgModal, rewardRole: k })} className={`rounded-[3px] p-3 border-2 ${mgModal.rewardRole === k ? 'bg-gold text-ink border-ink' : 'bg-ink border-cream/20'}`}>
                  <Icon name={r.icon} size={24} />
                  <div className="font-semibold">{r.name}</div>
                </button>
              ))}
            </div>
            {mgModal.kind === 'war' && (
              <>
                <Label className="mt-4 mb-2">Liczba rund: {mgModal.rounds}</Label>
                <input type="range" min={1} max={10} value={mgModal.rounds} onChange={(e) => setMgModal({ ...mgModal, rounds: Number(e.target.value) })} className="w-full accent-blood" />
              </>
            )}
            <p className="text-xs text-cream/50 mt-3">
              {(g.bodyguardId && mgModal.rewardRole === 'bodyguard') || (g.sheriffId && mgModal.rewardRole === 'sheriff')
                ? 'Uwaga: ta rola jest już zajęta – nominacja przekaże ją nowej osobie.'
                : 'Zwycięzca nominuje gracza (lub siebie) na wybraną rolę.'}
            </p>
            <Button
              className="w-full mt-4"
              busy={busy}
              onClick={async () => {
                await run('minigame_start', mgModal);
                setMgModal(null);
              }}
            >
              Start
            </Button>
          </>
        )}
      </Modal>
    </>
  );
}

function CityVoteAdmin({ g, run, busy, nick, ask }) {
  const votes = g.vote?.votes ?? {};
  const voters = g.players.filter((p) => p.alive);
  const tally = {};
  for (const [vid, tid] of Object.entries(votes)) {
    const w = g.players.find((p) => p.id === vid)?.effects.doubleVote ? 2 : 1;
    tally[tid] = (tally[tid] || 0) + w;
  }
  return (
    <Panel tone="cream">
      <Label className="!text-ink/60">Obrady miasta – dzień {g.day}</Label>
      <Title className="mt-1">
        Głosy: {Object.keys(votes).length}/{voters.length}
      </Title>
      {g.vote?.immune.length > 0 && <p className="text-sm mt-1">Immunitet: {g.vote.immune.map(nick).join(', ')}</p>}
      <div className="mt-4 space-y-1">
        {Object.entries(tally)
          .sort((a, b) => b[1] - a[1])
          .map(([tid, c]) => (
            <div key={tid} className="flex justify-between font-semibold">
              <span>{tid === 'skip' ? 'Wstrzymuję się' : nick(tid)}</span>
              <span>{c}</span>
            </div>
          ))}
      </div>
      <details className="mt-3">
        <summary className="text-sm text-ink/60">Kto na kogo (tylko host)</summary>
        <div className="mt-2 text-sm space-y-0.5">
          {voters.map((p) => (
            <div key={p.id}>
              {p.nick} → {votes[p.id] ? (votes[p.id] === 'skip' ? 'wstrzymuje się' : nick(votes[p.id])) : <i className="opacity-50">jeszcze nie</i>}
              {p.effects.doubleVote && ' (x2)'}
            </div>
          ))}
        </div>
      </details>
      <Button className="w-full mt-4" busy={busy} onClick={() => ask('Zamknąć głosowanie i ogłosić wynik?', () => run('city_vote_end'))}>
        Zakończ głosowanie
      </Button>
    </Panel>
  );
}

function NightAdmin({ g, run, busy, nick, ask }) {
  const votes = g.night?.votes ?? {};
  const mafia = g.players.filter((p) => p.alive && p.role === 'mafia');
  return (
    <Panel className="bg-[#0b0b14] border-cream/10">
      <Label>Noc {g.day}</Label>
      <Title className="mt-1">Obrady mafii</Title>
      <div className="mt-3 space-y-1 text-sm">
        {mafia.map((m) => (
          <div key={m.id}>
            {m.nick} → <b>{votes[m.id] ? nick(votes[m.id]) : '…'}</b>
          </div>
        ))}
      </div>
      <div className="mt-3 text-sm">
        Ochroniarz {g.bodyguardId ? `(${nick(g.bodyguardId)})` : '(brak)'} chroni: <b>{g.night?.protectId ? nick(g.night.protectId) : '—'}</b>
      </div>
      {g.players.some((p) => p.alive && p.effects.mafiaShield) && (
        <div className="text-sm mt-1">Karta ochrony: {g.players.filter((p) => p.alive && p.effects.mafiaShield).map((p) => p.nick).join(', ')}</div>
      )}
      <Button variant="gold" className="w-full mt-4" busy={busy} onClick={() => ask('Zakończyć noc i ogłosić poranek?', () => run('night_end'))}>
        <Icon name="sun" size={16} /> Zakończ noc
      </Button>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Players management                                                  */
/* ------------------------------------------------------------------ */

function PlayersAdmin({ g, run, ask }) {
  const toast = useToast();
  const [sel, setSel] = useState(null);
  const p = g.players.find((x) => x.id === sel);
  const rejoin = p ? `${window.location.origin}/join/${g.code}?t=${p.token}` : '';
  return (
    <Panel>
      <Label className="mb-3">Gracze – kliknij, by zarządzać</Label>
      <div className="space-y-1.5">
        {g.players.map((x) => (
          <button key={x.id} onClick={() => setSel(x.id)} className={`w-full flex items-center gap-2 rounded-[3px] px-3 py-2 text-left ${x.alive ? 'bg-ink' : 'bg-ink/40 opacity-60'}`}>
            <span className={`w-2 h-2 rounded-full ${x.role === 'mafia' ? 'bg-blood-light' : 'bg-cream'}`} />
            <span className={`flex-1 truncate ${x.alive ? '' : 'line-through'}`}>{x.nick}</span>
            {g.sheriffId === x.id && <span className="text-gold"><Icon name="badge" size={15} /></span>}
            {g.bodyguardId === x.id && <span className="text-gold"><Icon name="hand" size={15} /></span>}
            {x.cards.map((c) => (
              <span key={c.id} className={c.used ? 'opacity-30' : ''}>
                <Icon name={CARD_INFO[c.type].icon} size={15} />
              </span>
            ))}
            {x.hasPush && <span className="text-cream/40"><Icon name="bell" size={13} /></span>}
            <Badge tone={x.role === 'mafia' ? 'red' : 'dark'}>{x.role === 'mafia' ? 'Mafia' : 'Obyw.'}</Badge>
          </button>
        ))}
      </div>

      <Modal open={!!p} onClose={() => setSel(null)} tone="dark">
        {p && (
          <>
            <Title>{p.nick}</Title>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge tone={p.role === 'mafia' ? 'red' : 'cream'}>{p.role === 'mafia' ? 'Mafioza' : 'Obywatel'}</Badge>
              <Badge tone={p.alive ? 'gold' : 'dark'}>{p.alive ? 'Żyje' : 'Wyeliminowany'}</Badge>
            </div>
            {p.cards.length > 0 && (
              <p className="text-sm mt-3">
                Karty: {p.cards.map((c) => `${CARD_INFO[c.type].name}${c.used ? ' (użyta)' : ''}`).join(', ')}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {p.alive ? (
                <Button variant="danger" className="text-sm" onClick={() => ask(`Wyeliminować ${p.nick}?`, () => run('eliminate', { playerId: p.id }))}>
                  <Icon name="skull" size={16} /> Eliminuj
                </Button>
              ) : (
                <Button variant="cream" className="text-sm" onClick={() => run('revive', { playerId: p.id })}>
                  Przywróć
                </Button>
              )}
              <Button
                variant="ghost"
                className="text-sm"
                onClick={() => {
                  navigator.clipboard?.writeText(rejoin);
                  toast('Skopiowano link powrotu – wyślij go tylko temu graczowi!', 'success');
                }}
              >
                <Icon name="link" size={16} /> Link powrotu
              </Button>
              <Button variant="gold" className="text-sm" disabled={!p.alive} onClick={() => run('set_role', { role: 'sheriff', playerId: g.sheriffId === p.id ? null : p.id })}>
                {g.sheriffId === p.id ? 'Odbierz Szeryfa' : 'Daj Szeryfa'}
              </Button>
              <Button variant="gold" className="text-sm" disabled={!p.alive} onClick={() => run('set_role', { role: 'bodyguard', playerId: g.bodyguardId === p.id ? null : p.id })}>
                {g.bodyguardId === p.id ? 'Odbierz Ochr.' : 'Daj Ochroniarza'}
              </Button>
            </div>
            <Label className="mt-5 mb-2">Przyznaj kartę ręcznie</Label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(CARD_INFO).map(([k, c]) => (
                <button key={k} disabled={g.awardedCards.includes(k)} onClick={() => ask(`Dać ${p.nick}: ${c.full}?`, () => run('give_card', { playerId: p.id, card: k }))} className="rounded-[3px] bg-ink border border-cream/15 py-2 text-2xl disabled:opacity-20">
                  <Icon name={c.icon} size={22} className="mx-auto" />
                </button>
              ))}
            </div>
            <p className="text-[11px] text-cream/40 mt-3 break-all">Link powrotu pozwala graczowi wrócić po wyczyszczeniu przeglądarki. Nie udostępniaj go innym – daje dostęp do roli.</p>
          </>
        )}
      </Modal>
    </Panel>
  );
}
