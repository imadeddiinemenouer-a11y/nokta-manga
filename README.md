# نُقطة مانجا — نسخة حقيقية

هذه النسخة تفصل الواجهة عن البيانات الحساسة باستخدام Supabase. الواجهة يمكن استضافتها على GitHub Pages، بينما Supabase يوفر Auth وPostgres وStorage.

## 1) إنشاء المشروع
1. أنشئ مشروعًا على Supabase.
2. افتح SQL Editor والصق `supabase/schema.sql` ثم نفّذه.
3. من Authentication فعّل Email/Password.
4. أنشئ أول حساب من الموقع.
5. خذ UUID للمستخدم من Authentication > Users، ثم نفّذ في SQL Editor:
   `update public.profiles set role='admin' where id='UUID-HERE';`

## 2) إعداد الواجهة
انسخ `config.example.js` إلى `config.js` وضع:
- Supabase Project URL
- Supabase Publishable Key

لا تضع Service Role أو Secret Key في `config.js` أو GitHub. Supabase يوصي باستخدام publishable key مع RLS، ويمنع كشف service-role/secret keys في الواجهة.

## 3) Storage للصور
أنشئ bucket خاصًا باسم `chapters` في Supabase Storage. اجعل رفع الملفات للمشرف/الفريق فقط، ثم اربط صلاحيات Storage مع RLS. الفصول المخزنة في `pages` تستخدم مسارات الملفات وليس روابط عامة.

## 4) النشر
يمكن رفع المشروع إلى GitHub وتشغيل GitHub Pages. لأن الموقع يعتمد على Hash Routing، لا يحتاج إعداد خادم خاص للمسارات.

## 5) ما أصبح حقيقيًا
- تسجيل حسابات عبر Supabase Auth.
- قاعدة بيانات بدل localStorage.
- RLS للصلاحيات.
- رصيد النقاط محفوظ في الخادم.
- فتح الفصل يتم عبر RPC مع خصم ذري للنقاط.
- شراء النقاط ينشئ طلب دفع ولا يمنح النقاط تلقائيًا.
- طلبات الانضمام محفوظة في قاعدة البيانات.
- لوحة Admin أولية.
- الفصول النصية محفوظة في قاعدة البيانات.
- صفحات الكوميكس تعتمد على Storage خاص وروابط موقعة.

## ما يحتاج حسابات/خدمات خارجية قبل الإطلاق التجاري
- بوابة إعلانات مكافِئة حقيقية: لا ينبغي تزوير مشاهدة إعلان بمؤقت JavaScript.
- تحقق آلي من USDT/Tron أو بوابة دفع. النسخة الحالية تستخدم مراجعة دفع يدوية حتى لا تمنح نقاطًا دون تحقق.
- SMTP مخصص للبريد إذا أردت رسائل موثوقة على نطاقك.
- نطاقك الخاص، إن رغبت.
