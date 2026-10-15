#!/usr/bin/env node
/**
 * Builds the public privacy policy and terms pages (the URLs the app stores ask for) from the same
 * texts the app shows: src/legal/<lang>.json → legal-site/. Deploy with Firebase Hosting:
 *   npm run legal:build && npx firebase-tools deploy --only hosting
 * English lives at /privacy.html and /terms.html, other languages under /<lang>/.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'legal-site');
const LANGS = { en: 'English', tr: 'Türkçe', de: 'Deutsch', es: 'Español', fr: 'Français' };
const KINDS = ['privacy', 'terms'];

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const href = (lang, kind) => (lang === 'en' ? `/${kind}.html` : `/${lang}/${kind}.html`);
const linkEmails = (s) => s.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, (m) => `<a href="mailto:${m}">${m}</a>`);

const STYLE = `
:root{--ink:#1E1240;--muted:#5B4F7A;--bg:#F3EFFF;--card:#FFFFFF;--accent:#6C3BFF;--line:#E4DCFF}
@media (prefers-color-scheme:dark){:root{--ink:#F4F0FF;--muted:#B9AEDB;--bg:#150C2B;--card:#231843;--accent:#9B7BFF;--line:#33265E}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:760px;margin:0 auto;padding:32px 20px 64px}
.card{background:var(--card);border:2px solid var(--line);border-radius:20px;padding:28px 24px}
h1{font-size:28px;line-height:1.2;margin:0 0 4px}h2{font-size:19px;margin:28px 0 8px}
.muted{color:var(--muted);font-size:14px}a{color:var(--accent)}
nav{display:flex;flex-wrap:wrap;gap:8px 16px;margin-bottom:20px;font-size:14px}
nav a[aria-current]{font-weight:700;text-decoration:none}
.brand{font-weight:800;font-size:20px;margin-bottom:16px;letter-spacing:-.3px}`;

function page(lang, title, body, nav) {
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} · Timegami</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<div class="brand">Timegami</div>
${nav}
<div class="card">
${body}
</div>
</main>
</body>
</html>
`;
}

function languageNav(kind, current) {
  const links = Object.entries(LANGS).map(([lang, name]) =>
    `<a href="${href(lang, kind)}" hreflang="${lang}"${lang === current ? ' aria-current="page"' : ''}>${name}</a>`,
  );
  return `<nav aria-label="Language">${links.join('')}</nav>`;
}

function documentBody(doc) {
  const sections = doc.sections
    .map((s) => `<h2>${escape(s.heading)}</h2>\n${s.paragraphs.map((p) => `<p>${linkEmails(escape(p))}</p>`).join('\n')}`)
    .join('\n');
  return `<h1>${escape(doc.title)}</h1>\n<p class="muted">${escape(doc.updated)}</p>\n<p>${linkEmails(escape(doc.intro))}</p>\n${sections}`;
}

fs.rmSync(OUT, { recursive: true, force: true });
for (const lang of Object.keys(LANGS)) {
  const texts = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'legal', `${lang}.json`), 'utf8'));
  for (const kind of KINDS) {
    const file = path.join(OUT, href(lang, kind));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, page(lang, texts[kind].title, documentBody(texts[kind]), languageNav(kind, lang)));
  }
}

const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'legal', 'en.json'), 'utf8'));
const index = Object.entries(LANGS)
  .map(([lang, name]) => {
    const t = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'legal', `${lang}.json`), 'utf8'));
    return `<p><strong>${name}</strong> · <a href="${href(lang, 'privacy')}">${escape(t.privacy.title)}</a> · <a href="${href(lang, 'terms')}">${escape(t.terms.title)}</a></p>`;
  })
  .join('\n');
fs.writeFileSync(path.join(OUT, 'index.html'), page('en', en.privacy.title, `<h1>Timegami</h1>\n${index}`, ''));
console.log(`Legal pages written to ${path.relative(ROOT, OUT)}/`);
