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

## 5. الأتمتة عبر GitHub Actions (الطريقة الاحترافية)

لتجنب رفع ملف الـ Keystore مباشرة إلى Github (مما قد يعرضه للسرقة أو التلف)، يفضل استخدامه كـ **Secret**:

1. **تحويل الملف إلى Base64:**
   قم بتنفيذ هذا الأمر في جهازك للحصول على نص مشفر للملف:
   ```bash
   base64 -w 0 android/app/release.keystore > keystore_base64.txt
   ```
2. **إضافة الأسرار (GitHub Secrets):**
   اذهب إلى إعدادات الريبو في GitHub -> Secrets and variables -> Actions وأضف الأسرار التالية:
   - `RELEASE_KEYSTORE_BASE64`: الصق محتوى ملف `keystore_base64.txt`.
   - `RELEASE_STORE_PASSWORD`: كلمة مرور المستودع.
   - `RELEASE_KEY_ALIAS`: الاسم المستعار (rps-cards-key).
   - `RELEASE_KEY_PASSWORD`: كلمة مرور المفتاح.

سيقوم الـ Workflow آلياً بفك تشفير الملف واستخدامه أثناء البناء.

## 6. ملاحظة أمنية هامّة
- **لا تقم أبداً** بمشاركة ملف الـ `keystore` أو كلمات المرور مع أي شخص.
- إذا فقدت ملف الـ `keystore` أو نسيت كلمة المرور، **لن تتمكن** من تحديث التطبيق على متجر جوجل بلاي نهائياً.
- تم حذف النسخة التالفة التي تم إنشاؤها سابقاً آلياً، يرجى إنشاء ملفك الخاص ورفعه يدوياً أو استخدامه كـ Secret.
