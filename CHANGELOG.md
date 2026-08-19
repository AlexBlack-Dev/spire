# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- App no longer freezes with a blank/crashed window on systems with unstable GPU support (VMware and other virtual machines): WebView2 now renders in software mode

## [1.1.0] - 2026-08-19

### Added

- Run script files (.bat/.cmd/.ps1/.vbs/.js/.sh) directly from the note editor via a new "Run" button and the `run_script` Rust command; scripts open from the OS file association
- Download validation for update installers: only artifacts from the official Spire release page are accepted, with a size cap (512 MB)
- Strict Content Security Policy for production builds (self-hosted assets, IPC, GitHub API), with CSP disabled in dev
- Hardened the markdown view: rendering is now DOM-based with sanitized HTML (scripts, iframes and `javascript:` links stripped)

### Changed

- Autosave in the editor is debounced (400 ms), updates no longer touch `updatedAt` when nothing changed
- Note search in the sidebar and mobile list is debounced and runs against a stripped-content index instead of re-parsing HTML per keystroke
- Long note lists use `content-visibility` so offscreen rows are not rendered
- Zustand selectors split per field in all components, removing full-store re-renders
- All components migrated to the typed `useT()` i18n hook (`Dict` type from translations) — typos in translation keys are now compile-time errors
- Spreadsheet editor preserves cell formulas on save (untouched formula cells are kept, new `=` values are stored as formulas); structural edits invalidate formulas safely
- All semantic colors (danger/star/priority/toast icons) now use CSS variables instead of hardcoded hex
- Tauri API calls in components use dynamic imports, so the browser dev environment no longer crashes on missing IPC

### Fixed

- Downloading updates no longer redirects to the release page in a browser: downloads go through the validated Rust command
- Migration from old BLUM/BLUNT data runs at most once (persisted flag), preventing duplicate migration on every launch
- Error logs are now persisted across app restarts (they were only kept in memory)
- Empty catch blocks replaced with explicit logging (storage permission, spreadsheet parse/save, update events)

## [1.0.9] - 2026-08-08

### Added

- "Check for updates" button in the settings (desktop + mobile): re-runs the update check and shows a toast when already on the latest version
- Update installer now downloads in-app: the update dialog downloads the installer through a Rust command (bypassing GitHub CORS) with a live progress bar and launches it from the Downloads folder

### Changed

- Update dialog redesigned: the app logo is shown at full size without the surrounding square container; version comparison chip, "What's new" bullets and localized section headings added
- Changelog section headings (Added / Changed / Fixed / Removed) and the empty-changelog placeholder are now localized (EN/RU)

### Fixed

- The NSIS installer "Run Spire" checkbox now reliably launches the app after installation (built with the current bundler that runs the app via `RunAsUser`)
- Android release APKs are signed with a stable keystore kept in the repository, so updates install over the previous version without uninstalling

## [1.0.8] - 2026-08-08

### Changed

- The "What's new" tab now lists every release (desktop sidebar + mobile list) with collapsible details per version; the latest release is expanded by default

### Fixed

- The "What's new" tab no longer hangs on the loading state: release headings from the changelog are parsed correctly

## [1.0.7] - 2026-08-08

### Added

- New "What's new" tab showing the full changelog (fetched from the repo) — desktop sidebar entry and a Tools entry on mobile
- Update dialog now installs updates in-app: the primary button downloads the installer into Downloads and launches it with a progress indicator; the secondary button opens the changelog tab

### Changed

- The update dialog shows the Spire app icon instead of the sparkle icon
- The preview card no longer glows with a colored outline: the note color is rendered as a subtle top accent line and gradient (desktop and mobile)

### Removed

- Removed the "Block copy/paste" toggle from mobile settings

## [1.0.6] - 2026-08-08

### Changed

- Editor mode switch is now the classic Edit/View segmented control on desktop and mobile (no custom pencil toggle)
- The note color is rendered as a soft ambient glow around the preview card instead of a visible border; on mobile the glow follows the note color, not the app accent
- Removed the restart prompt from the permissions screen: the storage banner disappears immediately once access is granted (visibility re-check), no restart dialog anymore

### Fixed

- Saving a note to a file no longer leaks raw HTML into the editor: after a successful save the note content is replaced with the actual saved text (markdown/HTML for .md/.html, plain text otherwise)

## [1.0.5] - 2026-08-08

### Added

