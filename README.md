# Spire

Многофункциональное приложение для заметок, построенное на **Tauri v2 + React + TypeScript**.

## Возможности

- **Заметки** — создание, редактирование, поиск, избранное, корзина
- **Задачи** — список задач с приоритетами
- **Файловый браузер** — навигация по директориям, сохранение файлов
- **Блокировка заметок** — парольная защита с таймером блокировки
- **Темы** — тёмная и светлая темы с настраиваемым акцентным цветом
- **Языки** — русский и английский
- **Android** — полная поддержка с нативным жестом "назад", менеджером разрешений и SAF для сохранения файлов
- **Экран загрузки** — анимированный сплеш-скрин с акцентным цветом

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

# Сборка (десктоп)
npm run build

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

## Лицензия

[MIT](LICENSE)
