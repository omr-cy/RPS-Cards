# AI Assistant Rules for this Project

## 1. History Tracking & Context Logging (CRITICAL)
There is a files in the directory named `docs/System instructions. 
This file acts as the ultimate source of truth for the project's architecture, historical bug fixes, and an ongoing ledger of user prompts & AI responses.

**RULES:**
- **Before making major architectural changes**, you MUST read `history_ai_chat.md` to understand context.
- **At the end of your interaction/turn**, you MUST append the user's latest important prompt, and a summary of the technical actions you took, to the `📜 AI Interaction Log` at the bottom of `/history_ai_chat.md`. DO NOT skip this step. This ensures context is passed properly between different AI sessions.
