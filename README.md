# DRK — Project Submission Form

A static intake form styled to match `liquidity.drkgroup.xyz`. No build step, no framework,
no server. Three files plus fonts.

```
index.html   markup
styles.css   design tokens lifted from the deck (#070908 / #65e681 / Inter + Space Grotesk)
app.js       chain + launchpad data, autosave, validation, submission
assets/      wordmark, favicon, self-hosted woff2 fonts
```

---

## 1. Point it at your inbox

Open `app.js` and fill in the key at the top:

```js
var CONFIG = {
  WEB3FORMS_KEY: '',              // <- paste key here
  INBOX: 'nick@drkgroup.xyz',
  STORAGE_KEY: 'drk-submission-v1'
};
```

Get the key at **https://web3forms.com** — enter `nick@drkgroup.xyz`, and they email you an
access key. Free tier is 250 submissions/month, no account, no dashboard required.
Submissions arrive as a formatted email.

To copy other people in, log into the Web3Forms dashboard with that key and add CC recipients.

**Until a key is set**, the form still works end to end: on submit it shows the full
submission, an **Open in email** button that launches a prefilled message to
`nick@drkgroup.xyz`, and a **Copy submission** button. Nothing is ever lost.
The same fallback kicks in automatically if the API is ever unreachable.

### If you would rather use Netlify

Deploy to Netlify and Netlify Forms handles it with no key at all — add
`netlify` and `name="drk-submission"` to the `<form>` tag in `index.html`,
and set email notifications in Site settings → Forms.

---

## 2. Deploy (free)

**GitHub Pages** — Settings → Pages → Source: `main`, folder `/ (root)`. Live in ~30s at
`https://<user>.github.io/drksub/`.

**Cloudflare Pages / Netlify / Vercel** — connect the repo, leave build command empty,
publish directory `/`.

For `submit.drkgroup.xyz`, add a CNAME in your DNS to whichever host you pick.

---

## 3. What it asks

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

## 4. Draft caching

Every keystroke is debounced and written to `localStorage` under `drk-submission-v1`.
Close the tab, lose signal, come back tomorrow — everything is still there, including the
chain and chip selections. The draft is cleared only on a successful send or when the
user hits **Clear form**. If `localStorage` is unavailable (private browsing), the form
degrades quietly rather than erroring.

A `Draft saved` indicator flashes in the header so people can see it happening.

---

## 5. Editing the options

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

## 6. Other details

- Mobile-first, tested down to 380px; safe-area insets handled for notched phones.
- Keyboard accessible: the tile and chip groups are real ARIA radiogroups with arrow-key
  navigation and roving tabindex.
- Honeypot field for bots.
- Respects `prefers-reduced-motion`.
- Fonts are self-hosted, so no Google Fonts call and no layout shift.
