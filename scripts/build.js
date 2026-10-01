/* ============================================================
   Alpha Comix — سكريبت البناء الكامل v2
   يولّد:
   - صفحات SEO لكل عمل
   - صفحات SEO لكل فصل
   - صفحات Comics / Novels / Teams
   - home.html
   - sitemap.xml كامل
   ============================================================ */

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://comixalpha.dpdns.org';
const SITE_NAME = 'Alpha Comix';
const SITE_DESC = 'منصة عربية احترافية لقراءة المانهوا والمانجا والروايات';
const ROOT = path.join(__dirname, '..');

// ============ تحميل config.js ============
function loadConfig() {
  const cfgPath = path.join(ROOT, 'config.js');
  if (!fs.existsSync(cfgPath)) {
    console.error('❌ config.js غير موجود');
    process.exit(1);
  }
  const c = fs.readFileSync(cfgPath, 'utf8');
  const url = c.match(/supabaseUrl:\s*['"]([^'"]+)['"]/)?.[1];
  const key = c.match(/supabasePublishableKey:\s*['"]([^'"]+)['"]/)?.[1];
  if (!url || !key) {
    console.error('❌ لم أجد supabaseUrl أو supabasePublishableKey في config.js');
    process.exit(1);
  }
  return { url, key };
}

// ============ أدوات ============
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function slugify(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'work';
}

function timeAgo(d) {
  if (!d) return '';
  const df = (Date.now() - new Date(d).getTime()) / 1000;
  if (df < 60) return 'الآن';
  if (df < 3600) return `منذ ${Math.floor(df/60)} دقيقة`;
  if (df < 86400) return `منذ ${Math.floor(df/3600)} ساعة`;
  if (df < 2592000) return `منذ ${Math.floor(df/86400)} يوم`;
  return new Date(d).toLocaleDateString('ar');
}

// ============ القالب الأساسي ============
function baseTemplate({ title, description, keywords, canonical, ogImage, content, schema, isSPA }) {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<meta name="theme-color" content="#08080c">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${keywords ? `<meta name="keywords" content="${esc(keywords)}">` : ''}
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${esc(canonical)}">
<link rel="icon" type="image/png" href="/logo.png">
<link rel="manifest" href="/manifest.json">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Lalezar&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">

<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(ogImage || SITE_URL + '/logo.png')}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:locale" content="ar_AR">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(ogImage || SITE_URL + '/logo.png')}">

${schema ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>` : ''}

<link rel="stylesheet" href="/styles.css">
</head>
<body>
<header>
<div class="hwrap">
<a class="logo" href="/" title="${SITE_NAME}"><img src="/logo.png" alt="${SITE_NAME}" class="logo-img"></a>
<div class="hacts">
<a class="btn sm" href="/" style="margin-inline-end:8px">🏠 الرئيسية</a>
<a class="btn sm" href="/comics.html">🎨 الكوميكس</a>
<a class="btn sm" href="/novels.html">📖 الروايات</a>
<a class="btn sm" href="/teams.html">🛡️ الفرق</a>
</div>
</div>
</header>
<main id="app" style="max-width:1320px;margin:auto;padding:22px 20px 80px">
${content}
</main>
<footer style="text-align:center;padding:40px 20px;color:#6b6860;font-size:.8rem;border-top:1px solid rgba(201,169,97,.15);margin-top:60px">
<img src="/logo.png" alt="${SITE_NAME}" style="width:80px;height:80px;border-radius:50%;border:2px solid #c9a961;margin:0 auto 16px;display:block;background:#000">
<p>© 2025 ${SITE_NAME} — جميع الحقوق محفوظة</p>
</footer>
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}
</script>
</body>
</html>`;
}

