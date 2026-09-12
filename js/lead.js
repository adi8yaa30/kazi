/* ============================================================
   KAZI — "GROW MY BRAND" FORM (shared)
   The button used to be a link to the contact page. It opens this instead:
   five fields, four of them required, and the visitor never leaves what they
   were reading. The contact page is still there, and still linked from the
   nav and the footer.

   There is no server behind this site, so the form cannot post anywhere.
   Sending hands the filled-in details to the visitor's own mail app,
   addressed to us — which works today, with nothing to sign up for. Swap the
   submit handler for a form service's endpoint and the rest stays as it is.
   ============================================================ */
(() => {
  const TO = 'hello@kazinetwork.in';

  /* every "Grow My Brand" on the page: the nav's, the hero's, the closing
     call. The label is carried twice for the roll, so match on the start. */
  const label = (el) => el.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
  const buttons = [...document.querySelectorAll('a.btn, button.btn')]
    .filter((b) => label(b).startsWith('grow my brand'));
  if (!buttons.length) return;

  const field = (name, text, attrs, note) =>
    '<label class="lead__field' + (name === 'message' ? ' lead__field--full' : '') + '">'
    + '<span class="lead__label">' + text + (note ? ' <em>' + note + '</em>' : '') + '</span>'
    + (name === 'message'
      ? '<textarea class="lead__input" name="message" rows="3" placeholder="Anything you would like us to know"></textarea>'
      : '<input class="lead__input" name="' + name + '" ' + attrs + ' />')
    + '</label>';

  const dlg = document.createElement('dialog');
  dlg.className = 'lead';
  dlg.setAttribute('aria-labelledby', 'leadTitle');
  dlg.innerHTML =
    '<form class="lead__panel" novalidate>'
    + '<button type="button" class="lead__close" aria-label="Close"><span aria-hidden="true">×</span></button>'
    + '<p class="eyebrow lead__eyebrow">Start a project</p>'
    + '<h2 class="lead__title" id="leadTitle">Grow my brand</h2>'
    + '<p class="lead__sub">Tell us who you are and what you are building. We answer every one.</p>'
    + '<div class="lead__grid">'
    + field('name', 'Name', 'required autocomplete="name" placeholder="Your name"')
    + field('email', 'Email', 'type="email" required autocomplete="email" placeholder="you@company.com"')
    + field('company', 'Company', 'required autocomplete="organization" placeholder="Company name"')
    + field('phone', 'Phone', 'type="tel" required autocomplete="tel" inputmode="tel" placeholder="+91 00000 00000"')
    + field('message', 'Message', '', '(optional)')
    + '</div>'
    + '<p class="lead__note" role="status" hidden></p>'
    + '<div class="lead__actions">'
    + '<button type="submit" class="btn btn--filled lead__send">'
    + '<span class="btn__label"><span class="btn__t">Send it over</span>'
    + '<span class="btn__t" aria-hidden="true">Send it over</span></span></button>'
    + '</div>'
    + '</form>';
  document.body.appendChild(dlg);

  const form = dlg.querySelector('form');
  const note = dlg.querySelector('.lead__note');

  /* Hold the page still behind the sheet. Not the shared is-locked class:
     the preloader and the mobile menu both take that off when they are done,
     and one of them was clearing it out from under an open form. */
  let scrollLock = '';
  const open = () => {
    note.hidden = true;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    scrollLock = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => { try { form.elements.name.focus({ preventScroll: true }); } catch (e) {} }, 60);
  };
  const close = () => {
    if (dlg.close) dlg.close(); else dlg.removeAttribute('open');
    document.body.style.overflow = scrollLock;
  };

  buttons.forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); open(); }));
  dlg.querySelector('.lead__close').addEventListener('click', close);
  /* the sheet is the panel; a click on the backdrop around it closes */
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  dlg.addEventListener('close', () => { document.body.style.overflow = scrollLock; });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;            /* the browser says which field */
    const v = (n) => (form.elements[n].value || '').trim();
    const subject = 'New enquiry — ' + (v('company') || v('name'));
    const body = [
      'Name: ' + v('name'),
      'Email: ' + v('email'),
      'Company: ' + v('company'),
      'Phone: ' + v('phone'),
      '',
      v('message') || '(no message)',
    ].join('\n');
    window.location.href = 'mailto:' + TO
      + '?subject=' + encodeURIComponent(subject)
      + '&body=' + encodeURIComponent(body);
    note.hidden = false;
    note.textContent = 'Opening your mail app, addressed to ' + TO
      + '. If nothing happens, write to us there and we will pick it up.';
  });
})();
