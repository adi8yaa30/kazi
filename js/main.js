/* ============================================================
   KAZI NETWORK — Interactions
   ============================================================ */
gsap.registerPlugin(ScrollTrigger);

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Lemon: split text into words ---------- */
function splitLemonWords() {
  const el = document.getElementById('lemonText');
  if (!el) return;
  const walk = (node) => {
    const out = [];
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (part.trim() === '') { out.push(document.createTextNode(part)); return; }
          const span = document.createElement('span');
          span.className = 'word';
          span.textContent = part;
          out.push(span);
        });
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        // accent span -> keep as a single highlighted word
        child.classList.add('word');
        out.push(child);
      }
    });
    return out;
  };
  const nodes = walk(el);
  el.innerHTML = '';
  nodes.forEach((n) => el.appendChild(n));
}

/* ---------- Navbar reveal ----------
   The nav is available from the very first paint. It is still shown only while
   the page is at the very top — scrolling down hides it, and it reappears when
   the user returns to the top (scrolling up midway does not). While the
   preloader is up the nav sits behind it (z-index 1000 vs 9999), so "from the
   start" costs nothing visually. */
const NAV_TOP_THRESHOLD = 10; // px from the top within which the nav is shown
let navUnlocked = true;        // no gate: the nav is never withheld

function applyNavState() {
  const nav = document.getElementById('nav');
  if (navUnlocked && window.scrollY <= NAV_TOP_THRESHOLD) {
    nav.classList.add('is-visible');
  } else {
    nav.classList.remove('is-visible');
  }
}

// Kept for callers: the nav is already unlocked, so this just re-applies state.
function showNav() {
  navUnlocked = true;
  applyNavState();
}

/* Toggle the nav purely by scroll position: visible at the top, hidden once
   the user scrolls down. */
function initNavScroll() {
  // Apply once up front so the nav is present from the first paint rather
  // than waiting for the first scroll or for the preloader to finish.
  applyNavState();
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => { applyNavState(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });
}

/* ---------- Mobile hamburger menu ---------- */
function mobileNav() {
  const burger = document.getElementById('navBurger');
  const menu   = document.getElementById('navMenu');
  if (!burger || !menu) return;

  const open = () => {
    burger.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    menu.classList.add('is-open');
    document.body.classList.add('is-locked');
  };
  const close = () => {
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open');
    document.body.classList.remove('is-locked');
  };
  const toggle = () => burger.classList.contains('is-open') ? close() : open();

  burger.addEventListener('click', toggle);

  // Close when any nav link is clicked
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('is-open') &&
        !menu.contains(e.target) && !burger.contains(e.target)) close();
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

/* ---------- Hero playback ----------
   The hero must autoplay, loop, and never show a transport control on any
   browser. `autoplay muted loop playsinline` covers the normal path; this
   covers the cases where the browser overrides it:
     - iOS Low Power Mode and Safari's autoplay heuristics refuse the initial
       play() and would leave a tappable poster sitting there;
     - returning to a backgrounded tab can leave the clip paused;
     - a stalled network can drop it out of playback.
   Any pause that the page did not ask for is undone. Combined with
   pointer-events:none in CSS, there is no way to end up looking at a paused
   hero with a play button over it. */
function keepHeroPlaying() {
  const v = document.querySelector('.hero__video');
  if (!v) return;

  /* Set these as properties too, not just attributes. WebKit checks the
     property when it decides whether an unattended play() is allowed, and a
     video it thinks is unmuted is refused outright. */
  v.muted = true;
  v.playsInline = true;

  const resume = () => {
    if (v.paused && !document.hidden) v.play().catch(() => {});
  };

  /* Source-selection safety net. Desktop Safari and every iOS browser are
     WebKit, and WebKit is far pickier here than Blink: it may decline the
     VP9/WebM source, or mishandle the `media` attribute on <source>, and
     when resource selection fails there is no second attempt — the element
     just sits with no data and never plays. Rather than guess which of those
     it is, watch for the symptom: no data at all after a few seconds, or an
     explicit error from any <source>. Then drop the <source> list and point
     the element straight at the MP4, which every engine can decode.
     readyState < 2 means "nothing loaded", which is a source problem; a clip
     that loaded but sits paused is an autoplay-policy problem and is handled
     by resume() above, so this must not fire for that case. */
  let swapped = false;
  const forceMp4 = () => {
    if (swapped) return;
    swapped = true;
    const small = window.matchMedia('(max-width: 768px)').matches;
    [...v.querySelectorAll('source')].forEach((el) => el.remove());
    v.src = small ? 'assets/video/hero-reel-720.mp4' : 'assets/video/hero-reel.mp4';
    v.load();
    v.play().catch(() => {});
  };
  v.addEventListener('error', forceMp4, true);   // capture: <source> errors do not bubble
  setTimeout(() => { if (v.readyState < 2) forceMp4(); }, 4000);

  /* WebKit often has metadata well before it will act on the autoplay
     attribute; asking again at each of these is harmless and covers it. */
  v.addEventListener('loadedmetadata', resume);
  v.addEventListener('loadeddata', resume);
  v.addEventListener('canplay', resume);

  /* Lift the still off the clip once real frames are running — see the CSS
     note. The flag goes on the container, not the video: the video itself is
     never hidden, or Safari would refuse to autoplay it. `playing` is the
     right signal, with a timeupdate fallback for browsers that fire it
     unreliably; both are harmless to run twice. */
  const media = v.parentElement;
  const reveal = () => {
    if (v.currentTime > 0 || v.readyState >= 3) media.classList.add('is-playing');
  };
  v.addEventListener('playing', reveal);
  v.addEventListener('timeupdate', reveal);

  v.addEventListener('pause', resume);
  v.addEventListener('stalled', resume);
  v.addEventListener('suspend', resume);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) resume(); });

  /* Autoplay that is refused outright stays refused until the user touches the
     page; the first interaction anywhere is enough to start it. */
  ['pointerdown', 'touchstart', 'keydown', 'scroll'].forEach((ev) =>
    window.addEventListener(ev, resume, { once: true, passive: true })
  );

  resume();
}

