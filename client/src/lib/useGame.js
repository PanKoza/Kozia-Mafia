import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { SERVER_URL } from './config.js';
import { stateCache } from './storage.js';

/**
 * Live connection to one game.
 * auth: { token } for players, { admin: true, jwt } for the host.
 */
export function useGame(code, auth, { onNotify } = {}) {
  const isAdmin = !!auth?.admin;
  const [state, setState] = useState(() => (!isAdmin && code ? stateCache.get(code) : null));
  const [connected, setConnected] = useState(false);
  const [gone, setGone] = useState(null);
  const socketRef = useRef(null);
  const notifyRef = useRef(onNotify);
  notifyRef.current = onNotify;
  const authKey = auth ? JSON.stringify(auth) : null;

  useEffect(() => {
    if (!code || !authKey) return;
    const a = JSON.parse(authKey);
    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'], reconnectionDelayMax: 4000 });
    socketRef.current = socket;

    const doAuth = () =>
      socket.emit('auth', { code, ...a, visible: document.visibilityState === 'visible' }, (res) => {
        if (res?.gone) setGone(res.error);
      });

    socket.on('connect', () => {
      setConnected(true);
      doAuth();
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('state', (s) => {
      setState(s);
      if (!a.admin) stateCache.set(code, s);
    });
    socket.on('notify', (n) => notifyRef.current?.(n));
    socket.on('kicked', () => setGone('Zostałeś usunięty z gry lub gra została skasowana.'));

    const onVis = () => socket.emit('visibility', document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code, authKey]);

  /** Emits an action; resolves with result or rejects with a Polish error message. */
  const act = useCallback(
    (type, payload = {}) =>
      new Promise((resolve, reject) => {
        const s = socketRef.current;
        if (!s?.connected) return reject(new Error('Brak połączenia – poczekaj chwilę.'));
        s.timeout(8000).emit(isAdmin ? 'admin' : 'action', { type, ...payload }, (err, res) => {
          if (err) return reject(new Error('Serwer nie odpowiada.'));
          if (res?.error) return reject(new Error(res.error));
          resolve(res?.result);
        });
      }),
    [isAdmin]
  );

  const emitRaw = useCallback((event, data) => socketRef.current?.emit(event, data), []);

  return { state, connected, gone, act, emitRaw };
}
