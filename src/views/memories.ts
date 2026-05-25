import { BasesView, QueryController } from "obsidian";
import type JournalPlugin from "../main";

export const MEMORIES_VIEW_TYPE = "journal-memories";

export class MemoriesBasesView extends BasesView {
	type = MEMORIES_VIEW_TYPE;

	constructor(
		controller: QueryController,
		private containerEl: HTMLElement,
		private plugin: JournalPlugin
	) {
		super(controller);
	}

	onDataUpdated(): void {
		this.containerEl.empty();
		this.containerEl.addClass("journal-memories-view");
		this.containerEl.createEl("p", { text: "Memories view (coming soon)" });
	}
}
