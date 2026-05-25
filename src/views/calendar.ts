import { BasesView, QueryController } from "obsidian";
import type JournalPlugin from "../main";

export const CALENDAR_VIEW_TYPE = "journal-calendar";

export class CalendarBasesView extends BasesView {
	type = CALENDAR_VIEW_TYPE;

	constructor(
		controller: QueryController,
		private containerEl: HTMLElement,
		private plugin: JournalPlugin
	) {
		super(controller);
	}

	onDataUpdated(): void {
		this.containerEl.empty();
		this.containerEl.addClass("journal-calendar-view");
		this.containerEl.createEl("p", { text: "Calendar view (coming soon)" });
	}
}
