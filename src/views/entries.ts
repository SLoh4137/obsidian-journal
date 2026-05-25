import { BasesView, QueryController } from "obsidian";
import type JournalPlugin from "../main";

export const ENTRIES_VIEW_TYPE = "journal-entries";

export class EntriesBasesView extends BasesView {
	type = ENTRIES_VIEW_TYPE;

	constructor(
		controller: QueryController,
		private containerEl: HTMLElement,
		private plugin: JournalPlugin
	) {
		super(controller);
	}

	onDataUpdated(): void {
		this.containerEl.empty();
		this.containerEl.addClass("journal-entries-view");
		this.containerEl.createEl("p", { text: "Entries view (coming soon)" });
	}
}
