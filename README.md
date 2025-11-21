# INF2001 Coach Company Portal Demo

This repository contains the static assets for the Coach Company demo. You can preview the HTML pages locally using any static file server.

## Requirements

- [Node.js](https://nodejs.org/) (v14 or newer). `npx` ships with Node.js and is used to launch a lightweight server.

## Running the site locally

1. Open a terminal and change into the project root:
   ```bash
   cd path/to/ISE2001-M2
   ```
2. Start a temporary static server with `npx serve` (installs the tool on demand if it is not cached yet):
   ```bash
   npx serve
   ```
3. The command prints a local URL (typically `http://localhost:3000`). Open that URL in your browser to navigate the app (e.g., `/login.html`, `/manager.html`, `/staff.html`, `/admin.html`).

Stop the server at any time with `Ctrl+C`. If you prefer a global install you can run `npm install -g serve` once and then invoke `serve` directly.
