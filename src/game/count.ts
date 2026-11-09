/** Anonymous play counts: how many people play and how far they get. Each call only adds 1 to a per-day counter (functions/api/run.js):
 *  no cookies, no ids, nothing about the person. Fire and forget, so it can never get in the game's way. */
const QS = new URLSearchParams(location.search);
const DEV_LINK = ['bot', 'seek', 'hold', 'catch', 'last', 'drop', 'debug'].some(k => QS.has(k));   // test links and film captures
// ?count=test marks our own checks, which never reach the live numbers. A custom domain for the game would need adding here.
const TAG = QS.get('count') === 'test' ? 'test' : location.hostname === 'candle-run-8rz.pages.dev' && !DEV_LINK && !navigator.webdriver ? 'live' : '';

/** a run reports every MARK-th candle, so a run that is simply closed still shows how far it got */
export const MARK = 50;   // as in functions/api/run.js; each one is a request on the free daily quota shared with the City

export function count(e: 'open' | 'start' | 'at' | 'end', v = 0, how = '') {
  if (!TAG) return;
  try { navigator.sendBeacon('/api/run', JSON.stringify({ e, v, how, tag: TAG })); } catch { /* no beacon, no count */ }
}

/** this browser's run number, capped at 20 and sent with the 'start' count: 1 = a new player, 0 = storage blocked. It is the only thing kept on the device for counting */
export function runNumber() {
  try {
    const n = Math.min(20, (parseInt(localStorage.getItem('cr_runs') || '0', 10) || 0) + 1);
    localStorage.setItem('cr_runs', String(n));
    return n;
  } catch { return 0; }
}
