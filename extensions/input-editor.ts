import { CustomEditor, type KeybindingsManager } from "@earendil-works/pi-coding-agent";
import {
	CURSOR_MARKER,
	type EditorTheme,
	renderFakeCursor,
	sliceByColumn,
	type TUI,
	type TuiMouseEvent,
	type TuiMouseEventResult,
	truncateToWidth,
	visibleWidth,
} from "@earendil-works/pi-tui";

const PROMPT = "❯❯ ";
const PLACEHOLDER = "Write your message here...";

type InputFrame = {
	contentWidth: number;
	leftBorder: string;
	leftPad: string;
	prefix: string;
	continuation: string;
	rightPad: string;
	rightBorder: string;
};

export type RoundedInputEditorOptions = {
	accent: (text: string) => string;
	dim: (text: string) => string;
	/** Draw Pi's working status on the top border. Defaults to true. */
	embedWorkingStatus?: boolean;
};

type EditorMetrics = {
	renderedVisibleLineCount: number;
};

function fitToWidth(text: string, width: number): string {
	if (width <= 0) {
		return "";
	}
	const current = visibleWidth(text);
	if (current === width) {
		return text;
	}
	if (current > width) {
		return sliceByColumn(text, 0, width, true);
	}
	return text + " ".repeat(width - current);
}

function chromeWidth(frame: Pick<InputFrame, "leftBorder" | "leftPad" | "prefix" | "rightPad" | "rightBorder">): number {
	return (
		visibleWidth(frame.leftBorder) +
		visibleWidth(frame.leftPad) +
		visibleWidth(frame.prefix) +
		visibleWidth(frame.rightPad) +
		visibleWidth(frame.rightBorder)
	);
}

// Full frame is `│ ❯❯ text │`. Narrow terminals drop the inner padding, then the
// space after the prompt, before falling back to the plain editor.
function fitInputFrame(width: number): InputFrame | null {
	const layouts = [
		{ leftBorder: "│", leftPad: " ", prefix: PROMPT, rightPad: " ", rightBorder: "│" },
		{ leftBorder: "│", leftPad: "", prefix: PROMPT, rightPad: "", rightBorder: "│" },
		{ leftBorder: "│", leftPad: "", prefix: "❯❯", rightPad: "", rightBorder: "│" },
	];
	for (const layout of layouts) {
		const chrome = chromeWidth(layout);
		if (width - chrome >= 1) {
			return {
				contentWidth: width - chrome,
				continuation: " ".repeat(visibleWidth(layout.prefix)),
				...layout,
			};
		}
	}
	return null;
}

function paintPrompt(prefix: string, accent: (text: string) => string): string {
	const glyphs = prefix.trimEnd();
	return accent(glyphs) + prefix.slice(glyphs.length);
}

function roundedBorder(
	kind: "top" | "bottom",
	inner: string,
	width: number,
	color: (text: string) => string,
): string {
	const left = kind === "top" ? "╭" : "╰";
	const right = kind === "top" ? "╮" : "╯";
	return color(left) + fitToWidth(inner, Math.max(0, width - 2)) + color(right);
}

function frameContentLine(
	content: string,
	frame: InputFrame,
	isFirst: boolean,
	accent: (text: string) => string,
	color: (text: string) => string,
): string {
	const prefix = isFirst ? paintPrompt(frame.prefix, accent) : frame.continuation;
	return (
		color(frame.leftBorder) +
		frame.leftPad +
		prefix +
		fitToWidth(content, frame.contentWidth) +
		frame.rightPad +
		color(frame.rightBorder)
	);
}

function contentIndent(frame: InputFrame): number {
	return visibleWidth(frame.leftBorder) + visibleWidth(frame.leftPad) + visibleWidth(frame.prefix);
}

function frameAutocompleteLine(content: string, frame: InputFrame, width: number): string {
	const indent = contentIndent(frame);
	return fitToWidth(" ".repeat(indent) + fitToWidth(content, frame.contentWidth), width);
}

