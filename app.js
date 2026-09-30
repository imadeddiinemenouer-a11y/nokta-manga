/* ============================================================
   نُقطة مانجا — التطبيق النهائي الكامل
   ============================================================ */
const C = window.NOKTA_CONFIG || {};
const hasConfig = C.supabaseUrl && C.supabasePublishableKey && !C.supabaseUrl.includes('YOUR_') && !C.supabasePublishableKey.includes('YOUR_');
const sb = hasConfig ? supabase.createClient(C.supabaseUrl, C.supabasePublishableKey) : null;
const app = document.querySelector('#app');
let session = null, profile = null, browseWorks = [], libraryTab = 'favorites', readerMode = 'webtoon';
let fState = { types: [], genres: [], ages: [], status: [] };
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

const STATIC_TYPES = ['مانهوا', 'مانجا', 'مانها', 'رواية', 'كوميكس'];
const STATIC_AGES = ['13+', '16+', '18+'];
const STATIC_STATUS = ['مستمرة', 'متوقفة', 'منتهية'];
const STATIC_GENRES = ['أكشن','فانتازيا','رومانسية','غموض','نظام','دراما','مغامرة','مدرسي','شونين','قوى خاصة','ناجٍ','مصاصين','سحر','مملكة','تاريخي','ارتقاء','رياضة','خيال','حياة يومية','جوسي','فنون قتالية','سينين','شوجو','إيسيكاي','ميكا','رعب','نفسي','عسكري','موسيقي'];

/* ===== أدوات ===== */
function toast(m) { const t = $('#toast'); if (!t) return; t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600); }
function go(r, id) { location.hash = id === undefined ? '#/' + r : '#/' + r + '/' + id; }
function toggleMenu() { const s = $('#sidebar'), o = $('#overlay'); if (s) s.classList.toggle('show'); if (o) o.classList.toggle('show'); }
function timeAgo(d) { if (!d) return '—'; const df = (Date.now() - new Date(d).getTime()) / 1000; if (df < 60) return 'الآن'; if (df < 3600) return `منذ ${Math.floor(df/60)} دقيقة`; if (df < 86400) return `منذ ${Math.floor(df/3600)} ساعة`; if (df < 2592000) return `منذ ${Math.floor(df/86400)} يوم`; return new Date(d).toLocaleDateString('ar'); }

/* ===== الوضع الليلي ===== */
function theme() { const l = localStorage.noktaTheme === 'light'; if (l) document.documentElement.setAttribute('data-theme', 'light'); else document.documentElement.removeAttribute('data-theme'); const b = $('#themeBtn'); if (b) b.textContent = l ? '🌙' : '☀️'; }
function toggleTheme() { localStorage.noktaTheme = localStorage.noktaTheme === 'light' ? 'dark' : 'light'; theme(); }
theme();

/* ===== التهيئة ===== */
async function boot() {
  if (!sb) { app.innerHTML = `<div class="panel"><h2>⚙️ إعداد Supabase مطلوب</h2><p style="color:var(--muted);line-height:2;margin-top:10px">انسخ <b>config.example.js</b> إلى <b>config.js</b> واملأ القيم.</p></div>`; return; }
  const r = await sb.auth.getSession(); session = r.data.session;
  await loadProfile();
  sb.auth.onAuthStateChange(async (_, s) => { session = s; await loadProfile(); refreshHeader(); route(); });
  refreshHeader(); route();
}
async function loadProfile() { profile = null; if (session) { const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle(); profile = data; } }
function refreshHeader() {
  if (!sb) return;
  const a = $('#adminBtn'); if (a) a.style.display = profile?.role === 'admin' ? 'flex' : 'none';
  const n = $('#notifBtn'); if (n) n.style.display = session ? 'flex' : 'none';
  const ab = $('#authBtn'); if (ab) { ab.style.background = session ? 'var(--accent)' : ''; ab.style.color = session ? '#1a1200' : ''; }
  const um = $('#userMini'); if (um) um.innerHTML = session ? `<span>👤</span><b>${esc(profile?.username || session.user.email)}</b>` : `<span>👤</span><span>غير مسجل</span>`;
  if (session) { loadBalance(); checkNotifications(); }
}
async function loadBalance() { const { data } = await sb.rpc('get_my_balance'); if (!data || data.error) return; }
async function checkNotifications() { if (!session) return; const { count } = await sb.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('is_read', false); const d = $('#notifDot'); if (d) d.style.display = count > 0 ? 'block' : 'none'; }

/* ===== جلب الأعمال ===== */
async function fetchWorks(kind) { let q = sb.from('works').select('*').eq('published', true).order('updated_at', { ascending: false }); if (kind) q = q.eq('kind', kind); const { data, error } = await q; return error ? [] : data || []; }
async function fetchFavorites() { if (!session) return []; const { data } = await sb.from('favorites').select('work_id'); return (data || []).map(f => f.work_id); }
async function isFavorite(workId) { if (!session) return false; const { data } = await sb.from('favorites').select('*').eq('user_id', session.user.id).eq('work_id', workId).maybeSingle(); return !!data; }

/* ===== بطاقات ===== */
function cardHTML(w, isFav) {
  return `<div class="card" onclick="go('work','${w.id}')">
    <div class="cover" style="background:linear-gradient(140deg,${esc(w.grad_a||'#1a237e')},${esc(w.grad_b||'#4a148c')})">
      ${w.cover_url?`<img src="${esc(w.cover_url)}" alt="${esc(w.title)}" loading="lazy">`:esc(w.emoji||'📖')}
      <span class="age">${esc(w.age_rating||'13+')}</span>
      <span class="type">${esc(w.type)}</span>
      ${isFav?'<span class="fav-badge">❤️</span>':''}
    </div>
    <div class="cinfo">
      <h3>${esc(w.title)}</h3>
      <div class="genres">${(w.genres||[]).slice(0,2).map(g=>`<span class="gtag">${esc(g)}</span>`).join('')}</div>
    </div>
  </div>`;
}
function popularItemHTML(w, i) {
  return `<div class="popular-item" onclick="go('work','${w.id}')">
    <div class="popular-num">${i+1}</div>
    <div class="popular-cover" style="background:linear-gradient(140deg,${esc(w.grad_a||'#1a237e')},${esc(w.grad_b||'#4a148c')})">
      ${w.cover_url?`<img src="${esc(w.cover_url)}" alt="" loading="lazy">`:esc(w.emoji||'📖')}
    </div>
    <div class="popular-info"><h3>${esc(w.title)}</h3><div class="popular-tags">${(w.genres||[]).slice(0,3).map(g=>`<span class="tag">${esc(g)}</span>`).join('')}</div></div>
  </div>`;
}
function releaseCardHTML(w) {
  const sc = w.status==='متوقفة'?'paused':w.status==='منتهية'?'completed':'';
  const chs = []; const t = Math.min(w.chapter_count||4, 4);
  for (let i=t;i>=1;i--) chs.push(`<div class="chapter-mini" onclick="go('work','${w.id}')"><span>الفصل ${i}</span><span class="time">${timeAgo(w.updated_at)}</span></div>`);
  return `<div class="release-card"><div class="release-info"><h3>${esc(w.title)}</h3><div class="release-status ${sc}">${esc(w.status||'مستمرة')}</div><div class="chapters-mini">${chs.join('')}</div></div>
    <div class="release-cover" style="background:linear-gradient(140deg,${esc(w.grad_a||'#1a237e')},${esc(w.grad_b||'#4a148c')})" onclick="go('work','${w.id}')">
      ${w.cover_url?`<img src="${esc(w.cover_url)}" alt="" loading="lazy">`:esc(w.emoji||'📖')}
      <span class="type-badge">${esc(w.type)}</span>
    </div></div>`;
}

