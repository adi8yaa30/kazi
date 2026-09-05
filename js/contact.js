/* ============================================================
   KAZI — CONTACT PAGE
   Intro: "CONTACT KAZI" rises from below as one centred line,
   then splits — CONTACT to the left edge, KAZI to the right —
   while a rapid image montage flickers into the widening gap
   (slot-machine style, each slot settling in turn). The rest of
   the page fades up afterwards.
   ============================================================ */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const headline = document.getElementById('ctHeadline');
  const contact = document.getElementById('ctContact');
  const kazi = document.getElementById('ctKazi');
  const montage = document.getElementById('ctMontage');
  if (!headline || typeof gsap === 'undefined' || reduce) return;

  const slots = [...montage.querySelectorAll('img')];
  const finals = slots.map((img) => img.getAttribute('src'));
  const pool = [];
  for (let i = 1; i <= 11; i++) pool.push('assets/img/contact/image-' + i + '.webp');
  pool.forEach((src) => { const im = new Image(); im.decoding = 'async'; im.src = src; });

  /* tag page as animating (CSS pre-hides words, montage, reveals) */
  document.querySelector('.ct').classList.add('ct--animate');

  /* offsets that bring CONTACT and KAZI together at the row's centre */
  function centreOffsets() {
    const row = headline.getBoundingClientRect();
    const c = contact.getBoundingClientRect();
    const k = kazi.getBoundingClientRect();
    const mid = row.left + row.width / 2;
    const gap = Math.min(row.width * 0.015, 18);
    return {
      dxC: mid - gap / 2 - c.right,
      dxK: mid + gap / 2 - k.left,
    };
  }

  const { dxC, dxK } = centreOffsets();
  gsap.set(contact, { x: dxC, y: '110%' });
  gsap.set(kazi, { x: dxK, y: '110%' });

  const tl = gsap.timeline({ delay: 0.25 });

  /* 1 — rise from below, together at the centre */
  tl.to([contact, kazi], { y: '0%', duration: 0.85, ease: 'power4.out' }, 0);

  /* 2 — split to the edges */
  tl.to(contact, { x: 0, duration: 1.15, ease: 'power4.inOut' }, 0.85);
  tl.to(kazi, { x: 0, duration: 1.15, ease: 'power4.inOut' }, 0.85);

  /* 3 — montage flickers into the gap, slots settle one by one */
  slots.forEach((img, i) => {
    tl.to(img, { opacity: 1, duration: 0.18, ease: 'none' }, 0.95 + i * 0.07);
  });
  tl.call(() => {
    slots.forEach((img, i) => {
      let tick = 0;
      const iv = setInterval(() => {
        img.src = pool[(i * 3 + tick * 2 + Math.floor(Math.random() * 3)) % pool.length];
        tick++;
      }, 105);
      setTimeout(() => { clearInterval(iv); img.src = finals[i]; }, 950 + i * 240);
    });
  }, [], 0.95);

  /* 4 — the rest of the page fades up */
  tl.to('.ct__reveal', {
    opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.14,
  }, 2.05);

  /* done: drop the pre-hide class BEFORE clearing inline styles, so the
     CSS translateY(28px) rule can't re-apply and shift the layout */
  tl.call(() => {
    document.querySelector('.ct').classList.remove('ct--animate');
    gsap.set(['.ct__word', '.ct__montage img', '.ct__reveal'], { clearProps: 'all' });
  });
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