// ============ بطاقة عمل ============
function workCardHTML(w) {
  const url = `/work/${slugify(w.title)}-${String(w.id).slice(0, 8)}.html`;
  return `<a href="${url}" style="text-decoration:none;color:inherit">
    <div style="background:linear-gradient(135deg,#12121a,#1a1a24);border:1px solid rgba(201,169,97,.15);border-radius:4px;overflow:hidden;transition:all .3s">
      <div style="aspect-ratio:2/3;position:relative;background:#1a1a24;display:flex;align-items:center;justify-content:center;font-size:2.5rem">
        ${w.cover_url ? `<img src="${esc(w.cover_url)}" alt="${esc(w.title)}" style="width:100%;height:100%;object-fit:cover">` : '📖'}
        <span style="position:absolute;bottom:10px;inset-inline-end:10px;background:linear-gradient(135deg,#e0c88a,#8b6f2f);color:#1a1200;font-size:.6rem;padding:4px 10px;font-weight:900;text-transform:uppercase;border-radius:2px">${esc(w.type)}</span>
        <span style="position:absolute;top:10px;inset-inline-start:10px;background:linear-gradient(135deg,#ef3f56,#b91c37);color:#fff;font-size:.6rem;padding:4px 10px;font-weight:900;border-radius:2px">${esc(w.age_rating || '13+')}</span>
      </div>
      <div style="padding:12px">
        <h3 style="font-size:.85rem;color:#e0c88a;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(w.title)}</h3>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${(w.genres || []).slice(0, 2).map(g => `<span style="font-size:.6rem;background:rgba(201,169,97,.08);border:1px solid rgba(201,169,97,.35);color:#c9a961;padding:2px 8px;border-radius:2px;text-transform:uppercase">${esc(g)}</span>`).join('')}
        </div>
      </div>
    </div>
  </a>`;
}

