# DRK — Project Submission Form

A static intake form styled to match `liquidity.drkgroup.xyz`. No build step, no framework,
no dependencies — three files plus fonts, and one serverless function that does the sending.

One question per screen: the page itself never scrolls, and each step fades and rises into
place as you move through it. A step taller than the viewport scrolls inside itself rather
than stretching the page.

```
index.html      markup
styles.css      design tokens lifted from the deck (#070908 / #65e681 / Inter + Space Grotesk)
app.js          chain + launchpad data, autosave, validation, submission
api/submit.js   server-side: validation, spam gates, Resend, Telegram
assets/         wordmark, favicon, self-hosted woff2 fonts
```

---

## 1. What happens on submit

The browser POSTs the raw answers to `/api/submit`. No keys live in the frontend.
The function then, in order:

1. **Validates** every field again server-side and rejects with a specific message.
2. **Emails DRK** the full submission, `Reply-To` set to the applicant.
3. **Emails the applicant** a receipt, `Reply-To` set to `nick@drkgroup.xyz`.
4. **Pings Telegram** (optional) in an existing ops chat.
5. **Returns** the Telegram invite link and the redirect target.

The browser then clears the saved draft, shows the confirmation with the Telegram
hand-off, and continues to `drkgroup.xyz` after 12 seconds — cancellable with
**Give me a moment** so nobody gets yanked away mid-read.

Step 2 is the only one allowed to fail the request. A bounced receipt or a Telegram
outage returns `200` with a `warnings` array — the submission is already safe, and
making someone refill seven screens over a failed courtesy email would be worse.

**If the endpoint is unreachable entirely**, the form falls back to what it always did:
the full submission on screen, an **Open in email** button prefilled to
`nick@drkgroup.xyz`, and **Copy submission**. Nothing is ever lost.

---

## 2. Configuration

All secrets are environment variables — see `.env.example` for the full list and the
defaults. The only required one is `RESEND_API_KEY`.

**Local:** copy `.env.example` to `.env.local` (gitignored), then `vercel dev`.

**Production:** set the same keys in **Vercel → Project → Settings → Environment
Variables**. `.env.local` is *not* deployed, so a key that only exists there will
leave production returning `503 Email is not configured yet`.

### Resend domain verification

Sending as `contact@drkgroup.xyz` requires `drkgroup.xyz` to be verified in Resend:
**resend.com/domains → Add Domain**, then add the DKIM/SPF records it gives you at your
registrar. Leave the existing **MX records untouched** — domain verification is for
*sending* only and does not reroute incoming mail.

Until that is done, Resend only accepts sends from `onboarding@resend.dev` and only to
the account owner's own address.

Note that verifying the domain does **not** create an inbox at `contact@drkgroup.xyz`.
Mail sent *to* that address goes nowhere unless you configure receiving for it, which is
why `SUBMISSIONS_TO` defaults to both `contact@` and `nick@`.

Keep both addresses through the first few *real* submissions and confirm they are actually
landing before narrowing it. Trimming `SUBMISSIONS_TO` down to `contact@` is a cleanup to
do once the workflow is proven, not part of going live.

Use a **Sending-access** key restricted to the domain, not a Full-access key.

---

## 3. Deploy

**Vercel** — connect the repo, leave the build command empty, publish directory `/`.
The `api/` folder is picked up automatically as a Node function; there is no
`package.json` and nothing to install.

Static-only hosts (GitHub Pages, Cloudflare Pages) will serve the form but **not**
`/api/submit`, so every submission lands in the manual-email fallback.

For `submit.drkgroup.xyz`, add a CNAME in your DNS to the Vercel deployment.

---

## 4. What it asks

| # | Section | Notes |
|---|---------|-------|
| 01 | Project, name, email, handle, site | email validated |
| 02 | **Chain** — BNB Chain, Base, Aptos, Solana, Arc, Other | logo tiles, brand-coloured |
| 03 | **Launchpad** | options change with the chain; Other opens a text field |
| 04 | **Starting FDV** | bands + optional exact figure |
| 05 | **First project?** | No → prior products, with a "keep private" opt-out |
| 06 | **Marketing & GTM** | in-house / agency / both / not yet + written overview |
| 07 | **Launch vertical** | meme, product, VC-backed, DeFi, infra, AI, gaming, RWA, other |

