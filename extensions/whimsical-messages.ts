export const WHIMSICAL_MESSAGES_BY_CATEGORY = {
	thinking: [
		"Consulting the rubber duck…",
		"Cogitating at maximum throughput…",
		"Untangling the conundrum…",
		"Percolating on the problem…",
		"Mulling over the edge cases…",
		"Following the logic breadcrumbs…",
		"Squinting at the architecture…",
		"Mapping the maze…",
		"Turning the problem over…",
		"Hunting for the missing piece…",
		"Polishing the algorithms…",
		"Reasoning with the memory…",
	],
	read: [
		"Spelunking through the codebase…",
		"Rummaging through files…",
		"Reading the source tea leaves…",
		"Excavating ancient APIs…",
		"Following imports downstream…",
		"Peeking under the hood…",
		"Fossicking for context…",
		"Tracing the call chain…",
		"Browsing the byte forest…",
		"Inspecting the fine print…",
		"Looking for clues in the code…",
		"Touring the module maze…",
	],
	bash: [
		"Asking the shell nicely…",
		"Herding subprocesses…",
		"Giving the terminal a task…",
		"Negotiating with the runtime…",
		"Kicking the tires…",
		"Poking the build system…",
		"Cross-examining the logs…",
		"Sending bits on an errand…",
		"Convincing the CLI to cooperate…",
		"Checking what the machine thinks…",
		"Putting the command line to work…",
		"Shaking loose the diagnostics…",
	],
	edit: [
		"Teaching old code new tricks…",
		"Untangling spaghetti…",
		"Rewiring the logic…",
		"Nudging the implementation…",
		"Adjusting the code furniture…",
		"Massaging the edge cases…",
		"Straightening out the syntax…",
		"Stitching the pieces together…",
		"Giving the function a tune-up…",
		"Taming a wild branch…",
		"Rearranging the brackets…",
		"Applying tasteful code surgery…",
	],
	write: [
		"Scribbling source code…",
		"Rolling out the runtime…",
		"Drafting some fresh logic…",
		"Putting pixels into files…",
		"Committing thoughts to disk…",
		"Laying down the implementation…",
		"Filling in the blanks…",
		"Assembling the moving parts…",
		"Baking in the details…",
		"Giving the file a new chapter…",
		"Planting computational seeds…",
		"Packaging up the good bits…",
	],
	other: [
		"Investigating mysterious machinery…",
		"Giving the tools some attention…",
		"Tinkering with the apparatus…",
		"Following the wires…",
		"Handling the technical bits…",
		"Making the gears turn…",
	],
} as const;

export type WhimsicalMessageCategory = keyof typeof WHIMSICAL_MESSAGES_BY_CATEGORY;

export const WHIMSICAL_MESSAGES = Object.values(WHIMSICAL_MESSAGES_BY_CATEGORY).flat();

export function pickWhimsicalMessage(category: WhimsicalMessageCategory, previous?: string): string {
	const messages = WHIMSICAL_MESSAGES_BY_CATEGORY[category];
	const candidates = previous ? messages.filter((message) => message !== previous) : messages;
	return candidates[Math.floor(Math.random() * candidates.length)]!;
}