/* ---------- Hero scale-in ---------- */
function playHero() {
  const media = document.querySelector('.hero__media');
  const video = document.querySelector('.hero__video');
  if (video) { video.play().catch(() => {}); }

  const tl = gsap.timeline();
  tl.to(media, {
    scale: 1, opacity: 1, duration: 1.6, ease: 'power3.out'
  });
  // Navbar appears only after the hero video has played all the way through.
  applyNavState();
}

/* ---------- Preloader ---------- */
let preloaderFinished = false;
/* work that should not compete with the first paint waits for the reveal */
const afterPreloader = [];
function whenPreloaderDone(fn) {
  if (preloaderFinished) fn(); else afterPreloader.push(fn);
}
function finishPreloader(skipHeroAnim) {
  if (preloaderFinished) return;
  preloaderFinished = true;
  afterPreloader.splice(0).forEach((fn) => fn());
  const pre = document.getElementById('preloader');
  pre.style.display = 'none';
  document.body.classList.remove('is-locked');
  if (skipHeroAnim) {
    const media = document.querySelector('.hero__media');
    media.style.opacity = 1;
    media.style.transform = 'scale(1)';
    const v = document.querySelector('.hero__video');
    if (v) v.play().catch(() => {});
    applyNavState();
  } else {
    playHero();
  }
}

function runPreloader() {
  const pre = document.getElementById('preloader');
  const logo = document.querySelector('.preloader__logo');
  const blinds = document.querySelectorAll('.preloader__blinds span');
  document.body.classList.add('is-locked');

  if (prefersReduced) {
    finishPreloader(true);
    return;
  }

  // Safety net: if rAF is throttled (e.g. backgrounded tab) and the timeline
  // never fires onComplete, force the reveal so the site is never stuck.
  const safety = setTimeout(() => finishPreloader(true), 4500);

  const tl = gsap.timeline({
    paused: true,
    onComplete: () => { clearTimeout(safety); finishPreloader(false); }
  });

  // Logo pops in (CSS, see .preloader__logo), then breathes
  tl.to(logo, { scale: 1.04, duration: 0.5, ease: 'power1.inOut' }, '+=0.15')
    // Logo fades, blinds wipe down to reveal the page
    .to(logo, { opacity: 0, duration: 0.35, ease: 'power2.in' }, '+=0.1')
    .to(blinds, {
      scaleY: 1, duration: 0.7, ease: 'power3.inOut',
      stagger: { each: 0.06, from: 'start' }
    }, '-=0.2')
    .set(pre, { className: 'preloader is-done' })
    // Blinds slide up and away
    .to(blinds, {
      yPercent: -100, duration: 0.7, ease: 'power3.inOut',
      stagger: { each: 0.05, from: 'end' }
    }, '+=0.05');

  /* hand over from the CSS pop-in: hold its end state inline, drop the
     animation, and carry on — whether it is still running or long done */
  const go = () => {
    gsap.set(logo, { opacity: 1, scale: 1 });
    logo.style.animation = 'none';
    tl.play();
  };
  const pop = logo.getAnimations ? logo.getAnimations().find((a) => a.animationName === 'preloaderPop') : null;
  if (pop && pop.playState !== 'finished') pop.finished.then(go, go);
  else go();
}

/* ---------- Services: interactive columns + slider ----------
   Three slides x three services. Hovering a column expands that
   service (image + type grow) while its neighbours collapse into
   accent number rails; hovering a rail switches the expansion.
   The footer arrow / segments / swipe move between slides. */
