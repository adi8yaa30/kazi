/* ============================================================
   KAZI NETWORK — The Collective
   GSAP + ScrollTrigger are loaded from the CDN on this page only, so no
   other page pays for them.
   ============================================================ */
gsap.registerPlugin(ScrollTrigger);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = window.matchMedia('(hover: none)').matches;

/* ------------------------------------------------------------
   EPISODE DATA — edit freely; the section reads only from here.
   TODO: `copy` is the placeholder text carried over from the Figma (it
   duplicates Amrit's D.O.P bio) and `title` is a working title. Both are
   waiting on real per-episode copy.
   ------------------------------------------------------------ */
const EPISODES = [
  {
    title: 'S1 · EP 1',
    poster: 'assets/img/collective/ep-1-poster.webp',
    src: 'assets/video/collective/ep-1.mp4',
    copy: "Every Campaign Starts In A Room Full Of People Talking Over Each Other. <the fake office> Is That Room, Unedited — The Half-Finished Ideas, The Deadlines Nobody Wants To Name And The Running Jokes That Somehow End Up In The Work. Episode One Opens The Door On An Ordinary Afternoon At KAZI HQ.",
  },
  {
    title: 'S1 · EP 2',
    poster: 'assets/img/collective/ep-2-poster.webp',
    src: 'assets/video/collective/ep-2.mp4',
    copy: "The Best Work Rarely Arrives On Schedule. Episode Two Follows A Shoot Week From The Inside — Call Sheets That Change Twice Before Lunch, A Client Note That Rewrites The Plan, And A Team That Keeps Moving Anyway. It Is Less A Behind-The-Scenes Than A Record Of How The Thing Actually Gets Made.",
  },
  {
    title: 'S1 · EP 3',
    poster: 'assets/img/collective/ep-3-poster.webp',
    src: 'assets/video/collective/ep-3.mp4',
    copy: "Culture Is What Happens Between The Briefs. Episode Three Is The Studio Off The Clock — Arguments About Fonts, Late Edits, Small Wins Announced Far Too Loudly. If You Want To Know Who Makes The Work At KAZI, This Is The Closest Thing To Being In The Room.",
  },
];

/* ------------------------------------------------------------
   REEL DECK — reel sizes come from Campaign Reels on the work pages
   (css/work-rab.css): at 1440 the centre reel is 23.4vw wide, its neighbours
   22.7vw, with a 10-18px gap.

   The three loop round three slots. With episode `c` chosen:
     centre = c,  right = c + 1,  left = c - 1   (all mod 3)
   so EP 1 opens as EP3 | EP1 | EP2. Choosing the next episode rotates
   everything left; choosing the previous one rotates right. The card that
   would have to jump across instead leaves by the near edge and returns from
   the far one, the way a carousel should.
   ------------------------------------------------------------ */
const REEL_NARROW = 768;
const reelW = (isSide) => window.innerWidth *
  (window.innerWidth <= REEL_NARROW ? (isSide ? 0.34 : 0.56) : (isSide ? 0.227 : 0.234));
const reelGap = () => Math.min(Math.max(window.innerWidth * 0.0125, 10), 18);
/* Slot centres, as offsets from the middle of the viewport. */
const reelStep = () => reelW(false) / 2 + reelGap() + reelW(true) / 2;
const SLOT_X = { centre: () => 0, left: () => -reelStep(), right: () => reelStep() };
/* Just past the edge, used when a card wraps from one side to the other. */
const offX = (dir) => dir * (window.innerWidth / 2 + reelW(true));

/* ------------------------------------------------------------
   GALLERY — both states measured off the Figma by pixel analysis.
   The hovered export turned out to be at exactly page scale (its headline cap
   height is 143px, same as the full-page image at 1440), so these are real
   page pixels converted to percentages of the stage: `w` of the stage width,
   x / y of the stage width and height, `rotate` in degrees (positive =
   clockwise), `z` the stacking order in the resting pile.

   Scattered positions are relative to the headline, which sits at 45.1% of
   the stage; the resting pile sits just below it at (49.3%, 45.8%) with every
   photo normalised to the front one's width, as the Figma has it.
   ------------------------------------------------------------ */
const STACK_SCALE = 1.705;   // front photo: 590px resting vs 346px scattered
/* The Figma's pile at full size reads too big in a real browser window.
   STACK_SHRINK scales the whole resting pile — photo size and the gaps between
   them together, so it stays a faithful miniature of the Figma arrangement.
   1 = exactly the Figma. Only the resting state is affected; the scattered
   state is untouched. */
