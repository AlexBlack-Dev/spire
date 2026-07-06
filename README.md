# Spire

Многофункциональное приложение для заметок, построенное на **Tauri v2 + React + TypeScript**.

## Скачать

| Платформа | Ссылка |
|-----------|--------|
| Windows (EXE) | [Скачать с Releases](https://github.com/AlexBlack-Dev/spire/releases/latest/download/Spire_1.0.0_x64-setup.exe) |
| Android (APK) | [Скачать с Releases](https://github.com/AlexBlack-Dev/spire/releases/latest/download/spire.apk) |

## Возможности

- **Заметки** — создание, редактирование, поиск, избранное, корзина
- **Задачи** — список задач с приоритетами
- **Файловый браузер** — навигация по директориям, сохранение файлов
- **Блокировка заметок** — парольная защита с таймером блокировки
- **Темы** — тёмная и светлая темы с настраиваемым акцентным цветом
- **Языки** — русский и английский
- **Экран загрузки** — анимированный сплеш-скрин с акцентным цветом

### Android

- Нативный жест "назад" для навигации внутри приложения
- Менеджер разрешений для доступа к хранилищу
- SAF (Storage Access Framework) для сохранения файлов в любом месте
- Адаптивная иконка с настраиваемым фоном

### Windows

- Rich-text редактор с поддержкой форматирования (Tiptap)
- Горячие клавиши для быстрого редактирования
- Меню настроек с выбором темы и языка

## Технологии

- [Tauri v2](https://v2.tauri.app/) — кросс-платформенный фреймворк
- [React 19](https://react.dev/) — UI-библиотека
- [TypeScript](https://www.typescriptlang.org/) — типизация
- [Zustand](https://github.com/pmndrs/zustand) — стейт-менеджер
- [Tiptap](https://tiptap.dev/) — rich-text редактор
- [Framer Motion](https://www.framer.com/motion/) — анимации

## Запуск

```bash
# Установка зависимостей
npm install

# Разработка (десктоп)
npm run dev

# Сборка (Windows)
npm run tauri build

# Разработка (Android)
npm run tauri android dev

# Сборка (Android)
npm run tauri android build
```

## Структура проекта

```
src/
├── components/       # React-компоненты
│   ├── MobileLayout.tsx      # Основной layout для мобильных
│   ├── BottomNav.tsx         # Нижняя навигация
│   ├── NoteEditor.tsx        # Редактор заметок (Tiptap)
│   ├── MobileNoteList.tsx    # Список заметок
│   ├── TasksView.tsx         # Вкладка задач
│   ├── ToolsView.tsx         # Утилиты (темы, папки, корзина, статистика)
│   ├── FileBrowser.tsx       # Файловый браузер
│   ├── LockPrompt.tsx        # Экран блокировки
│   ├── SplashScreen.tsx      # Экран загрузки
│   └── MobileSettings.tsx    # Настройки
├── store/
│   └── useStore.ts           # Zustand-стейт
├── i18n/
│   └── translations.ts       # Локализация (RU/EN)
└── types/
    └── index.ts              # TypeScript-типы

src-tauri/
├── src/lib.rs                # Tauri-команды (файловые операции, разрешения)
├── capabilities/default.json # Разрешения Tauri
└── gen/android/              # Сгенерированный Android-проект
```

## Сборка релизов

Релизы автоматически собираются через GitHub Actions при создании тега:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Это запустит сборку Windows EXE и Android APK, которые автоматически загрузятся в GitHub Releases.

## Лицензия

[MIT](LICENSE)