/* ===== الصفحة الرئيسية ===== */
async function vHome() {
  const works = await fetchWorks();
  const favs = await fetchFavorites();
  const top = [...works].sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,5);
  const latest = works.slice(0,4);
  const today = works.slice(0,6);
  return `<div class="search-wrap"><div class="search-box" onclick="go('search','')"><span class="search-icon">🔍</span><input placeholder="ابحث عن مانهوا أو مانجا..." readonly></div></div>
  <div class="hero"><h1>الأعمال <span>المميزة</span></h1><p>استكشف مجموعة واسعة من الأعمال المميزة والحصرية على منصتنا</p><button class="btn" onclick="go('comics')">تصفح الكل ←</button></div>
  <div class="sec-title"><span class="line"></span>🔥 الأكثر شعبية</div><div class="popular-list">${top.map((w,i)=>popularItemHTML(w,i)).join('')||'<p style="text-align:center;color:var(--muted);padding:30px">لا توجد أعمال بعد.</p>'}</div>
  <div class="sec-title"><span class="line"></span>📖 أحدث الإصدارات</div><div class="releases-list">${latest.map(releaseHTML).join('')||'<p style="text-align:center;color:var(--muted);padding:30px">لا توجد إصدارات.</p>'}</div>
  <div class="sec-title"><span class="line"></span>⚡ شائع اليوم</div><div class="grid">${today.map(w=>cardHTML(w,favs.includes(w.id))).join('')}</div>`;
}
function releaseHTML(w){return releaseCardHTML(w);}
/* ============================================================
   الجزء الثاني — التصفح والعمل والقارئ والمكتبة والإدارة
   ============================================================ */

/* ===== صفحة التصفح ===== */
async function vBrowse(kind) {
  const works = await fetchWorks(kind);
  const favs = await fetchFavorites();
  browseWorks = works;
  fState = { types: [], genres: [], ages: [], status: [] };

  return `<div class="sec-title"><span class="line"></span>${kind==='comic'?'🎨 جميع الأعمال':'📖 الروايات'}</div>
  <div class="search-wrap"><div class="search-box" onclick="go('search','')"><span class="search-icon">🔍</span><input placeholder="ابحث..." readonly></div></div>
  <div class="filters-row">
    <div class="filter-wrap">
      <button class="filter-select" onclick="toggleDropdown('ddType')">
        <div style="text-align:right"><span class="label">النوع</span><span class="value" id="vType">الكل</span></div><span class="chev">⌄</span>
      </button><div class="dropdown" id="ddType"></div>
    </div>
    <div class="filter-wrap">
      <button class="filter-select" onclick="toggleDropdown('ddAge')">
        <div style="text-align:right"><span class="label">العمر</span><span class="value" id="vAge">الكل</span></div><span class="chev">⌄</span>
      </button><div class="dropdown" id="ddAge"></div>
    </div>
    <div class="filter-wrap filter-full">
      <button class="filter-select" onclick="toggleDropdown('ddStatus')">
        <div style="text-align:right"><span class="label">الحالة</span><span class="value" id="vStatus">الكل</span></div><span class="chev">⌄</span>
      </button><div class="dropdown" id="ddStatus"></div>
    </div>
    <div class="filter-wrap filter-full">
      <button class="filter-select" onclick="toggleDropdown('ddGen')">
        <div style="text-align:right"><span class="label">التصنيفات (اختيار متعدد)</span><span class="value" id="vGen">الكل</span></div><span class="chev">⌄</span>
      </button><div class="dropdown" id="ddGen"></div>
    </div>
  </div>
  <div class="active-chips" id="activeChips"></div>
  <p class="result-count" id="resultCount"></p>
  <div class="grid" id="browseGrid"></div>`;
}

function toggleDropdown(id) {
  const t = document.getElementById(id); if (!t) return;
  const open = t.classList.contains('show');
  $$('.dropdown').forEach(d => d.classList.remove('show'));
  $$('.filter-select').forEach(b => b.classList.remove('active'));
  if (!open) { t.classList.add('show'); const w = t.closest('.filter-wrap'); if (w) { const b = w.querySelector('.filter-select'); if (b) b.classList.add('active'); } buildDropdownContent(id); }
}
document.addEventListener('click', e => { if (!e.target.closest('.filter-wrap')) { $$('.dropdown').forEach(d => d.classList.remove('show')); $$('.filter-select').forEach(b => b.classList.remove('active')); } });

