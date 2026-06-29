# ventari.eu – Website

Statische Website für [ventari.eu](https://ventari.eu), gehostet auf **Cloudflare Pages**.

## Struktur

```
/                          → Homepage (DE/EN bilingual)
/preise.html               → Preisseite (DE)
/pricing.html              → Pricing page (EN)
/sitemap.xml
/robots.txt
/worker.js                 → Cloudflare Worker (Kontaktformular via Resend)

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

1. **Resend API Key** neu generieren → in `worker.js` eintragen
2. **Cloudflare Worker** deployen → Worker-URL in `index.html` bei `YOUR_SUBDOMAIN` eintragen
3. **Resend Domain** `ventari.eu` verifizieren (SPF/DKIM)
4. Dieses Repo als **Cloudflare Pages** Projekt verbinden
5. Custom Domain `ventari.eu` in Cloudflare Pages eintragen

## Deployment

Cloudflare Pages deployed automatisch bei jedem Push auf `main`.

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

Die Startseite wechselt DE, EN und PL derzeit clientseitig auf derselben URL.
Korrektes hreflang für diese drei Varianten benötigt getrennte statische URLs
wie `/de/`, `/en/` und `/pl/`. Dieser Umbau ist für einen eigenen Durchgang
vorgesehen, weil dafür drei eigenständig auslieferbare HTML-Versionen und eine
klare Weiterleitungsstrategie nötig sind.

Bereits getrennte deutsche und englische Seiten, zum Beispiel `/preise` und
`/pricing`, behalten ihre vorhandenen hreflang-Verknüpfungen.
