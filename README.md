# Spire

Multifunctional note-taking app built with **Tauri v2 + React + TypeScript**.

## Download

| Platform | Link |
|----------|------|
| Windows (EXE) | [Download from Releases](https://github.com/AlexBlack-Dev/spire/releases/latest) |
| Android (APK) | [Download from Releases](https://github.com/AlexBlack-Dev/spire/releases/latest) |

## Features

- **Notes** — create, edit, search, favorites, trash
- **Tasks** — task list with priorities
- **File Browser** — directory navigation, file saving
- **Note Lock** — password protection with lock timer
- **Themes** — dark and light themes with custom accent color
- **Languages** — Russian and English
- **Splash Screen** — animated loading screen with accent color

### Android

- Native back gesture for in-app navigation
- Permission manager for storage access
- SAF (Storage Access Framework) for saving files anywhere
- Adaptive icon with custom background

### Windows

- Rich-text editor with formatting support (Tiptap)
- Keyboard shortcuts for quick editing
- Settings menu with theme and language selection

## Tech Stack

- [Tauri v2](https://v2.tauri.app/) — cross-platform framework
- [React 19](https://react.dev/) — UI library
- [TypeScript](https://www.typescriptlang.org/) — type safety
- [Zustand](https://github.com/pmndrs/zustand) — state management
- [Tiptap](https://tiptap.dev/) — rich-text editor
- [Framer Motion](https://www.framer.com/motion/) — animations

## Run

```bash
# Install dependencies
npm install

# Development (desktop)
npm run dev

# Build (Windows)
npm run tauri build

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
│   └── useStore.ts           # Zustand state
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
git tag v1.0.0
git push origin v1.0.0
```

This will build the Windows EXE and Android APK, which will be uploaded to GitHub Releases.

## License

[MIT](LICENSE)