const STACK_SHRINK = 0.72;
const GALLERY = [
  // gallery-1 — the Kazi-sign pair: front of the pile, centre when split
  { z: 5, w: 24.03, stack: { x: 49.31, y: 45.75, rotate:  0 }, scatter: { x: 48.47, y: 50.87, rotate:  -2.6 } },
  // gallery-2 — the group shot
  { z: 3, w: 24.86, stack: { x: 50.53, y: 42.87, rotate:  3 }, scatter: { x: 79.72, y: 24.13, rotate:  14.3 } },
  // gallery-3 — the camera rig
  { z: 2, w: 29.17, stack: { x: 48.09, y: 43.51, rotate: -3 }, scatter: { x: 17.43, y: 29.69, rotate:   6.0 } },
  // gallery-4 — Ankita with the name card
  { z: 1, w: 27.50, stack: { x: 48.30, y: 48.63, rotate: -2 }, scatter: { x: 16.60, y: 71.61, rotate:  -3.0 } },
  // gallery-5 — the laptop-over-the-face chair shot
  { z: 4, w: 30.63, stack: { x: 50.75, y: 47.99, rotate:  2 }, scatter: { x: 81.25, y: 79.51, rotate:  -3.2 } },
];

/* ============================================================
   HERO — one pinned, scrubbed timeline drives the whole sequence
   ============================================================ */
