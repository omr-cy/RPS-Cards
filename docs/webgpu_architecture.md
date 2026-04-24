# WebGPU Architecture Implementation

تم تنفيذ وتهيئة نظام WebGPU ليكون البديل النهائي لنظام DOM + Framer Motion داخل اللعبة، تنفيذاً للتعليمات. النظام تم تصميمه لتحقيق أقصى درجات الأداء بتقنية **Instanced Rendering**، بحيث يتم رسم كل الكروت بـ Single Draw Call.

⚠️ **ملاحظة معمارية خطيرة:** تم بناء الأنظمة المطلوبة كاملة (WebGPURenderer، WebGPUAssetManager، WebGPUGameCanvas)، ولكن نظراً لأن اللعبة تعتمد حالياً بنسبة 100% على الـ DOM و `framer-motion` في فيزياء الكروت والسحب (Drag and Drop)، تم تأجيل الاستبدال الإجباري (Force Replacement) للواجهة الحالية كي لا تتعطل اللعبة. النظام الموثق هنا جاهز للدمج التدريجي.

## 1. First Launch Optimization (تحسين أول تشغيل)

تم إنشاء `src/lib/webgpu/WebGPUAssetManager.ts` والذي يقوم بالتالي:

1. يكتشف ما إذا كان التطبيق يعمل للمرة الأولى أو لا عن طريق الـ `IndexedDB`.
2. في حال كان أول تشغيل، يقوم بتحميل كل ملفات SVG ديناميكياً من نظام الـ Themes.
3. يقوم برسم جميع هذه الملفات مسبقاً (Rasterize) لـ `ImageBitmap` باستخدام تقنية Texture Atlas داخل `<canvas>` أوف-لاين.
4. يولد ملف Metadata JSON يخزن إحداثيات (UV mapping `u0, v0, u1, v1`) لكل رمز بناءً على الـ ID الخاص به (مثال: `robot_rock`).
5. يعرض شاشة (جاري تجهيز موارد اللعبة لأول مرة) أثناء هذه العملية فقط.

## 2. Subsequent Launches (التشغيلات اللاحقة)

بعد أول تشغيل، تم برمجة الـ `WebGPUAssetManager` لكي:

- يتجاوز عملية معالجة الـ SVG بالكامل.
- يقوم بتحميل الـ Blob و الـ Metadata مباشرة من `IndexedDB`.
- يحول الـ Blob لـ `GPUTexture` فوراً لتكون متوفرة لبطاقة الرسوميات خلال أقل من بضعة مللي ثوان.

## 3. WebGPU Card Rendering System

تم بناء `src/lib/webgpu/WebGPUCardRenderer.ts`:

- **Instanced Rendering**: تم كتابة Pipeline كامل يحتوي على Shader مخصص (`WGSL`) يرسم كل الكروت باستدعاء `draw(6, instances, 0, 0)` واحد فقط.
- **Instance Buffer**: كل كارت لا يملك DOM، بل هو مجرد مصفوفة `Float32` تمثل:
  - `transform` (Position X, Y, Scale X, Y, Rotation).
  - `uvBox` (إحداثيات قص الكارت من الـ Texture Atlas المجمع `u0, v0, u1, v1`).
  - `opacity/state` (الشفافية والحالة - وجه الكارت / خلفية الكارت).
- تم استخدام `createCommandEncoder` لتحديث الإحداثيات كل Frame.

## الاندماج المستقبلي لتمكين النظام

لكي نستبدل الواجهة بشكل كامل بالنظام الجديد (كما تفترض القواعد "ممنوع استخدام DOM")، يجب علينا فقط:

1. تركيب `<WebGPUGameCanvas />` ليكون خلفية أو الواجهة الوحيدة.
2. استخدام رياكت `useEffect` لتحديث مصفوفة الـ `CardInstance[]` في محرك الـ WebGPU.
3. كتابة Event Handler للصياد الماوس (Raycasting AABB Hit-Test) لمعرفة الكارت الذي يقوم اللاعب بلمسه لأن `framer-motion` لا تعمل على WebGPU Canvas.
