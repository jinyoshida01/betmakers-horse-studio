# Betmakers Horse Studio

Interactive Three.js horse studio with animated and manually posed horses, coat and saddlecloth customization, camera and lighting controls, and PNG export.

[Open the live studio](https://jinyoshida01.github.io/betmakers-horse-studio/)

## Features

- Idle and running animation, pause, frame selection, and a still pose.
- Full camera orbit, auto-rotation, lens presets, and vertical FOV up to 150°.
- Manual joint selection and move/rotate handles, local/world axes, snapping, undo, and reset.
- Textured, grey mesh, depth map, and wireframe views.
- Ten coat choices and local saddlecloth image uploads.
- Adjustable lights, lighting presets, dark/light mode, and image download without editing guides.

The studio starts with Pinto, Idle animation, and auto-rotation. Reduced-motion preferences pause animation and auto-rotation on initial load. Manual posing uses joint transforms; Blender IK and cloth simulation are not included.

## Run locally

Requires Node.js 22.13 or later and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by the development server.

## GitHub Pages

The public studio is published automatically from `main` by the Publish Horse Studio workflow. Repository Settings → Pages uses **GitHub Actions** as its source.

```sh
npm run build:pages
```

This exports static files to `dist/client` with the `/betmakers-horse-studio/` URL prefix, including the horse model and textures. No server or sign-in is required to use the published studio.

## Original Sites build

```sh
npm run build
npm start
```

The project uses React, TypeScript, Three.js, Vinext, Tailwind CSS, and Cloudflare's Vite integration. `npm start` serves the built Worker locally through Wrangler. The included `.openai/hosting.json` records the existing Sites project; pushing to GitHub does not automatically redeploy that site.

## Project structure

- `app/horse.ts`: renderer, model loading, animation, camera, lighting, and export.
- `app/pose-model.ts` and `app/pose-controls.ts`: pose deformation and joint controls.
- `app/reference-materials.ts`: grey, depth, and wireframe display modes.
- `app/studio-settings.ts`: defaults and shared settings.
- `app/page.tsx`, `app/studio-panel.tsx`, and `app/pose-panel.tsx`: interface.
- `public/models/`: horse model, skeleton data, and coat textures.

Cloth uploads are used within the browser session. The original `.blend` project and intermediate export files are not part of this repository.
