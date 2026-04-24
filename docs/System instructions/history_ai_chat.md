### [2026-04-24] Android Release Signing Configuration
**User Prompt:** Configure Android app for professional release signing with consistent keystore to allow updates without re-installation.
**Actions:**
- **Documentation:** Created `docs/release_keystore.md` with step-by-step instructions for `keytool` and build commands.
- **Gradle Fix:** Modified `android/app/build.gradle` to include `signingConfigs` and linked it to the `release` build type.
- **Workflow:** Defined the expected location for the keystore file at `android/app/release.keystore` and updated Gradle to match the new filename.
- **Automation:** Updated `.github/workflows/android_build.yml` to build release APK and AAB automatically and upload them to Google Drive (/RPS-Cards_Builds/Release).
- **Cleanup:** Verified the configuration is ready for production builds (APK & AAB).

## [2026-04-24] LAN Hosting UI & Store Theme Fix
**User Prompt:** في مشكلة حصلت في خيار بدء الإستضافة في اللعب عبر الشبكة المحليه اصبح يفتح نافذة غريبة جدا لا يوجد بها الأيبي الخاص بي ولا اي شيء
**Actions:**
- **UI Fix:** Redesigned `PrivateRoomLobbyView` to dynamically support both Online and LAN modes. When in LAN mode (Host/Client), it now displays "Your IP Address" instead of "Access Code" and uses a more appropriate font size for IP addresses.
- **UX Improvement:** Implemented an automatic LAN status refresh when opening the "Local Play (IP)" tab, ensuring the latest IP address and server role are fetched immediately from the Capacitor bridge.
- **Logic Fix:** Refined the `isLoading` logic in the lobby view to correctly distinguish between "Waiting for Online Room ID" and "Waiting for Local IP Discovery", preventing the UI from being stuck in a loading state for LAN hosts.
- **Bug Fix (Linter):** Fixed a pre-existing TypeScript error in `StoreView` where the filtering logic attempted to access a non-existent `category` field on `ThemeConfig`. Added the `category` field to the theme definitions.
- **Verification:** Verified that the app builds, lints, and correctly handles both online and local lobby states.

## [2026-04-24] Android Signing Fix (Keystore Corruption)
**User Prompt:** Error in GitHub Action regarding keystore length (corruption).
**Actions:**
- **Cleanup:** Deleted the corrupted `release.keystore` file that was broken during text-based creation.
- **Gradle Fix:** Updated `android/app/build.gradle` to use environment variables (`RELEASE_STORE_PASSWORD`, etc.) instead of hardcoded strings. This allows for dynamic signing in CI.
- **Workflow Improvement:** Modified the GitHub Action to decode the keystore from a Base64 Secret (`RELEASE_KEYSTORE_BASE64`) if provided.
- **Documentation:** Updated `docs/release_keystore.md` with instructions on how to use the Base64 Secret method for professional and secure builds.
- **Verification:** Ensured the build configuration is robust even if the keystore file is missing locally (it will use defaults or skip).

 📜 AI Interaction Log

## [2026-04-21] XP and Leveling System Integration
**User Prompt:** أبدأ بأول خطوات في TODO (Phase 1, 2, 3 of XP system)
**Actions:**
- **Backend:** Updated User model with `xp` and `level`. Added XP rewards for login and matches. Implemented `/api/leaderboard`. Implemented Skill-Based Matchmaking (SBMM) in random search using a dynamic expansion algorithm.
- **Frontend:** Added `XPBar`, `LevelUpModal`, and `LeaderboardView`. Integrated level-gating for store themes. Integrated level-up animations. Updated `startQuickMatch` to send player level for matchmaking.
- **State:** Syncing server XP/Level state with local state for correct UI representation.
- **Navigation:** Added Leaderboard button to main menu (initially), then relocated it to the "Online Play" section.
- **UI:** Reordered the "Online Play" interface to prioritize context: Leaderboard (Top) -> Quick Match -> Private Room.
- **Fix:** Fixed a session persistence issue where logged-in users were treated as guests when opening the app offline. Implemented local storage caching for `UserProfile` in `AuthContext` and added a smart "Offline Mode" banner in the main menu.
- **Fix:** Corrected the "Continue as Guest" flow to immediately close the authentication screen before showing the name entry dialog, preventing overlapping UI.
- **UI:** Improved navigation stability and accessibility by making the Leaderboard header fixed/sticky and increasing the top spacing (padding) for all navigation buttons (Back, Close, Return) across the application to prevent them from being "stuck" to the screen edges.
- **Matchmaking:** Accelerated the matchmaking process by reducing the search expansion interval from 5 seconds to 3 seconds, allowing for faster pairing with a wider range of levels when an exact match isn't immediate.
- **UI:** Polished the Online Play menu by compacting the Private Room and Quick Match sections. Integrated the "Join" button directly into the room ID input field for a more modern, streamlined experience.
- **System:** Refined match rewards where playing against a bot or locally gives out coins but not XP to avoid farming/boosting. Only Matchmaking mode gives out XP points.
- **UI:** Added the Theme's counter background color, bold text, and a drop shadow to the opponent card counters to match the player side.
- **UX:** Added a delayed loading state with a spinner inside the "Play vs Computer" button to hide the heavy render freeze when switching from main menu to the bot match scene.
- **UI:** Relocated the Back button for the Online and Local menus from the fixed top navbar to a sticky position, creating a nicer flow between the header and the content blocks.
- **Security:** Sanitized all input fields using exact matching RegEx patterns and sliced all of them via state handlers to prevent arbitrary long strings that can break the layout or exploit backend data storage:
  - Allowed Arabic, Latin characters and numerals for Names (Max Length: 20 chars).
  - Allowed spaces to be inputted.
  - Sliced and sanitized Email inputs to 64 chars, rejecting whitespaces.
  - Sliced and sanitized Password inputs to 32 chars, rejecting whitespaces.
  - Ensured ID/Verification codes have hard boundaries for limits and types natively via the inputs components.
  - Re-applied proper Arabic to Latin conversion logic inside IP bindings for local matchmaking with limits (15 chars).
