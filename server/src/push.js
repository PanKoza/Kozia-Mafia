import webpush from 'web-push';

let enabled = false;
export let publicKey = null;

export function initPush({ VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT }) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('⚠️  Brak kluczy VAPID – powiadomienia push działają tylko przy otwartej karcie.');
    return;
  }
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:admin@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  publicKey = VAPID_PUBLIC_KEY;
  enabled = true;
}

/** Sends a push to every subscription of the player. Drops dead subscriptions. Returns true if anything changed. */
export async function pushToPlayer(player, payload) {
  if (!enabled || !player.pushSubs?.length) return false;
  const body = JSON.stringify(payload);
  let changed = false;
  await Promise.all(
    player.pushSubs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, body, { TTL: 3600, urgency: 'high' });
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          player.pushSubs = player.pushSubs.filter((s) => s.endpoint !== sub.endpoint);
          changed = true;
        }
      }
    })
  );
  return changed;
}
