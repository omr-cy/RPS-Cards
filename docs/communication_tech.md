# توثيق تقنيات التواصل بين اللاعبين (Multiplayer Communication)

يعتمد التطبيق على بنية هجينة (Hybrid Architecture) تجمع بين واجهة مستخدم مبنية بتقنية React (Web) وطبقة شبكات أصلية (Native Networking) تعمل عبر Capacitor لضمان أداء عالٍ واتصال مستقر بين اللاعبين.

## 1. تقنية الاتصال المحلي (Local LAN Multiplayer)
تعتمد اللعبة في وضع الاتصال المحلي على إضافة مخصصة لـ Capacitor باسم `LocalServer`.
- **الاستضافة (Host):** يقوم جهاز أحد اللاعبين بفتح خادم محلي (Local Server) على منفذ محدد (Port) باستخدام واجهات برمجة التطبيقات الأصلية لنظام Android (TCP Sockets).
- **الانضمام (Client):** يقوم اللاعبون الآخرون بالاتصال بهذا الخادم باستخدام عنوان الـ IP المحلي لجهاز المضيف.
- **الميزة:** لا يتطلب هذا الوضع أي اتصال بالإنترنت، ويتميز بسرعة استجابة عالية جداً (Low Latency) لعدم وجود خوادم وسيطة.

## 2. تقنية الاتصال عبر الإنترنت (Online Multiplayer)
يستخدم التطبيق نفس واجهة الإضافة `LocalServer` للاتصال بخادم مركزي (Central Server) يعمل على المنفذ `3000`.
- يتم الاتصال عبر بروتوكولات الشبكة (TCP/WebSockets) لإدارة الغرف (Rooms) وتوجيه الرسائل بين اللاعبين المتباعدين جغرافياً.

## 3. الجسر بين الواجهة والنظام (Native-Web Bridge)
بما أن واجهة اللعبة مبنية بـ React (JavaScript) والشبكة تدار عبر Android (Java/Kotlin)، يتم التواصل بينهما عبر نظام أحداث (Event-Driven System) لضمان عدم حظر واجهة المستخدم:
- **من React إلى Native:**
  يتم إرسال الأوامر (مثل إنشاء غرفة، إرسال حركة لاعب، الانضمام) باستخدام دوال الإضافة المخصصة:
  ```javascript
  LocalServer.sendMessage({ message: JSON.stringify(action) })
  ```
- **من Native إلى React:**
  يستمع تطبيق React للأحداث القادمة من النظام الأصلي لتحديث واجهة المستخدم بشكل فوري:
  - `onStatusUpdate`: لتحديث حالة الاتصال (متصل، جاري الاتصال، الخ).
  - `onMessageReceived`: لاستقبال بيانات اللعبة (مثل `ROOM_READY` أو `room_state`).
  - `onLog`: لاستقبال سجلات النظام (Logs) لأغراض التتبع والتصحيح.

## 4. إدارة حالة الاتصال (Connection State Management)
تم تصميم نظام الاتصال ليكون موثوقاً ويعتمد كلياً على حالة النظام الأصلي (Native State) بدلاً من التخمين أو الفحص المستمر (Polling):
- **حالات الاتصال (Connection States):** يمر الاتصال بحالات واضحة: `DISCONNECTED` ➔ `CONNECTING` ➔ `SERVER_STARTED` / `CONNECTION_VERIFIED`.
- **التحقق الصارم (Strict Verification):** لا يتم فتح شاشة الغرفة (Game Room UI) إلا بعد نجاح عملية المصافحة (Handshake) بين الخادم والعميل واستلام حدث `ROOM_READY` صراحةً من طبقة الـ Native، مما يمنع ظهور واجهات غير مكتملة أو الدخول في حالة غير مستقرة.

## 5. التوافقية مع الويب (Web Fallback & Simulation)
بما أن إضافة `LocalServer` هي إضافة أصلية (Native-only)، تم بناء طبقة حماية (Platform Guards) باستخدام `Capacitor.isNativePlatform()`.
- عند تشغيل اللعبة على المتصفح (Web Preview)، يتم تخطي استدعاءات النظام الأصلي ومحاكاة أحداث الاتصال (Simulation).
- هذا يمنع انهيار التطبيق (`remove is not a function` أو `plugin not implemented`) ويسمح للمطورين باختبار وتطوير واجهة المستخدم دون الحاجة لجهاز أندرويد حقيقي في كل مرة.

## 6. صيغة تبادل البيانات (Data Payload Format)
يتم تبادل جميع البيانات بين اللاعبين بصيغة `JSON` خفيفة الوزن، مما يسهل عملية التحويل (Serialization/Deserialization) في كلا الجانبين (Native و Web).
مثال على رسالة حالة الغرفة:
```json
{
  "type": "room_state",
  "state": {
    "id": "123456",
    "gameState": "playing",
    "players": { ... }
  }
}
```