function buildDropdownContent(id) {
  const el = document.getElementById(id); if (!el) return;
  if (id === 'ddType') {
    const fromDB = [...new Set(browseWorks.map(w => w.type).filter(Boolean))];
    const all = [...new Set([...STATIC_TYPES, ...fromDB])];
    el.innerHTML = all.map(t => `<div class="dropdown-item ${fState.types.includes(t)?'checked':''}" onclick="toggleFilter('types','${esc(t)}')"><span class="checkbox"></span><span>${esc(t)}</span></div>`).join('') + `<div class="dropdown-actions"><button onclick="clearFilter('types')">مسح</button><button class="primary" onclick="closeDropdowns()">تم</button></div>`;
  } else if (id === 'ddAge') {
    el.innerHTML = STATIC_AGES.map(a => `<div class="dropdown-item ${fState.ages.includes(a)?'checked':''}" onclick="toggleFilter('ages','${a}')"><span class="checkbox"></span><span>${a}</span></div>`).join('') + `<div class="dropdown-actions"><button onclick="clearFilter('ages')">مسح</button><button class="primary" onclick="closeDropdowns()">تم</button></div>`;
  } else if (id === 'ddStatus') {
    el.innerHTML = STATIC_STATUS.map(s => `<div class="dropdown-item ${fState.status.includes(s)?'checked':''}" onclick="toggleFilter('status','${s}')"><span class="checkbox"></span><span>${s}</span></div>`).join('') + `<div class="dropdown-actions"><button onclick="clearFilter('status')">مسح</button><button class="primary" onclick="closeDropdowns()">تم</button></div>`;
  } else if (id === 'ddGen') {
    const fromDB = [...new Set(browseWorks.flatMap(w => w.genres||[]).filter(Boolean))];
    const all = [...new Set([...STATIC_GENRES, ...fromDB])];
    el.innerHTML = all.map(g => `<div class="dropdown-item ${fState.genres.includes(g)?'checked':''}" onclick="toggleFilter('genres','${esc(g)}')"><span class="checkbox"></span><span>${esc(g)}</span></div>`).join('') + `<div class="dropdown-actions"><button onclick="clearFilter('genres')">مسح</button><button class="primary" onclick="closeDropdowns()">تم</button></div>`;
  }
}
function closeDropdowns() { $$('.dropdown').forEach(d => d.classList.remove('show')); $$('.filter-select').forEach(b => b.classList.remove('active')); }
function toggleFilter(k, v) { const a = fState[k]; const i = a.indexOf(v); if (i>=0) a.splice(i,1); else a.push(v); drawBrowse(); }
function clearFilter(k) { fState[k] = []; drawBrowse(); }
function drawBrowse() {
  const list = browseWorks.filter(w => {
    if (fState.types.length && !fState.types.includes(w.type)) return false;
    if (fState.ages.length && !fState.ages.includes(w.age_rating)) return false;
    if (fState.status.length && !fState.status.includes(w.status)) return false;
    if (fState.genres.length && !fState.genres.some(g => (w.genres||[]).includes(g))) return false;
    return true;
  });
  const set = (id, txt) => { const e = document.getElementById(id); if (e) e.textContent = txt; };
  set('vType', fState.types.length ? fState.types.join('، ') : 'الكل');
  set('vAge', fState.ages.length ? fState.ages.join('، ') : 'الكل');
  set('vStatus', fState.status.length ? fState.status.join('، ') : 'الكل');
  set('vGen', fState.genres.length ? fState.genres.join('، ') : 'الكل');
  const chips = document.getElementById('activeChips');
  if (chips) { const all = [...fState.types.map(v=>({k:'types',v})),...fState.ages.map(v=>({k:'ages',v})),...fState.status.map(v=>({k:'status',v})),...fState.genres.map(v=>({k:'genres',v}))]; chips.innerHTML = all.map(x => `<span class="chip-x"><b>${esc(x.v)}</b><button onclick="toggleFilter('${x.k}','${esc(x.v)}')">×</button></span>`).join(''); }
  set('resultCount', `تم العثور على ${list.length} عمل`);
  const grid = document.getElementById('browseGrid');
  if (grid) grid.innerHTML = list.length ? list.map(w => cardHTML(w, false)).join('') : '<p style="grid-column:1/-1;text-align:center;color:var(--muted);padding:40px">لا توجد نتائج.</p>';
  $$('.dropdown.show').forEach(d => buildDropdownContent(d.id));
}

/* ===== صفحة العمل ===== */
async function vWork(id) {
  const { data: w } = await sb.from('works').select('*').eq('id', id).maybeSingle();
  if (!w) return '<div class="panel">العمل غير موجود.</div>';
  const { data: chs } = await sb.rpc('get_work_chapters', { p_work_id: id });
  const { data: ratingData } = await sb.rpc('get_work_rating', { p_work_id: id });
  const { data: comments } = await sb.rpc('get_work_comments', { p_work_id: id });
  const isFav = await isFavorite(id);
  const { data: progress } = session ? await sb.rpc('get_my_progress', { p_work_id: id }) : { data: null };

  const avg = ratingData?.average || 0, cnt = ratingData?.count || 0, myScore = ratingData?.my_score || 0;
  const sc = w.status==='متوقفة'?'paused':w.status==='منتهية'?'completed':'';

  const starsHTML = [1,2,3,4,5].map(i => `<span class="star ${i<=myScore?'active':''}" onclick="rateWork('${id}',${i})">★</span>`).join('');
  const commentsHTML = (comments||[]).map(c => `
    <div class="comment-item">
      <div class="comment-head"><div class="comment-avatar">${esc(c.username?.[0]||'?')}</div><span class="comment-user">${esc(c.username||'مجهول')}</span><span class="comment-time">${timeAgo(c.created_at)}</span></div>
      <div class="comment-content">${esc(c.content)}</div>
      <div class="comment-actions"><button class="${c.is_liked?'liked':''}" onclick="likeComment('${c.id}')">❤️ ${c.likes||0}</button></div>
    </div>`).join('') || '<p style="text-align:center;color:var(--muted);padding:20px;font-size:.8rem">لا توجد تعليقات بعد.</p>';

  const progressHTML = progress?.has_progress && session ? `<button class="btn ghost" onclick="go('read','${progress.chapter_id}')">📖 متابعة القراءة</button>` : '';

  return `<div class="work-head">
    <div class="work-cover" style="background:linear-gradient(140deg,${esc(w.grad_a||'#1a237e')},${esc(w.grad_b||'#4a148c')})">
      ${w.cover_url?`<img src="${esc(w.cover_url)}" alt="${esc(w.title)}">`:esc(w.emoji||'📖')}
    </div>
    <div class="work-info">
      <h1>${esc(w.title)}</h1>
      <div class="badges">
        <span class="badge b-type">${esc(w.type)}</span>
        <span class="badge b-age">${esc(w.age_rating)}</span>
        <span class="badge b-status ${sc}">${esc(w.status||'مستمرة')}</span>
        ${(w.genres||[]).map(g=>`<span class="badge">${esc(g)}</span>`).join('')}
      </div>
      <div class="rating-info">★ ${avg} (${cnt} تقييم)</div>
      <div class="rating-stars">${starsHTML}</div>
      <p class="work-syn">${esc(w.synopsis||'')}</p>
      ${w.author?`<p class="work-author">✍️ الكاتب: <b>${esc(w.author)}</b></p>`:''}
      <div class="work-actions">
        <button class="btn ${isFav?'fav-btn active':'ghost'}" onclick="toggleFavorite('${id}')">${isFav?'❤️ في المفضلة':'🤍 أضف للمفضلة'}</button>
        ${progressHTML}
      </div>
    </div>
  </div>
  <div class="sec-title"><span class="line"></span>📑 الفصول (${(chs||[]).length})</div>
  <div class="notice">الفصول المقفلة تُفتح بالنقاط. التحقق يتم في قاعدة البيانات.</div>
  ${(chs||[]).map(ch => `<div class="ch-item ${ch.is_locked?'locked':''}">
    <div class="num">الفصل ${ch.number}</div>
    <div class="sub">${ch.is_locked?'🔒 مقفل':'🆓 مجاني'} ${esc(ch.title||'')}</div>
    <button class="btn sm ${ch.is_locked?'gold':'ghost'}" onclick="readChapter('${ch.id}')">${ch.is_locked?'فتح':'قراءة'}</button>
  </div>`).join('') || '<p style="text-align:center;color:var(--muted);padding:30px">لا توجد فصول.</p>'}
  <div class="sec-title"><span class="line"></span>💬 التعليقات (${(comments||[]).length})</div>
  ${session ? `<div class="panel"><div class="field"><textarea id="commentInput" placeholder="اكتب تعليقاً..." style="min-height:80px"></textarea></div><button class="btn" onclick="postComment('${id}')">نشر التعليق</button></div>` : '<div class="notice">سجّل الدخول للتعليق.</div>'}
  <div id="commentsList">${commentsHTML}</div>`;
}

