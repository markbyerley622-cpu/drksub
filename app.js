/* DRK — Project Submission
 * Static, no build step, no backend.
 * Configure CONFIG.WEB3FORMS_KEY to post straight into your inbox.
 * With no key set, the form degrades to a prefilled email + copy-to-clipboard.
 */
(function () {
  'use strict';

  var CONFIG = {
    // Free key from https://web3forms.com (enter nick@drkgroup.xyz, paste the key here).
    WEB3FORMS_KEY: '',
    // Where manual/fallback submissions are addressed.
    INBOX: 'nick@drkgroup.xyz',
    STORAGE_KEY: 'drk-submission-v1'
  };

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
  });

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

  /* ------------------------------------------------------------ progress */
  var BLOCK_DONE = [
    function () { return val('project_name') && val('contact_name') && validEmail(val('email')); },
    function () { return !!state.chain && (state.chain !== 'Other' || !!val('chain_other')); },
    function () { return !!state.launchpad && (state.launchpad !== 'Other' || !!val('launchpad_other')); },
    function () { return !!state.fdv; },
    function () { return !!state.first && (state.first === 'Yes' || !!val('prior_products') || $('[name=prior_private]').checked); },
    function () { return !!state.marketing && val('gtm').length >= 20; },
    function () { return !!state.vertical && (state.vertical !== 'Other' || !!val('vertical_other')); }
  ];

  function update() {
    var done = BLOCK_DONE.filter(function (f) { try { return f(); } catch (_) { return false; } }).length;
    $('#progress-fill').style.width = (done / BLOCK_DONE.length * 100) + '%';
    $('#progress-label').textContent = done + ' / ' + BLOCK_DONE.length + ' complete';
  }

  function val(name) { var el = form.elements[name]; return el && el.value ? el.value.trim() : ''; }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

  /* ----------------------------------------------------------- persistence */
  var saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        var data = { _state: state, fields: {} };
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

  function restore() {
    var raw;
    try { raw = localStorage.getItem(CONFIG.STORAGE_KEY); } catch (_) { return; }
    if (!raw) return;
    var data;
    try { data = JSON.parse(raw); } catch (_) { return; }
    if (data._state) Object.keys(state).forEach(function (k) { if (data._state[k]) state[k] = data._state[k]; });
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

  function validate() {
    var bad = [];

    $$('[data-required]', form).forEach(function (el) {
      if (el.disabled || el.offsetParent === null) return;
      var v = el.value.trim();
      if (!v) { fieldError(el, 'Required'); bad.push(el); }
      else if (el.type === 'email' && !validEmail(v)) { fieldError(el, 'Check this email address'); bad.push(el); }
      else if (el.name === 'gtm' && v.length < 20) { fieldError(el, 'A sentence or two, please'); bad.push(el); }
      else fieldError(el, '');
    });

    [['chain', 'chain', 'Pick a chain'],
     ['launchpad', 'pad', 'Pick a launch venue'],
     ['fdv', 'fdv', 'Pick a starting FDV'],
     ['first', 'first', 'Let us know'],
     ['marketing', 'mkt', 'Let us know how marketing is run'],
     ['vertical', 'vert', 'Pick a vertical']
    ].forEach(function (t) {
      if (!state[t[0]]) { blockError(t[1], t[2]); bad.push($('#' + t[1] + '-grid') || $('#' + t[1] + '-err')); }
      else blockError(t[1], '');
    });

    ['chain_other', 'launchpad_other', 'vertical_other'].forEach(function (n) {
      var el = form.elements[n];
      if (el && el.offsetParent !== null && !el.value.trim()) { fieldError(el, 'Required'); bad.push(el); }
    });

    return bad;
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
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.elements._gotcha.value) return; // bot

    var bad = validate();
    var status = $('#form-status');

    if (bad.length) {
      status.textContent = bad.length + ' field' + (bad.length > 1 ? 's need' : ' needs') + ' attention.';
      status.classList.add('bad');
      var first = bad[0];
      if (first && first.scrollIntoView) {
        first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (first.focus) setTimeout(function () { first.focus({ preventScroll: true }); }, 300);
      }
      return;
    }

    status.textContent = '';
    status.classList.remove('bad');

    var rows = collect();
    var text = asText(rows);
    var btn = $('#submit');

    if (!CONFIG.WEB3FORMS_KEY) { showFallback(rows, text); return; }

    btn.disabled = true;
    btn.classList.add('is-sending');
    $('.submit-text', btn).textContent = 'Sending';

    var payload = { access_key: CONFIG.WEB3FORMS_KEY, subject: 'DRK submission — ' + val('project_name'), from_name: 'DRK Submission Form', replyto: val('email') };
    rows.forEach(function (r) { payload[r[0]] = r[1]; });

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (!r.success) throw new Error(r.message || 'rejected');
        wipe();
        showDone();
      })
      .catch(function () { showFallback(rows, text); })
      .finally(function () {
        btn.disabled = false;
        btn.classList.remove('is-sending');
        $('.submit-text', btn).textContent = 'Submit to DRK';
      });
  });

  function showDone() {
    form.hidden = true;
    $('.hero').hidden = true;
    $('#fallback').hidden = true;
    $('#done').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showFallback(rows, text) {
    form.hidden = true;
    $('.hero').hidden = true;
    $('#summary').textContent = text;
    $('#mailto-link').href = 'mailto:' + CONFIG.INBOX +
      '?subject=' + encodeURIComponent('DRK submission — ' + val('project_name')) +
      '&body=' + encodeURIComponent(text);
    $('#fallback').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  $('#clear').addEventListener('click', function () {
    if (!confirm('Clear everything you have entered?')) return;
    wipe();
    location.reload();
  });

  /* ----------------------------------------------------------------- wire */
  form.addEventListener('input', function (e) {
    if (e.target.name === 'gtm') {
      var c = $('[data-count-for=gtm]');
      if (c) c.textContent = e.target.value.length;
    }
    if (e.target.getAttribute && e.target.getAttribute('aria-invalid') === 'true') fieldError(e.target, '');
    save();
    update();
  });

  form.addEventListener('change', function (e) {
    if (e.target.name === 'prior_private') toggleConditionals();
    save();
    update();
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
  update();
})();
