import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { visibleWidth } from "@earendil-works/pi-tui";
import { CONFIG_DIR_NAME } from "@earendil-works/pi-coding-agent";
import {
	padPlain,
	readConfig,
	resolveAccountLabel,
	renderHeaderLines,
	renderFooterLines,
} from "../extensions/pi-teki-orange-theme.ts";

const packageEntryPath = fileURLToPath(import.meta.resolve("@earendil-works/pi-coding-agent"));
const themeLoaderPath = path.join(path.dirname(packageEntryPath), "modes/interactive/theme/theme.js");
const { loadThemeFromPath } = await import(pathToFileURL(themeLoaderPath).href);
const themePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../themes/pi-teki-orange-theme.json");
const ansiTheme = loadThemeFromPath(themePath, "truecolor");

const plainTheme = {
	fg: (_color, text) => text,
	bold: (text) => text,
};

const headerInput = {
	cwd: "/tmp/demo-project",
	accountLabel: "tester",
	modelLabel: "provider/very-long-model-name-for-width-stress",
	thinkingLevel: "medium",
};

const footerInput = {
	cwd: "/Users/example/very/long/path/to/project/directory",
	modelLabel: "provider/very-long-model-name-for-width-stress",
	thinkingLevel: "xhigh",
	branch: "feature/long-branch-name",
	usageLabel: "ctx 87% (128.5k)",
};

const WIDTHS = [20, 47, 48, 80, 200];

function assertChromeFits(lines, width, { expectLineCount, exactWidths }) {
	assert.equal(lines.length, expectLineCount);
	for (const line of lines) {
		const vw = visibleWidth(line);
		assert.ok(vw <= width, `overflow at width=${width}: visible=${vw}`);
		if (exactWidths) {
			assert.equal(vw, width, `expected exact width ${width}, got ${vw}`);
		}
	}
}

test("padPlain never uses a negative repeat count", () => {
	assert.equal(padPlain("abc", 10), "abc" + " ".repeat(7));
	assert.equal(padPlain("abcdef", 3), "abcdef");
});

test("resolveAccountLabel respects custom labels and treats set-me as unset", () => {
	assert.equal(resolveAccountLabel("Acme", "osuser", "envuser", "envusername"), "Acme");
	assert.equal(resolveAccountLabel("  Acme  ", "osuser", "e", "u"), "Acme");
	assert.equal(resolveAccountLabel("set-me", "osuser", "e", "u"), "osuser");
	assert.equal(resolveAccountLabel("  set-me  ", "osuser", "e", "u"), "osuser");
	assert.equal(resolveAccountLabel(undefined, undefined, "envuser", "u"), "envuser");
	assert.equal(resolveAccountLabel(undefined, undefined, undefined, "envusername"), "envusername");
	assert.equal(resolveAccountLabel(undefined, undefined, undefined, undefined), "local");
	assert.equal(resolveAccountLabel("", "osuser", "e", "u"), "osuser");
});

test("readConfig reads accountLabel and ignores missing/invalid files", () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pi-teki-cfg-"));
	try {
		assert.deepEqual(readConfig(tmp), {});

		const configDir = path.join(tmp, CONFIG_DIR_NAME);
		fs.mkdirSync(configDir, { recursive: true });
		fs.writeFileSync(
			path.join(configDir, "pi-teki-orange-theme.json"),
			'{"accountLabel":"team-a"}',
		);
		assert.deepEqual(readConfig(tmp), { accountLabel: "team-a" });

		fs.writeFileSync(
			path.join(configDir, "pi-teki-orange-theme.json"),
			"not-json",
		);
		assert.deepEqual(readConfig(tmp), {});

		fs.writeFileSync(
			path.join(configDir, "pi-teki-orange-theme.json"),
			'{"accountLabel":123}',
		);
		assert.deepEqual(readConfig(tmp), {});
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true });
	}
});

test("renderHeaderLines fits widths 20, 47, 48, 80, 200", () => {
	for (const theme of [plainTheme, ansiTheme]) {
		for (const width of WIDTHS) {
			const lines = renderHeaderLines(width, theme, headerInput);
			const expectLineCount = width < 48 ? 1 : 6;
			assertChromeFits(lines, width, { expectLineCount, exactWidths: true });
		}
	}
	assert.equal(renderHeaderLines(47, plainTheme, headerInput).length, 1);
	assert.equal(renderHeaderLines(48, plainTheme, headerInput).length, 6);
});

test("renderFooterLines fits widths 20, 47, 48, 80, 200", () => {
	for (const theme of [plainTheme, ansiTheme]) {
		for (const width of WIDTHS) {
			const lines = renderFooterLines(width, theme, footerInput);
			assert.equal(lines.length, 2);
			assert.equal(visibleWidth(lines[0]), width);
			assert.equal(lines[1], " ".repeat(width));
			assert.equal(visibleWidth(lines[1]), width);
		}
	}
});
