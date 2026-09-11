/* ============================================================
   KAZI — PRESS (shared)
   Buttons and nav links have their motion on hover, and a touchscreen has
   no hover. Here a tap plays it instead: the finger going down adds
   .is-pressed (the same look as hover), and the page change is held for a
   moment so the fill or the roll is actually seen before the page goes.

   Only for touch and pen. A mouse or trackpad gets real hover and clicks
   through at once; so does the keyboard. Reduced motion clicks through at
   once too. A finger that starts a scroll instead cancels the press.
   ============================================================ */
(() => {
  const SEL = '.btn, .nav__links a';
  const HOLD_MS = 450;               // from the finger going down to the page change
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  let pressed = null, downAt = 0;
  const release = () => { if (pressed) pressed.classList.remove('is-pressed'); pressed = null; };

  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || e.button !== 0) return;
    const el = e.target.closest(SEL);
    if (!el) return;
    release();
    pressed = el; downAt = performance.now();
    el.classList.add('is-pressed');
  }, { passive: true });
  // a finger that turns into a scroll is not a press
  document.addEventListener('pointercancel', release, { passive: true });

  /* Capture phase on window, so this runs before the pages' own click
     handlers — the mobile menu closes itself on a link's click, and would
     fade out before the roll could be seen. The click is held, then sent
     again once the motion has played; that second one passes straight
     through to the menu code and the browser as a normal click. */
  window.addEventListener('click', (e) => {
    const el = e.target.closest(SEL);
    if (!el || el !== pressed) return;
    if (el.__kaziPass) { el.__kaziPass = false; return; }
    if (reduced.matches || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { release(); return; }
    e.preventDefault();
    e.stopPropagation();
    const wait = Math.max(0, HOLD_MS - (performance.now() - downAt));
    setTimeout(() => {
      el.__kaziPass = true;
      el.click();
      /* a same-page link (Home → #top) stays on this page: let the press go */
      setTimeout(release, 250);
    }, wait);
  }, true);

  /* coming back with the browser's back button can restore the page as it
     was left — pressed. Clear it. */
  window.addEventListener('pageshow', () => {
    document.querySelectorAll('.is-pressed').forEach((el) => el.classList.remove('is-pressed'));
    pressed = null;
  });
})();
