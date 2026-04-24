# دليل إنشاء وتوقيع تطبيق الأندرويد (Release Signing)

لضمان إمكانية تحديث التطبيق دون مشاكل في "اختلاف التوقيع"، يجب استخدام ملف `keystore` ثابت.

## 1. إنشاء ملف Keystore جديد
افتح المحطة (Terminal) في جهازك ونفذ الأمر التالي لإنشاء ملف مفاتيح جديد:

```bash
keytool -genkey -v -keystore release.keystore -alias rps-cards-key -keyalg RSA -keysize 2048 -validity 10000
```

### شرح البارامترات:
- `release.keystore`: اسم الملف الذي سيتم إنشاؤه.
- `rps-cards-key`: الاسم المستعار للمفتاح (Alias)، ستحتاجه في ملف الإعدادات.
- `validity 10000`: مدة صلاحية المفتاح بالأيام (حوالي 27 سنة).

**ملاحظة:** سيطلب منك إدخال كلمة مرور (Password). **احفظها جيداً** هي والـ Alias، بدونهما لن تستطيع تحديث التطبيق أبداً.

## 2. مكان وضع الملف
بعد إنشاء ملف `release.keystore` قم بنقله إلى المسار التالي في مشروعك:
`android/app/release.keystore`

## 3. إعدادات البناء (Gradle Configuration)
تم تعديل ملف `android/app/build.gradle` ليقوم بالبحث عن هذا الملف واستخدامه تلقائياً عند بناء نسخة الـ Release.

## 4. أوامر بناء النسخة النهائية

### بناء APK (للتثبيت المباشر):
```bash
cd android && ./gradlew assembleRelease
```
المسار الناتج: `android/app/build/outputs/apk/release/app-release.apk`

### بناء AAB (للرفع على متجر Google Play):
```bash
cd android && ./gradlew bundleRelease
```
المسار الناتج: `android/app/build/outputs/bundle/release/app-release.aab`

## 5. الأتمتة عبر GitHub Actions
تم تحديث ملف `.github/workflows/android_build.yml` ليقوم ببناء كل من APK و AAB (Release) تلقائياً عند الدفع (Push) أو التشغيل اليدوي للـ Workflow. سيتم رفع الملفات الناتجة إلى Google Drive في مجلد `/RPS-Cards_Builds/Release`.

## 6. ملاحظة أمنية
يُفضل عدم رفع ملف الـ `keystore` إلى Github إذا كان المستودع عاماً. لكن بما أنك تستعمل بيئة تطوير خاصة، تأكد من الاحتفاظ بنسخة احتياطية من الملف في مكان آمن (Cloud Storage مثلاً).
