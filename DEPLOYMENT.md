# تعليمات النشر على Vercel

هذا الدليل يوضح كيفية نشر التطبيق على منصة Vercel.

## المتطلبات الأساسية

1. حساب على [Vercel](https://vercel.com)
2. تثبيت [Vercel CLI](https://vercel.com/cli)
3. Node.js (الإصدار 16.8 أو أحدث)
4. Git

## خطوات النشر

### 1. إعداد المشروع محليًا

1. استنسخ المستودع:
   ```bash
   git clone <repository-url>
   cd personal-website
   ```

2. قم بتثبيت التبعيات:
   ```bash
   npm install
   ```

3. انسخ ملف البيئة:
   ```bash
   cp env.example .env.local
   ```

4. قم بتعديل ملف `.env.local` وأضف القيم المناسبة:
   ```env
   DATABASE_URL="your-database-url"
   NEXTAUTH_SECRET=your-secret-key
   NEXTAUTH_URL=http://localhost:3000
   OPENWEATHER_API_KEY=your-api-key
   ```

### 2. إعداد قاعدة البيانات

1. قم بتشغيل عمليات الهجرة:
   ```bash
   npx prisma migrate deploy
   ```

2. قم ببذل بيانات أولية (اختياري):
   ```bash
   npm run db:seed
   ```

### 3. النشر على Vercel

#### الطريقة الأولى: استخدام واجهة الويب

1. قم بتسجيل الدخول إلى [Vercel Dashboard](https://vercel.com/dashboard)
2. انقر على "New Project"
3. اختر مستودع GitHub الخاص بك
4. قم بتعيين إعدادات المشروع:
   - Framework Preset: Next.js
   - Root Directory: (اتركه فارغًا إذا كان المشروع في الجذر)
   - Build Command: `npm run vercel-build`
   - Output Directory: `.next`
   - Install Command: `npm install`

5. أضف متغيرات البيئة من ملف `.env.local`
6. انقر على "Deploy"

#### الطريقة الثانية: استخدام Vercel CLI

1. قم بتسجيل الدخول إلى Vercel:
   ```bash
   vercel login
   ```

2. قم بنشر المشروع:
   ```bash
   vercel
   ```

3. اتبع التعليمات في الطرفية لإكمال النشر

### 4. إعداد النطاق المخصص (اختياري)

1. انتقل إلى Dashboard المشروع على Vercel
2. انتقل إلى قسم "Domains"
3. أضف النطاق الخاص بك واتبع التعليمات للتحقق منه

## استكشاف الأخطاء وإصلاحها

### مشاكل قاعدة البيانات

- تأكد من صحة `DATABASE_URL` في متغيرات البيئة
- تأكد من أن قاعدة البيانات متاحة من خوادم Vercel
- تحقق من سجلات Vercel للتعرف على أخطاء الاتصال بقاعدة البيانات

### مشاكل المصادقة

- تأكد من تعيين `NEXTAUTH_SECRET`
- تأكد من تعيين `NEXTAUTH_URL` بشكل صحيح (يجب أن يتطابق مع عنوان URL الخاص بالتطبيق)

### مشاكل OpenWeather API

- تأكد من صحة `OPENWEATHER_API_KEY`
- تحقق من أن مفتاح API لديه الأذونات اللازمة

## الترقية إلى الإنتاج

1. قم بإنشاء فرع `production`:
   ```bash
   git checkout -b production
   ```

2. قم بتحديث المتغيرات البيئية في إعدادات Vercel لاستخدام قيم الإنتاج

3. قم بتفعيل النشر التلقائي من فرع `production`

## الدعم

إذا واجهت أي مشاكل، يرجى فتح issue في مستودع GitHub أو الرجوع إلى وثائق [Vercel](https://vercel.com/docs).
