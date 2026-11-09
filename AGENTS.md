# AGENTS.md — Global Production Ruleset (Spire / Blum)

## 1. Language & Communication (Strict Russian Mode)

- Output Language: ALL responses, explanations, and reasoning must be exclusively in Russian. Responses in English are strictly forbidden unless the user explicitly writes in English.

- Code Language: English ONLY for code, commit messages, logs, variable names, and file paths.

- Tone & Format: Absolute brevity. No greetings, apologies, conversational filler, or polite intros (avoid "Sure, I can help", "No problem"). Deliver direct technical facts. Never write text summaries after code blocks unless requested.

## 2. Code Integrity & Delivery

- No Placeholders: Never use placeholders, truncated code, or comments like `// TODO`, `...`, or "rest of the code remains the same". Always output complete, ready-to-copy files or precise, unambiguous diffs.

- Preserve Context: Do not delete existing user comments, business logic, or auxiliary functions unless explicitly instructed.

- No Hallucinations: Use only verified, fully documented libraries, methods, and parameters. Never invent non-existent APIs or syntax. Verify against installed packages before using.

## 3. Tech Stack & Environment

- Project Blueprint: Note-taking app **Spire** (React 18 + Vite 5 + TypeScript 5.6 + Tauri 2 + Zustand). Repository `AlexBlack-Dev/spire` (public). Git root: `C:\My Forks\spire\spire` (NOT the fork root).

- Dependency Lock: Do not install, update, or remove any packages or external dependencies in `package.json` without explicit written approval.

- Security Boundary: Never modify, overwrite, or expose environment variables (`.env`), private keys, API tokens, or production deployment configurations. Never commit secrets, keys, or logs.

- GitHub & MCP Awareness: The single upstream is `AlexBlack-Dev/spire` (remote `origin`, default branch `master`, CI on tags `v*` via `.github/workflows/release.yml`). GitHub automation (issues, PRs, releases, file contents) runs through GitHub API/MCP tools; if MCP is unavailable, fall back to the GitHub REST API via `curl` or the official `gh` CLI. Always know the current remote, branch, and tag before pushing.

## 4. Architecture & Quality Standards

- No Over-Engineering: Write clean, flat, and readable code. Avoid redundant abstractions, unnecessary design patterns, and empty wrapper functions. Do NOT add comments to code unless asked.

- Strict Typing: Enforce robust type safety across all application layers. Avoid loose types like `any`, `unknown`, or disabling linter checks (e.g., do not use `ts-ignore`, `// eslint-disable`).

- Error Handling: Never swallow exceptions or leave `catch` blocks empty. Errors must be explicitly logged with full execution context or propagated to the store's `addLog`/`showToast` layer.

- Resource Management: Always ensure explicit cleanup of open connections, file descriptors, event listeners (tiptap, window, document), streams, `setTimeout`/`setInterval`, and timers to prevent memory leaks. Unregister listeners in effect cleanup.

- Idempotency: Code changes must be designed so that executing them multiple times safely preserves application state, data, and logic. Pre-flight: mentally simulate against tsc/eslint rules before rendering the final response.

## 5. Project Spire — Core Architecture Constraints

- Zustand Store: Single store in `src/store/useStore.ts`, but logic is split into slices (`src/store/slices/*.ts`: `notesSlice`, `tasksSlice`, `folderSlice`, `lockSlice`, `uiSlice`, `settingsSlice`, `converterSlice`) sharing `SpireStore`/`SpireSet`/`SpireSlice` types from `src/store/types.ts` and shared helpers from `src/store/helpers.ts` (`tKey`, `COLORS`, `getContentText`, `htmlToMarkdown`, `pwHash`/`pwVerify`, `readFileAsBase64`). Thin logic (file saving, migration, export/import) lives in the store, NEVER in components. Do NOT mutate state directly — always call store actions.