// ============ Supabase fetch ============
async function sbFetch(baseUrl, key, pathname, params = '') {
  const url = `${baseUrl}/rest/v1/${pathname}?${params}`;
  const res = await fetch(url, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Accept': 'application/json'
    }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

// ============ توليد صفحة عمل ============
function generateWorkPage(w, chapters) {
  const slug = slugify(w.title);
  const shortId = String(w.id).slice(0, 8);
  const filename = `${slug}-${shortId}.html`;
  const relativeUrl = `/work/${filename}`;
  const fullUrl = `${SITE_URL}${relativeUrl}`;
  const cover = w.cover_url || `${SITE_URL}/logo.png`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Book",
    "name": w.title,
    "image": cover,
    "description": w.synopsis || '',
    "inLanguage": "ar",
    "genre": (w.genres || []).join(', '),
    "author": { "@type": "Person", "name": w.author || 'غير معروف' },
    "publisher": { "@type": "Organization", "name": SITE_NAME, "url": SITE_URL },
    "numberOfPages": chapters.length
  };

  const chaptersHTML = chapters.length
    ? chapters.map(c => {
        const readUrl = `/read/${c.id}.html`;
        return `<a href="${readUrl}" style="display:flex;align-items:center;gap:14px;padding:14px 18px;background:rgba(8,8,12,.4);border:1px solid rgba(201,169,97,.15);border-radius:3px;margin-bottom:8px;text-decoration:none;color:inherit">
          <span style="font-weight:900;color:#e0c88a;min-width:80px">الفصل ${c.number}</span>
          <span style="color:#a8a49a;flex:1;font-size:.85rem">${esc(c.title || '')}</span>
          <span style="font-size:.7rem;color:${c.is_locked ? '#ef3f56' : '#22c55e'}">${c.is_locked ? '🔒 مقفل' : '🆓 مجاني'}</span>
        </a>`;
      }).join('')
    : '<p style="text-align:center;color:#6b6860;padding:30px">لا توجد فصول بعد</p>';

  const content = `
  <div style="background:linear-gradient(135deg,#12121a,#1a1a24);border:1px solid rgba(201,169,97,.35);border-radius:6px;padding:28px;display:flex;gap:24px;flex-wrap:wrap;margin-bottom:32px">
    <div style="width:170px;height:240px;border-radius:4px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.7),0 0 0 1px #c9a961;background:#1a1a24;display:flex;align-items:center;justify-content:center;font-size:3rem;flex-shrink:0">
      ${w.cover_url ? `<img src="${esc(w.cover_url)}" alt="${esc(w.title)}" style="width:100%;height:100%;object-fit:cover">` : '📖'}
    </div>
    <div style="flex:1;min-width:240px">
      <h1 style="font-family:Lalezar,Cairo;font-weight:400;font-size:2rem;color:#e0c88a;line-height:1.2;margin-bottom:14px">${esc(w.title)}</h1>
      <div style="margin-bottom:14px">
        <span style="display:inline-block;background:linear-gradient(135deg,#e0c88a,#8b6f2f);color:#1a1200;padding:5px 12px;border-radius:2px;font-size:.7rem;font-weight:900;margin-inline-end:6px">${esc(w.type)}</span>
        <span style="display:inline-block;background:linear-gradient(135deg,#16a34a,#065f46);color:#fff;padding:5px 12px;border-radius:2px;font-size:.7rem;font-weight:900;margin-inline-end:6px">${esc(w.status || 'مستمرة')}</span>
        <span style="display:inline-block;background:linear-gradient(135deg,#ef3f56,#b91c37);color:#fff;padding:5px 12px;border-radius:2px;font-size:.7rem;font-weight:900">${esc(w.age_rating || '13+')}</span>
        ${(w.genres || []).map(g => `<span style="display:inline-block;background:rgba(201,169,97,.08);border:1px solid rgba(201,169,97,.35);color:#c9a961;padding:5px 12px;border-radius:2px;font-size:.7rem;font-weight:900;margin-inline-end:6px;margin-top:6px">${esc(g)}</span>`).join('')}
      </div>
      ${w.author ? `<p style="font-size:.82rem;color:#6b6860;margin-bottom:8px">✍️ الكاتب: <b style="color:#e0c88a">${esc(w.author)}</b></p>` : ''}
      <p style="font-size:.82rem;color:#6b6860;margin-bottom:14px">📑 عدد الفصول: <b style="color:#e0c88a">${chapters.length}</b>${w.rating ? ` • ★ ${w.rating}` : ''}</p>
      <p style="color:#a8a49a;line-height:2;font-size:.9rem;margin:14px 0">${esc(w.synopsis || '')}</p>
      <a href="/#/work/${esc(w.id)}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#e0c88a,#c9a961,#8b6f2f);color:#1a1200;font-weight:900;text-decoration:none;border-radius:3px;margin-top:14px;text-transform:uppercase;font-size:.82rem;letter-spacing:1px">اقرأ الآن ←</a>
    </div>
  </div>

  <div style="background:linear-gradient(135deg,rgba(201,169,97,.06),rgba(239,63,86,.03));border:1px solid rgba(201,169,97,.3);border-radius:6px;padding:20px;margin-bottom:28px">
    <h3 style="font-family:Lalezar,Cairo;font-weight:400;font-size:1.15rem;color:#e0c88a;margin-bottom:16px">📋 أدوات النسخ</h3>
    <div style="display:grid;gap:10px">
      <div style="display:flex;align-items:center;gap:10px;background:rgba(8,8,12,.5);border:1px solid rgba(201,169,97,.2);border-radius:3px;padding:10px 12px;flex-wrap:wrap">
        <span style="font-size:.7rem;font-weight:900;color:#c9a961;min-width:100px">🔗 الرابط الكامل</span>
        <code style="flex:1;color:#a8a49a;font-size:.72rem;font-family:'Courier New',monospace;word-break:break-all;direction:ltr;text-align:left">${esc(fullUrl)}</code>
        <button onclick="copyText('${fullUrl.replace(/'/g, "\\'")}', this)" style="background:linear-gradient(135deg,#c9a961,#8b6f2f);color:#1a1200;border:0;padding:6px 14px;border-radius:2px;font-weight:900;font-size:.7rem;cursor:pointer">📋 نسخ</button>
      </div>
      <div style="display:flex;align-items:center;gap:10px;background:rgba(8,8,12,.5);border:1px solid rgba(201,169,97,.2);border-radius:3px;padding:10px 12px;flex-wrap:wrap">
        <span style="font-size:.7rem;font-weight:900;color:#c9a961;min-width:100px">📄 اسم الملف</span>
        <code style="flex:1;color:#a8a49a;font-size:.72rem;font-family:'Courier New',monospace;word-break:break-all;direction:ltr;text-align:left">${esc(filename)}</code>
        <button onclick="copyText('${filename.replace(/'/g, "\\'")}', this)" style="background:linear-gradient(135deg,#c9a961,#8b6f2f);color:#1a1200;border:0;padding:6px 14px;border-radius:2px;font-weight:900;font-size:.7rem;cursor:pointer">📋 نسخ</button>
      </div>
    </div>
  </div>

  <h2 style="font-family:Lalezar,Cairo;font-weight:400;font-size:1.5rem;color:#e0c88a;margin:32px 0 20px;padding-bottom:12px;border-bottom:1px solid rgba(201,169,97,.2)">📑 الفصول (${chapters.length})</h2>
  ${chaptersHTML}

  <script>
  function copyText(text, btn) {
    const originalText = btn.textContent;
    function showSuccess() {
      btn.textContent = '✅ تم';
      btn.style.background = 'linear-gradient(135deg,#16a34a,#065f46)';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = 'linear-gradient(135deg,#c9a961,#8b6f2f)';
      }, 2000);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(showSuccess).catch(() => fallbackCopy(text, showSuccess));
    } else {
      fallbackCopy(text, showSuccess);
    }
  }
  function fallbackCopy(text, cb) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try { if (document.execCommand('copy')) cb(); } catch(e) {}
    document.body.removeChild(ta);
  }
  <\/script>`;

  return {
    filename,
    html: baseTemplate({
      title: `${w.title} — ${w.type} عربي | ${SITE_NAME}`,
      description: (w.synopsis || `${w.title} - ${w.type} على ${SITE_NAME}`).slice(0, 155),
      keywords: [w.title, w.type, ...(w.genres || []), 'مانهوا', 'مانجا', 'عربي'].join(', '),
      canonical: fullUrl,
      ogImage: cover,
      content,
      schema
    })
  };
}

