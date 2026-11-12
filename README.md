# Spire

[![Release](https://img.shields.io/github/v/release/AlexBlack-Dev/spire?color=blue)](https://github.com/AlexBlack-Dev/spire/releases/latest)
[![CI](https://github.com/AlexBlack-Dev/spire/actions/workflows/ci.yml/badge.svg)](https://github.com/AlexBlack-Dev/spire/actions/workflows/ci.yml)
[![Release build](https://github.com/AlexBlack-Dev/spire/actions/workflows/release.yml/badge.svg)](https://github.com/AlexBlack-Dev/spire/actions/workflows/release.yml)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-v2-24C8DB?logo=tauri)](https://v2.tauri.app/)

Multifunctional note-taking app built with **Tauri v2 + React + TypeScript**.

## Download

| Platform | Link |
|----------|------|
| Windows (EXE) | [Download from Releases](https://github.com/AlexBlack-Dev/spire/releases/latest) |
| Android (APK) | [Download from Releases](https://github.com/AlexBlack-Dev/spire/releases/latest) |

## Features

- **Notes** — create, edit, search, favorites, trash, folders
- **Rich-text editor** — formatting toolbar, tables, task lists (Tiptap)
- **Tasks** — task list with priorities
- **File Browser** — directory navigation, file saving
- **File Notes** — open any file as a note: raw text editing, spreadsheets (XLSX/XLS/ODS), CSV/JSON/MD preview
- **Run Scripts** — execute .bat/.cmd/.ps1/.sh files directly from the note editor (Windows, Linux)
- **Converter** — convert between text and image formats
- **Note Lock** — AES-256-GCM encryption at rest with PBKDF2 key derivation, lock timer and open-count limits
- **Trash** — restore or permanently delete notes (desktop + mobile)
- **Backup** — export/import all data as JSON with validation and a pre-import restore point
- **Themes** — dark and light themes with custom accent color
- **Languages** — Russian and English
- **Update Notifications** — checks GitHub releases, verifies the installer SHA-256 and installs in-app
- **Splash Screen** — animated loading screen with accent color
- **Accessibility** — keyboard focus rings, reduced-motion and high-contrast support, native color scheme per theme
- **Mobile UX** — date-grouped lists with sticky headers, swipe and long-press note actions, bottom sheets, card-based settings, keyboard-aware editor header and 44 px tap targets

### Android

- Native back gesture for in-app navigation
- Permission manager for storage access
- SAF (Storage Access Framework) for saving files anywhere
- In-app file browser as save destination
- Adaptive icon with custom background

### Windows

- Rich-text editor with formatting support (Tiptap)
- Keyboard shortcuts for quick editing
- Settings menu with theme and language selection

## Tech Stack

- [Tauri v2](https://v2.tauri.app/) — cross-platform framework
- [React 18](https://react.dev/) — UI library
- [TypeScript](https://www.typescriptlang.org/) — type safety
- [Zustand](https://github.com/pmndrs/zustand) — state management (slice-pattern store)
- [Tiptap](https://tiptap.dev/) — rich-text editor
- [Framer Motion](https://www.framer.com/motion/) — animations
- [Vitest](https://vitest.dev/) — unit tests

## Run

```bash
# Install dependencies
npm install

# Development (desktop)
npm run dev

# Typecheck + production build
npm run build

# Lint
npm run lint

# Run tests
npm run test

# Run Rust tests
cd src-tauri && cargo test

# Sync the version across package.json, package-lock.json, tauri.conf.json, Cargo.toml and Cargo.lock
node scripts/sync-version.mjs 1.2.0

# Development (Android)
npm run tauri android dev

# Build (Android)
npm run tauri android build
```

## Testing

- `npm run test` — 58 Vitest specs covering store slices, backup validation, file-note saving, note encryption, password rehashing, formatting and en/ru parity.
- `cargo test` — 10 Rust tests for path rules, atomic writes and script validation.
- `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `npm audit --omit=dev --audit-level=high` and `cargo audit` are part of the CI quality gate.

## Project Structure

```
src/
├── components/       # React components
│   ├── MobileLayout.tsx      # Main layout for mobile
│   ├── BottomNav.tsx         # Bottom navigation
│   ├── Sidebar.tsx           # Desktop navigation
│   ├── NoteEditor.tsx        # Note editor (Tiptap)
│   ├── FormatToolbar.tsx     # Shared formatting toolbar
│   ├── MobileNoteList.tsx    # Note list
│   ├── TasksView.tsx         # Tasks tab
│   ├── TrashView.tsx         # Trash (shared desktop/mobile)
│   ├── ToolsView.tsx         # Utilities (themes, trash, stats)
│   ├── FileBrowser.tsx       # File browser
│   ├── LockPrompt.tsx        # Password prompt
│   ├── LockedNoteView.tsx    # Locked note placeholder
│   ├── ErrorBoundary.tsx     # Localized crash fallback
│   ├── SplashScreen.tsx      # Splash screen
│   ├── SettingsModal.tsx     # Settings (desktop)
│   └── MobileSettings.tsx    # Settings (mobile)
├── store/
│   ├── useStore.ts           # Zustand store (composed from slices)
│   ├── persistStorage.ts     # IndexedDB persistence, legacy migration, restore point
│   ├── noteCrypto.ts         # AES-GCM note encryption and session keys
│   ├── types.ts              # Store types and slice helpers
│   ├── helpers.ts            # Shared store helpers (hashing, converters)
│   └── slices/               # Store slices (notes, tasks, folders, locks, ui, settings, converter)
├── hooks/
│   └── useFileNoteContent.ts # Shared raw file-note state (desktop + mobile)
├── utils/
│   ├── format.ts             # Shared formatting utilities
│   ├── backup.ts             # Backup validation
│   ├── changelog.ts          # Changelog parsing
│   └── renderedContent.tsx   # CSV/JSON/MD preview
├── i18n/
│   └── translations.ts       # Localization (RU/EN)
├── assets/fonts/             # Self-hosted fonts + OFL licenses
└── types/
    └── index.ts              # TypeScript types

src-tauri/
├── src/lib.rs                # App setup, platform commands, IPC handler
├── src/paths.rs              # Path normalization + sensitive-path rules
├── src/fs_ops.rs             # Atomic file writes, size limits, image conversion
├── src/scripts.rs            # Script validation and launch
├── src/update.rs             # Verified release download (SHA-256)
├── capabilities/default.json # Tauri permissions
└── gen/android/              # Generated Android project

scripts/
└── sync-version.mjs          # Version sync across manifests
```

## Building Releases

Releases are built by GitHub Actions when a tag is pushed:

```bash
git tag v1.2.0
git push origin v1.2.0
```

The workflow:

1. Runs lint, tests and a production build (`quality` gate).
2. Syncs the version from the tag into `package.json`, `package-lock.json`, `tauri.conf.json`, `Cargo.toml` and `Cargo.lock`.
3. Builds the Windows installer (NSIS/MSI) and the Android APK.
4. Creates a GitHub Release with download links.

Release APKs are signed with a private keystore supplied by the build environment: `SPIRE_KEYSTORE_BASE64` (base64 of the keystore file), `SPIRE_KEYSTORE_PASSWORD`, `SPIRE_KEY_ALIAS` and `SPIRE_KEY_PASSWORD` must be set as repository secrets. The release workflow fails when the keystore is missing instead of falling back to a debug key. Debug builds use the debug key that Gradle generates on the build machine.

`versionCode` and `versionName` are derived from the tag (`v1.2.0` → `10200` / `1.2.0`) and written to `tauri.properties` during the build.

## Security

- Update installers are downloaded only from the official Spire release and must match a published SHA-256 digest.
- Downloads stream into a `.part` file and replace the target only after verification.
- File writes are atomic and capped (25 MB text/binary, 50 MB images, 512 MB downloads).
- Spreadsheet files are capped at 25 MB and parsed without macros, styles or HTML cells.
- File operations are restricted to user directories; sensitive OS paths are rejected by the Rust layer.
- Scripts run from a canonical path; symlinks, Windows `%`/`!` paths and `.vbs`/`.js` files are rejected.
- Sensitive paths are blocked for reads, writes, renames and directory listings.
- The opener plugin is limited to opening URLs and paths.
- Production builds use a strict Content Security Policy; note content is sanitized with DOMPurify.
- Note passwords are hashed with PBKDF2 (SHA-256, 210 000 iterations, per-note salt).
- Locked notes are encrypted at rest with AES-256-GCM. The content key is derived from the password with PBKDF2-SHA256 (600 000 iterations) and kept only in memory for the unlocked session.
- Notes, tasks and folders are stored in IndexedDB, not `localStorage`, so note size is no longer bounded by the 5 MB web storage quota.
- Opening a file is capped in the UI as well (10 MB text, 20 MB spreadsheets) before it is read into memory.

Report vulnerabilities through the private channel described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
