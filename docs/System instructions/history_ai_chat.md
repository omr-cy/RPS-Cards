# 📜 AI Interaction Log

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