- Theme & Accent Rules: All colors must use CSS variables exclusively (`--accent`, `--accent-hover`, `--accent-dim`, `--surface-0..4`, `--text-*`, `--border-*`) from `src/index.css` (dark theme + `[data-theme="light"]`). `--accent`/`--accent-hover` are set at runtime in `App.tsx` from the store's `accentColor`. NEVER hardcode hex codes (e.g. `#7c6af7`, `#181824`) or light backgrounds in components. Shared named colors (`COLOR_HEX`, `COLOR_NAMES`) live in `src/utils/format.ts`. Palette accent parameters must pass through `hexToRgba`.

- File Notes Logic: If `note.filePath` is set, `note.content` is the raw file content (byte-for-byte). Rich notes use TipTap HTML. NEVER apply HTML conversions, strip tags, or markdown parsing to file note content — neither in `saveFile`, list previews (`Sidebar`, `MobileNoteList`), nor `share`/converter. File notes are edited via the `rawDraft` textarea; spreadsheets via `SpreadsheetEditor`; csv/json/md preview via `renderedContent` + the "Source/Preview" toggle only.

- Parallel Branches (Desktop vs Mobile): Feature implementation MUST be duplicated in parallel. Desktop: `TitleBar`, `Sidebar`, `NoteEditor`, `SettingsModal`. Mobile: `MobileLayout`, `MobileNoteList`, `MobileSettings`, `ToolsView`, `BottomNav`. Editing a feature means editing BOTH branches simultaneously.

- i18n Rules: Any new translation key goes into BOTH dictionaries (`en` + `ru`) in `src/i18n/translations.ts`. Do not rename/delete keys; preserve the `Dict` type. Lookup pattern: `const t = (key: string) => translations[language][key] || key;`.

- Tauri API Boundary: Call Tauri APIs (`invoke`, `listen`, plugins) ONLY via dynamic imports (`await import('@tauri-apps/api/...')`) inside try/catch so the browser dev environment does not crash.

- Converter: `ConverterView` handles text↔text and image↔image conversions via `converterSlice` (`convert_image`, `read_image_base64`, `readTextFile`/`writeTextFile`). Supported formats live in `src/types/index.ts` (`conversionFormats`). Dragging a note into the converter feeds its raw content/path into `converterInputFile`.

- Platform detection: `src/isMobile.ts` (`isMobile`, `dim`, `pathSep`). File `pathSep` is required by converter output paths.

- Version: single source of truth is `package.json`. `scripts/sync-version.mjs` writes the version into `package.json`, `package-lock.json` AND `src-tauri/tauri.conf.json` (used by CI from release tags, accepts an optional `v` prefix). Frontend reads it via `src/version.ts` (`import pkg from '../package.json'`).

- Testing: `vitest` (config `vitest.config.ts`, tests co-located `src/**/*.test.ts`, jsdom env). Linter: `eslint.config.js` (typescript-eslint + react-hooks; `no-explicit-any` is an error).

## 6. Windows Environment & Terminal Rules

- Shell Constraint: Target shell is strictly **cmd.exe** (NOT PowerShell, NOT bash). Use `&&` for chaining, `if errorlevel`, `%VAR%` for env vars, double quotes for paths with spaces. Every command run with an explicit `timeout`; analyze the result immediately, no endless waiting.

- Command Replacement Rules:

  - File/content search: prefer the Grep tool. In plain cmd, fall back to `findstr /s /i "text" pattern` instead of `grep`.
  - Delete files: `del /f /q path` / `del /s /q folder` instead of `rm`.
  - List files: `dir /b` instead of `ls`.
  - Do NOT use native bash or `sh` in workspace executions.

- Tauri Dev Process Guard: `npm run tauri dev` is a long-running background process. NEVER wait for it inside a bash call, and do NOT start it if already running (port binding errors). Check the log, or launch it detached:
  `start "spire-dev" cmd /c "set PATH=C:\Users\Artem\.cargo\bin;%PATH% && npm run tauri dev > C:\Users\Artem\AppData\Local\Temp\opencode\spire-dev.log 2>&1"` and read the log on timeout. The Tauri window hot-reloads via vite (no Rust restart needed after frontend edits). Rust rebuilds ONLY on `src-tauri/` changes.

