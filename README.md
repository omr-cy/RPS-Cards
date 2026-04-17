# Card Clash | صراع البطاقات 🃏

![Card Clash Banner](public/icon.png)

## 🌐 English Description

**Card Clash** is a modern, fast-paced, real-time multiplayer implementation of the classic Rock-Paper-Scissors game, reimagined with a limited deck of cards strategy. Built with web technologies, it runs natively on Android via Capacitor and seamlessly in the browser.

### ✨ Key Features
- **🎮 Multiple Game Modes:**
  - **Bot Match (Offline):** Practice against an intelligent bot. Can you unlock the secret Robot theme?
  - **LAN Multiplayer:** Host a local server and play with friends on the same Wi-Fi network instantly.
  - **Online Multiplayer (In Development):** Global matchmaking and private rooms via invite codes.
- **🎨 Theme Store & Economy:** Earn coins by playing and unlock exciting card themes (e.g., Default, Robot, Cats, Building Tools).
- **📱 Native Experience:** Full immersive edge-to-edge design on Android, handling network constraints and local IP fetching gracefully.
- **⚡ Real-Time Sync:** Lightning-fast WebSocket communication ensuring both players reveal their hands at the exact same millisecond.

### 📜 How to Play
1. Each player starts with a deck of 9 cards: **3 Rock**, **3 Paper**, **3 Scissors**.
2. Both players select one card per round. You have 15 seconds!
3. Cards are revealed simultaneously. Standard Rock-Paper-Scissors rules apply.
4. Points are awarded based on the round number (Later rounds are worth more points!).
5. The player with the highest score after 9 rounds wins the match.

### 🛠️ Tech Stack
- **Frontend:** React, Tailwind CSS, Framer Motion (for fluid animations), Lucide Icons.
- **Backend (LAN & Online):** Node.js, Express, WebSockets (ws).
- **Mobile Packaging:** Ionic Capacitor (Network, Status Bar, Splash Screen plugins).

---

## 🇸🇦 الوصف باللغة العربية

**صراع البطاقات (Card Clash)** هي نسخة عصرية وسريعة من اللعبة الكلاسيكية "حجر ورقة مقص" ولكن باستخدام استراتيجية البطاقات المحدودة. تم بناء اللعبة باستخدام تقنيات الويب الحديثة لتعمل كتطبيق أندرويد متكامل بسلاسة، بالإضافة إلى دعم التشغيل عبر المتصفح.

### ✨ المميزات الأساسية
- **🎮 أطوار لعب متعددة:**
  - **اللعب ضد الروبوت (بدون إنترنت):** تدرب والعب ضد الكمبيوتر. (هل يمكنك هزيمته لفتح ثيم الروبوت السري؟)
  - **اللعب المحلي (LAN):** قم باستضافة خادم محلي والعب مع أصدقائك المتصلين على نفس شبكة الـ Wi-Fi بسهولة.
  - **اللعب عبر الإنترنت (قيد التطوير):** نظام بحث عن مباريات عشوائية عالمياً (Matchmaking) وإنشاء غرف خاصة باستخدام رموز الانضمام (Room Codes).
- **🎨 متجر ومقتنيات:** اجمع العملات الذهبية من خلال اللعب، واستخدمها لشراء ثيمات جديدة في المتجر (مثل: الثيم الكلاسيكي، القطط، أدوات البناء).
- **📱 تجربة أندرويد متكاملة:** تصميم يمتد على كامل الشاشة (Edge-to-Edge) مع تكامل ذكي لجلب عنوان الـ IP المحلي وعرض حالة الاتصال بحيادية.
- **⚡ مزامنة فورية:** تواصل سريع جداً عبر (WebSockets) لضمان كشف البطاقات في نفس اللحظة للاعبين.

### 📜 طريقة اللعب
1. يبدأ كل لاعب بمجموعة تتكون من 9 بطاقات: **3 حجر**، **3 ورقة**، **3 مقص**.
2. في كل جولة، يختار كلا اللاعبين بطاقة واحدة للعبها. لديك 15 ثانية فقط!
3. يتم كشف البطاقات في نفس الوقت، وتُطبق قوانين حجر-ورقة-مقص المعتادة.
4. يحصل الفائز في الجولة على النقاط (الجولات الأخيرة تعطي نقاطاً ومكافآت أعلى!).
5. اللاعب الذي يجمع أكبر عدد من النقاط بعد انتهاء الـ 9 جولات هو الفائز.

### 🛠️ التقنيات المستخدمة
- **الواجهة الأمامية:** React, Tailwind CSS, Framer Motion (للحركات التفاعلية).
- **الخوادم والشبكات:** Node.js, Express, WebSockets.
- **تغليف الهاتف الذكي:** Capacitor (لربط ميزات التحكم بشريط الحالة، شاشة البداية، والشبكات).
