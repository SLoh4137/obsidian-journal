import { App, TFile } from "obsidian";

export async function updateCoordinates(
	app: App,
	file: TFile,
	latitude: number,
	longitude: number
): Promise<void> {
	await app.fileManager.processFrontMatter(file, (fm) => {
		fm.coordinates = `${latitude}, ${longitude}`;
	});
}
