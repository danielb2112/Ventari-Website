import fs from 'node:fs';
import vm from 'node:vm';

const SITE = 'https://ventari.eu';
const sourcePath = 'index.html';
const source = fs.readFileSync(sourcePath, 'utf8');

const match = source.match(/const T = ([\s\S]*?);\n\n(?:const HOME_LANG_BY_PATH|let lang)/);
if (!match) {
  throw new Error('Could not find homepage translation object.');
}

const context = {};
vm.createContext(context);
vm.runInContext(`globalThis.T = ${match[1]};`, context);
const T = context.T;

const meta = {
  de: {
    path: '/',
    title: 'Ventari - KI-Automatisierung & Compliance für Unternehmen',
    description: 'Ventari hilft Unternehmen, KI sicher und produktiv einzusetzen: Strategie, Automatisierung, Integration und EU-AI-Act-Compliance aus einer Hand.',
    keywords: 'KI Beratung, AI Automation, EU AI Act Compliance, DSGVO KI, AI Consulting Deutschland, Prozessautomatisierung, LLM Integration, Cloud AWS Azure, n8n Make Automation',
  },
  en: {
    path: '/en/',
    title: 'Ventari - AI Automation & Compliance for SMEs',
    description: 'Ventari helps SMEs use AI safely and productively: strategy, automation, integration and EU AI Act compliance from one specialised studio.',
    keywords: 'AI consulting, AI automation, EU AI Act compliance, GDPR AI, SME AI consulting, process automation, LLM integration, cloud AWS Azure, n8n Make automation',
  },
  pl: {
    path: '/pl/',
    title: 'Ventari - Automatyzacja AI i compliance dla firm',
    description: 'Ventari pomaga firmom bezpiecznie i produktywnie wdrażać AI: strategia, automatyzacja, integracje i zgodność z EU AI Act.',
    keywords: 'doradztwo AI, automatyzacja AI, EU AI Act compliance, GDPR AI, automatyzacja procesów, integracja LLM, chmura AWS Azure, n8n Make',
  },
};

const alternateTags = [
  `<link rel="alternate" hreflang="de" href="${SITE}/">`,
  `<link rel="alternate" hreflang="en" href="${SITE}/en/">`,
  `<link rel="alternate" hreflang="pl" href="${SITE}/pl/">`,
  `<link rel="alternate" hreflang="x-default" href="${SITE}/">`,
].join('\n  ');

const stripTags = value => String(value)
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<[^>]*>/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const escapeAttr = value => String(value)
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const escapeRegExp = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function replaceMeta(html, lang) {
  const data = meta[lang];
  const url = `${SITE}${data.path}`;
  let out = html;
  out = out.replace(/<html lang="[^"]+"(?: data-page-lang="[^"]+")?>/, `<html lang="${lang}" data-page-lang="${lang}">`);
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeAttr(data.title)}</title>`);
  out = out.replace(/<meta name="description" content="[^"]*"\/?>/, `<meta name="description" content="${escapeAttr(data.description)}"/>`);
  out = out.replace(/<meta name="keywords" content="[^"]*"\/?>/, `<meta name="keywords" content="${escapeAttr(data.keywords)}"/>`);
  out = out.replace(/<link rel="canonical" href="[^"]+"\/?>/, `<link rel="canonical" href="${url}">`);
  out = out.replace(/(?:\s*<link rel="alternate" hreflang="(?:de|en|pl|x-default)" href="[^"]+"\/?>)+/, '');
  out = out.replace(/(<link rel="canonical" href="[^"]+">)/, `$1\n  ${alternateTags}`);
  out = out.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeAttr(data.title)}">`);
  out = out.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeAttr(data.description)}">`);
  out = out.replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`);
  out = out.replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escapeAttr(data.title)}">`);
  out = out.replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escapeAttr(data.description)}">`);
  return out;
}

function replaceBodyTranslations(html, lang) {
  const t = T[lang] || T.de;
  let out = html;
  Object.entries(t).forEach(([key, value]) => {
    const keyPattern = escapeRegExp(key);
    const tagPattern = new RegExp(`(<([a-zA-Z0-9]+)\\b[^>]*\\bdata-i18n="${keyPattern}"[^>]*>)([\\s\\S]*?)(<\\/\\2>)`, 'g');
    out = out.replace(tagPattern, `$1${value}$4`);

    const placeholderPattern = new RegExp(`(<(?:input|textarea)\\b(?=[^>]*\\bdata-i18n-placeholder="${keyPattern}")[^>]*\\bplaceholder=")[^"]*(")`, 'g');
    out = out.replace(placeholderPattern, `$1${escapeAttr(value)}$2`);
  });

  out = out.replace(/<([a-zA-Z0-9]+)\b([^>]*\bdata-href-de="([^"]+)"[^>]*\bdata-href-en="([^"]+)"[^>]*)(>)/g, (full, tag, attrs, deHref, enHref, close) => {
    const plMatch = attrs.match(/\bdata-href-pl="([^"]+)"/);
    const href = lang === 'de' ? deHref : lang === 'pl' ? (plMatch?.[1] || enHref) : enHref;
    return `<${tag}${attrs.replace(/\bhref="[^"]*"/, `href="${href}"`)}${close}`;
  });
  out = out.replace(/<button type="button" class="lang-btn(?: active)?" data-lang="(de|en|pl)"/g, (full, buttonLang) => {
    const active = buttonLang === lang ? ' active' : '';
    return `<button type="button" class="lang-btn${active}" data-lang="${buttonLang}"`;
  });
  return out;
}

function replaceFaqSchema(html, lang) {
  const t = T[lang] || T.de;
  const mainEntity = [1, 2, 3, 4, 5, 6].map(index => ({
    '@type': 'Question',
    name: stripTags(t[`faq.${index}.q`]),
    acceptedAnswer: {
      '@type': 'Answer',
      text: stripTags(t[`faq.${index}.a`]),
    },
  }));
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  };
  return html.replace(
    /<script type="application\/ld\+json" data-schema="faq">[\s\S]*?<\/script>/,
    `<script type="application/ld+json" data-schema="faq">\n${JSON.stringify(schema, null, 2)}\n</script>`,
  );
}

function build(lang) {
  let html = source;
  html = replaceMeta(html, lang);
  html = replaceBodyTranslations(html, lang);
  html = replaceFaqSchema(html, lang);
  return html;
}

for (const lang of ['de', 'en', 'pl']) {
  const html = build(lang);
  const outputPath = lang === 'de' ? 'index.html' : `${lang}/index.html`;
  fs.mkdirSync(outputPath.split('/').slice(0, -1).join('/') || '.', { recursive: true });
  fs.writeFileSync(outputPath, html);
}

console.log('Homepage locale variants written: /, /en/, /pl/');
