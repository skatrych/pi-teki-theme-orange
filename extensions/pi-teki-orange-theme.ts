import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CONFIG_DIR_NAME } from "@earendil-works/pi-coding-agent";
import type { ExtensionAPI, ExtensionContext, ThemeColor, WorkingIndicatorOptions } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { pickWhimsicalMessage, type WhimsicalMessageCategory } from "./whimsical-messages.ts";

export type UiConfig = {
	accountLabel?: string;
	whimsicalWorkingMessages?: boolean;
};

const CONFIG_FILE_NAME = "pi-teki-orange-theme.json";
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const TOOL_MESSAGES: Record<string, string> = {
	bash: "Running command",
	read: "Reading files",
	edit: "Editing",
	write: "Writing",
};

const TOOL_MESSAGE_CATEGORIES: Record<string, WhimsicalMessageCategory> = {
	bash: "bash",
	read: "read",
	edit: "edit",
	write: "write",
};

export function getWhimsicalMessageCategory(toolName: string): WhimsicalMessageCategory {
	return TOOL_MESSAGE_CATEGORIES[toolName] ?? "other";
}

export function readConfig(cwd: string): UiConfig {
	try {
		const configPath = path.join(cwd, CONFIG_DIR_NAME, CONFIG_FILE_NAME);
		if (!fs.existsSync(configPath)) {
			return {};
		}

		const parsed: unknown = JSON.parse(fs.readFileSync(configPath, "utf8"));
		if (!parsed || typeof parsed !== "object") {
			return {};
		}

		const config = parsed as Record<string, unknown>;
		const accountLabel = config.accountLabel;
		const whimsicalWorkingMessages = config.whimsicalWorkingMessages;
		return {
			...(typeof accountLabel === "string" ? { accountLabel } : {}),
			...(typeof whimsicalWorkingMessages === "boolean" ? { whimsicalWorkingMessages } : {}),
		};
	} catch {
		return {};
	}
}

export function resolveAccountLabel(
	configLabel: string | undefined,
	username: string | undefined,
	envUser: string | undefined,
	envUsername: string | undefined,
): string {
	const value = configLabel?.trim();
	if (value && value !== "set-me") {
		return value;
	}
	const trimmedUsername = username?.trim();
	if (trimmedUsername) {
		return trimmedUsername;
	}
	return envUser?.trim() || envUsername?.trim() || "local";
}

