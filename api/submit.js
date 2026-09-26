/* DRK — submission intake
 *
 * Vercel Node serverless function. No dependencies and no build step: Resend
 * and Telegram are both plain REST calls over global fetch, so the site stays
 * a static deploy with one function bolted on.
 *
 * Flow: validate -> email DRK -> receipt to the applicant -> Telegram ping ->
 * hand the client the invite link and where to go next.
 *
 * Env (Vercel -> Settings -> Environment Variables; mirrored in .env.local):
 *   RESEND_API_KEY        required. Sending-only key, restricted to the domain.
 *                         RESEND_API is accepted as an alias.
 *   SUBMISSIONS_TO        comma-separated recipients.  default contact@,nick@drkgroup.xyz
 *   MAIL_FROM             verified sender.             default DRK <contact@drkgroup.xyz>
 *   REPLY_TO              human inbox for receipts.    default nick@drkgroup.xyz
 *   REDIRECT_URL          post-submit destination.     default https://drkgroup.xyz
 *   TELEGRAM_INVITE_LINK  optional. Group invite shown to the applicant.
 *   TELEGRAM_BOT_TOKEN    optional. Pings the ops chat below. BOT_FATHER is an alias.
 *   TELEGRAM_CHAT_ID      optional. Existing DRK ops group/channel id.
 */

'use strict';

const RESEND_KEY = process.env.RESEND_API_KEY || process.env.RESEND_API || '';

/* Comma-separated. contact@ is the address on the form, but verifying a domain
 * for sending does not create an inbox at that address — so nick@ is included
 * by default to guarantee submissions actually land somewhere read. Drop it
 * from SUBMISSIONS_TO once contact@ is receiving mail on its own. */
const TO = (process.env.SUBMISSIONS_TO || 'contact@drkgroup.xyz,nick@drkgroup.xyz')
  .split(',').map(function (s) { return s.trim(); }).filter(Boolean);

const CONFIG = {
  to: TO,
  from: process.env.MAIL_FROM || 'DRK <contact@drkgroup.xyz>',
  replyTo: process.env.REPLY_TO || 'nick@drkgroup.xyz',
  redirect: process.env.REDIRECT_URL || 'https://drkgroup.xyz',
  inviteLink: process.env.TELEGRAM_INVITE_LINK || '',
  botToken: process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_FATHER || '',
  chatId: process.env.TELEGRAM_CHAT_ID || ''
};

/* ---------------------------------------------------------------- limits */

/* Per-field ceilings. Anything longer is truncated rather than rejected — a
 * long GTM writeup is a good sign, not a reason to lose the submission. */
const CAPS = {
  project_name: 120, contact_name: 120, email: 200, handle: 120, website: 300,
  chain: 60, chain_other: 80, launchpad: 80, launchpad_other: 120,
  fdv: 60, fdv_exact: 40, first: 8, prior_products: 4000,
  marketing: 80, gtm: 6000, vertical: 80, vertical_other: 120, notes: 4000
};

const MAX_BODY = 64 * 1024;
const MIN_ELAPSED_MS = 3000;   // humans do not clear seven screens instantly

/* Rate limit. In-memory, so it is per warm instance rather than global — a
 * speed bump against a loop, not a guarantee. If this ever needs to be real,
 * swap this block for Upstash Redis; nothing else has to change. */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const MIN_GAP_MS = 20 * 1000;
const hits = new Map();

function rateLimit(ip) {
  const now = Date.now();
  if (hits.size > 5000) hits.clear();                  // crude ceiling on memory
  const seen = (hits.get(ip) || []).filter(function (t) { return now - t < WINDOW_MS; });
  if (seen.length && now - seen[seen.length - 1] < MIN_GAP_MS) {
    return 'One moment — that came through a little fast. Try again shortly.';
  }
  if (seen.length >= MAX_PER_WINDOW) {
    return 'Too many submissions from this connection. Try again in a few minutes.';
  }
  seen.push(now);
  hits.set(ip, seen);
  return null;
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || 'unknown';
}

/* ------------------------------------------------------------- utilities */

function str(v, cap) {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, cap || 200);
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* --------------------------------------------------------------- shaping */

/* Rebuild the labelled rows on the server rather than trusting whatever the
 * browser formatted, so the email and the validation see the same thing. */
