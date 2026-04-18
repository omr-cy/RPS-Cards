# خطوات بناء تطبيق Android لـ RPS-Cards

هذا الملف يحتوي على الخطوات التي استخدمتُها لبناء التطبيق من الصفر في بيئة هذا الريبو.

## 1. قراءة ملف الـ Workflow
- الملف الأساسي الموجود في المستودع: `.github/workflows/android_bulid.yml`
- يقوم بالخطوات التالية:
  1. checkout
  2. setup node 22
  3. npm install
  4. npm run build
  5. setup java 21
  6. توليد أيقونة PNG من `assets/icon.base64`
  7. `npx @capacitor/assets generate --android`
  8. `npx cap sync android`
  9. إعادة توليد gradle wrapper
  10. `./gradlew assembleDebug --stacktrace --info`
  11. رفع الـ APK إلى Google Drive عبر rclone

## 2. خطوات البناء اليدوية
شغل الأوامر من جذر المشروع (`/workspaces/RPS-Cards`):

```bash
cd /workspaces/RPS-Cards
npm install
npm run build
npx cap sync android
cd android
chmod +x gradlew
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH="$JAVA_HOME/bin:$PATH"
./gradlew assembleDebug --stacktrace --info
```

## 3. متى تحتاج إعدادات إضافية
إذا كان جهازك لا يحتوي على Java JDK أو Android SDK:

### تثبيت JDK 21
```bash
sudo apt-get install -y openjdk-21-jdk-headless
```

### تثبيت Android SDK tools
```bash
sudo apt-get install -y google-android-cmdline-tools-13.0-installer android-sdk-common
```

### إنشاء SDK محلي وقبول الرخص
```bash
mkdir -p "$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH="$JAVA_HOME/bin:$PATH"
/usr/lib/android-sdk/cmdline-tools/13.0/bin/sdkmanager --sdk_root="$ANDROID_SDK_ROOT" "platforms;android-36" "build-tools;35.0.0" "platform-tools"
printf "y\n%.0s" {1..200} | /usr/lib/android-sdk/cmdline-tools/13.0/bin/sdkmanager --sdk_root="$ANDROID_SDK_ROOT" --licenses
```

### إذا احتاج Gradle معرفة SDK path
- أضف ملف `android/local.properties` مع السطر:

```text
sdk.dir=/home/codespace/Android/Sdk
```

## 4. ملف الـ APK الناتج
- ملف الـ APK الناتج بعد البناء: `android/app/build/outputs/apk/debug/app-debug.apk`

## 5. ملاحظات إضافية
- تم استخدام `capacitor.config.json` في جذر المشروع أثناء البناء.
- إذا واجهت مشاكل في `capacitor`، تأكد من تشغيل الأوامر من جذر المشروع وليس من داخل مجلد `android`.
- الأوامر السابقة تفترض بيئة Linux ووجود صلاحيات لتثبيت الحزم عبر `apt`.