// ============ توليد صفحة فصل ============
function generateChapterPage(ch, work) {
  const filename = `${ch.id}.html`;
  const fullUrl = `${SITE_URL}/read/${filename}`;
  const workUrl = `/work/${slugify(work.title)}-${String(work.id).slice(0, 8)}.html`;
  const cover = work.cover_url || `${SITE_URL}/logo.png`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Chapter",
    "name": `الفصل ${ch.number}${ch.title ? ': ' + ch.title : ''}`,
    "position": ch.number,
    "isPartOf": { "@type": "Book", "name": work.title, "url": workUrl },
    "inLanguage": "ar",
    "url": fullUrl
  };

  const content = `
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;flex-wrap:wrap">
    <a href="${workUrl}" style="text-decoration:none;padding:10px 18px;background:rgba(201,169,97,.1);border:1px solid rgba(201,169,97,.4);border-radius:3px;color:#e0c88a;font-weight:800;font-size:.82rem">← ${esc(work.title)}</a>
    <h1 style="font-family:Lalezar,Cairo;font-weight:400;font-size:1.6rem;color:#e0c88a;margin:0">الفصل ${ch.number}${ch.title ? ': ' + esc(ch.title) : ''}</h1>
  </div>

  <div style="background:linear-gradient(135deg,#12121a,#1a1a24);border:1px solid rgba(201,169,97,.35);border-radius:6px;padding:20px;margin-bottom:24px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
    <img src="${esc(cover)}" alt="${esc(work.title)}" style="width:80px;height:115px;border-radius:3px;object-fit:cover;box-shadow:0 0 0 1px #c9a961">
    <div style="flex:1;min-width:200px">
      <h3 style="color:#e0c88a;font-size:1rem;margin-bottom:8px">${esc(work.title)}</h3>
      <p style="color:#a8a49a;font-size:.85rem">الفصل ${ch.number} ${ch.is_locked ? '• 🔒 مقفل' : '• 🆓 مجاني'}</p>
    </div>
    <a href="/#/read/${ch.id}" style="padding:12px 24px;background:linear-gradient(135deg,#e0c88a,#c9a961,#8b6f2f);color:#1a1200;text-decoration:none;font-weight:900;border-radius:3px;font-size:.82rem">📖 اقرأ الآن</a>
  </div>

  ${ch.kind === 'novel' && ch.content ? `
  <article style="background:linear-gradient(135deg,#12121a,#1a1a24);border:1px solid rgba(201,169,97,.35);border-radius:6px;padding:40px;line-height:2.3;font-size:1.02rem;color:#a8a49a;max-width:800px;margin:auto">
    ${ch.content.split(/\n+/).map(p => `<p style="margin-bottom:20px">${esc(p)}</p>`).join('')}
  </article>` : `
  <div style="text-align:center;padding:40px;background:rgba(8,8,12,.4);border:1px solid rgba(201,169,97,.2);border-radius:6px">
    <p style="color:#a8a49a;margin-bottom:16px">هذا الفصل يحتوي على صور. اضغط على الزر أعلاه للقراءة الكاملة.</p>
  </div>`}

  <div style="display:flex;justify-content:space-between;gap:12px;margin-top:32px;flex-wrap:wrap">
    <a href="${workUrl}" style="flex:1;min-width:200px;padding:14px;text-align:center;background:transparent;border:1px solid #c9a961;color:#c9a961;font-weight:900;border-radius:3px;text-decoration:none;font-size:.85rem;text-transform:uppercase">← كل الفصول</a>
    <a href="/#/read/${ch.id}" style="flex:1;min-width:200px;padding:14px;text-align:center;background:linear-gradient(135deg,#e0c88a,#c9a961,#8b6f2f);color:#1a1200;font-weight:900;border-radius:3px;text-decoration:none;font-size:.85rem;text-transform:uppercase">اقرأ في الموقع ←</a>
  </div>`;

  return {
    filename,
    html: baseTemplate({
      title: `${work.title} — الفصل ${ch.number} | ${SITE_NAME}`,
      description: `اقرأ ${work.title} الفصل ${ch.number} بالعربية على ${SITE_NAME}`.slice(0, 155),
      keywords: [work.title, `الفصل ${ch.number}`, ...(work.genres || []), 'مانهوا', 'مانجا'].join(', '),
      canonical: fullUrl,
      ogImage: cover,
      content,
      schema
    })
  };
}