function buildRows(f) {
  function withOther(pick, other) {
    if (pick !== 'Other') return pick;
    return other ? other + ' (other)' : 'Other (unspecified)';
  }

  const fdv = f.fdv + (f.fdv_exact ? '  |  exact: $' + f.fdv_exact : '');

  let track;
  if (f.first === 'Yes') track = 'First project';
  else if (f.prior_private) track = 'Not their first — prefers to keep prior products private, will cover on a call';
  else track = f.prior_products || 'Not their first — no detail given';

  return [
    ['Project', f.project_name],
    ['Contact', f.contact_name],
    ['Email', f.email],
    ['Telegram / X', f.handle || '—'],
    ['Website', f.website || '—'],
    ['Chain', withOther(f.chain, f.chain_other)],
    ['Launchpad', withOther(f.launchpad, f.launchpad_other)],
    ['Starting FDV', fdv],
    ['First project', f.first],
    ['Track record', track],
    ['Marketing', f.marketing || '—'],
    ['GTM overview', f.gtm],
    ['Vertical', withOther(f.vertical, f.vertical_other)],
    ['Notes', f.notes || '—']
  ];
}

function validate(f) {
  const bad = [];
  if (!f.project_name) bad.push('Project name is required.');
  if (!f.contact_name) bad.push('Your name is required.');
  if (!f.email) bad.push('Email is required.');
  else if (!EMAIL_RE.test(f.email)) bad.push('That email address does not look right.');
  if (!f.chain) bad.push('Pick a chain.');
  if (f.chain === 'Other' && !f.chain_other) bad.push('Tell us which chain.');
  if (!f.launchpad) bad.push('Pick a launch venue.');
  if (f.launchpad === 'Other' && !f.launchpad_other) bad.push('Tell us where you are launching.');
  if (!f.fdv) bad.push('Pick a starting FDV.');
  if (!f.first) bad.push('Let us know whether this is your first project.');
  if (f.first === 'No' && !f.prior_products && !f.prior_private) {
    bad.push('Tell us briefly about prior products, or mark it private.');
  }
  if (!f.marketing) bad.push('Let us know how marketing is run.');
  if (!f.gtm) bad.push('A GTM overview is required.');
  else if (f.gtm.length < 20) bad.push('The GTM overview needs a sentence or two.');
  if (!f.vertical) bad.push('Pick a vertical.');
  if (f.vertical === 'Other' && !f.vertical_other) bad.push('Describe your vertical.');
  return bad;
}

/* ---------------------------------------------------------------- render */

function asText(rows, stamp) {
  return 'DRK — PROJECT SUBMISSION\n' + stamp + '\n\n' +
    rows.map(function (r) { return r[0].toUpperCase() + '\n' + r[1] + '\n'; }).join('\n');
}

function shell(title, inner) {
  return '<!doctype html>' +
'<html><body style="margin:0;padding:32px 16px;background:#070807;">' +
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">' +
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#0e100e;border:1px solid #1e221e;border-radius:14px;overflow:hidden;">' +
'<tr><td style="padding:26px 30px 20px;border-bottom:1px solid #1e221e;">' +
'<div style="font:600 19px/1 -apple-system,Helvetica,Arial,sans-serif;letter-spacing:.14em;color:#00e060;">DRK</div>' +
'<div style="margin-top:8px;font:400 13px/1.5 -apple-system,Helvetica,Arial,sans-serif;color:#8b948c;">' + esc(title) + '</div>' +
'</td></tr>' + inner + '</table>' +
'<div style="max-width:600px;margin:18px auto 0;font:400 11px/1.6 -apple-system,Helvetica,Arial,sans-serif;color:#5c655d;text-align:center;">' +
'DRK — own the liquidity, manage the cycle. <a href="https://drkgroup.xyz" style="color:#5c655d;">drkgroup.xyz</a>' +
'</div></td></tr></table></body></html>';
}

