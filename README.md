# Brittanic

A 3D department store experience built with [Three.js](https://threejs.org) and [Vite](https://vitejs.dev), written in TypeScript.

The project renders an interactive first-person walkthrough across three scenes — an entrance hall, a lift interior, and a shopfront floor — navigable via keyboard (W A S D / arrow keys) and mouse look.

## Scenes

| Scene | Description |
|---|---|
| **Entrance Hall** | Coffered-ceiling reception room with a working lift portal |
| **Lift Interior** | Panelled cabin with a 100-floor control panel and animated cabin display |
| **Shopfront Floor** | Mayfair-style retail floor reached via lift |

## Tech stack

- **Three.js** — WebGL rendering, GLTF models, procedural geometry, and lighting
- **CSS2DRenderer** — overlaid HTML labels anchored to 3D objects
- **Vite** — dev server and bundler (relative `base: "./"` for portable deployment)
- **TypeScript** — strict typing throughout

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run typecheck` | Run TypeScript type-checking without emitting |
| `npm start` | Build and preview the production output |

## Deployment

The project deploys automatically to GitHub Pages on every push to `main` via the workflow at [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml). The build is verified before upload to ensure Vite has fully bundled all entry points.
