# Spire

[![Release](https://img.shields.io/badge/release-v1.0.2-blue)](https://github.com/AlexBlack-Dev/spire/releases/latest)
[![CI](https://github.com/AlexBlack-Dev/spire/actions/workflows/release.yml/badge.svg)](https://github.com/AlexBlack-Dev/spire/actions)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Multifunctional note-taking app built with **Tauri v2 + React + TypeScript**.

## Download

| Platform | Link |
|----------|------|
| Windows (EXE) | [Download from Releases](https://github.com/AlexBlack-Dev/spire/releases/latest) |
| Android (APK) | [Download from Releases](https://github.com/AlexBlack-Dev/spire/releases/latest) |

## Features

- **Notes** — create, edit, search, favorites, trash, folders
- **Tasks** — task list with priorities
- **File Browser** — directory navigation, file saving
- **File Notes** — open any file as a note: raw text editing, spreadsheets (XLSX/XLS/ODS), CSV/JSON/MD preview
- **Converter** — convert between text and image formats
- **Note Lock** — password protection with lock timer and open-count limits
- **Backup** — export/import all data as JSON
- **Themes** — dark and light themes with custom accent color
- **Languages** — Russian and English
- **Splash Screen** — animated loading screen with accent color

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

# Run tests
npm run test

# Development (Android)
npm run tauri android dev

# Build (Android)
npm run tauri android build
```

## Project Structure

```
src/
├── components/       # React components
│   ├── MobileLayout.tsx      # Main layout for mobile
│   ├── BottomNav.tsx         # Bottom navigation
│   ├── NoteEditor.tsx        # Note editor (Tiptap)
│   ├── MobileNoteList.tsx    # Note list
│   ├── TasksView.tsx         # Tasks tab
│   ├── ToolsView.tsx         # Utilities (themes, folders, trash, stats)
│   ├── FileBrowser.tsx       # File browser
│   ├── LockPrompt.tsx        # Lock screen
│   ├── SplashScreen.tsx      # Splash screen
│   └── MobileSettings.tsx    # Settings
├── store/
│   ├── useStore.ts           # Zustand store (composed from slices)
│   ├── types.ts              # Store types and slice helpers
│   ├── helpers.ts            # Shared store helpers (hashing, converters)
│   └── slices/               # Store slices (notes, tasks, folders, locks, ui, converter)
├── utils/
│   └── format.ts             # Shared formatting utilities
├── i18n/
│   └── translations.ts       # Localization (RU/EN)
└── types/
    └── index.ts              # TypeScript types

src-tauri/
├── src/lib.rs                # Tauri commands (file ops, permissions)
├── capabilities/default.json # Tauri permissions
└── gen/android/              # Generated Android project
```

## Building Releases

Releases are automatically built via GitHub Actions when a tag is pushed:

```bash
git tag v1.0.2
git push origin v1.0.2
```

This will build the Windows EXE and Android APK, which will be uploaded to GitHub Releases.

## License

[MIT](LICENSE)