- Rust Toolchain: Before running cargo/tauri commands, inject path manually: `set PATH=C:\Users\Artem\.cargo\bin;%PATH%`. Rustup toolchain is stable 1.97.1.

- Exit code != 0 or non-empty stderr ⇒ stop, report, no dependent steps. Sleep inside a command: `powershell -Command "Start-Sleep -Seconds N"`. NEVER stop because of popup windows/dialogs (UAC, Error, Not Responding) — close and continue.

## 7. Verified Exact Commands

```cmd
npm run dev                  # vite dev server, port 1420
npm run build                # tsc && vite build — MANDATORY before finishing a task
npm run lint                 # eslint . — 0 errors required
npm run test                 # vitest run — all tests required
start "spire-dev" cmd /c "set PATH=C:\Users\Artem\.cargo\bin;%PATH% && npm run tauri dev > C:\Users\Artem\AppData\Local\Temp\opencode\spire-dev.log 2>&1"   # launch desktop app detached
npm run android:build:debug  # debug APK (needs Android SDK/emulator)
node scripts/sync-version.mjs <x.y.z>  # sync version across package.json + package-lock.json + tauri.conf.json (v prefix optional)
```

## 8. Boundaries (3 levels)

**Always do:**
- `npm run build` after any changes — the task is not done until tsc passes.
- `npm run lint` and `npm run test` after changes.
- Use CSS variables for all colors.
- Add translations to both dictionaries (en + ru).
- Account for both platform branches (desktop + mobile).
- Check `git status`/`git diff` before a commit (if a commit was requested).

**Ask permission for:**
- Adding new npm dependencies (in `package.json`).
- Edits to `src-tauri/` (Rust, capabilities, permissions) — affect both platforms.
- Commit, push, PR, release — never without an explicit user request.
- Changes to `.github/workflows/` (CI/CD).

**Never:**
- Do NOT hardcode accent/dark hexes (see "Theme").
- Do NOT apply HTML logic to file note content.
- Do NOT commit secrets, keys, `.env`, logs.
- Do NOT break the light theme and accent switching for a "pretty" hardcode.
- Do NOT leave a running `tauri dev` dangling in the background without notifying.

## 9. Git workflow

- Repository: `C:\My Forks\spire\spire` (git root INSIDE!). Run `git` commands with `workdir` = `C:\My Forks\spire\spire`.
- Commit message: plain text in the repo's history style (short, no formalities).
- Commit only on explicit request; stage only needed files; never secrets.
- Branches: do working changes in the current branch; don't touch `main` unless necessary.

## 10. Repository Structure & Cleanliness

- Neat Structure: Keep the repo tidy and logically organized at all times. Root level: `README.md`, `CHANGELOG.md`, `LICENSE`, `package.json`, `package-lock.json`, `src/`, `src-tauri/`, `scripts/`, `.github/`, config files (`tsconfig*.json`, `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`, `index.html`). Never scatter loose files in the root — everything lives in its dedicated folder.

- Logical folders: `src/components/` (React components), `src/store/` + `src/store/slices/` (Zustand), `src/utils/` (helpers/format), `src/i18n/` (translations), `src/types/` (shared types), `src-tauri/` (Rust), `scripts/` (Node automation), `.github/workflows/` (CI/CD). Move files that land in the wrong place.

- No Junk: Every committed file must be used and referenced. Delete unused, dead, or leftover files (orphan test files, abandoned scripts, duplicated helpers, temp artifacts) — do not leave them in the repo or the working tree. Before finishing, run a garbage sweep: check for `*.test.ts` without a matching source module, `scripts/*` not referenced in `package.json`, unused exports, duplicates.

- Clean Tests: Test files are co-located next to the code they test (`src/**/*.test.ts`). Remove tests that no longer have a subject; never keep `.only`, skipped, or placeholder tests.

