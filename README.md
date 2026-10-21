# pi-teki-orange-theme

A quiet Pi theme with warm orange accents, compact metadata, and activity-aware whimsical
working-state feedback. Ships matching dark and light palettes.

## Install

Install globally:

```bash
pi install npm:@teki/pi-teki-orange-theme
```

Or install for the current project:

```bash
pi install -l npm:@teki/pi-teki-orange-theme
```

After installation, select a theme from Pi's `/settings` menu. Use `pi config` to enable or
disable the package resources.

## Theme

The package ships two palettes, each a separate theme:

| Theme name | Designed for |
| --- | --- |
| `pi-teki-orange-theme` | dark terminals |
| `pi-teki-orange-theme-light` | light terminals |

Select one of them, or select both as a pair to follow your terminal's light/dark
appearance automatically. Pi stores a pair light-first:

```json
{
  "theme": "pi-teki-orange-theme-light/pi-teki-orange-theme"
}
```

A single selection is stored as either theme name:

```json
{
  "theme": "pi-teki-orange-theme"
}
```

Pi has no inheritance between theme files, so both files intentionally repeat the same 51
color tokens with different values. Change a token in both files or neither; a test fails if
the two token sets drift, because the extension colors its chrome by token name.

## Configuration

The extension works without configuration. To override the account label, create `.pi/pi-teki-orange-theme.json` in the project where Pi runs:

```json
{
  "accountLabel": "work",
  "whimsicalWorkingMessages": true
}
```

Whimsical working messages are enabled by default. They keep Pi's current activity
clear—thinking, reading, running commands, editing, or writing—while rotating through
funny IT wording every few seconds and shimmering in orange/gold. Set
`whimsicalWorkingMessages` to `false` to restore the pragmatic `Thinking…`,
`Running command…`, and related messages.

If no label is configured, the local operating-system username is used.

## Included

- Dark and light neutral palettes with restrained orange accents
- Light palette on a warm paper base, holding WCAG AA (≥4.5:1) for text on every surface
- Compact responsive header
- Model, reasoning level, branch, and context usage footer
- Full current work directory path shown on the left side of the footer
- Context usage shown as a percentage and token count
- Shimmering whimsical working messages, with the original calm messages available as a toggle
- Animated terminal title while Pi is working

## Compatibility

Designed for current Pi releases using the package and theme APIs documented by Pi. The extension is TUI-only and leaves non-interactive modes unchanged.

## Security

Pi packages can execute extension code with the permissions of the current user. Review the source before installing packages from any third party.

## License

MIT
