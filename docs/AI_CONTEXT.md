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
Fixed name change button by correcting setter function name and adding persistence (localStorage for guests, MongoDB for users).

## CURRENT SUBTASK
Verified that guest names persist across refreshes and authenticated users correctly update their remote profile.

## NEXT STEP
Review App.tsx for any other forced navigation triggers and ensure consistent behavior across modes.

---

# 🧠 LAST AI SUMMARY
- Fixed a bug where the name change button was calling an incorrect function name.
- Implemented `localStorage` persistence for guest names so they don't disappear after a refresh.
- Guaranteed that authenticated users the update their `displayName` on the server when changing names through the UI.

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

- [2026-04-19] → Fixed name change button bug and implemented persistence.
- [2026-04-19] → Changed initial app state to 'menu' and delayed 'auth' until Online Mode selection.
- [2026-04-19] → Initialized AI self-documentation system

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



