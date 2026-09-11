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
    /* on dropping to slow, stop what the pages just paused from downloading */
    if (tier === 'slow') setTimeout(() => document.querySelectorAll('video').forEach(release), 300);
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
  const FAST_STARTS = 2;        // quick starts needed before "fast" — one small clip proves little
  const STALL_MS = 800;         // a 'waiting' blip shorter than this is not a stall
  let stalls = 0, quickStarts = 0;
  function watch(v) {
    if (!v || v.__kaziNet) return;
    v.__kaziNet = true;
    const t0 = performance.now();
    v.addEventListener('playing', () => {
      const ms = performance.now() - t0;
      if (ms > SLOW_START_MS) set('slow');
      else if (ms < FAST_START_MS && stalls === 0 && !(conn && conn.saveData) && ++quickStarts >= FAST_STARTS) {
        set(tier === 'slow' ? 'normal' : 'fast');
      }
    }, { once: true });
    /* A stall once playing has begun is the clearest sign of all — but only a
       real one. Chrome fires 'waiting' for momentary hiccups even on a fast
       line, and treating each as a stall sent a 50 Mbps visit to "slow".
       A stall steps the tier down one level, not straight to the bottom. */
    let tm = 0;
    const clear = () => { clearTimeout(tm); tm = 0; };
    v.addEventListener('waiting', () => {
      if (v.currentTime <= 0.2 || v.seeking || tm) return;
      tm = setTimeout(() => {
        tm = 0;
        if (!v.paused && v.readyState < 3) { stalls++; set(tier === 'fast' ? 'normal' : 'slow'); }
      }, STALL_MS);
    });
    v.addEventListener('playing', clear);
    v.addEventListener('pause', clear);
  }

  /* Pausing a video does not stop its download — a paused neighbour goes on
     buffering and keeps taking bandwidth from the one being watched. On the
     slow tier a paused video is released instead: its source is detached (the
     poster shows again) and put back, at the same point, the next time
     anything asks it to play. Patching play() covers every page's own player. */
  function release(v) {
    if (v.__kaziSrc || !v.paused || v.networkState !== HTMLMediaElement.NETWORK_LOADING) return;
    /* a clip is given either a src attribute or <source> children (the
       homepage cards) — either way, take it off and keep it to put back */
    const src = v.getAttribute('src');
    const sources = src ? [] : [...v.querySelectorAll('source')];
    if (!src && !sources.length) return;
    v.__kaziSrc = src ? { src } : { sources };
    v.__kaziAt = v.currentTime;
    if (src) v.removeAttribute('src');
    else sources.forEach((el) => el.remove());
    v.load();
  }
  const nativePlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (this.__kaziSrc) {
      const at = this.__kaziAt, kept = this.__kaziSrc;
      this.__kaziSrc = null;
      if (kept.src) this.setAttribute('src', kept.src);
      else { kept.sources.forEach((el) => this.appendChild(el)); this.load(); }
      if (at > 0) this.addEventListener('loadedmetadata', () => { try { this.currentTime = at; } catch (_) {} }, { once: true });
    }
    return nativePlay.apply(this, arguments);
  };
  document.addEventListener('pause', (e) => {
    const v = e.target;
    if (tier !== 'slow' || !(v instanceof HTMLVideoElement)) return;
    setTimeout(() => { if (tier === 'slow') release(v); }, 300);
  }, true);

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
