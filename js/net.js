/* ============================================================
   KAZI — CONNECTION TIER (shared)
   Every page with video asks this how many clips it may run at once.

   Three tiers:
     slow    only the video being watched plays; everything else holds its
             poster and fetches nothing. On a weak signal a second stream is
             what turns a smooth watched video into a stalling one.
     normal  the watched video starts first, the rest follow once it runs.
     fast    everything on screen starts together — staging only costs time
             when there is bandwidth to spare.

   The browser's own report is used where one exists (Chrome and Android
   expose navigator.connection, including the data-saver flag). Safari reports
   nothing, so the tier is also learned from what actually happens: how long
   the first watched video takes to start, and whether playing video stalls.
   It only ever moves down on evidence of trouble within a visit, and back up
   only after a clean fast start — so it does not flap.
   ============================================================ */
(() => {
  const listeners = new Set();
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  /* The browser's report may only rate a connection *down*. Chrome caps its
     downlink figure at 10 Mbps, so an ordinary 10 Mbps line and a 100 Mbps
     one report the same number — trusting it upward would start every stream
     at once on exactly the connection where that stalls. "Fast" is earned
     from evidence instead (see watch()). */
  function fromBrowser() {
    if (!conn) return null;
    if (conn.saveData) return 'slow';
    const t = conn.effectiveType;               // 'slow-2g' | '2g' | '3g' | '4g'
    if (t === 'slow-2g' || t === '2g' || t === '3g') return 'slow';
    /* downlink is deliberately not used. Early in a visit Chrome reports a
       stale default (1.45 Mbps was seen on a 50 Mbps line) — a rule on it put
       fast connections into the slow tier before a single video had played. */
    return null;
  }

  let tier = fromBrowser() || 'normal';

  function set(next) {
    if (next === tier) return;
    tier = next;
    listeners.forEach((fn) => { try { fn(tier); } catch (_) {} });
  }

  if (conn && conn.addEventListener) {
    conn.addEventListener('change', () => { const b = fromBrowser(); if (b) set(b); });
  }

  /* Evidence from real playback. `watch(video)` is called on the video the
     visitor is looking at, just before it is asked to play. */
  /* Start time is a weak signal — one case-study reel takes over two seconds
     to show its first frame even on a 50 Mbps line — so only a genuinely slow
     start counts. A stall once playback has begun is the reliable one. */
  const SLOW_START_MS = 6000;   // a watched clip taking longer than this to show its first frame
  const FAST_START_MS = 600;    // … or shorter than this, with no stall since
  let stalls = 0;
  function watch(v) {
    if (!v || v.__kaziNet) return;
    v.__kaziNet = true;
    const t0 = performance.now();
    const started = () => {
      const ms = performance.now() - t0;
      if (ms > SLOW_START_MS) set('slow');
      else if (ms < FAST_START_MS && stalls === 0 && !(conn && conn.saveData)) set(tier === 'slow' ? 'normal' : 'fast');
    };
    v.addEventListener('playing', started, { once: true });
    /* a stall once playing has begun is the clearest sign of all */
    v.addEventListener('waiting', () => {
      if (v.currentTime > 0.2) { stalls++; set(tier === 'fast' ? 'normal' : 'slow'); }
    });
  }

  /* "Healthy" means safe to start another stream alongside this one: the
     browser expects to play through, or there are a few seconds in hand.
     Waiting only for the first frame was not enough — the next streams then
     arrived at the exact moment the watched clip had nothing banked, and it
     stalled right after starting, even on a fast line. */
  const HEALTHY_AHEAD_S = 4;
  function bufferedAhead(v) {
    const t = v.currentTime, b = v.buffered;
    for (let i = 0; i < b.length; i++) if (b.start(i) <= t + 0.1 && b.end(i) > t) return b.end(i) - t;
    return 0;
  }
  const healthy = (v) => !!v && (v.readyState >= 4 || bufferedAhead(v) >= HEALTHY_AHEAD_S);
  /* run cb once v is healthy — or after timeoutMs, so nothing waits forever;
     if releasing early does cause a stall, watch() drops the tier and the
     extra streams are paused again */
  function whenHealthy(v, cb, timeoutMs = 6000) {
    if (!v || healthy(v)) { cb(); return; }
    let fired = false, tm = 0;
    const evs = ['progress', 'canplaythrough', 'timeupdate'];
    const fire = () => {
      if (fired) return; fired = true;
      evs.forEach((e) => v.removeEventListener(e, check));
      v.removeEventListener('error', fire);
      clearTimeout(tm); cb();
    };
    const check = () => { if (healthy(v)) fire(); };
    evs.forEach((e) => v.addEventListener(e, check));
    v.addEventListener('error', fire);
    tm = setTimeout(fire, timeoutMs);
  }

  window.KaziNet = {
    tier: () => tier,
    healthy,
    whenHealthy,
    /* how many videos besides the watched one may play at the same time */
    ambient: (normalCap) => (tier === 'slow' ? 0 : tier === 'fast' ? Infinity : normalCap),
    /* whether extra videos should wait for the one before to be running */
    staggered: () => tier !== 'fast',
    watch,
    onChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
  };
})();
