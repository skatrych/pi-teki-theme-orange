import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { visibleWidth } from "@earendil-works/pi-tui";
import { RoundedInputEditor } from "../extensions/input-editor.ts";
import installThemeExtension from "../extensions/pi-teki-orange-theme.ts";

const packageEntryPath = fileURLToPath(import.meta.resolve("@earendil-works/pi-coding-agent"));
const themeLoaderPath = path.join(path.dirname(packageEntryPath), "modes/interactive/theme/theme.js");
const { loadThemeFromPath } = await import(pathToFileURL(themeLoaderPath).href);
const themesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../themes");
const ansiTheme = loadThemeFromPath(path.join(themesDir, "pi-teki-orange-theme.json"), "truecolor");
const lightAnsiTheme = loadThemeFromPath(path.join(themesDir, "pi-teki-orange-theme-light.json"), "truecolor");

const selectList = {
	selectedPrefix: (text) => text,
	selectedText: (text) => text,
	description: (text) => text,
	scrollInfo: (text) => text,
	noMatch: (text) => text,
};

function strip(text) {
	return text.replace(/\x1b\[[0-?]*[ -/]*[@-~]|\x1b_[^\x07]*\x07/g, "");
}

function createEditor({ accent = (text) => text, dim = (text) => text, border = (text) => text, rows = 24 } = {}) {
	const tui = { terminal: { rows }, requestRender() {} };
	return new RoundedInputEditor(tui, { borderColor: border, selectList }, { matches: () => false }, { accent, dim });
}

function assertExactWidth(lines, width) {
	assert.ok(lines.length >= 3);
	for (const line of lines) {
		assert.equal(visibleWidth(line), width);
	}
}

test("empty input is a rounded box with a prompt and a grey placeholder", () => {
	const editor = createEditor({ dim: (text) => `\x1b[2m${text}\x1b[22m` });
	editor.focused = true;
	const rendered = editor.render(40);
	const lines = rendered.map(strip);
	assert.equal(lines[0], `╭${"─".repeat(38)}╮`);
	assert.equal(lines[1], `│ ❯❯ Write your message here...${" ".repeat(7)} │`);
	assert.equal(lines[2], `╰${"─".repeat(38)}╯`);
	assert.ok(rendered[1].includes("\x1b[2mW\x1b[22m"));
	assert.ok(rendered[1].includes("\x1b[2mrite your message here...\x1b[22m"));
	assert.equal(editor.getText(), "");
	const markerAt = rendered[1].indexOf("\x1b_pi:c\x07");
	assert.equal(visibleWidth(rendered[1].slice(0, markerAt)), visibleWidth("│ ❯❯ "));
	assertExactWidth(rendered, 40);
});

test("placeholder disappears when typing starts and returns when the input is cleared", () => {
	const editor = createEditor();
	editor.handleInput("a");
	assert.equal(editor.getText(), "a");
	assert.equal(strip(editor.render(40)[1]).includes("Write your message"), false);

	editor.setText("");
	assert.match(strip(editor.render(40)[1]), /❯❯ Write your message here\.\.\./);

	editor.setText(" ");
	assert.equal(strip(editor.render(40)[1]).includes("Write your message"), false);
	assert.equal(editor.getText(), " ");
});

test("prompt stays while typing and is not part of the message", () => {
	const editor = createEditor();
	editor.handleInput("h");
	editor.handleInput("i");
	assert.equal(editor.getText(), "hi");
	const lines = editor.render(40).map(strip);
	assert.match(lines[1], /^│ ❯❯ hi/);
	assert.equal(lines[0].startsWith("╭") && lines[0].endsWith("╮"), true);
	assert.equal(lines.at(-1).startsWith("╰") && lines.at(-1).endsWith("╯"), true);
});

test("wrapped lines keep the prompt on the first row and align the rest", () => {
	const editor = createEditor();
	editor.setText("one\ntwo");
	const lines = editor.render(40).map(strip);
	assert.match(lines[1], /^│ ❯❯ one/);
	assert.match(lines[2], /^│ {4}two/);
	assert.equal(lines[1].indexOf("one"), lines[2].indexOf("two"));
	assert.equal(lines[2].includes("❯"), false);
	assertExactWidth(editor.render(40), 40);
});

test("hardware cursor sits after the prompt", () => {
	const editor = createEditor();
	editor.focused = true;
	editor.setText("hi");
	const content = editor.render(40)[1];
	const markerAt = content.indexOf("\x1b_pi:c\x07");
	assert.ok(markerAt > 0);
	assert.equal(visibleWidth(content.slice(0, markerAt)), visibleWidth("│ ❯❯ hi"));
});

test("clicking text accounts for the prompt and the box", () => {
	const editor = createEditor();
	editor.setText("hello");
	const width = 40;
	editor.render(width);
	const indent = visibleWidth("│ ❯❯ ");
	editor.handleMouse({
		type: "click",
		button: "left",
		x: indent + 4,
		y: 1,
		screenX: indent + 4,
		screenY: 1,
		width,
		height: 3,
		shift: false,
		alt: false,
		ctrl: false,
	});
	assert.equal(editor.getCursor().col, 4);
	editor.handleMouse({
		type: "click",
		button: "left",
		x: 1,
		y: 1,
		screenX: 1,
		screenY: 1,
		width,
		height: 3,
		shift: false,
		alt: false,
		ctrl: false,
	});
	assert.equal(editor.getCursor().col, 0);
});

test("narrow and wide terminals keep the box and the prompt", () => {
	for (const width of [8, 20, 47, 80, 200]) {
		const editor = createEditor();
		editor.setText("message");
		const lines = editor.render(width).map(strip);
		assertExactWidth(lines, width);
		assert.equal(lines[0].startsWith("╭") && lines[0].endsWith("╮"), true);
		assert.equal(lines.at(-1).startsWith("╰") && lines.at(-1).endsWith("╯"), true);
		assert.match(lines[1], /^│ ❯❯ /);
		const typed = lines
			.slice(1, -1)
			.map((line) => line.slice(5, -2))
			.join("")
			.trimEnd();
		assert.equal(typed, "message");
		for (const line of lines.slice(1, -1)) {
			assert.equal(line.startsWith("│") && line.endsWith("│"), true);
		}
	}

	const tight = createEditor().render(5).map(strip);
	assertExactWidth(tight, 5);
	assert.equal(tight[0], "╭───╮");
	assert.equal(tight[1], "│❯❯W│");
	assert.equal(tight.at(-1), "╰───╯");

	const truncated = createEditor().render(20).map(strip);
	assertExactWidth(truncated, 20);
	assert.match(truncated[1], /^│ ❯❯ Write your me/);
	assert.equal(truncated[1].includes("here"), false);
});

test("colored borders and the accent prompt stay within the terminal width", () => {
	for (const theme of [ansiTheme, lightAnsiTheme]) {
		const editor = createEditor({
			accent: (text) => theme.fg("accent", text),
			dim: (text) => theme.fg("dim", text),
			border: (text) => theme.fg("border", text),
		});
		const empty = editor.render(40);
		assertExactWidth(empty, 40);
		assert.ok(empty[1].includes(theme.fg("dim", "rite your message here...")));
		editor.setText("one\ntwo");
		for (const width of [8, 20, 40, 80]) {
			const lines = editor.render(width);
			assertExactWidth(lines, width);
			assert.match(strip(lines[1]), /❯❯/);
		}
		const plain = editor.render(40).map(strip);
		assert.equal(plain[1].indexOf("one"), plain[2].indexOf("two"));
	}
});

test("working status and scroll hints stay on the rounded border", () => {
	const editor = createEditor({ rows: 10 });
	let statusRenders = 0;
	editor.setWorkingStatusIndicator({
		renderInBorder: () => {
			statusRenders += 1;
			return "STATUS";
		},
		renderSpinnerInBorder: () => "S",
	});
	const withStatus = editor.render(40).map(strip);
	assert.equal(statusRenders, 1);
	assert.match(withStatus[0], /^╭.*STATUS.*╮$/);
	assert.match(withStatus[1], /^│ ❯❯ /);
	assertExactWidth(withStatus, 40);

	editor.setText(Array.from({ length: 12 }, (_, index) => `line${index}`).join("\n"));
	const scrolled = editor.render(40);
	assertExactWidth(scrolled, 40);
	const plain = scrolled.map(strip);
	assert.match(plain[0], /^╭.*↑.*more.*╮$/);
	assert.match(plain[1], /^│ ❯❯ /);
	assert.equal(plain.at(-1).startsWith("╰") && plain.at(-1).endsWith("╯"), true);
});

test("an unfocused empty input shows the placeholder without a hardware cursor", () => {
	const editor = createEditor();
	assert.equal(editor.focused, false);
	const line = editor.render(40)[1];
	assert.equal(line.includes("\x1b_pi:c\x07"), false);
	assert.match(strip(line), /❯❯ Write your message here\.\.\./);
});

test("wide characters stay inside the box", () => {
	const editor = createEditor();
	editor.setText("Ａ🙂");
	const lines = editor.render(40);
	assertExactWidth(lines, 40);
	assert.match(strip(lines[1]), /^│ ❯❯ Ａ🙂/);
	assert.equal(editor.getText(), "Ａ🙂");
});

test("Pi's private visible-line count still marks the content between the borders", () => {
	const editor = createEditor();
	editor.setText("one\ntwo");
	const lines = editor.render(80);
	const contentCount = editor.renderedVisibleLineCount;
	assert.equal(Number.isInteger(contentCount), true);
	assert.ok(contentCount >= 1);
	assert.ok(lines.length >= contentCount + 2);
	const plain = lines.map(strip);
	assert.match(plain[0], /^╭/);
	for (let index = 1; index <= contentCount; index++) {
		assert.match(plain[index], /^│/);
	}
	assert.match(plain[contentCount + 1], /^╰/);
});

test("autocomplete sits below the closed box and clicks select a row", async () => {
	const editor = createEditor();
	editor.setAutocompleteProvider({
		getSuggestions: async () => ({
			items: [
				{ value: "alpha", label: "alpha" },
				{ value: "beta", label: "beta" },
			],
			prefix: "",
		}),
		applyCompletion: (_lines, _cursorLine, _cursorCol, item) => ({
			lines: [item.value],
			cursorLine: 0,
			cursorCol: item.value.length,
		}),
	});
	editor.handleInput("/");
	await new Promise((resolve) => setImmediate(resolve));
	assert.equal(editor.isShowingAutocomplete(), true);

	const width = 40;
	const lines = editor.render(width);
	const contentCount = editor.renderedVisibleLineCount;
	const plain = lines.map(strip);
	assertExactWidth(lines, width);
	assert.match(plain[0], /^╭/);
	assert.match(plain[contentCount], /^│/);
	assert.match(plain[contentCount + 1], /^╰/);
	assert.match(plain[contentCount + 2], /^ {5}→ alpha/);
	assert.match(plain[contentCount + 3], /^ {5} {2}beta/);

	editor.handleMouse({
		type: "click",
		button: "left",
		x: visibleWidth("│ ❯❯ ") + 2,
		y: contentCount + 3,
		screenX: 0,
		screenY: contentCount + 3,
		width,
		height: lines.length,
		shift: false,
		alt: false,
		ctrl: false,
	});
	assert.equal(editor.getText(), "beta");
	assert.equal(editor.isShowingAutocomplete(), false);
});

test("session start installs the rounded input editor", async () => {
	const handlers = new Map();
	const pi = {
		on: (event, handler) => handlers.set(event, handler),
		getSessionName: () => undefined,
		getThinkingLevel: () => "medium",
	};
	installThemeExtension(pi);

	let factory;
	const ctx = {
		mode: "tui",
		cwd: "/tmp/pi-teki-input",
		model: undefined,
		ui: {
			theme: { fg: (_color, text) => text, bold: (text) => text },
			setHeader() {},
			setFooter() {},
			setWorkingIndicator() {},
			setWorkingMessage() {},
			setWorkingVisible() {},
			setTitle() {},
			setEditorComponent(next) {
				factory = next;
			},
		},
	};
	await handlers.get("session_start")({}, ctx);
	const colors = [];
	ctx.ui.theme.fg = (color, text) => {
		colors.push(color);
		return text;
	};
	const editor = factory({ terminal: { rows: 24 }, requestRender() {} }, { borderColor: (text) => text, selectList }, {});
	assert.ok(editor instanceof RoundedInputEditor);
	const lines = editor.render(40).map(strip);
	assert.match(lines[0], /^╭/);
	assert.match(lines[1], /^│ ❯❯ Write your message here\.\.\./);
	assert.match(lines.at(-1), /^╰/);
	assert.ok(colors.includes("dim"));
	assert.ok(colors.includes("accent"));
});