async function toggleFavorite(workId) {
  if (!session) return go('auth');
  const isFav = await isFavorite(workId);
  if (isFav) await sb.from('favorites').delete().eq('user_id', session.user.id).eq('work_id', workId);
  else await sb.from('favorites').insert({ user_id: session.user.id, work_id: workId });
  toast(isFav ? 'تم الحذف من المفضلة' : '❤️ تم الإضافة للمفضلة');
  route();
}

async function rateWork(workId, score) {
  if (!session) return go('auth');
  await sb.from('ratings').upsert({ user_id: session.user.id, work_id: workId, score });
  toast('⭐ تم التقييم');
  route();
}

async function postComment(workId) {
  if (!session) return go('auth');
  const input = document.getElementById('commentInput');
  const content = input?.value.trim();
  if (!content) return toast('اكتب تعليقاً');
  const { error } = await sb.from('comments').insert({ user_id: session.user.id, work_id: workId, content });
  if (error) return toast(error.message);
  toast('✅ تم النشر'); route();
}

async function likeComment(commentId) {
  if (!session) return go('auth');
  const { data } = await sb.from('comment_likes').select('*').eq('user_id', session.user.id).eq('comment_id', commentId).maybeSingle();
  if (data) {
    await sb.from('comment_likes').delete().eq('user_id', session.user.id).eq('comment_id', commentId);
    await sb.rpc('decrement_comment_likes', { p_comment_id: commentId }).catch(()=>{});
  } else {
    await sb.from('comment_likes').insert({ user_id: session.user.id, comment_id: commentId });
  }
  route();
}

async function readChapter(id) {
  const { data, error } = await sb.rpc('can_read_chapter', { p_chapter_id: id });
  if (error) return toast(error.message);
  if (!data?.allowed) return toast('🪙 هذا الفصل مقفل');
  go('read', id);
}

/* ===== القارئ ===== */
async function vReader(id) {
  const { data: ch, error } = await sb.rpc('get_chapter_for_reader', { p_chapter_id: id });
  if (error || !ch) return `<div class="error">${esc(error?.message||'الفصل غير متاح')}</div>`;

  if (session) await sb.rpc('save_progress', { p_work_id: ch.work_id, p_chapter_id: id, p_page: 1 });

  let body = '';
  if (ch.kind === 'novel') {
    body = `<article class="novel-page"><h2>${esc(ch.title||'الفصل')}</h2>${(ch.content||'').split(/\n+/).map(p=>`<p>${esc(p)}</p>`).join('')}</article>`;
  } else {
    const imgs = ch.pages || [], urls = [];
    for (const p of imgs) { const r = await sb.storage.from('chapters').createSignedUrl(p, 3600); if (r.data?.signedUrl) urls.push(r.data.signedUrl); }
    body = urls.map((u,i)=>`<img class="reader-image" src="${esc(u)}" alt="صفحة ${i+1}" loading="lazy">`).join('') || '<div class="panel">لا توجد صفحات.</div>';
  }

  return `<div class="reader-bar">
    <button class="btn sm ghost" onclick="go('work','${ch.work_id}')">→ رجوع</button>
    <div class="reader-title">${esc(ch.work_title)} — الفصل ${ch.number}</div>
    <div class="reader-settings">
      <select onchange="changeReaderMode(this.value)">
        <option value="webtoon" ${readerMode==='webtoon'?'selected':''}>📜 ويبتون</option>
        <option value="page" ${readerMode==='page'?'selected':''}>📄 صفحة</option>
      </select>
    </div>
  </div>
  <div class="reader-body ${readerMode==='webtoon'?'mode-webtoon':''}">${body}</div>
  <div class="reader-nav">
    <button onclick="go('work','${ch.work_id}')">← الفصول</button>
    <button onclick="window.scrollTo({top:0,behavior:'smooth'})">↑ أعلى</button>
  </div>`;
}

function changeReaderMode(mode) { readerMode = mode; route(); }

