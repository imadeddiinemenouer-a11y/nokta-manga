const C = window.NOKTA_CONFIG || {};
const hasConfig = C.supabaseUrl && C.supabasePublishableKey && !C.supabaseUrl.includes('YOUR_') && !C.supabasePublishableKey.includes('YOUR_');
const sb = hasConfig ? supabase.createClient(C.supabaseUrl, C.supabasePublishableKey) : null;
const app = document.querySelector('#app');
let session = null;
let profile = null;
let fState = { type: 'all', gen: 'all', age: 'all' };

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

function toast(m) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = m;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

function go(r, id) {
  location.hash = id === undefined ? '#/' + r : '#/' + r + '/' + id;
}

// ==================== إصلاح الوضع الليلي/النهاري ====================
function theme() {
  const light = localStorage.noktaTheme === 'light';
  if (light) {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = light ? '🌙' : '☀️';
}

function toggleTheme() {
  localStorage.noktaTheme = localStorage.noktaTheme === 'light' ? 'dark' : 'light';
  theme();
}

theme();
// =====================================================================

async function boot() {
  if (!sb) {
    app.innerHTML = `<div class="panel"><h2>⚙️ إعداد Supabase مطلوب</h2><p style="color:var(--muted);line-height:2;margin-top:10px">انسخ <b>config.example.js</b> إلى <b>config.js</b> ثم ضع رابط مشروع Supabase والمفتاح العام.</p></div>`;
    return;
  }
  const r = await sb.auth.getSession();
  session = r.data.session;
  await loadProfile();
  sb.auth.onAuthStateChange(async (_, s) => {
    session = s;
    await loadProfile();
    refreshHeader();
    route();
  });
  refreshHeader();
  route();
}

async function loadProfile() {
  profile = null;
  if (session) {
    const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    profile = data;
  }
}

function refreshHeader() {
  if (!sb) return;
  const authBtn = $('#authBtn');
  if (authBtn) {
    authBtn.textContent = session ? (profile?.username ? `👤 ${profile.username}` : '👤 حسابي') : 'تسجيل الدخول';
  }
  const adminBtn = $('#adminBtn');
  if (adminBtn) {
    adminBtn.style.display = profile?.role === 'admin' ? 'inline-block' : 'none';
  }
  if (session) loadBalance();
}

async function loadBalance() {
  const { data } = await sb.rpc('get_my_balance');
  if (!data || data.error) return;
  const el = $('#ptsBal');
  if (el) el.textContent = data.balance ?? 0;
}

function cardHTML(w) {
  return `<div class="card" onclick="go('work','${w.id}')">
    <div class="cover" style="background:linear-gradient(140deg,${esc(w.grad_a || '#1a237e')},${esc(w.grad_b || '#4a148c')})">
      ${w.cover_url ? `<img src="${esc(w.cover_url)}" alt="">` : esc(w.emoji || '📖')}
      <span class="age">${esc(w.age_rating || '13+')}</span>
      <span class="type">${esc(w.type)}</span>
    </div>
    <div class="cinfo">
      <h3>${esc(w.title)}</h3>
      <div class="genres">${(w.genres || []).slice(0, 3).map(g => `<span class="gtag">${esc(g)}</span>`).join('')}</div>
      <div class="meta"><span class="rate">★ ${Number(w.rating || 0).toFixed(1)}</span><span>${w.chapter_count || 0} فصل</span></div>
    </div>
  </div>`;
}

async function fetchWorks(kind) {
  let q = sb.from('works').select('*').eq('published', true).order('updated_at', { ascending: false });
  if (kind) q = q.eq('kind', kind);
  const { data, error } = await q;
  return error ? [] : data || [];
}

async function vHome() {
  const works = await fetchWorks();
  const top = [...works].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 6);
  const latest = works.slice(0, 6);
  return `<div class="hero">
    <h1>اقرأ أحدث <span>المانهوا والمانجا والروايات</span> بالعربية</h1>
    <p>منصة حقيقية للفصول والفرق والقراءة، مع حسابات وصلاحيات ونظام نقاط محفوظ في الخادم.</p>
    <button class="btn" onclick="go('comics')">تصفح الكوميكس ←</button>
    <button class="btn ghost" onclick="go('novels')">الروايات</button>
  </div>
  <div class="sec-title">🔥 الأكثر شعبية<a href="#/comics">عرض الكل</a></div>
  <div class="grid">${top.map(cardHTML).join('') || '<p style="grid-column:1/-1;text-align:center;color:var(--muted);padding:40px">لا توجد أعمال بعد.</p>'}</div>
  <div class="sec-title">🆕 آخر التحديثات</div>
  <div class="grid">${latest.map(cardHTML).join('')}</div>`;
}