const SERVICES = [
  { num: '01', name: 'Video Production',        kicker: 'Stories in Motion',
    imgStatic: 'assets/img/services/static-state/video-production-image-static-state.webp',
    imgHover:  'assets/img/services/hovered-state/video-production-image-hovered-state.webp',
    desc: 'Cinematic productions crafted for brands, products, commercials, and digital campaigns.' },
  /* The one service whose artwork is a screenshot rather than a photograph.
     Cropping a photo to fill the frame costs nothing; cropping a web page
     cuts off the navigation, the wordmark and the layout — the very things
     that make it read as a website. `fit: 'whole'` puts this card's stills on
     object-fit: contain so the page is shown entire. */
  { num: '02', name: 'Web Designing',           kicker: 'Built to Perform',
    fit: 'whole',
    imgStatic: 'assets/img/services/static-state/web-designing-image-static-state.webp',
    imgHover:  'assets/img/services/hovered-state/web-designing-image-hovered-state.webp',
    desc: 'Design, motion and front-end development under one roof \u2014 sites built by hand around the brand rather than a template.' },
  /* The only service with a clip rather than the two Figma stills — `video`
     takes the place of both states, since it fills the wrapper the same way
     in either. */
  { num: '03', name: 'Brand Identity',          kicker: 'Identities That Last',
    video:  'assets/video/brand-identity.mp4',
    poster: 'assets/video/posters/brand-identity.webp',
    desc: 'Distinct visual identities, creative direction, and design systems built to make brands recognizable and memorable.' },
  { num: '04', name: 'Branded Content',         kicker: 'Creativity with Purpose',
    imgStatic: 'assets/img/services/static-state/branded-content-image-static-state.webp',
    imgHover:  'assets/img/services/hovered-state/branded-content-image-hovered-state.webp',
    desc: 'Authentic campaigns that blend storytelling and strategy to create meaningful connections between brands and audiences.' },
  { num: '05', name: 'Social Media Management', kicker: 'Always in Motion',
    imgStatic: 'assets/img/services/static-state/social-media-management-image-static-state.webp',
    imgHover:  'assets/img/services/hovered-state/social-media-management-image-hovered-state.webp',
    desc: 'Creative planning, content production, and platform management designed to keep brands consistently relevant.' },
  { num: '06', name: 'Event Coverage',          kicker: 'Every Moment Matters',
    imgStatic: 'assets/img/services/static-state/event-coverage-static-state.webp',
    imgHover:  'assets/img/services/hovered-state/event-coverage-hovered-state.webp',
    desc: 'Cinematic coverage of launches, festivals, concerts, and corporate events that captures every defining moment.' },
  { num: '07', name: 'Performance & Lead Gen',  kicker: 'Creativity That Converts',
    imgStatic: 'assets/img/services/static-state/performance-&-lead-gen-image-static-state.webp',
    imgHover:  'assets/img/services/hovered-state/performance-&-lead-gen-image-hovered-state.webp',
    desc: 'Performance-driven campaigns that combine creative execution with data to generate qualified leads and measurable growth.' },
  { num: '08', name: 'Original IP & Series',    kicker: 'Originals in Progress',
    imgStatic: 'assets/img/services/static-state/original-ip-&-series-image-static-state.webp',
    imgHover:  'assets/img/services/hovered-state/original-ip-&-series-image-hovered-state.webp',
    desc: 'Developing original concepts, documentary formats, and creative series that entertain, inspire, and build communities.' },
  { num: '09', name: 'Photography',             kicker: 'Frames That Speak',
    imgStatic: 'assets/img/services/static-state/photography-image-static-state.webp',
    imgHover:  'assets/img/services/hovered-state/photography-image-hovered-state.webp',
    desc: 'Commercial, lifestyle, product, and editorial photography crafted to elevate every visual story.' },
];

