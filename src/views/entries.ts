import { BasesEntry, BasesView, QueryController } from "obsidian";
import type JournalPlugin from "../main";
import { getImmichApi } from "../immich";
import {
	firstImmichHash,
	getBodyLines,
	openEntry,
	parseEntryDate,
} from "./shared";

export const ENTRIES_VIEW_TYPE = "journal-entries";

const PAGE_SIZE = 7;

export class EntriesBasesView extends BasesView {
	type = ENTRIES_VIEW_TYPE;

	private listEl: HTMLElement | null = null;
	private sentinelEl: HTMLElement | null = null;
	private observer: IntersectionObserver | null = null;
	private sorted: BasesEntry[] = [];
	private rendered = 0;

	constructor(
		controller: QueryController,
		private containerEl: HTMLElement,
		private plugin: JournalPlugin
	) {
		super(controller);
	}

	onunload() {
		this.observer?.disconnect();
		this.observer = null;
		super.onunload();
	}

	onDataUpdated(): void {
		const dateProp = this.plugin.settings.journalDateProperty;
		const entries = this.data.data.slice();
		entries.sort((a, b) => {
			const ad = parseEntryDate(this.app, a, dateProp);
			const bd = parseEntryDate(this.app, b, dateProp);
			if (!ad && !bd) return 0;
			if (!ad) return 1;
			if (!bd) return -1;
			return bd.valueOf() - ad.valueOf();
		});
		this.sorted = entries;
		this.rendered = 0;

		this.containerEl.empty();
		this.containerEl.addClass("journal-entries-view");
		this.listEl = this.containerEl.createDiv({ cls: "journal-entries-list" });
		this.sentinelEl = this.containerEl.createDiv({
			cls: "journal-entries-sentinel",
		});

		this.observer?.disconnect();
		this.observer = new IntersectionObserver((entries) => {
			for (const e of entries) {
				if (e.isIntersecting) this.renderNextPage();
			}
		});
		this.observer.observe(this.sentinelEl);

		this.renderNextPage();
	}

	private renderNextPage() {
		if (!this.listEl || !this.sentinelEl) return;
		const end = Math.min(this.rendered + PAGE_SIZE, this.sorted.length);
		for (let i = this.rendered; i < end; i++) {
			const entry = this.sorted[i];
			if (entry) this.renderCard(entry, this.listEl);
		}
		this.rendered = end;
		if (this.rendered >= this.sorted.length) {
			this.observer?.disconnect();
			this.observer = null;
			this.sentinelEl.remove();
			this.sentinelEl = null;
		}
	}

	private renderCard(entry: BasesEntry, parent: HTMLElement) {
		const { journalDateProperty, immichImagesProperty } = this.plugin.settings;
		const date = parseEntryDate(this.app, entry, journalDateProperty);
		const hash = firstImmichHash(this.app, entry, immichImagesProperty);

		const card = parent.createDiv({ cls: "journal-entry-card" });
		card.addEventListener("click", () => {
			void openEntry(this.app, entry.file);
		});

		const header = card.createDiv({ cls: "journal-entry-card-header" });
		header.setText(
			date
				? date.format("MMM D, YYYY [|] dddd")
				: entry.file.basename
		);

		const body = card.createDiv({ cls: "journal-entry-card-body" });
		if (!hash) body.addClass("no-image");

		const textEl = body.createDiv({ cls: "journal-entry-card-text" });
		void getBodyLines(this.app, entry.file, 2).then((lines) => {
			textEl.empty();
			for (const line of lines) {
				textEl.createDiv({ cls: "journal-entry-card-line", text: line });
			}
		});

		if (hash) {
			const thumb = body.createDiv({ cls: "journal-entry-card-thumb" });
			const api = getImmichApi(this.app);
			void api?.resolveImageSrc(hash).then((src) => {
				if (src) thumb.style.backgroundImage = `url("${src}")`;
			});
		}
	}
}