function internalHtml(rows, stamp, meta) {
  const cells = rows.map(function (r) {
    return '<tr><td style="padding:13px 30px 4px;font:600 10px/1.4 -apple-system,Helvetica,Arial,sans-serif;letter-spacing:.11em;text-transform:uppercase;color:#6f786f;">' + esc(r[0]) + '</td></tr>' +
      '<tr><td style="padding:0 30px 13px;border-bottom:1px solid #161916;font:400 14px/1.6 -apple-system,Helvetica,Arial,sans-serif;color:#e8ece8;white-space:pre-wrap;">' + esc(r[1]) + '</td></tr>';
  }).join('');

  const inner =
'<tr><td style="padding:22px 30px 2px;font:600 20px/1.3 -apple-system,Helvetica,Arial,sans-serif;color:#f2f5f2;">New submission — ' + esc(rows[0][1]) + '</td></tr>' +
'<tr><td style="padding:6px 30px 14px;font:400 12px/1.5 -apple-system,Helvetica,Arial,sans-serif;color:#8b948c;">' + esc(stamp) + '</td></tr>' +
'<tr><td style="padding:0 30px 18px;">' +
'<a href="mailto:' + esc(rows[2][1]) + '" style="display:inline-block;padding:10px 18px;background:#00e060;color:#04170a;border-radius:8px;font:600 13px/1 -apple-system,Helvetica,Arial,sans-serif;text-decoration:none;">Reply to ' + esc(rows[1][1]) + '</a>' +
'</td></tr>' +
'<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + cells + '</table></td></tr>' +
'<tr><td style="padding:16px 30px 24px;font:400 11px/1.6 -apple-system,Helvetica,Arial,sans-serif;color:#5c655d;">Submitted from ' + esc(meta.ip) + ' · ' + esc(meta.ua) + '</td></tr>';

  return shell('Project submission', inner);
}

function receiptHtml(rows, stamp, invite) {
  const summary = rows.slice(0, 8).map(function (r) {
    return '<tr>' +
      '<td style="padding:9px 0;border-bottom:1px solid #161916;font:400 12px/1.5 -apple-system,Helvetica,Arial,sans-serif;color:#6f786f;width:38%;vertical-align:top;">' + esc(r[0]) + '</td>' +
      '<td style="padding:9px 0;border-bottom:1px solid #161916;font:400 13px/1.5 -apple-system,Helvetica,Arial,sans-serif;color:#e8ece8;">' + esc(r[1]) + '</td>' +
      '</tr>';
  }).join('');

  const inviteBlock = invite
    ? '<tr><td style="padding:4px 30px 22px;">' +
      '<div style="padding:16px 18px;background:#0b1a10;border:1px solid #14351f;border-radius:10px;">' +
      '<div style="font:600 13px/1.4 -apple-system,Helvetica,Arial,sans-serif;color:#f2f5f2;">Jump straight into the room</div>' +
      '<div style="margin:6px 0 12px;font:400 12px/1.6 -apple-system,Helvetica,Arial,sans-serif;color:#8b948c;">Rather than wait on email, join the DRK Telegram and we will pick it up from there.</div>' +
      '<a href="' + esc(invite) + '" style="display:inline-block;padding:9px 16px;background:#00e060;color:#04170a;border-radius:8px;font:600 12px/1 -apple-system,Helvetica,Arial,sans-serif;text-decoration:none;">Open Telegram</a>' +
      '</div></td></tr>'
    : '';

  const inner =
'<tr><td style="padding:22px 30px 2px;font:600 20px/1.3 -apple-system,Helvetica,Arial,sans-serif;color:#f2f5f2;">We have your submission.</td></tr>' +
'<tr><td style="padding:8px 30px 18px;font:400 14px/1.65 -apple-system,Helvetica,Arial,sans-serif;color:#b6beb7;">Thanks for sending ' + esc(rows[0][1]) + ' across. It is with the team now — expect a reply within two business days. This note is your receipt; nothing further is needed from you.</td></tr>' +
inviteBlock +
'<tr><td style="padding:0 30px 6px;font:600 10px/1.4 -apple-system,Helvetica,Arial,sans-serif;letter-spacing:.11em;text-transform:uppercase;color:#6f786f;">What we received</td></tr>' +
'<tr><td style="padding:0 30px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + summary + '</table></td></tr>' +
'<tr><td style="padding:0 30px 26px;font:400 12px/1.6 -apple-system,Helvetica,Arial,sans-serif;color:#8b948c;">Logged ' + esc(stamp) + '. Reply to this email if anything above needs correcting.</td></tr>';

  return shell('Submission received', inner);
}

/* ----------------------------------------------------------------- sends */

async function sendEmail(payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + RESEND_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const detail = await res.text().catch(function () { return ''; });
    throw new Error('resend ' + res.status + ' ' + detail.slice(0, 300));
  }
  return res.json();
}

/* Ping an existing DRK ops chat. Note: the Bot API cannot create a group, so
 * there is no per-applicant group to open from here — the bot has to already
 * be a member of TELEGRAM_CHAT_ID. See README for the upgrade path. */
