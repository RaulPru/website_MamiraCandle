# Static HTML Website Contract

This project is a Skywork Website static-html project.

## Structure

- `index.html` is the entry page.
- `assets/styles.css` owns reusable styling and project tokens.
- `assets/main.js` owns reusable browser behavior.
- Put project-owned images, data files, and media under `assets/` or a narrower relative subdirectory.

## Boundaries

- Use only relative local references such as `assets/styles.css` and `assets/main.js`.
- Do not add React, Vite, Tailwind, TypeScript, package managers, bundlers, or framework routing to this project.
- Do not edit `.skywork/website.json` or `.skywork/website/website.json` by hand; they are CLI-owned identity and binding files.
- Do not inspect or edit generated `dist/` output for source changes.

## Common Edits

- Change layout or content in `index.html`.
- Change palette, typography, spacing, and responsive behavior in `assets/styles.css`.
- Change interactions, timers, state, and event handlers in `assets/main.js`.

## Validation

Run `skywork-cli website validate --path <project> --gate local` before deploy.
