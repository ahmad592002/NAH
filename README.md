# N.A.H — Elevator Installation & Maintenance (landing page)

Static site. No build step, no dependencies to install. Open `index.html`
or serve the folder with any static host.

**Live:** https://ahmad592002.github.io/NAH/ — GitHub Pages, deployed from the
`main` branch root. Push to `main` and Pages republishes in about a minute.

```
index.html
assets/css/styles.css
assets/js/main.js
assets/img/  logo.jpg · favicon.svg · apple-touch-icon.png · og-image.jpg
robots.txt
```

Every file here is used by the live page. The client's questionnaire and the
low-res stock reference images were removed from this folder.

## Language
Arabic is the default (`<html lang="ar" dir="rtl">`). English is a toggle in
the nav. Every translatable element carries `data-ar` and `data-en`; the
script swaps `textContent` and flips `dir`.

**Only leaf elements are translated** — `applyLang()` skips any element that
has element children, because writing `textContent` into it would delete that
markup. If you add a translated string, keep it in its own leaf element.

## Before launch — outstanding items

1. **Real photography.** The page deliberately ships with NO photographs. The
   only images supplied were 250px-wide stock thumbnails, which cannot be
   enlarged and were not the client's own work. Needed: 15–20 images at
   2400×1600 (landscape) / 1600×2400 (portrait), sent via Drive or as
   WhatsApp **Documents** (not "Photos" — WhatsApp recompresses those).
   Slots ready for them: service cards, the projects section.
2. **Project specifications** per photo — area, building type, floors,
   capacity (kg/persons), year. These turn the projects grid into a real
   portfolio.
3. **Testimonials** — the client confirmed he can obtain them.
4. **Brand list** — which manufacturers he actually sources.
5. **Logo as SVG or 300dpi PNG.** Currently only a 1408×768 JPEG. The nav mark
   is a hand-traced SVG of it; brand colours were sampled from the JPEG
   (navy `#0A243F`, orange `#F36A22`).
6. **Own domain (optional).** Hosting is GitHub Pages. If a custom domain is
   bought, update the canonical/og:url/og:image and JSON-LD URLs in
   `index.html` (they point at ahmad592002.github.io/NAH/ now), and add
   `sameAs` for social pages.
7. **Social links** for the footer.

## Notes
- Map: Leaflet + OpenStreetMap tiles, darkened with a CSS filter. No API key.
  OSM's tile policy suits a small site; if traffic grows, swap the tile URL
  for a free-tier provider (MapTiler, Thunderforest).
- The quote form has no backend by design — it composes a pre-filled WhatsApp
  message, with a mailto fallback kept in sync.
- Brand colours, type scale and the navy/orange ratio are documented at the
  top of `styles.css`.