- Empty-state placeholder for the Private tab on desktop
- The update dialog now shows a "What's new" list with the most recent changes (localized EN/RU)

### Changed

- App restart after granting storage permission is more stable (permission applied immediately)

### Fixed

- Saving file notes via the Rust commands no longer relies on the fs scope on desktop

## [1.0.4] - 2026-08-07

### Added

- Permissions screen: after granting app access permissions on Android, Spire asks to restart the app so the storage permission applies immediately (`restart_app` command + confirmation dialog, desktop builds restart via the executable)

### Changed

- Reduced and accent-aware lighting: splash, title bar, sidebar hover and the top-of-page glow on mobile now follow the selected accent color instead of the fixed violet tint
- Replaced remaining hardcoded accent hexes in settings, tools, theme cards, file browser and welcome screen with theme-driven variables (no more `#7c6af7` in components)

### Fixed

- Mobile: opening a private note from the Private tab no longer closes it back to the list right after entering the password (desktop-only unlock guard no longer overrides the mobile view)
- Added the missing label for the custom "N opens" option in the lock prompt (en + ru)

## [1.0.3] - 2026-08-07

### Added

- New app icons for Windows, macOS, iOS and Android, plus a new file-association icon and updated in-app logo; desktop icons use the transparent logo (no background)
- Mobile: the Favorites tab is replaced with the Private tab (locked notes), matching the desktop sidebar
- Rich-text editor tables: create, edit and resize tables with row/column add and table delete (desktop + mobile) via `@tiptap/extension-table`
- Copying rich-text content now keeps ordered list numbers, bullet markers, task check state and table structure (desktop and mobile)
- Mobile note editor now has the same text formatting toolbar as desktop (bold, italic, strikethrough, code, highlight, headings, quote, lists, tasks, divider, tables)
- Update notifications: the app checks GitHub releases and shows a dialog with a link to install the new version (desktop and mobile)

### Fixed

- Password-protected notes no longer show a static "This note is locked" placeholder; the lock prompt is always shown while the note is closed
- Notes unlocked for "N opens" are re-consumed on exit, so the password is asked again next time
- Entering the Private tab clears the active note first, so the user picks a note before the lock prompt appears
- Notes tab counter now counts only non-private notes; private notes count only toward the Private badge
- Pasted content no longer replaces rich note editor with a read-only CSV/JSON/markdown preview; auto-preview applies to file notes only
- Pasting keeps clean lines (no stray CR, non-breaking or zero-width characters)
- Ctrl+A selects note content only instead of the whole UI; interface text is no longer selectable
- "Open tasks" on the welcome screen now switches to the Tasks tab on mobile
- Regenerated `package-lock.json` so `npm ci` succeeds on npm 10 / Node 20 (missing nested `esbuild@0.28.1` entry)
- Android release signing config uses valid Kotlin syntax, fixing the APK build

### Changed

- Task list UI redesigned: custom circular checkbox icons, icon-only priority buttons (no low/medium/high labels, no surrounding circles), plus icon instead of the Add button, priority auto-sorting, removed manual reorder arrows
- Removed native hover tooltips (title attributes) from all icon buttons
- Removed the redundant Share button from the mobile note editor
- Top glow now extends into the status-bar / brow area on mobile screens so it reaches the very top of the page
- Removed the Folders tab from the mobile Tools screen

## [1.0.2] - 2026-08-05

### Added

- File extension setting (show/hide file extensions in note list)
- Drag-and-drop a note into the Converter feed
- Automated tests with Vitest for store slices, migration and shared helpers
- ESLint configuration (typescript-eslint + react-hooks + react-refresh)

### Changed

- Refactored the Zustand store into focused slices (`notes`, `tasks`, `folders`, `locks`, `ui`, `converter`, `settings`) with shared helpers
- Extracted shared color/format helpers into `src/utils/format.ts`; removed duplicated color maps and hex-mixing code from components
- Added strict typing across components (removed `any` usage)
- Updated README: correct React version, new project structure and commands
- `sync-version` now also writes `package-lock.json` and accepts a `v` prefix

### Fixed

- Release CI: version sync now works under PowerShell (Windows job)
- Release CI: Android SDK licenses are accepted before installing the NDK
- Duplicate preview toggle in the note editor

## [1.0.1]

### Fixed

- File-save issues on mobile devices
- Spreadsheet rendering in file notes

## [1.0.0]

### Added

- Initial release: notes, tasks, folders, file notes, converter, note lock, themes, i18n (EN/RU)