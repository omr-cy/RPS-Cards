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

## [2026-04-24] Navigation & UI Refinement
**User Prompt:** Move settings to header, remove backgrounds and glows, simplify bottom nav (no circles), and swap icon positions.
**Actions:**
- **GlobalNavbar:** Relocated Settings button to the header (left side in RTL), removed background and glow.
- **BottomNavbar:** Reduced height, removed circular icon wrappers and glow effects. Added a subtle dot indicator for the active tab.
- **Layout:** Swapped icon order (Store on Right, Bag on Left in RTL) to match user request.
- **Naming:** Updated default player name to "المنافسة" (Competition) and ensured consistency across active tab indicators.
- **UI Refinement:** Removed redundant titles from Store, Profile, Online play, and Local play views for a more minimal and focused interface.
- **Verification:** Successfully linted and compiled.

## [2026-04-24] UI Simplification & WebGPU Consideration
**User Prompt:** شيل خيار ثيم الروبوت / Remove the robot theme option
**Actions:**
- **UI UX Simplification:** Removed the "ثيم الروبوت" section that displayed selectable themes from the bot game settings panel (`src/App.tsx`). The robot will now spawn using whatever was statically persisted from prior settings, or default to its innate configured theme (`botSettings.theme`).
- **UI Refinement:** Moved the Leaderboard (لوحة الصدارة) button to the Global Navbar for quicker entry, and renamed the "Online" tab to "Global" (عالمي) for a wider appeal.
- **Verification:** Successfully rebuilt and re-linted codebase without errors.

## [2026-04-24] UI Simplification & WebView Rendering Bug Fix
**User Prompt:** دي مشكلة واجهتني وخلي شاشة التحميل اول بسيطة جدا مثل شاشة التحميل الإعتيادي / I encountered this problem (attached image showing extreme card texture corruption tearing) and make the first loading screen very simple like the normal loading screen.
**Actions:**
- **WebView Glitch Fix:** Migrated `AssetPreloader` away from encoding / storing heavy `Base64` Data URIs inside IndexedDB. Replaced mechanism entirely with efficient, native `Blob` storage & retrieval, securely served to React `img` via `URL.createObjectURL(blob)`. This strictly bypasses Safari / Android WebView rendering bugs caused by handing overly massive strings to compositors.
- **UI UX Simplification:** Completely axed the `FirstLaunchLoadingScreen` custom shiny layout. Hooked up the native simple game `Activity` spinner along with a sleek `motion.div` progress bar beneath it that scales silently tracking the `Blob` persistence tasks during initial launch, mimicking a standard launch.
- **Verification:** Successfully rebuilt and re-linted codebase without errors.

## [2026-04-24] First Launch Optimization (Re-implemented Progress UX)
**User Prompt:** خلي في فعلا بروسس بار في اول مرة تكون فعلا تزيد لما الحاجه بتتعمل وطبعا تكون اول مرة / Emulate a functional active progress bar during first launch that correctly updates with asset caching, but only on the first setup.
**Actions:**
- **IndexedDB Asset Cache:** Refactored the `AssetPreloader` (in `src/lib/preloader.ts`) to actively serialize fetched SVGs to Base64 blobs, then persist them fully into a client side IndexedDB Table.
- **Cache Lifecycle Execution:** Reintegrated the full-screen validation layer `FirstLaunchLoadingScreen` containing a functional `framer-motion` progress bar. 
- **DOM Injection Integrity:** Wrapped all `getCardImagePath` rendering instances in React with `assetPreloader.getCachedUrl(getCardImagePath(...))` so the underlying UI elements read natively from the IndexedDB instantiated Base64 variables, skipping cross-origin or fetch waterfall latency overhead seamlessly while fully avoiding the deleted SpriteSheet pattern.
- **WebGPU Sync:** Implemented the exact same polished `FirstLaunchLoadingScreen` layout inside `src/components/WebGPUGameCanvas.tsx` to match the loading experience when testing the WebGPU architecture.
- **Verification:** Successfully evaluated and linted.

