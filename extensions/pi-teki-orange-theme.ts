import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CONFIG_DIR_NAME } from "@earendil-works/pi-coding-agent";
import type { ExtensionAPI, ExtensionContext, WorkingIndicatorOptions } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

type UiConfig = {
	accountLabel?: string;
};

const CONFIG_FILE_NAME = "pi-teki-orange-theme.json";
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const TOOL_MESSAGES: Record<string, string> = {
	bash: "Running command",
	read: "Reading files",
	edit: "Editing",
	write: "Writing",
};

function readConfig(cwd: string): UiConfig {
	try {
		const configPath = path.join(cwd, CONFIG_DIR_NAME, CONFIG_FILE_NAME);
		if (!fs.existsSync(configPath)) {
			return {};
		}

		const parsed: unknown = JSON.parse(fs.readFileSync(configPath, "utf8"));
		if (!parsed || typeof parsed !== "object") {
			return {};
		}

		const accountLabel = (parsed as Record<string, unknown>).accountLabel;
		return typeof accountLabel === "string" ? { accountLabel } : {};
	} catch {
		return {};
	}
}

function getAccountLabel(ctx: ExtensionContext): string {
	const value = readConfig(ctx.cwd).accountLabel?.trim();
	if (value && value !== "set-me") {
		return value;
	}

	try {
		const username = os.userInfo().username?.trim();
		if (username) {
			return username;
		}
	} catch {
		// ignore
	}

	return process.env.USER?.trim() || process.env.USERNAME?.trim() || "local";
}

function getModelLabel(ctx: ExtensionContext): string {
	return ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "no model";
}

function getBaseTitle(pi: ExtensionAPI, ctx: ExtensionContext): string {
	const cwd = path.basename(ctx.cwd);
	const model = getModelLabel(ctx);
	const session = pi.getSessionName();
	return session ? `Pi — ${cwd} — ${model} — ${session}` : `Pi — ${cwd} — ${model}`;
}

function getWorkingIndicator(ctx: ExtensionContext): WorkingIndicatorOptions {
	return {
		frames: SPINNER_FRAMES.map((frame, index) => {
			const color = index % 2 === 0 ? "accent" : "muted";
			return ctx.ui.theme.fg(color, frame);
		}),
		intervalMs: 80,
	};
}

function padPlain(text: string, width: number): string {
	return text + " ".repeat(Math.max(0, width - visibleWidth(text)));
}

function getLogoLines(theme: ExtensionContext["ui"]["theme"]): string[] {
	const on = "██";
	const off = "  ";
	const logo = (cells: number[]) =>
		theme.fg(
			"text",
			theme.bold(cells.map((cell) => (cell ? on : off)).join("")),
		);

	return [
		logo([1, 1, 1, 0]),
		logo([1, 0, 1, 0]),
		logo([1, 1, 0, 1]),
		logo([1, 0, 0, 1]),
	];
}

function applyChrome(pi: ExtensionAPI, ctx: ExtensionContext) {
	const accountLabel = getAccountLabel(ctx);

	ctx.ui.setHeader((_tui, theme) => ({
		invalidate() {},
		render(width: number): string[] {
			if (width < 48) {
				const left = `${theme.fg("accent", theme.bold("Pi"))}`;
				const right = `${theme.fg("dim", "cwd")} ${theme.fg("muted", path.basename(ctx.cwd))}`;
				const pad = " ".repeat(Math.max(1, width - visibleWidth(left) - visibleWidth(right)));
				return [truncateToWidth(left + pad + right, width)];
			}

			const innerWidth = width - 2;
			const logoLines = getLogoLines(theme);
			const logoWidth = 8;
			const gap = 2;
			const metaWidth = Math.max(12, innerWidth - logoWidth - gap * 2 - 1);
			const metaLines = [
				`${theme.fg("text", theme.bold("Pi"))}  ${theme.fg("dim", "model")} ${theme.fg("muted", getModelLabel(ctx))}`,
				`${theme.fg("dim", "acct")} ${theme.fg("muted", accountLabel)}  ${theme.fg("borderMuted", "·")}  ${theme.fg("dim", "think")} ${theme.fg("muted", pi.getThinkingLevel())}`,
				`${theme.fg("dim", "cwd")} ${theme.fg("muted", path.basename(ctx.cwd))}`,
				"",
			];

			const top = theme.fg("border", `┌${"─".repeat(innerWidth)}┐`);
			const bottom = theme.fg("border", `└${"─".repeat(innerWidth)}┘`);
			const rows = logoLines.map((logo, index) => {
				const meta = truncateToWidth(metaLines[index] ?? "", metaWidth, "");
				const content = `${logo}${" ".repeat(gap)}${theme.fg("borderMuted", "│")}${" ".repeat(gap)}${padPlain(meta, metaWidth)}`;
				return `${theme.fg("border", "│")}${padPlain(content, innerWidth)}${theme.fg("border", "│")}`;
			});

			return [top, ...rows, bottom];
		},
	}));

	ctx.ui.setFooter((tui, theme, footerData) => ({
		dispose: footerData.onBranchChange(() => tui.requestRender()),
		invalidate() {},
		render(width: number): string[] {
			const statuses = Array.from(footerData.getExtensionStatuses().values()).filter(Boolean);
			const left = statuses.length > 0 ? statuses.join(theme.fg("borderMuted", "  ·  ")) : theme.fg("dim", "Ready");
			const branch = footerData.getGitBranch() ?? "no git";
			const usage = ctx.getContextUsage();
			const formatTokens = (n: number) => (n < 1000 ? `${n}` : `${Math.round(n / 100) / 10}k`);
			const usageLabel =
				usage?.percent != null && usage?.tokens != null
					? `ctx ${Math.round(usage.percent)}% (${formatTokens(usage.tokens)})`
					: "ctx --";
			const model = getModelLabel(ctx);
			const right = [
				theme.fg("muted", model),
				theme.fg("dim", branch),
				theme.fg("dim", usageLabel),
			].join(theme.fg("borderMuted", "  ·  "));
			const pad = " ".repeat(Math.max(1, width - visibleWidth(left) - visibleWidth(right)));
			return [truncateToWidth(left + pad + right, width), ""];
		},
	}));

	ctx.ui.setWorkingIndicator(getWorkingIndicator(ctx));
	ctx.ui.setWorkingMessage("Thinking…");
	ctx.ui.setWorkingVisible(true);
	ctx.ui.setTitle(getBaseTitle(pi, ctx));
}