// ============ صفحة Comics / Novels ============
function generateListPage(kind, works) {
  const filtered = works.filter(w => kind === 'all' ? true : w.kind === kind);
  const title = kind === 'comic' ? 'جميع الكوميكس' : kind === 'novel' ? 'جميع الروايات' : 'جميع الأعمال';
  const filename = kind === 'comic' ? 'comics.html' : kind === 'novel' ? 'novels.html' : 'all.html';

  const content = `
  <h1 style="font-family:Lalezar,Cairo;font-weight:400;font-size:2.2rem;color:#e0c88a;margin-bottom:12px">${title}</h1>
  <p style="color:#a8a49a;margin-bottom:32px">${filtered.length} عمل متاح للقراءة</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px">
    ${filtered.map(workCardHTML).join('') || '<p style="color:#6b6860;text-align:center;padding:40px">لا توجد أعمال بعد</p>'}
  </div>`;

  return {
    filename,
    html: baseTemplate({
      title: `${title} | ${SITE_NAME}`,
      description: `${title} على ${SITE_NAME} — منصة عربية احترافية`,
      keywords: `${title}, مانهوا, مانجا, روايات, عربي`,
      canonical: `${SITE_URL}/${filename}`,
      content
    })
  };
}

// ============ صفحة Teams ============
function generateTeamsPage(teams) {
  const content = `
  <h1 style="font-family:Lalezar,Cairo;font-weight:400;font-size:2.2rem;color:#e0c88a;margin-bottom:12px">🛡️ فرق الترجمة</h1>
  <p style="color:#a8a49a;margin-bottom:32px">${teams.length} فريق</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px">
    ${teams.map(t => `
      <div style="background:linear-gradient(135deg,#12121a,#1a1a24);border:1px solid rgba(201,169,97,.15);border-radius:4px;padding:24px">
        <h3 style="color:#e0c88a;font-size:1.05rem;margin-bottom:14px">🛡️ ${esc(t.name)}</h3>
        <p style="color:#a8a49a;line-height:1.8;font-size:.85rem">${esc(t.description || '')}</p>
        ${t.support_wallet ? `<div style="background:rgba(8,8,12,.6);border:1px dashed rgba(201,169,97,.4);border-radius:3px;padding:14px;word-break:break-all;direction:ltr;text-align:left;color:#c9a961;font-size:.72rem;margin:14px 0;font-family:'Courier New',monospace">${esc(t.support_wallet)}</div>` : ''}
      </div>
    `).join('') || '<p style="color:#6b6860;text-align:center;padding:40px;grid-column:1/-1">لا توجد فرق بعد</p>'}
  </div>`;

  return {
    filename: 'teams.html',
    html: baseTemplate({
      title: `فرق الترجمة | ${SITE_NAME}`,
      description: `فرق الترجمة على ${SITE_NAME}`,
      keywords: 'فرق الترجمة, مانهوا, مانجا',
      canonical: `${SITE_URL}/teams.html`,
      content
    })
  };
}