const ALL_GENS = ['فانتازيا', 'أكشن', 'رومانسية', 'غموض', 'نظام', 'دراما', 'مغامرة', 'مدرسي', 'شونين', 'قوى خاصة', 'ناجٍ', 'مصاصين', 'سحر', 'مملكة', 'تاريخي', 'ارتقاء', 'رياضة', 'خيال'];

async function vBrowse(kind) {
  const works = await fetchWorks(kind);
  fState = { type: 'all', gen: 'all', age: 'all' };
  window.__browse = works;
  return `<div class="sec-title">${kind === 'comic' ? '🎨 قسم الكوميكس' : '📖 قسم الروايات'}</div>
  <div class="filters" id="typeF"></div>
  <div class="filters" id="genF"></div>
  <div class="filters" id="ageF"></div>
  <div class="grid" id="browseGrid"></div>`;
}

function drawBrowse() {
  const works = window.__browse || [];
  const list = works.filter(w => (fState.type === 'all' || w.type === fState.type) && (fState.gen === 'all' || (w.genres || []).includes(fState.gen)) && (fState.age === 'all' || w.age_rating === fState.age));
  const types = ['all', ...new Set(works.map(w => w.type))];
  const tE = document.getElementById('typeF');
  const gE = document.getElementById('genF');
  const aE = document.getElementById('ageF');
  const grid = document.getElementById('browseGrid');
  if (tE) tE.innerHTML = types.map(t => `<button class="fbtn ${fState.type === t ? 'on' : ''}" onclick="setF('type','${esc(t)}')">${t === 'all' ? 'الكل' : esc(t)}</button>`).join('');
  if (gE) gE.innerHTML = `<button class="fbtn ${fState.gen === 'all' ? 'on' : ''}" onclick="setF('gen','all')">كل الأنواع</button>` + ALL_GENS.map(g => `<button class="fbtn ${fState.gen === g ? 'on' : ''}" onclick="setF('gen','${esc(g)}')">${esc(g)}</button>`).join('');
  if (aE) aE.innerHTML = `<button class="fbtn ${fState.age === 'all' ? 'on' : ''}" onclick="setF('age','all')">كل الأعمار</button>` + ['13+', '16+', '18+'].map(a => `<button class="fbtn ${fState.age === a ? 'on' : ''}" onclick="setF('age','${a}')">${a}</button>`).join('');
  if (grid) grid.innerHTML = list.length ? list.map(cardHTML).join('') : '<p style="grid-column:1/-1;text-align:center;color:var(--muted);padding:40px">لا توجد نتائج.</p>';
}

function setF(k, v) { fState[k] = v; drawBrowse(); }

