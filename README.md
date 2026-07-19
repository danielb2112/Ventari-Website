# ventari.eu – Website

Statische Website für [ventari.eu](https://ventari.eu), gehostet auf **Cloudflare Pages**.

## Struktur

```
/                          → Homepage (DE)
/en/                       → Homepage (EN)
/pl/                       → Homepage (PL)
/preise.html               → Preisseite (DE)
/pricing.html              → Pricing page (EN)
/sitemap.xml
/robots.txt
/worker.js                 → Cloudflare Worker (Kontaktformular via Resend)
/wrangler.jsonc            → Worker-Konfiguration

/tools/
  index.html               → Tools-Übersicht

/blog/
  index.html               → Blog-Übersicht
  eu-ai-act-mittelstand-2026/index.html
  nis2-kmu-betroffen-2026/index.html
  ki-use-cases-roi-mittelstand/index.html

/ki-readiness-test.html                  → KI-Readiness-Test (DE)
/ai-readiness-test-en.html               → AI Readiness Test (EN)
/eu-ai-act-checker.html                  → EU AI Act Checker (DE)
/eu-ai-act-checker-en.html               → EU AI Act Checker (EN)
/ki-projektkosten-schaetzer.html         → Projektkostenschätzer (DE)
/ai-project-cost-estimator-en.html       → Project Cost Estimator (EN)
/automatisierungspotenzial-rechner.html  → Automatisierungspotenzial (DE)
/automation-potential-calculator-en.html → Automation Calculator (EN)
```

## Setup vor dem Launch

1. **Resend API Key** als Cloudflare Worker Secret `RESEND_API_KEY` setzen
2. **Cloudflare Worker** deployen → Worker-URL in `index.html` prüfen
3. **Resend Domain** `ventari.eu` verifizieren (SPF/DKIM)
4. Dieses Repo als **Cloudflare Pages** Projekt verbinden
5. Custom Domains `ventari.eu` und `www.ventari.eu` in Cloudflare Pages eintragen

## Deployment

Cloudflare Pages deployed automatisch bei jedem Push auf `main`.

Die Domain `www.ventari.eu` muss als Pages-Custom-Domain hinterlegt sein und
per proxied CNAME auf `ventari-website.pages.dev` zeigen. Der Apex
`ventari.eu` bleibt ebenfalls auf das Pages-Projekt geroutet.

Der Kontaktformular-Worker ist eine separate Cloudflare-Worker-Laufzeit. Code-
Änderungen an `worker.js` gehen nicht automatisch über Cloudflare Pages live.
Deploy:

```
npx wrangler deploy
```

Vor dem ersten Deploy:

```
npx wrangler secret put RESEND_API_KEY
```

## Cloudflare AI-Crawler

Die statische `robots.txt` erlaubt GPTBot, ClaudeBot und Google-Extended. Damit
Cloudflare keine blockierenden Regeln vor diese Datei setzt, müssen im
Cloudflare Dashboard unter **Security Settings > Bot traffic** zwei Einstellungen
deaktiviert sein:

1. **Instruct AI bot traffic with robots.txt**: aus
2. **Block AI bots**: **Do not block (off)**

Cloudflare kann sonst eigene `Disallow`-Regeln vor die Repository-Datei setzen
oder AI-Crawler bereits auf Netzwerkebene blockieren.

## Sprach-URLs und hreflang

Die Startseite wird als drei statische Sprachvarianten ausgeliefert: `/`,
`/en/` und `/pl/`. Die Dateien werden aus `index.html` erzeugt:

```
node scripts/build-home-locales.mjs
```

Bereits getrennte deutsche und englische Seiten, zum Beispiel `/preise` und
`/pricing`, behalten ihre vorhandenen hreflang-Verknüpfungen.