/* ===== المكتبة ===== */
async function vLibrary() {
  if (!session) return `<div class="panel" style="text-align:center;padding:60px 20px"><h2>📚 مكتبتي</h2><p style="margin:14px 0;color:var(--muted)">سجّل الدخول لعرض مكتبتك</p><button class="btn" onclick="go('auth')">تسجيل الدخول</button></div>`;
  const { data: favs } = await sb.from('favorites').select('work_id, created_at, works(*)').eq('user_id', session.user.id).order('created_at', { ascending: false });
  const { data: progressList } = await sb.from('reading_progress').select('work_id, updated_at, works(*), chapters(number)').eq('user_id', session.user.id).order('updated_at', { ascending: false });

  const favHTML = (favs||[]).map(f => f.works ? cardHTML(f.works, true) : '').join('');
  const progHTML = (progressList||[]).map(p => {
    if (!p.works) return '';
    return `<div class="release-card"><div class="release-info">
      <h3>${esc(p.works.title)}</h3>
      <div class="release-status">آخر قراءة: الفصل ${p.chapters?.number||'?'}</div>
      <div class="chapters-mini"><div class="chapter-mini" onclick="go('work','${p.work_id}')"><span>📖 متابعة القراءة</span><span class="time">${timeAgo(p.updated_at)}</span></div></div>
    </div>
    <div class="release-cover" onclick="go('work','${p.work_id}')">${p.works.cover_url?`<img src="${esc(p.works.cover_url)}" alt="">`:'📖'}</div></div>`;
  }).join('');

  return `<div class="sec-title"><span class="line"></span>📚 مكتبتي</div>
  <div class="tabs">
    <button class="tab ${libraryTab==='favorites'?'on':''}" onclick="libraryTab='favorites';route()">❤️ المفضلة (${(favs||[]).length})</button>
    <button class="tab ${libraryTab==='progress'?'on':''}" onclick="libraryTab='progress';route()">📖 سجل القراءة (${(progressList||[]).length})</button>
  </div>
  ${libraryTab==='favorites' ? (favHTML ? `<div class="grid">${favHTML}</div>` : '<div class="empty"><div class="empty-icon">🤍</div><p>لا توجد أعمال في المفضلة</p></div>') : (progHTML || '<div class="empty"><div class="empty-icon">📖</div><p>لا يوجد سجل قراءة</p></div>')}`;
}

/* ===== الإشعارات ===== */
async function vNotifications() {
  if (!session) return `<div class="panel" style="text-align:center;padding:60px 20px"><h2>🔔 الإشعارات</h2><p style="margin:14px 0;color:var(--muted)">سجّل الدخول لعرض الإشعارات</p><button class="btn" onclick="go('auth')">تسجيل الدخول</button></div>`;
  const { data } = await sb.from('notifications').select('*, works(title), chapters(number)').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(50);
  await sb.from('notifications').update({ is_read: true }).eq('user_id', session.user.id).eq('is_read', false);
  checkNotifications();

  const html = (data||[]).map(n => `<div class="notif-item ${n.is_read?'':'unread'}" onclick="${n.work_id?`go('work','${n.work_id}')`:''}">
    <div class="notif-icon">🔔</div>
    <div class="notif-content"><p>${esc(n.message||`تم نشر فصل جديد${n.chapters?.number?` (${n.chapters.number})`:''} من ${n.works?.title||''}`)}</p><time>${timeAgo(n.created_at)}</time></div>
  </div>`).join('');

  return `<div class="sec-title"><span class="line"></span>🔔 الإشعارات</div>
  ${html || '<div class="empty"><div class="empty-icon">🔕</div><p>لا توجد إشعارات</p></div>'}`;
}

/* ===== الفرق ===== */
async function vTeams() {
  const { data } = await sb.from('teams').select('*').eq('published', true).order('name');
  return `<div class="sec-title"><span class="line"></span>🛡️ فرق الترجمة</div><div class="notice">يمكن لكل فريق إدارة أعماله وفصوله.</div>
  <div class="grid2">${(data||[]).map(t=>`<div class="team-card"><h3>${esc(t.name)}</h3><p style="color:var(--muted);line-height:1.8;font-size:.85rem">${esc(t.description||'')}</p>${t.support_wallet?`<div class="wallet-box">${esc(t.support_wallet)}</div><button class="btn sm" onclick="copyTxt('${esc(t.support_wallet)}')">نسخ</button>`:''}</div>`).join('') || '<div class="empty"><div class="empty-icon">🛡️</div><p>لا توجد فرق بعد</p></div>'}</div>`;
}

/* ===== انضم ===== */
async function vJoin() {
  return `<div class="sec-title"><span class="line"></span>🤝 انضم كمساعد</div>
  <div class="notice">أرسل طلبك؛ سيظهر للمشرفين في لوحة الإدارة.</div>
  <div class="panel" style="max-width:650px">
    <div class="field"><label>الاسم</label><input id="jName"></div>
    <div class="field"><label>البريد / تيليجرام</label><input id="jContact"></div>
    <div class="field"><label>الدور</label><select id="jRole"><option>مترجم</option><option>مبيّض</option><option>مدقق لغوي</option><option>رافع فصول</option></select></div>
    <div class="field"><label>اللغات</label><input id="jLangs"></div>
    <div class="field"><label>نبذة</label><textarea id="jBio"></textarea></div>
    <button class="btn" onclick="submitJoin()">إرسال الطلب</button>
  </div>`;
}
async function submitJoin() {
  if (!session) return go('auth');
  const p = { name:$('#jName').value.trim(), contact:$('#jContact').value.trim(), role:$('#jRole').value, langs:$('#jLangs').value.trim(), bio:$('#jBio').value.trim() };
  if (!p.name || !p.contact) return toast('أكمل الحقول');
  const { error } = await sb.from('join_requests').insert({ user_id: session.user.id, ...p });
  toast(error?error.message:'✅ تم الإرسال'); if (!error) route();
}

/* ===== المصادقة ===== */
async function vAuth() {
  return `<div class="sec-title"><span class="line"></span>🔐 حسابك</div>
  <div class="panel" style="max-width:420px;margin:auto">
    ${session ? `<p style="text-align:center;margin-bottom:16px">مسجل الدخول: <b>${esc(profile?.username||session.user.email)}</b></p>
      <button class="btn danger" style="width:100%" onclick="signOut()">تسجيل الخروج</button>` : `
      <div class="field"><label>البريد الإلكتروني</label><input id="email" type="email" placeholder="username@domain.com"></div>
      <div class="field"><label>كلمة المرور</label><input id="pass" type="password" placeholder="••••••••"></div>
      <button class="btn gold" style="width:100%;margin-bottom:10px" onclick="signIn()">تسجيل الدخول</button>
      <div style="text-align:center;font-size:.8rem"><span style="color:var(--muted)">ليس لديك حساب؟ </span><a onclick="signUp()" style="color:var(--accent);font-weight:800;cursor:pointer">إنشاء حساب جديد</a></div>`}
  </div>`;
}
async function signIn() { const { error } = await sb.auth.signInWithPassword({ email:$('#email').value.trim(), password:$('#pass').value }); if (error) toast(error.message); else { toast('تم تسجيل الدخول'); route(); } }
async function signUp() { const email=$('#email').value.trim(), password=$('#pass').value; if (password.length<8) return toast('كلمة المرور 8 أحرف على الأقل'); const { error } = await sb.auth.signUp({ email, password }); toast(error?error.message:'تم إنشاء الحساب'); }
async function signOut() { await sb.auth.signOut(); toast('تم تسجيل الخروج'); route(); }

