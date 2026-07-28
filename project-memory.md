# Project Memory
Last updated: 2026-07-10 (end of day)

This file captures decisions, reasoning, and session context that
project-context.md doesn't hold. It is Claude's memory between sessions.
Read automatically by /start-of-day. Updated automatically by /end-of-day.

---

## Key decisions (permanent record)

- 2026-07-09 — Architecture decision (superseded 2026-07-10, see below): Static frontend, no backend/database — data needs to be shared across teachers, but a shared-drive JSON file (read/written via File System Access API) is simpler than standing up a hosted database for this use case
- 2026-07-09 — Tech stack chosen: plain HTML/CSS/JS single file — no build tools needed, easiest to run off a shared drive
- 2026-07-09 — Bar length = teacher-entered duration in weeks (not derived from credits/hours) — credits and hours are informational columns only
- 2026-07-09 — Program dropdown filters the view; it does not restrict data — all programs' classes are visible by default, teachers narrow to their own via dropdown
- 2026-07-10 — Architecture decision changed: dropped the shared-drive JSON file approach in favor of Google Firestore (a free hosted database) as the backend. Reason: the OneDrive-synced JSON file required each teacher to manually pick the file every session and had no real conflict handling (silent last-write-wins overwrites) — genuinely unworkable for multiple simultaneous editors. Firestore gives true live auto-save with no file picking and no server to host/maintain.
- 2026-07-10 — Firestore security rules are wide open (`allow read, write: if true`) — deliberate choice since the schedule/credit data isn't sensitive, confirmed with the user rather than assumed.

---

## Sessions

## Session — 2026-07-28

**Focus:** Started with opening the app locally to view it, then moved through several distinct threads: updating Bookkeeping/Business Administration/Business & Finance curriculum data from a new source PDF, confirming and redesigning the financial-aid credit-block mapping (12 credits per 15-week block), generating PDF reports, building a save/reload system for program schedules, putting the project on GitHub, and prototyping a two-teacher (T1 accounting / T2 business) parallel-track schedule mapping.