async function vWork(id) {
  const { data: w } = await sb.from('works').select('*').eq('id', id).maybeSingle();
  if (!w) return '<div class="panel">العمل غير موجود.</div>';
  const { data: chs } = await sb.rpc('get_work_chapters', { p_work_id: id });
  return `<div class="work-head">
    <div class="work-cover" style="background:linear-gradient(140deg,${esc(w.grad_a || '#1a237e')},${esc(w.grad_b || '#4a148c')})">
      ${w.cover_url ? `<img src="${esc(w.cover_url)}" alt="">` : esc(w.emoji || '📖')}
    </div>
    <div class="work-info">
      <h1>${esc(w.title)}</h1>
      <div class="badges">
        <span class="badge b-type">${esc(w.type)}</span>
        <span class="badge b-age">${esc(w.age_rating)}</span>
        <span class="badge b-status">${esc(w.status)}</span>
        ${(w.genres || []).map(g => `<span class="badge">${esc(g)}</span>`).join('')}
      </div>
      <div class="meta" style="margin:10px 0"><span class="rate">★ ${Number(w.rating || 0).toFixed(1)}</span><span>${w.chapter_count || 0} فصل</span></div>
      <p class="work-syn">${esc(w.synopsis || '')}</p>
      <div class="team-line">✍️ الكاتب: <b>${esc(w.author || '—')}</b></div>
    </div>
  </div>
  <div class="sec-title">📑 الفصول</div>
  <div class="notice">الفصول المقفلة تُفتح بالنقاط من خلال حسابك. التحقق يتم في قاعدة البيانات وليس في المتصفح.</div>
  <div>${(chs || []).map(ch => `<div class="ch-item ${ch.is_locked ? 'locked' : ''}">
    <div class="num">الفصل ${ch.number}</div>
    <div class="sub">${ch.is_locked ? '🔒 فصل مبكر' : '🆓 مجاني'} ${esc(ch.title || '')}</div>
    <button class="btn sm ${ch.is_locked ? 'gold' : 'ghost'}" onclick="readChapter('${ch.id}')">${ch.is_locked ? '🔓 فتح / قراءة' : 'قراءة ←'}</button>
  </div>`).join('') || '<p style="text-align:center;color:var(--muted);padding:30px">لا توجد فصول.</p>'}</div>`;
}

async function readChapter(id) {
  const { data, error } = await sb.rpc('can_read_chapter', { p_chapter_id: id });
  if (error) return toast(error.message);
  if (!data?.allowed) return toast('🪙 هذا الفصل مقفل — اشترِ نقاطًا ثم افتحه');
  go('read', id);
}

async function vReader(id) {
  const { data: ch, error } = await sb.rpc('get_chapter_for_reader', { p_chapter_id: id });
  if (error || !ch) return `<div class="error">${esc(error?.message || 'الفصل غير متاح')}</div>`;
  let body = '';
  if (ch.kind === 'novel') {
    body = `<article class="novel-page"><h2>${esc(ch.title || 'الفصل')}</h2>${(ch.content || '').split(/\n+/).map(p => `<p>${esc(p)}</p>`).join('')}</article>`;
  } else {
    const imgs = ch.pages || [];
    const urls = [];
    for (const path of imgs) {
      const r = await sb.storage.from('chapters').createSignedUrl(path, 3600);
      if (r.data?.signedUrl) urls.push(r.data.signedUrl);
    }
    body = urls.map((u, i) => `<img class="reader-image" src="${esc(u)}" alt="صفحة ${i + 1}" loading="lazy">`).join('') || '<div class="panel">لا توجد صفحات.</div>';
  }
  return `<div class="reader-bar">
    <button class="btn sm ghost" onclick="go('work','${ch.work_id}')">→ رجوع</button>
    <div class="reader-title">${esc(ch.work_title)} — الفصل ${ch.number}</div>
  </div>
  <div class="reader-body">${body}</div>`;
}

async function vTeams() {
  const { data } = await sb.from('teams').select('*').eq('published', true).order('name');
  return `<div class="sec-title">🛡️ فرق الترجمة</div>
  <div class="notice">يمكن لكل فريق إدارة أعماله وفصوله من حسابه بعد منحه الصلاحية.</div>
  <div class="grid2">${(data || []).map(t => `<div class="team-card">
    <h3>🛡️ ${esc(t.name)}</h3>
    <div class="team-stats"><span>🎭 ${esc(t.role || '')}</span></div>
    <p style="color:var(--muted);line-height:1.8">${esc(t.description || '')}</p>
    ${t.support_wallet ? `<div class="wallet-box">${esc(t.support_wallet)}</div><button class="btn sm" onclick="copyTxt('${esc(t.support_wallet)}')">📋 نسخ العنوان</button>` : ''}
  </div>`).join('')}</div>`;
}

async function vJoin() {
  return `<div class="sec-title">🤝 انضم كمساعد</div>
  <div class="notice">أرسل طلبك؛ سيظهر للمشرفين في لوحة الإدارة.</div>
  <div class="panel" style="max-width:650px">
    <div class="field"><label>الاسم</label><input id="jName"></div>
    <div class="field"><label>البريد / تيليجرام</label><input id="jContact"></div>
    <div class="field"><label>الدور</label><select id="jRole"><option>مترجم</option><option>مبيّض</option><option>مدقق لغوي</option><option>رافع فصول</option></select></div>
    <div class="field"><label>اللغات</label><input id="jLangs"></div>
    <div class="field"><label>نبذة / أعمال سابقة</label><textarea id="jBio"></textarea></div>
    <button class="btn" onclick="submitJoin()">إرسال الطلب</button>
  </div>`;
}

