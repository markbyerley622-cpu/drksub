/* DRK — Project Submission
 * Static, no build step. Submissions POST to /api/submit, which emails DRK,
 * emails the applicant a receipt, and hands back the Telegram invite plus
 * where to send them next. No keys live in here — that is the whole point.
 * If the endpoint cannot be reached, the form degrades to a prefilled email
 * + copy-to-clipboard so nothing entered is ever lost.
 */
(function () {
  'use strict';

  var CONFIG = {
    // Server-side handler. Holds the Resend key; this file never sees it.
    ENDPOINT: '/api/submit',
    // Where manual/fallback submissions are addressed.
    INBOX: 'nick@drkgroup.xyz',
    // Where we send people once they are through. The server can override.
    REDIRECT: 'https://drkgroup.xyz',
    // Long enough to read the confirmation and grab the Telegram link.
    REDIRECT_DELAY: 12,
    STORAGE_KEY: 'drk-submission-v1'
  };

  // Used as a cheap bot filter: a real person cannot clear seven screens in
  // under three seconds. Sent to the server, never stored.
  var OPENED_AT = Date.now();

  /* ---------------------------------------------------------------- logos */
  var LOGO = {
    bnb: '<svg class="mark" viewBox="0 0 24 24" aria-hidden="true" fill="#F0B90B"><path d="M5.631 3.676 12.001 0l6.367 3.676-2.34 1.358L12 2.716 7.972 5.034l-2.34-1.358Zm12.737 4.636-2.34-1.358L12 9.272 7.972 6.954l-2.34 1.358v2.716l4.026 2.318v4.636L12 19.341l2.341-1.359v-4.636l4.027-2.318V8.312Zm0 7.352v-2.716l-2.34 1.358v2.716l2.34-1.358Zm1.663.96-4.027 2.318v2.717l6.368-3.677V10.63l-2.34 1.358v4.636Zm-2.34-10.63 2.34 1.358v2.716l2.341-1.358V5.994l-2.34-1.358-2.342 1.358ZM9.657 19.926v2.716L12 24l2.341-1.358v-2.716l-2.34 1.358-2.343-1.358Zm-4.027-4.262 2.341 1.358v-2.716l-2.34-1.358v2.716Zm4.027-9.67L12 7.352l2.341-1.358-2.34-1.358-2.343 1.358Zm-5.69 1.358L6.31 5.994 3.968 4.636l-2.34 1.358V8.71l2.34 1.358V7.352Zm0 4.636-2.34-1.358v7.352l6.368 3.677v-2.717l-4.028-2.318v-4.636Z"/></svg>',

    base: '<svg class="mark" viewBox="0 0 24 24" aria-hidden="true"><path fill="#0052FF" d="M11.7 24c6.4 0 11.6-5.4 11.6-12S18.1 0 11.7 0C5.7 0 .8 4.7 0 10.8h15.8v2.4H0C.8 19.3 5.7 24 11.7 24Z"/></svg>',

    aptos: '<svg class="mark" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10.4"/><path d="M7.4 16.6 12 6.9l4.6 9.7"/><path d="M9.1 13.1h6M4 10.2h4.2M15.9 10.2H20"/></svg>',

    solana: '<svg class="mark" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="sol" x1="2" y1="21" x2="22" y2="3" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#9945FF"/><stop offset="1" stop-color="#14F195"/></linearGradient></defs><g fill="url(#sol)"><path d="M4.6 16.6h18.1c.5 0 .8.6.4 1l-3.7 3.8a1 1 0 0 1-.7.3H.6c-.5 0-.8-.6-.4-1l3.7-3.8a1 1 0 0 1 .7-.3Z"/><path d="M4.6 9.5h18.1c.5 0 .8.6.4 1l-3.7 3.8a1 1 0 0 1-.7.3H.6c-.5 0-.8-.6-.4-1l3.7-3.8a1 1 0 0 1 .7-.3Z" transform="rotate(180 11.6 12)"/><path d="M4.6 2.3h18.1c.5 0 .8.6.4 1l-3.7 3.8a1 1 0 0 1-.7.3H.6c-.5 0-.8-.6-.4-1L3.9 2.6a1 1 0 0 1 .7-.3Z"/></g></svg>',

    arc: '<svg class="mark" viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M2.6 18.4a10.4 10.4 0 1 1 18.8 0" stroke="#00D66F" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="18.4" r="2.5" fill="#00D66F"/></svg>',

    other: '<svg class="mark" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#778478" stroke-width="1.7" stroke-linecap="round"><rect x="2.5" y="2.5" width="19" height="19" stroke-dasharray="4 3.4"/><path d="M12 8.4v7.2M8.4 12h7.2"/></svg>'
  };

  /* ---------------------------------------------------------------- data */
  var CHAINS = [
    { id: 'bnb',    name: 'BNB Chain', sub: 'BSC',     brand: '#F0B90B', logo: LOGO.bnb,
      pads: ['Four.meme', 'PancakeSwap', 'Binance Wallet TGE', 'Legion', 'Fjord Foundry'] },
    { id: 'base',   name: 'Base',      sub: 'L2',      brand: '#0052FF', logo: LOGO.base,
      pads: ['Virtuals Protocol', 'Clanker', 'Zora', 'Flaunch', 'Doppler', 'Echo / Sonar', 'Aerodrome'] },
    { id: 'aptos',  name: 'Aptos',     sub: 'Move',    brand: '#ffffff', logo: LOGO.aptos,
      pads: ['Emojicoin.fun', 'Thala', 'Panora', 'Echelon'] },
    { id: 'solana', name: 'Solana',    sub: 'SVM',     brand: '#14F195', logo: LOGO.solana,
      pads: ['Pump.fun', 'Bags', 'Believe', 'Bonk.fun', 'Meteora', 'Jupiter LFG', 'Daos.fun'] },
    { id: 'arc',    name: 'Arc',       sub: 'Circle',  brand: '#00D66F', logo: LOGO.arc,
      pads: ['Native TGE', 'Circle partner venue'] },
    { id: 'other',  name: 'Other',     sub: 'Tell us', brand: '#778478', logo: LOGO.other, pads: [] }
  ];

  var FDV = ['Under $1M', '$1M – $5M', '$5M – $10M', '$10M – $25M', '$25M – $50M', '$50M – $100M', '$100M+', 'Undecided'];
  var YES_NO = ['Yes', 'No'];
  var MARKETING = ['In-house team', 'Agency', 'Both', 'Not yet'];
  var VERTICALS = ['Meme / Culture', 'Product / App', 'VC-Backed', 'DeFi', 'Infrastructure', 'AI / Agents', 'Gaming', 'RWA', 'Other'];

  /* ---------------------------------------------------------------- utils */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var form = $('#form');
  var state = { chain: '', launchpad: '', fdv: '', first: '', marketing: '', vertical: '' };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ------------------------------------------------------------- renderers */
  function renderChains() {
    $('#chain-grid').innerHTML = CHAINS.map(function (c) {
      return '<button type="button" class="tile" role="radio" aria-checked="false" tabindex="-1" ' +
        'data-group="chain" data-value="' + esc(c.name) + '" data-id="' + c.id + '" style="--brand:' + c.brand + '">' +
        '<i class="brandbar"></i>' + c.logo +
        '<span class="tile-name">' + esc(c.name) + '</span>' +
        '<span class="tile-sub">' + esc(c.sub) + '</span>' +
        '</button>';
    }).join('');
  }

  function chipHTML(group, value) {
    return '<button type="button" class="chip" role="radio" aria-checked="false" tabindex="-1" ' +
      'data-group="' + group + '" data-value="' + esc(value) + '">' + esc(value) + '</button>';
  }

  function renderChips(el, group, values) {
    $(el).innerHTML = values.map(function (v) { return chipHTML(group, v); }).join('');
    syncGroup(group);
  }

  function renderPads() {
    var chain = CHAINS.filter(function (c) { return c.name === state.chain; })[0];
    var grid = $('#pad-grid');
    var hint = $('#pad-hint');

    if (!chain) {
      grid.innerHTML = '';
      hint.textContent = 'Pick a chain first and we will show the venues we see most often there.';
      hint.hidden = false;
      setOther('pad', false);
      return;
    }
    var pads = chain.pads.concat(['Not decided yet', 'Other']);
    grid.innerHTML = pads.map(function (p) { return chipHTML('launchpad', p); }).join('');
    hint.textContent = chain.pads.length
      ? 'Common venues on ' + chain.name + '. Pick Other if yours is not listed.'
      : 'Tell us where you intend to launch.';
    hint.hidden = false;
    syncGroup('launchpad');
    toggleConditionals();
  }

  /* ------------------------------------------------------- radio behaviour */
  function syncGroup(group) {
    $$('[data-group="' + group + '"]').forEach(function (btn, i, all) {
      var on = btn.dataset.value === state[groupKey(group)];
      btn.setAttribute('aria-checked', on ? 'true' : 'false');
      btn.tabIndex = on ? 0 : -1;
      if (!all.some(function (b) { return b.dataset.value === state[groupKey(group)]; }) && i === 0) btn.tabIndex = 0;
    });
  }

  function groupKey(group) { return group === 'launchpad' ? 'launchpad' : group; }

  /* Steps whose only input is the choice itself advance on their own — the
     flow keeps moving without a Next click. Picking "Other" opens a text
     field, so those stay put. */
  var AUTO_ADVANCE = { chain: 2, launchpad: 3 };

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-group]');
    if (!btn) return;
    var group = btn.dataset.group;
    state[groupKey(group)] = btn.dataset.value;
    if (group === 'chain') { state.launchpad = ''; renderPads(); }
    syncGroup(group);
    toggleConditionals();
    clearBlockError(group);
    save();
    update();

    var step = AUTO_ADVANCE[group];
    if (step && step === current && btn.dataset.value !== 'Other') {
      clearTimeout(autoTimer);
      autoTimer = setTimeout(function () { if (current === step) go(current + 1, 1); }, 340);
    }
  });

  var autoTimer;

  document.addEventListener('keydown', function (e) {
    var btn = e.target.closest('[data-group]');
    if (!btn) return;
    var keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
    if (keys.indexOf(e.key) === -1) return;
    e.preventDefault();
    var all = $$('[data-group="' + btn.dataset.group + '"]');
    var i = all.indexOf(btn);
    var next = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? (i + 1) % all.length : (i - 1 + all.length) % all.length;
    all[next].focus();
    all[next].click();
  });

  /* ------------------------------------------------------- conditionals */
  function setOther(which, show) {
    var wrap = $('#' + which + '-other-wrap');
    if (!wrap) return;
    wrap.hidden = !show;
    if (!show) {
      var input = $('input', wrap);
      if (input) { input.value = ''; input.setAttribute('aria-invalid', 'false'); $('.err', wrap).textContent = ''; }
    }
  }

  function toggleConditionals() {
    setOther('chain', state.chain === 'Other');
    setOther('pad', state.launchpad === 'Other');
    setOther('vert', state.vertical === 'Other');

    var prior = $('#prior-wrap');
    var showPrior = state.first === 'No';
    if (prior.hidden === showPrior) prior.hidden = !showPrior;
    if (!showPrior) {
      $('[name=prior_products]').value = '';
      $('[name=prior_private]').checked = false;
    }

    var priv = $('[name=prior_private]');
    var txt = $('[name=prior_products]');
    if (priv && txt) {
      txt.disabled = priv.checked;
      txt.style.opacity = priv.checked ? '.4' : '';
      if (priv.checked) txt.value = '';
    }
  }

  /* ==========================================================================
     THE FLOW — one step on screen at a time. Step 0 is the intro; 1-7 are the
     questions; 'done' and 'fallback' are the two endings.
     ========================================================================== */

  var LAST = 7;
  var steps = $$('.step', $('#steps'));
  var byName = {};
  steps.forEach(function (s) { byName[s.dataset.step] = s; });

  var current = 0;                        // 0 = intro
  var ended = false;                      // on done/fallback, nav is gone

  function stepEl(n) { return byName[n === 0 ? 'intro' : String(n)]; }

  function go(n, dir) {
    if (ended) return;
    n = Math.max(0, Math.min(LAST, n));
    if (n === current) return;

    var from = stepEl(current);
    var to = stepEl(n);
    if (!to) return;

    // Going forward, the old step lifts out of frame; going back it drops.
    from.classList.remove('is-active');
    from.classList.toggle('is-past', dir > 0);
    to.classList.remove('is-past');
    to.classList.add('is-active');
    to.scrollTop = 0;

    current = n;
    save();
    update();
    focusStep(to);
  }

  function focusStep(el) {
    // On a phone, auto-focusing a text input throws the keyboard up over the
    // question. Only do it where there is a real pointer.
    var target = canHover ? $('input:not([type=hidden]), textarea', el) : null;
    if (target && target.offsetParent !== null && !target.disabled) {
      target.focus({ preventScroll: true });
      return;
    }
    var head = $('.ask, h1', el);
    if (head) {
      head.setAttribute('tabindex', '-1');
      head.focus({ preventScroll: true });
    }
  }

  function showEnding(which) {
    var from = stepEl(current);
    if (from) { from.classList.remove('is-active'); from.classList.add('is-past'); }
    var to = byName[which];
    to.classList.remove('is-past');
    to.classList.add('is-active');
    to.scrollTop = 0;
    ended = true;
    $('#nav').hidden = true;
    $('#progress-fill').style.width = '100%';
    $('#progress-label').textContent = which === 'done' ? 'Sent' : 'Almost';
    focusStep(to);
  }

  /* ---- per-step validation ------------------------------------------------
     Each entry returns a list of problems for that step only. The first one
     decides which field gets focus and the message under the question. */
  var RULES = {
    1: function () {
      var bad = [];
      [['project_name', 'Required'], ['contact_name', 'Required']].forEach(function (p) {
        var el = form.elements[p[0]];
        if (!val(p[0])) bad.push({ el: el, msg: p[1] });
      });
      var em = form.elements.email;
      if (!val('email')) bad.push({ el: em, msg: 'Required' });
      else if (!validEmail(val('email'))) bad.push({ el: em, msg: 'Check this email address' });
      return bad;
    },
    2: function () {
      if (!state.chain) return [{ block: 'chain', msg: 'Pick a chain' }];
      if (state.chain === 'Other' && !val('chain_other')) return [{ el: form.elements.chain_other, msg: 'Required' }];
      return [];
    },
    3: function () {
      if (!state.launchpad) return [{ block: 'pad', msg: 'Pick a launch venue' }];
      if (state.launchpad === 'Other' && !val('launchpad_other')) return [{ el: form.elements.launchpad_other, msg: 'Required' }];
      return [];
    },
    4: function () {
      return state.fdv ? [] : [{ block: 'fdv', msg: 'Pick a starting FDV' }];
    },
    5: function () {
      if (!state.first) return [{ block: 'first', msg: 'Let us know' }];
      if (state.first === 'No' && !val('prior_products') && !$('[name=prior_private]').checked) {
        return [{ el: form.elements.prior_products, msg: 'Tell us briefly, or tick the box below' }];
      }
      return [];
    },
    6: function () {
      var bad = [];
      if (!state.marketing) bad.push({ block: 'mkt', msg: 'Let us know how marketing is run' });
      var g = val('gtm');
      if (!g) bad.push({ el: form.elements.gtm, msg: 'Required' });
      else if (g.length < 20) bad.push({ el: form.elements.gtm, msg: 'A sentence or two, please' });
      return bad;
    },
    7: function () {
      if (!state.vertical) return [{ block: 'vert', msg: 'Pick a vertical' }];
      if (state.vertical === 'Other' && !val('vertical_other')) return [{ el: form.elements.vertical_other, msg: 'Required' }];
      return [];
    }
  };

  function checkStep(n) { return RULES[n] ? RULES[n]() : []; }

  /* Paint a step's problems and put the cursor on the first one. */
  function flagStep(n) {
    var bad = checkStep(n);
    clearStepErrors(n);
    bad.forEach(function (b) {
      if (b.el) fieldError(b.el, b.msg);
      else blockError(b.block, b.msg);
    });
    if (bad.length) {
      var first = bad[0];
      var el = first.el || $('#' + first.block + '-grid');
      var host = stepEl(n);
      if (host) host.classList.add('shake');
      setTimeout(function () { if (host) host.classList.remove('shake'); }, 420);
      if (el && el.focus) el.focus({ preventScroll: true });
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
      status(bad[0].msg, true);
    } else {
      status('', false);
    }
    return bad;
  }

  function clearStepErrors(n) {
    var host = stepEl(n);
    if (!host) return;
    $$('.err', host).forEach(function (e) { e.textContent = ''; });
    $$('[aria-invalid=true]', host).forEach(function (e) { e.setAttribute('aria-invalid', 'false'); });
  }

  function status(msg, bad) {
    var el = $('#form-status');
    el.textContent = msg || '';
    el.classList.toggle('bad', !!bad);
  }

  /* ---- nav ---- */
  function update() {
    var pct = current === 0 ? 0 : (current / LAST) * 100;
    $('#progress-fill').style.width = pct + '%';
    $('#progress-label').textContent = current === 0
      ? 'Ready'
      : pad2(current) + ' / ' + pad2(LAST);

    var back = $('#back');
    if (current === 0) back.setAttribute('data-off', '');
    else back.removeAttribute('data-off');

    $('#next-text').textContent = current === 0 ? 'Start'
      : current === LAST ? 'Submit to DRK'
      : 'Continue';

    var hint = $('#nav-hint');
    if (hint) hint.hidden = current === 0;
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function next() {
    if (ended) return;
    if (current === 0) { go(1, 1); return; }
    if (flagStep(current).length) return;
    if (current === LAST) { submit(); return; }
    go(current + 1, 1);
  }

  function back() {
    if (ended || current === 0) return;
    status('', false);
    go(current - 1, -1);
  }

  $('#next').addEventListener('click', next);
  $('#back').addEventListener('click', back);

  /* Enter advances, except inside a textarea where it should make a newline
     (Ctrl/Cmd+Enter advances from there). */
  document.addEventListener('keydown', function (e) {
    if (ended) return;
    if (e.key === 'Enter') {
      var t = e.target;
      // In a textarea Enter means newline; Ctrl/Cmd+Enter moves on.
      if (t && t.tagName === 'TEXTAREA' && !(e.ctrlKey || e.metaKey)) return;
      // On a button or link, let the browser click it — that already does
      // the right thing for Next, Back, Clear, chips and tiles.
      if (t && (t.tagName === 'BUTTON' || t.tagName === 'A')) return;
      e.preventDefault();
      next();
    }
  });

  function val(name) { var el = form.elements[name]; return el && el.value ? el.value.trim() : ''; }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

  /* ----------------------------------------------------------- persistence */
  var saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        var data = { _state: state, _step: current, fields: {} };
        $$('input,textarea', form).forEach(function (el) {
          if (el.name && el.name !== '_gotcha') data.fields[el.name] = el.type === 'checkbox' ? el.checked : el.value;
        });
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
        flashSaved();
      } catch (_) { /* private mode — form still works, just no draft */ }
    }, 400);
  }

  function flashSaved() {
    var el = $('#save-state');
    el.textContent = 'Draft saved';
    el.classList.add('on');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('on'); }, 1800);
  }

  var restoredStep = 0;
  function restore() {
    var raw;
    try { raw = localStorage.getItem(CONFIG.STORAGE_KEY); } catch (_) { return; }
    if (!raw) return;
    var data;
    try { data = JSON.parse(raw); } catch (_) { return; }
    if (data._state) Object.keys(state).forEach(function (k) { if (data._state[k]) state[k] = data._state[k]; });
    if (typeof data._step === 'number') restoredStep = Math.max(0, Math.min(LAST, data._step));
    if (data.fields) {
      Object.keys(data.fields).forEach(function (k) {
        var el = form.elements[k];
        if (!el) return;
        if (el.type === 'checkbox') el.checked = !!data.fields[k];
        else el.value = data.fields[k];
      });
    }
  }

  function wipe() { try { localStorage.removeItem(CONFIG.STORAGE_KEY); } catch (_) {} }

  /* ------------------------------------------------------------ validation */
  function fieldError(el, msg) {
    if (!el) return;
    var wrap = el.closest('.field') || el.parentElement;
    var slot = wrap && $('.err', wrap);
    if (slot) slot.textContent = msg || '';
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  function blockError(id, msg) { var el = $('#' + id + '-err'); if (el) el.textContent = msg || ''; }
  function clearBlockError(group) {
    var map = { chain: 'chain', launchpad: 'pad', fdv: 'fdv', first: 'first', marketing: 'mkt', vertical: 'vert' };
    if (map[group]) blockError(map[group], '');
  }

  /* --------------------------------------------------------------- payload */
  function collect() {
    var chain = state.chain === 'Other' ? val('chain_other') + ' (other)' : state.chain;
    var pad = state.launchpad === 'Other' ? val('launchpad_other') + ' (other)' : state.launchpad;
    var vert = state.vertical === 'Other' ? val('vertical_other') + ' (other)' : state.vertical;
    var fdv = state.fdv + (val('fdv_exact') ? '  |  exact: $' + val('fdv_exact') : '');

    var prior;
    if (state.first === 'Yes') prior = 'First project';
    else if ($('[name=prior_private]').checked) prior = 'Not their first — prefers to keep prior products private, will cover on a call';
    else prior = val('prior_products') || 'Not their first — no detail given';

    return [
      ['Project', val('project_name')],
      ['Contact', val('contact_name')],
      ['Email', val('email')],
      ['Telegram / X', val('handle') || '—'],
      ['Website', val('website') || '—'],
      ['Chain', chain],
      ['Launchpad', pad],
      ['Starting FDV', fdv],
      ['First project', state.first],
      ['Track record', prior],
      ['Marketing', state.marketing || '—'],
      ['GTM overview', val('gtm')],
      ['Vertical', vert],
      ['Notes', val('notes') || '—']
    ];
  }

  function asText(rows) {
    return 'DRK — PROJECT SUBMISSION\n' +
      new Date().toLocaleString() + '\n\n' +
      rows.map(function (r) {
        return r[0].toUpperCase() + '\n' + r[1] + '\n';
      }).join('\n');
  }

  /* ---------------------------------------------------------------- submit */
  function submit() {
    if (form.elements._gotcha.value) return; // bot

    // Last guard: something may have been cleared on an earlier step.
    for (var n = 1; n <= LAST; n++) {
      if (checkStep(n).length) {
        go(n, n < current ? -1 : 1);
        setTimeout(function () { flagStep(current); }, 260);
        return;
      }
    }

    var rows = collect();
    var text = asText(rows);
    var btn = $('#next');

    btn.disabled = true;
    btn.classList.add('is-sending');
    $('#next-text').textContent = 'Sending';
    status('', false);

    var settled = false;
    function release() {
      if (settled) return;
      settled = true;
      btn.disabled = false;
      btn.classList.remove('is-sending');
      $('#next-text').textContent = 'Submit to DRK';
    }

    // Don't leave someone staring at a spinner on a dead connection.
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);

    fetch(CONFIG.ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(fields()),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (body) {
          return { status: r.status, ok: r.ok, body: body };
        });
      })
      .then(function (r) {
        clearTimeout(timer);

        // 422/429 are the server telling us something fixable. Keep the person
        // on the form with the reason rather than dumping them into fallback.
        if (r.status === 422 || r.status === 429) {
          release();
          status(r.body.error || 'That did not go through. Please check your answers.', true);
          return;
        }
        if (!r.ok || !r.body.ok) throw new Error(r.body.error || 'rejected');

        wipe();
        finish(r.body);
      })
      .catch(function () {
        clearTimeout(timer);
        release();
        showFallback(rows, text);
      });
  }

  /* Raw named values for the server, which does its own validation and builds
   * the email itself — it does not trust anything formatted in here. */
  function fields() {
    return {
      project_name: val('project_name'),
      contact_name: val('contact_name'),
      email: val('email'),
      handle: val('handle'),
      website: val('website'),
      chain: state.chain,
      chain_other: val('chain_other'),
      launchpad: state.launchpad,
      launchpad_other: val('launchpad_other'),
      fdv: state.fdv,
      fdv_exact: val('fdv_exact'),
      first: state.first,
      prior_products: state.first === 'No' ? val('prior_products') : '',
      prior_private: !!$('[name=prior_private]').checked,
      marketing: state.marketing,
      gtm: val('gtm'),
      vertical: state.vertical,
      vertical_other: val('vertical_other'),
      notes: val('notes'),
      _gotcha: form.elements._gotcha.value,
      elapsed_ms: Date.now() - OPENED_AT
    };
  }

  /* Confirmation, then on to drkgroup.xyz. The Telegram link comes from the
   * server so only people who actually submitted ever see it. */
  function finish(res) {
    var invite = res && res.telegram;
    var dest = (res && res.redirect) || CONFIG.REDIRECT;

    var tgWrap = $('#tg-wrap');
    if (invite) {
      $('#tg-link').href = invite;
      tgWrap.hidden = false;
    } else {
      tgWrap.hidden = true;
    }

    // A failed receipt is worth saying out loud — we still have the submission.
    if (res && res.warnings && res.warnings.indexOf('receipt') > -1) {
      $('#done-warn').textContent =
        'We have your submission, but the receipt email did not go out. Nothing further is needed from you.';
    }

    showEnding('done');

    var go = $('#go-now');
    go.href = dest;

    var left = CONFIG.REDIRECT_DELAY;
    var label = $('#countdown');
    var tick = setInterval(function () {
      left--;
      if (left <= 0) {
        clearInterval(tick);
        label.textContent = 'Taking you there now.';
        location.href = dest;
        return;
      }
      label.textContent = 'Continuing to drkgroup.xyz in ' + left + 's.';
    }, 1000);
    label.textContent = 'Continuing to drkgroup.xyz in ' + left + 's.';

    // Someone reading the confirmation or opening Telegram should not get
    // yanked away mid-thought.
    $('#stay').addEventListener('click', function () {
      clearInterval(tick);
      label.textContent = 'Staying put. Use the button above when you are ready.';
      this.hidden = true;
    });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); next(); });

  function showFallback(rows, text) {
    $('#summary').textContent = text;
    $('#mailto-link').href = 'mailto:' + CONFIG.INBOX +
      '?subject=' + encodeURIComponent('DRK submission — ' + val('project_name')) +
      '&body=' + encodeURIComponent(text);
    showEnding('fallback');
  }

  $('#copy').addEventListener('click', function () {
    var btn = this;
    var text = $('#summary').textContent;
    var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy submission'; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, legacy);
    else legacy();
    function legacy() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (_) {}
      document.body.removeChild(ta);
    }
  });

  $('#again').addEventListener('click', function () { wipe(); location.reload(); });

  function clearAll() {
    if (!confirm('Clear everything you have entered?')) return;
    wipe();
    location.reload();
  }
  $('#clear').addEventListener('click', clearAll);
  var clearM = $('#clear-m');
  if (clearM) clearM.addEventListener('click', clearAll);

  /* ----------------------------------------------------------------- wire */
  form.addEventListener('input', function (e) {
    if (e.target.name === 'gtm') {
      var c = $('[data-count-for=gtm]');
      if (c) c.textContent = e.target.value.length;
    }
    if (e.target.getAttribute && e.target.getAttribute('aria-invalid') === 'true') {
      fieldError(e.target, '');
      status('', false);
    }
    save();
  });

  form.addEventListener('change', function (e) {
    if (e.target.name === 'prior_private') toggleConditionals();
    save();
  });

  /* ------------------------------------------------------------------ init */
  renderChains();
  renderChips('#fdv-grid', 'fdv', FDV);
  renderChips('#first-grid', 'first', YES_NO);
  renderChips('#mkt-grid', 'marketing', MARKETING);
  renderChips('#vert-grid', 'vertical', VERTICALS);

  restore();
  renderPads();
  ['chain', 'fdv', 'first', 'marketing', 'vertical'].forEach(syncGroup);
  toggleConditionals();

  var gtm = form.elements.gtm;
  if (gtm && gtm.value) $('[data-count-for=gtm]').textContent = gtm.value.length;

  // Open on the step they left off at, with everything before it marked past.
  current = restoredStep;
  steps.forEach(function (s) { s.classList.remove('is-active', 'is-past'); });
  for (var i = 0; i < current; i++) { var p = stepEl(i); if (p) p.classList.add('is-past'); }
  var start = stepEl(current);
  if (start) start.classList.add('is-active');
  update();
})();