- **Matchmaking / UX:** Added a "Search for another player" button to the Game Over screen and the waiting lobby for online random matches. This allows players to quickly start a new search for a match without having to manually leave the room and return to the main menu.

## [2026-04-22] UI Padding Adjustment
**User Prompt:** خلي في باندج شوية بين اعلى البطاقات واسفل ناف التمجر
**Actions:**
- **UI:** Increased the top padding in `StoreView` from `pt-20` to `pt-28` to provide better visual spacing between the store navigation header and the theme card grid.

## [2026-04-22] UI Padding Adjustment (ProfileView)
**User Prompt:** كذالك في الملف الشخصي
**Actions:**
- **UI:** Increased the top padding in `ProfileView` from `pt-20` to `pt-28` to align with the visual spacing applied earlier to `StoreView`, preventing overlapping content below the navigation bar.

## [2026-04-22] UI Interaction Improvement (Back Button)
**User Prompt:** خلي زر العودة للقائمة الرئيسية بدون خلفية وعلى اليمين شوية
**Actions:**
- **UI:** Removed the background and border styling from the "Return to Main Menu" back button in `LeaderboardView` and shifted it 16px (`right-4`) to the right for a cleaner, minimalist look.

## [2026-04-22] Tablet Responsiveness Optimization
**User Prompt:** خلي اللعبة تتناسب برضو مع التابلت من غير ما تبوظ ام الهاتف
**Actions:**
- **UI:** Optimized `StoreView` for tablet and desktop displays by updating the theme card grid from a single-column-mobile (two-col) to a responsive layout (`grid-cols-2 md:grid-cols-3 lg:grid-cols-4`) and increasing the maximum width constraint to `max-w-4xl`.

