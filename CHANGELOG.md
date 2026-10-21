# Changelog

## Unreleased

- Added `pi-teki-orange-theme-light`, a light companion palette on a warm paper base, so the theme supports light terminals. Select both as a pair to follow the terminal's appearance: `{"theme": "pi-teki-orange-theme-light/pi-teki-orange-theme"}`.
- Declared `appearance` explicitly on both theme files. Pi's fallback for terminal-default colors is keyed on appearance, so relying on detection from the palette was fragile once a second palette existed.
- Kept the `pi-teki-orange-theme` name and its dark palette unchanged, so existing user selections keep working. Note the one intentional divergence: the light theme sets an explicit primary text color, while the dark theme continues to defer to the terminal default foreground.

## 0.1.3 - 2026-10-21

- Align with Pi 1.3.0: point the theme `$schema` at the published `https://pi.dev/schemas/theme.schema.json` used by Pi's startup theme validation, and develop against `@earendil-works/pi-coding-agent`/`pi-tui` 1.3.0.

- Replace working-state wording with activity-aware, orange/gold shimmering whimsical messages that rotate every few seconds; set `whimsicalWorkingMessages` to `false` to restore the pragmatic wording.
- Keep live working status and title animation when the model or thinking level changes mid-turn.
- Show the full current work directory path on the left side of the footer instead of a duplicate activity status.

## 0.1.0 - 2026-07-14

- Initial public release.
- Added the `pi-teki-orange-theme` theme.
- Added compact header, footer, working indicator, and terminal title behavior.
- Added the current reasoning level to the footer beside the model name.
- Stabilized the blank row below the footer during differential redraws.
