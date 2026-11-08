/* =====================================================================
   أدوات مشتركة لصفحات الموقع (المشروع، المقال، الصفحة المستقلة)
   ===================================================================== */
const Site = (() => {
  const LOCALES = ['ar', 'en'];

  // اللغة: اختيار الزائر المحفوظ أولاً، وإلا لغة المتصفح
  function getInitialLang() {
    try {
      const saved = localStorage.getItem('siteLang');
      if (saved === 'ar' || saved === 'en') return saved;
    } catch (e) {}
    const browserLang = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
    return browserLang.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }

  function rememberLang(lang) {
    try { localStorage.setItem('siteLang', lang); } catch (e) {}
  }

  function fixImgUrl(url) {
    if (!url) return '';
    if (/^https?:\/\//.test(url)) return url;
    let p = url.startsWith('/') ? url : '/' + url;
    if (!p.startsWith('/public/')) p = '/public' + p;
    try { p = decodeURI(p); } catch (e) {}
    return encodeURI(p);
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /** يدمج ملف مدخل i18n ({ar:{...}, en:{...}}) في كائن واحد للغة المطلوبة،
      مع الرجوع للعربية عند غياب الترجمة */
  function localize(raw, lang) {
    if (!raw) return {};
    const hasLocales = LOCALES.some(l => raw[l] && typeof raw[l] === 'object' && !Array.isArray(raw[l]));
    if (!hasLocales) return raw;
    const out = { ...(raw.ar || {}) };
    const own = raw[lang] || {};
    for (const [k, v] of Object.entries(own)) {
      if (v !== '' && v != null && !(Array.isArray(v) && v.length === 0)) out[k] = v;
    }
    // تعليقات معرض الصور: نأخذ الصور من العربية والتعليق من لغة الزائر إن وُجد
    if (Array.isArray(raw.ar && raw.ar.gallery) && lang !== 'ar' && Array.isArray(own.gallery)) {
      out.gallery = raw.ar.gallery.map((g, i) => ({ ...g, caption: (own.gallery[i] && own.gallery[i].caption) || g.caption }));
    }
    return out;
  }

  // الكلمة الأولى في عنوان الصورة تحدد حجمها/موضعها، وما بعدها يصبح تعليقاً
  const IMG_LAYOUTS = {
    wide: 'img-wide', full: 'img-full', half: 'img-half', small: 'img-small',
    right: 'img-end', left: 'img-start', start: 'img-start', end: 'img-end',
    'عريض': 'img-wide', 'كامل': 'img-full', 'نصف': 'img-half', 'صغير': 'img-small',
    'يمين': 'img-start', 'يسار': 'img-end'
  };

  function renderRichText(md) {
    if (!md) return '';
    if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
      return `<p style="white-space:pre-line">${esc(md)}</p>`;
    }
    const renderer = new marked.Renderer();
    renderer.image = function (href, title, text) {
      const words = String(title || '').trim().split(/\s+/).filter(Boolean);
      const layout = IMG_LAYOUTS[(words[0] || '').toLowerCase()];
      if (layout) words.shift();
      const caption = words.join(' ');
      return `<figure class="${layout || 'img-wide'}">` +
        `<img src="${esc(fixImgUrl(href))}" alt="${esc(text)}" loading="lazy">` +
        (caption ? `<figcaption>${esc(caption)}</figcaption>` : '') +
        `</figure>`;
    };
    const html = marked.parse(String(md), { renderer, breaks: true, gfm: true });
    return DOMPurify.sanitize(html, { ADD_ATTR: ['loading', 'target'] });
  }

  function setMeta(title, description) {
    document.title = title + ' | MOHAMMED BABEKER';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = description || title;
  }

  function applyDir(lang) {
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
    const on = 'px-2.5 py-1 rounded-lg bg-sky-500 text-white transition-all';
    const off = 'px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition-all';
    const en = document.getElementById('langEnBtn');
    const ar = document.getElementById('langArBtn');
    if (en) en.className = lang === 'en' ? on : off;
    if (ar) ar.className = lang === 'ar' ? on : off;
    const back = document.getElementById('txt-back');
    if (back) back.innerText = lang === 'ar' ? '← العودة للرئيسية' : '← Back to Home';
  }

  function formatDate(d, lang) {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date)) return d;
    return date.toLocaleDateString(lang === 'ar' ? 'ar-u-nu-latn-ca-gregory' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function notFoundHTML(lang, what) {
    const ar = lang === 'ar';
    return `<div class="text-center py-24">
      <p class="text-5xl font-black text-slate-700 mb-4">404</p>
      <p class="text-slate-300 mb-6">${ar ? `لم نعثر على ${what.ar}.` : `We could not find this ${what.en}.`}</p>
      <a href="/" class="px-5 py-2 rounded-full bg-sky-500 text-white text-xs font-extrabold hover:bg-sky-400 transition-all">${ar ? 'العودة للرئيسية' : 'Back to Home'}</a>
    </div>`;
  }

  async function getJSON(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(url + ' → HTTP ' + res.status);
    return res.json();
  }

  return { getInitialLang, rememberLang, fixImgUrl, esc, localize, renderRichText, setMeta, applyDir, formatDate, notFoundHTML, getJSON };
})();