export default function (pi: ExtensionAPI) {
	let timer: ReturnType<typeof setInterval> | null = null;
	let frameIndex = 0;
	const activeTools = new Map<string, string>();

	const setActivity = (ctx: ExtensionContext, label: string | undefined) => {
		ctx.ui.setStatus(
			"pi-teki-orange-theme",
			label ? ctx.ui.theme.fg("accent", label) : undefined,
		);
	};

	const stopTitleAnimation = (ctx: ExtensionContext) => {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
		frameIndex = 0;
		ctx.ui.setTitle(getBaseTitle(pi, ctx));
	};

	const startTitleAnimation = (ctx: ExtensionContext) => {
		stopTitleAnimation(ctx);
		timer = setInterval(() => {
			const frame = SPINNER_FRAMES[frameIndex % SPINNER_FRAMES.length]!;
			ctx.ui.setTitle(`${frame} ${getBaseTitle(pi, ctx)}`);
			frameIndex++;
		}, 80);
	};

	pi.on("session_start", async (_event, ctx) => {
		if (ctx.mode !== "tui") {
			return;
		}
		applyChrome(pi, ctx);
		setActivity(ctx, undefined);
	});

	pi.on("model_select", async (_event, ctx) => {
		if (ctx.mode !== "tui") {
			return;
		}
		applyChrome(pi, ctx);
	});

	pi.on("thinking_level_select", async (_event, ctx) => {
		if (ctx.mode !== "tui") {
			return;
		}
		applyChrome(pi, ctx);
	});

	pi.on("agent_start", async (_event, ctx) => {
		if (ctx.mode !== "tui") {
			return;
		}
		activeTools.clear();
		ctx.ui.setWorkingMessage("Thinking…");
		setActivity(ctx, "Thinking");
		startTitleAnimation(ctx);
	});

	pi.on("tool_execution_start", async (event, ctx) => {
		if (ctx.mode !== "tui") {
			return;
		}
		const message = TOOL_MESSAGES[event.toolName] ?? `Running ${event.toolName}`;
		activeTools.set(event.toolCallId, message);
		ctx.ui.setWorkingMessage(`${message}…`);
		setActivity(ctx, message);
	});

	pi.on("tool_execution_end", async (event, ctx) => {
		if (ctx.mode !== "tui") {
			return;
		}
		activeTools.delete(event.toolCallId);
		const messages = Array.from(activeTools.values());
		const message = messages[messages.length - 1];
		if (message) {
			ctx.ui.setWorkingMessage(`${message}…`);
			setActivity(ctx, message);
		} else {
			ctx.ui.setWorkingMessage("Thinking…");
			setActivity(ctx, "Thinking");
		}
	});

	pi.on("agent_settled", async (_event, ctx) => {
		if (ctx.mode !== "tui") {
			return;
		}
		activeTools.clear();
		ctx.ui.setWorkingMessage("Thinking…");
		setActivity(ctx, undefined);
		stopTitleAnimation(ctx);
		applyChrome(pi, ctx);
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		activeTools.clear();
		if (ctx.mode !== "tui") {
			return;
		}
		stopTitleAnimation(ctx);
	});
}
