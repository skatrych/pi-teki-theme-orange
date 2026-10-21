import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const requiredColors = [
  "accent", "border", "borderAccent", "borderMuted", "success", "error", "warning",
  "muted", "dim", "text", "thinkingText", "selectedBg", "userMessageBg",
  "userMessageText", "customMessageBg", "customMessageText", "customMessageLabel",
  "toolPendingBg", "toolSuccessBg", "toolErrorBg", "toolTitle", "toolOutput",
  "mdHeading", "mdLink", "mdLinkUrl", "mdCode", "mdCodeBlock", "mdCodeBlockBorder",
  "mdQuote", "mdQuoteBorder", "mdHr", "mdListBullet", "toolDiffAdded", "toolDiffRemoved",
  "toolDiffContext", "syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxVariable",
  "syntaxString", "syntaxNumber", "syntaxType", "syntaxOperator", "syntaxPunctuation",
  "thinkingOff", "thinkingMinimal", "thinkingLow", "thinkingMedium", "thinkingHigh",
  "thinkingXhigh", "bashMode"
];

const BG_COLORS = new Set([
	"selectedBg",
	"userMessageBg",
	"customMessageBg",
	"toolPendingBg",
	"toolSuccessBg",
	"toolErrorBg",
]);

const packageEntryPath = fileURLToPath(import.meta.resolve("@earendil-works/pi-coding-agent"));
const themeLoaderPath = path.join(path.dirname(packageEntryPath), "modes/interactive/theme/theme.js");
const { loadThemeFromPath, parseAutoThemeSetting, resolveThemeSetting } = await import(
	pathToFileURL(themeLoaderPath).href
);

// The dark theme keeps the package's original name so existing selections keep working;
// the light theme is a separate file because Pi has no inheritance between themes.
const themeDefs = [
  {
    label: "dark",
    file: "pi-teki-orange-theme.json",
    name: "pi-teki-orange-theme",
    appearance: "dark",
    ansi: {
      accent: { slot: "fg", value: "\x1b[38;2;200;132;58m" },
      // Terminal default: the dark theme defers body text to the terminal.
      text: { slot: "fg", value: "\x1b[39m" },
      muted: { slot: "fg", value: "\x1b[38;2;180;176;170m" },
      success: { slot: "fg", value: "\x1b[38;2;74;222;128m" },
      selectedBg: { slot: "bg", value: "\x1b[48;2;27;27;25m" },
    },
  },
  {
    label: "light",
    file: "pi-teki-orange-theme-light.json",
    name: "pi-teki-orange-theme-light",
    appearance: "light",
    ansi: {
      accent: { slot: "fg", value: "\x1b[38;2;180;83;9m" },
      // Explicit rather than terminal default, so panels keep their dark warm charcoal.
      text: { slot: "fg", value: "\x1b[38;2;38;35;32m" },
      muted: { slot: "fg", value: "\x1b[38;2;92;86;79m" },
      success: { slot: "fg", value: "\x1b[38;2;21;109;59m" },
      selectedBg: { slot: "bg", value: "\x1b[48;2;226;217;203m" },
    },
  },
];

const loadTheme = async (file) => {
  const themePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../themes", file);
  return {
    raw: JSON.parse(await readFile(new URL(`../themes/${file}`, import.meta.url), "utf8")),
    loaded: loadThemeFromPath(themePath, "truecolor"),
  };
};

function resolveColorValue(value, vars, visited = new Set()) {
	if (value === "" || (typeof value === "string" && value.startsWith("#"))) {
		return value;
	}
	if (typeof value !== "string") {
		throw new Error(`Invalid color value: ${JSON.stringify(value)}`);
	}
	if (visited.has(value)) {
		throw new Error(`Circular variable reference: ${value}`);
	}
	if (!(value in vars)) {
		throw new Error(`Variable reference not found: ${value}`);
	}
	visited.add(value);
	return resolveColorValue(vars[value], vars);
}

const HEX = /^#[0-9a-f]{6}$/;