## [2026-04-22] Tablet Responsiveness Optimization (ProfileView)
**User Prompt:** وبرضو في الملف الشخصي
**Actions:**
- **UI:** Optimized the theme library grid in `ProfileView` for tablet and large screens by adding a fifth column for larger viewports (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`) to improve grid density and aesthetic utilization of space.

## [2026-04-22] Font Optimization and Build Error Fix
**User Prompt:** انا حملت كل الفونتس اللي اللعبة محتاجاها في public/fonts / Fix the following errors: Error: ENOENT
**Actions:**
- **Performance:** Relocated all required fonts to local `public/fonts` and updated `src/index.css` to use `@font-face` for loading local fonts instead of Google Fonts CDN.
- **Fix:** Fixed build error `ENOENT: no such file or directory, stat '/app/applet/dist/index.html'` by successfully running `install_applet_dependencies` and `npx vite build` to generate the required build output in `dist/`.
- **UI:** Standardized the matchmaking loading waiting screen spinner by replacing it with the `Activity` icon from `lucide-react` for visual consistency.

## [2026-04-23] Connection System Refactoring Completion
**User Prompt:** اعمل اللي في TODO
**Actions:**
- **Refactoring:** Fully refactored the networking logic from `App.tsx` into dedicated service files: `src/services/Lan_Android.ts` for local network play and `src/services/Online_Android.ts` for online WebSocket-based play.
- **Cleanup:** Cleaned up `App.tsx` by replacing inline logic with service method calls, reducing the file's complexity and improving maintainability.
- **Verification:** Verified the fix for a corrupted code block in `App.tsx` and confirmed the app builds and lints successfully.

## [2026-04-23] Online Match Cleanup & Lobby Bug Fix
**User Prompt:** في اللعب عبر الانترنت عندما ينبهي الجيم احيانا يظهر لي كود انشاء غرفة جديد ممكن تحاول تعرف ايه السبب وكيفية الاصلاح
**Actions:**
- **Bug Fix (Server):** Modified `backend/server.ts` to prevent resetting the room state to `waiting` if the game is already in `gameOver` when a player disconnects. This keeps the remaining player on the results screen.
- **UI Improvement (Client):** Updated the `waiting` state UI in `App.tsx` to hide room codes during public matches, providing a cleaner message instead of showing internal room IDs that could confuse players.
- **Consistency:** Ensured that players in public matches are given the option to find a new match immediately if the current one ends or the opponent leaves.

## [2026-04-23] Instant Feedback for Online Actions
**User Prompt:** طيب عند الضغط للعب العشواي او بحث عن خصم اللعبة بتقعد شوية وبعدها بتفتح شاشة التحميل هل في حل لتحسين هذا
**Actions:**
- **UX Fix:** Modified `App.tsx` to set `isSearching` to `true` immediately upon clicking online action buttons (Quick Match, Create Room, Join Room). This provides instant visual feedback and prevents the "dead time" where the UI didn't respond while waiting for the initial server connection.
- **Safety:** Added `.catch()` blocks to reset the searching state if the connection fails, ensuring buttons become interactive again.

## [2026-04-23] SSL Integration & Secure URL Configuration
**User Prompt:** حطيتهم في backend/certs
**Actions:**
- **Security:** Integrated SSL certificates (`private.key`, `certificate.crt`, `ca_bundle.crt`) into `backend/server.ts`.
- **Backend:** Updated the server initialization to use `https.createServer` and `wss` if certificates are present.
- **Frontend Configuration:** Updated `src/config.json` and `.env` to use the new domain `rps-cards.duckdns.org` and port `443` for standard HTTPS.
- **Infrastructure:** Refined `server.ts` to use `BACKEND_PORT` from environment variables, allowing the server to bind directly to port 443 (required for running without Nginx).
- **Development Environment:** Implemented an internal proxy in `vite.config.ts` for both HTTP (`/remote-api`) and WebSockets (`/game-socket-proxy`) to bypass browser SSL/CORS security blocks when running in AI Studio.
- **Android Stability:** Fixed a critical package conflict in Android files where the Java package declaration (`com.omr.rpscards`) did not match the file content, causing crashes on native devices.
- **Environment Isolation:** Created `src/env_config.ts` to strictly separate URL fetching logic. For Android/iOS (Native), it ALWAYS uses the direct `config.json` URLs. For the AI Studio web environment, it uses the secure proxy routes (`/remote-api`, `/game-socket-proxy`). This prevents development-specific code from leaking into the APK build.

## [2026-04-23] UI Polishing, Room Creation Fix & Versioning Automation
**User Prompt:** هو ليه زر إنشاء غرفة بيفتح مباراة سريعة / خلي اشعارات الاخطاء شكلها يبقى موحد / نظام تحديث تلقائي لإصدار rps الداخلي
**Actions:**
- **Bug Fix:** Fixed a UI logic error where the "Create Room" button incorrectly triggered the full-screen matchmaking search overlay.
- **UX:** Introduced `isActionLoading` state to distinguish between "Searching for random opponents" and "Manually creating/joining a room".
- **UI:** Added a modern, semi-transparent overlay for room creation actions with a specific message: "جاري إعداد الغرفة... يتم الآن تجهيز الرزم الورقية والاتصال بالخادم".
- **UI/UX Polishing:** Redesigned the notification system (Error/Success Toasts) to use a unified "Glassy" design with a visual progress bar that indicates the auto-dismiss timer (4 seconds).
- **Automation:** Developed a centralized version update script (`scripts/update-version.js`) that synchronizes version strings across the root `package.json`, `backend/package.json`, and `android/app/build.gradle`.
- **CI/CD:** Created a GitHub Action workflow (`.github/workflows/update-version.yml`) allowing the user to trigger a version bump directly from the GitHub online interface with an optional manual `versionCode` override (defaults to auto-increment).
- **Documentation:** Rewrote `to_update.md` to serve as the main manual for the new automated versioning system.

## [2026-04-23] Proxy Timeout Fix
**User Prompt:** Fix the following errors: proxy error Error: connect ETIMEDOUT 156.223.183.83:443 (and related)
**Actions:**
- **Fix:** Added missing proxy configuration for `/api` in `vite.config.ts` to allow authentication requests to be proxied.
- **Performance:** Increased `timeout` to 60000ms for all proxy configurations (`/api`, `/remote-api`, `/game-socket-proxy`) to resolve ETIMEDOUT issues.
- **Verification:** Restarted the development server to apply changes.

## [2026-04-23] Backend Database Connection Fix
**User Prompt:** MongooseError: Operation users.find() buffering timed out
**Actions:**
- **Fix:** Refactored MongoDB connection logic in `backend/server.ts` to be awaitable and ensured it is awaited inside `startServer` before the server begins listening for requests. This prevents race conditions where database queries are executed before the Mongoose connection is established.
- **Verification:** Restarted the development server.
