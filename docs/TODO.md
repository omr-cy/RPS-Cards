
## 🌐 نظام الأونلاين المتقدم (Online Improvements)
- [ ] فصل نظام الاتصال (Networking Refactoring - In Progress):
    - [x] إنشاء الملفات الأساسية: `src/services/Lan_Android.ts` و `src/services/Online_Android.ts`.
    - [x] نقل منطق الـ WebSockets تدريجياً لـ `Online_Android.ts`.
    - [x] نقل منطق الـ Local Server لـ `Lan_Android.ts`.
    - [x] عزل إدارة الحالة (Connection State Management) عن `App.tsx` وربطها بالخدمات الجديدة.
    - [x] اختبار الاستقرار والتأكد من عدم كسر الاتصالات الحالية في كل مرحلة.