async function notifyTelegram(rows) {
  if (!CONFIG.botToken || !CONFIG.chatId) return { skipped: true };

  function line(k) {
    const hit = rows.filter(function (r) { return r[0] === k; })[0];
    return hit ? hit[1] : '—';
  }

  // Plain text on purpose: applicant-supplied names would break parse_mode
  // and Telegram would reject the whole message.
  const text =
    'New DRK submission\n\n' +
    'Project: ' + line('Project') + '\n' +
    'Contact: ' + line('Contact') + '\n' +
    'Email: ' + line('Email') + '\n' +
    'Telegram / X: ' + line('Telegram / X') + '\n' +
    'Chain: ' + line('Chain') + '\n' +
    'Launchpad: ' + line('Launchpad') + '\n' +
    'FDV: ' + line('Starting FDV') + '\n' +
    'Vertical: ' + line('Vertical') + '\n\n' +
    'Full detail is in the email to ' + CONFIG.to.join(', ') + '.';

  const res = await fetch('https://api.telegram.org/bot' + CONFIG.botToken + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CONFIG.chatId, text: text, disable_web_page_preview: true })
  });
  if (!res.ok) throw new Error('telegram ' + res.status);
  return res.json();
}

/* --------------------------------------------------------------- handler */

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  if (!RESEND_KEY) {
    console.error('submit: RESEND_API_KEY is not set');
    return res.status(503).json({ ok: false, error: 'Email is not configured yet.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    if (body.length > MAX_BODY) return res.status(413).json({ ok: false, error: 'Submission too large.' });
    try { body = JSON.parse(body); } catch (_) {
      return res.status(400).json({ ok: false, error: 'Could not read that submission.' });
    }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'Could not read that submission.' });
  }

  // Spam gates. Both answer 200 so a bot learns nothing from the response.
  if (str(body._gotcha, 200)) {
    console.warn('submit: honeypot tripped');
    return res.status(200).json({ ok: true, redirect: CONFIG.redirect, telegram: '' });
  }
  if (typeof body.elapsed_ms === 'number' && body.elapsed_ms >= 0 && body.elapsed_ms < MIN_ELAPSED_MS) {
    console.warn('submit: filled too fast (' + body.elapsed_ms + 'ms)');
    return res.status(200).json({ ok: true, redirect: CONFIG.redirect, telegram: '' });
  }

  const ip = clientIp(req);
  const limited = rateLimit(ip);
  if (limited) return res.status(429).json({ ok: false, error: limited });

  const f = {};
  Object.keys(CAPS).forEach(function (k) { f[k] = str(body[k], CAPS[k]); });
  f.prior_private = body.prior_private === true || body.prior_private === 'yes';

  const problems = validate(f);
  if (problems.length) {
    return res.status(422).json({ ok: false, error: problems[0], problems: problems });
  }

  const rows = buildRows(f);
  const stamp = new Date().toLocaleString('en-US', {
    timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short'
  }) + ' UTC';
  const text = asText(rows, stamp);
  const meta = { ip: ip, ua: str(req.headers['user-agent'], 200) || 'unknown' };

  /* The submission reaching DRK is the part that must not fail. The receipt
   * and the Telegram ping are best-effort — a bounced receipt is no reason to
   * make the applicant fill the form again. */
  try {
    await sendEmail({
      from: CONFIG.from,
      to: CONFIG.to,
      reply_to: f.email,
      subject: 'DRK submission — ' + f.project_name,
      text: text,
      html: internalHtml(rows, stamp, meta)
    });
  } catch (err) {
    console.error('submit: internal email failed —', err.message);
    return res.status(502).json({ ok: false, error: 'We could not deliver that. Please try once more.' });
  }

  const warnings = [];

  try {
    await sendEmail({
      from: CONFIG.from,
      to: [f.email],
      reply_to: CONFIG.replyTo,
      subject: 'DRK — we received your submission',
      text: 'We have your submission.\n\n' +
        'Thanks for sending ' + f.project_name + ' across. It is with the team now — ' +
        'expect a reply within two business days. This note is your receipt.\n\n' +
        (CONFIG.inviteLink ? 'Join the DRK Telegram: ' + CONFIG.inviteLink + '\n\n' : '') +
        text + '\n\nLogged ' + stamp + '.\nDRK — drkgroup.xyz',
      html: receiptHtml(rows, stamp, CONFIG.inviteLink)
    });
  } catch (err) {
    console.error('submit: receipt to applicant failed —', err.message);
    warnings.push('receipt');
  }

  try {
    await notifyTelegram(rows);
  } catch (err) {
    console.error('submit: telegram notify failed —', err.message);
    warnings.push('telegram');
  }

  return res.status(200).json({
    ok: true,
    redirect: CONFIG.redirect,
    telegram: CONFIG.inviteLink,
    warnings: warnings
  });
};
