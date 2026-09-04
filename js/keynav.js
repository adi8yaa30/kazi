/* ============================================================
   KAZI — SHARED ARROW-KEY NAVIGATION
   Every slider on the site registers itself here and one window
   listener routes the arrow keys to whichever registered slider is
   nearest the centre of the viewport — so the keys always drive the
   thing the visitor is actually looking at, without each page having
   to invent its own focus rules.
   ============================================================ */
(() => {
  const items = [];

  /* Typing, or working a native control, always wins over the sliders. */
  const isTyping = (el) => {
    if (!el) return false;
    if (el.isContentEditable) return true;
    return /^(input|textarea|select|option)$/i.test(el.tagName);
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

  function pick(vertical) {
    let best = null;
    let bestDist = Infinity;
    for (const it of items) {
      if (!it.el.isConnected) continue;
      if (vertical && !it.vertical) continue;
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

    let dir = 0;
    let vertical = false;
    if (e.key === 'ArrowRight') dir = 1;
    else if (e.key === 'ArrowLeft') dir = -1;
    else if (e.key === 'ArrowDown') { dir = 1; vertical = true; }
    else if (e.key === 'ArrowUp') { dir = -1; vertical = true; }
    else return;

    const it = pick(vertical);
    if (!it) return;                                 // nothing on screen: let the page scroll
    /* A slider that has run out of room returns false, and the key goes back
       to scrolling the page rather than dying under a preventDefault. */
    if (it.step(dir) === false) return;
    e.preventDefault();
  });

  /* register({ el, step, vertical, enabled })
       el       the slider's section — used to decide what is on screen
       step     called with +1 / -1; return false to decline the key
       vertical also answer Up/Down (for sliders that move that way)
       enabled  optional guard, e.g. while an overlay owns the keys */
  window.KaziKeyNav = {
    register(item) {
      if (!item || !item.el || typeof item.step !== 'function') return;
      items.push(item);
    },
  };
})();
