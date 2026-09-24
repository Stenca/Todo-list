# Todo List

A feature-rich todo application built with vanilla TypeScript, Vite, and plain CSS.

**🔗 Live demo:** https://stenca.github.io/Todo-list/

## Features

### Todos
- Create, edit, delete, toggle
- Drag & drop reordering with auto-scroll at edges
- Enter/exit animations
- Inline editing

### Subtasks
- Add, edit, delete, toggle subtasks under any todo
- Collapse/expand subtask lists
- Staggered exit animations
- Parent auto-completes when all subtasks complete

### Due dates
- Set due dates via native date picker
- Overdue highlighting
- Date input in-place editing

### Organization
- Filters: All / Active / Completed
- Live search with debouncing and clear button
- Completed items grouped under a divider

### Polish
- Light / dark theme toggle (respects OS preference)
- Undo toast for delete and clear-completed
- Enter/exit animations
- Responsive layout

### Persistence
- Everything saved to `localStorage`
- Date objects revived on load

## Tech Stack

- **TypeScript** — strict types, `verbatimModuleSyntax`
- **Vite** — dev server + production build
- **Vitest** — unit tests
- **Plain CSS** — custom properties, no preprocessor
- **localStorage** — persistence

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
git clone https://github.com/Stenca/Todo-list.git
cd Todo-list
npm install
```

### Develop

```bash
npm run dev
```

Opens at `http://localhost:5173/`.

### Test

```bash
npm test          # watch mode
npm run test:run  # single run
```

### Build

```bash
npm run build
npm run preview
```



