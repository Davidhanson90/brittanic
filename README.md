# Brittanic

**New here? Start with [GETTING_STARTED.md](./GETTING_STARTED.md)** — a plain-English guide to install Git and Node, clone the repo, run the app, and work on it with AI coding assistants.

Interactive Britannic store scene built with **Angular 21** and **Three.js**. Explore characters in a 3D store; video clips play on interaction.

- **Live site:** [https://davidhanson90.github.io/brittanic/](https://davidhanson90.github.io/brittanic/) (GitHub Pages, `baseHref` `/brittanic/`)
- **Requires:** Node.js **24** (matches CI) or a current LTS, plus npm and Git

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) 21.2.12.

## Quick start (developers)

```bash
git clone https://github.com/Davidhanson90/brittanic.git
cd brittanic
npm install
npm start
```

Open `http://localhost:4200/`. Stop the server with Ctrl+C.

| Script | What it does |
| --- | --- |
| `npm start` | Local dev server (`ng serve`) |
| `npm run build` | Production build → `dist/` |
| `npm test` | Unit tests (`ng test` / Vitest) |
| `npm run rotoscope` | Helper page via `http-server` on port 4173 |

## Development notes

- Scaffold a component: `ng generate component component-name`
- Production build output is under `dist/` (Pages deploy uses `dist/browser`)
- More CLI help: [Angular CLI overview](https://angular.dev/tools/cli)

For install help on Windows, Mac, or Linux — including Git, Node, troubleshooting, and AI-agent tips — see **[GETTING_STARTED.md](./GETTING_STARTED.md)**.