function servicesInteractive() {
  const track = document.getElementById('ksTrack');
  const viewport = document.getElementById('ksViewport');
  if (!track || !viewport) return;
  const segs = [...document.querySelectorAll('#ksSegs button')];
  const arrow = document.getElementById('ksArrow');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let slideIdx = 0;
  /* only one column can be under the cursor at a time, so a single pending
     open-timer covers the whole section — and leaving the section can cancel
     it with one clearTimeout */
  let hoverT = 0;

  /* build slides */
  const slides = [];
  /* The art is 1000-1600px wide because a desktop card shows it that big. A
     phone shows it at ~360, and decoding the full-size files there is what
     made the page scroll like treacle: 33 megapixels of bitmap for one
     screen's worth of scrolling. Each file has an 800px copy beside it, and
     the browser picks by screen. */
  const phoneArt = (src) => src.replace(/\.webp$/, '-800.webp');
  const ART_SIZES = '(max-width: 768px) 92vw, 46vw';

  for (let s = 0; s < 3; s++) {
    const slide = document.createElement('div');
    slide.className = 'ks__slide';
    for (let c = 0; c < 3; c++) {
      const svc = SERVICES[s * 3 + c];
      const pos = ['a', 'b', 'c'][c];
      const col = document.createElement('div');
      col.className = 'ks__col ks__col--' + pos + (svc.fit === 'whole' ? ' ks__col--whole' : '');
      const media = svc.video
        ? '<video class="ks__img ks__vid" muted loop playsinline preload="none"'
          + ' poster="' + svc.poster + '" aria-label="' + svc.name + '">'
          + '<source src="' + svc.video + '" type="video/mp4" /></video>'
        /* Carried as data-src and attached when the section is approached.
           loading="lazy" was not enough: these sixteen images sit inside a
           track three viewports wide, and the browser fetched every one of
           them at load — 1.4MB, on a phone, for a section far below the fold.
           The collective page's posters use the same trick. */
        : '<img class="ks__img ks__img--static" decoding="async" data-src="' + svc.imgStatic + '"'
            + ' data-srcset="' + phoneArt(svc.imgStatic) + ' 800w, ' + svc.imgStatic + ' 1000w"'
            + ' sizes="' + ART_SIZES + '" alt="' + svc.name + '" />'
          + '<img class="ks__img ks__img--hover" decoding="async" data-src="' + svc.imgHover + '"'
            + ' data-srcset="' + phoneArt(svc.imgHover) + ' 800w, ' + svc.imgHover + ' 1600w"'
            + ' sizes="' + ART_SIZES + '" alt="' + svc.name + ' expanded" />';
      col.innerHTML =
        '<div class="ks__inner">'
        + '<div class="ks__imgwrap">'
        + media
        + '</div>'
        + '<div class="ks__info"><span class="ks__kicker">' + svc.kicker + '</span>'
        + '<p class="ks__desc">' + svc.desc + '</p></div>'
        + '<div class="ks__nameline"><h3 class="ks__name">' + svc.name + '</h3>'
        + '<span class="ks__num">' + svc.num + '</span></div>'
        + '</div>'
        + '<div class="ks__rail"><span>' + svc.num + '</span></div>';
      slide.appendChild(col);

      const activate = (watch = true) => {
        slide.classList.add('has-active');
        slide.querySelectorAll('.ks__col').forEach((el) => el.classList.toggle('is-active', el === col));
        if (watch) startWatch();
      };
      /* On a mouse the service opens on hover; on a touch screen — where
         there is no hover — it opens on a press. Both routes end in the
         same activate().

         The press is driven off pointerup rather than click: the synthesized
         click a tap is supposed to produce does not always survive (the swipe
         handler on the viewport and the browser's own scroll arbitration can
         swallow it). A movement threshold keeps a swipe from counting. */
      let downX = 0, downY = 0, moved = false;
      col.addEventListener('pointerdown', (e) => {
        downX = e.clientX; downY = e.clientY; moved = false;
      });
      col.addEventListener('pointermove', (e) => {
        if (Math.abs(e.clientX - downX) > 10 || Math.abs(e.clientY - downY) > 10) moved = true;
      });
      const tap = () => {
        if (moved || col.classList.contains('is-active')) return;
        activate(!!track.querySelector('.ks__col:hover'));
      };
      col.addEventListener('pointerup', tap);
      col.addEventListener('pointercancel', () => { moved = true; });
      /* belt and braces for anything that delivers a click but no pointerup */
      col.addEventListener('click', () => {
        if (!col.classList.contains('is-active')) activate(!!track.querySelector('.ks__col:hover'));
      });

      /* Hover, for a mouse only. The short delay before opening is what
         keeps this civil: without it the panel swung open at every column
         the cursor crossed on its way somewhere else. A cursor that is
         merely passing through clears the timer on the way out; one that
         settles opens the service. 45ms is about the shortest that still
         reads as intent rather than reflex — below that a fast sweep across
         the row starts opening panels behind the cursor. */
      col.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse' || !finePointer.matches) return;
        clearTimeout(hoverT);
        hoverT = setTimeout(() => {
          if (!col.classList.contains('is-active')) activate();
        }, 45);
      });
      col.addEventListener('pointerleave', () => clearTimeout(hoverT));
    }
    track.appendChild(slide);
    slides.push(slide);
  }

  /* Attach the artwork once the section is within a screen of the viewport,
     so nothing is fetched for a section the visitor may never reach. */
  let artArmed = false;        /* the section has been approached; art may load */
  /* One slide's art, not all of it. Sixteen images at once is ~8 megapixels
     of decoding on a phone, in the middle of a scroll — and only three
     services are on screen at a time. The rest arrive when the visitor
     slides to them. */
  function loadServiceArt(i) {
    if (!artArmed) return;       /* still far below the fold: fetch nothing yet */
    const scope = (typeof i === 'number' && slides[i]) || track;
    scope.querySelectorAll('img[data-src]').forEach((img) => {
      if (img.dataset.srcset) { img.srcset = img.dataset.srcset; img.removeAttribute('data-srcset'); }
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    });
  }
  if (typeof IntersectionObserver !== 'undefined') {
    const artWatch = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) { artArmed = true; loadServiceArt(slideIdx); artWatch.disconnect(); }
    }, { rootMargin: '100% 0px' });
    artWatch.observe(viewport);
  } else {
    artArmed = true;
    loadServiceArt(slideIdx);
  }

  /* fixed layer widths so the text doesn't reflow while columns animate */
  function setWidths() {
    const w = viewport.getBoundingClientRect().width;
    const railW = Math.min(Math.max(w * 0.042, 44), 68);
    track.style.setProperty('--ks-colw', (w / 3) + 'px');
    track.style.setProperty('--ks-expw', (w - 2 * railW - 2) + 'px');
  }
  setWidths();
  window.addEventListener('resize', setWidths);
  /* the viewport can change size without a window resize (fonts, layout,
     emulated viewports) — observe the element itself */
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(setWidths).observe(viewport);

  /* mobile accordion (Figma): one service always expanded per slide */
  const smallScreen = window.matchMedia('(max-width: 768px)');
  function ensureMobileActive() {
    if (!smallScreen.matches) return;
    slides.forEach((sl) => {
      if (!sl.classList.contains('has-active')) {
        sl.classList.add('has-active');
        sl.querySelectorAll('.ks__col').forEach((el, j) => el.classList.toggle('is-active', j === 0));
      }
    });
  }

  /* the default view: nothing open, every column back to a third of the
     width. Both the slider and the cursor leaving the section return here. */
  function closeAll() {
    slides.forEach((sl) => {
      sl.classList.remove('has-active');
      sl.querySelectorAll('.ks__col').forEach((el) => el.classList.remove('is-active'));
    });
  }

  /* Hover belongs to this section only: once the cursor is outside it, the
     panel has no reason to stay open, and the visitor comes back to the same
     default view they first saw.

     Detecting that by events turned out to be a losing game. The section is a
     full 100svh, so scrolling slides it out from under a cursor that never
     moved and fires no pointer event at all; and because the section is
     exactly as tall as the window, the cursor usually leaves by leaving the
     window — down to the Dock, up to the toolbar — which fires nothing inside
     the page either.

     :hover is the one piece of this the browser maintains correctly through
     all of it, scroll and window edge included. So rather than reconstruct
     the cursor's whereabouts from events, we ask the browser directly, once a
     frame, and only for as long as something is actually open.

     What it is asked is deliberately narrow: is the cursor on a service
     column. Not on the section — the heading above the columns and the
     "slide to view more" footer below them are section, not service, and a
     cursor resting there is a cursor that has left the service it opened. */

  function anyOpen() {
    return slides.some((sl) => sl.classList.contains('has-active'));
  }
  function leaveSection() {
    clearTimeout(hoverT);
    closeAll();
    ensureMobileActive();
  }
  let watching = false;
  function watchHover() {
    if (!finePointer.matches || !anyOpen()) { watching = false; return; }
    /* any column, not the open one: on the way from one service to its
       neighbour both are briefly true, and asking about the open one alone
       would close and reopen the panel in the gap */
    if (!track.querySelector('.ks__col:hover')) { leaveSection(); watching = false; return; }
    requestAnimationFrame(watchHover);
  }
  /* runs only while a panel is open, and stops itself the moment one closes */
  function startWatch() {
    if (watching || !finePointer.matches) return;
    watching = true;
    requestAnimationFrame(watchHover);
  }

  /* On a phone the three slides sit side by side on one track, and the
     viewport took the height of the tallest — so a slide with shorter titles
     left a band of empty space under its last service (Brand Identity, Event
     Coverage). The viewport follows the slide on screen instead: eased
     alongside the slide change, and kept in step frame by frame while a
     service opens or closes. */
  let slidingUntil = 0;
  function fitViewport() {
    if (!smallScreen.matches) { viewport.style.height = ''; viewport.style.transition = ''; return; }
    const sl = slides[slideIdx];
    if (!sl) return;
    const sliding = !prefersReduced && performance.now() < slidingUntil;
    viewport.style.transition = sliding ? 'height 0.85s cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
    viewport.style.height = sl.offsetHeight + 'px';
  }
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(fitViewport);
    slides.forEach((sl) => ro.observe(sl));
  }

  /* slider */
  function goTo(i) {
    slideIdx = (i + 3) % 3;
    track.style.transition = prefersReduced ? 'none' : 'transform 0.85s cubic-bezier(0.22, 1, 0.36, 1)';
    track.style.transform = 'translateX(' + (-slideIdx * 100 / 3) + '%)';
    segs.forEach((b, j) => b.classList.toggle('is-active', j === slideIdx));
    loadServiceArt(slideIdx);      /* this slide's art, if it has not been fetched yet */
    closeAll();
    ensureMobileActive();
    slidingUntil = performance.now() + 850;
    fitViewport();
  }
  goTo(0);
  smallScreen.addEventListener && smallScreen.addEventListener('change', () => {
    if (smallScreen.matches) ensureMobileActive();
    else closeAll();
    fitViewport();
  });
  arrow && arrow.addEventListener('click', () => goTo(slideIdx + 1));

  /* Arrow keys drive the same three slides as the arrow button and the
     segment tabs, wrapping through goTo's modulo. */
  if (window.KaziKeyNav) {
    /* the whole section, not just the viewport — a trackpad swipe over the
       segment tabs or the footer below the slides means the same thing */
    window.KaziKeyNav.register({
      el: viewport.closest('section') || viewport,
      step: (dir) => goTo(slideIdx + dir),
    });
  }
  segs.forEach((b, j) => b.addEventListener('click', () => goTo(j)));

  /* swipe */
  let sx = null;
  viewport.addEventListener('pointerdown', (e) => { sx = e.clientX; });
  viewport.addEventListener('pointerup', (e) => {
    if (sx == null) return;
    const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 50) goTo(slideIdx + (dx < 0 ? 1 : -1));
  });
}

