# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Refactored the Zustand store into focused slices (`notes`, `tasks`, `folders`, `locks`, `ui`, `converter`, `settings`) with shared helpers
- Extracted shared color/format helpers into `src/utils/format.ts`; removed duplicated color maps and hex-mixing code from components
- Added strict typing across components (removed `any` usage)
- Updated README: correct React version, new project structure and commands

### Added

- Automated tests with Vitest for store slices, migration and shared helpers
- ESLint configuration (typescript-eslint + react-hooks + react-refresh)

## [1.0.1]

### Fixed

- File-save issues on mobile devices
- Spreadsheet rendering in file notes

## [1.0.0]

### Added

- Initial release: notes, tasks, folders, file notes, converter, note lock, themes, i18n (EN/RU)