function heroZoom() {
  const section = document.getElementById('clHero');
  const pin     = document.getElementById('clHeroPin');
  const wrap    = document.getElementById('clFrameWrap');
  if (!section || !pin || !wrap) return;

  const sub      = document.getElementById('clHeroSub');
  const brackets = wrap.querySelectorAll('.clh__bracket');
  const wMeet    = section.querySelector('[data-w="meet"]');
  const wThe     = section.querySelector('[data-w="the"]');
  const wKazi    = section.querySelector('[data-w="kazi"]');
  const wTeam    = section.querySelector('[data-w="team"]');

  if (reduced) return; // CSS already renders the unpinned, final layout.

  /* The end state, taken from the reference: the frame settles at 48.75% of
     the viewport width with KAZI. and TEAM still on screen either side, rather
     than going near-full-bleed and pushing the words off. All three are
     fractions of the viewport width. */
  const END_FRAME_W = 0.4875;   // the frame's width
  const END_KAZI_R  = 0.2400;   // KAZI.'s right edge
  const END_TEAM_L  = 0.7825;   // TEAM's left edge

  const mobile = window.innerWidth <= 760;

  /* Layout geometry, read from offset* so it is unaffected by the transforms
     the timeline is applying — which matters because ScrollTrigger re-runs
     these on every refresh. */
  const stage = wrap.parentElement;              // .clh__stage
  const stageW    = () => stage.offsetWidth;
  const stageLeft = () => (window.innerWidth - stageW()) / 2;
  const startRight = (el) => stageLeft() + el.offsetLeft + el.offsetWidth;
  const startLeft  = (el) => stageLeft() + el.offsetLeft;
  const pct = (el, deltaPx) => (el.offsetWidth ? (deltaPx / el.offsetWidth) * 100 : 0);

  // A phone's frame already fills most of the width at rest, so it keeps a
  // simple near-full-bleed zoom and lets the side words bleed off as before.
  const scaleTo  = () => (mobile ? 0.92 : END_FRAME_W) * window.innerWidth / stageW();
  const kaziTo   = () => (mobile ? -90 : pct(wKazi, END_KAZI_R * window.innerWidth - startRight(wKazi)));
  const teamTo   = () => (mobile ?  90 : pct(wTeam, END_TEAM_L * window.innerWidth - startLeft(wTeam)));

  const tl = gsap.timeline({
    scrollTrigger: {
      id: 'clHero',
      trigger: section,
      start: 'top top',
      // The pin spacer supplies the scroll distance, so the sequence and the
      // section height can never drift out of sync.
      end: () => '+=' + window.innerHeight * (window.innerWidth <= 760 ? 1.5 : 2),
      pin: pin,
      scrub: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  // Subline clears out early so it never collides with the growing frame.
  tl.to(sub, { opacity: 0, duration: 0.18, ease: 'none' }, 0);

  // Words push off both edges while the frame grows into the space. MEET/THE
  // travel in viewport units so they always clear the top, whatever the
  // headline's own size works out to.
  tl.to(wKazi, { xPercent: kaziTo, ease: 'none' }, 0)
    .to(wTeam, { xPercent: teamTo, ease: 'none' }, 0)
    .to([wMeet, wThe], { y: () => -window.innerHeight * 0.62, ease: 'none' }, 0)
    .to(wrap, { scale: scaleTo, ease: 'none' }, 0)
    // Counter-scale keeps the bracket strokes a constant weight as the frame
    // grows — without this they'd fatten with the wrapper.
    .to(brackets, { scale: () => 1 / scaleTo(), ease: 'none' }, 0);
}

/* ============================================================
   TEAM — print-plate assembly (option A)
   ============================================================ */
function teamRows() {
  const rows = [...document.querySelectorAll('.clt__row')];
  const imgOf = (row) => row.querySelector('.clt__mask img');

  /* The portraits are fetched with the page (eager, low priority in the
     markup) rather than on approach, so they are decoded long before their
     row is reached — the reveal below then never has to wait. */
  rows.forEach((row) => {
    const mask  = row.querySelector('.clt__mask');
    const lines = row.querySelectorAll('.clt__name span, .clt__role span');
    const bio   = row.querySelectorAll('.clt__bio p');

    if (reduced) {
      gsap.set(mask, { clipPath: 'inset(0 0 0 0)' });
      return;
    }

    // Wipe from the outer edge inward, mirrored to match the row's layout.
    const fromRight = row.classList.contains('clt__row--img-right');

    const tl = gsap.timeline({ paused: true });

    tl.fromTo(mask,
      { clipPath: fromRight ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)' },
      { clipPath: 'inset(0 0 0 0)', duration: .8, ease: 'power3.inOut' }, 0)
      .from(lines, { yPercent: 115, duration: .7, stagger: .07, ease: 'power3.out' }, 0.18)
      .from(bio, { y: 26, opacity: 0, duration: .6, stagger: .09, ease: 'power2.out' }, 0.34);

    /* And hold the wipe until the photo is actually there. With the warm-up
       above it is already decoded by this point in all but the worst case;
       when it isn't, waiting is better than revealing an empty mask. */
    ScrollTrigger.create({
      trigger: row,
      /* The portrait is clipped fully out until this fires, so triggering at
         78% left the row on screen for ~200px of scrolling showing nothing
         where the photo should be — which reads as the image loading slowly.
         It now starts as the row edges in. */
      start: 'top 96%',
      once: true,
      onEnter: () => {
        const img = imgOf(row);
        if (!img || img.complete) { tl.play(); return; }
        let played = false;
        const go = () => { if (!played) { played = true; tl.play(); } };
        img.addEventListener('load', go, { once: true });
        img.addEventListener('error', go, { once: true });   // never strand the row
        setTimeout(go, 900);   // and never stall on it either
      },
    });
  });
}

/* ============================================================
   OFFICE SERIES
   ============================================================ */
function officeSeries() {
  const section = document.getElementById('clOffice');
  if (!section) return;

  const deck   = document.getElementById('clDeck');
  const slides = [...deck.querySelectorAll('.clo__slide')];
  const vids   = slides.map((sl) => sl.querySelector('video'));
  const copy   = document.getElementById('clCopy');
  const btns   = [...section.querySelectorAll('.clo__ep')];

  let current = 0;
  let swap;                    // in-flight rotation, killed on rapid clicks
  let inView  = false;

  const applyClasses = () => slides.forEach((sl, n) =>
    sl.classList.toggle('clo__slide--center', n === current));

  // Which slot episode `n` occupies when `c` is chosen.
  const slotOf = (n, c) => {
    const d = (n - c + slides.length) % slides.length;
    return d === 0 ? 'centre' : d === 1 ? 'right' : 'left';
  };
  const park = (n, c) => gsap.set(slides[n],
    { x: SLOT_X[slotOf(n, c)](), xPercent: -50, yPercent: -50 });

  /* The centre reel is the only one that plays; the others rest on their poster.

     These episodes are dialogue — they are worth nothing silent — so the
     centre one plays WITH sound, the same as the reel rows on the case-study
     pages. Every browser refuses unattended audio until the visitor has
     interacted with the page, so the first attempt falls back to muted and
     the sound is switched on at the first pointer or key event.

     Safari is stricter about unattended playback than Chromium. It decides
     whether a clip may autoplay when play() is called, and with
     preload="none" there is nothing buffered yet, so calling play()
     immediately after setting src is refused. Loading first and waiting for
     the clip to be playable is what makes it start without a click. */
  let soundOK = true;                  // flips to false if audio is blocked

  const startReel = (v, n) => {
    const wantSound = soundOK;
    v.muted = !wantSound;
    if (wantSound) v.removeAttribute('muted');
    else v.setAttribute('muted', '');  // some Safari builds read the attribute
    if (v.getAttribute('src') !== EPISODES[n].src) {
      v.src = EPISODES[n].src;
      v.load();
    }
    const go = () => v.play().catch(() => {
      /* refused — if it was the audio the browser objected to, drop to muted
         so the episode still runs, and wait for an interaction to bring the
         sound back */
      if (!v.muted) {
        soundOK = false;
        v.muted = true;
        v.setAttribute('muted', '');
        v.play().catch(() => {});
      }
    });
    if (v.readyState >= 2) { go(); return; }   // HAVE_CURRENT_DATA or better
    v.preload = 'auto';                        // preload="none" buffers nothing
    v.addEventListener('canplay', go, { once: true });
    if (v.networkState === HTMLMediaElement.NETWORK_EMPTY) v.load();
    go();
  };

  function playCentre() {
    vids.forEach((v, n) => {
      if (n === current && inView) { startReel(v, n); return; }
      v.pause();
      v.muted = true;          /* only the centre one ever carries sound */
    });
  }

  /* The first interaction of any kind is what lets audio through — and it also
     releases Low Power Mode, which refuses even muted autoplay. Retry then,
     with the sound restored: the same fallback the case-study reels use. */
  const releaseSound = () => {
    soundOK = true;
    playCentre();
  };
  ['pointerdown', 'touchstart', 'keydown'].forEach((ev) =>
    window.addEventListener(ev, releaseSound, { once: true, passive: true })
  );

  // --- initial paint --------------------------------------------------
  copy.textContent = EPISODES[0].copy;
  applyClasses();
  slides.forEach((_, n) => park(n, current));

  /* A poster is fetched the moment it is in the markup, even on a
     preload="none" video — three of them were pulling 134KB off the wire in
     the same burst as the hero, which is the LCP image. They are carried as
     data-poster and attached here instead, on the same approach that decides
     when the clips may load. */
  let postersOn = false;
  function loadPosters() {
    if (postersOn) return;
    postersOn = true;
    vids.forEach((v) => { if (v.dataset.poster) v.poster = v.dataset.poster; });
  }

  // Only fetch and play while the deck is on screen — the clips are ~25MB each.
  new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      inView = e.isIntersecting;
      if (inView) loadPosters();
      playCentre();
    });
  }, { rootMargin: '400px' }).observe(deck);

  // --- entrance -------------------------------------------------------
  if (!reduced) {
    gsap.from(slides, {
      y: 40,
      opacity: 0,
      duration: .7,
      stagger: .09,
      ease: 'power3.out',
      scrollTrigger: { trigger: section, start: 'top 82%', once: true },
    });
  }

  // --- episode switching ----------------------------------------------
  function setEpisode(i) {
    if (i === current) return;
    if (swap) swap.kill();          // interruptible on rapid clicks

    const was = current;
    current = i;
    const ep = EPISODES[i];
    btns.forEach((b, n) => b.setAttribute('aria-pressed', String(n === i)));
    playCentre();

    applyClasses();   // CSS transitions grow the new centre and shrink the old

    if (reduced) {
      slides.forEach((_, n) => park(n, current));
      copy.textContent = ep.copy;
      return;
    }

    // Forward (next episode) rotates the reels left; backward rotates right.
    const forward = (current - was + slides.length) % slides.length === 1;
    const dir = forward ? -1 : 1;

    swap = gsap.timeline();
    slides.forEach((sl, n) => {
      const from = slotOf(n, was);
      const to   = slotOf(n, current);
      const wraps = forward ? (from === 'left' && to === 'right')
                            : (from === 'right' && to === 'left');
      if (wraps) {
        // Leave by the near edge, come back from the far one. The positions
        // are pinned so the wrap lands with the other two rather than after
        // them — chaining would append it to the end of the timeline.
        swap.to(sl, { x: offX(dir), duration: .32, ease: 'power2.in' }, 0)
            .set(sl, { x: offX(-dir) }, .32)
            .to(sl, { x: SLOT_X[to](), duration: .42, ease: 'power3.out' }, .32);
      } else {
        swap.to(sl, { x: SLOT_X[to](), duration: .74, ease: 'power3.inOut' }, 0);
      }
    });

    pendingContent = () => { copy.textContent = ep.copy; };
    swap.to(copy, { opacity: 0, duration: .26, ease: 'power2.in', onComplete: applyContent }, 0)
        .to(copy, { opacity: 1, duration: .4,  ease: 'power2.out' }, 0.32);
  }

  // The copy swap happens mid-rotation. If a rapid click kills that tween
  // first, the swap still has to land.
  let pendingContent = null;
  const applyContent = () => { if (pendingContent) { pendingContent(); pendingContent = null; } };

  btns.forEach((b) => b.addEventListener('click', () => setEpisode(Number(b.dataset.ep))));

  /* Arrow keys move through the episodes, wrapping the way the deck does. */
  if (window.KaziKeyNav) {
    window.KaziKeyNav.register({
      el: section,
      step: (dir) => setEpisode((current + dir + slides.length) % slides.length),
    });
  }

  window.addEventListener('resize', () => slides.forEach((_, n) => park(n, current)));
}