/* ---------- Testimonials: vertical image-card slider + content swap ----------
   The active card sits centred in the viewport (full colour, accent
   border); the previous and next cards peek above and below in
   grayscale. Nav dashes / card clicks / vertical swipe move the strip;
   the right-panel content fades + lifts on each change. A 3x duplicated
   set keeps the vertical loop seamless. */
/* Two of these have a portrait; the other two carry their company's mark on
   a plain ground instead. Mixing a portrait with a project still would read
   as a missing photo — the brand mark reads as a decision, and the panel
   beside the card is what actually names the person either way. */
const TESTIMONIALS = [
  { img: 'assets/img/testimonials/rhik-baruah.webp', name: 'Rhik Baruah', role: 'RAB Automotors, Owner',
    quote: 'Working with Kazi felt less like hiring an agency and more like collaborating with a creative partner. Every idea was thoughtfully executed, and the final result exceeded our expectations.' },
  { img: 'assets/img/testimonials/tasneem-hafiz.webp', name: 'Tasneem Hafiz', role: 'Studio Artitecting, Founder',
    quote: 'Kazi understood our vision from day one and translated it into work that felt thoughtful, refined, and true to our brand. Their collaborative approach and attention to detail made the entire process seamless. We couldn’t have asked for a better creative partner.' },
  { img: 'assets/img/testimonials/kaustav-hazarika.webp', name: 'Kaustav Hazarika', role: 'Relax Mattresses and Sleep Systems, Operations Manager',
    quote: 'Had the opportunity to work with Kazi to develop our online presence and reach. They did a tremendous job giving us the exposure and visibility needed to really make our presence felt in the market. Highly recommend for anyone looking to grow their digital marketing.' },
  { img: 'assets/img/testimonials/raj-buragohain.webp', name: 'Raj Buragohain', role: 'Orient Processors, HOD — Marketing',
    quote: 'Kazi Team is a creative and innovative team who consistently bring fresh ideas to the table. They understand our requirements well, communicate clearly, and are great to work with.' },
  { img: 'assets/img/testimonials/juthika-talukdar.webp', name: 'Juthika Talukdar', role: 'Axel Public School, HOD — Operations',
    quote: 'Kazi Network is an excellent video agency to work with. The team is creative, professional, and genuinely committed to delivering high-quality work. They understood our vision quickly, brought great ideas to the table, and handled the entire process smoothly from concept to final production. The communication was clear, the turnaround was impressive, and the final videos looked polished and engaging.' },
  { img: 'assets/img/testimonials/heena-manav.webp', name: 'Heena Manav', role: 'Jorhat Stallions, Management',
    quote: 'Working with Kazi Network has been such a fun and refreshing experience. Their young perspective, super creative approach, and ability to think outside the box really stand out. They bring a lot of energy to every project and make the entire process feel effortless and enjoyable.' },
];