async function submitJoin() {
  if (!session) return go('auth');
  const payload = { name: $('#jName').value.trim(), contact: $('#jContact').value.trim(), role: $('#jRole').value, langs: $('#jLangs').value.trim(), bio: $('#jBio').value.trim() };
  if (!payload.name || !payload.contact) return toast('أكمل الحقول المطلوبة');
  const { error } = await sb.from('join_requests').insert({ user_id: session.user.id, ...payload });
  toast(error ? error.message : '✅ تم إرسال الطلب');
  if (!error) route();
}

async function vAuth() {
  return `<div class="sec-title">🔐 حسابك</div>
  <div class="panel" style="max-width:440px;margin:auto">
    ${session ? `<p>مسجل الدخول باسم <b>${esc(profile?.username || session.user.email)}</b></p>
      <button class="btn danger" style="margin-top:15px" onclick="signOut()">تسجيل الخروج</button>` : `
      <div class="field"><label>البريد الإلكتروني</label><input id="email" type="email"></div>
      <div class="field"><label>كلمة المرور</label><input id="pass" type="password"></div>
      <button class="btn" onclick="signIn()">تسجيل الدخول</button>
      <button class="btn ghost" style="margin-inline-start:6px" onclick="signUp()">إنشاء حساب</button>
      <p style="color:var(--muted);font-size:0.8rem;margin-top:12px">سيصلك بريد تأكيد حسب إعدادات Auth في Supabase.</p>`}
  </div>`;
}

async function signIn() {
  const { error } = await sb.auth.signInWithPassword({ email: $('#email').value.trim(), password: $('#pass').value });
  if (error) toast(error.message);
  else { toast('تم تسجيل الدخول'); route(); }
}

