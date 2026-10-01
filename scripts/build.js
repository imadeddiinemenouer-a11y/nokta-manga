/* ============================================================
   Alpha Comix — سكريبت البناء
   يولّد صفحات HTML ثابتة من Supabase
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
function baseTemplate({ title, description, keywords, canonical, ogImage, content, schema }) {
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
</head>
<body>
<header style="background:rgba(8,8,12,.95);border-bottom:1px solid rgba(201,169,97,.2);padding:14px 20px;position:sticky;top:0;z-index:50;backdrop-filter:blur(20px)">
<div style="max-width:1320px;margin:auto;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
<a href="/" style="display:flex;align-items:center;gap:10px;text-decoration:none">
<img src="/logo.png" alt="${SITE_NAME}" style="width:50px;height:50px;border-radius:50%;border:2px solid #c9a961;background:#000">
<span style="font-family:Lalezar,Cairo;font-size:1.4rem;background:linear-gradient(135deg,#e0c88a,#c9a961,#8b6f2f);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:1px">ALPHA COMIX</span>
</a>
<nav style="margin-inline-start:auto;display:flex;gap:8px;flex-wrap:wrap">
<a href="/" style="padding:8px 16px;color:#a8a49a;text-decoration:none;font-weight:700;font-size:.85rem;border-radius:3px">الرئيسية</a>
<a href="/comics.html" style="padding:8px 16px;color:#a8a49a;text-decoration:none;font-weight:700;font-size:.85rem;border-radius:3px">الكوميكس</a>
<a href="/novels.html" style="padding:8px 16px;color:#a8a49a;text-decoration:none;font-weight:700;font-size:.85rem;border-radius:3px">الروايات</a>
<a href="/teams.html" style="padding:8px 16px;color:#a8a49a;text-decoration:none;font-weight:700;font-size:.85rem;border-radius:3px">الفرق</a>
</nav>
</div>
</header>
<main style="max-width:1320px;margin:auto;padding:30px 20px 80px">
${content}
</main>
<footer style="text-align:center;padding:40px 20px;color:#6b6860;font-size:.8rem;border-top:1px solid rgba(201,169,97,.15);margin-top:60px">
<img src="/logo.png" alt="${SITE_NAME}" style="width:80px;height:80px;border-radius:50%;border:2px solid #c9a961;margin:0 auto 16px;display:block;background:#000">
<p>© 2025 ${SITE_NAME} — جميع الحقوق محفوظة</p>
</footer>
<script>
function copyText(text, btn) {
  const originalText = btn.textContent;
  function showSuccess() {
    btn.textContent = '✅ تم';
    btn.style.background = 'linear-gradient(135deg,#16a34a,#065f46)';
    btn.style.color = '#fff';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = 'linear-gradient(135deg,#c9a961,#8b6f2f)';
      btn.style.color = '#1a1200';
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
  ta.focus();
  ta.select();
  try { if (document.execCommand('copy')) cb(); } catch (e) { alert('انسخ: ' + text); }
  document.body.removeChild(ta);
}
</script>
</body>
</html>`;
}

// ============ بطاقة عمل ============
function workCardHTML(w) {
  const url = `/work/${slugify(w.title)}-${String(w.id).slice(0, 8)}.html`;
  return `<a href="${url}" style="text-decoration:none;color:inherit">
    <div style="background:linear-gradient(135deg,#12121a,#1a1a24);border:1px solid rgba(201,169,97,.15);border-radius:4px;overflow:hidden">
      <div style="aspect-ratio:2/3;position:relative;background:#1a1a24;display:flex;align-items:center;justify-content:center;font-size:2.5rem">
        ${w.cover_url ? `<img src="${esc(w.cover_url)}" alt="${esc(w.title)}" style="width:100%;height:100%;object-fit:cover">` : '📖'}
        <span style="position:absolute;bottom:10px;inset-inline-end:10px;background:linear-gradient(135deg,#e0c88a,#8b6f2f);color:#1a1200;font-size:.6rem;padding:4px 10px;font-weight:900;text-transform:uppercase;border-radius:2px">${esc(w.type)}</span>
      </div>
      <div style="padding:12px">
        <h3 style="font-size:.85rem;color:#e0c88a;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(w.title)}</h3>
      </div>
    </div>
  </a>`;
}

// ============ Supabase ============
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
    "publisher": { "@type": "Organization", "name": SITE_NAME, "url": SITE_URL }
  };

  const chaptersHTML = chapters.length
    ? chapters.map(c => `<a href="/read/${c.id}.html" style="display:flex;align-items:center;gap:14px;padding:14px 18px;background:rgba(8,8,12,.4);border:1px solid rgba(201,169,97,.15);border-radius:3px;margin-bottom:8px;text-decoration:none;color:inherit">
        <span style="font-weight:900;color:#e0c88a;min-width:80px">الفصل ${c.number}</span>
        <span style="color:#a8a49a;flex:1;font-size:.85rem">${esc(c.title || '')}</span>
        <span style="font-size:.7rem;color:${c.is_locked ? '#ef3f56' : '#22c55e'}">${c.is_locked ? '🔒 مقفل' : '🆓 مجاني'}</span>
      </a>`).join('')
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
      <p style="font-size:.82rem;color:#6b6860;margin-bottom:14px">📑 عدد الفصول: <b style="color:#e0c88a">${chapters.length}</b></p>
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
      <div style="display:flex;align-items:center;gap:10px;background:rgba(8,8,12,.5);border:1px solid rgba(201,169,97,.2);border-radius:3px;padding:10px 12px;flex-wrap:wrap">
        <span style="font-size:.7rem;font-weight:900;color:#c9a961;min-width:100px">💻 كود HTML</span>
        <code style="flex:1;color:#a8a49a;font-size:.72rem;font-family:'Courier New',monospace;word-break:break-all;direction:ltr;text-align:left">${esc('<a href="' + fullUrl + '">' + w.title + '</a>')}</code>
        <button onclick="copyText('&lt;a href=&quot;${fullUrl.replace(/'/g, "\\'")}&quot;&gt;${w.title.replace(/'/g, "\\'")}&lt;/a&gt;', this)" style="background:linear-gradient(135deg,#c9a961,#8b6f2f);color:#1a1200;border:0;padding:6px 14px;border-radius:2px;font-weight:900;font-size:.7rem;cursor:pointer">📋 نسخ</button>
      </div>
    </div>
  </div>

  <h2 style="font-family:Lalezar,Cairo;font-weight:400;font-size:1.5rem;color:#e0c88a;margin:32px 0 20px;padding-bottom:12px;border-bottom:1px solid rgba(201,169,97,.2)">📑 الفصول (${chapters.length})</h2>
  ${chaptersHTML}
  `;

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

// ============ Main ============
async function main() {
  console.log('🚀 بدء البناء...\n');
  const config = loadConfig();
  console.log('✅ config.js محمّل\n');

  const works = await sbFetch(config.url, config.key, 'works', 'published=eq.true&select=*&order=updated_at.desc');
  console.log(`📚 ${works.length} عمل\n`);

  const chapters = await sbFetch(config.url, config.key, 'chapters', 'published=eq.true&select=id,work_id,number,title,is_locked&order=number.asc');
  console.log(`📖 ${chapters.length} فصل\n`);

  const workDir = path.join(ROOT, 'work');
  if (!fs.existsSync(workDir)) fs.mkdirSync(workDir, { recursive: true });
  fs.readdirSync(workDir).filter(f => f.endsWith('.html')).forEach(f => fs.unlinkSync(path.join(workDir, f)));

  let count = 0;
  for (const w of works) {
    try {
      const wc = chapters.filter(c => c.work_id === w.id);
      const { filename, html } = generateWorkPage(w, wc);
      fs.writeFileSync(path.join(workDir, filename), html);
      count++;
      console.log(`✅ ${filename}`);
    } catch (e) {
      console.error(`❌ ${w.title}: ${e.message}`);
    }
  }

  const homeContent = `
    <h1 style="font-family:Lalezar,Cairo;font-weight:400;font-size:2.5rem;color:#e0c88a;text-align:center;margin-bottom:16px">مرحباً بك في ${SITE_NAME}</h1>
    <p style="text-align:center;color:#a8a49a;margin-bottom:40px">${SITE_DESC}</p>
    <h2 style="font-family:Lalezar,Cairo;font-weight:400;font-size:1.6rem;color:#e0c88a;margin:30px 0 20px">🔥 أحدث الأعمال</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px">
      ${works.slice(0, 20).map(workCardHTML).join('')}
    </div>
  `;
  fs.writeFileSync(path.join(ROOT, 'home.html'), baseTemplate({
    title: `${SITE_NAME} | ${SITE_DESC}`,
    description: SITE_DESC,
    keywords: 'مانهوا, مانجا, روايات, عربي, قراءة اونلاين, Alpha Comix',
    canonical: SITE_URL + '/',
    content: homeContent
  }));

  const today = new Date().toISOString().split('T')[0];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  ${works.map(w => `<url><loc>${SITE_URL}/work/${slugify(w.title)}-${String(w.id).slice(0, 8)}.html</loc><lastmod>${(w.updated_at || today).split('T')[0]}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join('\n  ')}
</urlset>`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);

  console.log(`\n🎉 تم إنشاء ${count} صفحة عمل + الصفحة الرئيسية`);
  console.log(`🗺️  sitemap.xml محدّث`);
}

main().catch(e => {
  console.error('💥 خطأ:', e.message);
  process.exit(1);
});