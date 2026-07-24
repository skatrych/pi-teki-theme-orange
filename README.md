# pi-teki-orange-theme

A quiet, dark Pi theme with warm orange accents, compact metadata, and calm working-state feedback.

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
  "accountLabel": "work"
}
```

If no label is configured, the local operating-system username is used.

## Included

- Dark neutral palette with restrained orange accents
- Compact responsive header
- Model, reasoning level, branch, and context usage footer
- Full current work directory path shown on the left side of the footer
- Context usage shown as a percentage and token count
- Calm working messages for thinking and tool execution
- Animated terminal title while Pi is working

## Compatibility

Designed for current Pi releases using the package and theme APIs documented by Pi. The extension is TUI-only and leaves non-interactive modes unchanged.

## Security

Pi packages can execute extension code with the permissions of the current user. Review the source before installing packages from any third party.

## License

MIT
