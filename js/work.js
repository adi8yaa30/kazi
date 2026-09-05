/* ============================================================
   KAZI — WORK PAGE (redesign)
   Landing card-stack + EXPLORE → infinite draggable gallery
   (ALL PROJECTS), FEATURED BRANDS slider, SNIPPETS scattered /
   arranged. Covers open the case-study pages via the shared
   card-into-hero ghost transition.
   ============================================================ */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hoverable = window.matchMedia('(hover: hover)').matches;
  if (typeof gsap === 'undefined') return;

  /* ------------------------------------------------------------
     DATA — stack fractions are of the landing stage box;
     tile fractions are of the infinite-canvas tile; w in vw.
     ------------------------------------------------------------ */
  /* tile fx/fy/w are packed together as one set — see the note in
     layoutBases(). They are solved so no two cards overlap anywhere on the
     wrapping canvas with ~34px of clear space at 1440px wide; nudging one by
     hand can push it into a neighbour, so re-solve the whole set instead. */
  /* ------------------------------------------------------------
     INDUSTRIES — the filter taxonomy.

     This is the ONE place to edit tagging. Every item below carries an
     `industry` key from this list; the filter chips are generated from
     whichever keys are actually in use, so adding, renaming or retiring an
     industry here is the whole change. Tags and titles below were read off
     the reels themselves (brand names are the ones legible on screen);
     correct them freely, nothing else depends on them. Menu order follows
     this array.
     ------------------------------------------------------------ */
  const INDUSTRIES = [
    { key: 'fashion',    label: 'Fashion & Retail' },
    { key: 'food',       label: 'Food & Beverage' },
    { key: 'education',  label: 'Education' },
    { key: 'interiors',  label: 'Interiors & Living' },
    { key: 'beauty',     label: 'Beauty & Wellness' },
    { key: 'fitness',    label: 'Fitness & Sports' },
    { key: 'textile',    label: 'Textile & Manufacturing' },
    { key: 'automotive', label: 'Automotive' },
  ];
  const industryLabel = (k) => (INDUSTRIES.find((i) => i.key === k) || {}).label || '';

  const ITEMS = [
    { id: 'rab',    type: 'cover', name: 'RAB Automotors', industry: 'automotive',    img: 'assets/img/work-rab.webp',    page: 'work-rab.html',
      tile: { fx: 0.3099, fy: 0.1794, w: 0.31 },  stack: { x: 0.25, y: 0.1711, w: 0.505, h: 0.4605, z: 9 } },
    { id: 'orient', type: 'cover', name: 'Orient Yarn', industry: 'textile',        img: 'assets/img/work-orient.webp', page: 'work-orient.html',
      tile: { fx: 0.6802, fy: 0.2290, w: 0.29 },  stack: { x: 0.63, y: 0.1316, w: 0.30, h: 0.4737, z: 3 } },
    { id: 'studio', type: 'cover', name: 'Studio Artitecting', industry: 'interiors', img: 'assets/img/work-studio.webp', page: 'work-studio.html',
      tile: { fx: 0.7301, fy: 0.6759, w: 0.32 },  stack: { x: 0.08, y: 0.3421, w: 0.22, h: 0.3684, z: 4 } },
    { id: 'rs',     type: 'cover', name: 'Relentless Strength', industry: 'fitness', img: 'assets/img/work-rs.webp',   page: 'work-rs.html',
      tile: { fx: 0.3980, fy: 0.5270, w: 0.22 },  stack: null },
    { id: 'orfab',  type: 'cover', name: 'Orfab By Orient', industry: 'textile',      img: 'assets/img/work-orfab.webp', page: 'work-orfab.html',
      tile: { fx: 0.4429, fy: 0.9958, w: 0.17 },  stack: null },
    { id: 'jorhat', type: 'cover', name: 'Jorhat Stallions', industry: 'fitness',     img: 'assets/img/work-jorhat.webp', page: 'work-jorhat.html',
      tile: { fx: 0.0700, fy: 0.6575, w: 0.20 },  stack: null },
    { id: 'r1',   type: 'reel', n: 1, name: 'Ugha at Hasthkala', industry: 'fashion',  tile: { fx: 0.4324, fy: 0.7798, w: 0.125 }, stack: { x: 0.60, y: 0.5263, w: 0.14, h: 0.3421, z: 5 } },
    { id: 'r2',   type: 'reel', n: 2, name: 'Mosaic — Signature Sips', industry: 'food',  tile: { fx: 0.1636, fy: 0.2902, w: 0.100 }, stack: { x: 0.02, y: 0.0526, w: 0.26, h: 0.6579, z: 1 } },
    { id: 'r3',   type: 'reel', n: 3, name: 'hatk. — Store Film', industry: 'fashion',  tile: { fx: 0.5552, fy: 0.3063, w: 0.115 }, stack: null },
    { id: 'r4',   type: 'reel', n: 4, name: 'Arizona Sports Arena', industry: 'fitness',  tile: { fx: 0.9831, fy: 0.7824, w: 0.090 }, stack: null },
    { id: 'r5',   type: 'reel', n: 5, name: 'Atlanta Industries x Ikigai', industry: 'food',  tile: { fx: 0.8617, fy: 0.4158, w: 0.130 }, stack: null },
    { id: 'r6',   type: 'reel', n: 6, name: 'Atlanta Industries — Crockery', industry: 'food',  tile: { fx: 0.3326, fy: 0.9087, w: 0.105 }, stack: { x: 0.77, y: 0.3158, w: 0.20, h: 0.5263, z: 6 } },
    { id: 'r7',   type: 'reel', n: 7, name: 'Lakm&eacute; Salon — Soft Glam', industry: 'beauty',  tile: { fx: 0.0662, fy: 0.4692, w: 0.120 }, stack: { x: 0.30, y: 0.6053, w: 0.23, h: 0.3947, z: 7 } },
    { id: 'r8',   type: 'reel', n: 8, name: 'Lakm&eacute; Salon — Good Hair', industry: 'beauty',  tile: { fx: 0.9140, fy: 0.1509, w: 0.095 }, stack: null },
    { id: 'r9',   type: 'reel', n: 9, name: 'Lakm&eacute; Salon — The Glow', industry: 'beauty',  tile: { fx: 0.5909, fy: 0.7699, w: 0.110 }, stack: { x: 0.52, y: 0.5526, w: 0.16, h: 0.3684, z: 2 } },
    { id: 'r10',  type: 'reel', n: 10, name: 'hatk. — Photo Booth', industry: 'fashion', tile: { fx: 0.5804, fy: 0.5544, w: 0.085 }, stack: { x: 0.30, y: 0.0, w: 0.26, h: 0.3158, z: 8 } },
    { id: 'r11',  type: 'reel', n: 11, name: 'Rani — Shinobu Jacket', industry: 'fashion', tile: { fx: 0.1940, fy: 0.8821, w: 0.125 }, stack: null },
    { id: 'r12',  type: 'reel', n: 12, name: 'Rani — Introducing', industry: 'fashion', tile: { fx: 0.0645, fy: 0.7856, w: 0.100 }, stack: null },
    { id: 'r13',  type: 'reel', n: 13, name: 'Rani — The Collection', industry: 'fashion', tile: { fx: 0.1483, fy: 0.1081, w: 0.115 }, stack: null },
    { id: 'r14',  type: 'reel', n: 14, name: 'Rani — Five Years', industry: 'fashion', tile: { fx: 0.7781, fy: 0.4575, w: 0.090 }, stack: null },
    { id: 'r15',  type: 'reel', n: 15, name: 'Axel Public School — Every Dream', industry: 'education', tile: { fx: 0.2354, fy: 0.6669, w: 0.130 }, stack: null },
    { id: 'r16',  type: 'reel', n: 16, name: 'Axel Public School x Physics Wallah', industry: 'education', tile: { fx: 0.9989, fy: 0.9498, w: 0.105 }, stack: null },
    { id: 'r17',  type: 'reel', n: 17, name: 'Axel Public School — Cultural Symphony', industry: 'education', tile: { fx: 0.6637, fy: 0.4654, w: 0.120 }, stack: null },
    { id: 'r18',  type: 'reel', n: 18, name: 'Axel Public School — Krida Samar', industry: 'education', tile: { fx: 0.5758, fy: 0.1538, w: 0.095 }, stack: null },
    { id: 'r19',  type: 'reel', n: 19, name: 'Relax — The Build', industry: 'interiors', tile: { fx: 0.6413, fy: 0.9515, w: 0.110 }, stack: null },
    { id: 'r20',  type: 'reel', n: 20, name: 'Emerald by Relax', industry: 'interiors', tile: { fx: 0.1792, fy: 0.4664, w: 0.085 }, stack: null },
    { id: 'r21',  type: 'reel', n: 21, name: 'Relax — Lasting Comfort', industry: 'interiors', tile: { fx: 0.0358, fy: 0.2346, w: 0.125 }, stack: null },
    { id: 'r22',  type: 'reel', n: 22, name: 'Lynchpin EduFest', industry: 'education', tile: { fx: 0.3079, fy: 0.4107, w: 0.100 }, stack: null },
    { id: 'r23',  type: 'reel', n: 23, name: 'Munchies — The Interrogation', industry: 'food', tile: { fx: 0.7523, fy: 0.0037, w: 0.115 }, stack: null },
    { id: 'r24',  type: 'reel', n: 24, name: 'Munchies — Signature Plates', industry: 'food', tile: { fx: 0.9780, fy: 0.4653, w: 0.090 }, stack: null },
    { id: 'r25',  type: 'reel', n: 25, name: 'Munchies — Ain&rsquo;t Polite', industry: 'food', tile: { fx: 0.8633, fy: 0.8939, w: 0.130 }, stack: null },
  ];
  ITEMS.forEach((it) => {
    if (it.type === 'reel') {
      it.src = 'assets/video/snippets/reel-' + it.n + '.mp4';
      it.poster = 'assets/video/snippets/posters/reel-' + it.n + '.webp';
    }
  });
  const covers = ITEMS.filter((i) => i.type === 'cover');
  const reels = ITEMS.filter((i) => i.type === 'reel');

  /* ------------------------------------------------------------
     DOM
     ------------------------------------------------------------ */
  const nav = document.getElementById('nav');
  const landing = document.getElementById('wl');
  const footer = document.getElementById('wlFooter');
  const stage = document.getElementById('wlStage');
  const exploreBtn = document.getElementById('wlExplore');
  const ex = document.getElementById('ex');
  const canvas = document.getElementById('exCanvas');
  const dim = document.getElementById('exDim');
  const label = document.getElementById('exLabel');
  const labelName = document.getElementById('exLabelName');
  const labelNum = document.getElementById('exLabelNum');
  const exNavLinks = [...document.querySelectorAll('.ex__links button')];
  const modeBtn = document.getElementById('exMode');
  const closeBtn = document.getElementById('exClose');
  const pill = document.getElementById('exPill');
  const pillText = document.getElementById('exPillText');
  const listEl = document.getElementById('exList');
  const topEl = document.getElementById('exTop');
  const filterBtn = document.getElementById('exFilterBtn');
  const filterLabel = document.getElementById('exFilterLabel');
  const filterMenu = document.getElementById('exFilterMenu');
  const filterOpts = document.getElementById('exFilterOpts');
  const layoutBtn = document.getElementById('exLayout');
  const brandSec = document.getElementById('exListBrands');
  const reelSec = document.getElementById('exListReels');
  const brandRows = document.getElementById('exBrandRows');
  const reelGrid = document.getElementById('exReelGrid');
  const brandCount = document.getElementById('exBrandCount');
  const reelCount = document.getElementById('exReelCount');
  const listEmpty = document.getElementById('exListEmpty');

  /* ------------------------------------------------------------
     Build landing stack + canvas items
     ------------------------------------------------------------ */
  ITEMS.forEach((it) => {
    if (!it.stack) return;
    const card = document.createElement('div');
    card.className = 'wl__card';
    card.style.cssText = `left:${it.stack.x * 100}%;top:${it.stack.y * 100}%;`
      + `width:${it.stack.w * 100}%;height:${it.stack.h * 100}%;z-index:${it.stack.z};`;
    const img = document.createElement('img');
    img.src = it.type === 'cover' ? it.img : it.poster;
    img.alt = '';
    card.appendChild(img);
    it.stackEl = card;
    stage.insertBefore(card, exploreBtn);
  });

  ITEMS.forEach((it) => {
    const el = document.createElement('div');
    el.className = 'ex__item ex__item--' + it.type;
    el.dataset.id = it.id;
    if (it.type === 'cover') {
      const img = document.createElement('img');
      img.src = it.img; img.alt = it.name;
      el.appendChild(img);
    } else {
      const v = document.createElement('video');
      v.src = it.src; v.poster = it.poster;
      /* 25 reels live on this canvas at once; the poster is what the card
         shows until one is played, so none of them need to fetch video data
         (not even metadata) up front. */
      v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none';
      el.appendChild(v);
      it.video = v;
    }
    const wash = document.createElement('div');
    wash.className = 'wash';
    el.appendChild(wash);
    it.el = el; it.washEl = wash;
    canvas.appendChild(el);
  });

  /* ------------------------------------------------------------
     Geometry
     ------------------------------------------------------------ */
  const vw = () => window.innerWidth;
  const vh = () => window.innerHeight;
  const aspect = (it) => (it.type === 'cover' ? 2 / 3 : 16 / 9); /* h = w * aspect */

  /* Every size on this screen is a fraction of the viewport width, which was
     read off a 1440px frame. On a 390px phone that arithmetic turns the
     cards into thumbnails. So the phone works against a wider imaginary
     viewport: the cards grow, and because the canvas's wrap period is scaled
     by the same number, the composition and its spacing are unchanged — the
     visitor is simply standing closer to it. */
  /* A phone reads as 0 here, a desktop as 1, and a tablet lands in between —
     the sizes below interpolate rather than jumping at a breakpoint, so an
     820px iPad is not handed the geometry of a 1440px monitor. */
  const PHONE = 480, DESK = 1100;
  const t = () => Math.max(0, Math.min(1, (vw() - PHONE) / (DESK - PHONE)));
  const lerp = (phone, desk) => phone + (desk - phone) * t();

  /* The imaginary viewport the canvas is laid out against. It never drops
     below a floor that keeps the cards a usable size, and meets the real
     width at 1280 so wide screens are laid out exactly as authored. */
  const vwz = () => Math.max(vw(), Math.min(1280, 975 + (vw() - 375) * 0.35));

  let tileW = 0, tileH = 0, Mx = 0, My = 0;
  function layoutBases() {
    let maxW = 0, maxH = 0;
    ITEMS.forEach((it) => {
      it.w = it.tile.w * vwz();
      it.h = it.w * aspect(it);
      maxW = Math.max(maxW, it.w);
      maxH = Math.max(maxH, it.h);
    });
    Mx = maxW + 60; My = maxH + 60;
    /* The tile is the wrap period of the infinite canvas, so it also sets the
       density: every card lives inside one tile. It was sized for 15 cards;
       with 30 it has to grow in step or the field packs shoulder to shoulder.
       These multipliers keep the fill around 42%, and the tile fractions in
       ITEMS are packed against exactly this geometry — change one and the
       cards will start to touch. */
    /* the first term keeps the fill density, the second guarantees the period
       still covers the real viewport so the wrap never shows a seam */
    tileW = Math.max(vwz() * 1.40, vw() + Mx + 20);
    tileH = Math.max(vwz() * 1.30, vh() + My + 20);
    ITEMS.forEach((it) => {
      it.bx = it.tile.fx * tileW;
      it.by = it.tile.fy * tileH;
    });
  }
  const wrap = (v, t) => ((v % t) + t) % t;

  /* pan offsets */
  let ox = 0, oy = 0;
  function render() {
    ITEMS.forEach((it) => {
      if (it.hidden) return;
      const sx = wrap(it.bx + ox + Mx, tileW) - Mx;
      const sy = wrap(it.by + oy + My, tileH) - My;
      it.x = sx; it.y = sy;
      it.el.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
    });
  }
  function sizeItems() {
    ITEMS.forEach((it) => {
      it.el.style.width = it.w + 'px';
      it.el.style.height = it.h + 'px';
    });
  }

  /* ------------------------------------------------------------
     State
     ------------------------------------------------------------ */
  let view = 'landing';         /* landing | all | featured | snippets */
  let snippetMode = 'scattered';
  let panEnabled = false;
  let busy = false;
  let featuredIdx = 0;
  let arrangedIdx = 4; /* start near the middle so the strip reads centred */
  let focused = null;           /* focused reel data */
  let filter = 'all';           /* industry key, or 'all' */
  let listOpen = false;

  /* Hidden cards keep their box in the layout (they are only faded to
     opacity 0 / parked off-stage), so they would still win hit-testing and
     swallow the pointer over a card that is visually on top. Mirror the flag
     onto pointer-events so elementFromPoint always resolves to what is
     actually visible. */
  function setHidden(it, v) {
    it.hidden = v;
    it.el.style.pointerEvents = v ? 'none' : '';
  }

  /* the pill is suppressed while a transition runs; re-resolve it the moment
     the layout settles so a stationary cursor still gets the right label */
  function setBusy(v) {
    busy = v;
    if (!v) refreshPill();
  }

  const playAll = () => reels.forEach((r) => { r.video.muted = true; r.video.play().catch(() => {}); });
  const pauseAll = () => reels.forEach((r) => r.video.pause());

  /* ------------------------------------------------------------
     Cursor pill
     ------------------------------------------------------------ */
  let pillMode = '';
  function setPill(text) {
    if (text === pillMode) return;
    pillMode = text;
    if (!text) { pill.classList.remove('is-visible'); return; }
    pillText.innerHTML = text;
    pill.classList.add('is-visible');
  }
  /* last known pointer position, so the pill can be re-resolved after a
     layout change even when the pointer itself never moved */
  let px = -1, py = -1;
  if (hoverable) {
    window.addEventListener('mousemove', (e) => {
      px = e.clientX; py = e.clientY;
      if (view === 'landing') return;
      pill.style.left = px + 'px';
      pill.style.top = py + 'px';
      updatePill();
    });
  }
  /* the cards move under a stationary cursor (sliding, switching views), so
     re-run the hit test once the layout has settled */
  function refreshPill() { updatePill(); }
  function updatePill() {
    if (!hoverable || view === 'landing' || listOpen) return setPill('');
    if (busy) return setPill('');
    if (px < 0) return setPill('');
    const target = document.elementFromPoint(px, py);
    if (!target) return setPill('');
    if (target.closest('.ex__top') || target.closest('.ex__list')) return setPill('');
    if (focused) return setPill('Close');
    const itemEl = target.closest('.ex__item');
    const it = itemEl && ITEMS.find((i) => i.el === itemEl && !i.hidden);
    if (view === 'featured') {
      if (it && it.type === 'cover' && covers.indexOf(it) === featuredIdx) return setPill(it.name + ' [Click to Explore]');
      return setPill('Slide');
    }
    if (view === 'snippets' && snippetMode === 'arranged') {
      if (it && it.type === 'reel') return setPill(reels.indexOf(it) === arrangedIdx ? 'Click to Play' : 'Click to View');
      return setPill('Drag');
    }
    if (it) {
      if (it.type === 'cover') return setPill(it.name + ' [Click to Explore]');
      return setPill('Click to Play');
    }
    return setPill('Click &amp; Drag');
  }

  /* ------------------------------------------------------------
     Open / close explorer
     ------------------------------------------------------------ */
  function openExplorer() {
    if (busy || view !== 'landing') return;
    busy = true;
    layoutBases(); sizeItems();
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);

    ex.classList.add('is-open');
    ex.setAttribute('aria-hidden', 'false');

    const dur = reduce ? 0.01 : 1.15;
    ITEMS.forEach((it) => {
      setHidden(it, false);
      it.el.style.opacity = 1;
      const tx = wrap(it.bx + Mx, tileW) - Mx;
      const ty = wrap(it.by + My, tileH) - My;
      if (it.stackEl) {
        const r = it.stackEl.getBoundingClientRect();
        gsap.set(it.el, { x: r.left, y: r.top, width: r.width, height: r.height });
        gsap.to(it.el, { x: tx, y: ty, width: it.w, height: it.h, duration: dur, ease: 'power4.inOut' });
      } else {
        gsap.set(it.el, { x: tx, y: ty, width: it.w, height: it.h, opacity: 0, scale: 0.85 });
        gsap.to(it.el, { opacity: 1, scale: 1, duration: dur * 0.7, delay: dur * 0.35, ease: 'power3.out' });
      }
    });
    gsap.to([landing, footer, nav], { opacity: 0, duration: 0.5, ease: 'power2.out' });
    gsap.delayedCall(0.55, () => { landing.style.visibility = footer.style.visibility = nav.style.visibility = 'hidden'; });
    gsap.delayedCall(dur, () => {
      ox = 0; oy = 0; render();
      panEnabled = true; setBusy(false);
      setNavActive('all'); view = 'all';
      playAll();
    });
    gsap.fromTo('.ex__top', { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 0.6, delay: dur * 0.5 });
  }

  function closeExplorer() {
    if (busy) return;
    busy = true; panEnabled = false;
    unfocusReel(true);
    closeList();
    setPill('');
    landing.style.visibility = footer.style.visibility = nav.style.visibility = '';
    const dur = reduce ? 0.01 : 1.15;
    ITEMS.forEach((it) => {
      /* the wash used to be cleared in a single frame, so every dimmed side
         card popped back to full colour before it had started moving */
      gsap.to(it.washEl, { opacity: 0, duration: dur * 0.4, ease: 'power2.out' });
      /* cards parked out of the current view stay where they are — flying
         them back from wherever featured/snippets left them reads as a swarm
         of cards appearing from nowhere. Their landing card is underneath
         already, so nothing is missing at the end. */
      if (it.hidden) return;
      if (it.stackEl) {
        const r = it.stackEl.getBoundingClientRect();
        gsap.to(it.el, {
          x: r.left, y: r.top, width: r.width, height: r.height,
          opacity: 1, scale: 1, duration: dur,
          /* power4.inOut crams most of the travel into a short burst mid
             flight; on a card whose box changes shape that burst is where the
             crop lurches. power2 spreads the same distance more evenly. */
          ease: 'power2.inOut',
        });
      } else {
        gsap.to(it.el, { opacity: 0, scale: 0.9, duration: dur * 0.45, ease: 'power2.in' });
      }
    });
    gsap.to('.ex__top', { opacity: 0, y: -14, duration: 0.4 });
    gsap.to(label, { opacity: 0, duration: 0.3 });
    /* The landing comes up first and the explorer then dissolves over it,
       instead of being cut away in one frame at the end. A card whose landing
       box has a different shape than its canvas card is still re-cropping over
       the last stretch of the flight; dissolving into the finished stack card
       — same position, final crop — covers exactly that stretch. Both layers
       sit on the same accent background, so the dissolve shows no seam. */
    gsap.to([landing, footer, nav], { opacity: 1, duration: dur * 0.45, delay: dur * 0.32 });
    gsap.to(ex, { opacity: 0, duration: dur * 0.32, delay: dur * 0.68, ease: 'power1.inOut' });
    gsap.delayedCall(dur, () => {
      ex.classList.remove('is-open');
      ex.setAttribute('aria-hidden', 'true');
      /* drop the inline opacity the dissolve left behind, or the next open
         would fade in from nothing */
      gsap.set(ex, { clearProps: 'opacity' });
      document.body.style.overflow = '';
      pauseAll();
      modeBtn.classList.remove('is-visible');
      view = 'landing'; setBusy(false);
    });
  }

  /* ------------------------------------------------------------
     Views
     ------------------------------------------------------------ */
  function setNavActive(v) {
    exNavLinks.forEach((b) => b.classList.toggle('is-active', b.dataset.view === v));
    modeBtn.classList.toggle('is-visible', v === 'snippets');
  }

  function setView(v) {
    if (busy || view === v || view === 'landing') return;
    if (focused) unfocusReel(true);
    const from = view;
    view = v; busy = true;
    setNavActive(v);
    const done = () => { setBusy(false); };

    if (v === 'all') {
      panEnabled = false;
      hideLabel();
      const dur = reduce ? 0.01 : 1.0;
      ITEMS.forEach((it) => {
        setHidden(it, false);
        const tx = wrap(it.bx + Mx, tileW) - Mx;
        const ty = wrap(it.by + My, tileH) - My;
        gsap.to(it.washEl, { opacity: 0, duration: 0.5 });
        gsap.to(it.el, { x: tx, y: ty, width: it.w, height: it.h, opacity: 1, scale: 1, duration: dur, ease: 'power4.inOut' });
      });
      gsap.delayedCall(dur, () => { ox = 0; oy = 0; render(); panEnabled = true; playAll(); done(); });
    } else if (v === 'featured') {
      panEnabled = false;
      layoutFeatured(true, done);
    } else {
      panEnabled = false;
      snippetMode = (from === 'featured') ? 'arranged' : 'scattered';
      modeBtn.classList.toggle('show-arranged', snippetMode === 'scattered');
      if (snippetMode === 'arranged') layoutArranged(true, done);
      else layoutScattered(true, done);
    }
  }

  /* ---------- FEATURED ---------- */
  function featuredRects(idx) {
    /* a phone has no room for a 44%-wide card flanked by two more; the
       centre card takes most of the width and the neighbours just peek */
    const cw = Math.min(vw() * lerp(0.80, 0.44), 900), ch = cw * (2 / 3);
    const sw = vw() * lerp(0.42, 0.30), sh = sw * (2 / 3);
    const cy = vh() * 0.47;
    const peek = vw() * lerp(0.12, 0.205); /* larger peek → side cards sit closer, smaller gap */
    const n = covers.length;
    const rects = {};
    covers.forEach((c, i) => {
      if (i === idx) rects[c.id] = { x: (vw() - cw) / 2, y: cy - ch / 2, w: cw, h: ch, wash: 0, visible: true };
      else if (i === ((idx - 1 + n) % n)) rects[c.id] = { x: peek - sw, y: cy - sh / 2, w: sw, h: sh, wash: 0.55, visible: true };
      else if (i === ((idx + 1) % n)) rects[c.id] = { x: vw() - peek, y: cy - sh / 2, w: sw, h: sh, wash: 0.55, visible: true };
      else rects[c.id] = { x: vw() + 200, y: cy - sh / 2, w: sw, h: sh, wash: 1, visible: false };
    });
    return rects;
  }
  function layoutFeatured(animate, cb) {
    const rects = featuredRects(featuredIdx);
    const dur = reduce || !animate ? 0.01 : 1.0;
    ITEMS.forEach((it) => {
      if (it.type === 'cover') {
        const r = rects[it.id];
        setHidden(it, !r.visible);
        gsap.to(it.el, { x: r.x, y: r.y, width: r.w, height: r.h, opacity: r.visible ? 1 : 0, scale: r.visible ? 1 : 0.9, duration: dur, ease: 'power4.inOut' });
        gsap.to(it.washEl, { opacity: r.wash, duration: dur * 0.8 });
      } else {
        gsap.to(it.el, { opacity: 0, scale: 0.9, duration: dur * 0.45, ease: 'power2.in', onComplete: () => { setHidden(it, true); } });
      }
    });
    showLabel(covers[featuredIdx].name, featuredIdx);
    gsap.delayedCall(dur, () => cb && cb());
  }
  function slideFeatured(dir) {
    if (busy || view !== 'featured') return;
    busy = true;
    featuredIdx = (featuredIdx + dir + covers.length) % covers.length;
    layoutFeatured(true, () => { setBusy(false); });
  }

  function showLabel(name, idx) {
    labelName.textContent = name;
    labelNum.textContent = '0' + (idx + 1) + '.';
    gsap.to(label, { opacity: 1, duration: 0.5 });
    gsap.fromTo([labelName, labelNum], { y: 26 }, { y: 0, duration: 0.6, ease: 'power3.out' });
  }
  function hideLabel() { gsap.to(label, { opacity: 0, duration: 0.3 }); }

  /* ---------- SNIPPETS ---------- */
  function arrangedRects(idx) {
    const cw = vw() * lerp(0.58, 0.225), chh = cw * (16 / 9);
    const sw = vw() * lerp(0.40, 0.19), sh = sw * (16 / 9);
    const pitch = vw() * lerp(0.52, 0.205);
    const cy = vh() * 0.52;
    return reels.map((r, i) => {
      const d = i - idx;
      const w = d === 0 ? cw : sw, h = d === 0 ? chh : sh;
      return { x: vw() / 2 + d * pitch - w / 2, y: cy - h / 2, w, h, wash: d === 0 ? 0 : 0.55 };
    });
  }
  function layoutArranged(animate, cb) {
    hideLabel();
    const rects = arrangedRects(arrangedIdx);
    const dur = reduce || !animate ? 0.01 : 1.0;
    ITEMS.forEach((it) => {
      if (it.type === 'cover') {
        gsap.to(it.el, { opacity: 0, scale: 0.9, duration: dur * 0.45, ease: 'power2.in', onComplete: () => { setHidden(it, true); } });
      } else {
        setHidden(it, false);
        const r = rects[reels.indexOf(it)];
        gsap.to(it.el, { x: r.x, y: r.y, width: r.w, height: r.h, opacity: 1, scale: 1, duration: dur, ease: 'power4.inOut' });
        gsap.to(it.washEl, { opacity: r.wash, duration: dur * 0.8 });
      }
    });
    syncArrangedAudio();
    gsap.delayedCall(dur, () => cb && cb());
  }
  /* Off-centre reels autoplay muted, so by the time one reaches the centre it
     is already part-way through. Seek it back to the start as it begins
     sliding in — the decode stall is then covered by the movement instead of
     stuttering once the reel has landed. */
  function restartReel(v) {
    if (!v) return;
    const seek = () => { try { v.currentTime = 0; } catch (_) { /* not seekable yet */ } };
    if (v.readyState >= 1) seek();
    else v.addEventListener('loadedmetadata', seek, { once: true });
  }
  let arrangedPlaying = -1; /* reel currently holding the centre spot */
  function syncArrangedAudio() {
    const centre = (view === 'snippets' && snippetMode === 'arranged') ? arrangedIdx : -1;
    reels.forEach((r, i) => {
      r.video.muted = i !== centre;
      r.video.play().catch(() => {});
    });
    if (centre !== -1 && centre !== arrangedPlaying) restartReel(reels[centre].video);
    arrangedPlaying = centre;
  }
  function slideArranged(dir) {
    if (busy) return;
    const next = Math.max(0, Math.min(reels.length - 1, arrangedIdx + dir));
    if (next === arrangedIdx) return;
    busy = true;
    arrangedIdx = next;
    layoutArranged(true, () => { setBusy(false); });
  }
  function layoutScattered(animate, cb) {
    hideLabel();
    const dur = reduce || !animate ? 0.01 : 1.0;
    ITEMS.forEach((it) => {
      if (it.type === 'cover') {
        gsap.to(it.el, { opacity: 0, scale: 0.9, duration: dur * 0.45, ease: 'power2.in', onComplete: () => { setHidden(it, true); } });
      } else {
        setHidden(it, false);
        const tx = wrap(it.bx + Mx, tileW) - Mx;
        const ty = wrap(it.by + My, tileH) - My;
        gsap.to(it.washEl, { opacity: 0, duration: 0.5 });
        gsap.to(it.el, { x: tx, y: ty, width: it.w, height: it.h, opacity: 1, scale: 1, duration: dur, ease: 'power4.inOut' });
      }
    });
    reels.forEach((r) => { r.video.muted = true; r.video.play().catch(() => {}); });
    gsap.delayedCall(dur, () => { ox = 0; oy = 0; render(); panEnabled = true; cb && cb(); });
  }

  modeBtn.addEventListener('click', () => {
    if (busy || view !== 'snippets') return;
    busy = true;
    snippetMode = snippetMode === 'scattered' ? 'arranged' : 'scattered';
    modeBtn.classList.toggle('show-arranged', snippetMode === 'scattered');
    panEnabled = false;
    if (snippetMode === 'arranged') layoutArranged(true, () => { setBusy(false); });
    else layoutScattered(true, () => { setBusy(false); });
  });

  /* ------------------------------------------------------------
     Reel focus (click a reel in a scatter view)
     ------------------------------------------------------------ */
  function focusReel(it) {
    if (focused || busy) return;
    focused = it;
    panEnabled = false;
    const r = it.el.getBoundingClientRect();
    /* the width term decides it on a phone, where 0.44 left the reel barely
       a third of the screen — a 9:16 clip should nearly fill a 9:16 device */
    const fh = Math.min(vh() * lerp(0.72, 0.74), vw() * lerp(0.86, 0.44) * (16 / 9));
    const fw = fh * (9 / 16);
    dim.classList.add('is-on');
    it.el.style.zIndex = 50;
    it.video.currentTime = 0;
    it.video.muted = false;
    it.video.play().catch(() => { it.video.muted = true; it.video.play().catch(() => {}); });
    it.focusFrom = { x: r.left, y: r.top, w: r.width, h: r.height };
    gsap.to(it.el, {
      x: (vw() - fw) / 2, y: (vh() - fh) / 2, width: fw, height: fh,
      duration: reduce ? 0.01 : 0.8, ease: 'expo.out',
    });
  }
  function unfocusReel(instant) {
    if (!focused) return;
    const it = focused; focused = null;
    dim.classList.remove('is-on');
    it.video.muted = true;
    const f = it.focusFrom;
    gsap.to(it.el, {
      x: f.x, y: f.y, width: f.w, height: f.h,
      duration: instant || reduce ? 0.01 : 0.7, ease: 'power3.inOut',
      onComplete: () => { it.el.style.zIndex = ''; panEnabled = (view === 'all' || (view === 'snippets' && snippetMode === 'scattered')); },
    });
  }
  dim.addEventListener('pointerup', () => unfocusReel(false));

  /* ------------------------------------------------------------
     Case-study transition (cover → hero)
     ------------------------------------------------------------ */
  function heroTargetHeight() {
    return window.innerWidth <= 768
      ? Math.min(window.innerWidth * 0.72, window.innerHeight * 0.6)
      : Math.max(Math.min(window.innerWidth * 0.27, window.innerHeight * 0.56), 240);
  }
  function openCase(it, fromEl) {
    if (busy) return;
    busy = true; panEnabled = false;
    const r = (fromEl || it.el).getBoundingClientRect();
    const targetH = heroTargetHeight();
    const sx = r.width / vw(), sy = r.height / targetH;
    const ghost = document.createElement('div');
    ghost.style.cssText = 'position:fixed;left:0;top:0;z-index:3000;overflow:hidden;'
      + `width:${vw()}px;height:${targetH}px;`
      + 'transform-origin:top left;will-change:transform;backface-visibility:hidden;';
    const gi = document.createElement('img');
    gi.src = it.img;
    gi.style.cssText = 'width:100%;height:100%;object-fit:cover;transform-origin:top left;will-change:transform;';
    ghost.appendChild(gi);
    document.body.appendChild(ghost);
    document.body.classList.add('is-leaving');
    setPill('');
    try { sessionStorage.setItem('csEnter', '1'); } catch (err) {}
    gsap.set(gi, { scaleX: 1 / sx, scaleY: 1 / sy });
    gsap.fromTo(ghost,
      { x: r.left, y: r.top, scaleX: sx, scaleY: sy },
      {
        x: 0, y: 0, scaleX: 1, scaleY: 1,
        duration: reduce ? 0.01 : 0.9, ease: 'expo.out',
        onUpdate: () => {
          gi.style.transform = 'scale(' + (1 / gsap.getProperty(ghost, 'scaleX'))
            + ',' + (1 / gsap.getProperty(ghost, 'scaleY')) + ')';
        },
        onComplete: () => { window.location.href = it.page; },
      });
  }


  /* ------------------------------------------------------------
     FILTERS + LIST VIEW

     The infinite canvas is a showcase — great to look at, hard to search. The
     list is the counterpart: every brand and snippet, tagged by industry, in
     one scannable column. The two are kept in a single simple relationship —
     a filter is only ever active while the list is open, and closing the list
     clears it — so the canvas layouts (whose card positions are solved as a
     whole set) never have to be re-packed for a subset.
     ------------------------------------------------------------ */
  const usedIndustries = INDUSTRIES.filter((ind) => ITEMS.some((i) => i.industry === ind.key));
  const countIn = (key) => ITEMS.filter((i) => i.industry === key).length;
  const matches = (it) => filter === 'all' || it.industry === filter;

  /* ---- filter menu ---- */
  function buildFilterMenu() {
    const mk = (key, label, n) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ex__opt';
      b.dataset.key = key;
      b.innerHTML = '<span>' + label + '</span><b>' + n + '</b>';
      b.addEventListener('click', () => { setFilter(key); closeFilterMenu(); });
      filterOpts.appendChild(b);
    };
    mk('all', 'All Work', ITEMS.length);
    usedIndustries.forEach((ind) => mk(ind.key, ind.label, countIn(ind.key)));
  }
  function syncFilterUI() {
    [...filterOpts.children].forEach((b) => b.classList.toggle('is-on', b.dataset.key === filter));
    const on = filter !== 'all';
    filterBtn.classList.toggle('is-on', on);
    filterLabel.textContent = on ? industryLabel(filter) : 'Filter';
  }
  function openFilterMenu() {
    filterMenu.hidden = false;
    filterBtn.setAttribute('aria-expanded', 'true');
  }
  function closeFilterMenu() {
    filterMenu.hidden = true;
    filterBtn.setAttribute('aria-expanded', 'false');
  }
  const filterMenuOpen = () => !filterMenu.hidden;
  filterBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    filterMenuOpen() ? closeFilterMenu() : openFilterMenu();
  });
  document.addEventListener('pointerdown', (e) => {
    if (filterMenuOpen() && !filterMenu.contains(e.target) && !filterBtn.contains(e.target)) closeFilterMenu();
  });

  function setFilter(key) {
    filter = key;
    syncFilterUI();
    /* a filter with nowhere to be read is useless — picking an industry from a
       canvas view brings the list up with it already applied */
    if (filter !== 'all' && !listOpen) openList();
    else applyFilter();
  }
  function applyFilter() {
    let brands = 0, snips = 0;
    ITEMS.forEach((it) => {
      const on = matches(it);
      if (it.listEl) it.listEl.hidden = !on;
      if (on) (it.type === 'cover' ? brands++ : snips++);
      if (!on && it.listVideo) stopListVideo(it);
    });
    brandCount.textContent = brands ? '(' + brands + ')' : '';
    reelCount.textContent = snips ? '(' + snips + ')' : '';
    brandSec.hidden = brands === 0;
    reelSec.hidden = snips === 0;
    listEmpty.hidden = brands + snips > 0;
    listEl.scrollTop = 0;
    reelGrid.scrollLeft = 0;
    measureStrip();          /* hiding tiles moves every one after them */
    centreEl = null;
    syncCentre();
    playCentre();
  }

  /* ---- list content (built once; filtering only toggles rows) ---- */
  /* A click leaves the button focused, so the next arrow key flips it to
     :focus-visible and paints a ring around a card the visitor only pointed
     at. Keyboard activation (detail 0) keeps its focus and its ring. */
  function dropPointerFocus(e, el) {
    if (e.detail > 0) el.blur();
  }

  function buildList() {
    covers.forEach((it) => {
      const row = document.createElement('button');
      row.type = 'button'; row.className = 'ex__row';
      row.innerHTML =
        '<span class="ex__row-thumb"><img loading="lazy" decoding="async" src="' + it.img + '" alt=""></span>'
        + '<span class="ex__row-name">' + it.name
        + '<span class="ex__row-tag">' + industryLabel(it.industry) + '</span></span>'
        + '<span class="ex__row-go">View Case Study &rarr;</span>';
      row.addEventListener('click', (e) => {
        dropPointerFocus(e, row);
        openCase(it, row.querySelector('.ex__row-thumb'));
      });
      it.listEl = row;
      brandRows.appendChild(row);
    });

    reels.forEach((it) => {
      const tile = document.createElement('button');
      tile.type = 'button'; tile.className = 'ex__tile';
      tile.innerHTML =
        '<span class="ex__tile-in">'
        + '<span class="ex__tile-media"><img loading="lazy" decoding="async" src="' + it.poster + '" alt="">'
        + '<span class="ex__tile-wash"></span><span class="ex__tile-play"></span></span>'
        + '<span class="ex__tile-name">' + it.name + '</span>'
        + '<span class="ex__tile-tag">' + industryLabel(it.industry) + '</span>'
        + '</span>';
      tile.addEventListener('click', (e) => {
        dropPointerFocus(e, tile);
        if (tile.classList.contains('is-centre')) toggleListVideo(it);
        else centreTile(tile);
      });
      tile.dataset.id = it.id;
      it.listEl = tile;
      reelGrid.appendChild(tile);
    });
  }

  /* Which card holds the centre is whatever the strip is scrolled to, so it
     is read back from geometry rather than tracked as an index — dragging,
     snapping, clicking a neighbour and filtering all land in the same place. */
  let centreEl = null;
  function syncCentre() {
    const best = nearestTile();
    /* The centre changes once per card, not once per frame. Skipping the DOM
       writes when it has not moved keeps a scroll from restyling 25 tiles
       sixty times a second — each toggle also drives the tile's scale
       transition, so this was the expensive half. */
    if (best === centreEl) return best;
    centreEl = best;
    [...reelGrid.children].forEach((el) => {
      const on = el === best;
      el.classList.toggle('is-centre', on);
      /* a card that slides off the centre stops playing, so audio always
         belongs to the card being looked at */
      if (!on && el.dataset.id) {
        const it = ITEMS.find((i) => i.id === el.dataset.id);
        if (it && it.listVideo && !it.listVideo.paused) stopListVideo(it);
      }
    });
    return best;
  }
  /* Whatever holds the centre plays by itself — the strip is for watching, and
     a still poster in the centre reads as broken. Kept out of syncCentre so a
     card being passed over mid-drag never starts loading a video. */
  function playCentre() {
    if (!listOpen) return;
    const el = reelGrid.querySelector('.ex__tile.is-centre');
    if (el && el.dataset.id) playListVideo(ITEMS.find((i) => i.id === el.dataset.id));
  }
  let stripDown = false, stripX = 0, stripScroll = 0, stripMoved = 0;
  /* Eased glide to a scroll position. Snapping is done here rather than with
     CSS scroll-snap so the landing can be animated and so a drag can move the
     strip freely — mandatory snap clamps any scrollLeft write to a snap point
     the instant it happens, which made dragging jump card to card. */
  let glideFrame = 0, gliding = false;
  function glideTo(left, done) {
    cancelAnimationFrame(glideFrame);
    const start = reelGrid.scrollLeft;
    const delta = Math.max(0, Math.min(reelGrid.scrollWidth - reelGrid.clientWidth, left)) - start;
    if (reduce || Math.abs(delta) < 1) {
      reelGrid.scrollLeft = start + delta;
      gliding = false; syncCentre(); done && done();
      return;
    }
    gliding = true;
    const t0 = performance.now(), dur = 340;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      reelGrid.scrollLeft = start + delta * (1 - Math.pow(1 - p, 3)); /* easeOutCubic */
      syncCentre();
      if (p < 1) { glideFrame = requestAnimationFrame(step); }
      else { glideFrame = 0; gliding = false; done && done(); }
    };
    glideFrame = requestAnimationFrame(step);
  }
  /* Tile positions only move when the strip is rebuilt, filtered or resized —
     never while it scrolls. Reading offsetLeft per tile per frame (25 of them)
     forced a synchronous layout on every frame of a drag or a glide, and the
     class writes below then invalidated it again: the read/write thrash that
     made this strip feel heavy. Measure once, reuse until something changes. */
  let tileMetrics = null;
  let stripWidth = 0;
  function measureStrip() {
    stripWidth = reelGrid.clientWidth;
    tileMetrics = [...reelGrid.children]
      .filter((el) => !el.hidden)
      .map((el) => ({ el, mid: el.offsetLeft + el.offsetWidth / 2 }));
  }
  const stripMetrics = () => (tileMetrics || (measureStrip(), tileMetrics));

  const leftFor = (el) => el.offsetLeft + el.offsetWidth / 2 - reelGrid.clientWidth / 2;
  function nearestTile() {
    const list = stripMetrics();
    if (!list.length) return null;
    const mid = reelGrid.scrollLeft + stripWidth / 2;
    let best = null, bestD = Infinity;
    for (const t of list) {
      const d = Math.abs(t.mid - mid);
      if (d < bestD) { bestD = d; best = t.el; }
    }
    return best;
  }
  function settleStrip() {
    const el = nearestTile();
    if (el) glideTo(leftFor(el), playCentre);
  }
  function centreTile(el) { glideTo(leftFor(el), playCentre); }
  /* keyboard stepping — one card per press, clamped at both ends */
  function stepStrip(dir) {
    const vis = [...reelGrid.children].filter((el) => !el.hidden);
    if (!vis.length) return;
    const cur = vis.findIndex((el) => el.classList.contains('is-centre'));
    const from = cur < 0 ? 0 : cur;
    const next = Math.max(0, Math.min(vis.length - 1, from + dir));
    /* if the strip is off screen the move would be invisible, so bring it
       into view first — a key press should always show its effect */
    const box = reelGrid.getBoundingClientRect();
    if (box.bottom < 80 || box.top > window.innerHeight - 80) {
      reelSec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    }
    if (next !== cur) centreTile(vis[next]);
  }

  /* The promotion is resolved on every frame of the scroll rather than once it
     settles: the card grows as it reaches the middle, so the size follows the
     drag instead of arriving a beat late. Only playback waits for rest. */
  let centreFrame = 0, settleTimer = 0;
  reelGrid.addEventListener('scroll', () => {
    if (!centreFrame) {
      centreFrame = requestAnimationFrame(() => { centreFrame = 0; syncCentre(); });
    }
    if (gliding || stripDown) return;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settleStrip, 110); /* wheel / trackpad came to rest */
  });

  /* drag anywhere on the strip, matching the canvas views */
  reelGrid.addEventListener('pointerdown', (e) => {
    cancelAnimationFrame(glideFrame); glideFrame = 0; gliding = false;
    /* A finger gets the browser's own panning, with the inertia that comes
       with it. Driving scrollLeft by hand instead gave a drag that stopped
       dead on release — the strip felt sluggish on a phone for want of a
       flick. The scroll listener below picks it up and snaps. */
    if (e.pointerType === 'touch') return;
    stripDown = true; stripMoved = 0;
    stripX = e.clientX; stripScroll = reelGrid.scrollLeft;
  });
  reelGrid.addEventListener('pointermove', (e) => {
    if (!stripDown) return;
    const d = e.clientX - stripX;
    if (Math.abs(d) > 3) stripMoved = Math.abs(d);
    reelGrid.scrollLeft = stripScroll - d;
  });
  /* Any scrolling the browser does on its own — a finger's momentum, a
     trackpad's — lands here: follow the centre as it passes, then settle. */
  let scrollIdle = 0;
  reelGrid.addEventListener('scroll', () => {
    if (gliding || stripDown) return;
    syncCentre();
    clearTimeout(scrollIdle);
    scrollIdle = setTimeout(settleStrip, 120);
  }, { passive: true });

  reelGrid.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;   /* vertical: page scroll */
    /* only to drop an in-flight snap so the gesture takes over cleanly; the
       scroll listener above does the following and the settling */
    cancelAnimationFrame(glideFrame); glideFrame = 0; gliding = false;
  }, { passive: true });

  const endStrip = () => { if (!stripDown) return; stripDown = false; settleStrip(); };
  reelGrid.addEventListener('pointerup', endStrip);
  reelGrid.addEventListener('pointercancel', endStrip);
  /* swallow the click that ends a drag, so dragging past a card never plays it */
  reelGrid.addEventListener('click', (e) => {
    if (stripMoved > 4) { e.stopPropagation(); e.preventDefault(); stripMoved = 0; }
  }, true);

  /* One reel plays at a time, with sound — the list is for watching, not for
     25 muted loops competing for the decoder. The <video> is created on first
     play so the grid itself stays poster-only. */
  let listPlaying = null;
  function stopListVideo(it) {
    if (!it.listVideo) return;
    it.listVideo.pause();
    it.listEl.classList.remove('is-playing');
    if (listPlaying === it) listPlaying = null;
  }
  function ensureListVideo(it) {
    if (it.listVideo) return it.listVideo;
    const v = document.createElement('video');
    v.src = it.src; v.poster = it.poster;
    v.loop = true; v.playsInline = true; v.preload = 'metadata';
    v.addEventListener('click', (e) => e.stopPropagation());
    it.listVideo = v;
    it.listEl.querySelector('.ex__tile-media').appendChild(v);
    return v;
  }
  function playListVideo(it) {
    if (!it) return;
    if (listPlaying && listPlaying !== it) stopListVideo(listPlaying);
    const v = ensureListVideo(it);
    if (!v.paused) return;              /* already running — don't restart it */
    v.muted = false;
    v.play().catch(() => {
      /* autoplay policy can still refuse an unmuted start — fall back rather
         than leaving the viewer with a dead tile */
      v.muted = true;
      v.play().catch(() => {});
    });
    it.listEl.classList.add('is-playing');
    listPlaying = it;
  }
  function toggleListVideo(it) {
    if (it.listVideo && !it.listVideo.paused) { stopListVideo(it); return; }
    if (it.listVideo) it.listVideo.currentTime = 0;
    playListVideo(it);
  }

  /* ---- open / close ---- */
  /* The top block's height moves with the viewport, so measure it instead of
     guessing, or the first list heading ends up underneath it. */
  function syncListOffset() {
    listEl.style.setProperty('--ex-top-h', topEl.offsetHeight + 'px');
  }
  function openList() {
    if (listOpen || view === 'landing') return;
    listOpen = true;
    syncListOffset();
    layoutBtn.setAttribute('aria-pressed', 'true');
    layoutBtn.textContent = 'Canvas View';
    setPill('');
    unfocusReel(true);
    pauseAll();
    applyFilter();
    listEl.classList.add('is-open');
    listEl.setAttribute('aria-hidden', 'false');
    /* the strip has a real width only once the list is displayed */
    requestAnimationFrame(() => { measureStrip(); centreEl = null; syncCentre(); });
  }
  function closeList(keepFilter) {
    if (!listOpen) return;
    listOpen = false;
    layoutBtn.setAttribute('aria-pressed', 'false');
    layoutBtn.textContent = 'List View';
    if (listPlaying) stopListVideo(listPlaying);
    listEl.classList.remove('is-open');
    listEl.setAttribute('aria-hidden', 'true');
    if (!keepFilter) { filter = 'all'; syncFilterUI(); }
    if (view === 'featured') return;              /* featured covers hold still */
    if (view === 'snippets' && snippetMode === 'arranged') syncArrangedAudio();
    else playAll();
  }
  buildFilterMenu();
  syncFilterUI();
  buildList();
  applyFilter();

  /* ------------------------------------------------------------
     Pointer handling on the canvas (pan / tap)
     ------------------------------------------------------------ */
  let dragging = false, sx0 = 0, sy0 = 0, dx = 0, dy = 0, startOx = 0, startOy = 0;
  let vxTrack = 0, vyTrack = 0, lastX = 0, lastY = 0, lastT = 0;

  canvas.addEventListener('pointerdown', (e) => {
    if (busy || focused) return;
    dragging = true;
    sx0 = lastX = e.clientX; sy0 = lastY = e.clientY;
    dx = dy = 0; startOx = ox; startOy = oy;
    vxTrack = vyTrack = 0; lastT = performance.now();
    gsap.killTweensOf(momentum);
    try { canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); } catch (err) {}
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dx = e.clientX - sx0; dy = e.clientY - sy0;
    const now = performance.now(), dt = Math.max(1, now - lastT);
    vxTrack = (e.clientX - lastX) / dt * 16; vyTrack = (e.clientY - lastY) / dt * 16;
    lastX = e.clientX; lastY = e.clientY; lastT = now;
    if (panEnabled) { ox = startOx + dx; oy = startOy + dy; render(); }
  });
  const momentum = { v: 0 };
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    try { canvas.releasePointerCapture && e && e.pointerId != null && canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    const tap = Math.abs(dx) <= 6 && Math.abs(dy) <= 6 && e && e.type === 'pointerup';
    if (tap) { handleTap(e); return; }
    if (panEnabled && !reduce && (Math.abs(vxTrack) > 2 || Math.abs(vyTrack) > 2)) {
      const proxy = { x: ox, y: oy };
      gsap.to(proxy, {
        x: ox + vxTrack * 14, y: oy + vyTrack * 14,
        duration: 0.9, ease: 'power3.out',
        onUpdate: () => { if (!dragging && panEnabled) { ox = proxy.x; oy = proxy.y; render(); } },
      });
    }
    /* featured is a slider: a light swipe or quick flick advances it */
    if (view === 'featured' && (Math.abs(dx) > 18 || Math.abs(vxTrack) > 4)) slideFeatured(dx < 0 ? 1 : -1);
    if (view === 'snippets' && snippetMode === 'arranged' && Math.abs(dx) > 40) slideArranged(dx < 0 ? 1 : -1);
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  function handleTap(e) {
    /* the canvas took pointer capture on pointerdown, so e.target is the
       canvas — resolve the real card by hit-testing the release point. */
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    const itemEl = hit && hit.closest('.ex__item');
    const it = itemEl && ITEMS.find((i) => i.el === itemEl && !i.hidden);
    if (!it) return;
    if (view === 'featured') {
      const i = covers.indexOf(it);
      if (it.type !== 'cover') return;
      if (i === featuredIdx) openCase(it);
      else slideFeatured(i === (featuredIdx + 1) % covers.length ? 1 : -1);
      return;
    }
    if (view === 'snippets' && snippetMode === 'arranged') {
      const i = reels.indexOf(it);
      if (i === arrangedIdx) { /* restart from beginning */ restartReel(it.video); it.video.play().catch(() => {}); }
      else { arrangedIdx = i; busy = true; layoutArranged(true, () => { setBusy(false); }); }
      return;
    }
    /* all / scattered */
    if (it.type === 'cover') openCase(it);
    else focusReel(it);
  }

  /* ------------------------------------------------------------
     Wiring
     ------------------------------------------------------------ */
  exploreBtn.addEventListener('click', openExplorer);
  stage.addEventListener('click', (e) => { if (e.target !== exploreBtn) openExplorer(); });
  closeBtn.addEventListener('click', closeExplorer);
  layoutBtn.addEventListener('click', () => (listOpen ? closeList() : openList()));
  /* the nav is also the way back out of the list: picking a canvas view drops
     the list and its filter, so the canvas is never showing a hidden subset */
  exNavLinks.forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.view;
    if (listOpen) { closeList(); if (v === view) { setNavActive(v); return; } }
    setView(v);
  }));
  window.addEventListener('keydown', (e) => {
    if (view === 'landing') return;
    if (e.key === 'Escape') {
      if (filterMenuOpen()) closeFilterMenu();
      else if (focused) unfocusReel(false);
      else if (listOpen) closeList();
      else closeExplorer();
      return;
    }
    /* The arrows themselves are the shared handler's job — see the
       registrations below, which also pick up trackpad swipes. */
  });

  /* Each of the explorer's three strips registers with the shared slider
     input, guarded by the context it belongs to: only one of them is ever
     live, so the arrows and a two-finger swipe always reach the right one. */
  if (window.KaziKeyNav) {
    const quiet = () => !busy && !focused && !filterMenuOpen();
    window.KaziKeyNav.register({
      el: ex, step: slideFeatured,
      enabled: () => quiet() && !listOpen && view === 'featured',
    });
    window.KaziKeyNav.register({
      el: ex, step: slideArranged,
      enabled: () => quiet() && !listOpen && view === 'snippets' && snippetMode === 'arranged',
    });
    /* The snippet strip is a real overflow-x container, so a two-finger swipe
       is better left to the browser: native momentum beats stepping it a card
       at a time behind a lockout, which is what made it feel slow. It snaps
       itself once the gesture stops (see the wheel listener above). Arrows
       still come through here. */
    window.KaziKeyNav.register({
      el: ex, step: stepStrip, wheel: false,
      enabled: () => quiet() && listOpen,
    });
  }
  window.addEventListener('resize', () => {
    if (view === 'landing') return;
    if (listOpen) { layoutBases(); sizeItems(); syncListOffset(); measureStrip(); return; }
    layoutBases(); sizeItems();
    if (view === 'all' || (view === 'snippets' && snippetMode === 'scattered')) render();
    else if (view === 'featured') layoutFeatured(false);
    else layoutArranged(false);
  });

  /* landing entrance: stack cards fade-scale in */
  if (!reduce) {
    gsap.from('.wl__card', { opacity: 0, scale: 0.92, y: 20, duration: 0.9, ease: 'power3.out', stagger: 0.06, delay: 0.15 });
    gsap.from(exploreBtn, { opacity: 0, duration: 0.6, delay: 0.9 });
  }

  layoutBases(); sizeItems();
})();

/* ---------- Mobile hamburger menu (shared) ---------- */
(function () {
  const burger = document.getElementById('navBurger');
  const menu   = document.getElementById('navMenu');
  if (!burger || !menu) return;
  const open  = () => { burger.classList.add('is-open'); burger.setAttribute('aria-expanded', 'true');  menu.classList.add('is-open');    document.body.classList.add('is-locked'); };
  const close = () => { burger.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); menu.classList.remove('is-open'); document.body.classList.remove('is-locked'); };
  burger.addEventListener('click', () => burger.classList.contains('is-open') ? close() : open());
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
  document.addEventListener('click', (e) => { if (menu.classList.contains('is-open') && !menu.contains(e.target) && !burger.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
})();