function contrastRatio(fg, bg) {
  const channel = (hex, index) => {
    const value = parseInt(hex.slice(index, index + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (hex) =>
    0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
  const [high, low] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
}

// Foreground/background pairs that must stay readable, measured on the surfaces they
// actually render on. Only the light theme is measured: its dark-mode counterpart values
// are light-on-dark, and the assertion below guards against a light-mode palette that
// accidentally keeps a pale dark-mode color. `accent` clears only 3:1 on purpose; it
// paints the logo, cursor, and a thinking-ramp step, never body text.
const contrastPairs = [
  { fg: "text", bg: "userMessageBg", min: 4.5 },
  { fg: "muted", bg: "customMessageBg", min: 4.5 },
  { fg: "muted", bg: "toolPendingBg", min: 4.5 },
  { fg: "muted", bg: "toolSuccessBg", min: 4.5 },
  { fg: "muted", bg: "toolErrorBg", min: 4.5 },
  { fg: "toolTitle", bg: "toolPendingBg", min: 4.5 },
  { fg: "syntaxKeyword", bg: "toolPendingBg", min: 4.5 },
  { fg: "toolDiffAdded", bg: "toolPendingBg", min: 4.5 },
  { fg: "toolDiffRemoved", bg: "toolPendingBg", min: 4.5 },
  { fg: "toolDiffContext", bg: "toolPendingBg", min: 4.5 },
  { fg: "syntaxVariable", bg: "toolPendingBg", min: 4.5 },
  { fg: "syntaxString", bg: "toolPendingBg", min: 4.5 },
  { fg: "syntaxNumber", bg: "toolPendingBg", min: 4.5 },
  { fg: "mdCode", bg: "toolPendingBg", min: 4.5 },
  { fg: "success", bg: "toolSuccessBg", min: 4.5 },
  { fg: "error", bg: "toolErrorBg", min: 4.5 },
  { fg: "mdHeading", bg: "@pageBg", min: 4.5 },
  { fg: "mdCode", bg: "@pageBg", min: 4.5 },
  { fg: "thinkingMedium", bg: "@pageBg", min: 4.5 },
  { fg: "accent", bg: "userMessageBg", min: 3.0 },
];

const loaded = {};
for (const def of themeDefs) {
  const { raw, loaded: theme } = await loadTheme(def.file);
  loaded[def.name] = { ...def, raw, theme };
}

for (const def of Object.values(loaded)) {
  test(`${def.label} theme has the expected public name and appearance`, () => {
    assert.equal(def.raw.name, def.name);
    assert.equal(def.raw.appearance, def.appearance);
    assert.ok(!def.raw.name.includes("/"), "theme names must not contain '/' (reserved for light/dark settings)");
    assert.equal(def.theme.appearance, def.appearance);
  });

  test(`${def.label} theme defines every required Pi color`, () => {
    assert.deepEqual(
      requiredColors.filter((color) => !(color in def.raw.colors)),
      [],
    );
  });

  test(`${def.label} theme loads through Pi loadThemeFromPath`, () => {
    assert.equal(def.theme.name, def.name);
  });

  test(`${def.label} theme resolves every color via Pi loader (hex, empty, or var)`, () => {
    for (const color of requiredColors) {
      const actual = BG_COLORS.has(color)
        ? def.theme.getBgAnsi(color)
        : def.theme.getFgAnsi(color);
      assert.equal(typeof actual, "string");
      assert.ok(actual.length > 0);
    }
  });

  test(`${def.label} theme resolves pinned colors to the expected ANSI`, () => {
    for (const [color, expected] of Object.entries(def.ansi)) {
      const actual = expected.slot === "bg" ? def.theme.getBgAnsi(color) : def.theme.getFgAnsi(color);
      assert.equal(actual, expected.value, `${def.label}/${color}`);
    }
  });

  test(`${def.label} theme color values resolve locally to hex or empty`, () => {
    for (const [key, value] of Object.entries(def.raw.colors)) {
      const resolved = resolveColorValue(value, def.raw.vars ?? {});
      assert.ok(resolved === "" || HEX.test(resolved), `${def.label}/${key}`);
    }
  });
}

test("both themes expose the identical color tokens", () => {
  const [dark, light] = themeDefs;
  assert.deepEqual(
    Object.keys(loaded[light.name].raw.colors),
    Object.keys(loaded[dark.name].raw.colors),
    "the extension colors chrome by token name, so both themes must expose the same tokens",
  );
});

test("both themes pair as an automatic light/dark selection", () => {
  const setting = `${loaded["pi-teki-orange-theme-light"].name}/${loaded["pi-teki-orange-theme"].name}`;
  assert.deepEqual(parseAutoThemeSetting(setting), {
    lightTheme: "pi-teki-orange-theme-light",
    darkTheme: "pi-teki-orange-theme",
  });
  assert.equal(resolveThemeSetting(setting, "light"), "pi-teki-orange-theme-light");
  assert.equal(resolveThemeSetting(setting, "dark"), "pi-teki-orange-theme");
});

test("light theme keeps text readable on every surface it renders on", () => {
  const light = loaded["pi-teki-orange-theme-light"];
  for (const { fg, bg, min } of contrastPairs) {
    const fgHex = resolveColorValue(light.raw.colors[fg], light.raw.vars);
    const bgHex = bg === "@pageBg" ? light.raw.export.pageBg : resolveColorValue(light.raw.colors[bg], light.raw.vars);
    assert.match(fgHex, HEX, `${fg} must be a concrete color for contrast measurement`);
    const ratio = contrastRatio(fgHex, bgHex);
    assert.ok(ratio >= min, `${fg} on ${bg} is ${ratio.toFixed(2)}:1, expected >= ${min}:1`);
  }
});
