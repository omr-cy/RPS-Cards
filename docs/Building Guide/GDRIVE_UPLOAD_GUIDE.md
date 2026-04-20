# دليل رفع ملفات APK إلى Google Drive باستخدام GitHub Actions

هذا الدليل يشرح كيفية إعداد نظام رفع تلقائي لملفات الـ APK الناتجة عن عملية البناء (Build) مباشرة إلى حسابك في Google Drive، وذلك لتجنب قيود مساحة التخزين في GitHub.

## المتطلبات
1. حساب Google Drive.
2. تثبيت `rclone` على جهازك الشخصي (للإعداد الأولي فقط).

---

## الخطوة الأولى: إعداد rclone على جهازك
يجب الحصول على "رمز الوصول" (Token) الخاص بجوجل درايف من خلال جهازك الشخصي:

1. افتح Terminal (أو CMD) وشغل الأمر:
   ```bash
   rclone config
   ```
2. اختر `n` لإنشاء Remote جديد.
3. سمِّه `gdrive`.
4. ابحث عن رقم `Google Drive` في القائمة واكتبه.
5. اترك `client_id` و `client_secret` فارغين (اضغط Enter).
6. اختر `1` للصلاحيات الكاملة (Full access).
7. اترك `root_folder_id` و `service_account_file` فارغين.
8. عند سؤالك عن `Edit advanced config` اختر `n`.
9. عند سؤالك عن `Use auto config` اختر `y`.
10. سيفتح المتصفح، سجل دخول بحساب جوجل واقبل الصلاحيات.
11. بعد الانتهاء، سيظهر لك كود الـ Config في الـ Terminal. انسخه بالكامل.

---

## الخطوة الثانية: إضافة الإعدادات إلى GitHub
1. اذهب إلى مستودعك (Repository) على GitHub.
2. اختر **Settings** -> **Secrets and variables** -> **Actions**.
3. اضغط على **New repository secret**.
4. الاسم: `RCLONE_CONFIG`.
5. القيمة: الصق محتوى ملف الـ config الذي حصلت عليه (تأكد من شمول الأقواس `[gdrive]`).

---

## الخطوة الثالثة: هيكلة ملف الـ Workflow
تم تحديث ملف `.github/workflows/android_bulid.yml` ليشمل الخطوات التالية تلقائياً:

```yaml
      - name: Install rclone
        run: |
          curl https://rclone.org/install.sh | sudo bash

      - name: Load rclone config
        run: |
          mkdir -p ~/.config/rclone
          echo "${{ secrets.RCLONE_CONFIG }}" > ~/.config/rclone/rclone.conf

      - name: Upload APK to Google Drive
        run: |
          TIMESTAMP=$(date +%Y%m%d_%H%M%S)
          NEW_NAME="CardClash_$TIMESTAMP.apk"
          cp android/app/build/outputs/apk/debug/app-debug.apk ./$NEW_NAME
          rclone copy ./$NEW_NAME gdrive:/CardClash_Builds
```

---

## كيف يعمل النظام؟
1. **التثبيت:** يقوم GitHub Actions بتحميل أداة `rclone` في كل مرة يبدأ فيها الـ Build.
2. **التحقق:** يتم استدعاء الـ Token المخزن في Secrets لفتح الاتصال بجوجل درايف.
3. **التسمية:** يتم إضافة تاريخ ووقت البناء لاسم الملف (مثال: `CardClash_20260416_103000.apk`).
4. **الرفع:** يتم إرسال الملف إلى مجلد `CardClash_Builds` في الـ Drive الخاص بك.

---

## حل المشاكل الشائعة (Troubleshooting)

### خطأ `open n: no such file or directory`
هذا الخطأ يحدث إذا قمت بكتابة حرف `n` بالخطأ في خانة `service_account_file` أثناء الإعداد.
**الحل:** لقد قمت بتحديث الكود ليقوم بحذف هذا السطر تلقائياً، ولكن للأفضل تأكد من أن ملف الـ Config في GitHub لا يحتوي على سطر يبدأ بـ `service_account_file = n`.

### خطأ `Token expired`
إذا توقف الرفع فجأة، قم بإعادة تشغيل `rclone config` على جهازك للحصول على Token جديد وتحديثه في GitHub Secrets.
