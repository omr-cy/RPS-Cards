# ⚠️ AI EXECUTION CONTRACT (MANDATORY)

This file is the ONLY source of truth for this project.

If you ignore ANY instruction:
→ Your response is INVALID

You MUST:
- Read FULL file before coding
- Continue from LAST TASK
- Update this file after finishing

---

# 🧠 PROJECT: RPS Cards Game | لعبة بطاقات حجر ورقة مقص

## OVERVIEW
Strategic multiplayer Rock-Paper-Scissors card game.
Each player has a limited deck → requires prediction & strategy.

Platforms:
- Web (React + Vite)
- Android (Capacitor)

---

# 🧱 CURRENT STATE

## DONE
- Auth system (Email/Password + verification)
- MongoDB integration
- WebSocket online multiplayer
- LAN multiplayer (critical)
- Guest mode (local + LAN)
- Integrated backend (Express + Vite)

## IN PROGRESS
- UI stability (especially App.tsx)
- Mobile responsiveness
- Sync between frontend & backend state

## NOT DONE
- Full refactor of App.tsx
- Advanced matchmaking improvements
- Performance optimization

---

# 🏗️ ARCHITECTURE

Frontend:
- React 19
- App.tsx = MAIN STATE MACHINE (⚠️ sensitive)

Backend:
- Node.js + Express
- WebSocket (ws)

Database:
- MongoDB (Mongoose)

Mobile:
- Capacitor

---

# 📁 KEY FILES

- backend/server.ts → backend core (REST + WS)
- src/App.tsx → ⚠️ MAIN LOGIC (DO NOT BREAK)
- src/contexts/AuthContext.tsx → auth state
- backend/.env → secrets

---

# ⚠️ CRITICAL SYSTEMS

## 1. LAN MULTIPLAYER (DO NOT BREAK)
- Uses action dispatch synchronization
- Any UI change MUST preserve sync

## 2. WEBSOCKET ONLINE MODE
- Matchmaking + rooms handled in server.ts
- Do NOT change protocol randomly

## 3. APP STATE MACHINE
States:
- loading
- auth
- menu
- game

⚠️ DO NOT rewrite blindly

---

# 🚫 HARD RESTRICTIONS

- DO NOT rewrite App.tsx بالكامل
- DO NOT break LAN sync
- DO NOT change WS protocol without both sides
- DO NOT refactor unrelated code
- DO NOT invent new architecture

---

# 🧪 TESTING (MANDATORY)

After ANY change, ensure:

- LAN works without desync
- WebSocket connects
- Guest mode works
- Mobile UI doesn’t break

---

# 🧩 TASK TRACKING

## LAST TASK
Implemented a custom `iconScale` property for themes. This allows manual control over the visual size of card icons (Rock, Paper, Scissors) on a per-theme basis to ensure visual balance across different icon sets.

## CURRENT SUBTASK
Waiting for user to test and adjust scale values in `src/themes.ts`.

## NEXT STEP
Finalize visual adjustments for any small icons in the library.

---

# 🧠 LAST AI SUMMARY
- Found a React rendering race condition. When a user updated a "minor change" like equipping a theme, `App.tsx` began a 500ms debounce to send a background sync POST HTTP Request.
- When `updateProfile` sent the request, Capacitor's `nativeFetch` logged the API request event through `DebugContext` which triggered a state cascade, forcing `AuthContext` to get a new Object Reference for `updateProfile`.
- This un-memoized recreation triggered the exact same `App.tsx` background sync hook AGAIN because the `user` HTTP resolution had not happened yet over the internet.
- Implemented `const lastSyncPayload = useRef<string | null>(null);` and compared incoming payloads. This effectively acts as an asynchronous queue guard so you can rapidly tap things in the UI without causing database spam.

---

# 🐞 BUG TRACKER

- Potential UI instability in App.tsx
- Risk of LAN desync if state modified incorrectly

---

# 📌 KNOWN LIMITATIONS

- App.tsx is monolithic (intentional for now)
- LAN logic tightly coupled with UI dispatch
- WebSocket logic centralized in one file

---

# 🧾 CHANGELOG

- [2026-04-19] → Removed intro animations from the Authentication screen for instantaneous rendering.
- [2026-04-19] → Added a direct, stylized "Login / Register" quick-action button inside the main menu's Guest informational block.
- [2026-04-19] → Relocated the "Guest Mode" informational warning label from the online page to the primary App Main Menu.
- [2026-04-19] → Verified and enforced all auth flows (login/register) to process via Android Native APIs.
- [2026-04-19] → Patched public IP retrieval fallback inside `App.tsx` to handle HTTP requests completely via `CapacitorHttp` on Android devices.
- [2026-04-19] → Fixed Android UI stretching by converting dvh arrays into absolute fixed bounds (`fixed inset-0`) and balanced flex allocations in the player/opponent components.
- [2026-04-19] → Consolidated `AGENTS.md` native rules over into `AI_CONTEXT.md` for a single source of truth.