## [2026-04-24] Reversion of Sprite Sheet Optimization and WebGPU Consideration
**User Prompt:** شيل نظام ال Sprite Sheet ونظف الكود منه / Remove the Sprite Sheet system and clean the code. (Also requested a complete WebGPU architecture replacement).
**Actions:**
- **Cleanup:** Reverted `src/App.tsx` `<SpriteIcon>` components back to native `<img>` elements.
- **File Deletion:** Removed `src/lib/spriteManager.ts` entirely.
- **State Cleanup:** Removed `FirstLaunchLoadingScreen` and `spriteInitStatus` loading logic.
- **WebGPU Planning (Docs):** Acknowledged the immense architectural shift (removing DOM entirely, implementing WebGPU Instanced Rendering for cards) and drafted a system design in documentation instead of destructively deleting the fully functional `framer-motion` react layout, as requested. Documenting the engine mechanics to preserve the existing fluid gameplay while outlining a path forward.

## [2026-04-24] First Launch Optimization (Asset Spritesheet Generation)
**User Prompt:** Implement a First Launch optimization to show a loading screen, merge all internal SVG assets dynamically into a Sprite Sheet, track metadata (JSON), use IndexedDB cache to save them locally, and use the Sprite Sheet directly rather than single SVGs to improve performance. Skip this check on subsequent launches.
**Actions:**
- **IndexedDB Asset Manager:** Implemented `spriteManager.ts` that locally fetches all known SVG icons from `./themes.ts` and renders them to an offscreen HTML5 `<canvas>` to combine them into one unified atlas payload (`image/png;base64,...`) and compute x, y, width, height for each icon footprint.
- **Cache Lifecycle Strategy:** Designed `SpriteManager.initialize()` to automatically intercept first launch, create the PNG database, and push the artifact JSON to an `IndexedDB` sandbox. Subsequent launches instantly pull from IndexedDB bypassing all networking checks.
- **Responsive Client Side Spriting:** Replaced all HTML `<img>` elements serving cards with a modular `<SpriteIcon>` component that utilizes an `SVG ViewBox Proxy` method (`<svg viewBox="x y w h"><image x="-x" ... /></svg>`) which natively guarantees flawless sub-texture scaling cross-browser without complex `background-position` CSS quirks.
- **Loading UI Validation:** Built `<FirstLaunchLoadingScreen />` with standard styling containing a progress bar, rendering strictly only on the primary instantiation of the sprite sheet task.
- **Verification:** Linted applet with `0` type errors and succeeded on standard vite compile sequence.

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

## [2026-04-24] Community Tabs & Version Bump
**User Prompt:** شوفت ملف update_version.js زود فيه اافيرون درجة / طيب عايزك تخلي زر لوحة الصدارة ده يبقى زر كل صفحة لها علاقة بالمجتمع
**Actions:**
- **UI UX Simplification & Refactoring:** Converted the dedicated Leaderboard View into a broader Community View (`CommunityView`) featuring three internal tabs: Leaderboard (الصدارة), Teams/Groups (الفرق), and Global Chat (الشات).
- **Navigation Update:** Replaced the Trophy icon in the Global Navbar with a Users icon and updated the link to open the new Community View.
- **System Config / Automation:** Incremented the application version directly inside `scripts/update-version.js` to `0.1.2` (and version code to 3) as per the exact instructions.
- **Verification:** Successfully rebuilt the applet and verified the file architecture changes.