function getAccountLabel(ctx: ExtensionContext): string {
	let username: string | undefined;
	try {
		username = os.userInfo().username;
	} catch {
		username = undefined;
	}
	return resolveAccountLabel(
		readConfig(ctx.cwd).accountLabel,
		username,
		process.env.USER,
		process.env.USERNAME,
	);
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

const SHIMMER_COLORS: ThemeColor[] = [
	"accent",
	"thinkingMedium",
	"warning",
	"thinkingHigh",
	"mdCode",
	"thinkingHigh",
	"warning",
	"thinkingMedium",
];
const WORKING_MESSAGE_CHANGE_INTERVAL_MS = 3_000;
const WORKING_MESSAGE_OVERHEAD_WIDTH = 4;
const ANSI_ESCAPE_SEQUENCE = /\x1B\[[0-?]*[ -/]*[@-~]/g;

export function truncateWorkingMessage(message: string, terminalWidth = process.stdout.columns): string {
	const availableWidth = Math.max(1, (terminalWidth ?? 80) - WORKING_MESSAGE_OVERHEAD_WIDTH);
	return truncateToWidth(message, availableWidth, "…").replace(ANSI_ESCAPE_SEQUENCE, "");
}

export function renderShimmerMessage(
	theme: Pick<ChromeTheme, "fg">,
	message: string,
	offset: number,
): string {
	const characters = Array.from(message);
	const shimmerPosition = offset % (characters.length + SHIMMER_COLORS.length);
	return characters
		.map((character, index) => {
			if (character === " ") {
				return character;
			}
			const colorIndex =
				((index - shimmerPosition) % SHIMMER_COLORS.length + SHIMMER_COLORS.length) % SHIMMER_COLORS.length;
			return theme.fg(SHIMMER_COLORS[colorIndex]!, character);
		})
		.join("");
}

export function padPlain(text: string, width: number): string {
	return text + " ".repeat(Math.max(0, width - visibleWidth(text)));
}

type ChromeTheme = {
	fg: (color: ThemeColor, text: string) => string;
	bold: (text: string) => string;
};

function getLogoLines(theme: ChromeTheme): string[] {
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

export function renderHeaderLines(
	width: number,
	theme: ChromeTheme,
	input: {
		cwd: string;
		accountLabel: string;
		modelLabel: string;
		thinkingLevel: string;
	},
): string[] {
	if (width < 48) {
		const left = `${theme.fg("accent", theme.bold("Pi"))}`;
		const right = `${theme.fg("dim", "cwd")} ${theme.fg("muted", path.basename(input.cwd))}`;
		const pad = " ".repeat(Math.max(1, width - visibleWidth(left) - visibleWidth(right)));
		return [truncateToWidth(left + pad + right, width)];
	}

	const innerWidth = width - 2;
	const logoLines = getLogoLines(theme);
	const logoWidth = 8;
	const gap = 2;
	const metaWidth = Math.max(12, innerWidth - logoWidth - gap * 2 - 1);
	const metaLines = [
		`${theme.fg("text", theme.bold("Pi"))}  ${theme.fg("dim", "model")} ${theme.fg("muted", input.modelLabel)}`,
		`${theme.fg("dim", "acct")} ${theme.fg("muted", input.accountLabel)}  ${theme.fg("borderMuted", "·")}  ${theme.fg("dim", "think")} ${theme.fg("muted", input.thinkingLevel)}`,
		`${theme.fg("dim", "cwd")} ${theme.fg("muted", path.basename(input.cwd))}`,
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
}

export function renderFooterLines(
	width: number,
	theme: ChromeTheme,
	input: {
		cwd: string;
		modelLabel: string;
		thinkingLevel: string;
		branch: string;
		usageLabel: string;
	},
): string[] {
	const right = [
		theme.fg("muted", input.modelLabel),
		theme.fg("muted", input.thinkingLevel),
		theme.fg("dim", input.branch),
		theme.fg("dim", input.usageLabel),
	].join(theme.fg("borderMuted", "  ·  "));
	const left = theme.fg("dim", truncateToWidth(input.cwd, Math.max(1, width - visibleWidth(right) - 1)));
	const pad = " ".repeat(Math.max(1, width - visibleWidth(left) - visibleWidth(right)));
	return [truncateToWidth(left + pad + right, width), " ".repeat(width)];
}

function applyLayoutChrome(pi: ExtensionAPI, ctx: ExtensionContext) {
	const accountLabel = getAccountLabel(ctx);

	ctx.ui.setHeader((_tui, theme) => ({
		invalidate() {},
		render(width: number): string[] {
			return renderHeaderLines(width, theme, {
				cwd: ctx.cwd,
				accountLabel,
				modelLabel: getModelLabel(ctx),
				thinkingLevel: pi.getThinkingLevel(),
			});
		},
	}));

	ctx.ui.setFooter((tui, theme, footerData) => ({
		dispose: footerData.onBranchChange(() => tui.requestRender()),
		invalidate() {},
		render(width: number): string[] {
			const branch = footerData.getGitBranch() ?? "no git";
			const usage = ctx.getContextUsage();
			const formatTokens = (n: number) => (n < 1000 ? `${n}` : `${Math.round(n / 100) / 10}k`);
			const usageLabel =
				usage?.percent != null && usage?.tokens != null
					? `ctx ${Math.round(usage.percent)}% (${formatTokens(usage.tokens)})`
					: "ctx --";
			return renderFooterLines(width, theme, {
				cwd: ctx.cwd,
				modelLabel: getModelLabel(ctx),
				thinkingLevel: pi.getThinkingLevel(),
				branch,
				usageLabel,
			});
		},
	}));

	ctx.ui.setWorkingIndicator(getWorkingIndicator(ctx));
}

export function areWhimsicalWorkingMessagesEnabled(config: UiConfig): boolean {
	return config.whimsicalWorkingMessages !== false;
}

function useWhimsicalWorkingMessages(ctx: ExtensionContext): boolean {
	return areWhimsicalWorkingMessagesEnabled(readConfig(ctx.cwd));
}

function applyIdleWorkingState(pi: ExtensionAPI, ctx: ExtensionContext) {
	const message = useWhimsicalWorkingMessages(ctx) ? pickWhimsicalMessage("thinking") : "Thinking…";
	ctx.ui.setWorkingMessage(truncateWorkingMessage(message));
	ctx.ui.setWorkingVisible(true);
	ctx.ui.setTitle(getBaseTitle(pi, ctx));
}

export default function (pi: ExtensionAPI) {
	let timer: ReturnType<typeof setInterval> | null = null;
	let shimmerTimer: ReturnType<typeof setInterval> | null = null;
	let frameIndex = 0;
	const activeTools = new Map<string, string>();
	const previousWhimsicalMessages = new Map<WhimsicalMessageCategory, string>();
	let agentBusy = false;

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

	const stopWorkingMessageAnimation = () => {
		if (shimmerTimer) {
			clearInterval(shimmerTimer);
			shimmerTimer = null;
		}
	};

	const getNextWhimsicalMessage = (category: WhimsicalMessageCategory) => {
		const message = pickWhimsicalMessage(category, previousWhimsicalMessages.get(category));
		previousWhimsicalMessages.set(category, message);
		return message;
	};

	const startWorkingMessageAnimation = (ctx: ExtensionContext, category: WhimsicalMessageCategory) => {
		stopWorkingMessageAnimation();
		let message = getNextWhimsicalMessage(category);
		let shimmerOffset = 0;
		let messageStartedAt = Date.now();
		const update = () => {
			if (Date.now() - messageStartedAt >= WORKING_MESSAGE_CHANGE_INTERVAL_MS) {
				message = getNextWhimsicalMessage(category);
				shimmerOffset = 0;
				messageStartedAt = Date.now();
			}
			ctx.ui.setWorkingMessage(renderShimmerMessage(ctx.ui.theme, truncateWorkingMessage(message), shimmerOffset));
			shimmerOffset++;
		};
		update();
		shimmerTimer = setInterval(update, 110);
	};

	const refreshChrome = (ctx: ExtensionContext) => {
		applyLayoutChrome(pi, ctx);
		if (!agentBusy) {
			applyIdleWorkingState(pi, ctx);
		}
	};

	pi.on("session_start", async (_event, ctx) => {
		if (ctx.mode !== "tui") {
			return;
		}
		agentBusy = false;
		applyLayoutChrome(pi, ctx);
		applyIdleWorkingState(pi, ctx);
	});

	pi.on("model_select", async (_event, ctx) => {
		if (ctx.mode !== "tui") {
			return;
		}
		refreshChrome(ctx);
	});

	pi.on("thinking_level_select", async (_event, ctx) => {
		if (ctx.mode !== "tui") {
			return;
		}
		refreshChrome(ctx);
	});

	pi.on("agent_start", async (_event, ctx) => {
		if (ctx.mode !== "tui") {
			return;
		}
		agentBusy = true;
		activeTools.clear();
		if (useWhimsicalWorkingMessages(ctx)) {
			startWorkingMessageAnimation(ctx, "thinking");
		} else {
			ctx.ui.setWorkingMessage("Thinking…");
		}
		startTitleAnimation(ctx);
	});

	pi.on("tool_execution_start", async (event, ctx) => {
		if (ctx.mode !== "tui") {
			return;
		}
		activeTools.set(event.toolCallId, event.toolName);
		if (useWhimsicalWorkingMessages(ctx)) {
			startWorkingMessageAnimation(ctx, getWhimsicalMessageCategory(event.toolName));
			return;
		}
		const message = TOOL_MESSAGES[event.toolName] ?? `Running ${event.toolName}`;
		ctx.ui.setWorkingMessage(truncateWorkingMessage(`${message}…`));
	});

	pi.on("tool_execution_end", async (event, ctx) => {
		if (ctx.mode !== "tui") {
			return;
		}
		activeTools.delete(event.toolCallId);
		const toolNames = Array.from(activeTools.values());
		const toolName = toolNames[toolNames.length - 1];
		if (useWhimsicalWorkingMessages(ctx)) {
			startWorkingMessageAnimation(ctx, toolName ? getWhimsicalMessageCategory(toolName) : "thinking");
			return;
		}
		const message = toolName ? (TOOL_MESSAGES[toolName] ?? `Running ${toolName}`) : undefined;
		ctx.ui.setWorkingMessage(truncateWorkingMessage(message ? `${message}…` : "Thinking…"));
	});

	pi.on("agent_settled", async (_event, ctx) => {
		agentBusy = false;
		activeTools.clear();
		if (ctx.mode !== "tui") {
			return;
		}
		stopTitleAnimation(ctx);
		stopWorkingMessageAnimation();
		applyLayoutChrome(pi, ctx);
		applyIdleWorkingState(pi, ctx);
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		agentBusy = false;
		activeTools.clear();
		if (ctx.mode !== "tui") {
			return;
		}
		stopTitleAnimation(ctx);
		stopWorkingMessageAnimation();
	});
}
