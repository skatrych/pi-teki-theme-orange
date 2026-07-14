# AGENTS.md

## Purpose

`pi-teki-orange-theme` is a distributable Pi package providing a quiet, dark TUI with restrained orange accents. Its visual language is inspired by Claude Code UI, but it is an independent Pi theme and extension.

## Design principles

- Keep chrome quiet, compact, and readable.
- Use warm orange accents sparingly against dark neutral surfaces.
- Prefer hierarchy and spacing over decorative separators.
- Keep working feedback short and calm:
  - `Thinking…`
  - `Reading files…`
  - `Running command…`
  - `Editing…`
  - `Writing…`
- Keep the compact header, model information in the footer, context percentage plus token count, and a blank line below the footer.

## Project layout

- `package.json` — npm and Pi package metadata.
- `extensions/pi-teki-orange-theme.ts` — header, footer, working state, and terminal title behavior.
- `themes/pi-teki-orange-theme.json` — palette and Pi color tokens.
- `.pi/settings.json` — local development settings only.
- `.pi/pi-teki-orange-theme.json` — optional project-local account label.
- `test/` — package validation tests.
- `README.md` — installation and user documentation.

## Change rules

- Keep the package name and theme name `pi-teki-orange-theme`.
- Keep published resources under `extensions/` and `themes/`.
- Do not modify global Pi configuration.
- Prefer small, targeted UI changes; preserve existing behavior unless intentionally changing the design.
- Do not add dependencies unless they materially simplify maintenance.
- Do not hardcode secrets, credentials, or machine-specific paths.
- Update documentation and changelog for user-visible behavior changes.

## Verification

Before considering a change complete, run:

```bash
npm run check
npm pack --dry-run
```

For UI changes, also test narrow and wide terminals, long model names, missing configuration, non-Git directories, and parallel tool execution.