- No leftover artifacts: never commit `node_modules/`, `dist/`, build output, logs, screenshots-in-progress, `*.tmp`, or IDE files (`.vscode/` is allowed only with team settings). They belong in `.gitignore`.

- Idempotent cleanup: removing dead code must keep the app compiling — after any cleanup, `npm run build`, `npm run lint`, `npm run test` must stay green. Never delete a file "just in case" without checking references first.

## 11. Changelog Discipline

- Changelog is law: `CHANGELOG.md` MUST be updated on every notable change (feature, fix, breaking change, dependency). Follow [Keep a Changelog](https://keepachangelog.com/) + [SemVer](https://semver.org/): `[Unreleased]` section at the top with `### Added / Changed / Fixed / Removed` subheadings.

- Same commit, same file: whenever a change is committed, the CHANGELOG entry ships in the same commit (no "changelog later" — it is part of the change, not an afterthought).

- Version bump: on a release commit, move `[Unreleased]` entries into a dated `## [x.y.z]` section and prepend a fresh `[Unreleased]`. Entry text is user-facing English, brief but precise.

- Never fails silently: if a task changes behavior, the self-check must include "CHANGELOG updated" — otherwise the release is incomplete.

## 12. Git Push — Elite Release Rules

- Presentable history: commits are atomic, logically separated (feat / fix / refactor / docs / chore), with a short imperative subject line in the repo's existing style. No messy mega-commits, no typo-fix noise, no merge-confusion history.

- Before push: `git status` and `git diff` reviewed; only intended files staged; no secrets, logs, or build artifacts.

- Release readiness (an "elite" push/release must have ALL of):
  - `README.md`: current, accurate, with badges (CI, version, license) and a screenshot of the app so the repository looks professional on GitHub.
  - `LICENSE`: present and correct (see `package.json` `license` field / repo). If the project has none, SDLC asks before adding one.
  - `CHANGELOG.md`: updated with the release's entries.
  - Version synced everywhere (`package.json` + `package-lock.json` + `src-tauri/tauri.conf.json`) via `scripts/sync-version.mjs`.
  - Release notes: when asked to release, use GitHub Releases with a title (tag name or version), a changelog-derived description, convenience links to the artifacts, and a screenshot if applicable.
  - CI green: release only from a tag (`v*`) that the workflows can build; verify the tag was pushed and the run passed.

- Screenshots: for user-facing features/releases, provide or request app screenshots to embed in README/release notes (no crop artifacts, use the current theme/accent, PNG/WebP).

- Commit/push/release only on explicit user request — never autonomously.

## 13. Definition of Done (Self-Check Protocol)

Before reporting completion, verify:

1. [ ] `npm run build` executed and passed completely without tsc type errors.
2. [ ] `npm run lint` passed with 0 errors.
3. [ ] `npm run test` passed (vitest).
4. [ ] Feature/fix is identical and verified in BOTH mobile and desktop component trees.
5. [ ] All new translation strings added to both `en` and `ru` blocks in `translations.ts`.
6. [ ] Zero hardcoded hex colors added. Theme switching and accent switching not broken.
7. [ ] File notes untouched by HTML conversion logic.
8. [ ] No native bash or `sh` commands used in workspace executions.
9. [ ] No extra files/dependencies introduced.
10. [ ] `CHANGELOG.md` updated with the change (same commit, `[Unreleased]` section).
11. [ ] Repository structure stays clean: no orphan/unused test files, scripts, or leftover artifacts.
12. [ ] README / LICENSE / version remain consistent with the release if one is made.

## 14. How to update this file

- When commands/conventions change — same commit as the code change.
- On a repeated agent mistake (2+ times) — add a rule here.
- Autorun copy: `C:\My Forks\spire\AGENTS.md` (fork root) — keep in sync with this file.
- Do not add what the agent would derive anyway from `package.json`/code (only the non-obvious).