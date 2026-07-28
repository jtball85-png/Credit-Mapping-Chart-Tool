# Project: Program Schedule/Credit Chart
Last updated: 2026-07-10 by Claude Code (end of day)

## What this project is
A visual scheduling tool for course programs across a 45-week calendar. Teachers add classes (name, credits, hours, start week, duration) and each class renders as a horizontal bar spanning the weeks it runs, laid out across columns 1-45. Multiple teachers will use it from a shared drive, with a dropdown to filter the view down to a single program.

## Architecture decision
**Does this app need to save data between sessions or between users?**
- [x] Yes → data must persist and be visible to other teachers

**Does this app need to hide secrets from the browser?**
- [x] No

**Current answer (updated 2026-07-10):** Static frontend (HTML/CSS/JS) backed by Google Firestore. `index.html` is still the only file that needs to be on the shared drive — it talks live to a Firestore database (project "program-schedule-chart") instead of reading/writing a local JSON file. Every teacher's browser stays in sync automatically via Firestore real-time listeners; no file picking, no manual save. Superseded the original shared-drive JSON file + File System Access API approach, which had no easy way for multiple teachers to load/save concurrently and no conflict handling.

## Tech stack
| Layer | Tool/Language | Notes |
|---|---|---|
| Frontend | HTML/CSS/vanilla JS | Single-file app, no build tools |
| Backend | None (Backend-as-a-Service) | No server to run/maintain |
| Database | Google Firestore | Project: "program-schedule-chart". Collections: `classes` (one doc per class), `programs` (one doc per program). Security rules wide open (`allow read, write: if true`) — no auth, data isn't sensitive |
| Auth | None | Firestore rules allow open access; anyone with the app's config (visible in page source) can read/write |
| Deployment | Local file / shared drive (OneDrive) | index.html only — no hosting needed, but requires internet access to reach Firestore |
| AI / APIs | None | |

## Data model
Programs have Classes. Each Class has: name, credits, hours, start week (1-45), duration in weeks (drives bar length). A class's bar is drawn from its start week across its duration on the 1-45 week grid.

## User flow
1. User opens the tool, which loads the shared JSON data file.
2. All programs' classes are visible by default; a dropdown lets the user filter to a single program.
3. User clicks "add row," enters class name, credits, hours, and start week + duration in weeks.
4. The new row appears with a bar spanning the entered weeks across the 1-45 column grid.
5. Existing rows can be edited or deleted.
6. Changes save automatically back to the shared data file.

## Current status
Brand new project, no code written yet. Next step is building an interactive in-memory prototype (add rows, see bars render across the 1-45 week grid, filter by program) so the interaction can be validated before wiring up shared-drive file save/load.

## Where we left off
Last commit: N/A — no git repository initialized for this project yet
In progress: index.html is now live-synced with Firestore (real-time, no file picking). User confirmed Firestore is working (sync status shows "Live") and imported starter data successfully. Next action for the user is copying index.html onto the OneDrive shared drive folder for other teachers to use.
Branch: N/A

## What's next
- [ ] Decide whether the Add/Edit Class dialog's duration field should auto-calculate from hours (÷30), matching the Hours-from-credits pattern — Chat/Claude Code
- [ ] Copy index.html to the shared OneDrive folder; delete/ignore the now-unused program-data.json — user

## File structure
```
/project-root
  /src        → app JS/CSS (once split out of prototype)
  /assets     → none yet
  /docs       → reference guides
  /archive    → archived context docs
  index.html  → the Program Schedule Chart app
```

## Environment and credentials
- .env file: not needed
- Variables needed: none in the traditional sense — the Firebase web app config (apiKey, projectId, etc.) is embedded directly in index.html. This is normal for Firebase client SDKs (not a true secret) but is visible to anyone viewing page source.
- Where secrets are stored: not applicable — no secrets. Firestore access is controlled entirely by security rules (currently wide open: `allow read, write: if true`), not by hiding the config.

## Key decisions made
- 2026-07-09 — Project initialized
- 2026-07-09 — Architecture (superseded 2026-07-10): static frontend, no backend/database; data persists to a shared-drive JSON file instead of a hosted database
- 2026-07-09 — Bar length is driven by a teacher-entered "duration in weeks" field, not calculated from credits/hours
- 2026-07-09 — Program dropdown is a filter only, not an access restriction — all programs visible by default
- 2026-07-10 — Architecture changed: moved from shared-drive JSON file to Google Firestore backend, because the JSON file approach required manual file-picking every session and had no conflict handling for simultaneous editors
- 2026-07-10 — Firestore security rules left wide open (no auth) — explicit user decision, since schedule/credit data isn't sensitive

## Known issues
None at this time.

## Context for each tool

### Chat
Thinking, planning, decisions, and fuzzy problems.
Flag architecture changes or scope changes before acting.

### Claude Code
Building and editing files. Tech stack: static HTML/CSS/vanilla JS, no backend, JSON file on shared drive as the data store.
Run /start-of-day at the start of every session.
Run /end-of-day at the end of every session.

### Cowork
Browser tasks, desktop automation, file management.
Use project-context-updater.html on Cowork-heavy days.

## Change log
- 2026-07-10 — Replaced shared-drive JSON file persistence (File System Access API) with Google Firestore live backend: real-time sync via onSnapshot listeners, Firestore-based class/program CRUD with writeBatch for atomic program rename/delete, "Import Starter Data" one-time seed button, removed IndexedDB handle-persistence and file-picker code entirely — Source: Claude Code
- 2026-07-09 — Built interactive prototype in index.html: add/edit/delete class dialog, program filter, Manage Programs (rename/delete), seeded real Bookkeeping/Business Administration/Business & Finance program data from source PDF, week-range grey shading, fixed bar/column alignment bug, fixed row-height regression, added sticky/frozen header — Source: Claude Code
- 2026-07-09 — Project initialized — Source: Claude Code