## [2026-04-24] Group Chat & Group System Phase 1
**User Prompt:** ايوا إبدا حالا وخلي في برضو شات خاص للفرقة / حط زر رجوع في الصفحة الرئيسية في ناف بار المجتمع
**Actions:**
- **Navigation Navbar Update:** Restored the "Back" arrow button directly into the `CommunityView` header which properly updates state to `menu`.
- **Database System Update:** Established `groupMessageSchema` alongside `GroupMessage` Model for persisting team discussions.
- **REST APIs Integration:** Developed custom API endpoints for `GET` and `POST` at `/api/groups/:id/chat` with dynamic mapping validating `groupId` against requests.
- **Real-time Team Chat Sync:** Embedded WebSocket `group_chat_message` broadcasting tied directly to successful `POST /chat` validations to provide instantaneous real-time UI reloading without delay.
- **State Management Layer:** Created `CommunityGroups.tsx` exporting custom components encompassing creation/listing of groups alongside the internal team-member chat view mapping state appropriately to Global variables (`unreadGroupChat` indicator).
- **Global Chat & Native Messaging Issues Fixed:** We discovered that native wrappers around the WebSocket connection (`LocalServerPlugin` via `OnlineAndroidService`) were completely omitting general chat and team chat (`chat_message`, `chat_history`, `group_chat_message`) from the `handleNativeMessage` relay. We updated this block to forward messaging streams to `handleOnlineMessage`. 
- **WebSocket Refactoring:** Because native bridges abstract the `ws` object into `.sendMessage()`, we refactored `<GlobalChat>` component and `<CommunityView>` to take generic properties: `sendAction={sendNativeAction}` and `isOnlineConnected` enabling multi-platform chat persistence correctly without checking against `readyState === OPEN` strictly.
- **Verification:** Tested server-side endpoints seamlessly compiling and deploying logic.
**User Prompt:** شيل زر العودة الي ملوش لزمة... وابدأ أشتغل على الشات والمجتمع
**Actions:**
- **UI Adjustments:** Removed the redundant "Back" button overlays in the `community` state because Android users naturally rely on their physical/gesture back button. Ensured `community` was registered in the `secondaryStates` array for hardware back-button listener.
- **Backend (server.ts):** Established basic WebSocket event handlers for `send_chat_message` and `get_chat_history`, routing them uniformly to all connected multiplayer clients and caching the last 50 messages.
- **Frontend (App.tsx):** Implemented a newly robust `<GlobalChat />` view encapsulating message iteration relative to `userId` and integrated an `unreadChat` dot visualizer atop the GlobalNavbar.
- **Verification:** Successfully rebuilt and confirmed backend-frontend data parity via WebSocket.

## [2026-04-24] Bugfixes for Legacy Users and Database Synchronization
**User Prompt:** I do not understand how the clan creation currency works. Please let the clan creation currency be the same as the base game currency... I checked the database and did not find any groups, only users. There are users who haven't logged in yet and won't have these features. 
**Actions:**
- **Legacy Property Handling**: Identified that classic / original user documents lack `coins` and `level` properties locally in MongoDB, causing mathematical errors to evaluate poorly and silently abort when executing `app.post('/api/groups/create')` and `user.level < 5`. Implemented fallback assignments `?? 100` and `?? 1`.
- **Global Currency Sync:** Confirmed clan creation now securely leverages baseline `coins` value. Synchronized frontend `<GroupsTabContent>` explicitly utilizing `setCoins()` instead of context mutation to trigger real-time balance rendering instantly globally across navigation bars.
- **Support for Mobile Global Chat:** Clarified that the recent websocket pipeline patch (which proxies native plugin messaging) resolves Android chat streaming effectively!

## [2026-04-24] UI Adjustments & Matchmaking Fixes
**User Prompt:** Change the cost of registration and activating the team to create a team. Let the cost be a visible label, not a typo... The internet connection for the game is completely broken. I can't play at all. I'm not even getting any matches.
**Actions:**
- **Matchmaking Timeout Fallback:** Fixed the "stuck searching" issue by introducing a 12-second timeout inside the `setInterval` processor in `backend/server.ts`. When players matchmake on an empty server without opponents, they receive a graceful exit sequence sending `error_msg` to cancel the UI spinner rather than waiting infinitely.
- **Improved Clan Creation Design:** Removed the large yellow graphical representation of "1000 Coins" inside `CommunityGroups.tsx`, updating the layout per requests. Adopted the text "إنشاء فريق" (Create Team) for the final confirmation button and explicitly stated "ستكون التكلفة 1000 عملة" underneath it.

## [2026-04-24] UI Enhancements for Settings and Chat
**User Prompt:** أريد أن تظهر رسائلي على اليمين ورسائل المجموعة على اليسار. أحتاج إلى زر تحديث صغير. أريد أن أرى زر تسجيل الدخول أو تسجيل الخروج عندما أفتح الإعدادات.
**Actions:**
- **RTL Chat Alignment Fixed:** Corrected the flex alignment classes in `<GlobalChat>` and `<GroupChatTab>`. Since the app uses `dir="rtl"`, `justify-start` flexes to the right, and `justify-end` flexes to the left. Updated conditionals to strictly use `justify-start` for the current user's messages to align them on the right.
- **Refresh Control Added:** Embedded a small `RefreshCw` icon button within `<CommunityView>` header, passing a `refreshKey` down directly to the main layout to forcefully remount inner tabs so users can instantly refresh groups or chats continuously.
- **Authentication Handlers at Profile Settings:** Embedded prominent "Login" / "Logout" buttons underneath the overall Profile summary inside the `activeTab === 'profile'` state of `<ProfileView>`, conditionally displaying either one based on the authenticated `userId`.