---

## 5. Draft caching

Every keystroke is debounced and written to `localStorage` under `drk-submission-v1`.
Close the tab, lose signal, come back tomorrow — everything is still there, including the
chain and chip selections *and the step they had reached*, so they reopen on the question
they left off at rather than back at the start. The draft is cleared only on a successful
send or when the user hits **Clear form**. If `localStorage` is unavailable (private
browsing), the form degrades quietly rather than erroring.

A `Draft saved` indicator flashes in the header so people can see it happening.

---

## 6. Editing the options

All copy-level content lives in the data block near the top of `app.js`:

```js
var CHAINS   = [ ... ]   // name, sub-label, brand colour, inline SVG mark, pads[]
var FDV      = [ ... ]
var MARKETING= [ ... ]
var VERTICALS= [ ... ]
```

Adding a chain means adding one object with a `pads` array — the launchpad step
rewires itself automatically. Chain marks are inline SVG, so there are no external
requests and nothing to 404.

---

## 7. Telegram

Deliberately kept to the simple version.

**What is wired up:** set `TELEGRAM_INVITE_LINK` and the confirmation screen shows an
**Open Telegram** card, and the receipt email carries the same link. Set
`TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` as well and each submission also posts a short
alert into that existing DRK chat. Leave them blank and both features simply do not render
— nothing else changes.

To get the chat id: create the group, add the bot to it, post any message, then open
`https://api.telegram.org/bot<TOKEN>/getUpdates` and read `result[].message.chat.id`
(supergroups look like `-1001234567890`).

**What is not wired up, and why:** the idea of the bot spinning up a fresh group per
applicant and adding everyone automatically is not possible with a bot token. The Telegram
**Bot API cannot create groups** — only a real user account can, via MTProto (Telethon,
GramJS). Doing it would mean running a userbot logged in as a person, holding that session
string as a credential, and accepting that Telegram rate-limits and sometimes flags
accounts that mass-create groups and add users. That is a much bigger surface than this
form needs.

The integration point if you ever want it: `notifyTelegram()` in `api/submit.js` is the
single place that talks to Telegram, and `finish()` in `app.js` is the single place the
invite link reaches the UI. A per-applicant group would swap out the former and pass a
fresh link through the existing `telegram` field in the JSON response.

---

## 8. Spam, rate limiting and data handling

- **Honeypot** — the existing `_gotcha` field. Filled means bot.
- **Time trap** — anything submitted under 3 seconds from page load is treated as a bot.
- Both answer `200 OK` and silently discard, so a bot learns nothing from the response.
- **Rate limit** — 5 per 10 minutes per IP, and no two within 20 seconds.
- **Field caps** — every field is truncated rather than rejected, and the body is capped
  at 64KB. A long GTM writeup is a good sign, not a reason to lose the submission.
- **Escaping** — all applicant input is HTML-escaped before it reaches the email template.

One honest caveat: the rate limiter is an in-memory `Map`, so it is per warm serverless
instance, not global. It stops a rapid loop from one source, which is what it is for, but
a distributed or slow-drip attacker gets past it. `rateLimit()` is self-contained — swap
it for Upstash Redis if that ever matters. Vercel's own WAF is the other option and needs
no code change.

On data: the submission is emailed and nothing is written to a database or logged in full.
The draft in `localStorage` is the applicant's own browser only, and it is **wiped on a
successful send**, so answers do not linger on a shared machine.

---

## 9. Other details

- Mobile-first, tested down to 380px; safe-area insets handled for notched phones.
- Keyboard accessible: the tile and chip groups are real ARIA radiogroups with arrow-key
  navigation and roving tabindex. <kbd>Enter</kbd> advances a step.
- Honeypot field for bots. It is pinned with `top:0` — left to its static position it sits
  below the full-height deck and adds ~30px to the document, which breaks the no-scroll rule.
- Icons: `favicon.svg` / `favicon-32.png` / `favicon.ico` / `apple-touch-icon.png`, all DRK mark.
- Respects `prefers-reduced-motion`.
- Fonts are self-hosted, so no Google Fonts call and no layout shift.