/* ============================================================
   GALLERY — stacked pile that explodes on hover / focus
   ============================================================ */
function gallery() {
  const stage  = document.getElementById('clStage');
  const hit    = document.getElementById('clHit');
  if (!stage || !hit) return;
  const photos = [...stage.querySelectorAll('.clg__photo')];

  // Percentages are of the stage, which is full-bleed — on a phone that makes
  // every photo tiny, so give them a bump there.
  const wScale = window.innerWidth <= 760 ? 1.3 : 1;

  photos.forEach((photo, i) => {
    photo.style.zIndex = GALLERY[i].z;
    gsap.set(photo, { width: GALLERY[i].w * wScale + '%' });
  });

  const place = (i, key) => {
    const p = GALLERY[i][key];
    // left/top put the photo's centre on the stage; xPercent/yPercent do the
    // centring, so the numbers above stay readable as stage coordinates.
    if (key !== 'stack') {
      return { left: p.x + '%', top: p.y + '%', xPercent: -50, yPercent: -50, rotation: p.rotate, scale: 1 };
    }
    // The pile shrinks about its own centre, so the arrangement is preserved.
    const c = GALLERY[0].stack;
    return {
      left: c.x + (p.x - c.x) * STACK_SHRINK + '%',
      top:  c.y + (p.y - c.y) * STACK_SHRINK + '%',
      xPercent: -50, yPercent: -50,
      rotation: p.rotate,
      // Every photo takes the front one's width, so the back ones show as thin
      // slivers rather than broad margins.
      scale: (GALLERY[0].w * STACK_SCALE * STACK_SHRINK) / GALLERY[i].w,
    };
  };

  const set   = (key)            => photos.forEach((p, i) => gsap.set(p, place(i, key)));
  const apply = (key, opts = {}) => photos.forEach((p, i) => gsap.to(p, { ...place(i, key), ...opts }));

  if (isTouch || reduced) {
    hit.style.display = 'none';

    // Reduced motion gets the end state and nothing else.
    if (reduced) { set('scatter'); return; }

    /* Touch has no hover to drive the split, so scroll drives it instead: the
       pile is laid out stacked, and springs apart once the section is
       properly on screen. Deliberately not a tap — nothing about the pile
       advertises itself as tappable, so a tap-to-open would just read as a
       gallery that never opens. Scroll needs no affordance and every visitor
       performs it.

       Anchored on the stage's centre rather than its top: the pile sits near
       the middle of a stage that is 560-900px tall, so a top-edge trigger
       would fire it while the photos were still below the fold. */
    set('stack');
    ScrollTrigger.create({
      trigger: stage,
      start: 'center 70%',
      once: true,
      onEnter: () => apply('scatter', { duration: 1.15, ease: 'expo.out', stagger: .06 }),
    });
    return;
  }

  set('stack');

  // Fast out of the gate, slowing into place; the return is quicker and tighter.
  const split  = () => apply('scatter', { duration: 1.1, ease: 'expo.out',     stagger: .04, overwrite: 'auto' });
  const gather = () => apply('stack',   { duration: .62, ease: 'power3.inOut', stagger: .03, overwrite: 'auto' });

  // The trigger is the pile itself, not the whole block — hovering anywhere in
  // the section would otherwise fire it.
  hit.addEventListener('mouseenter', split);
  hit.addEventListener('mouseleave', gather);
  hit.addEventListener('focus', split);
  hit.addEventListener('blur', gather);
}

/* ============================================================
   BOOT
   ============================================================ */
function init() {
  if (!document.getElementById('clRoot')) return;
  heroZoom();
  teamRows();
  officeSeries();
  gallery();
  ScrollTrigger.refresh();
}

/* Shared nav behaviour — the burger is the only piece this page needs. */
function mobileNav() {
  const burger = document.getElementById('navBurger');
  const menu   = document.getElementById('navMenu');
  if (!burger || !menu) return;
  burger.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('is-locked', open);
  });
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
    menu.classList.remove('is-open');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
  }));
}

document.addEventListener('DOMContentLoaded', () => { mobileNav(); init(); });
window.addEventListener('load',   () => ScrollTrigger.refresh());
window.addEventListener('resize', () => ScrollTrigger.refresh());
