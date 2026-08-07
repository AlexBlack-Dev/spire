# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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