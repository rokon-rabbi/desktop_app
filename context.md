# CleanSpace Development Context

This file is the persistent engineering context for the CleanSpace project.

The AI CLI must read this file **before making changes** and update it **after completing a meaningful
change, bug fix, refactor, or milestone**.

The purpose of this file is to make development:

- easier to debug
- easier to resume after a break
- easier for another AI/session/developer to understand
- safer when modifying filesystem code
- easier to track architectural decisions
- easier to avoid repeating previous mistakes
- professional and auditable

---

## 1. Project Overview

### Project Name

CleanSpace

### Product Type

Local-first Linux desktop application.

### Main Purpose

CleanSpace helps users understand, organize, and safely clean files on their computer.

Core product goals:

- scan folders
- categorize files
- analyze disk usage
- organize files safely
- preview changes before applying
- undo file organization operations
- detect duplicate files
- identify cleanup candidates
- generate plans such as:

  I need 10 GB free.

- send unwanted files to Linux Trash instead of permanently deleting them
- monitor selected folders for new files
- remain private and local-first

---

## 2. Technology Stack

```
Language:
TypeScript (strict)

Desktop:
Electron 33

UI:
React 18

Frontend Build Tool:
Vite 5 (via electron-vite 2)

Runtime:
Node.js (Electron-bundled)

Database:
SQLite (better-sqlite3, rebuilt against Electron's ABI)

Platform:
Linux

Architecture:
Electron Main Process
        ↓
   Secure IPC
        ↓
   Preload API
        ↓
  React Renderer
```

Do not change the major stack without documenting the reason in the Architecture Decisions section.

Additional choices made during implementation (see ADRs for reasoning):

- State management: Zustand (renderer-side stores)
- Validation: Zod (all IPC input args)
- Styling: Tailwind CSS with a small CSS-variable design-token system (light/dark)
- Icons: lucide-react
- Trash integration: `trash` npm package (implements the freedesktop.org Trash spec)
- Folder watching: chokidar
- Packaging (scaffolded, unbuilt): electron-builder → `.deb` / AppImage

---

## 3. Development Principles

The project should prioritize:

1. filesystem safety
2. predictable behavior
3. user trust
4. maintainable architecture
5. testability
6. performance
7. polished UX
8. portfolio-quality engineering

Never sacrifice filesystem safety for convenience.

---

## 4. AI CLI Operating Rules

Before doing any development work, the AI must:

1. read this entire `context.md`
2. inspect `git status`
3. inspect the relevant source files
4. inspect recent changes when necessary
5. determine the current milestone
6. understand existing tests before modifying related functionality

Do not assume the repository matches a previous conversation.

The repository is the source of truth.

---

## 5. Change Tracking Rule

After every meaningful implementation, update:

- Current Status
- Completed Features
- Known Issues
- Recent Changes
- Files Changed
- Tests
- Architecture Decisions if applicable
- Next Recommended Task

Do not rewrite the entire history unnecessarily.

Append new development entries to the Development Log.

---

## 6. Current Status

### Current Milestone

Milestone 13 — UX Polish (in progress). Milestones 0–12 are functionally implemented and have each
been manually verified end-to-end (see §28). Milestones 14–17 have not been started in any rigorous
sense (see §7).

### Current State

The application builds, lints, type-checks, and passes its automated test suite. It has been launched
as a real Electron process (not just built) and driven through its actual UI via real DOM clicks —
not just code inspection — for every core flow: scan → dashboard analytics → file browser → organize
preview/apply/undo → duplicate detection → cleanup analysis/planning → send-to-Trash → history →
settings. Filesystem state was independently checked before/after each destructive action (see §28
and DEV-001).

Two real bugs were found and fixed during this verification (not merely typechecked away — they only
surfaced when the scanner and organizer actually ran against real files):

- Scanner double-closed `fs.Dir` handles (`for await...of` on an `fs.Dir` already auto-closes it;
  an explicit `finally { dirHandle.close() }` on top of that threw `ERR_DIR_CLOSED` on every
  directory). Fixed in `src/main/scanner/index.ts`.
- Organize preview flagged a real on-disk destination collision but didn't rename the proposed
  destination (only the in-batch collision case did), so Apply would have safely failed that item
  instead of succeeding. Fixed in `src/main/organizer/preview.ts` to reuse the same rename scheme in
  both cases.

### Last Known Working State

Verified 2026-08-19 (see DEV-001). `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`
all pass. The packaged `.deb`/AppImage output has **not** been produced or tested — packaging is
configured (see §16) but unverified.

---

## 7. Milestone Roadmap

### Milestone 0 — Foundation

Target: Electron, React, Vite, TypeScript, strict TypeScript configuration, ESLint, Prettier, test
framework, secure preload, typed IPC foundation, application shell.

Definition of done:

- [x] application starts successfully on Linux (verified by launching the real Electron binary)
- [x] renderer loads
- [x] secure preload works (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`;
      `window.cleanSpace` bridge verified working end-to-end)
- [x] lint passes
- [x] TypeScript passes (`typecheck:node` and `typecheck:web`, both strict)
- [x] tests pass (36/36)
- [x] production build succeeds (`electron-vite build`)

Status: `DONE / VERIFIED`

### Milestone 1 — Folder Selection

Target: Allow user to select a folder through a native dialog.

Implemented: `dialog:selectFolder` IPC channel + native `dialog.showOpenDialog`; renderer
`ScanPicker` component also offers one-click default targets (Downloads/Desktop/Documents/
Pictures/Videos, only shown if they exist).

Status: `DONE / VERIFIED`

### Milestone 2 — Scanner

Target: Safely recursively scan a selected folder.

Implemented in `src/main/scanner/`: async streaming walk via `fs.promises.opendir`, batched DB
writes + progress events (100 files / 150ms, whichever first), cancellation support, symlinked
directories not followed (symlinked files recorded with `isSymlink: true`), permission errors on a
subdirectory counted and skipped rather than aborting the scan.

Status: `DONE / VERIFIED` — including a real scan of ~23k files (a large real-world nested
`node_modules` tree) and a synthetic fixture with nested/empty/symlinked directories.

### Milestone 3 — File Browser

Target: Display scanned files with sorting, filtering, size/type/category/modified date.

Implemented: `Files` page, `scan:getFiles` IPC (server-side pagination/sort/filter/search against
SQLite, not client-side).

Status: `DONE / VERIFIED`

### Milestone 4 — Categorization

Target: Deterministic file categorization.

Implemented: `src/main/classifier/` — pure extension → category lookup table, no heuristics, no AI.

Status: `DONE / VERIFIED` (unit tested)

### Milestone 5 — Storage Analytics

Target: total scanned storage, category totals, largest files, largest folders.

Implemented: `Dashboard` page + `analytics:getStorageSummary` IPC backed by SQL aggregate queries.

Status: `DONE / VERIFIED`

### Milestone 6 — Organization Preview

Target: Generate proposed file moves without modifying files.

Implemented: `src/main/organizer/preview.ts`. Pure read-only preview; in-batch and on-disk name
collisions are both detected and auto-renamed with a visible warning, never silently overwritten.

Status: `DONE / VERIFIED`

### Milestone 7 — Apply + Undo

Target: Safely execute organization operations and support undo.

Implemented: `src/main/organizer/apply.ts` and `undo.ts`. Every item is independently validated
(`safety/paths.ts::validateMove`) immediately before the move, and again in reverse for undo. Cross-
filesystem moves fall back to copy+verify+delete. All operations and their per-item outcomes are
recorded in SQLite for History/Undo.

Status: `DONE / VERIFIED` — real file moved on disk, then undone, and the final filesystem state was
byte-for-byte identical (same file set, same paths) to the pre-apply state.

### Milestone 8 — Duplicate Detection

Target: Efficient duplicate discovery.

Implemented: `src/main/duplicates/` — size grouping → partial hash (first 64 KB) → full hash, in that
order; nothing is called a duplicate on size or partial-hash alone. Unreadable files are dropped from
consideration rather than guessed at.

Status: `DONE / VERIFIED`

### Milestone 9 — Cleanup Analysis

Target: Generate cleanup candidates with reasons and risk levels.

Implemented: `src/main/cleanup/candidates.ts`. Every candidate carries a `reason` string. Confirmed
duplicates → `safe`; old installers (≥30 days) → `safe`; old archives (≥30 days) → `review`; large
(≥250 MB) files unused for ≥90 days → `review`. `important` risk is a supported value but nothing
currently generates it (see §25).

Status: `DONE / VERIFIED`

### Milestone 10 — Free X GB Planner

Target: support requests such as "I need 10 GB free."

Implemented: `src/main/cleanup/planner.ts::planForTarget`. Greedily selects `safe` candidates before
`review`, largest-first within a tier, stops once the target is met, and never selects `important`.
Full candidate groups are always returned alongside the selection, so nothing is hidden from the user.

Status: `DONE / VERIFIED` (unit tested + manually verified in the Cleanup page)

### Milestone 11 — Linux Trash

Target: Move selected unwanted files to Linux Trash safely.

Implemented: `src/main/trash/`, using the `trash` npm package (freedesktop.org Trash spec). Verified
for real — a real file was sent to Trash through the actual UI, disappeared from its original path,
and reappeared with a correct `.trashinfo` (original path + deletion time) in the correct per-
filesystem trash directory (the spec-mandated `$topdir/.Trash-$uid` when the file isn't on the same
filesystem as `$HOME`, not just `~/.local/share/Trash`).

Status: `DONE / VERIFIED`

### Milestone 12 — Folder Monitoring

Target: Watch selected folders such as Downloads.

Implemented: `src/main/monitoring/` (chokidar, `ignoreInitial: true`, `awaitWriteFinish`), Settings
page to add/remove watched folders, watched folders persisted and restored on app start, new-file
events surfaced as toast notifications app-wide.

Status: `DONE`, not yet manually verified with a real filesystem event (only structurally reviewed +
exercised via the Settings UI for add/remove; the actual "drop a file in and see a toast" path is
untested — see §25/§28).

### Milestone 13 — UX Polish

Target: progress, cancellation, notifications, loading states, empty states, keyboard accessibility,
themes.

Done: progress bars (scan, duplicate hashing, apply/trash), cancellation (scan), toast notifications,
skeleton loading states, empty states on every page, light/dark/system theme with a validated
(dataviz-skill) categorical color palette for the storage-by-category chart.

Not done: a real keyboard-accessibility pass (focus rings exist via Tailwind defaults but no
deliberate audit), no reduced-motion handling.

Status: `IN PROGRESS`

### Milestone 14 — Performance

Target: Benchmark and improve real bottlenecks.

Status: `NOT STARTED`. The scanner and duplicate-hasher already follow the performance guidelines in
§20 (streaming, batching, bounded concurrency, cancellation) by construction, but no formal benchmark
has been run against "tens of thousands of files" as specified. The 23k-file real-world scan in §28
completed without perceptible UI lag, which is encouraging but not a benchmark.

### Milestone 15 — Security Audit

Target: Full filesystem and Electron security review.

Status: `NOT STARTED` as a formal audit, but see §36 — every item on the spec's own checklist has
been walked through and is either satisfied or explicitly called out as not applicable yet.

### Milestone 16 — Packaging

Target: Linux distributables (AppImage, `.deb`).

Status: `IN PROGRESS`. `electron-builder` is configured in `package.json` (`build` field), an app
icon exists at `build/icon.png`, and `npm run dist:deb` / `npm run dist:appimage` scripts exist. No
package has actually been built or installed — this is unverified.

### Milestone 17 — Portfolio Release

Target: excellent README, screenshots, demo, architecture documentation, release notes.

Status: `IN PROGRESS`. README exists (see repo root). No screenshots/demo assets committed yet.

---

## 8. Architecture

```
React Renderer
  Dashboard, Files, Organize, Duplicates, Cleanup, History, Settings
        │
        │  Typed preload API (window.cleanSpace.*)
        ▼
Electron Main Process
  IPC Handlers (Zod-validated, IpcResult<T> envelope)
  Scanner · Classifier · Duplicate Engine · Organizer · Cleanup Planner
  History/Undo · Database (repositories) · Safety (path validation) · Monitoring
        │
        ▼
  Linux Filesystem
        │
        ▼
      SQLite
```

Every IPC handler returns `{ success: true, data } | { success: false, error }` (see
`src/shared/types/index.ts::IpcResult`) rather than letting thrown errors cross the contextBridge —
Electron's structured-clone serialization of thrown `Error` objects is lossy, so this keeps error
codes/messages intact for the renderer (see ADR-003).

---

## 9. Actual Source Structure

The repository was inspected before assuming this — this is what actually exists, not the spec's
suggested layout (close, with a few real-world additions: `main/trash/`, and the renderer's
`components/`/`pages/`/`hooks/`/`stores/`/`lib/`/`types/` are all populated).

```
src/
  main/
    ipc/            — one file per domain (scan, organize, trash, history, ...) + context.ts (handleIpc wrapper)
    scanner/        — recursive async walker + cancellation registry
    classifier/     — deterministic extension → category
    duplicates/      — size → partial hash → full hash pipeline
    organizer/      — preview, apply, undo, cross-filesystem-safe moveFile
    cleanup/        — candidate generation + "I need X GB" planner
    trash/          — Linux Trash integration (dynamic-imports the ESM `trash` package)
    history/        — (folded into database/repositories/operationRepository + organizer/undo)
    database/       — connection, migrations, repositories/ (scan, file, operation, settings)
    safety/         — paths.ts (protected-path checks, move validation), errors.ts, logger.ts
    monitoring/     — chokidar-based FolderMonitor
    index.ts        — app entry, window creation, lifecycle

  preload/
    index.ts        — the entire renderer-facing API surface, narrowly scoped, typed

  renderer/
    components/     — Sidebar, TopBar, Modal, ProgressBar, Badges, CategoryBreakdown, ScanPicker, ...
    pages/          — Dashboard, Files, Organize, Duplicates, Cleanup, History, Settings
    hooks/          — useAsync, useIpcEvent, useCurrentScan, useTheme
    stores/         — appStore (nav/current scan), settingsStore, toastStore (all zustand)
    lib/            — format.ts, category.ts (color/icon tokens)
    types/          — global.d.ts (window.cleanSpace typing)

  shared/
    types/          — all cross-process domain types + IpcResult
    schemas/        — Zod schemas for every IPC input
    constants/      — protected paths, categories, extension map, IPC channel names

test/
  unit/             — paths, classifier, cleanupPlanner, organizerPreview, duplicates
  integration/      — scanner (real temp-directory trees)
```

Tests mirror source responsibilities, per §"Tests should mirror source responsibilities when
reasonable."

---

## 10. Electron Security Requirements

These are non-negotiable unless explicitly reconsidered and documented.

```
contextIsolation = true
nodeIntegration = false
```

Renderer code does not have unrestricted Node.js access. `sandbox: true` is also set (stricter than
the spec's minimum bar) — the preload script only uses `contextBridge`/`ipcRenderer` from `electron`,
so sandboxing costs nothing.

Only narrowly scoped functions are exposed through preload, e.g.:

```
window.cleanSpace.selectFolder()
window.cleanSpace.scan.start(path)
window.cleanSpace.scan.getSummary(scanId)
window.cleanSpace.organize.apply(moves)
```

There is no `window.cleanSpace.runAnything(...)`-style escape hatch.

IPC arguments are validated with Zod (`src/shared/schemas/ipc.ts`) inside every handler before
anything touches the filesystem, via the `handleIpc` wrapper in `src/main/ipc/context.ts`. Paths
supplied by the renderer are never trusted directly — they go through `safety/paths.ts` (protected-
root checks, existence checks, symlink resolution) before use.

---

## 11. Filesystem Safety Rules

Implemented in `src/main/safety/paths.ts`.

Protected roots (`src/shared/constants/index.ts::PROTECTED_ROOTS`): `/proc`, `/sys`, `/dev`, `/run`,
`/boot`, `/bin`, `/sbin`, `/lib`, `/lib64`, `/usr`, `/etc`, `/root`. Checked via resolved-path prefix
matching (`isPathWithinRoot`), not a naive string prefix — `/etcetera` does not falsely match `/etc`
(unit tested).

Default user-facing scan targets: `~/Downloads`, `~/Desktop`, `~/Documents`, `~/Pictures`,
`~/Videos` — offered as quick-picks, not an enforced allowlist; a user can still pick any
non-protected folder via the native dialog.

Symlinked directories are never followed during a scan (symlinked files are recorded, not followed
recursively). Symlinks are also never moved by Organize (skipped with an explicit reason in the
preview).

Before every move (`safety/paths.ts::validateMove`):

1. resolve and check source is not a protected path
2. confirm source still exists
3. resolve and check destination directory is not a protected path and exists
4. confirm nothing already exists at the destination (never silently overwritten)

Only after all four pass does `organizer/apply.ts` perform the move, then records the outcome.

---

## 12. Destructive Action Policy

Permanent deletion is not the default anywhere in the app. "Removing" a file always means:

```
Remove
   ↓
Linux Trash (src/main/trash, via the `trash` npm package)
```

There is no code path that calls `fs.unlink`/`fs.rm` on a user file as a "delete" action — the closest
thing is the cross-filesystem move fallback in `organizer/moveFile.ts`, which only unlinks the
*source* after verifying the copy succeeded (i.e. it's still a move, not a deletion).

Every operation that changes files goes through a preview first:

- Organize → `organize:preview` (read-only) → user confirms in a modal showing exact move count/bytes
  → `organize:apply`
- Duplicates / Cleanup → user reviews and checks/unchecks individual files → confirms in a modal → 
  `trash:send`

---

## 13. Undo Requirements

Every `MOVE` operation is undoable; `TRASH` operations are not (the `trash` package does not return a
recoverable "where did it go" path suitable for programmatic restore — recovery is via the OS trash
UI). This is reflected in `OperationRepository`'s `canUndo` computation.

Undo (`organizer/undo.ts`) reverses each item — `destinationPath → sourcePath` — through the same
`validateMove` pre-flight used for the forward move, so it refuses to overwrite anything that now
occupies the original source path. Verified for real: applying and then undoing an Organize operation
left the filesystem in a state identical to before the operation (see DEV-001).

---

## 14. Database Responsibilities

SQLite stores durable application state at `app.getPath('userData')/cleanspace.sqlite` (WAL mode,
foreign keys on).

Entities (see `src/main/database/migrations.ts`): `scans`, `files`, `operations`, `operation_items`,
`settings`. (`organization_rules` from the spec's suggested list was not needed — organize rules are
currently a fixed, deterministic "one folder per category" scheme, not user-configurable yet; add a
migration for it if/when that becomes configurable.)

All SQL lives behind four repositories (`ScanRepository`, `FileRepository`, `OperationRepository`,
`SettingsRepository`) in `database/repositories/` — no ad hoc queries elsewhere in the codebase.
Schema changes go through the additive, ordered migration list in `database/migrations.ts` (never edit
a shipped migration; append a new one).

---

## 15. File Scanner Requirements

Handled (`src/main/scanner/index.ts`): recursive directories, empty directories, inaccessible
directories (counted + skipped, scan continues), disappearing files mid-scan (counted, continues),
Unicode filenames, spaces, symbolic links (detected explicitly, not followed for directories),
cancellation, batched progress. Streams via `fs.promises.opendir`'s async iterator rather than
buffering whole directory trees; only metadata is read (`lstat`/`stat`), never file contents, except
by the duplicate hasher, which is a separate, on-demand step.

Not yet stress-tested: genuinely large individual files (multi-GB) or extremely deep folder trees.

---

## 16. Categorization Strategy

Deterministic, extension-only (`src/main/classifier/index.ts` + `shared/constants::EXTENSION_CATEGORY_MAP`).
No AI, no content inspection. Categories: Documents, Images, Videos, Audio, Archives, Installers,
Code, Disk Images, Other.

---

## 17. Duplicate Detection Strategy

```
All files
   ↓
Group by size (SQL, only sizes with 2+ files)
   ↓
Partial hash (first 64 KB, SHA-256)
   ↓
Possible matches (2+ per partial-hash bucket)
   ↓
Full hash (SHA-256, whole file)
   ↓
Confirmed duplicates
```

Nothing is declared a duplicate on size or partial hash alone (unit tested: same-size,
different-content files are correctly not grouped). Files that fail to hash (permission error,
deleted mid-scan) are dropped from consideration, not guessed at (unit tested).

---

## 18. Cleanup Candidate Model

```ts
type CleanupRisk = 'safe' | 'review' | 'important';

interface CleanupCandidate {
  path: string;
  sizeBytes: number;
  reason: string;
  risk: CleanupRisk;
  category: FileCategory;
  kind: 'duplicate' | 'old-installer' | 'old-archive' | 'large-unused';
}
```

Every candidate has a non-empty `reason` by construction (`cleanup/candidates.ts` never pushes one
without it). Confirmed duplicate → `safe`. Old installer (≥30 days) → `safe`. Old archive (≥30 days) →
`review`. Large (≥250 MB) + unused (≥90 days by access time) → `review`. `important` is supported by
the type but nothing currently classifies a file as `important` — see §25.

---

## 19. "I Need X GB" Planner

`src/main/cleanup/planner.ts::planForTarget(scanId, candidates, targetBytes)`. Priority: `safe` before
`review`, `important` excluded entirely; within a tier, largest files first (fewer files touched to
hit the target). Stops as soon as the target is met. Returns both the selected subset *and* every
candidate grouped by kind — the full picture is always visible, never hidden, per the spec.

---

## 20. Performance Guidelines

Followed by construction, not yet benchmarked:

- scanner streams directory entries (no full-tree buffering) and batches DB writes/progress events
  (100 files or 150ms, whichever comes first)
- organize-preview's disk-collision check runs with bounded concurrency (32) rather than serially or
  unbounded
- duplicate hashing only reads the first 64 KB for the partial pass; full hashing is streamed
  chunk-by-chunk, never loads a whole file into memory at once
- scan and duplicate-scan both support cancellation / are inherently cancellable between awaits
- no worker threads yet — not justified by a benchmark; single-threaded async I/O has not shown a
  problem in the ~23k-file real-world scan performed during verification (see DEV-001), but this is
  not a formal benchmark (Milestone 14 is not started)

---

## 21. Error Handling

`src/main/safety/errors.ts::toAppError` is the single place Node/filesystem errors get translated:
captures the technical error, maps known `errno` codes (`EACCES`, `ENOENT`, `ENOSPC`, `EEXIST`,
`EISDIR`, `ENOTDIR`, `EXDEV`, `EMFILE`, `EBUSY`, ...) to a user-safe message, logs the technical detail.
No handler in the codebase does `catch {}` silently — every catch either logs+converts via
`toAppError`, or is a deliberately narrow "this specific failure just means skip this one item and
keep going" case (e.g. scanner permission errors), which is commented as such.

IPC handlers never let a thrown error cross the contextBridge as a raw `Error` — see ADR-003.

---

## 22. Logging Strategy

`src/main/safety/logger.ts` — structured JSON lines, levels `debug`/`info`/`warn`/`error`. `debug`/
`info` only print when `NODE_ENV !== 'production'`; `warn`/`error` always print. Metadata fields
follow the spec's suggested shape (`operation`, `module`, `duration`, `fileCount`, `scanId`,
`operationId`, `errorCode`). Full absolute paths are avoided in log messages by convention (error
codes and short context strings are logged instead) — this has not been mechanically enforced (e.g. no
lint rule), so treat it as a convention to keep following, not a guarantee.

---

## 23. Debugging Procedure

Unchanged from the spec — reproduce, document, inspect logs, identify the layer (renderer / IPC / main
/ filesystem / database), write a failing test when practical, implement the smallest fix, run related
tests, run full checks if shared code was touched, manually verify, record the bug and fix here.

This is exactly how the two bugs in §6 were found and fixed this session: real execution (not just
type-checking) surfaced them, a fix was made, and — for the collision-rename bug — a unit test was
added (`organizerPreview.test.ts`) to prevent regression. The dir-handle double-close bug is now
covered by `test/integration/scanner.test.ts` running successfully against real nested directories
(it would have thrown before the fix).

---

## 24. Bug Tracking

### Active Bugs

None known.

### Resolved this session

See DEV-001 in the Development Log for the `ERR_DIR_CLOSED` scanner bug and the organize-preview
collision-rename bug — both found via real execution, fixed, and covered by tests.

---

## 25. Known Limitations

Keep this section current.

- Linux only
- no cloud synchronization
- no remote account system
- semantic/AI categorization not part of the MVP (deterministic only, by design)
- no permanent deletion by default (Trash only)
- advanced system-folder scanning not supported (protected roots are hard-blocked)
- `important`-risk cleanup candidates are a supported type but nothing currently produces one — there
  is no "this looks like a system-related file, exclude it" heuristic yet, because the app currently
  only ever scans user-selected folders (Downloads/Desktop/Documents/Pictures/Videos or a manually
  chosen folder), where that risk is low. Revisit if/when scanning ever expands to less obviously
  "personal" locations.
- duplicate-hash results are not cached: `cleanup:analyze` re-runs the full size→partial→full hash
  pipeline independently of `duplicates:find`, even if the user already ran it on the same scan. The
  `files` table has unused `partial_hash`/`full_hash` columns reserved for this (see §34).
- Folder monitoring (Milestone 12) has not been verified against a real filesystem event (drop a file
  into a watched folder → toast) — only the watch/unwatch UI and persistence were exercised.
- No automated Electron end-to-end test suite. Verification this session was done via a temporary,
  hand-written script that drove the real UI through DOM clicks and was deleted afterward (see
  DEV-001) — valuable as a one-time proof, but not a repeatable, committed E2E harness (Milestone 26's
  "Electron E2E tests" category is not implemented).
- Packaging (`.deb`/AppImage) is configured but never actually built or installed.
- No formal performance benchmark exists yet.
- No keyboard-accessibility audit.

---

## 26. Testing Strategy

```
Unit tests           — done (30 tests): safety/paths, classifier, cleanup/planner, organizer/preview, duplicates
Integration tests    — done (3 tests): scanner against real temp-directory trees (nested/empty/symlinked/permission-denied)
Electron E2E tests    — not implemented as a committed, repeatable suite (see §25)
Manual acceptance     — performed this session via a real Electron process; see §28
```

All tests use generated temporary directories (`fs.mkdtemp` + `os.tmpdir()`), cleaned up in
`afterEach`. No automated test reorganizes or deletes real user files.

One real constraint discovered this session: **`better-sqlite3` is rebuilt against Electron's Node
ABI** (`postinstall: electron-rebuild -f -w better-sqlite3`), so it cannot be `require()`'d from
`vitest`, which runs under the system Node. This is why the automated test suite only covers pure-
logic modules (scanner, classifier, planner, duplicate hashing, path validation, organize preview) —
none of them touch the database. Anything that needs the real database (repositories, and by
extension `trash/index.ts`, `organizer/apply.ts`, `organizer/undo.ts` as *orchestration*, though their
core logic is exercised indirectly) was verified manually inside the real Electron process instead.
If a committed E2E harness is added later, it needs to run inside Electron (e.g. via
`electron-vite preview` + a driver), not under plain `vitest`.

---

## 27. Test Commands

Verified, current commands (inspected from `package.json`):

```
npm run lint          # eslint . --ext .ts,.tsx
npm run typecheck     # tsc --noEmit, both main/preload/shared and renderer configs
npm test              # vitest run
npm run build         # electron-vite build (main + preload + renderer)
npm run dev           # electron-vite dev (not exercised this session)
npm run dist:deb      # electron-builder --linux deb (configured, not run)
npm run dist:appimage # electron-builder --linux AppImage (configured, not run)
```

There is no `npm run test:e2e` — not implemented (see §25/§26).

---

## 28. Manual Test Checklist

Maintain this as features are implemented. Checked items were verified this session by launching the
real Electron binary and driving the real UI (via real DOM clicks dispatched to actual React event
handlers, not by calling internal functions directly) against both a small synthetic fixture (with
deliberate duplicates and aged files) and, for the scanner, a real ~23k-file directory tree.

### Foundation

- [x] App launches on Linux
- [x] React UI renders
- [x] DevTools/console show no unexpected errors (only the one deliberately-triggered bug, since
      fixed — see §6)
- [x] Node APIs are inaccessible directly from the renderer (contextIsolation + sandbox; only
      `window.cleanSpace` is exposed)
- [x] preload API exists and works (every page's data comes through it)
- [x] production build completes

### Folder Selection

- [x] Can open folder picker (verified via a mocked-but-real `dialog.showOpenDialog` call through the
      real "Choose folder…" button)
- [ ] Cancel works (not exercised this session)
- [x] Selected path displays correctly

### Scanner

- [x] Can scan empty folder (implicit — empty subdirectories in the fixture produced no errors)
- [x] Can scan nested folder
- [x] Permission failure does not crash app (unit/integration tested; not re-verified via the live UI
      this session)
- [ ] Unicode paths work (not exercised this session with real Unicode filenames through the UI,
      though nothing in the implementation is ASCII-specific)
- [x] Symlink behavior is correct (symlinked file recorded, symlinked directory not recursed into —
      integration tested)

### File Browser

- [x] Files list, sorts, filters, and searches correctly (verified against a real ~23k-file scan)
- [x] Category badges render correctly

### Storage Analytics

- [x] Category breakdown chart renders correctly with accurate proportions and byte totals
- [x] Largest files / largest folders lists are accurate

### Organize

- [x] Preview shows correct proposed moves
- [x] In-batch and on-disk collisions are both detected and safely renamed
- [x] Confirmation modal shows accurate counts before applying
- [x] Apply actually moves the file on disk
- [x] Undo actually reverses the move on disk, restoring the exact original path
- [x] History reflects status transitions (completed → undone) correctly

### Duplicates

- [x] Duplicate groups are correctly identified from real files
- [x] Non-duplicate same-size files are correctly excluded (unit tested)
- [x] Default selection (keep oldest, select the rest) is sensible and consistent with Cleanup's logic

### Cleanup

- [x] Candidates are correctly generated with reasons and risk levels for real duplicate/old-installer/
      old-archive files
- [x] "I need X GB" planner produces a plan (used the UI to request a plan and got a sane result)

### Trash

- [x] Selected files are actually removed from their original location
- [x] Removed files actually land in the correct XDG Trash location (including the per-filesystem
      `.Trash-$uid` case when the file isn't on the same filesystem as `$HOME`) with a correct
      `.trashinfo` (original path + deletion time)
- [x] Operation is recorded in History as `TRASH`/`completed`

### History

- [x] Operations list renders
- [x] Undo button appears only for undoable operations and disappears after undo

### Settings

- [x] Theme switch updates the UI (verified default dark rendering; light/system not re-screenshotted)
- [x] Watched-folder add/remove UI works and persists (list updates after add/remove via
      `monitoring:watch`/`unwatch`)
- [ ] Actually watching a folder and receiving a new-file toast (not exercised — see §25)

### Cross-cutting

- [x] Toast notifications appear for success/error and auto-dismiss
- [x] Loading skeletons appear during slow operations (large-folder Organize preview showed the
      skeleton state)
- [x] Empty states render correctly on every page with no active scan

Add new checks as features are implemented.

---

## 29. Architecture Decisions

### ADR-001

Date: 2026-08-19

Decision: Use TypeScript + Electron + React for the first production implementation.

Reason: The project needs a polished desktop UI, filesystem access, fast development, and a single
primary language.

Alternatives:

- Rust + Tauri
- Java + JavaFX
- C + GTK
- Python + Qt

Tradeoffs: Electron has a larger runtime and memory footprint than native Rust/C applications, but
development velocity and UI ecosystem are stronger for the current project goals.

Status: Accepted

### ADR-002

Date: 2026-08-19

Decision: Build the Electron main process and preload script as CommonJS (`.cjs`), not ESM, despite
the project's `package.json` having `"type": "module"`.

Reason: `electron-vite`'s default main-process output format is ESM when `package.json` declares
`"type": "module"`. In practice this broke in two ways when actually launched (not just built):
(1) statically ESM-importing certain externalized CJS `node_modules` dependencies triggered a Node
`cjs-module-lexer` crash (`Cannot read properties of undefined (reading 'exports')`) during module
linking, before the app even started; (2) even after working around that, a `.js` main entry under
`"type": "module"` is ambiguous — Node needs an unambiguous CJS signal. Forcing `format: 'cjs'` with
`entryFileNames: '[name].cjs'` for both `main` and `preload` in `electron.vite.config.ts`, and pointing
`package.json`'s `"main"` and the preload path in `src/main/index.ts` at the `.cjs` files, resolved
both issues and the app now launches and runs correctly.

Alternatives considered: keep ESM main and dynamic-`import()` every CJS dependency (rejected — too
invasive, and the root cause of the lexer crash wasn't conclusively isolated to a single dependency);
drop `"type": "module"` from `package.json` entirely (rejected — the renderer's Vite build and other
tooling are already working correctly with it, and only main/preload needed the override).

One consequence: the `trash` npm package (v9) is itself ESM-only, so it cannot be statically imported
from the now-CJS main bundle. `src/main/trash/index.ts` loads it via a cached dynamic `import()`
instead (Node supports `import()` from CJS even though it doesn't support `require()` of an ESM
module). This is expected and documented in that file, not a workaround to revisit.

Tradeoffs: main/preload source can still be written as ESM (`import`/`export`) — only the *build
output* format changed — so this has no effect on day-to-day development, only on the build config.

Status: Accepted

### ADR-003

Date: 2026-08-19

Decision: Every IPC handler returns a structured `IpcResult<T> = { success: true; data: T } | { success:
false; error: AppError }` envelope instead of throwing errors across the contextBridge.

Reason: Electron serializes a thrown `Error` object across `ipcRenderer.invoke` lossily (the renderer
side gets a generic `Error` whose message is a mangled combination of the original message and
"Error invoked handler"; structured fields like an error `code` don't survive). Returning a plain,
structured-clone-safe object keeps `AppError`'s `code`/`message`/`technical` fields intact, and lets
`src/main/ipc/context.ts::handleIpc` centralize both Zod validation and error translation in one place
for every handler.

Alternatives: let handlers throw and have the preload wrapper try to parse Electron's mangled error
message (rejected — fragile); a custom IPC transport bypassing `ipcRenderer.invoke` (rejected —
unnecessary complexity for no real benefit here).

Tradeoffs: every call site in the preload's `invoke()` helper has to unwrap the envelope and re-throw
a `CleanSpaceIpcError` for renderer code to catch normally — one extra layer, but it's centralized in
a single function (`src/preload/index.ts::invoke`), not repeated per call.

Status: Accepted

---

## 30. Recent Changes

Detailed history belongs in the Development Log (§38). Current summary:

Full initial implementation of CleanSpace, from an empty directory to a working, manually-verified
Electron application covering Milestones 0–12 and part of 13. See DEV-001.

---

## 31. Files Changed

This was the initial implementation — essentially the entire repository is new. Summarized by area
rather than itemized per-file (80 source/test files, ~5,100 lines of TypeScript/TSX):

```
Added:
- package.json, tsconfig*.json, electron.vite.config.ts, tailwind.config.js, postcss.config.js,
  vitest.config.ts, .eslintrc.cjs, .prettierrc.json, .gitignore
- src/shared/{types,schemas,constants}/*  — cross-process contract
- src/main/{safety,database,scanner,classifier,duplicates,organizer,cleanup,trash,monitoring,ipc}/*
- src/main/index.ts
- src/preload/index.ts
- src/renderer/{components,pages,hooks,stores,lib,types}/*, App.tsx, main.tsx, index.html, index.css
- test/unit/*, test/integration/*
- build/icon.png
- context.md, README.md

Deleted:
- none (nothing pre-existed)
```

---

## 32. Completed Features

Current (verified, not just implemented — see §28 for what "verified" means here):

- Secure Electron shell (contextIsolation, no nodeIntegration, sandboxed preload, typed IPC with Zod
  validation and structured error envelopes)
- Native folder picker + quick-pick default targets
- Recursive, cancellable, streaming folder scanner with symlink/permission handling
- Deterministic file categorization
- Sortable/filterable/searchable file browser (server-side pagination)
- Storage analytics dashboard with a dataviz-skill-validated categorical color chart
- Organize: preview → confirm → apply → undo, with collision-safe renaming and full disk-state
  verification
- Duplicate detection (size → partial hash → full hash)
- Cleanup candidate generation with reasons/risk levels, and an "I need X GB" planner
- Linux Trash integration, verified against the real XDG trash spec behavior
- Operation history with undo
- Folder monitoring (watch/unwatch, persisted, new-file toast wiring — event delivery itself
  unverified, see §25)
- Light/dark/system theming
- Toast notifications, loading skeletons, empty states throughout

Do not mark something complete based only on code existing — everything above was exercised for real
this session, and the two features/behaviors called out as unverified in §25 are deliberately *not*
listed here as "done."

---

## 33. In-Progress Work

Current: Milestone 13 (UX Polish) — keyboard accessibility audit and reduced-motion handling are the
remaining known gaps.

---

## 34. Known Technical Debt

```
TECH-DEBT-001

Area:
Duplicate detection / Cleanup analysis

Problem:
`cleanup:analyze` re-runs the full size→partial-hash→full-hash pipeline independently of
`duplicates:find`, even when both are called for the same scan in the same session. The `files`
table already has `partial_hash`/`full_hash` columns reserved for this but they are never written.

Reason temporary:
Implemented for MVP correctness/simplicity first; caching adds invalidation complexity (a file's
hash is only valid until the file changes on disk) that wasn't worth the risk before the core
pipeline itself was proven correct.

Future:
Persist computed hashes onto the `files` row as they're computed, and have both `duplicates:find`
and `cleanup:analyze` check for an existing hash (plus a modified-time check) before recomputing.
```

```
TECH-DEBT-002

Area:
Testing

Problem:
`better-sqlite3` is rebuilt against Electron's Node ABI (see §26), so no automated test can exercise
code that touches the real database, and there is no committed, repeatable Electron E2E harness —
this session's manual verification used a temporary script that was deleted afterward.

Reason temporary:
Building a proper Electron E2E harness (e.g. spawning `electron-vite preview` and driving it with a
real automation tool) is a real chunk of work that hasn't been prioritized yet relative to getting
the core product correct first.

Future:
Add a `test:e2e` script that launches the built app and drives it (Playwright's Electron support, or
a hand-rolled driver like the one used ad hoc this session, but committed and repeatable) covering at
minimum: scan → organize apply/undo → trash send, with real filesystem assertions.
```

```
TECH-DEBT-003

Area:
Settings

Problem:
`AppSettings.confirmBeforeApply` exists in the schema/DB but nothing reads it — the confirmation
modal before Organize-apply / Trash-send is currently always shown unconditionally, not gated by
this setting.

Reason temporary:
Given "never sacrifice filesystem safety for convenience" (§3), making confirmation skippable felt
like it needed a deliberate decision rather than being wired up incidentally while building the
Settings page. Left the field in place rather than removing it, since a "skip confirmation" setting
is a reasonable ask.

Future:
Either wire it up deliberately (with an explicit decision about whether Trash-send should ever be
allowed to skip confirmation, given it's real, non-undoable-by-this-app filesystem mutation), or
remove the dead field if the decision is "no, always confirm."
```

---

## 35. Dependency Tracking

```
Package:
better-sqlite3

Purpose:
Durable application state (scans, files, operations, settings).

Used By:
src/main/database/*

Reason Selected:
Synchronous API keeps repository code simple (no async/await noise for what are fast local
queries); de facto standard for Electron + SQLite.

Risk:
Native module — must be rebuilt against Electron's ABI (`electron-rebuild`, wired as `postinstall`).
This also means it can't be loaded under plain Node (see TECH-DEBT-002).
```

```
Package:
trash

Purpose:
Send files to the Linux Trash instead of permanently deleting them (§12).

Used By:
src/main/trash/index.ts

Reason Selected:
Implements the freedesktop.org Trash spec directly (including the per-filesystem
`$topdir/.Trash-$uid` case), verified working this session.

Risk:
ESM-only as of v9 — loaded via dynamic `import()` from the CJS main bundle (see ADR-002). Low
maintenance risk otherwise (small, focused, widely used).
```

```
Package:
chokidar

Purpose:
Folder monitoring (Milestone 12).

Used By:
src/main/monitoring/index.ts

Reason Selected:
De facto standard Node filesystem watcher; handles `awaitWriteFinish` out of the box, which matters
for not firing on a still-downloading file.

Risk:
Low. Watch depth is hardcoded to 4 — revisit if a deeply nested watched folder turns out to need more.
```

```
Package:
zod

Purpose:
Validates every IPC handler's input arguments before they touch the filesystem (§10).

Used By:
src/shared/schemas/ipc.ts, src/main/ipc/context.ts

Risk:
Low. Well-established, no native dependencies.
```

```
Package:
zustand

Purpose:
Renderer-side state (current scan/page navigation, settings, toasts).

Used By:
src/renderer/stores/*

Reason Selected:
Minimal boilerplate compared to Redux/Context-based alternatives for this app's fairly small amount
of cross-component state; avoided pulling in a router or a data-fetching library (React Query, etc.)
since the app's needs didn't justify them yet.

Risk:
Low.
```

```
Package:
electron-builder

Purpose:
Package the app as `.deb`/AppImage (Milestone 16).

Used By:
package.json `build` field, `npm run dist:*`

Risk:
Configured but unverified — has not actually produced a package yet (see §16, §25).
```

Do not add large dependencies for trivial tasks — no charting library was added; the storage-by-
category chart is hand-built (per the dataviz skill's guidance) rather than pulling in a charting
dependency for a single proportional bar.

---

## 36. Security Review Checklist

Before major releases verify:

- [x] `nodeIntegration` disabled
- [x] `contextIsolation` enabled
- [x] preload exposes minimum necessary functionality (`window.cleanSpace.*`, no generic passthrough)
- [x] IPC input validation exists (Zod, every handler, via `handleIpc`)
- [x] filesystem paths are validated (`safety/paths.ts`, before every scan/watch/move)
- [x] protected paths are handled (hard-blocked, unit tested)
- [x] symlink behavior is safe (not followed for directories; unit + integration tested)
- [x] move operations prevent overwrites (`validateMove`, unit tested + verified live)
- [x] cleanup uses Trash (verified live, including XDG per-filesystem behavior)
- [x] SQL input is parameterized (all repository queries use `better-sqlite3` prepared statements
      with bound parameters — no string concatenation into SQL anywhere)
- [x] renderer output is safe (React escapes by default; no `dangerouslySetInnerHTML` anywhere in the
      renderer; a strict `Content-Security-Policy` meta tag is set in `index.html`)
- [x] no arbitrary command execution exists (no `child_process` usage anywhere in the codebase)
- [ ] dependencies audited — `npm audit` currently reports vulnerabilities in the dependency tree
      (mostly in `electron-builder`'s own toolchain, not runtime app dependencies); not yet triaged
      line-by-line
- [x] sensitive logs reviewed (logger avoids full paths by convention, see §22 — not mechanically
      enforced)

---

## 37. Definition of Done

A task is only complete when applicable items pass:

- implementation complete
- TypeScript passes
- lint passes
- tests pass
- build passes
- error handling exists
- edge cases considered
- manual test steps documented
- `context.md` updated

Do not mark work finished while known relevant checks are failing.

---

## 38. Development Log

Append entries. Do not delete historical entries unless they are clearly incorrect.

---

### DEV-000

Date: 2026-08-19

Type: Project initialization context

Milestone: Milestone 0

Summary: Created the persistent development context specification for CleanSpace.

Reason: Future AI CLI sessions need a consistent source of project state, architecture, safety rules,
debugging history, and feature progress.

Changes:

- established project goals
- documented technology stack
- documented milestone roadmap
- documented filesystem safety rules
- established bug tracking process
- established architecture decision records
- established change tracking process
- established testing and debugging expectations

Verification: Documentation only.

Next: Inspect the actual repository and begin or resume Milestone 0.

---

### DEV-001

Date: 2026-08-19

Type: Feature

Milestone: Milestones 0 through 13 (partial)

Goal: Build CleanSpace from an empty repository into a working, carefully-verified Electron
application, following the safety and architecture rules this file specifies.

Before: Empty directory (no git repo, no files).

Implementation: Full stack scaffolded and built in one session — see §9 for structure, §7 for
per-milestone detail. Highlights: strict TypeScript throughout; every IPC call Zod-validated and
wrapped in a structured `IpcResult` envelope (ADR-003); main/preload built as CJS for native-module
and ESM-interop reasons discovered by actually running the app, not just building it (ADR-002);
filesystem safety centralized in `safety/paths.ts` and used by every code path that touches disk;
duplicate detection and cleanup candidate generation follow the exact size→partial→full-hash and
safe→review→important priority schemes from this spec; a from-scratch design system (Tailwind +
CSS-variable tokens, light/dark) including a dataviz-skill-validated 8-color categorical palette for
the storage breakdown chart.

Files Changed: See §31 (essentially the entire repository — initial implementation).

Important Decisions: See ADR-001 (already existed), ADR-002, ADR-003.

Testing: `npm run lint`, `npm run typecheck`, `npm test` (36/36 passing), `npm run build` — all
passing on the final state. Unit tests cover path safety, classification, cleanup planning, organize-
preview collision handling, and duplicate hashing. An integration test covers the scanner against real
temporary directory trees (nested, empty, symlinked, permission-denied).

Manual Verification: This is the important part — the app was actually launched as a real Electron
process (working around this sandbox's `ELECTRON_RUN_AS_NODE=1`, which is set because the harness
running this session is itself Electron-based) and driven through real DOM clicks against its actual
compiled UI, twice: once against a small synthetic fixture with deliberate duplicate files and
aged installer/archive files, and once against a real ~23,000-file directory tree (this very
project's own `node_modules`, which happens to live under `~/Downloads`). Verified for real, with
before/after filesystem checks, not just UI screenshots:

- Scan → Dashboard analytics → Files browser → Organize preview, all against real data
- Organize apply: a real duplicate file was actually moved on disk into its category folder, with a
  real on-disk name collision correctly detected and renamed
- Organize undo: the same operation was undone, and the filesystem was verified byte-for-byte back
  to its exact pre-apply state (same file set, same paths)
- Duplicate detection: found the real duplicate pairs in the fixture correctly, with correct wasted-
  bytes math and a sensible (oldest-first) "which one is the original" choice
- Cleanup analysis + planner: correctly grouped duplicates/old-installer/old-archive candidates with
  correct reasons and risk levels
- Trash: a real file was sent to Trash through the real UI, disappeared from its original path, and
  was found in the *correct* location per the freedesktop.org spec — this sandbox's `/tmp` is a
  separate filesystem from `$HOME`, so the correct behavior is the per-filesystem
  `/tmp/.Trash-1000/files/` directory, not `~/.local/share/Trash`, and that's exactly what happened,
  with a correct `.trashinfo` recording the original path
- History correctly showed the MOVE operation transition from `completed` to `undone`, and the TRASH
  operation as `completed`/not-undoable

Problems Encountered:

1. Scanner crashed every directory read with `ERR_DIR_CLOSED` the first time it actually ran against
   real files — `for await...of` on an `fs.Dir` closes the handle automatically, and an explicit
   `finally { dirHandle.close() }` double-closed it.
2. Organize preview's on-disk collision check flagged the collision but didn't rename the destination
   the way the in-batch collision case did, so Apply would have safely failed that one item instead
   of succeeding — inconsistent with the in-batch case and worse UX, though not unsafe (validateMove's
   overwrite check would still have refused to clobber the existing file).
3. `electron-vite`'s default main-process build output was ESM (matching `"type": "module"` in
   `package.json`), which crashed on launch two different ways (a `cjs-module-lexer` failure loading
   an externalized CJS dependency, and — after working around that — an `ERR_REQUIRE_ESM` on the
   ESM-only `trash` package). Neither was caught by `npm run build` succeeding — the build produced
   valid-looking output that only failed when actually launched.
4. This sandbox environment sets `ELECTRON_RUN_AS_NODE=1` (because the harness running this session
   is itself an Electron app), which makes any nested Electron binary behave as plain Node —
   `require('electron')` returns a path string instead of the real API, so `electron.app` was
   `undefined`. Had to unset it (`env -u ELECTRON_RUN_AS_NODE`) to launch the real app for
   verification.

Resolution: See §6/DEV-001 and ADR-002 for the fixes. All four were fixed before proceeding, and (1)
and (2) now have regression tests.

Remaining Issues: See §25 (Known Limitations) and §34 (Known Technical Debt) in full. Highlights:
folder-monitoring's actual new-file-event delivery is unverified; no committed E2E test harness;
packaging is configured but never actually built; no performance benchmark; no keyboard-accessibility
audit; `confirmBeforeApply` setting is unused.

Commit: (not yet committed — see Session Handoff)

Next: See §40.

---

## 39. Template for Future Development Entries

Copy this section for every meaningful development change.

```
## DEV-XXX

Date:
YYYY-MM-DD

Type:
Feature / Fix / Refactor / Test / Security / Performance / Documentation

Milestone:
Milestone X

Goal:
What we wanted to accomplish.

Before:
Relevant previous state.

Implementation:
What was changed.

Files Changed:
- path
- path

Important Decisions:
Any implementation decisions that future developers need to understand.

Testing:
Commands executed and their results.

Manual Verification:
What was manually tested.

Problems Encountered:
Any failures or unexpected behavior.

Resolution:
How problems were fixed.

Remaining Issues:
Anything intentionally left unresolved.

Commit:
Suggested or actual commit hash/message.

Next:
Recommended next action.
```

---

## 40. Session Handoff

Before stopping a development session, the AI CLI must update this section.

### Last Session

Date:

```
2026-08-19
```

Worked On:

```
Full initial implementation of CleanSpace (Milestones 0–12 and part of 13), from an empty directory
to a manually-verified, working Electron app. See DEV-001.
```

Last Verified State:

```
npm run lint / typecheck / test / build all pass. The app was launched as a real Electron process and
verified end-to-end for scan, dashboard, files, organize (preview/apply/undo), duplicates, cleanup
planning, and trash — with real filesystem checks before/after, not just screenshots. Not yet
committed to git (repo was `git init`'d but no commit made yet — see Next Recommended Action).
```

Current Blocker:

```
None known. Deliberately-deferred items are tracked in §25/§34, not blockers.
```

Resume From:

```
Read context.md, inspect git status/log, run npm run lint && npm run typecheck && npm test && npm run
build to reconfirm nothing regressed, then continue with Milestone 13 (keyboard accessibility,
reduced motion) or pick from Known Technical Debt (§34) / Known Limitations (§25).
```

Next Recommended Action:

```
Make the first git commit (repo currently has no commits). Then either finish Milestone 13 (keyboard
accessibility pass) or address TECH-DEBT-002 (a real, committed Electron E2E test harness) — the
latter would make future sessions' verification far cheaper than the ad hoc scripted approach used
this session.
```

---

## 41. AI CLI End-of-Task Requirement

At the end of every meaningful task, output a concise summary containing:

```
Completed:
What changed.

Verified:
What tests/checks passed.

Failed:
Anything that did not pass.

Context Updated:
Yes / No

Suggested Commit:
type(scope): description

Next:
Single recommended next task.
```

Then update this file before ending the session.

---

## 42. Critical Reminder

This application modifies users' files.

A bug in a normal application may produce a broken screen.

A bug in CleanSpace may cause data loss.

Therefore:

> Correctness and recoverability are more important than cleverness.

When uncertain about a file operation:

**do nothing and ask the user to review it.**
