# Celery Man Windows

A retro-style desktop window manager built with Svelte 5, featuring draggable, resizable windows with persistence and a classic Windows-inspired interface.

## Features

- **Window Management**: Create, drag, resize, minimize, maximize, and close windows
- **Persistence**: Window state is saved to localStorage and restored on page reload
- **Desktop Icons**: Click desktop icons to open various applications
- **Taskbar**: Shows currently open windows with minimize/restore functionality
- **Built-in Apps**: Includes Notepad and About dialog
- **Retro Styling**: Classic Windows-inspired visual design with authentic borders and controls

## Applications

- **Demo Window**: Simple example window with HTML content
- **Notepad**: Text editor with save/load functionality
- **About**: Information dialog about the window manager

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
