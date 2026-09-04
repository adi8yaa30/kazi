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
   The nav is shown only while the page is at the very top, and only after the
   hero video has played through once. Scrolling down hides it; it reappears
   only when the user returns to the top (scrolling up midway does not). */
const NAV_TOP_THRESHOLD = 10; // px from the top within which the nav is shown
let navUnlocked = false;       // becomes true once the hero video has finished

function applyNavState() {
  const nav = document.getElementById('nav');
  if (navUnlocked && window.scrollY <= NAV_TOP_THRESHOLD) {
    nav.classList.add('is-visible');
  } else {
    nav.classList.remove('is-visible');
  }
}

// Called once the hero video completes: unlock the nav and show it if at top.
function showNav() {
  navUnlocked = true;
  applyNavState();
}

/* Toggle the nav purely by scroll position: visible at the top, hidden once
   the user scrolls down. */
function initNavScroll() {
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

/* Reveal the nav only after the hero clip has played all the way through.
   The hero video loops, which suppresses the native `ended` event, so we
   watch for the first time playback reaches the end of the clip. A
   duration-based safety net guarantees the nav can never stay hidden if the
   video fails to load or autoplay is blocked. */
function revealNavAfterVideo() {
  const nav = document.getElementById('nav');
  if (nav.classList.contains('is-visible')) return;
  const video = document.querySelector('.hero__video');

  let done = false;
  const reveal = () => { if (done) return; done = true; showNav(); };

  if (!video) { reveal(); return; }

  // Detect a completed pass either by reaching the end of the clip or by the
  // loop wrapping playback back to the start (`timeupdate` is coarse, so the
  // backward jump is the reliable signal when `loop` is on).
  let prev = 0;
  const onTime = () => {
    const t = video.currentTime;
    const reachedEnd = video.duration && t >= video.duration - 0.5;
    const wrapped = prev > 1 && t < prev - 1;
    prev = t;
    if (reachedEnd || wrapped) {
      video.removeEventListener('timeupdate', onTime);
      reveal();
    }
  };
  video.addEventListener('timeupdate', onTime);
  video.addEventListener('ended', reveal); // covers the case where loop is removed

  // Safety net: reveal a beat after the clip's natural length regardless.
  const arm = () => {
    const d = (video.duration && isFinite(video.duration)) ? video.duration : 12;
    setTimeout(reveal, d * 1000 + 1000);
  };
  if (video.readyState >= 1) arm();
  else video.addEventListener('loadedmetadata', arm, { once: true });
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
  revealNavAfterVideo();
}

/* ---------- Preloader ---------- */
let preloaderFinished = false;
function finishPreloader(skipHeroAnim) {
  if (preloaderFinished) return;
  preloaderFinished = true;
  const pre = document.getElementById('preloader');
  pre.style.display = 'none';
  document.body.classList.remove('is-locked');
  if (skipHeroAnim) {
    const media = document.querySelector('.hero__media');
    media.style.opacity = 1;
    media.style.transform = 'scale(1)';
    const v = document.querySelector('.hero__video');
    if (v) v.play().catch(() => {});
    revealNavAfterVideo();
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
    onComplete: () => { clearTimeout(safety); finishPreloader(false); }
  });

  // Logo pops in
  tl.to(logo, { opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out' })
    .to(logo, { scale: 1.04, duration: 0.5, ease: 'power1.inOut' }, '+=0.15')
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
  { num: '02', name: 'CGI & Motion Graphics',   kicker: 'Imagination, Rendered',
    imgStatic: 'assets/img/services/static-state/cgi-&-motion-graphics-image-static-state.webp',
    imgHover:  'assets/img/services/hovered-state/cgi-&-motion-graphics-image-hovered-state.webp',
    desc: 'High-impact CGI, motion design, and visual effects that transform ideas into immersive digital experiences.' },
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
    imgHover:  'assets/img/services/hovered-state/ original-ip-&-series-image-hovered-state.webp',
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
  const hoverable = window.matchMedia('(hover: hover)').matches;
  let slideIdx = 0;

  /* build slides */
  const slides = [];
  for (let s = 0; s < 3; s++) {
    const slide = document.createElement('div');
    slide.className = 'ks__slide';
    for (let c = 0; c < 3; c++) {
      const svc = SERVICES[s * 3 + c];
      const pos = ['a', 'b', 'c'][c];
      const col = document.createElement('div');
      col.className = 'ks__col ks__col--' + pos;
      const media = svc.video
        ? '<video class="ks__img ks__vid" muted loop playsinline preload="none"'
          + ' poster="' + svc.poster + '" aria-label="' + svc.name + '">'
          + '<source src="' + svc.video + '" type="video/mp4" /></video>'
        : '<img class="ks__img ks__img--static" src="' + svc.imgStatic + '" alt="' + svc.name + '" loading="lazy" />'
          + '<img class="ks__img ks__img--hover" src="' + svc.imgHover + '" alt="' + svc.name + ' expanded" loading="lazy" />';
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

      const activate = () => {
        slide.classList.add('has-active');
        slide.querySelectorAll('.ks__col').forEach((el) => el.classList.toggle('is-active', el === col));
      };
      /* Desktop opens a service on hover. Touch needs its own path: the
         synthesized click a tap is supposed to produce does not always
         survive (the swipe handler on the viewport and the browser's own
         scroll arbitration can swallow it), so drive it off pointerup
         directly. A movement threshold keeps a swipe from counting as a tap.
         `hoverable` is read live rather than once at load, so a device that
         reports hover but is driven by touch still opens on tap. */
      col.addEventListener('mouseenter', () => {
        if (window.matchMedia('(hover: hover)').matches) activate();
      });
      let downX = 0, downY = 0, moved = false;
      col.addEventListener('pointerdown', (e) => {
        downX = e.clientX; downY = e.clientY; moved = false;
      });
      col.addEventListener('pointermove', (e) => {
        if (Math.abs(e.clientX - downX) > 10 || Math.abs(e.clientY - downY) > 10) moved = true;
      });
      const tap = () => { if (!moved && !col.classList.contains('is-active')) activate(); };
      col.addEventListener('pointerup', tap);
      col.addEventListener('pointercancel', () => { moved = true; });
      /* belt and braces for anything that delivers a click but no pointerup */
      col.addEventListener('click', () => {
        if (!col.classList.contains('is-active')) activate();
      });
    }
    if (hoverable) slide.addEventListener('mouseleave', () => {
      slide.classList.remove('has-active');
      slide.querySelectorAll('.ks__col').forEach((el) => el.classList.remove('is-active'));
    });
    track.appendChild(slide);
    slides.push(slide);
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

  /* slider */
  function goTo(i) {
    slideIdx = (i + 3) % 3;
    track.style.transition = prefersReduced ? 'none' : 'transform 0.85s cubic-bezier(0.22, 1, 0.36, 1)';
    track.style.transform = 'translateX(' + (-slideIdx * 100 / 3) + '%)';
    segs.forEach((b, j) => b.classList.toggle('is-active', j === slideIdx));
    slides.forEach((sl) => {
      sl.classList.remove('has-active');
      sl.querySelectorAll('.ks__col').forEach((el) => el.classList.remove('is-active'));
    });
    ensureMobileActive();
  }
  goTo(0);
  smallScreen.addEventListener && smallScreen.addEventListener('change', () => {
    if (smallScreen.matches) ensureMobileActive();
    else slides.forEach((sl) => {
      sl.classList.remove('has-active');
      sl.querySelectorAll('.ks__col').forEach((el) => el.classList.remove('is-active'));
    });
  });
  arrow && arrow.addEventListener('click', () => goTo(slideIdx + 1));

  /* Arrow keys drive the same three slides as the arrow button and the
     segment tabs, wrapping through goTo's modulo. */
  if (window.KaziKeyNav) {
    window.KaziKeyNav.register({ el: viewport, step: (dir) => goTo(slideIdx + dir) });
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
const TESTIMONIALS = [
  { img: 'assets/img/testimonials/rhik-baruah.webp', name: 'Rhik Baruah', role: 'RAB Automotors, Owner',
    quote: 'Working with Kazi felt less like hiring an agency and more like collaborating with a creative partner. Every idea was thoughtfully executed, and the final result exceeded our expectations.' },
  { img: 'assets/img/testimonials/tasneem-hafiz.webp', name: 'Tasneem Hafiz', role: 'Studio Artitecting, Founder',
    quote: 'Kazi understood our vision from day one and translated it into work that felt thoughtful, refined, and true to our brand. Their collaborative approach and attention to detail made the entire process seamless. We couldn’t have asked for a better creative partner.' },
  { img: 'assets/img/testimonials/xyz.webp', name: 'XYZ', role: 'ABC Company, Founder',
    quote: 'They reframed heritage into something that feels current without losing its soul. Kazi’s films gave our craft a voice that finally travels beyond the loom — confident, cinematic, and unmistakably ours.' },
];

/* ---------- Portfolio cards: tap-to-reveal on touch devices ---------- */
function workCardsTouch() {
  if (window.matchMedia('(hover: hover)').matches) return;
  const cards = [...document.querySelectorAll('.work__grid .card')];
  cards.forEach((c) => c.addEventListener('click', () => {
    const wasOpen = c.classList.contains('is-open');
    cards.forEach((o) => o.classList.remove('is-open'));
    if (!wasOpen) c.classList.add('is-open');
  }));
}

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
      elText.textContent = t.quote; elName.textContent = t.name; elRole.textContent = t.role; return;
    }
    gsap.to([elText, elName, elRole], {
      opacity: 0, y: -14, duration: 0.28, ease: 'power2.in',
      onComplete: () => {
        elText.textContent = t.quote; elName.textContent = t.name; elRole.textContent = t.role;
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

/* ---------- Play portfolio videos while they are on screen ----------
   The clips carry `preload="none"` and a poster, so they cost nothing until
   something asks them to play — which means playback has to be driven here
   rather than by an `autoplay` attribute. Starting every clip on load was
   pulling all five portfolio videos down at once before the visitor had
   scrolled anywhere near them; an IntersectionObserver defers each fetch to
   the point where the card is actually approaching the viewport, and pausing
   on exit keeps offscreen clips from decoding.

   Browsers may still refuse an unattended play() (power saving, low battery),
   so the first user interaction retries whatever is currently in view. */
function ensureVideosPlay() {
  const vids = [...document.querySelectorAll('video')];
  if (!vids.length) return;
  const inView = new Set();

  /* Safari will not start a clip that has nothing buffered, and these all carry
     preload="none" — a bare play() is refused. Nudge the load, then play once
     the clip is actually playable. */
  const play = (v) => {
    if (!v.paused) return;
    const go = () => v.play().catch(() => {});
    if (v.readyState >= 2) { go(); return; }
    v.preload = 'auto';
    v.addEventListener('canplay', go, { once: true });
    if (v.networkState === HTMLMediaElement.NETWORK_EMPTY) v.load();
    go();
  };

  if (typeof IntersectionObserver === 'undefined') { vids.forEach(play); return; }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) { inView.add(v); play(v); }
      else { inView.delete(v); if (!v.paused) v.pause(); }
    });
    /* 200px of lead-in so the clip has a moment to buffer before it is seen */
  }, { rootMargin: '200px 0px', threshold: 0 });
  vids.forEach((v) => io.observe(v));

  const retry = () => inView.forEach(play);
  ['pointerdown', 'touchstart', 'keydown'].forEach((ev) =>
    window.addEventListener(ev, retry, { once: true, passive: true })
  );
}

/* ---------- Init ---------- */
function init() {
  splitLemonWords();
  runPreloader();
  initNavScroll();
  mobileNav();
  servicesInteractive();
  workCardsTouch();
  testimonials();
  lemonReveal();
  marquee();
  logoMarquee();
  scrollReveals();
  ensureVideosPlay();
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
