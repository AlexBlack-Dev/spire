# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- New app icons for Windows, macOS, iOS and Android, plus a new file-association icon and updated in-app logo; desktop icons use the transparent logo (no background)

### Fixed

- Pasted content no longer replaces rich note editor with a read-only CSV/JSON/markdown preview; auto-preview applies to file notes only
- Pasting keeps clean lines (no stray CR, non-breaking or zero-width characters)
- Ctrl+A selects note content only instead of the whole UI; interface text is no longer selectable
- "Open tasks" on the welcome screen now switches to the Tasks tab on mobile
- Regenerated `package-lock.json` so `npm ci` succeeds on npm 10 / Node 20 (missing nested `esbuild@0.28.1` entry)
- Android release signing config uses valid Kotlin syntax, fixing the APK build

### Changed

- Task list UI redesigned: square checkboxes instead of round flags, priority auto-sorting, removed manual reorder arrows
- Removed native hover tooltips (title attributes) from all icon buttons

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