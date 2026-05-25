import {
	App,
	BasesEntry,
	Component,
	MarkdownRenderer,
	TFile,
	moment,
} from "obsidian";

export function readFrontmatter(
	app: App,
	file: TFile
): Record<string, unknown> | undefined {
	return app.metadataCache.getFileCache(file)?.frontmatter as
		| Record<string, unknown>
		| undefined;
}

export function parseEntryDate(
	app: App,
	entry: BasesEntry,
	dateProp: string
): moment.Moment | null {
	const raw = readFrontmatter(app, entry.file)?.[dateProp];
	if (raw == null) return null;
	if (raw instanceof Date) {
		const m = moment(raw);
		return m.isValid() ? m : null;
	}
	if (typeof raw === "string") {
		const m = moment(raw);
		return m.isValid() ? m : null;
	}
	return null;
}

export function allImmichHashes(
	app: App,
	entry: BasesEntry,
	imagesProp: string
): string[] {
	const raw = readFrontmatter(app, entry.file)?.[imagesProp];
	if (!Array.isArray(raw)) return [];
	return raw.filter((h): h is string => typeof h === "string");
}

export function firstImmichHash(
	app: App,
	entry: BasesEntry,
	imagesProp: string
): string | undefined {
	return allImmichHashes(app, entry, imagesProp)[0];
}

function stripFrontmatter(raw: string): string {
	if (!raw.startsWith("---")) return raw;
	const end = raw.indexOf("\n---", 3);
	if (end < 0) return raw;
	const after = raw.indexOf("\n", end + 4);
	return after < 0 ? "" : raw.slice(after + 1);
}

export function entryTitle(file: TFile, prefix: string): string {
	const skip = (prefix?.length ?? 0) + "YYYY-MM-DD".length;
	const trimmed = file.basename.slice(skip).trim();
	return trimmed || file.basename;
}

export async function renderEntryTextBlock(
	app: App,
	parent: HTMLElement,
	file: TFile,
	prefix: string,
	component: Component
): Promise<HTMLElement> {
	const block = parent.createDiv({ cls: "journal-text-block" });

	block.createDiv({
		cls: "journal-text-block-title",
		text: entryTitle(file, prefix),
	});

	const body = block.createDiv({ cls: "journal-text-block-body" });
	const raw = await app.vault.cachedRead(file);
	const stripped = stripFrontmatter(raw).trim();
	if (stripped) {
		const truncated = stripped.split("\n").slice(0, 200).join("\n");
		await MarkdownRenderer.render(
			app,
			truncated,
			body,
			file.path,
			component
		);
	}
	return block;
}

export async function openEntry(app: App, file: TFile): Promise<void> {
	await app.workspace.getLeaf(false).openFile(file);
}