function emptyPlaceholder(contentWidth: number, focused: boolean, dim: (text: string) => string): string {
	const text = truncateToWidth(PLACEHOLDER, contentWidth, "");
	const first = Array.from(text)[0] ?? "";
	const rest = text.slice(first.length);
	const marker = focused ? CURSOR_MARKER : "";
	const cursor = first.length > 0 ? renderFakeCursor(dim(first)) : renderFakeCursor(" ");
	return fitToWidth(marker + cursor + dim(rest), contentWidth);
}

/**
 * Message editor drawn as a rounded rectangle. The `❯❯` prompt is chrome:
 * it stays on the first visible row while typing and is not part of the text.
 * An empty input shows a dim placeholder that disappears as soon as typing starts.
 */
export class RoundedInputEditor extends CustomEditor {
	private hiddenAbove = 0;
	private hiddenBelow = 0;
	private deferBorders = false;
	private readonly accent: (text: string) => string;
	private readonly dim: (text: string) => string;

	constructor(tui: TUI, theme: EditorTheme, keybindings: KeybindingsManager, options: RoundedInputEditorOptions) {
		super(tui, theme, keybindings, { embedWorkingStatus: options.embedWorkingStatus ?? true });
		this.accent = options.accent;
		this.dim = options.dim;
	}

	// super.render() calls these to record how many lines are scrolled off.
	// Those strings are discarded; the visible borders are drawn once afterward
	// at the full terminal width, so this pass skips the status layout.
	protected override renderTopBorder(width: number, hiddenLineCount: number): string {
		this.hiddenAbove = hiddenLineCount;
		if (this.deferBorders) {
			return "";
		}
		return super.renderTopBorder(width, hiddenLineCount);
	}

	protected override renderBottomBorder(width: number, hiddenLineCount: number): string {
		this.hiddenBelow = hiddenLineCount;
		if (this.deferBorders) {
			return "";
		}
		return super.renderBottomBorder(width, hiddenLineCount);
	}

	override render(width: number): string[] {
		const frame = fitInputFrame(width);
		if (!frame) {
			return super.render(width);
		}

		// Pi's Editor.render order is private: top border, then
		// renderedVisibleLineCount content rows, then the bottom border, then
		// autocomplete. The count is a private field. A future Pi that moves
		// either one gets the stock editor instead of a broken box.
		this.deferBorders = true;
		let source: string[];
		try {
			source = super.render(frame.contentWidth);
		} finally {
			this.deferBorders = false;
		}
		const contentCount = (this as unknown as EditorMetrics).renderedVisibleLineCount;
		const bottomIndex = contentCount + 1;
		if (!Number.isInteger(contentCount) || contentCount < 1 || bottomIndex >= source.length) {
			return super.render(width);
		}
		const color = (text: string) => this.borderColor(text);
		const innerWidth = Math.max(0, width - 2);
		const showPlaceholder = this.getText().length === 0;
		const lines = source.slice();
		lines[0] = roundedBorder("top", super.renderTopBorder(innerWidth, this.hiddenAbove), width, color);
		for (let index = 1; index <= contentCount; index++) {
			const content =
				showPlaceholder && index === 1
					? emptyPlaceholder(frame.contentWidth, this.focused, this.dim)
					: (lines[index] ?? "");
			lines[index] = frameContentLine(content, frame, index === 1, this.accent, color);
		}
		lines[bottomIndex] = roundedBorder(
			"bottom",
			super.renderBottomBorder(innerWidth, this.hiddenBelow),
			width,
			color,
		);
		for (let index = bottomIndex + 1; index < lines.length; index++) {
			lines[index] = frameAutocompleteLine(lines[index] ?? "", frame, width);
		}
		return lines;
	}

	override handleMouse(event: TuiMouseEvent): TuiMouseEventResult | undefined {
		const frame = fitInputFrame(event.width);
		if (!frame) {
			return super.handleMouse(event);
		}
		return super.handleMouse({
			...event,
			x: event.x - contentIndent(frame),
			width: frame.contentWidth,
		});
	}
}
