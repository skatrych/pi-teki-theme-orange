# pi-teki-orange-theme

A quiet, dark Pi theme with warm orange accents, compact metadata, and activity-aware whimsical working-state feedback.

## Install

Install globally:

```bash
pi install npm:@teki/pi-teki-orange-theme
```

Or install for the current project:

```bash
pi install -l npm:@teki/pi-teki-orange-theme
```

After installation, select `pi-teki-orange-theme` from Pi's `/settings` menu. Use `pi config` to enable or disable the package resources.

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

- Dark neutral palette with restrained orange accents
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
