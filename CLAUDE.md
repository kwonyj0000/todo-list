# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a vanilla JavaScript todo list application with priority management and drag-and-drop reordering. No build tools or frameworks — just HTML, CSS, and JavaScript.

## Architecture

### Core Data Flow
- **State Management**: All todos stored in `localStorage` (key: `'todos'`)
- **User Email**: Stored separately in `localStorage` (key: `'userEmail'`)
- **Priority System**: Three levels (high/medium/low) with visual badges and filtering
- **Sorting Logic**: Todos sorted first by priority (high→medium→low), then by `order` property within each priority group

### Key Features
- **Drag & Drop Reordering**: Users can drag todos to reorder them. Dragging across priority groups changes the todo's priority automatically
- **Priority Filtering**: Filter view by priority or show all todos
- **Notification Button**: Appears when there are incomplete todos and user email is set (currently a placeholder for backend integration)
- **Completed State**: Checkbox toggles completion; completed todos have visual styling

### State Synchronization
Every mutation (`addTodo`, `toggleTodo`, `deleteTodo`, drag reorder) calls:
1. Update in-memory `todos` array
2. `saveTodos()` → persist to `localStorage`
3. `renderTodos()` → re-render entire list

### Drag & Drop Implementation
- Drag starts: Store `draggedElement` and `draggedTodoId`
- Drop: Change priority if needed, recalculate `order` within the target priority group
- Visual feedback: `.dragging` on source, `.drag-over` on drop target

## Development

### Opening the App
Simply open `index.html` in a browser:
```bash
open index.html  # macOS
xdg-open index.html  # Linux
```

Or use a local server:
```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

### Testing
Manual testing only — no automated test suite. Test scenarios:
- Add todos with different priorities
- Drag to reorder within same priority
- Drag to different priority group (should change priority)
- Toggle completion
- Delete todos
- Filter by priority
- Email validation and editing

### File Structure
```
.
├── index.html    # HTML structure
├── app.js        # All application logic
└── style.css     # All styling
```

## Git Workflow

**IMPORTANT**: This directory is part of a larger repository with sparse-checkout enabled. When committing:

1. **Always use merge, not rebase**: The repository uses a merge-based workflow
2. **Scope changes to this directory**: Only commit files under `src/exercise/kwonyj0000/day02/todo/`
3. **Do not read other directories**: Other users' directories are not checked out locally

### Commit Commands
```bash
cd /home/ubuntu/work/kosa-vibecoding-2026-3rd

# Add changes from this directory only
git add src/exercise/kwonyj0000/day02/todo/

# Commit
git commit -m "your message"

# Pull with merge (NOT rebase)
git pull origin main

# Push
git push origin main
```

## Code Conventions

### Naming
- Constants: `UPPER_SNAKE_CASE` (e.g., `STORAGE_KEYS`, `PRIORITY_ORDER`)
- Functions: `camelCase` (e.g., `addTodo`, `renderTodos`)
- Variables: `camelCase`

### HTML Security
Always use `escapeHtml()` when rendering user-generated content in innerHTML to prevent XSS.

### Priority Values
Valid priority strings: `'high'`, `'medium'`, `'low'`
Default priority: `'medium'`
