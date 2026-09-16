/* ============================================================
   KAZI — "GROW MY BRAND" FORM (shared)
   The button used to be a link to the contact page. It opens this instead:
   five fields, four of them required, and the visitor never leaves what they
   were reading. The contact page is still there, and still linked from the
   nav and the footer.

   Leads go to a Google Sheet. The site has no server of its own, so the
   Sheet has a small Apps Script attached (google-sheet-leads/Code.gs, kept
   outside the site folder) deployed as a web app; both this popup and the
   contact page's form post to its /exec address below. Until that address
   is filled in, sending falls back to opening the visitor's mail app.
   ============================================================ */
(() => {
  const TO = 'vikram@kazinetwork.in';
  /* paste the Apps Script web app URL here (ends in /exec) */
  const SHEET_URL = '';

  /* A plain form-encoded POST is a "simple" request, so the browser sends it
     without a CORS preflight, which Apps Script does not answer. no-cors
     means the reply cannot be read: a request that reaches Google counts as
     sent, and only a network failure (offline, blocked) is reported. */
  const sendToSheet = (data) => fetch(SHEET_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: new URLSearchParams(Object.assign({}, data, { page: location.href })),
  });
  const mailto = (subject, lines) => {
    window.location.href = 'mailto:' + TO
      + '?subject=' + encodeURIComponent(subject)
      + '&body=' + encodeURIComponent(lines.join('\n'));
  };
  /* bots fill every field they find; people never see this one */
  const HONEYPOT = '<input type="text" name="botcheck" tabindex="-1" autocomplete="off" aria-hidden="true"'
    + ' style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0" />';
  /* both roll labels on a button carry the same text */
  const setLabel = (btn, text) => btn.querySelectorAll('.btn__t, .lnk__t').forEach((t) => { t.textContent = text; });

  /* every "Grow My Brand" on the page: the nav's, the hero's, the closing
     call. The label is carried twice for the roll, so match on the start. */
  const label = (el) => el.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
  const buttons = [...document.querySelectorAll('a.btn, button.btn')]
    .filter((b) => label(b).startsWith('grow my brand'));

  const field = (name, text, attrs, note) =>
    '<label class="lead__field' + (name === 'message' ? ' lead__field--full' : '') + '">'
    + '<span class="lead__label">' + text + (note ? ' <em>' + note + '</em>' : '') + '</span>'
    + (name === 'message'
      ? '<textarea class="lead__input" name="message" rows="3" placeholder="Anything you would like us to know"></textarea>'
      : '<input class="lead__input" name="' + name + '" id="lead-' + name + '"'
        + ' aria-describedby="lead-' + name + '-err" ' + attrs + ' />')
    + (name === 'message' ? '' : '<span class="lead__error" id="lead-' + name + '-err" hidden></span>')
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
    + HONEYPOT
    + '<p class="lead__note" role="status" hidden></p>'
    + '<div class="lead__actions">'
    + '<button type="submit" class="btn btn--filled lead__send">'
    + '<span class="btn__label"><span class="btn__t">Send it over</span>'
    + '<span class="btn__t" aria-hidden="true">Send it over</span></span></button>'
    + '</div>'
    + '<div class="lead__thanks" role="status" tabindex="-1" hidden>'
    + '<p class="eyebrow lead__eyebrow">Received</p>'
    + '<h2 class="lead__title">Thanks for reaching out</h2>'
    + '<p class="lead__sub">We have your details and will get back to you shortly.</p>'
    + '<div class="lead__actions">'
    + '<button type="button" class="btn btn--filled lead__done">'
    + '<span class="btn__label"><span class="btn__t">Close</span>'
    + '<span class="btn__t" aria-hidden="true">Close</span></span></button>'
    + '</div>'
    + '</div>'
    + '</form>';

  const form = dlg.querySelector('form');
  const note = dlg.querySelector('.lead__note');
  const thanks = dlg.querySelector('.lead__thanks');
  const sendBtn = dlg.querySelector('.lead__send');

  /* What each field has to be before we will send it. Checked here rather
     than left to the browser: "required" only asks for something, and a lead
     we cannot reply to or ring back is not worth having. */
  const EMAIL = /^[^\s@"'()<>,;:]+@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;
  /* the handful of misspellings that are never what anyone meant */
  const TYPOS = {
    'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmali.com': 'gmail.com',
    'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmail.con': 'gmail.com',
    'gmail.cm': 'gmail.com', 'yahoo.con': 'yahoo.com', 'yaho.com': 'yahoo.com',
    'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com',
    'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com',
  };
  const digitsOf = (s) => (s.match(/\d/g) || []).join('');

  const RULES = {
    name: (v) => {
      if (!v) return 'Please tell us your name.';
      /* two words, three letters between them — enough to rule out "Adi" while
         leaving initials ("J K Rowling") and short names ("Li Wu") alone */
      if (v.split(/\s+/).filter(Boolean).length < 2) return 'Please enter your full name — first and last.';
      if ((v.match(/\p{L}/gu) || []).length < 3) return 'Please enter your full name — first and last.';
      if (!/^[\p{L}][\p{L}'’.-]*(\s+[\p{L}][\p{L}'’.-]*)+$/u.test(v)) return 'Letters only, please — first and last name.';
      return '';
    },
    email: (v) => {
      if (!v) return 'We need an email to reply to.';
      if (!EMAIL.test(v)) return 'That does not look like an email address.';
      const domain = v.split('@')[1].toLowerCase();
      if (TYPOS[domain]) return 'Did you mean ' + v.split('@')[0] + '@' + TYPOS[domain] + '?';
      return '';
    },
    company: (v) => {
      if (!v) return 'Please add your company or brand name.';
      if (v.replace(/[^\p{L}\p{N}]/gu, '').length < 2) return 'Please add your company or brand name.';
      return '';
    },
    phone: (v) => {
      if (!v) return 'Please add a number we can reach you on.';
      if (/[^\d\s+()\-.]/.test(v)) return 'Digits, spaces and + only, please.';
      const d = digitsOf(v);
      if (d.length < 8 || d.length > 15) return 'Please enter a full phone number, with the country code if you are outside India.';
      if (/^(\d)\1+$/.test(d)) return 'That does not look like a real number.';
      return '';
    },
  };

  /* the contact page's form reuses the same checks */
  window.KaziLead = { rules: RULES, configured: !!SHEET_URL, send: sendToSheet, mailto, HONEYPOT, setLabel, TO };

  if (!buttons.length) return;
  document.body.appendChild(dlg);

  const showError = (input, msg) => {
    const slot = input.parentElement.querySelector('.lead__error');
    if (slot) { slot.textContent = msg; slot.hidden = !msg; }
    input.classList.toggle('is-wrong', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };
  const checkField = (input) => {
    const rule = RULES[input.name];
    if (!rule) return '';
    const msg = rule((input.value || '').trim());
    showError(input, msg);
    return msg;
  };
  /* Complain on the way out of a field, never while it is being typed in —
     and clear the complaint as soon as it is being fixed. */
  Object.keys(RULES).forEach((n) => {
    const input = form.elements[n];
    input.addEventListener('blur', () => { if (input.value.trim()) checkField(input); });
    input.addEventListener('input', () => { if (input.classList.contains('is-wrong')) showError(input, ''); });
  });

  /* Hold the page still behind the sheet. Not the shared is-locked class:
     the preloader and the mobile menu both take that off when they are done,
     and one of them was clearing it out from under an open form. */
  let scrollLock = '';
  /* after a lead has gone through, the next open starts from a clean form */
  const panelParts = () => [...form.children].filter((el) => el !== thanks && !el.classList.contains('lead__close'));
  const resetSent = () => {
    if (thanks.hidden) return;
    thanks.hidden = true;
    panelParts().forEach((el) => { el.hidden = el === note; });
    form.reset();
  };
  const open = () => {
    resetSent();
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
  dlg.querySelector('.lead__done').addEventListener('click', close);
  /* the sheet is the panel; a click on the backdrop around it closes */
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  dlg.addEventListener('close', () => { document.body.style.overflow = scrollLock; });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let first = null;
    Object.keys(RULES).forEach((n) => { if (checkField(form.elements[n]) && !first) first = form.elements[n]; });
    if (first) { first.focus(); return; }
    const v = (n) => (form.elements[n].value || '').trim();
    if (v('botcheck')) return;
    if (!SHEET_URL) {
      mailto('New enquiry — ' + (v('company') || v('name')), [
        'Name: ' + v('name'),
        'Email: ' + v('email'),
        'Company: ' + v('company'),
        'Phone: ' + v('phone'),
        '',
        v('message') || '(no message)',
      ]);
      note.hidden = false;
      note.textContent = 'Opening your mail app, addressed to ' + TO
        + '. If nothing happens, write to us there and we will pick it up.';
      return;
    }
    note.hidden = true;
    sendBtn.disabled = true;
    setLabel(sendBtn, 'Sending…');
    sendToSheet({
      form: 'Grow My Brand popup',
      name: v('name'), email: v('email'), company: v('company'), phone: v('phone'),
      message: v('message'),
    }).then(() => {
      panelParts().forEach((el) => { el.hidden = true; });
      thanks.hidden = false;
      thanks.focus({ preventScroll: true });
    }).catch(() => {
      note.hidden = false;
      note.textContent = 'That did not go through — please check your connection and try again, or write to us at ' + TO + '.';
    }).finally(() => {
      sendBtn.disabled = false;
      setLabel(sendBtn, 'Send it over');
    });
  });
})();