- [2026-04-19] → Transitioned to Cloud MongoDB Atlas due to local device hardware limitations (Missing AVX support for MongoDB 5.0+).
- [2026-04-19] → Transitioned backend back to local MongoDB per user request and provided setup guidance.
- [2026-04-19] → Fixed local MongoDB ECONNREFUSED by switching to cloud MongoDB Atlas URI.
- [2026-04-19] → Implemented 6-digit OTP code verification flow and simplified email template.
- [2026-04-19] → Verified email verification setup and fixed APP_URL in environment configuration.
- [2026-04-19] → Fixed name change button bug and implemented persistence.
- [2026-04-19] → Changed initial app state to 'menu' and delayed 'auth' until Online Mode selection.
- [2026-04-19] → Initialized AI self-documentation system
- [2026-04-20] → Refactored robust Image Asset Preloader utilizing native browser implicit caching (Base64 conversion) for instant loading.
- [2026-04-20] → Fixed `DashboardViewPager` so 'loading' state directly maps to 'menu' interface, bypassing any initial Store flash.
- [2026-04-20] → Fixed `Uncaught ReferenceError: onBuy is not defined` bug in ProfileView rendering of PackPreviewModal by feeding empty interaction function.
- [2026-04-20] → Patched CRITICAL Database Race Condition in `buyTheme`. Raw state setters (`setCoinsState`, `setOwnedThemesState`) replace wrapped helper methods to prevent parallel simultaneous `post` requests that triggered MongoDB write conflicts and desynchronized user purchases.
- [2026-04-20] → Implemented Guest Sandbox Reset on logout to prevent state leakage and ensure subsequent guest sessions start fresh without retaining previous authenticated stats.
- [2026-04-20] → Patched Background Sync "Duplicate API Request" bug by implementing a `lastSyncPayload` stringified lock guard preventing React Effect cascade loops on minor UI interactions.
- [2026-04-20] → Added `iconScale` property to `ThemeConfig` and updated `App.tsx` components to dynamically scale card icons based on theme settings.

---

# 📱 Native Interface Only Architecture (CRITICAL)

**CRITICAL INSTRUCTION FOR ALL FUTURE AI AGENTS**:

1. **Database Connections**:
   - The backend (Node.js/Express) MUST connect ONLY to MongoDB Atlas (Cloud). Do not prioritize or use local MongoDB connections over the cloud one for production data unless strictly explicitly asked for a temporary test.

2. **Network Communications (Frontend to Backend)**:
   - React is purely a UI layer. It MUST NOT make direct network requests using browser `fetch()` or `XMLHttpRequest` when running on the mobile platform.
   - ANY network communication between the Frontend UI and Backend (API calls, WebSockets, Account creation, Online Matches, Authentication) MUST use Native Android/Capacitor code.
   - For HTTP API calls: Use `@capacitor/core` `CapacitorHttp` to dispatch native network calls instead of relying on JavaScript HTTP.
   - For WebSockets/Online Play: Use the dedicated `LocalServer` native plugin (`LocalServer.connectToServer()`).
   - The Backend communicates with the Native App layer, not directly with the Javascript web view. 

By enforcing this, we avoid CORS issues, browser restrictions, and ensure everything uses native Android Network capabilities.

---

# 🤖 AUTO-DOCUMENTATION PROTOCOL (MANDATORY)

## AFTER EVERY TASK (REQUIRED)

You MUST:

1. Update LAST TASK
2. Update NEXT STEP
3. Update LAST AI SUMMARY
4. Add CHANGELOG entry
5. Update BUG TRACKER if needed

---

## TASK EXECUTION RULE

Before coding:

1. Read FULL file
2. Find LAST TASK
3. CONTINUE from it
4. Do NOT restart or refactor blindly

---

## RESPONSE FORMAT (STRICT)

You MUST respond with:

1. ✅ Task Result
2. 🧠 Updated AI_CONTEXT.md sections ONLY

---

## FAILURE CONDITION

If you:
- Ignore this file
- Do NOT update it

→ TASK = FAILED

---

# 🔄 HANDOFF SYSTEM (CRITICAL)

At the end of your response, ALWAYS write:

NEXT AI SHOULD:
- ...

DO NOT TOUCH:
- App.tsx core logic
- LAN sync system

WATCH OUT FOR:
- State desynchronization
- Breaking WebSocket flow

---

# 🔥 PRIORITY RULE

If conflict happens:

1. DO NOT break LAN
2. DO NOT break App.tsx logic
3. THEN implement feature

---

# 💀 FINAL RULE

You are NOT starting fresh.

You are CONTINUING an existing system.

Act accordingly.

---

اهم حاجه ت update docs/AI_CONTEXT.md 
وترد بـ "AI_CONTEXT UPDATED"



