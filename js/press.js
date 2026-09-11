/* ============================================================
   KAZI — PRESS (shared)
   Buttons, nav links and the rolling links (data-roll) have their motion on
   hover, and a touchscreen has no hover. Here a tap plays it instead: the
   finger going down adds .is-pressed (the same look as hover).

   A link to another page on the site is held for a moment, so the motion is
   actually seen before the page goes. Anything else goes through at once —
   the pressed look still plays, then clears:
     - links that open a new tab (Instagram): a browser may block a tab
       opened after a delay, Safari especially
     - mailto: and tel: links, which hand off to another app
     - buttons, such as the contact form's [LET'S TALK]

   Only for touch and pen. A mouse or trackpad gets real hover and clicks
   through at once; so does the keyboard. Reduced motion clicks through at
   once too. A finger that starts a scroll instead cancels the press.
   ============================================================ */
(() => {
  const SEL = '.btn, .nav__links a, [data-roll]';
  const HOLD_MS = 450;               // from the finger going down to the page change
  const SHOW_MS = 700;               // how long the pressed look stays on a pass-through
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  let pressed = null, downAt = 0;
  const release = () => { if (pressed) pressed.classList.remove('is-pressed'); pressed = null; };

  /* only a same-tab, http(s) link is worth holding */
  const holds = (el) => el.tagName === 'A' && el.href &&
    (!el.target || el.target === '_self') && !el.hasAttribute('download') &&
    (el.protocol === 'http:' || el.protocol === 'https:');

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
     fade out before the roll could be seen. A held click is sent again once
     the motion has played; that second one passes straight through to the
     menu code and the browser as a normal click. */
  window.addEventListener('click', (e) => {
    const el = e.target.closest(SEL);
    if (!el || el !== pressed) return;
    if (el.__kaziPass) { el.__kaziPass = false; return; }
    if (reduced.matches || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { release(); return; }
    if (!holds(el)) {
      const wait = Math.max(SHOW_MS - (performance.now() - downAt), 0);
      setTimeout(() => { if (pressed === el) release(); }, wait);
      return;
    }
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
