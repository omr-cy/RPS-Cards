# خطة العمل القادمة (TODO) - تحسين تجربة الأندرويد (Native Experience)

بناءً على التحليل المعماري الذي ناقشناه حول جعل التطبيق يمتد بكامل الشاشة (Edge-to-Edge) وتوحيد شاشة البداية (Splash Screen) لمنع الومضة البيضاء، إليك الخطوات المتبقية التي نحتاج لتنفيذها في مشروعنا الحالي للوصول إلى هذا "المعيار الذهبي":

## 1. تعديلات طبقة الأندرويد (Native XML)
- [ ] **إنشاء/تعديل ملف الألوان (`colors.xml`):**
  - المسار: `android/app/src/main/res/values/colors.xml`
  - إضافة لون الخلفية الأساسي للتطبيق (مثلاً `#020818` ليتطابق مع `slate-950` المستخدم في لعبتنا).
- [ ] **تعديل ملف الثيمات (`themes.xml`):**
  - المسار: `android/app/src/main/res/values/themes.xml`
  - ربط لون خلفية الـ Splash Screen باللون الذي حددناه.
  - جعل `statusBarColor` و `navigationBarColor` شفافين (`@android:color/transparent`) للسماح للمحتوى بالتمدد تحتهما.

## 2. إضافات Capacitor (Capacitor Plugins)
- [ ] **تثبيت إضافة شريط الحالة:**
  - تشغيل الأمر: `npm install @capacitor/status-bar`
  - الهدف: التحكم في شريط الحالة من داخل كود React (جعله يطفو فوق المحتوى `overlay: true`).
- [ ] **تثبيت إضافة شاشة البداية:**
  - تشغيل الأمر: `npm install @capacitor/splash-screen`
  - الهدف: إخفاء شاشة البداية برمجياً فقط بعد أن يتم تحميل كود React بالكامل لمنع أي ومضة بيضاء.
- [ ] **مزامنة التعديلات:**
  - تشغيل الأمر: `npx cap sync android`

## 3. تعديلات طبقة الويب (React / Tailwind)
- [ ] **تفعيل الـ Overlay في `App.tsx`:**
  - استدعاء `StatusBar.setOverlaysWebView({ overlay: true })` عند بدء تشغيل التطبيق.
  - استدعاء `StatusBar.setStyle({ style: Style.Dark })` لضمان وضوح أيقونات البطارية والساعة (لأن خلفيتنا داكنة).
- [ ] **حماية المحتوى (Safe Areas):**
  - إضافة `paddingTop: 'env(safe-area-inset-top)'` و `paddingBottom: 'env(safe-area-inset-bottom)'` للحاوية الرئيسية في `App.tsx`.
  - الهدف: منع تداخل أزرار اللعبة أو النصوص مع "النوتش" (Notch) أو شريط التنقل السفلي في الهواتف الحديثة.

---
**ملاحظة:** لقد قمنا بالفعل في الخطوة السابقة بتعديل `MainActivity.java` لتفعيل وضع الـ Immersive، ولكن تطبيق هذه الخطوات سيكمل التجربة ويجعلها أكثر استقراراً وتوافقاً مع معايير أندرويد الحديثة.