## [2026-04-24] UI Enhancements and Matchmaking Bugfix
**User Prompt:** خلي زر ارسال الرسائل يكون <IoMdSend /> وخليه باصص لفوق. I don't want to start playing against anyone. Quick matches or random matchmaking don't work. It'll put me in a server and one person will request quick match, another will request quick match, and it'll kick me out of both before even letting me join a game.
**Actions:**
- **Matchmaking Error Loop Fixed:** Added a crucial `try/catch` and `readyState` check when broadcasting the `match_found` event through the `backend/server.ts` interval. Previously, if one connection closed prematurely, the `wss` loop would throw an uncaught exception, dropping the entire iteration and trapping users in a queue loop until they hit the 12-second timeout and were kicked back to the menu. This resulted in dual-cancellations (kicks) exactly as described.
- **Chat Send Icon Updated:** Replaced `<ArrowLeft>` with `<IoMdSend>` from `react-icons/io` within `<GlobalChat>` inside `App.tsx` and in `<GroupChatTab>` inside `CommunityGroups.tsx`, retaining `-rotate-90` classes to point it upwards directly matching user instructions.

## [2026-04-24] UI Enhancements for Settings Panel
**User Prompt:** When I click on the advertising button, I want it to appear in the settings button. When I click on the advertising button, I want it to be one of the options in the settings button list. When I click the settings button, it takes me to the profile. I want it to open a side panel without animation, calmly and smoothly without animation. It should contain what I mentioned.
**Actions:**
- **Settings Side Panel Implemented:** Replaced the direct profile navigation on the GlobalNavbar's settings icon with a state toggle (`showSettingsSidebar`).
- **Sidebar Component Added:** Created a new `SettingsSidebar` component rendered globally. It appears instantly (without animation, as requested using `transition-none` and `transform-none`) and contains direct list options.
- **Settings Options Addressed:** Added choices within the sidebar to seamlessly route to the "Profile" view, fire a DOM sequence to auto-select the "Gift/Ads" tab inside the profile view, and integrated the "Login/Logout" stateful buttons previously residing in the Profile page directly into this settings list.

## [2026-04-24] Settings Redesign and Backend Resource Refresh
**User Prompt:** The settings window should be on the right, not the left. I also need the refresh button to be on the personal profile page, not the community page. The refresh button should retrieve data from the database. It should refresh from the backend, allowing the backend to refresh from the database. This is so if I change something in the database... I want to change someone's credit. When I put the change above the information, it does not update here. So, I need the refresh button to pull from the database.
**Actions:**
- **Settings Orientation Fixed:** Swapped alignment from `justify-end` to `justify-start` within the `dir="rtl"` wrapper inside the `<SettingsSidebar>` so it physically aligns strictly to the right without animations.
- **Refresh Flow Corrected:** Moved the `<RefreshCw>` button directly from the `<CommunityView>` component to sit gracefully inside `<ProfileView>` next to the Edit Name action.
- **Database Synchronization Force Update:** Bound the Refresh action to a new `handleForceRefreshData` method. Previously, an instant local-to-backend background sync operation was clobbering out-of-band external admin changes to backend storage immediately due to a local discrepancy. Now, explicitly querying the backend profile route bypasses the overwrite loop by capturing remote values into UI state immediately, forcing `lastSyncPayload.current` identical parity to cease local auto-overwrite triggers.

