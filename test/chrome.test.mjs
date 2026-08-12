import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { visibleWidth } from "@earendil-works/pi-tui";
import { CONFIG_DIR_NAME } from "@earendil-works/pi-coding-agent";
import {
	pickWhimsicalMessage,
	WHIMSICAL_MESSAGES_BY_CATEGORY,
} from "../extensions/whimsical-messages.ts";
import installThemeExtension, {
	areWhimsicalWorkingMessagesEnabled,
	getWhimsicalMessageCategory,
	padPlain,
	readConfig,
	resolveAccountLabel,
	renderHeaderLines,
	renderFooterLines,
	renderShimmerMessage,
	truncateWorkingMessage,
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
		assert.equal(areWhimsicalWorkingMessagesEnabled(readConfig(tmp)), true);

		const configDir = path.join(tmp, CONFIG_DIR_NAME);
		fs.mkdirSync(configDir, { recursive: true });
		fs.writeFileSync(
			path.join(configDir, "pi-teki-orange-theme.json"),
			'{"accountLabel":"team-a","whimsicalWorkingMessages":false}',
		);
		assert.deepEqual(readConfig(tmp), { accountLabel: "team-a", whimsicalWorkingMessages: false });
		assert.equal(areWhimsicalWorkingMessagesEnabled(readConfig(tmp)), false);

		fs.writeFileSync(
			path.join(configDir, "pi-teki-orange-theme.json"),
			'{"accountLabel":"team-a"}',
		);
		assert.deepEqual(readConfig(tmp), { accountLabel: "team-a" });
		assert.equal(areWhimsicalWorkingMessagesEnabled(readConfig(tmp)), true);

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

test("tool names resolve to their matching whimsical categories", () => {
	assert.equal(getWhimsicalMessageCategory("bash"), "bash");
	assert.equal(getWhimsicalMessageCategory("read"), "read");
	assert.equal(getWhimsicalMessageCategory("edit"), "edit");
	assert.equal(getWhimsicalMessageCategory("write"), "write");
	assert.equal(getWhimsicalMessageCategory("custom-tool"), "other");
});

test("whimsical messages stay meaningful for the active category", () => {
	for (const category of Object.keys(WHIMSICAL_MESSAGES_BY_CATEGORY)) {
		const messages = WHIMSICAL_MESSAGES_BY_CATEGORY[category];
		assert.ok(messages.length > 0);
		for (let index = 0; index < 20; index++) {
			assert.ok(messages.includes(pickWhimsicalMessage(category)));
		}
		const first = messages[0];
		assert.notEqual(pickWhimsicalMessage(category, first), first);
	}
});


test("working-state events use activity-aware messages, rotate them, and preserve the pragmatic toggle", async () => {
	const handlers = new Map();
	const intervals = new Map();
	const cleared = new Set();
	const originalSetInterval = globalThis.setInterval;
	const originalClearInterval = globalThis.clearInterval;
	const originalRandom = Math.random;
	const originalDateNow = Date.now;
	let now = 0;
	let nextTimerId = 1;
	const workingMessages = [];
	const stripFormatting = (text) => text.replace(/\x1B\[[0-?]*[ -/]*[@-~]|<\/?[^>]+>/g, "");
	const context = (cwd) => ({
		mode: "tui",
		cwd,
		ui: {
			theme: { fg: (color, text) => `<${color}>${text}</${color}>` },
			setWorkingMessage: (message) => workingMessages.push(message),
			setTitle() {},
		},
	});

	globalThis.setInterval = (callback, intervalMs) => {
		const id = nextTimerId++;
		intervals.set(id, { callback, intervalMs });
		return id;
	};
	globalThis.clearInterval = (id) => {
		cleared.add(id);
	};
	Math.random = () => 0;
	Date.now = () => now;

	const pi = {
		on: (event, handler) => handlers.set(event, handler),
		getSessionName: () => undefined,
		getThinkingLevel: () => "medium",
	};
	installThemeExtension(pi);

	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pi-teki-events-"));
	try {
		const ctx = context(tmp);
		await handlers.get("agent_start")({}, ctx);
		assert.ok(WHIMSICAL_MESSAGES_BY_CATEGORY.thinking.includes(stripFormatting(workingMessages.at(-1))));

		await handlers.get("tool_execution_start")({ toolCallId: "read-1", toolName: "read" }, ctx);
		assert.ok(WHIMSICAL_MESSAGES_BY_CATEGORY.read.includes(stripFormatting(workingMessages.at(-1))));

		await handlers.get("tool_execution_start")({ toolCallId: "bash-1", toolName: "bash" }, ctx);
		assert.ok(WHIMSICAL_MESSAGES_BY_CATEGORY.bash.includes(stripFormatting(workingMessages.at(-1))));

		await handlers.get("tool_execution_end")({ toolCallId: "bash-1" }, ctx);
		assert.ok(WHIMSICAL_MESSAGES_BY_CATEGORY.read.includes(stripFormatting(workingMessages.at(-1))));

		await handlers.get("tool_execution_end")({ toolCallId: "read-1" }, ctx);
		const beforeRotation = stripFormatting(workingMessages.at(-1));
		const shimmerTimer = [...intervals.values()].findLast((timer) => timer.intervalMs === 110);
		now = 2_999;
		shimmerTimer.callback();
		assert.equal(stripFormatting(workingMessages.at(-1)), beforeRotation);
		now = 3_000;
		shimmerTimer.callback();
		assert.notEqual(stripFormatting(workingMessages.at(-1)), beforeRotation);

		const activeTimerIds = [...intervals.keys()].filter((id) => !cleared.has(id));
		await handlers.get("session_shutdown")({}, ctx);
		assert.ok(activeTimerIds.every((id) => cleared.has(id)));

		const configDir = path.join(tmp, CONFIG_DIR_NAME);
		fs.mkdirSync(configDir, { recursive: true });
		fs.writeFileSync(path.join(configDir, "pi-teki-orange-theme.json"), '{"whimsicalWorkingMessages":false}');
		const pragmaticCtx = context(tmp);
		await handlers.get("agent_start")({}, pragmaticCtx);
		assert.equal(workingMessages.at(-1), "Thinking…");
		const timerCount = intervals.size;
		await handlers.get("tool_execution_start")({ toolCallId: "read-2", toolName: "read" }, pragmaticCtx);
		assert.equal(workingMessages.at(-1), "Reading files…");
		assert.equal(intervals.size, timerCount);
		await handlers.get("session_shutdown")({}, pragmaticCtx);
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true });
		globalThis.setInterval = originalSetInterval;
		globalThis.clearInterval = originalClearInterval;
		Math.random = originalRandom;
		Date.now = originalDateNow;
	}
});

test("truncateWorkingMessage keeps the loader to one line in narrow terminals", () => {
	const message = "Archeologically analyzing the architecture…";
	for (const width of [20, 47]) {
		assert.ok(visibleWidth(truncateWorkingMessage(message, width)) <= width - 4);
	}
	assert.equal(truncateWorkingMessage(message, 20), "Archeologically…");
	assert.equal(truncateWorkingMessage("Thinking…", 20), "Thinking…");
	assert.ok(visibleWidth(renderShimmerMessage(ansiTheme, truncateWorkingMessage(message, 20), 0)) <= 16);
});

test("renderShimmerMessage preserves text while changing theme colors", () => {
	const colors = [];
	const themed = renderShimmerMessage(
		{ fg: (color, text) => {
			colors.push(color);
			return `<${color}>${text}</${color}>`;
		} },
		"Sparkling...",
		0,
	);
	assert.equal(themed.replace(/<\/?[A-Za-z]+>/g, ""), "Sparkling...");
	assert.ok(!colors.includes("thinkingXhigh"));
	assert.ok(new Set(colors).size > 1);
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
