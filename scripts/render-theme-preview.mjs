/**
 * Dev-only visual preview. Not published (see package.json "files").
 *
 *   npm run preview
 *
 * Writes theme-preview.html. Colors come from the real theme files through Pi's
 * loadThemeFromPath(), and the header, footer, and shimmer come from the extension's own
 * render functions. The arrangement of Pi's built-in surfaces (message panels, tool boxes,
 * diffs, markdown) is a representative composition of the theme's own tokens, not a
 * screenshot of Pi, so treat layout as approximate and colors as exact.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { visibleWidth } from "@earendil-works/pi-tui";

// Theme.bold() goes through chalk, which decides its color level when it is first imported.
// Set this before importing the extension so bold survives a redirected stdout.
process.env.FORCE_COLOR ??= "2";
const { pickWhimsicalMessage } = await import("../extensions/whimsical-messages.ts");
const { renderFooterLines, renderHeaderLines, renderShimmerMessage, truncateWorkingMessage } =
	await import("../extensions/pi-teki-orange-theme.ts");

// Pi resolves a token set to "" (terminal default) against the terminal, and falls back to
// these when it needs a concrete value. Mirrors GUESSED_DEFAULT_COLORS in Pi's theme.js.
const TERMINAL_DEFAULT_FG = { dark: "#e5e5e7", light: "#000000" };
const WIDTH = 78;
const THEME_FILES = [
	{ file: "pi-teki-orange-theme.json", label: "pi-teki-orange-theme", appearance: "dark" },
	{ file: "pi-teki-orange-theme-light.json", label: "pi-teki-orange-theme-light", appearance: "light" },
];

const packageEntry = fileURLToPath(import.meta.resolve("@earendil-works/pi-coding-agent"));
const { loadThemeFromPath } = await import(pathToFileURL(
	path.join(path.dirname(packageEntry), "modes/interactive/theme/theme.js")).href);

/** Convert a string of SGR-styled text to HTML, tracking one span per style change. */
function ansiToHtml(input, defaultFg) {
	const escape = (text) => text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
	const state = { fg: null, bg: null, bold: false, faint: false, italic: false, underline: false, strike: false, inverse: false };
	const styled = (text) => {
		if (!text) return "";
		let css = "";
		const fg = state.inverse ? state.bg : state.fg;
		const bg = state.inverse ? state.fg : state.bg;
		css += `color:${fg ?? defaultFg};`;
		if (bg !== null) css += `background-color:${bg};`;
		if (state.bold) css += "font-weight:700;";
		if (state.faint) css += "opacity:.62;";
		if (state.italic) css += "font-style:italic;";
		const deco = [state.underline && "underline", state.strike && "line-through"].filter(Boolean);
		if (deco.length) css += `text-decoration:${deco.join(" ")};`;
		return `<span style="${css}">${escape(text)}</span>`;
	};
	let html = "";
	let cursor = 0;
	for (const match of input.matchAll(/\x1b\[([0-9;]*)m/g)) {
		html += styled(input.slice(cursor, match.index));
		cursor = match.index + match[0].length;
		const codes = (match[1] || "0").split(";").map((code) => (code === "" ? 0 : Number(code)));
		for (let i = 0; i < codes.length; i++) {
			const code = codes[i];
			if (code === 38 || code === 48) {
				const isFg = code === 38;
				if (codes[i + 1] === 2) {
					const [r, g, b] = codes.slice(i + 2, i + 5);
					if (codes.length >= i + 5) {
						const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
						if (isFg) state.fg = hex; else state.bg = hex;
					}
					i += 5;
					continue;
				}
				i += codes[i + 1] === 5 ? 2 : 1; // indexed colors are unused in truecolor mode
				continue;
			}
			if (code === 0) Object.assign(state, { fg: null, bg: null, bold: false, faint: false, italic: false, underline: false, strike: false, inverse: false });
			else if (code === 1) state.bold = true;
			else if (code === 2) state.faint = true;
			else if (code === 3) state.italic = true;
			else if (code === 4) state.underline = true;
			else if (code === 7) state.inverse = true;
			else if (code === 9) state.strike = true;
			else if (code === 22) state.bold = state.faint = false;
			else if (code === 23) state.italic = false;
			else if (code === 24) state.underline = false;
			else if (code === 27) state.inverse = false;
			else if (code === 29) state.strike = false;
			else if (code === 39) state.fg = null;
			else if (code === 49) state.bg = null;
		}
	}
	html += styled(input.slice(cursor));
	return html;
}

/** Paint a whole line, padding first so a background token fills the row. */
function row(text, theme, tokens = {}) {
	const filled = `${text}${" ".repeat(Math.max(0, WIDTH - visibleWidth(text)))}`.slice(0, WIDTH);
	let out = filled;
	if (tokens.bg) out = theme.bg(tokens.bg, out);
	if (tokens.fg) out = theme.fg(tokens.fg, out);
	return out;
}

function renderScreen(theme) {
	const chrome = { fg: (c, t) => theme.fg(c, t), bold: (t) => theme.bold(t) };
	const input = {
		cwd: "/Users/serk/prj/pi-talks/pi-teki-theme-orange",
		accountLabel: "serk",
		modelLabel: "anthropic/claude-opus-5",
		thinkingLevel: "medium",
	};
	const lines = [...renderHeaderLines(WIDTH, chrome, input), ""];

	// A user message panel and a custom message panel.
	lines.push(row("❯ deploy the light palette", theme, { bg: "userMessageBg", fg: "userMessageText" }));
	lines.push(row("", theme, { bg: "userMessageBg" }));
	lines.push(" ");

	// Tool boxes in each state, with a diff inside the pending one.
	const tool = (title, state, body) => {
		const bg = state === "success" ? "toolSuccessBg" : state === "error" ? "toolErrorBg" : "toolPendingBg";
		return [
			row(` ${title}`, theme, { bg, fg: "toolTitle" }),
			...body.map((line) => row(line.text, theme, { bg, fg: line.fg ?? "toolOutput" })),
		];
	};
	lines.push(...tool("bash  npm run check", "pending", [
		{ text: "# tests 25" },
		{ text: "+  appearance: light", fg: "toolDiffAdded" },
		{ text: "-  appearance: (none)", fg: "toolDiffRemoved" },
		{ text: "   name: pi-teki-orange-theme", fg: "toolDiffContext" },
	]), "");
	lines.push(...tool("edit  themes/pi-teki-orange-theme-light.json", "success", [
		{ text: "added 2 new vars: ink, code" },
	]), "");
	lines.push(...tool("read  themes/missing.json", "error", [
		{ text: "ENOENT: no such file or directory", fg: "error" },
	]), "");

	// Markdown, syntax, and status surfaces.
	const md = (text, token) => row(` ${text}`, theme, { fg: token });
	lines.push(
		md("# Light and dark, one palette family", "mdHeading"),
		md("Run npm pack to build the tarball.", "text"),
		md("`pi-teki-orange-theme-light` is the second theme name.", "mdCode"),
		md("[theme docs](https://pi.dev/schemas/theme.schema.json)", "mdLink"),
		md("Pi has no inheritance between theme files", "mdQuote"),
		md("• both files expose 51 tokens", "mdListBullet"),
		md("─".repeat(30), "mdHr"),
		md("✓ 25 passing", "success"),
		md("✗ contrast below AA", "error"),
		md("⚠ accent is 3.59:1 on panelAlt", "warning"),
		"",
	);

	// Footer, then the working line at three shimmer offsets.
	lines.push(...renderFooterLines(WIDTH, chrome, { ...input, branch: "main", usageLabel: "ctx 12% (24k)" }));
	const message = truncateWorkingMessage(pickWhimsicalMessage("thinking"), WIDTH);
	for (const offset of [0, 6, 13]) lines.push(renderShimmerMessage(theme, message, offset));
	return lines;
}

const cards = THEME_FILES.map(({ file, label, appearance }) => {
	const theme = loadThemeFromPath(path.resolve("themes", file), "truecolor");
	const screen = renderScreen(theme);
	const swatches = Object.entries(JSON.parse(fs.readFileSync(path.resolve("themes", file), "utf8")).vars)
		.map(([name, hex]) => `<div class="swatch"><i style="background:${hex}"></i><code>${name}</code> <b>${hex}</b></div>`)
		.join("");
	return `<section class="card" style="--page:${theme.export?.pageBg ?? (appearance === "dark" ? "#000" : "#fff")}">
  <h2>${label} <small>${appearance}</small></h2>
  <div class="swatches">${swatches}</div>
  <pre class="screen" style="background:var(--page)">${ansiToHtml(screen.join("\n"), TERMINAL_DEFAULT_FG[appearance])}</pre>
</section>`;
});

fs.writeFileSync("theme-preview.html", `<!doctype html>
<meta charset="utf-8">
<title>pi-teki-orange-theme — dark and light preview</title>
<style>
	body { margin: 2rem; background: #55534f; color: #f5f2ee; font: 14px/1.6 system-ui, sans-serif; }
	h1 { font-size: 1.3rem; }
	.note { max-width: 64rem; opacity: .85; }
	.wrap { display: flex; flex-wrap: wrap; gap: 1.5rem; align-items: flex-start; margin-top: 1.5rem; }
	.card { flex: 1 1 42rem; min-width: 24rem; }
	h2 { font-size: 1rem; margin: 0 0 .5rem; }
	h2 small { opacity: .7; font-weight: 400; }
	.swatches { display: flex; flex-wrap: wrap; gap: .4rem .7rem; margin-bottom: .5rem; }
	.swatch { display: flex; align-items: center; gap: .3rem; font-size: 11px; }
	.swatch i { width: 12px; height: 12px; border-radius: 3px; border: 1px solid rgba(255,255,255,.25); }
	.screen { overflow-x: auto; padding: .75rem; border-radius: 6px; font: 12px/1.35 "SF Mono", Menlo, monospace; margin: 0; }
</style>
<h1>pi-teki-orange-theme — dark and light</h1>
<p class="note">Colors are read from <code>themes/*.json</code> through Pi's <code>loadThemeFromPath()</code>;
header, footer, and shimmer come from the extension's own render functions. The arrangement of Pi's
built-in surfaces is a representative composition, not a screenshot. Each card's page background is the
theme's <code>export.pageBg</code>; a real terminal supplies its own background.</p>
<div class="wrap">${cards.join("\n")}</div>
`);
console.log("wrote theme-preview.html");
