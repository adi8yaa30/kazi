/* ============================================================
   KAZI — RAB CASE STUDY
   Nav reveal (shared behaviour), entry fade-up after the
   card-to-hero transition, reel playback: the centre reel plays
   WITH audio (no control to mute), the sides play muted.
   ============================================================ */
(() => {
  /* ---------- Nav: shown at the top, hides on scroll down ---------- */
  const nav = document.getElementById('nav');
  if (nav) {
    const applyNav = () => nav.classList.toggle('is-visible', window.scrollY <= 10);
    applyNav();
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(() => { applyNav(); ticking = false; }); ticking = true; }
    }, { passive: true });
  }

  /* ---------- Entry fade-up (hero stays put for continuity) ---------- */
  const main = document.querySelector('.cs');
  let fromTransition = false;
  try { fromTransition = sessionStorage.getItem('csEnter') === '1'; sessionStorage.removeItem('csEnter'); } catch (e) {}
  if (main && fromTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    main.classList.add('cs--enter');
    requestAnimationFrame(() => requestAnimationFrame(() => main.classList.add('cs--enter-play')));
  }

  /* ---------- Reels: slideable strip ----------
     Drag (or tap a side reel) to move the strip; whichever reel lands in
     the centre becomes active — full size, unblurred, audio ON. Tapping
     the active reel toggles pause. Geometry mirrors the CSS sizes. */
  const row = document.getElementById('csReelsRow');
  if (row && typeof gsap !== 'undefined') {
    const reels = [...row.children];
    const vids = reels.map((el) => el.querySelector('video'));

    /* Safari will not start a clip that has nothing buffered, and every reel
       here is preload="none" — a bare play() is refused, which is why playback
       only began after a click. Nudge the load, then play once the clip is
       actually playable. Chromium was never fussy, so this changes nothing
       there. */
    function safePlay(v) {
      const go = () => v.play().catch(() => {});
      if (v.readyState >= 2) { go(); return; }
      v.preload = 'auto';
      v.addEventListener('canplay', go, { once: true });
      if (v.networkState === HTMLMediaElement.NETWORK_EMPTY) v.load();
      go();
    }

    const nR = reels.length;
    let active = 2;              // reel-3 starts in the centre
    let soundOK = true;          // flips to false if autoplay-with-sound is blocked
    let paused = false;
    let dragging = false, sx = 0, dx = 0, startRX = 0;

    const isMobile = () => window.innerWidth <= 768;
    const wFor = (d) => window.innerWidth * (isMobile() ? (d ? 0.34 : 0.56) : (d ? 0.227 : 0.234));
    const gapPx = () => Math.min(Math.max(window.innerWidth * 0.0125, 10), 18);
    const xFor = (k) => window.innerWidth / 2 - (k * (wFor(1) + gapPx()) + wFor(0) / 2);

    function applyClasses() {
      reels.forEach((el, i) => {
        const d = Math.abs(i - active);
        el.classList.toggle('cs__reel--center', d === 0);
        el.classList.toggle('cs__reel--near', d === 1);
        el.classList.toggle('cs__reel--far', d >= 2);
      });
    }
    function syncAudio() {
      vids.forEach((v, i) => {
        if (i === active) {
          v.muted = !soundOK;
          if (!paused) safePlay(v);
        } else {
          v.muted = true;
          safePlay(v);
        }
      });
    }
    /* Off-centre reels autoplay muted, so one that reaches the centre would
       otherwise resume part-way through. Seek it back to the start as it
       begins sliding in, so the decode stall is covered by the movement
       rather than stuttering once the reel has landed. */
    function restart(v) {
      if (!v) return;
      const seek = () => { try { v.currentTime = 0; } catch (_) { /* not seekable yet */ } };
      if (v.readyState >= 1) seek();
      else v.addEventListener('loadedmetadata', seek, { once: true });
    }
    function setActive(k, animate = true) {
      k = Math.max(0, Math.min(nR - 1, k));
      const changed = k !== active;
      if (changed) {
        paused = false;
        reels[active].classList.remove('is-paused');
      }
      active = k;
      applyClasses();
      gsap.to(row, { x: xFor(k), duration: animate ? 0.6 : 0.01, ease: 'power3.out',
        onComplete: syncStripPlayback });
      if (changed) restart(vids[k]);
      syncAudio();
      syncStripPlayback();
    }
    /* Only the reels actually on screen play. A strip can hold ten of them and
       shows three, so starting them all meant ten clips downloading at once —
       seven megabytes on a phone to watch one. The rest hold their posters. */
    const REEL_MARGIN = 40;
    function reelVisible(el) {
      const r = el.getBoundingClientRect();
      return r.right > -REEL_MARGIN && r.left < window.innerWidth + REEL_MARGIN;
    }
    let sideStarting = null;     // the neighbour currently being let in (normal tier)
    function syncStripPlayback() {
      if (!inView) return;
      /* How the neighbours behave depends on the connection (js/net.js):
           slow    the centre reel plays alone; the blurred neighbours hold
                   their posters and fetch nothing, because a second stream is
                   what makes the watched one stall on a weak signal
           normal  the centre gets the connection first and the neighbours
                   follow the moment it is running
           fast    everything starts together — waiting only costs time
         Neighbours already playing are left alone on normal and fast, so
         sliding between reels never makes them flicker. */
      const net = window.KaziNet;
      const sideAllowed = !net || net.ambient(1) > 0;
      const waitForLead = !net || net.staggered();
      const lead = vids[active];
      const leadGoing = paused || !lead || (!lead.paused && (net ? net.healthy(lead) : lead.readyState >= 3));
      reels.forEach((el, i) => {
        const v = vids[i];
        if (!reelVisible(el)) { if (!v.paused) v.pause(); return; }
        if (i === active) { if (!paused) { v.muted = !soundOK; if (net) net.watch(v); safePlay(v); } }
        else if (!sideAllowed) { if (!v.paused) v.pause(); }
        else if (!waitForLead) { v.muted = true; safePlay(v); }
      });
      /* On a normal connection the neighbours come in one at a time, nearest
         first, each once the one before has a few seconds in hand. All four
         at once, the moment the centre was ready, was enough to stall the
         centre reel on a 10 Mbps line. */
      if (sideAllowed && waitForLead && leadGoing) {
        if (sideStarting && (sideStarting.paused || !reelVisible(reels[vids.indexOf(sideStarting)]))) sideStarting = null;
        const next = sideStarting ? null : vids
          .map((v, i) => ({ v, i }))
          .filter(({ v, i }) => i !== active && v.paused && reelVisible(reels[i]))
          .sort((a, b) => Math.abs(a.i - active) - Math.abs(b.i - active))[0];
        if (next) {
          const v = next.v;
          sideStarting = v;
          const go = () => { if (sideStarting === v) { sideStarting = null; syncStripPlayback(); } };
          v.addEventListener('playing', () => (net ? net.whenHealthy(v, go) : go()), { once: true });
          v.addEventListener('error', go, { once: true });
          setTimeout(go, 10000);     /* a reel that will not start must not hold the rest */
          v.muted = true;
          safePlay(v);
        }
      }
      if (sideAllowed && waitForLead && !leadGoing && !lead._kaziLead) {
        lead._kaziLead = true;
        const go = () => { lead._kaziLead = false; syncStripPlayback(); };
        /* not merely playing — playing with a few seconds in hand. Letting the
           neighbours in at the centre's first frame made it stall straight
           after, as four more streams arrived to share the line with it. */
        if (net) lead.addEventListener('playing', () => net.whenHealthy(lead, go), { once: true });
        else lead.addEventListener('playing', go, { once: true });
        lead.addEventListener('error', go, { once: true });
      }
    }
    /* a change of tier mid-visit re-applies the rules at once — on a
       downgrade that pauses the neighbours and frees the bandwidth */
    if (window.KaziNet) window.KaziNet.onChange(() => syncStripPlayback());

    function togglePause() {
      paused = !paused;
      const v = vids[active];
      if (paused) v.pause();
      else { v.muted = !soundOK; safePlay(v); }
      reels[active].classList.toggle('is-paused', paused);
    }

    /* Arrow keys step the strip, matching a drag or a tap on a side reel,
       and Space pauses or resumes the centre one, matching a tap on it.
       The shared handler only fires while these reels are the thing on
       screen, so it never fights the page's own scrolling. */
    if (window.KaziKeyNav) {
      window.KaziKeyNav.register({
        el: row.closest('section') || row,
        step: (dir) => {
          const k = active + dir;
          if (k < 0 || k > nR - 1) return false;   // at an end: let the page scroll
          setActive(k);
        },
        toggle: togglePause,
      });
    }

    /* initial position (reels stay paused until scrolled into view) */
    gsap.set(row, { x: xFor(active) });
    window.addEventListener('resize', () => { if (!dragging) gsap.set(row, { x: xFor(active) }); });

    /* First time the reels section is scrolled into view: start playback,
       attempting the active reel WITH sound. If the browser blocks
       autoplay-with-sound, fall back to muted + unmute on first interaction. */
    let started = false;
    let inView = false;
    function firstStart() {
      const first = vids[active];
      if (window.KaziNet) window.KaziNet.watch(first);   // its start time rates the connection
      first.muted = false;
      first.volume = 1;
      first.play().catch(() => {
        soundOK = false;
        first.muted = true;
        safePlay(first);
        const unmute = () => {
          soundOK = true;
          if (!paused) { vids[active].muted = false; safePlay(vids[active]); }
          window.removeEventListener('pointerdown', unmute);
          window.removeEventListener('keydown', unmute);
          window.removeEventListener('touchstart', unmute);
        };
        window.addEventListener('pointerdown', unmute);
        window.addEventListener('keydown', unmute);
        window.addEventListener('touchstart', unmute, { passive: true });
      });
      /* The neighbours are not started alongside the centre here — this was
         the path that actually runs on first arrival, and it fetched all five
         at once. syncStripPlayback() holds them back until the centre is
         running, then lets them in. */
      syncStripPlayback();
    }

    /* Play only while the section is on screen — so audio never runs before
       the user has seen (and scrolled to) the reels, and stops if they
       scroll away. Respects a manual pause on the active reel. */
    const io = new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      if (inView) {
        if (!started) { started = true; firstStart(); }
        else syncStripPlayback();
      } else {
        vids.forEach((v) => v.pause());
      }
    }, { threshold: 0, rootMargin: '-25% 0px -25% 0px' });
    io.observe(document.querySelector('.cs__reels'));

    /* drag / swipe / tap */
    row.addEventListener('pointerdown', (e) => {
      dragging = true; sx = e.clientX; dx = 0;
      startRX = Number(gsap.getProperty(row, 'x'));
      row.classList.add('is-grabbing');
      try { row.setPointerCapture && row.setPointerCapture(e.pointerId); } catch (err) {}
    });
    row.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      dx = e.clientX - sx;
      gsap.set(row, { x: startRX + dx });
    });
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false; row.classList.remove('is-grabbing');
      try { row.releasePointerCapture && e && e.pointerId != null && row.releasePointerCapture(e.pointerId); } catch (err) {}
      if (Math.abs(dx) <= 6 && e && e.type === 'pointerup') {
        const idx = reels.findIndex((el) => {
          const b = el.getBoundingClientRect();
          return e.clientX >= b.left && e.clientX <= b.right;
        });
        if (idx === -1) setActive(active);
        else if (idx === active) togglePause();
        else setActive(idx);
      } else {
        setActive(active + Math.round(-dx / (wFor(1) + gapPx())));
      }
    };
    row.addEventListener('pointerup', endDrag);
    row.addEventListener('pointercancel', endDrag);
    row.addEventListener('pointerleave', endDrag);
  }
})();
