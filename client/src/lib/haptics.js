export const vibrate = (pattern) => {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    /* unsupported (iOS) */
  }
};

export const HAPTIC = {
  tap: 15,
  ok: [30, 40, 30],
  error: [80, 50, 80],
  alert: [200, 100, 200, 100, 400],
  heartbeat: [100, 120, 100, 600, 100, 120, 100],
  dramatic: [500, 200, 150, 100, 150, 100, 800],
};