/* ---------- Portfolio cards: tap-to-reveal on touch devices ---------- */
function testimonials() {
  const section = document.getElementById('testimonials');
  const cards = document.getElementById('tsCards');
  const strip = document.getElementById('tsStrip');
  const dotsWrap = document.getElementById('tsDots');
  const elText = document.getElementById('tsText');
  const elName = document.getElementById('tsName');
  const elRole = document.getElementById('tsRole');
  const btnPrev = document.getElementById('tsPrev');
  const btnNext = document.getElementById('tsNext');
  const elCount = document.getElementById('tsCount');
  if (!section || !strip) return;

  /* In the two-column layout the panel is a fixed height, matched to the card
     strip, and a long quote used to run straight through the bottom of it —
     taking the name, the role and the arrows with it, out of reach. So each
     quote starts at its designed size and steps down only as far as it takes
     for everything to fit. Short quotes are untouched; only the long ones give.
     Stacked (<=920px) the panel grows with its content, so there is nothing to
     fit and the inline size is simply cleared. */
  const panel = elText.closest('.ts__panel');
  const grid = panel && panel.closest('.ts__grid');
  const stacked = window.matchMedia('(max-width: 920px)');
  const QUOTE_FLOOR = 16;         // px — design.md: no body text below 16px, at any breakpoint
  function fitQuote() {
    elText.style.fontSize = '';
    elText.style.maxWidth = '';
    const wasGrown = !!grid && grid.classList.contains('ts__grid--grow');
    if (grid) grid.classList.remove('ts__grid--grow');
    if (panel && !stacked.matches) {
      let size = parseFloat(getComputedStyle(elText).fontSize);
      /* The column is 30ch wide, and ch shrinks with the font, so every step
         down also narrowed it — a long quote ended up in a strip half the
         panel wide, with more lines, needing smaller type still. The column
         keeps the width it has at full size while the type steps down. */
      elText.style.maxWidth = getComputedStyle(elText).maxWidth;
      /* the starting size is fractional (1.9vw is 27.36px at 1440), so each
         step is clamped — stepping whole pixels from 16.36 would otherwise
         land on 15.36, under the floor */
      /* Overflow is measured from the foot, not from scrollHeight. A quote
         only slightly too long pushed the foot down into the panel's bottom
         padding, which scrollHeight does not count — so it "fit", and the
         name, role, arrows and stars sat up to 30px lower on the longer
         testimonials than on the short ones. Held to the padding's edge, the
         foot sits in the same place on every testimonial. */
      const foot = panel.querySelector('.ts__foot');
      const overflows = () => (foot
        ? foot.getBoundingClientRect().bottom >
          panel.getBoundingClientRect().bottom - parseFloat(getComputedStyle(panel).paddingBottom) + 1
        : panel.scrollHeight > panel.clientHeight + 1);
      while (overflows() && size > QUOTE_FLOOR) {
        size = Math.max(QUOTE_FLOOR, size - 1);
        elText.style.fontSize = size + 'px';
      }
      /* Last resort, for a very long quote on a very short window: at the
         floor and still too long for the frame. The row grows with the panel
         rather than clipping the controls or breaking the 16px rule. */
      if (overflows()) grid.classList.add('ts__grid--grow');
    }
    /* the strip sizes its cards from its own height, so a change in frame
       means re-measuring it; mid-slide, the slide's own place() settles it */
    const isGrown = !!grid && grid.classList.contains('ts__grid--grow');
    if (isGrown !== wasGrown) { measure(); if (!dragging && !animating) place(); }
  }

  const N = TESTIMONIALS.length;
  const SETS = 3;                 // 3 copies → seamless vertical loop
  const CARD_FR = 0.62;           // card height as fraction of the viewport
  const GAP = 12;

  /* build 3 sets of cards */
  const frag = document.createDocumentFragment();
  for (let s = 0; s < SETS; s++) {
    TESTIMONIALS.forEach((t, i) => {
      const c = document.createElement('div');
      c.className = 'ts__card';
      c.dataset.idx = i;
      const img = document.createElement('img');
      img.src = t.img; img.alt = t.name; img.draggable = false; img.loading = 'lazy';
      /* cards are at most 480px wide (full width under 920px), so smaller screens take the 600px cut */
      img.srcset = t.img.replace(/\.webp$/, '-600.webp') + ' 600w, ' + t.img + ' 1000w';
      img.sizes = '(max-width: 920px) 92vw, 480px';
      c.appendChild(img);
      c.addEventListener('click', () => goTo(i));
      frag.appendChild(c);
    });
  }
  strip.appendChild(frag);
  const cardEls = [...strip.children];

  /* nav dashes */
  TESTIMONIALS.forEach((t, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Show testimonial by ' + t.name);
    b.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(b);
  });
  const dots = [...dotsWrap.children];

  let cardH = 0, step = 0, centerY = 0;
  let pos = N;                    // centre strip-index (middle set, item 0)
  let animating = false;

  function measure() {
    const vh = cards.getBoundingClientRect().height;
    cardH = vh * CARD_FR;
    step = cardH + GAP;
    centerY = (vh - cardH) / 2;
    cardEls.forEach((el, k) => {
      el.style.height = cardH + 'px';
      el.style.top = (k * step) + 'px';
    });
  }
  const yFor = (p) => centerY - p * step;
  function place() { gsap.set(strip, { y: yFor(pos) }); }

  const pad = (n) => String(n).padStart(2, '0');
  function highlight() {
    const active = ((pos % N) + N) % N;
    cardEls.forEach((el, k) => el.classList.toggle('is-active', k === pos));
    dots.forEach((d, i) => {
      d.classList.toggle('is-active', i === active);
      d.setAttribute('aria-current', i === active ? 'true' : 'false');
    });
    if (elCount) elCount.textContent = pad(active + 1) + ' / ' + pad(N);
    return active;
  }

  function setContent(i) {
    const t = TESTIMONIALS[i];
    if (prefersReduced) {
      elText.textContent = t.quote; elName.textContent = t.name; elRole.textContent = t.role;
      fitQuote(); return;
    }
    gsap.to([elText, elName, elRole], {
      opacity: 0, y: -14, duration: 0.28, ease: 'power2.in',
      onComplete: () => {
        elText.textContent = t.quote; elName.textContent = t.name; elRole.textContent = t.role;
        fitQuote();                        // sized while still invisible
        gsap.fromTo([elText, elName, elRole],
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.05 });
      }
    });
  }

  function slide(delta) {
    if (delta === 0 || animating) return;
    animating = true;
    const newPos = pos + delta;
    setContent(((newPos % N) + N) % N);
    gsap.to(strip, {
      y: yFor(newPos), duration: prefersReduced ? 0.01 : 0.85, ease: 'power3.inOut',
      onComplete: () => {
        pos = newPos;
        while (pos > 2 * N - 1) pos -= N;      // recycle into the middle set
        while (pos < N) pos += N;
        place(); highlight(); animating = false;
      }
    });
    highlight();
  }
  function goTo(i) {
    if (animating) return;
    const cur = ((pos % N) + N) % N;
    let d = ((i - cur) % N + N) % N;           // forward distance
    if (d > N / 2) d -= N;                      // take the shorter direction
    slide(d);
  }

  /* vertical swipe / drag */
  let dragging = false, sy = 0, sty = 0, dy = 0;
  cards.addEventListener('pointerdown', (e) => {
    if (animating) return;
    dragging = true; sy = e.clientY; dy = 0;
    sty = Number(gsap.getProperty(strip, 'y'));
    try { cards.setPointerCapture && cards.setPointerCapture(e.pointerId); } catch (err) {}
  });
  cards.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dy = e.clientY - sy;
    gsap.set(strip, { y: sty + dy });
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    try { cards.releasePointerCapture && e && e.pointerId != null && cards.releasePointerCapture(e.pointerId); } catch (err) {}
    const th = step * 0.22;
    if (dy <= -th) slide(1);
    else if (dy >= th) slide(-1);
    else gsap.to(strip, { y: yFor(pos), duration: 0.4, ease: 'power3.out' });
  };
  cards.addEventListener('pointerup', end);
  cards.addEventListener('pointercancel', end);

  window.addEventListener('resize', () => { if (!dragging && !animating) { measure(); place(); } });

  if (btnPrev) btnPrev.addEventListener('click', () => slide(-1));
  if (btnNext) btnNext.addEventListener('click', () => slide(1));

  /* The strip runs vertically, so it takes Up/Down as well as Left/Right.
     No focus needed: the shared handler picks whichever slider is on screen. */
  if (window.KaziKeyNav) {
    window.KaziKeyNav.register({ el: section, step: slide, vertical: true });
  }

  measure(); place(); highlight();
  const first = TESTIMONIALS[0];
  elText.textContent = first.quote; elName.textContent = first.name; elRole.textContent = first.role;
  fitQuote();
  /* DM Sans is wider than the fallback it replaces, so a fit taken before it
     loads would come out a size too big */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitQuote);
  let fitTick = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(fitTick);
    fitTick = requestAnimationFrame(fitQuote);
  });
}

