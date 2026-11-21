import { api } from './api.js';

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window;

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

const urlB64ToUint8 = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

/** Asks for permission (call from a user gesture) and registers a push subscription via `emit`. */
export async function enableNotifications(emit) {
  if (!pushSupported()) return 'unsupported';
  let perm = Notification.permission;
  if (perm === 'default') perm = await Notification.requestPermission();
  if (perm !== 'granted') return perm;
  await subscribePush(emit);
  return 'granted';
}

/** Silent re-subscribe when permission is already granted. */
export async function subscribePush(emit) {
  if (!pushSupported() || Notification.permission !== 'granted') return;
  try {
    const reg = (await navigator.serviceWorker.getRegistration()) || (await registerSW());
    if (!reg || !('pushManager' in reg)) return;
    const { publicKey } = await api('/push/key');
    if (!publicKey) return;
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(publicKey) });
    emit(sub.toJSON());
  } catch (e) {
    console.warn('Push subscribe failed', e);
  }
}

/** Local notification while the page is open but in the background. */
export async function localNotify(title, body) {
  if (!pushSupported() || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: '/icons/icon-192.png', tag: 'kozia-mafia', renotify: true, vibrate: [200, 100, 200] });
    else new Notification(title, { body, icon: '/icons/icon-192.png' });
  } catch {
    /* ignore */
  }
}