/* ===== النقاط ===== */
async function vPoints() {
  if (!session) return `<div class="panel" style="text-align:center;padding:60px 20px"><h2>👑 النقاط</h2><p style="margin:14px 0;color:var(--muted)">سجّل الدخول لإدارة رصيدك</p><button class="btn" onclick="go('auth')">تسجيل الدخول</button></div>`;
  const { data } = await sb.rpc('get_my_balance');
  const balance = data?.balance || 0;
  const { data: packs } = await sb.from('point_packs').select('*').eq('active', true).order('sort_order');
  return `<div class="sec-title"><span class="line"></span>👑 رصيدك: ${balance} نقطة</div>
  <div class="notice">شراء النقاط هنا ينشئ طلب دفع. لن تتم إضافة النقاط حتى يؤكد المشرف.</div>
  <div class="panel" style="max-width:600px"><h3 style="margin-bottom:14px">🛒 الحزم</h3>
    ${(packs||[]).map(p=>`<div class="pack"><div><div class="pts">${p.points} نقطة</div><div style="color:var(--muted);font-size:.75rem">${p.bonus_text||''}</div></div><div style="text-align:left"><b>${p.usdt_price} USDT</b><br><button class="btn sm" style="margin-top:6px" onclick="createPayment('${p.id}')">شراء</button></div></div>`).join('') || '<p style="color:var(--muted)">لا توجد حزم.</p>'}
  </div>`;
}
async function createPayment(packId) { const { data, error } = await sb.rpc('create_payment_request', { p_pack_id: packId }); if (error) toast(error.message); else toast('تم إنشاء الطلب رقم ' + data.reference); }

/* ===== البحث ===== */
async function vSearch(q) {
  const { data } = await sb.from('works').select('*').eq('published', true).ilike('title', `%${q||''}%`);
  return `<div class="search-wrap"><div class="search-box"><span class="search-icon">🔍</span><input id="searchInput" placeholder="ابحث..." value="${esc(q||'')}" onkeydown="if(event.key==='Enter')go('search',this.value)"></div></div>
  <p class="result-count">نتائج: ${(data||[]).length}</p>
  <div class="grid">${(data||[]).map(w=>cardHTML(w,false)).join('') || '<p style="grid-column:1/-1;text-align:center;color:var(--muted);padding:40px">لا نتائج.</p>'}</div>`;
}

