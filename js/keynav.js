/* ============================================================
   KAZI — SHARED SLIDER INPUT (keyboard + trackpad)
   Every slider on the site registers itself here. One window listener
   routes the arrow keys to whichever registered slider is nearest the
   centre of the viewport — so the keys always drive the thing the
   visitor is actually looking at, without each page having to invent
   its own focus rules — and each slider gets a wheel listener of its
   own, so a two-finger sideways swipe on a trackpad moves it the way
   a drag does.
   ============================================================ */
(() => {
  const items = [];

  /* Typing, or working a native control, always wins over the sliders. */
  const isTyping = (el) => {
    if (!el) return false;
    if (el.isContentEditable) return true;
    return /^(input|textarea|select|option)$/i.test(el.tagName);
  };

  /* Things Space is meant to activate rather than reach the reels. */
  const isPressable = (el) => {
    if (!el || !el.closest) return false;
    return !!el.closest('button, a[href], summary, [role="button"], [tabindex]');
  };

  /* How far the slider's midline sits from the middle of the screen, or
     null when too little of it is on screen to be what the visitor means. */
  function centreOffset(el) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;          // hidden / not laid out
    const vh = window.innerHeight;
    const shown = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    if (shown < Math.min(r.height, vh) * 0.35) return null;
    return Math.abs((r.top + r.bottom) / 2 - vh / 2);
  }

  function pick(want) {
    let best = null;
    let bestDist = Infinity;
    for (const it of items) {
      if (!it.el.isConnected) continue;
      if (want === 'vertical' && !it.vertical) continue;
      if (want === 'toggle' && typeof it.toggle !== 'function') continue;
      if (it.enabled && !it.enabled()) continue;
      const d = centreOffset(it.el);
      if (d === null || d >= bestDist) continue;
      best = it; bestDist = d;
    }
    return best;
  }

  window.addEventListener('keydown', (e) => {
    if (e.defaultPrevented) return;                  // a page handler got there first
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (isTyping(e.target)) return;

    /* Space pauses and resumes whatever is playing, the same as clicking the
       reel. A focused button or link keeps the key — Space is how those are
       pressed. */
    if (e.key === ' ' || e.key === 'Spacebar') {
      if (isPressable(e.target)) return;
      const t = pick('toggle');
      if (!t) return;                                // let the page page-down
      e.preventDefault();
      t.toggle();
      return;
    }

    let dir = 0;
    let want = 'any';
    if (e.key === 'ArrowRight') dir = 1;
    else if (e.key === 'ArrowLeft') dir = -1;
    else if (e.key === 'ArrowDown') { dir = 1; want = 'vertical'; }
    else if (e.key === 'ArrowUp') { dir = -1; want = 'vertical'; }
    else return;

    const it = pick(want);
    if (!it) return;                                 // nothing on screen: let the page scroll
    /* A slider that has run out of room returns false, and the key goes back
       to scrolling the page rather than dying under a preventDefault. */
    if (it.step(dir) === false) return;
    e.preventDefault();
  });

  /* A two-finger sideways swipe arrives as wheel events carrying deltaX.
     They come in a long stream — the gesture plus the trackpad's inertia —
     so the deltas accumulate to a threshold and then the slider is locked
     out briefly, otherwise one flick would run through every slide. */
  const STEP_DELTA = 60;      // how far a swipe travels before it counts
  const SETTLE_MS = 320;      // roughly one slide's animation

  function bindWheel(it) {
    let acc = 0;
    let locked = false;
    let lastAt = 0;

    it.el.addEventListener('wheel', (e) => {
      /* A mostly-vertical wheel is the page scrolling past, not a swipe at
         the slider — leave it alone, including on a mouse's single wheel. */
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      if (it.enabled && !it.enabled()) return;

      e.preventDefault();     // stop the browser treating it as back/forward

      const now = e.timeStamp || Date.now();
      if (now - lastAt > 200) { acc = 0; locked = false; }   // a fresh gesture
      lastAt = now;
      if (locked) return;     // still riding the inertia of the last step

      acc += e.deltaX;
      if (Math.abs(acc) < STEP_DELTA) return;

      const dir = acc > 0 ? 1 : -1;
      acc = 0;
      if (it.step(dir) === false) return;
      locked = true;
      setTimeout(() => { locked = false; }, SETTLE_MS);
    }, { passive: false });
  }

  /* register({ el, step, vertical, toggle, enabled })
       el       the slider's section — decides what is on screen, and takes
                the wheel listener for trackpad swipes
       step     called with +1 / -1; return false to decline the input
       vertical also answer Up/Down (for sliders that move that way)
       toggle   optional; Space calls it (pause / resume the active reel)
       enabled  optional guard, e.g. while an overlay owns the input */
  window.KaziKeyNav = {
    register(item) {
      if (!item || !item.el || typeof item.step !== 'function') return;
      items.push(item);
      bindWheel(item);
    },
  };
})();