/* ---------- Lemon word opacity reveal on scroll ---------- */
function lemonReveal() {
  const words = gsap.utils.toArray('#lemonText .word');
  if (!words.length) return;
  gsap.to(words, {
    opacity: 1,
    stagger: 0.5,
    ease: 'none',
    scrollTrigger: {
      trigger: '#lemonText',
      start: 'top 85%',
      end: 'bottom 55%',
      scrub: true
    }
  });
}

/* ---------- Logo marquee (right -> left) ----------
   Its own function rather than a parameter on marquee(): that one travels the
   other way and has its own staggered sizing, and there is no reason to make
   both harder to read for the sake of sharing eight lines. */
function logoMarquee() {
  const track = document.getElementById('logosTrack');
  if (!track) return;
  const original = track.querySelector('.logos__set');
  track.appendChild(original.cloneNode(true));   // duplicate for a seamless loop

  let setWidth = original.scrollWidth;
  if (prefersReduced) return;                    // leave it parked

  gsap.set(track, { x: 0 });
  gsap.to(track, {
    x: () => -setWidth,
    duration: () => setWidth / 55,               // constant speed at any width
    ease: 'none',
    repeat: -1,
    onRepeat: () => gsap.set(track, { x: 0 }),
  });

  window.addEventListener('resize', () => { setWidth = original.scrollWidth; });
}

