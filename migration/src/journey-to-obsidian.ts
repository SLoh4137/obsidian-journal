import { promises as fs } from "node:fs";
import * as path from "node:path";
import { DateTime } from "luxon";
import TurndownService from "turndown";
import exifr from "exifr";
import { init, searchAssets } from "@immich/sdk";

type JourneyJson = {
	date_journal: number;
	date_modified: number;
	timezone: string;
	text: string;
	mood?: number;
	sentiment?: number;
	lat?: number;
	lon?: number;
	favourite?: boolean;
	photos?: string[];
};

const SENTIMENT_MAP: Record<string, number> = {
	"0.25": -3,
	"0.75": -2,
	"1": -1,
	"0": 0,
	"1.25": 1,
	"1.75": 2,
	"2": 3,
};

function parseTimestampFieldWithTimezone(
	json: JourneyJson,
	jsonField: keyof JourneyJson,
	format: string
): string {
	const ms = json[jsonField] as number;
	return DateTime.fromMillis(ms, { zone: json.timezone }).toFormat(format);
}

function mapSentiment(json: JourneyJson): number {
	const value = Math.max(json.mood ?? 0, json.sentiment ?? 0);
	return SENTIMENT_MAP[String(value)] ?? 0;
}

type RawExif = {
	DateTimeOriginal?: string;
	OffsetTimeOriginal?: string;
	OffsetTime?: string;
};

async function findImmichChecksum(filePath: string): Promise<string | null> {
	const exif = (await exifr.parse(filePath, {
		pick: ["DateTimeOriginal", "OffsetTimeOriginal", "OffsetTime"],
		reviveValues: false,
	})) as RawExif | undefined;

	if (!exif?.DateTimeOriginal) {
		console.warn(`  no DateTimeOriginal in ${path.basename(filePath)}`);
		return null;
	}

	const zone = exif.OffsetTimeOriginal ?? exif.OffsetTime;
	if (!zone) {
		console.warn(
			`  no OffsetTimeOriginal in ${path.basename(
				filePath
			)} — cannot compute UTC`
		);
		return null;
	}

	const exifTime = DateTime.fromFormat(
		exif.DateTimeOriginal,
		"yyyy:LL:dd HH:mm:ss",
		{ zone: `UTC${zone}` }
	);
	if (!exifTime.isValid) {
		console.warn(
			`  invalid DateTimeOriginal in ${path.basename(filePath)}: ${
				exif.DateTimeOriginal
			} (${zone})`
		);
		return null;
	}

	const takenAfter = exifTime.minus({ minutes: 1 }).toUTC().toISO();
	const takenBefore = exifTime.plus({ minutes: 1 }).toUTC().toISO();
	if (!takenAfter || !takenBefore) return null;

	const result = await searchAssets({
		metadataSearchDto: {
			takenAfter,
			takenBefore,
			size: 50,
			withExif: true,
		},
	});

	const items = result.assets.items;
	if (items.length === 0) {
		console.warn(
			`  no Immich match for ${path.basename(
				filePath
			)} @ ${exifTime.toISO()}`
		);
		return null;
	}
	if (items.length > 1) {
		console.warn(
			`  ${items.length} Immich matches for ${path.basename(
				filePath
			)} @ ${exifTime.toISO()} — using first`
		);
	}
	return items[0]?.checksum ?? null;
}

function emitYamlList(items: string[], indent = "    "): string {
	if (items.length === 0) return "";
	return items.map((item) => `\n${indent}- ${item}`).join("");
}

function buildFrontmatter(json: JourneyJson, immichImages: string[]): string {
	const journalDate = parseTimestampFieldWithTimezone(
		json,
		"date_journal",
		"yyyy-LL-dd"
	);
	const journalTime = parseTimestampFieldWithTimezone(
		json,
		"date_journal",
		"yyyy-LL-dd'T'HH:mm:ss"
	);
	const modifiedStr = parseTimestampFieldWithTimezone(
		json,
		"date_modified",
		"yyyy-LL-dd'T'HH:mm:ss"
	);

	const lines: string[] = [];
	lines.push(`journalDate: ${journalDate}`);
	lines.push(`journalTime: ${journalTime}`);
	lines.push(`createdTime: ${modifiedStr}`);
	lines.push(`modifiedTime: ${modifiedStr}`);
	lines.push(`timeZone: ${json.timezone}`);
	lines.push(`coordinates: ${json.lat ?? ""}, ${json.lon ?? ""}`);
	lines.push(`sentiment: ${mapSentiment(json)}`);
	lines.push(`isFavorite: ${json.favourite ?? false}`);
	lines.push(`immichImages:${emitYamlList(immichImages)}`);
	lines.push(`tags:\n    - "#journal"`);
	lines.push(`cssclasses:\n    - journal`);
	return lines.join("\n");
}

async function resolveOutputPath(
	outputDir: string,
	baseName: string
): Promise<string> {
	let candidate = path.join(outputDir, `${baseName}.md`);
	let counter = 1;
	while (await fileExists(candidate)) {
		candidate = path.join(outputDir, `${baseName} ${counter}.md`);
		counter += 1;
	}
	return candidate;
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function convertEntry(
	jsonPath: string,
	inputDir: string,
	outputDir: string,
	turndown: TurndownService
): Promise<void> {
	const raw = await fs.readFile(jsonPath, "utf8");
	const json: JourneyJson = JSON.parse(raw);

	const photos = json.photos ?? [];
	const immichImages: string[] = [];
	for (const filename of photos) {
		const checksum = await findImmichChecksum(
			path.join(inputDir, filename)
		);
		if (checksum) immichImages.push(checksum);
	}

	const baseName = parseTimestampFieldWithTimezone(
		json,
		"date_journal",
		"yyyy-LL-dd"
	);
	const outputPath = await resolveOutputPath(outputDir, baseName);

	const frontmatter = buildFrontmatter(json, immichImages);
	const body = turndown.turndown(json.text ?? "");
	const contents = `---\n${frontmatter}\n---\n\n${body}\n`;

	await fs.writeFile(outputPath, contents, "utf8");
	console.log(`${path.basename(jsonPath)} -> ${path.basename(outputPath)}`);
}

async function main(): Promise<void> {
	const [inputDir, outputDir] = process.argv.slice(2);
	if (!inputDir || !outputDir) {
		console.error(
			"Usage: tsx src/journey-to-obsidian.ts <input-dir> <output-dir>"
		);
		process.exit(1);
	}

	const baseUrl = process.env.IMMICH_SERVER_URL;
	const apiKey = process.env.IMMICH_API_KEY;
	if (!baseUrl || !apiKey) {
		console.error("IMMICH_SERVER_URL and IMMICH_API_KEY must be set");
		process.exit(1);
	}
	try {
		init({ baseUrl, apiKey });
	} catch (err) {
		console.error("Failed to initialize Immich SDK:", err);
		process.exit(1);
	}

	await fs.mkdir(outputDir, { recursive: true });
	const entries = await fs.readdir(inputDir);
	const jsonFiles = entries.filter((name) => name.endsWith(".json")).sort();

	const turndown = new TurndownService({ headingStyle: "atx" });

	for (const filename of jsonFiles) {
		await convertEntry(
			path.join(inputDir, filename),
			inputDir,
			outputDir,
			turndown
		);
	}

	console.log(`Converted ${jsonFiles.length} entries -> ${outputDir}`);
}

void main();
