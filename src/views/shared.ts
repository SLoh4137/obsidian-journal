import { App, BasesEntry, TFile, moment } from "obsidian";

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

const bodyLineCache = new Map<
	string,
	{ mtime: number; lines: string[] }
>();

export async function getBodyLines(
	app: App,
	file: TFile,
	n: number
): Promise<string[]> {
	const cached = bodyLineCache.get(file.path);
	if (cached && cached.mtime === file.stat.mtime) {
		return cached.lines.slice(0, n);
	}
	const raw = await app.vault.cachedRead(file);
	const body = stripFrontmatter(raw);
	const lines = body
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l.length > 0);
	bodyLineCache.set(file.path, { mtime: file.stat.mtime, lines });
	return lines.slice(0, n);
}

function stripFrontmatter(raw: string): string {
	if (!raw.startsWith("---")) return raw;
	const end = raw.indexOf("\n---", 3);
	if (end < 0) return raw;
	const after = raw.indexOf("\n", end + 4);
	return after < 0 ? "" : raw.slice(after + 1);
}

export async function openEntry(app: App, file: TFile): Promise<void> {
	await app.workspace.getLeaf(false).openFile(file);
}
