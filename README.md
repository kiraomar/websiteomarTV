# MovieBox Discovery UI

واجهة ثابتة لـ GitHub Pages. ارفع `index.html` و`app.js` و`style.css` إلى المستودع وفعّل Pages.

## تحليل MovieBoxProvider.cs3

تم تصحيح شكل الطلبات في `app.js` بعد قراءة كود الإضافة:

- البحث `POST /wefeed-mobile-bff/subject-api/search/v2` بجسم JSON يحتوي `page` و`perPage` و`keyword`.
- القائمة `POST /wefeed-mobile-bff/subject-api/list` بجسم JSON يحتوي إعدادات التصفح.
- التفاصيل `GET /wefeed-mobile-bff/subject-api/get?subjectId=...`.
- أسماء الرؤوس في الإضافة تشمل `x-client-token` و`x-tr-signature` و`x-client-info` و`x-client-status`، مع `Authorization: Bearer ...` بعد جلب رمز الضيف. رمز العميل صيغته `timestamp,md5(reverse(timestamp))`.

## قيد النشر الثابت

هذه النسخة ترسل بعض رؤوس العميل وجسم الطلب الصحيح، لكنها لا تستطيع وحدها إكمال الطلبات التي تتطلب توقيع HMAC ورمز الضيف. كما أن المتصفح يمنع تغيير `User-Agent`، وقد تمنع سياسة CORS طلبات MovieBox من نطاق GitHub Pages. لذلك قد تظل النتائج فارغة حتى عند صحة المسارات.

لجلب المحتوى بصورة موثوقة يلزم وسيط API يعمل من جهة الخادم ويضيف توقيع MovieBox ورمز الضيف ثم يتيح CORS للواجهة. يمكن إبقاء الشيفرة والواجهة في GitHub، لكن استضافة GitHub Pages وحدها لا تشغّل هذا الوسيط.