/* ---------- Contact page form → the same Google Sheet ---------- */
(() => {
  const form = document.getElementById('ctForm');
  const L = window.KaziLead;
  if (!form || !L) return;
  form.insertAdjacentHTML('beforeend', L.HONEYPOT);
  const submit = form.querySelector('.ct__submit');
  const SUBMIT_TEXT = "[LET'S TALK]";

  const need = (msg) => (v) => (v ? '' : msg);
  const RULES = {
    name: L.rules.name,
    email: L.rules.email,
    service: need('Please pick a service.'),
    phone: L.rules.phone,
    website: need('Please add your website or Instagram.'),
    details: need('Tell us a little about the project.'),
  };
  const showError = (input, msg) => {
    let slot = input.parentElement.querySelector('.ct__error');
    if (!slot && msg) {
      slot = document.createElement('span');
      slot.className = 'ct__error';
      slot.id = input.id + '-err';
      input.setAttribute('aria-describedby', slot.id);
      input.after(slot);
    }
    if (slot) { slot.textContent = msg; slot.hidden = !msg; }
    input.classList.toggle('is-wrong', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };
  const check = (input) => {
    const msg = RULES[input.name]((input.value || '').trim());
    showError(input, msg);
    return msg;
  };
  Object.keys(RULES).forEach((n) => {
    const input = form.elements[n];
    input.addEventListener('blur', () => { if (input.value.trim()) check(input); });
    input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', () => {
      if (input.classList.contains('is-wrong')) showError(input, '');
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let first = null;
    Object.keys(RULES).forEach((n) => { if (check(form.elements[n]) && !first) first = form.elements[n]; });
    if (first) { first.focus(); return; }
    const v = (n) => (form.elements[n].value || '').trim();
    if (v('botcheck')) return;
    const sel = form.elements.service;
    const service = sel.options[sel.selectedIndex].text;
    if (!L.configured) {
      L.mailto('New enquiry — ' + (v('company') || v('name')), [
        'Name: ' + v('name'), 'Email: ' + v('email'), 'Company: ' + v('company'),
        'Service: ' + service, 'Phone: ' + v('phone'), 'Website / Instagram: ' + v('website'),
        '', v('details'),
      ]);
      return;
    }
    submit.disabled = true;
    L.setLabel(submit, '[SENDING…]');
    L.send({
      form: 'Contact page',
      name: v('name'), email: v('email'), company: v('company'), phone: v('phone'),
      service, website: v('website'), message: v('details'),
    }).then(() => {
      const done = document.createElement('div');
      done.className = 'ct__thanks';
      done.setAttribute('role', 'status');
      done.tabIndex = -1;
      done.innerHTML = '<h3 class="ct__thanks-h">Thanks for reaching out</h3>'
        + '<p class="ct__thanks-p">We have your details and will get back to you shortly.</p>';
      form.replaceWith(done);
      done.focus({ preventScroll: true });
    }).catch(() => {
      submit.disabled = false;
      L.setLabel(submit, SUBMIT_TEXT);
      showError(form.elements.details, 'That did not go through — please check your connection and try again, or write to us at ' + L.TO + '.');
    });
  });
})();