async function signUp() {
  const email = $('#email').value.trim(), password = $('#pass').value;
  if (password.length < 8) return toast('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  const { error } = await sb.auth.signUp({ email, password });
  toast(error ? error.message : 'تم إنشاء الحساب؛ تحقق من بريدك الإلكتروني');
}

async function signOut() {
  await sb.auth.signOut();
  toast('تم تسجيل الخروج');
  route();
}

async function vPoints() {
  if (!session) return `<div class="panel"><h2>🪙 النقاط</h2><p style="margin:10px 0">سجّل الدخول لإدارة رصيدك.</p><button class="btn" onclick="go('auth')">تسجيل الدخول</button></div>`;
  const { data } = await sb.rpc('get_my_balance');
  const balance = data?.balance || 0;
  const { data: packs } = await sb.from('point_packs').select('*').eq('active', true).order('sort_order');
  return `<div class="sec-title">🪙 رصيدك: ${balance} نقطة</div>
  <div class="notice">شراء النقاط هنا ينشئ طلب دفع فقط. لن تتم إضافة النقاط حتى يؤكد المشرف الدفع.</div>
  <div class="panel" style="max-width:700px">
    <h3 style="margin-bottom:14px">🛒 حزم النقاط</h3>
    ${(packs || []).map(p => `<div class="pack">
      <div><div class="pts">${p.points} نقطة</div><div style="color:var(--muted);font-size:.8rem">${p.bonus_text || ''}</div></div>
      <div><b>${p.usdt_price} USDT</b> <button class="btn sm" style="margin-inline-start:8px" onclick="createPayment('${p.id}')">طلب الشراء</button></div>
    </div>`).join('')}
    <div class="wallet-box">عنوان الدفع: يتم ضبطه من لوحة الإدارة في جدول settings</div>
  </div>`;
}

async function createPayment(packId) {
  const { data, error } = await sb.rpc('create_payment_request', { p_pack_id: packId });
  if (error) toast(error.message);
  else toast('تم إنشاء طلب الدفع رقم ' + data.reference + '. أرسِل المبلغ ثم احتفظ برقم العملية وأرسله للإدارة.');
}

async function vSearch(q) {
  const { data } = await sb.from('works').select('*').eq('published', true).ilike('title', `%${q || ''}%`);
  return `<div class="sec-title">🔍 نتائج البحث: ${esc(q || '')}</div>
  <div class="grid">${(data || []).map(cardHTML).join('') || '<p>لا نتائج.</p>'}</div>`;
}

async function vAdmin() {
  if (profile?.role !== 'admin') return `<div class="panel"><h2>⛔ غير مصرح</h2><p>هذه الصفحة للمشرفين فقط.</p></div>`;
  const [{ count: users }, { count: works }, { count: joins }, { count: payments }] = await Promise.all([
    sb.from('profiles').select('*', { count: 'exact', head: true }),
    sb.from('works').select('*', { count: 'exact', head: true }),
    sb.from('join_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('payment_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
  ]);
  const { data: ws } = await sb.from('works').select('id,title').order('created_at', { ascending: false });
  const { data: ps } = await sb.from('payment_requests').select('id,reference,tx_hash,status,created_at,point_packs(points,usdt_price),profiles(username)').eq('status', 'pending').order('created_at', { ascending: false });
  const { data: js } = await sb.from('join_requests').select('id,name,contact,role,langs,bio,status,created_at,profiles(username)').eq('status', 'pending').order('created_at', { ascending: false });
  return `<div class="sec-title">🛠️ لوحة الإدارة</div>
  <div class="admin-grid">
    <div class="stat">المستخدمون<b>${users || 0}</b></div>
    <div class="stat">الأعمال<b>${works || 0}</b></div>
    <div class="stat">طلبات الانضمام<b>${joins || 0}</b></div>
    <div class="stat">دفعات معلقة<b>${payments || 0}</b></div>
  </div>
  <div class="sec-title">➕ إضافة عمل</div>
  <div class="panel">
    <div class="admin-grid">
      <div class="field"><label>العنوان</label><input id="awTitle"></div>
      <div class="field"><label>النوع</label><select id="awType"><option>مانهوا</option><option>مانجا</option><option>رواية</option><option>كوميكس</option></select></div>
      <div class="field"><label>القسم</label><select id="awKind"><option value="comic">كوميكس</option><option value="novel">رواية</option></select></div>
      <div class="field"><label>العمر</label><select id="awAge"><option>13+</option><option>16+</option><option>18+</option></select></div>
    </div>
    <div class="field"><label>الأنواع مفصولة بفاصلة</label><input id="awGenres" placeholder="أكشن, فانتازيا"></div>
    <div class="field"><label>رابط صورة الغلاف (اختياري)</label><input id="awCover" placeholder="https://..."></div>
    <div class="field"><label>الملخص</label><textarea id="awSyn"></textarea></div>
    <button class="btn" onclick="adminAddWork()">حفظ العمل</button>
  </div>
  <div class="sec-title">➕ إضافة فصل</div>
  <div class="panel">
    <div class="field"><label>العمل</label><select id="acWork">${(ws || []).map(w => `<option value="${w.id}">${esc(w.title)}</option>`).join('')}</select></div>
    <div class="admin-grid">
      <div class="field"><label>رقم الفصل</label><input id="acNum" type="number"></div>
      <div class="field"><label>عنوان الفصل</label><input id="acTitle"></div>
      <div class="field"><label>النوع</label><select id="acKind"><option value="novel">رواية</option><option value="comic">كوميكس</option></select></div>
      <div class="field"><label>مقفل؟</label><select id="acLock"><option value="false">لا</option><option value="true">نعم</option></select></div>
    </div>
    <div class="field"><label>نص الرواية (اتركه فارغًا للكوميكس)</label><textarea id="acContent" style="min-height:180px"></textarea></div>
    <div class="field"><label>صور الفصل (اختياري — اختر عدة صور)</label><input id="acFiles" type="file" accept="image/*" multiple></div>
    <button class="btn" onclick="adminAddChapter()">حفظ الفصل</button>
  </div>
  <div class="sec-title">💰 الدفعات المعلقة</div>
  <div class="panel table-wrap">
    <table class="table">
      <tr><th>المرجع</th><th>المستخدم</th><th>المبلغ</th><th>TX Hash</th><th>إجراء</th></tr>
      ${(ps || []).map(p => `<tr><td>${esc(p.reference)}</td><td>${esc(p.profiles?.username || '')}</td><td>${p.point_packs?.usdt_price} USDT</td><td><input id="tx-${p.id}" placeholder="TX hash"></td><td><button class="btn sm" onclick="reviewPay('${p.id}','paid')">تأكيد</button> <button class="btn sm danger" onclick="reviewPay('${p.id}','rejected')">رفض</button></td></tr>`).join('') || '<tr><td colspan="5">لا توجد دفعات.</td></tr>'}
    </table>
  </div>
  <div class="sec-title">🤝 طلبات الانضمام</div>
  <div class="panel table-wrap">
    <table class="table">
      <tr><th>الاسم</th><th>الدور</th><th>التواصل</th><th>إجراء</th></tr>
      ${(js || []).map(j => `<tr><td>${esc(j.name)}</td><td>${esc(j.role)}</td><td>${esc(j.contact)}</td><td><button class="btn sm" onclick="reviewJoin('${j.id}','approved')">قبول</button> <button class="btn sm danger" onclick="reviewJoin('${j.id}','rejected')">رفض</button></td></tr>`).join('') || '<tr><td colspan="4">لا توجد طلبات.</td></tr>'}
    </table>
  </div>`;
}

async function adminAddWork() {
  const payload = {
    title: $('#awTitle').value.trim(),
    type: $('#awType').value,
    kind: $('#awKind').value,
    age_rating: $('#awAge').value,
    genres: $('#awGenres').value.split(',').map(x => x.trim()).filter(Boolean),
    synopsis: $('#awSyn').value.trim(),
    cover_url: $('#awCover').value.trim() || null,
    published: true,
    owner_id: session.user.id
  };
  if (!payload.title) return toast('أدخل العنوان');
  const { error } = await sb.from('works').insert(payload);
  toast(error ? error.message : '✅ تم إضافة العمل');
  if (!error) route();
}

async function adminAddChapter() {
  const work_id = $('#acWork').value,
    number = Number($('#acNum').value),
    title = $('#acTitle').value.trim(),
    kind = $('#acKind').value,
    is_locked = $('#acLock').value === 'true',
    content = $('#acContent').value;
  const { data: ch, error } = await sb.from('chapters').insert({ work_id, number, title, kind, is_locked, content, published: true }).select().single();
  if (error) return toast(error.message);
  const files = [...($('#acFiles').files || [])];
  const paths = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i], path = `${ch.id}/${String(i + 1).padStart(3, '0')}-${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const r = await sb.storage.from('chapters').upload(path, f, { upsert: true });
    if (r.error) return toast(r.error.message);
    paths.push(path);
  }
  if (paths.length) await sb.from('chapters').update({ pages: paths, kind: 'comic' }).eq('id', ch.id);
  toast('✅ تم إضافة الفصل');
  route();
}

async function reviewPay(id, status) {
  const tx = $(`#tx-${id}`)?.value.trim() || null;
  const { error } = await sb.rpc('admin_review_payment', { p_id: id, p_status: status, p_note: tx ? `TX: ${tx}` : null });
  toast(error ? error.message : 'تم تحديث الدفع');
  if (!error) route();
}

async function reviewJoin(id, status) {
  const { error } = await sb.from('join_requests').update({ status }).eq('id', id);
  toast(error ? error.message : 'تم تحديث الطلب');
  if (!error) route();
}

async function copyTxt(t) {
  try { await navigator.clipboard.writeText(t); toast('📋 تم النسخ'); }
  catch { toast('انسخ العنوان يدويًا'); }
}

async function route() {
  const h = location.hash.replace(/^#\/?/, '').split('/');
  const page = h[0] || 'home', id = h[1];
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('on', a.dataset.r === page));
  app.innerHTML = '<div class="loading">جارٍ التحميل…</div>';
  try {
    if (!sb) return boot();
    let html;
    if (page === 'home') html = await vHome();
    else if (page === 'comics') html = await vBrowse('comic');
    else if (page === 'novels') html = await vBrowse('novel');
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
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="error">حدث خطأ: ${esc(e.message)}</div>`;
  }
}

window.addEventListener('hashchange', route);
boot();