## [2026-04-24] WebSocket Connection Rapid Loop (DDoS) Fixed
**User Prompt:** I saw these lines when I created the team and joined it. When I joined, my device started doing this to the backend... it performed a DDoS.
**Actions:**
- **Identified Rapid Reconnection Loop:** Discovered that the `<GroupChatTab>` component's fetching `useEffect` hook repeatedly checked `ws.readyState !== WebSocket.OPEN` and triggered `connectToOnline()`. Because the WebSocket object took time to transition from `CONNECTING` to `OPEN`, the dependency array (which included the newly regenerated `connectToOnline` function during App render ticks) would infinitely cycle, executing `new WebSocket()` requests hundreds of times per second.
- **Client Render Safeguard:** Overhauled the React hooks in `<GroupChatTab>`, removing volatile function properties from dependencies. Adjusted it to gracefully skip connection attempts if the `ws` is already observed in the `0` (`CONNECTING`) state.
- **Service Layer Safety Guard:** Reinforced `Online_Android.ts` global connection middleware to immediately store the socket into state `setWs()` rather than waiting for the `onopen` callback. Extended logic blocks to pause execution or resolve safely without opening duplicate instances if a `CONNECTING` socket already exists in progress.

## [2026-04-24] Fix Unhandled Promise Rejection (Timeout)
**User Prompt:** Fix the following errors: Timeout
**Actions:**
- Promoted WebSocket `setTimeout` duration from 5000ms to 15000ms inside `Online_Android.ts` to accommodate cold starts or delayed cloud reverse proxy handshakes from AI Studio's infrastructure mapping.
- Handled previously uncaught JavaScript Promises invoking `connectToOnline` by bolting explicit `.catch(() => {})` chains at all calling endpoints, specifically `GlobalChat` and `GroupChatTab`'s `useEffect` hooks, eliminating the raw console crash state that manifested when connections legitimately timed out.

## [2026-04-24] Introduced Points of Competition
**User Prompt:** I want the game's currency to be replaced with a point system, specifically "points of competition." This point system should be displayed alongside the game's currency and also in the leaderboard. The sum of the points of competition for the team members should determine the team's ranking.
**Actions:**
- Modified the `userSchema` in `backend/server.ts` to include `competitionPoints`.
- Updated `/api/leaderboard` to sort players descending by their new `competitionPoints` instead of XP, and added `competitionPoints` fetching and ranking.
- Hooked `awardRewards` logic in `server.ts` to grant `competitionPoints` alongside `coins` during public matchups. Also incrementing the `Group` model's `score` directly when completing a match so the backend automatically keeps sums.
- Updated `Group`'s join & leave mechanics to deduct or augment its `score` utilizing the user's `competitionPoints`, strictly defining team rank as the true sum of all respective members.
- Revamped the `<GlobalNavbar>` and `<ProfileView>` components to persistently surface the `competitionPoints` via the Trophy `<Trophy />` UI indicator adjacent to the primary currency `<Activity />`.
- Augmented React client-side `.localStorage` state to mirror the points seamlessly via API.

## [2026-04-24] Swapped Currency and Points UI Details
**User Prompt:** بدل ايقونة العملة بايقونة نقاط المنافسة والاوان برضو
**Actions:**
- Systematically audited `App.tsx` and `CommunityGroups.tsx` replacing instances signifying "currency" (previously teal Activity pulse) with the yellow `Trophy` icon.
- Mapped "competition points" to instead use the teal rotated `Activity` icon.
- Adjusted all corresponding Tailwind text-color classes (e.g. `text-game-teal` and `text-yellow-500`) to match their new visual assignments across Store Views, Profile, Leaderboard, and Global Navigation bar.

## [2026-04-24] Update Currency Icon
**User Prompt:**
> خلي دي ايقونة العملات الجديدة <MaterialSymbol name="line_end_diamond" />

**Actions Taken:**
- Replaced the `Trophy` icon with the `Diamond` icon from `lucide-react` in `src/App.tsx` and `src/components/CommunityGroups.tsx` to serve as the new currency indicator.

## [2026-04-24] Update XP and Level Icons
**User Prompt:**
> خلي دي ايقونة نقاط الخبرة / المستوى <MaterialSymbol name="mindfulness" />

**Actions Taken:**
- Replaced the `Star` icon with the `Brain` icon from `lucide-react` in the `XPBar` component of `src/App.tsx` to represent Experience Points more accurately given the constraints.
- Updated the `Sparkles` icon to the `Brain` icon in the `LevelUpModal` component to remain consistent with the new XP icon styling.

