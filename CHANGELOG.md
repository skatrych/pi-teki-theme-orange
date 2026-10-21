# Changelog

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
