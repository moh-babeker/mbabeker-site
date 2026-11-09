/**
 * خطوة البناء على Vercel
 * تجمع ملفات المشاريع والمقالات والصفحات (كل مدخل في ملف مستقل تكتبه لوحة التحكم)
 * في فهارس خفيفة تقرؤها واجهة الموقع:
 *   content/_index/projects.json
 *   content/_index/articles.json
 *   content/_index/pages.json
 * لا تحتاج أي حزم خارجية — Node فقط.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const OUT = path.join(CONTENT, '_index');
const LOCALES = ['ar', 'en'];

// حقول ثقيلة لا تدخل الفهرس (تُقرأ من ملف المدخل نفسه عند فتح صفحته)
const HEAVY_FIELDS = ['body', 'gallery'];

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** يقرأ ملف مدخل بصيغة i18n (مفاتيح ar/en) أو صيغة مسطحة، ويعيد نسخة لكل لغة */
function readEntry(file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const hasLocales = LOCALES.some(l => raw && typeof raw[l] === 'object' && !Array.isArray(raw[l]));
  const base = hasLocales ? (raw.ar || {}) : raw;
  const localized = {};
  for (const l of LOCALES) {
    const own = hasLocales ? (raw[l] || {}) : {};
    const merged = { ...base };
    // القيمة الإنجليزية تُستعمل فقط إن لم تكن فارغة، وإلا يبقى النص العربي احتياطاً
    for (const [k, v] of Object.entries(own)) {
      if (v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)) merged[k] = v;
    }
    localized[l] = merged;
  }
  return localized;
}

function buildCollection(name, { sort }) {
  const dir = path.join(CONTENT, name);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const list = [];
  const seen = new Set();

  for (const f of files) {
    let entry;
    try {
      entry = readEntry(path.join(dir, f));
    } catch (e) {
      console.warn(`⚠️  تخطي ${name}/${f}: JSON غير صالح (${e.message})`);
      continue;
    }
    const ar = entry.ar;
    if (ar.published === false) continue; // المسودات لا تظهر في الموقع

    let slug = slugify(ar.slug) || slugify(entry.en.title) || slugify(path.basename(f, '.json')) || ar.legacy_id;
    if (!slug) slug = 'item-' + list.length;
    while (seen.has(slug)) slug += '-2';
    seen.add(slug);

    const item = { slug, file: f, ar: {}, en: {} };
    for (const l of LOCALES) {
      for (const [k, v] of Object.entries(entry[l])) {
        if (!HEAVY_FIELDS.includes(k) && k !== 'slug') item[l][k] = v;
      }
    }
    list.push(item);
  }
  list.sort(sort);
  return list;
}

const num = v => (v === '' || v === undefined || v === null || isNaN(Number(v))) ? 9999 : Number(v);

fs.mkdirSync(OUT, { recursive: true });

const projects = buildCollection('projects', {
  sort: (a, b) => num(a.ar.order) - num(b.ar.order) || String(b.ar.year || '').localeCompare(String(a.ar.year || ''))
});
const articles = buildCollection('articles', {
  sort: (a, b) => String(b.ar.date || '').localeCompare(String(a.ar.date || ''))
});
const pages = buildCollection('pages', {
  sort: (a, b) => num(a.ar.menu_order) - num(b.ar.menu_order)
});

fs.writeFileSync(path.join(OUT, 'projects.json'), JSON.stringify(projects));
fs.writeFileSync(path.join(OUT, 'articles.json'), JSON.stringify(articles));
fs.writeFileSync(path.join(OUT, 'pages.json'), JSON.stringify(pages));

// خريطة الموقع لمحركات البحث
const SITE = 'https://mbabeker.com';
const urls = ['/', ...(articles.length ? ['/articles'] : []),
  ...projects.map(p => '/projects/' + p.slug),
  ...articles.map(a => '/articles/' + a.slug),
  ...pages.map(p => '/' + p.slug)];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join('\n') + '\n</urlset>\n');

console.log(`✅ تم البناء: ${projects.length} مشروع، ${articles.length} مقال، ${pages.length} صفحة`);