**Decisions made:**
- index.html must be served over HTTP, not opened via `file://` — it imports the Firebase SDK as ES modules, which Chrome/Edge block with a CORS error over the file protocol. A local Node static server is used for local viewing.
- Business and Finance Program R6.pdf (04/17/26) split "Microsoft Office Suites" (180 hrs combined) into three separate courses — Microsoft Outlook (30 hrs/1 cr), Microsoft Word (30 hrs/1 cr), Microsoft Excel (120 hrs/4 cr) — applied to all three programs (Bookkeeping, Business Administration, Business & Finance), both in live Firestore and in index.html's seed data.
- Confirmed (by reading the code) that credits are attributed to the 15-week block containing a class's END week only — never the start week, never split across the span. This is the block-attribution rule all subsequent block-mapping work depends on (index.html ~line 601-608).
- Redesigned the block/credit schedule for all three programs so every block a program uses hits ≥12 credits (financial-aid minimum) — proved that once a block is used at all, the split across blocks is forced to be exact multiples of 12 (e.g. Business & Finance's 36 credits must split exactly 12/12/12, not just "≥12 each"). Bookkeeping and Business Administration land on 12/12 across 2 blocks; Business & Finance on 12/12/12 across 3 blocks.
- Built a two-teacher (T1 = accounting-named courses, T2 = everything else) parallel-track schedule concept, prompted by a real weekly schedule ("Weekly Schedule - Two Cohorts.pdf") showing 2 teachers each teaching 10 hrs/wk (20 hrs/wk combined per cohort), not the 30 hrs/wk a single continuous class assumes. Iterated through several approaches for how to pace/spread courses across blocks under this model (see Problems solved / Left unresolved) before the user asked to stop and take over manually.
- User plans to teach Bookkeeping, Business Administration, and Business & Finance simultaneously (same teacher, same room), so shared courses (Accounting Principles, Computer & Internet Fundamentals, etc.) need consistent durations across all three programs — course durations must never differ program-to-program for the same course.
- Set up git for the project and pushed the entire folder to an existing GitHub repo, https://github.com/jtball85-png/Credit-Mapping-Chart-Tool (confirmed public is fine; only `.claude/settings.local.json` is gitignored).
- Built `program-maps/<Program>/<YYYY-MM-DD>.json` snapshot files (one per program, dated) plus `scripts/export-program-maps.js` (snapshot all programs from live Firestore) and `scripts/restore-program-map.js <Program> [date]` (restore one program from a saved snapshot without touching others) — a Claude-Code-mediated save/reload workflow (not a UI feature in index.html), git providing the version history.

**Problems solved:**
- Generated `Business_Programs_Block_Mapping.pdf` (landscape comparison report, one page per program plus a cover/comparison page) and `Program_Chart_Visuals.pdf` (landscape, one page per program, reusing index.html's actual chart CSS/markup for visual fidelity to the live app) via headless Chrome print-to-PDF — both saved in the project root.
- Found and fixed a real logic error in the T1/T2 mapping: an early attempt stretched each course's duration by a per-track, per-block proportional factor to make every block visually fill 15 weeks, which made two courses with identical hours (Computer & Internet Fundamentals and Accounting Principles, both 60 hrs) end up with very different durations (3 wks vs 10 wks) purely based on how much other content shared their block — not anything about the course itself. Reverted to plain `hours/30` duration everywhere (fully consistent, matching every other course in the tool), accepting that a lighter-loaded track simply finishes early within a block rather than being stretched.

**Approaches discussed:**
- 0-credit "Applied Practice / Lab Time" placeholder classes to fill schedule gaps — tried, then rejected by the user as too complicated ("getting too into the weeds").
- Stretching only one "filler" course per gap to absorb leftover time — tried, then reverted over a cross-program consistency concern (the user hadn't raised this concern themselves, but it seemed to matter given the shared-teaching-of-3-programs context).
- Proportional stretching of every course in a block (by credit share) so tracks fill exactly 15 weeks — tried per the user's own worked example, then the user identified the same-hours/different-weeks logic error described above.
- Real 10 hrs/wk pacing (`hours/10`) for every course — considered and set aside twice: first because it reopens a capacity conflict (a program's fixed total credits can't cover as many 15-week blocks as the reduced pace forces it to span), which the user resolved earlier via a homework/competency-based framing ("hours equal credits... as long as they complete the competencies they will get the credits"); raised again as an explicit option during the final pacing-consistency discussion and still not chosen.

**Left unresolved:**
- The T1/T2 parallel-track mapping was reverted, at the user's request, to the state from before the `hours/30` consistency fix (commit `973ed6b`) — the version with the per-track/per-block stretching logic error. The user is taking over manually from there rather than continuing with Claude Code's automated mapping iterations. Whatever the user changes manually will not automatically be reflected in `program-maps/` until the export script is run again.
- Business Administration's T1 (accounting) track is very thin under the T1/T2 model — only 3 credits (Accounting Principles + Accounting 1), done in the program's first few weeks, nothing after. Raised as worth reconsidering (is a dedicated 2nd/accounting teacher justified for only 3 credits in this program?) but not resolved.
- The Add/Edit Class dialog's duration field is still manual entry, not auto-calculated from hours — open since 2026-07-09, not addressed this session.
- A background agent's parse of "Weekly Schedule - Two Cohorts.pdf" hour totals (classroom/directed-study/open-classroom time per cohort) flagged real ambiguity about the Full-day cohort's Monday/Friday hours from the text provided; the user clarified verbally (both cohorts attend M-F 8-12, Full-day cohort additionally extends Tue/Wed/Thu into the afternoon) but this was not re-verified against the actual PDF file.

**Files changed this session:**
- index.html — Microsoft Office Suites split into Outlook/Word/Excel in the seed-data generator; comment updates.
- program-maps/ (new) — one dated JSON snapshot per program (8 programs total), regenerated multiple times as the live Firestore data changed.
- scripts/export-program-maps.js (new), scripts/restore-program-map.js (new).
- .gitignore (new) — excludes only `.claude/settings.local.json`.
- Business_Programs_Block_Mapping.pdf (new), Program_Chart_Visuals.pdf (new).
- Live Firestore `classes` collection for Bookkeeping, Business Administration, Business & Finance — startWeek/duration updated multiple times across the block-mapping and T1/T2 iterations described above; ended the session on the proportionally-stretched T1/T2 version (commit `8246098`).
- Git repository initialized this session; 6 commits total, pushed to https://github.com/jtball85-png/Credit-Mapping-Chart-Tool (see project-context.md change log for the full list).

## Session — 2026-07-10

**Focus:** Fix a genuine usability problem with the shared-drive JSON file approach (manual file picking every session, silent overwrite conflicts between simultaneous editors) and replace it with real auto-save.

**Decisions made:**
- Replaced the File System Access API + shared-drive JSON file persistence layer entirely with Google Firestore (free hosted database). The user set up a Firebase project ("program-schedule-chart") and provided the web app config.
- Firestore data model: a `classes` collection (one document per class, doc ID = class ID, fields: program, name, credits, hours, hoursManual, startWeek, duration) and a `programs` collection (one document per program, doc ID = program name). This lets concurrent edits from different teachers merge naturally at the document level instead of clobbering a whole file.
- Firestore security rules are wide open (no auth) — user explicitly chose this over adding a passcode gate, since the data isn't sensitive.
- Class/program IDs switched from sequential integers to Firestore document IDs (strings) — new classes use Firestore's auto-generated IDs via `addDoc`, avoiding ID collisions between simultaneous editors that a shared `nextId` counter could no longer guarantee.
- Added a one-time "Import Starter Data" button in the Manage Programs dialog (replacing the old always-seeded in-memory array) so the three real programs/38 courses get loaded into Firestore exactly once, deliberately, rather than auto-seeding on every load.
- The old `program-data.json` file and the File System Access / IndexedDB handle-persistence code are no longer used — the app now only needs `index.html` on the shared drive; Firestore is the actual data store.

**Problems solved:**
- The user identified that the shared-drive JSON approach had no easy way for multiple teachers to load/save concurrently. Rather than patching around it (handle persistence via IndexedDB, conflict-detection warnings — both were built in the prior session), the user opted to solve it properly with a real backend once the tradeoffs (Firebase setup effort, open security rules, requires internet access) were made explicit and agreed to.
- All CRUD operations (add/edit/delete class; add/rename/delete program) now write directly to Firestore and rely on `onSnapshot` real-time listeners to update the UI — including for the browser tab that made the change itself — removing the need for any manual "Save" action.
- Program rename/delete now use Firestore batched writes (`writeBatch`) so the program document and all of its classes' `program` field updates (rename) or all of its classes' deletion (delete) happen atomically together.

**Left unresolved:**
- Add/Edit Class dialog's duration field is still manual entry — not yet auto-calculated from hours (÷30) the way Hours auto-calculates from credits. Still open from the prior session.
- This project directory has no git repository initialized, so no commits exist for this work. No git history to reference in future sessions.
- Firebase Firestore free-tier usage limits haven't been discussed — not a concern at this scale (a handful of teachers, small dataset), but worth knowing if this ever grows significantly.
- No mechanism yet to prevent someone from accidentally clicking "Import Starter Data" twice and creating duplicate program entries if a program with the same name concept but different casing/spacing is entered — the confirm-dialog warning is the only guard.

**Files changed this session:**
- index.html — removed the File System Access API / IndexedDB persistence layer entirely; added Firebase SDK (via CDN ES module imports) and Firestore-backed live sync (onSnapshot listeners for `classes` and `programs` collections, writeBatch for program rename/delete, addDoc/setDoc/deleteDoc for class CRUD); replaced the file-status header controls with a live "sync status" indicator; added an "Import Starter Data" button to Manage Programs. No git history exists to diff against.
- program-data.json — no longer used by the app; can be deleted from the shared-drive folder (kept in the project folder for now, not referenced by index.html).

## Session — 2026-07-09 (continued, afternoon)

**Focus:** Build and refine the in-memory interactive prototype (index.html) before wiring up shared-drive save/load.

**Decisions made:**
- Credits are always whole numbers; hours auto-calculate as credits × 30, with an "Adjust" toggle to manually override hours per class when needed.
- Duration in weeks = hours ÷ 30 (30 hours = 1 week of work) — applied to the seeded course data; add/edit form still has duration as a manual field (not yet auto-calculated there — open question, see Left unresolved).
- Manage Programs: any program can be renamed (updates all its classes' program field) or deleted at any time; deleting a program with classes assigned prompts a confirmation warning that those classes will also be deleted (cascade delete, not reassignment).
- Seeded real program/course data from "Business and Finance Program R5.pdf" (dated 05/01/26): three programs — Bookkeeping (720 hrs/11 courses), Business Administration (720 hrs/11 courses), Business & Finance (1080 hrs/16 courses) — replacing the earlier placeholder Welding/Nursing sample data. Credits = hours ÷ 30 for each course.
- Courses within each program are scheduled back-to-back in the order listed in the source PDF (sequential start weeks, no gaps), since the PDF had no explicit week-scheduling data.
- Week columns 1-15 and 31-45 get a light grey background shading, weeks 16-30 stay white — purely visual, tuned through several rounds to keep gridlines visible through the shading (settled on #f5f5f3 for row cells, #f3f2ef for header cells).

**Problems solved:**
- Bar/column misalignment: original percentage-based bar positioning didn't match the fixed-width week columns because the week-track container used `flex:1` (stretching wider than the sum of its fixed-width column children). Fixed by giving week columns and the week-track a fixed pixel width (24px × 45) and positioning bars with exact pixel math (`left`/`width` in px) instead of percentages.
- Row height / empty space bug: an intermediate CSS Grid (subgrid) rewrite (done to fix the alignment bug and add a frozen header) caused bars to render at a fixed height rather than stretching to fill the row, leaving dead space under the bar whenever the label column wrapped to multiple lines. Resolved by reverting to the original flex + absolute-positioned bar approach (bar has `top:8px; bottom:8px` so it naturally fills the row height), while keeping the pixel-width fix for alignment and adding `position: sticky` for the frozen header — this preserved the original compact row look the user preferred.
- Added a frozen/sticky header (weeks title row + week-number row) that stays visible when scrolling down the class list, plus the class-name column also freezes horizontally when scrolling right.

**Left unresolved:**
- Add/Edit Class dialog's duration field is still manual entry — has not been wired to auto-calculate from hours (÷30) the way the Hours field auto-calculates from credits. Worth asking the user if they want the same auto-calc + manual-override pattern applied there.
- Shared-drive JSON file save/load (File System Access API + fallback for Safari/Firefox) has not been built yet — everything is still in-memory only, resets on page reload.
- This project directory has no git repository initialized, so no commits exist for this work yet.

**Files changed this session:**
- index.html — major build-out: full interactive prototype (add/edit/delete class dialog, program filter, Manage Programs dialog, week-range shading), followed by several rounds of layout fixes (alignment, row height, sticky header, shading color tuning). No git history exists to diff against.

<!-- end-of-day skill appends new sessions here -->
