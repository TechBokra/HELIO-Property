# 1) خريطة النظام الفعلي — HELIO-Property

> أساس التدقيق: commit `9d30d50` على `main` (14 أكتوبر 2026). قراءة ساكنة للكود فقط.
> الوسوم: **[كود]** مؤكد من قراءة الملف · **[SQL]** من قراءة ملف SQL ولم يُختبر على قاعدة بيانات · **[غير متحقق]** لم أستطع التحقق.

## الصورة العامة

```
المتصفح (React SPA)  ──────────────►  Supabase (Postgres + Auth + Realtime)
  Vite 5 · React 18.3 · TS strict       مباشرةً بمفتاح anon، والأمان كله عبر RLS
  react-router 7 · TanStack Query 5
  Zustand · react-hook-form · zod
        │
        └──► /api/admin/credentials  (دالة Vercel serverless — الوحيدة التي تستخدم service_role)
```

| الطبقة | الواقع الفعلي | الدليل |
|---|---|---|
| الواجهة | SPA بـ Vite. لا SSR. المسارات: عامة / `my-dashboard` (عميل) / `dashboard` (شريك) / `admin` (إدارة) | `App.tsx` **[كود]** |
| مصدر البيانات | **Supabase مباشرة من المتصفح** عبر `supabase.from(...)` في `services/*.ts` | `lib/supabase.ts` **[كود]** |
| الجداول المستخدمة في الكود | `partners` `requests` `request_messages` `request_history` `properties` `property_history` `projects` `transactions` `decoration_categories` وغيرها. دالتان RPC فقط: `accept_finishing_quote` و`send_system_notification` | `grep` على `services/` **[كود]** |
| المصادقة | Supabase Auth (بريد/كلمة مرور). الملف الشخصي في جدول `partners` (id = auth.users.id) | `store/useAuthStore.ts` **[كود]** |
| الصلاحيات (واجهة) | `data/permissions.ts` يحوّل `type`+`role` إلى `Role` ثم قائمة `Permission`. `ProtectedRoute` يحجب الصفحات | **[كود]** |
| الصلاحيات (فعلية) | RLS + triggers في Postgres. الواجهة للعرض فقط | `supabase/migrations/*` **[SQL]** |
| الخادم | ملف واحد: `api/admin/credentials.ts` ← `server/credentialsEndpoint.ts` (إعادة تعيين كلمات المرور بتدقيق) | **[كود]** |
| النشر | Vercel (`vercel.json`: framework vite + rewrite SPA) | **[كود]**؛ ربط المستودع بـ Vercel **[غير متحقق]** |

## علاقة Supabase بـ Prisma

**Prisma غير مستخدم فعليًا.**
- `prisma/schema.prisma` ملف **تالف** (15 بايت من رموز غير مقروءة) **[كود]**.
- `prisma` و`@prisma/client` غير موجودين في `package.json` **[كود]**، و`prisma/seed.ts` ما زال يستورد `@prisma/client`.
- مصدر البنية الحقيقي هو SQL: `supabase/schema.sql` (2050 سطرًا) + 19 ملفًا في `supabase/migrations/`.
- مخطط قاعدة البيانات الحالي (`partners`, `requests`… بأحرف صغيرة وUUID) **يختلف جذريًا** عن الـ ZIP القديم `Only-Helio-main` (`"User"`, `"Lead"`…). لا نعتمد ذلك الـ ZIP كمرجع.

## المصادقة والأدوار (ما يحدث عند الدخول)

1. `signInWithPassword` ← جلب صف `partners` ← `mapPartnerTypeToRole(type, role)` ← دمج `customPermissions` **[كود]**.
2. التسجيل: `signUp` ثم **المتصفح نفسه** ينشئ صف `partners` عبر `createProfileForExistingUser` (يقرأ `type`/`role` من `user_metadata` الذي يتحكم فيه المستخدم). الحماية الوحيدة: trigger `protect_partner_privileged_fields` في قاعدة البيانات **[SQL]**.
3. الحالة تُخزَّن في `localStorage['onlyhelio-auth-storage']` وتُعاد قراءتها عند الفتح ثم يُعاد التحقق عبر `initialize()` **[كود]**.
4. حساب تجريبي `admin@onlyhelio.com` وكلمات مرور نصية في `data/partners.ts`، مسموحة **فقط** إذا `import.meta.env.DEV` **[كود]**.

## متغيرات البيئة (`.env.example`)

`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (خادم فقط، بدون بادئة VITE_ — صحيح)، `GEMINI_API_KEY`, و4 متغيرات Cloudinary (كلها `VITE_` فهي ظاهرة للمتصفح).

## المسارات المطلوبة

| المسار | كيف يعمل | الملاحظة |
|---|---|---|
| العقارات `/properties` | قراءة عامة من `properties` | RLS: الزائر يرى `active` و`sold` فقط **[SQL]** |
| المشروعات `/projects` | قراءة من `projects` | سياسات الإدراج/التعديل تشترط شريكًا `active` أو دورًا إداريًا **[SQL]** |
| إضافة عقار `/add-property` | مسار **عام** بلا تسجيل دخول؛ ينتهي بـ `addRequest(PROPERTY_LISTING_REQUEST)` (عبر `PaymentPage`) ← جدول `requests` | **[كود]** |
| طلب تشطيب `/request-service` | مسار **عام** ← `addRequest(LEAD)` ← `addLead` ← جدول `requests`؛ قبول عرض السعر عبر RPC `accept_finishing_quote` | **[كود]** |

> لم أُشغّل أي مسار. كل ما سبق قراءة كود.