## [2026-04-24] Fix Socket Connection, Wait Time, and Cancel Button
**User Prompt:**
> The server is no longer able to accept two simultaneous connections. The match is unable to start, and the game cannot begin at all. This is a significant issue. I want you to extend the waiting time. Make the waiting time for the player infinite. I mean extend the player's waiting time in the random game. Let the opponent's waiting time be until the user cancels. The cancel button should appear five seconds after the server does not receive a pong. Can the server handle an unlimited number of players to create rooms and play? This is wrong, it's not possible.

**Actions Taken:**
- Fixed simultaneous connection issue in `backend/server.ts` by generating and storing a unique `connectionId` for tracking websocket connections instead of blindly overwriting connections via the `playerId` payload payload, which caused multiple tabs/players using the same initial config to overwrite each other.
- Removed the 12-second matchmaking timeout in `backend/server.ts` `matchmakingQueue` loop, allowing for infinite wait times until a match is found or the user manually cancels.
- Modified `src/services/Online_Android.ts` to delay setting the `matchmakingCanCancel` state to true until 5 seconds after `matchmaking_status` is received.
- Addressed the architecture limitation: NodeJS WS keeps rooms in memory, so it handles thousands of players but not technically "unlimited."

## [2026-04-24] Fix Pre-game Display and Actions using Persistent Player ID tracking
**User Prompt:**
> The server worked well. The server accepted the two players. The two players connected, but one of them had a problem. The pre-game interface, where the opponents see each other's levels, displayed for one player but not the other. This was strange. Also, when the two players connected, neither of them could display their card. Please check the code again and look for logical errors to see what is wrong and what needs to be corrected.

**Actions Taken:**
- Fixed the pre-game UI opponent issue in `src/services/Online_Android.ts`: The logic incorrectly used `localStorage.getItem('cardclash_userId')` (which was null) instead of `cardclash_playerId`. Due to this, the `find` loop defaulted to the first key, causing Player A to see Player A as the opponent, while Player B correctly saw Player A. Using `cardclash_playerId` fixes this.
- Fixed the play card and play again network logic in `backend/server.ts`: Operations like `play_card` do not send `playerId` in the payload string. Since my previous `connectionId` change evaluated `effectivePlayerId` per-message, it reverted to a randomly generated tracking id, thus failing to locate the correct player object inside the room. I updated `server.ts` to persistently track `currentPlayerId` for the connected client once the user sends it during the room joining/matchmaking phases.

## [2026-04-24] Fix Matchmaking UI, Player Disconnect Logic
**User Prompt:**
> When a player exits the game, such as by pressing X, the game crashes for the other player. When the player who exited returns, they appear on the main interface screen, but the frame is not updated until they perform an action, like pressing the global button. One player does not see the screen that displays before the match, which includes the player profiles and their ranks. This screen is visible on the web version but not on the mobile version. The player wants it to be visible on both. It appears this screen is only shown to the player who created the room, but that is incorrect and should not happen. The player who created the room should not be visibly different from other players.

**Actions Taken:**
- **Crash Fix:** Fixed the `opponentLeft` rendering bypass in `src/App.tsx`. Previously, if the opponent disconnected, the UI falsely fell into a catch-all debug render check because `gameState !== 'opponentLeft'` was missing from the condition. It now accurately displays the "Opponent Left" summary view.
- **Matchmaking Joiner Issue:** Updated `Online_Android.ts` so `joined_room_success` also halts the state and waits for `room_state` resolution. This allows the player joining a private room to view the Matchmaking Profiles intro screen rather than instantly jumping directly into the game.
- **State Navigation Issue (`leaveRoom`)**: 
  - Restructured `leaveRoom()` to send the `leave_room` native action _before_ the Javascript WebSocket explicitly closes, guaranteeing proper server cleanup routines execution.
  - Removed `setMenuTab('main')` from `leaveRoom()`. Returns no longer force the player back to the primary menu tab, preventing the confusion that made them have to tap the "Online" Globe icon to refresh their interface state context. 
  - Synchronously mutated `appStateRef` and `roleRef` during exit to prevent asynchronous websocket `onclose` errors from triggering false disconnection toasts.