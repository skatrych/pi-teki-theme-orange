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

const packageEntryPath = fileURLToPath(import.meta.resolve("@earendil-works/pi-coding-agent"));
const themeLoaderPath = path.join(path.dirname(packageEntryPath), "modes/interactive/theme/theme.js");
const { loadThemeFromPath } = await import(pathToFileURL(themeLoaderPath).href);

const themePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../themes/pi-teki-orange-theme.json");
const loaded = loadThemeFromPath(themePath, "truecolor");

const theme = JSON.parse(await readFile(new URL("../themes/pi-teki-orange-theme.json", import.meta.url), "utf8"));

test("theme has the expected public name", () => {
  assert.equal(theme.name, "pi-teki-orange-theme");
});

test("theme defines every required Pi color", () => {
  assert.deepEqual(
    requiredColors.filter((color) => !(color in theme.colors)),
    [],
  );
});

test("theme loads through Pi loadThemeFromPath", () => {
  assert.equal(loaded.name, "pi-teki-orange-theme");
});

const BG_COLORS = new Set([
	"selectedBg",
	"userMessageBg",
	"customMessageBg",
	"toolPendingBg",
	"toolSuccessBg",
	"toolErrorBg",
]);

test("every theme color resolves via Pi loader (hex, empty, or var)", () => {
  for (const color of requiredColors) {
    if (BG_COLORS.has(color)) {
      assert.equal(typeof loaded.getBgAnsi(color), "string");
      assert.ok(loaded.getBgAnsi(color).length > 0);
    } else {
      assert.equal(typeof loaded.getFgAnsi(color), "string");
      assert.ok(loaded.getFgAnsi(color).length > 0);
    }
  }
  assert.equal(loaded.getFgAnsi("accent"), "\x1b[38;2;200;132;58m");
  assert.equal(loaded.getFgAnsi("text"), "\x1b[39m");
  assert.equal(loaded.getFgAnsi("muted"), "\x1b[38;2;180;176;170m");
  assert.equal(loaded.getFgAnsi("success"), "\x1b[38;2;74;222;128m");
  assert.equal(loaded.getBgAnsi("selectedBg"), "\x1b[48;2;27;27;25m");
});

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
	return resolveColorValue(vars[value], vars, visited);
}

test("theme color values resolve locally to hex or empty", () => {
  for (const [key, value] of Object.entries(theme.colors)) {
    const resolved = resolveColorValue(value, theme.vars ?? {});
    assert.ok(resolved === "" || /^#[0-9a-fA-F]{6}$/.test(resolved));
  }
});
