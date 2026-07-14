# AGENTS.md

## Project goal

This project is a **project-local Pi TUI redesign sandbox**.

The goal is to make the local Pi agent feel closer to **Claude Code's visual design language** while staying inside Pi's existing extension/theme capabilities.

This work should affect **this project directory only** and must not modify global Pi configuration unless explicitly requested.

## Design direction

Target the following qualities:

- **quiet, minimal chrome**
- **dense but readable metadata**
- **warm, restrained accent usage**
- **dark neutral palette**
- **clean working-state feedback**
- **less visual noise, fewer loud separators**

Focus on **look and feel**, not feature parity.

## Current preferences

- Keep a **compact custom header**.
- Keep the **current model duplicated in the footer**.
- Keep a **small blank space under the footer** so it does not touch the bottom edge.
- Footer context display should include both **percent and token count**, e.g. `ctx 25% (37k)`.
- Working-state wording should stay **short and calm**:
  - `Thinking…`
  - `Reading files…`
  - `Running command…`
  - `Editing…`
  - `Writing…`
- Prefer **subtle styling** over decorative styling.
- Prefer **muted neutrals** with accent used sparingly.

## Project layout

Primary project-local files and responsibilities:

- `AGENTS.md`
  - project intent, constraints, and UI preferences
  - update when design decisions become stable
- `.pi/settings.json`
  - selects the active local theme
  - enables/disables built-in Pi UI behaviors when needed
  - keep this minimal; use it for configuration, not implementation
- `.pi/themes/claude-code-local.json`
  - color system and overall visual tone
  - adjust palette, borders, emphasis, contrast, and code/markdown colors here
- `.pi/extensions/claude-code-ui.ts`
  - custom header/footer
  - working indicator and working message wording
  - title updates and other runtime UI behavior
- `.pi/claude-code-ui.json`
  - small local config values for the UI extension
  - use for user/project-specific labels rather than hardcoding them in the extension

## What to change where

- **Need to change colors / mood / contrast / accent usage?**
  - Edit `.pi/themes/claude-code-local.json`
- **Need to change header / footer / spacing / working-state behavior?**
  - Edit `.pi/extensions/claude-code-ui.ts`
- **Need to change which theme is active or other Pi project settings?**
  - Edit `.pi/settings.json`
- **Need to change a local label or small non-code UI setting?**
  - Edit `.pi/claude-code-ui.json`
- **Need to record a new stable preference or constraint for future work?**
  - Edit `AGENTS.md`

## Implementation constraints

- Apply changes in:
  - `.pi/extensions/`
  - `.pi/themes/`
  - `.pi/settings.json`
  - other project-local files only
- Do **not** change global files in `~/.pi/...` unless the user explicitly asks.
- Make **surgical changes**.
- Prefer the **smallest possible tweak** that improves the visual result.
- Preserve existing behavior unless a UI change is intentionally requested.

## When making further UI changes

Prioritize, in order:

1. visual calm
2. Claude-Code-like density and hierarchy
3. consistency across header / footer / working state
4. minimalism over featurefulness

If a requested change cannot be achieved project-locally because Pi emits it before project resources load, say so explicitly.