/* ===== لوحة الإدارة (مع التعديل والحذف) ===== */
async function vAdmin() {
  if (profile?.role !== 'admin') return `<div class="panel"><h2>⛔ غير مصرح</h2></div>`;
  const [{ count: users }, { count: works }, { count: joins }, { count: payments }] = await Promise.all([
    sb.from('profiles').select('*', { count: 'exact', head: true }),
    sb.from('works').select('*', { count: 'exact', head: true }),
    sb.from('join_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('payment_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
  ]);
  const { data: ws } = await sb.from('works').select('id,title,type,cover_url').order('created_at', { ascending: false });
  const { data: chs } = await sb.from('chapters').select('id,number,title,work_id,is_locked,kind').order('created_at', { ascending: false }).limit(50);
  const { data: ps } = await sb.from('payment_requests').select('id,reference,point_packs(points,usdt_price),profiles(username)').eq('status', 'pending');
  const { data: js } = await sb.from('join_requests').select('id,name,contact,role').eq('status', 'pending');

  return `<div class="sec-title"><span class="line"></span>🛠️ لوحة الإدارة</div>
  <div class="admin-grid">
    <div class="stat">المستخدمون<b>${users||0}</b></div><div class="stat">الأعمال<b>${works||0}</b></div>
    <div class="stat">طلبات<b>${joins||0}</b></div><div class="stat">دفعات<b>${payments||0}</b></div>
  </div>

  <div class="sec-title"><span class="line"></span>➕ إضافة عمل</div>
  <div class="panel">
    <div class="field"><label>العنوان</label><input id="awTitle"></div>
    <div class="field"><label>النوع</label><select id="awType"><option>مانهوا</option><option>مانجا</option><option>مانها</option><option>رواية</option><option>كوميكس</option></select></div>
    <div class="field"><label>القسم</label><select id="awKind"><option value="comic">كوميكس</option><option value="novel">رواية</option></select></div>
    <div class="field"><label>العمر</label><select id="awAge"><option>13+</option><option>16+</option><option>18+</option></select></div>
    <div class="field"><label>الحالة</label><select id="awStatus"><option>مستمرة</option><option>متوقفة</option><option>منتهية</option></select></div>
    <div class="field"><label>الأنواع (بفاصلة)</label><input id="awGenres" placeholder="أكشن, فانتازيا"></div>
    <div class="field"><label>رابط صورة الغلاف</label><input id="awCover" placeholder="https://..."></div>
    <div class="field"><label>الكاتب (اختياري)</label><input id="awAuthor"></div>
    <div class="field"><label>الملخص</label><textarea id="awSyn"></textarea></div>
    <button class="btn" onclick="adminAddWork()">حفظ</button>
  </div>

  <div class="sec-title"><span class="line"></span>📚 إدارة الأعمال (${(ws||[]).length})</div>
  <div class="panel">${(ws||[]).map(w=>`<div class="manage-item">
    <div class="manage-cover">${w.cover_url?`<img src="${esc(w.cover_url)}" alt="">`:'📖'}</div>
    <div class="manage-info"><h4>${esc(w.title)}</h4><p>${esc(w.type)}</p></div>
    <div class="manage-actions">
      <button class="btn-edit" onclick="editWork('${w.id}')" title="تعديل">✏️</button>
      <button class="btn-del" onclick="deleteWork('${w.id}','${esc(w.title)}')" title="حذف">🗑️</button>
    </div>
  </div>`).join('') || '<p style="text-align:center;color:var(--muted);padding:20px">لا توجد أعمال.</p>'}</div>

  <div class="sec-title"><span class="line"></span>➕ إضافة فصل</div>
  <div class="panel">
    <div class="field"><label>العمل</label><select id="acWork">${(ws||[]).map(w=>`<option value="${w.id}">${esc(w.title)}</option>`).join('')}</select></div>
    <div class="field"><label>رقم الفصل</label><input id="acNum" type="number"></div>
    <div class="field"><label>العنوان</label><input id="acTitle"></div>
    <div class="field"><label>النوع</label><select id="acKind"><option value="novel">رواية</option><option value="comic">كوميكس</option></select></div>
    <div class="field"><label>مقفل؟</label><select id="acLock"><option value="false">لا</option><option value="true">نعم</option></select></div>
    <div class="field"><label>النص</label><textarea id="acContent"></textarea></div>
    <div class="field"><label>صور</label><input id="acFiles" type="file" accept="image/*" multiple></div>
    <button class="btn" onclick="adminAddChapter()">حفظ الفصل</button>
  </div>

  <div class="sec-title"><span class="line"></span>📑 إدارة الفصول (${(chs||[]).length})</div>
  <div class="panel">${(chs||[]).map(c=>`<div class="manage-item">
    <div class="manage-cover">${c.kind==='comic'?'🎨':'📖'}</div>
    <div class="manage-info"><h4>الفصل ${c.number}${c.title?`: ${esc(c.title)}`:''}</h4><p>${c.is_locked?'🔒 مقفل':'🆓 مجاني'}</p></div>
    <div class="manage-actions">
      <button class="btn-edit" onclick="editChapter('${c.id}')" title="تعديل">✏️</button>
      <button class="btn-del" onclick="deleteChapter('${c.id}','الفصل ${c.number}')" title="حذف">🗑️</button>
    </div>
  </div>`).join('') || '<p style="text-align:center;color:var(--muted);padding:20px">لا توجد فصول.</p>'}</div>

  <div class="sec-title"><span class="line"></span>💰 الدفعات</div>
  <div class="panel table-wrap"><table class="table">
    <tr><th>المرجع</th><th>المستخدم</th><th>المبلغ</th><th>TX</th><th></th></tr>
    ${(ps||[]).map(p=>`<tr><td>${esc(p.reference)}</td><td>${esc(p.profiles?.username||'')}</td><td>${p.point_packs?.usdt_price} USDT</td><td><input id="tx-${p.id}" style="background:var(--card2);border:1px solid var(--border);color:var(--txt);padding:5px;border-radius:6px;width:100px"></td><td><button class="btn sm" onclick="reviewPay('${p.id}','paid')">تأكيد</button></td></tr>`).join('') || '<tr><td colspan="5">لا توجد.</td></tr>'}
  </table></div>

  <div class="sec-title"><span class="line"></span>🤝 الطلبات</div>
  <div class="panel table-wrap"><table class="table">
    <tr><th>الاسم</th><th>الدور</th><th>التواصل</th><th></th></tr>
    ${(js||[]).map(j=>`<tr><td>${esc(j.name)}</td><td>${esc(j.role)}</td><td>${esc(j.contact)}</td><td><button class="btn sm" onclick="reviewJoin('${j.id}','approved')">قبول</button></td></tr>`).join('') || '<tr><td colspan="4">لا توجد.</td></tr>'}
  </table></div>`;
}

/* ===== إدارة الأعمال ===== */
async function adminAddWork() {
  const p = {
    title: $('#awTitle').value.trim(), type: $('#awType').value, kind: $('#awKind').value,
    age_rating: $('#awAge').value, status: $('#awStatus').value,
    genres: $('#awGenres').value.split(',').map(x=>x.trim()).filter(Boolean),
    synopsis: $('#awSyn').value.trim(), cover_url: $('#awCover').value.trim()||null,
    author: $('#awAuthor').value.trim()||null, published: true, owner_id: session.user.id
  };
  if (!p.title) return toast('أدخل العنوان');
  const { error } = await sb.from('works').insert(p);
  toast(error?error.message:'✅ تم'); if (!error) route();
}

async function editWork(id) {
  const { data: w } = await sb.from('works').select('*').eq('id', id).maybeSingle();
  if (!w) return toast('العمل غير موجود');
  const modal = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  content.innerHTML = `<h3>✏️ تعديل: ${esc(w.title)}</h3>
    <div class="field"><label>العنوان</label><input id="ewTitle" value="${esc(w.title)}"></div>
    <div class="field"><label>النوع</label><select id="ewType">${['مانهوا','مانجا','مانها','رواية','كوميكس'].map(t=>`<option ${w.type===t?'selected':''}>${t}</option>`).join('')}</select></div>
    <div class="field"><label>القسم</label><select id="ewKind"><option value="comic" ${w.kind==='comic'?'selected':''}>كوميكس</option><option value="novel" ${w.kind==='novel'?'selected':''}>رواية</option></select></div>
    <div class="field"><label>العمر</label><select id="ewAge">${['13+','16+','18+'].map(a=>`<option ${w.age_rating===a?'selected':''}>${a}</option>`).join('')}</select></div>
    <div class="field"><label>الحالة</label><select id="ewStatus">${['مستمرة','متوقفة','منتهية'].map(s=>`<option ${w.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
    <div class="field"><label>الأنواع</label><input id="ewGenres" value="${esc((w.genres||[]).join(', '))}"></div>
    <div class="field"><label>رابط الغلاف</label><input id="ewCover" value="${esc(w.cover_url||'')}"></div>
    <div class="field"><label>الكاتب</label><input id="ewAuthor" value="${esc(w.author||'')}"></div>
    <div class="field"><label>الملخص</label><textarea id="ewSyn">${esc(w.synopsis||'')}</textarea></div>
    <div class="modal-actions"><button class="cancel" onclick="closeModal()">إلغاء</button><button class="save" onclick="saveWork('${id}')">حفظ التعديلات</button></div>`;
  modal.classList.add('show');
}

async function saveWork(id) {
  const p = {
    title: $('#ewTitle').value.trim(), type: $('#ewType').value, kind: $('#ewKind').value,
    age_rating: $('#ewAge').value, status: $('#ewStatus').value,
    genres: $('#ewGenres').value.split(',').map(x=>x.trim()).filter(Boolean),
    cover_url: $('#ewCover').value.trim()||null, author: $('#ewAuthor').value.trim()||null,
    synopsis: $('#ewSyn').value.trim()
  };
  const { error } = await sb.from('works').update(p).eq('id', id);
  if (error) return toast(error.message);
  toast('✅ تم التعديل'); closeModal(); route();
}

async function deleteWork(id, title) {
  if (!confirm(`هل أنت متأكد من حذف "${title}"؟ سيتم حذف جميع فصوله أيضاً.`)) return;
  const { error } = await sb.from('works').delete().eq('id', id);
  if (error) return toast(error.message);
  toast('🗑️ تم الحذف'); route();
}

/* ===== إدارة الفصول ===== */
async function adminAddChapter() {
  const work_id = $('#acWork').value, number = Number($('#acNum').value), title = $('#acTitle').value.trim(),
    kind = $('#acKind').value, is_locked = $('#acLock').value === 'true', content = $('#acContent').value;
  const { data: ch, error } = await sb.from('chapters').insert({ work_id, number, title, kind, is_locked, content, published: true }).select().single();
  if (error) return toast(error.message);
  const files = [...($('#acFiles').files||[])], paths = [];
  for (let i=0;i<files.length;i++) {
    const f = files[i], path = `${ch.id}/${String(i+1).padStart(3,'0')}-${f.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const r = await sb.storage.from('chapters').upload(path, f, { upsert: true });
    if (r.error) return toast(r.error.message);
    paths.push(path);
  }
  if (paths.length) await sb.from('chapters').update({ pages: paths, kind: 'comic' }).eq('id', ch.id);
  await notifyFollowers(work_id, ch.id, number);
  toast('✅ تم'); route();
}

async function notifyFollowers(workId, chapterId, number) {
  const { data: favs } = await sb.from('favorites').select('user_id').eq('work_id', workId);
  if (!favs || !favs.length) return;
  const { data: w } = await sb.from('works').select('title').eq('id', workId).maybeSingle();
  const notifications = favs.map(f => ({ user_id: f.user_id, work_id: workId, chapter_id: chapterId, type: 'new_chapter', message: `📢 فصل جديد (${number}) من "${w?.title||''}"` }));
  await sb.from('notifications').insert(notifications);
}

async function editChapter(id) {
  const { data: c } = await sb.from('chapters').select('*').eq('id', id).maybeSingle();
  if (!c) return toast('الفصل غير موجود');
  const modal = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  content.innerHTML = `<h3>✏️ تعديل الفصل ${c.number}</h3>
    <div class="field"><label>رقم الفصل</label><input id="ecNum" type="number" value="${c.number}"></div>
    <div class="field"><label>العنوان</label><input id="ecTitle" value="${esc(c.title||'')}"></div>
    <div class="field"><label>النوع</label><select id="ecKind"><option value="novel" ${c.kind==='novel'?'selected':''}>رواية</option><option value="comic" ${c.kind==='comic'?'selected':''}>كوميكس</option></select></div>
    <div class="field"><label>مقفل؟</label><select id="ecLock"><option value="false" ${!c.is_locked?'selected':''}>لا</option><option value="true" ${c.is_locked?'selected':''}>نعم</option></select></div>
    <div class="field"><label>النص</label><textarea id="ecContent">${esc(c.content||'')}</textarea></div>
    <div class="modal-actions"><button class="cancel" onclick="closeModal()">إلغاء</button><button class="save" onclick="saveChapter('${id}')">حفظ</button></div>`;
  modal.classList.add('show');
}

async function saveChapter(id) {
  const p = { number: Number($('#ecNum').value), title: $('#ecTitle').value.trim(), kind: $('#ecKind').value, is_locked: $('#ecLock').value === 'true', content: $('#ecContent').value };
  const { error } = await sb.from('chapters').update(p).eq('id', id);
  if (error) return toast(error.message);
  toast('✅ تم التعديل'); closeModal(); route();
}

async function deleteChapter(id, label) {
  if (!confirm(`هل أنت متأكد من حذف ${label}؟`)) return;
  const { error } = await sb.from('chapters').delete().eq('id', id);
  if (error) return toast(error.message);
  toast('🗑️ تم الحذف'); route();
}

/* ===== Modal ===== */
function closeModal() { const m = document.getElementById('modalOverlay'); if (m) m.classList.remove('show'); }

/* ===== مراجعة الدفعات والطلبات ===== */
async function reviewPay(id, status) {
  const tx = $(`#tx-${id}`)?.value.trim() || null;
  const { error } = await sb.rpc('admin_review_payment', { p_id: id, p_status: status, p_note: tx?`TX: ${tx}`:null });
  toast(error?error.message:'تم'); if (!error) route();
}
async function reviewJoin(id, status) { const { error } = await sb.from('join_requests').update({ status }).eq('id', id); toast(error?error.message:'تم'); if (!error) route(); }
async function copyTxt(t) { try { await navigator.clipboard.writeText(t); toast('📋 نسخ'); } catch { toast('انسخ يدوياً'); } }

/* ===== الراوتر ===== */
async function route() {
  const h = location.hash.replace(/^#\/?/, '').split('/');
  const page = h[0] || 'home', id = h[1];
  $$('.sidebar-nav a').forEach(a => a.classList.toggle('on', a.dataset.r === page));
  const s = $('#sidebar'); if (s) s.classList.remove('show');
  const o = $('#overlay'); if (o) o.classList.remove('show');
  app.innerHTML = '<div class="loading">جارٍ التحميل…</div>';
  try {
    if (!sb) return boot();
    let html;
    if (page === 'home') html = await vHome();
    else if (page === 'comics') html = await vBrowse('comic');
    else if (page === 'novels') html = await vBrowse('novel');
    else if (page === 'library') html = await vLibrary();
    else if (page === 'notifications') html = await vNotifications();
    else if (page === 'work') html = await vWork(id);
    else if (page === 'read') html = await vReader(id);
    else if (page === 'teams') html = await vTeams();
    else if (page === 'join') html = await vJoin();
    else if (page === 'auth') html = await vAuth();
    else if (page === 'points') html = await vPoints();
    else if (page === 'admin') html = await vAdmin();
    else if (page === 'search') html = await vSearch(decodeURIComponent(id || ''));
    else html = await vHome();
    app.innerHTML = html;
    if (page === 'comics' || page === 'novels') drawBrowse();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) { console.error(e); app.innerHTML = `<div class="error">حدث خطأ: ${esc(e.message)}</div>`; }
}

window.addEventListener('hashchange', route);
boot();