# تفكيك (Tafkeek)

تطبيق تعليمي يشرح **"كيف تعمل الأشياء"** بشرح بصري مبسّط بالذكاء الاصطناعي، بثلاثة مستويات (فضولي صغير / متعلّم / مختص).

## الـ Stack

| الطبقة | التقنية |
|---|---|
| الواجهة + الخلفية | Next.js 16 (App Router) + TypeScript + Tailwind v4 — RTL عربي |
| الذكاء الاصطناعي | Vercel AI SDK + AI Gateway — نماذج Claude (`generateObject` + Zod) |
| المخططات التقنية | رسم برمجي (SVG) — دقّة نص عربي 100% (لا مولّد صور للنص) |
| قاعدة البيانات | PostgreSQL (Neon) + Prisma — Schema في `prisma/schema.prisma` |
| الاستضافة | Vercel (Fluid Compute) |

## التشغيل

```bash
npm install
cp .env.example .env.local   # ثم ضع AI_GATEWAY_API_KEY
npm run dev
```

افتح http://localhost:3000

### تفعيل حفظ البيانات (اختياري)

```bash
# ضع DATABASE_URL في .env.local ثم:
npm run db:generate
npm run db:push
```
ثم أزل التعليق عن كتلة الحفظ في `app/api/explain/route.ts`.

## البنية

```
app/
  layout.tsx              # RTL + خط عربي (IBM Plex Sans Arabic)
  page.tsx                # واجهة البحث (المرحلة الرابعة)
  api/explain/route.ts    # نقطة توليد الشرح المنظّم
lib/ai/
  schema.ts               # مخطط Zod للمخرجات الثلاثية (شرح + خطوات + مخطط)
  explain.ts              # استدعاء Claude حسب المستوى
components/
  search-box.tsx
  level-switcher.tsx
  explanation-view.tsx
  diagram/DiagramRenderer.tsx   # محرّك المخطط (SVG عربي دقيق — المرحلة الثالثة)
prisma/schema.prisma      # هيكل البيانات (المرحلة الثانية)
```