// ============ Main ============
async function main() {
  console.log('🚀 بدء البناء...\n');

  const config = loadConfig();
  console.log('✅ config.js محمّل\n');

  // جلب البيانات
  const works = await sbFetch(config.url, config.key, 'works', 'published=eq.true&select=*&order=updated_at.desc');
  console.log(`📚 ${works.length} عمل\n`);

  const chapters = await sbFetch(config.url, config.key, 'chapters', 'published=eq.true&select=*&order=number.asc');
  console.log(`📖 ${chapters.length} فصل\n`);

  const teams = await sbFetch(config.url, config.key, 'teams', 'published=eq.true&select=*');
  console.log(`🛡️  ${teams.length} فريق\n`);

  // ============ مجلد /work ============
  const workDir = path.join(ROOT, 'work');
  if (!fs.existsSync(workDir)) fs.mkdirSync(workDir, { recursive: true });
  fs.readdirSync(workDir).filter(f => f.endsWith('.html')).forEach(f => fs.unlinkSync(path.join(workDir, f)));

  // ============ مجلد /read ============
  const readDir = path.join(ROOT, 'read');
  if (!fs.existsSync(readDir)) fs.mkdirSync(readDir, { recursive: true });
  fs.readdirSync(readDir).filter(f => f.endsWith('.html')).forEach(f => fs.unlinkSync(path.join(readDir, f)));

  // ============ توليد صفحات الأعمال ============
  let workCount = 0;
  const workMap = {};
  for (const w of works) {
    try {
      const wc = chapters.filter(c => c.work_id === w.id);
      const { filename, html } = generateWorkPage(w, wc);
      fs.writeFileSync(path.join(workDir, filename), html);
      workMap[w.id] = { filename, work: w };
      workCount++;
      console.log(`✅ work/${filename} (${wc.length} فصل)`);
    } catch (e) {
      console.error(`❌ ${w.title}: ${e.message}`);
    }
  }

  // ============ توليد صفحات الفصول ============
  let readCount = 0;
  for (const c of chapters) {
    try {
      const work = workMap[c.work_id]?.work;
      if (!work) continue;
      const { filename, html } = generateChapterPage(c, work);
      fs.writeFileSync(path.join(readDir, filename), html);
      readCount++;
    } catch (e) {
      console.error(`❌ ${c.id}: ${e.message}`);
    }
  }
  console.log(`\n📖 تم توليد ${readCount} صفحة فصل`);

  // ============ توليد صفحات القوائم ============
  const comicsPage = generateListPage('comic', works);
  fs.writeFileSync(path.join(ROOT, comicsPage.filename), comicsPage.html);
  console.log(`✅ ${comicsPage.filename}`);

  const novelsPage = generateListPage('novel', works);
  fs.writeFileSync(path.join(ROOT, novelsPage.filename), novelsPage.html);
  console.log(`✅ ${novelsPage.filename}`);

  const teamsPage = generateTeamsPage(teams);
  fs.writeFileSync(path.join(ROOT, teamsPage.filename), teamsPage.html);
  console.log(`✅ ${teamsPage.filename}`);

  // ============ home.html ============
  const homeContent = `
    <div style="border:1px solid rgba(201,169,97,.35);border-radius:6px;padding:60px 40px;margin-bottom:32px;background:linear-gradient(135deg,#0a0810 0%,#100815 50%,#0a0a0f 100%)">
      <h1 style="font-family:Lalezar,Cairo;font-weight:400;font-size:2.8rem;color:#e0c88a;margin-bottom:16px;line-height:1.2">اقرأ أحدث <span style="background:linear-gradient(135deg,#ff6b7d,#ef3f56,#b91c37);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent">المانهوا والمانجا</span> بالعربية</h1>
      <p style="color:#a8a49a;margin-bottom:26px;font-size:1rem;line-height:2">${SITE_DESC}</p>
      <a href="/comics.html" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#e0c88a,#c9a961,#8b6f2f);color:#1a1200;font-weight:900;border-radius:3px;text-decoration:none;margin-inline-end:10px;font-size:.85rem;text-transform:uppercase">تصفح الكوميكس</a>
      <a href="/novels.html" style="display:inline-block;padding:14px 28px;background:transparent;color:#c9a961;font-weight:900;border:1px solid #c9a961;border-radius:3px;text-decoration:none;font-size:.85rem;text-transform:uppercase">الروايات</a>
    </div>
    <h2 style="font-family:Lalezar,Cairo;font-weight:400;font-size:1.6rem;color:#e0c88a;margin:30px 0 20px">🔥 أحدث الأعمال</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px">
      ${works.slice(0, 20).map(workCardHTML).join('')}
    </div>`;

  fs.writeFileSync(path.join(ROOT, 'home.html'), baseTemplate({
    title: `${SITE_NAME} | ${SITE_DESC}`,
    description: SITE_DESC,
    keywords: 'مانهوا, مانجا, روايات, عربي, قراءة اونلاين, Alpha Comix',
    canonical: SITE_URL + '/',
    content: homeContent
  }));
  console.log(`✅ home.html`);

  // ============ Sitemap كامل ============
  const today = new Date().toISOString().split('T')[0];
  const urls = [
    { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${SITE_URL}/home.html`, priority: '0.9', changefreq: 'daily' },
    { loc: `${SITE_URL}/comics.html`, priority: '0.9', changefreq: 'daily' },
    { loc: `${SITE_URL}/novels.html`, priority: '0.9', changefreq: 'daily' },
    { loc: `${SITE_URL}/teams.html`, priority: '0.7', changefreq: 'weekly' }
  ];

  for (const w of works) {
    const slug = slugify(w.title);
    const shortId = String(w.id).slice(0, 8);
    urls.push({
      loc: `${SITE_URL}/work/${slug}-${shortId}.html`,
      lastmod: (w.updated_at || today).split('T')[0],
      priority: '0.8',
      changefreq: 'weekly'
    });
  }

  for (const c of chapters) {
    urls.push({
      loc: `${SITE_URL}/read/${c.id}.html`,
      lastmod: (c.created_at || today).split('T')[0],
      priority: '0.6',
      changefreq: 'monthly'
    });
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);
  console.log(`🗺️  sitemap.xml (${urls.length} رابط)`);

  // ============ robots.txt ============
  const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), robots);
  console.log(`🤖 robots.txt`);

  console.log(`\n🎉 تم البناء بنجاح!`);
  console.log(`   - ${workCount} صفحة عمل`);
  console.log(`   - ${readCount} صفحة فصل`);
  console.log(`   - 3 صفحات قوائم`);
  console.log(`   - home.html`);
}

main().catch(e => {
  console.error('💥 خطأ:', e.message);
  console.error(e.stack);
  process.exit(1);
});