/* ---------- Infinite marquee (left -> right) ---------- */
function marquee() {
  const track = document.getElementById('marqueeTrack');
  if (!track) return;
  const original = track.querySelector('.marquee__set');
  // duplicate for seamless loop
  const clone = original.cloneNode(true);
  track.appendChild(clone);

  let setWidth = original.scrollWidth;
  // start shifted left by one set so we can travel rightwards seamlessly
  gsap.set(track, { x: -setWidth });

  const tween = gsap.to(track, {
    x: 0,
    duration: 28,
    ease: 'none',
    repeat: -1,
    onRepeat: () => gsap.set(track, { x: -setWidth })
  });

  window.addEventListener('resize', () => {
    setWidth = original.scrollWidth;
  });
}

/* ---------- Generic scroll reveals ---------- */
function scrollReveals() {
  document.querySelectorAll('.reveal').forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 96%',
      onEnter: () => el.classList.add('visible'),
    });
  });
  // anything already in view on load should show immediately (no waiting)
  ScrollTrigger.refresh();
}

/* ---------- Keep every portfolio video playing ----------
   The clips carry `preload="none"` and no `autoplay`: all five used to start
   downloading while the page was still parsing — about 17MB racing the
   preloader and the hero for a phone's bandwidth. They are started here once
   the preloader has lifted, and kept running from then on.

   Browsers may still refuse an unattended play() (power saving, low battery),
   so the first user interaction retries all of them. */
function ensureVideosPlay() {
  /* Every portfolio clip plays continuously — in view or not, on every screen
     size and connection.

     This used to ration playback: clips were paused when they left the
     viewport, and a phone ran at most two at once (one on a slow line) with
     the rest queued behind whichever card sat nearest the middle of the
     screen. That is why only the card in view ever moved on a phone. The
     rationing is gone; the grid now behaves as one continuous piece.

     The cost is deliberate and worth stating: five 1080p streams decode and
     buffer at the same time, which uses more data and more battery, and on a
     weak connection they compete for bandwidth so each starts later than one
     clip alone would. js/net.js only detaches a source from a clip that is
     already paused, so nothing here is released behind our back. */
  const vids = [...document.querySelectorAll('video')].filter(
    (v) => !v.classList.contains('hero__video')
  );
  if (!vids.length) return;

  /* Safari refuses play() on a clip with nothing buffered, so nudge the load
     and start as soon as it is playable. */
  const play = (v) => {
    if (!v.paused) return;
    const go = () => v.play().catch(() => {});
    if (v.readyState >= 2) { go(); return; }
    v.preload = 'auto';
    v.addEventListener('canplay', go, { once: true });
    if (v.networkState === HTMLMediaElement.NETWORK_EMPTY) v.load();
    go();
  };

  const playAll = () => { if (!document.hidden) vids.forEach(play); };

  /* Undo any pause the page did not ask for — a stall, a dropped stream, or a
     tap on the card. A backgrounded tab is left alone: fighting the browser
     there would drain the battery for something nobody is looking at. */
  vids.forEach((v) => {
    v.addEventListener('pause', () => { if (!document.hidden) play(v); });
    v.addEventListener('stalled', () => { if (!document.hidden) play(v); });
  });

  document.addEventListener('visibilitychange', () => { if (!document.hidden) playAll(); });

  /* Autoplay refused outright stays refused until the page is touched. */
  ['pointerdown', 'touchstart', 'keydown', 'scroll'].forEach((ev) =>
    window.addEventListener(ev, playAll, { once: true, passive: true })
  );

  whenPreloaderDone(playAll);
}

/* ---------- Init ---------- */
function init() {
  splitLemonWords();
  runPreloader();
  initNavScroll();
  mobileNav();
  servicesInteractive();
  testimonials();
  lemonReveal();
  marquee();
  logoMarquee();
  scrollReveals();
  ensureVideosPlay();
  keepHeroPlaying();
  ScrollTrigger.refresh();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Recalculate pinned/scroll positions once everything (images) has loaded.
window.addEventListener('load', () => ScrollTrigger.refresh());
window.addEventListener('resize', () => ScrollTrigger.refresh());

/* ---------- Home links on the home page ----------
   They point at "./" so the address never picks up a "#top". Here, on the
   page they lead to, a click just scrolls back up instead of reloading. */
if (location.hash === '#top') history.replaceState(null, '', location.pathname + location.search);
document.querySelectorAll('a[href="./"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
  });
});
