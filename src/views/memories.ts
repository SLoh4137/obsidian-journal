import {
	App,
	BasesEntry,
	BasesView,
	Component,
	Modal,
	QueryController,
	moment,
} from "obsidian";
import type JournalPlugin from "../main";
import { ImmichApi, getImmichApi } from "../immich";
import {
	allImmichHashes,
	openEntry,
	parseEntryDate,
	renderEntryTextBlock,
} from "./shared";

export const MEMORIES_VIEW_TYPE = "journal-memories";

interface Period {
	label: string;
	entry: BasesEntry;
	hashes: string[];
}

export class MemoriesBasesView extends BasesView {
	type = MEMORIES_VIEW_TYPE;

	private periods: Period[] = [];

	constructor(
		controller: QueryController,
		private containerEl: HTMLElement,
		private plugin: JournalPlugin
	) {
		super(controller);
	}

	onDataUpdated(): void {
		const { journalDateProperty, immichImagesProperty } = this.plugin.settings;

		const byDay = new Map<string, BasesEntry>();
		let oldest: moment.Moment | null = null;
		for (const entry of this.data.data) {
			const m = parseEntryDate(this.app, entry, journalDateProperty);
			if (!m) continue;
			byDay.set(m.format("YYYY-MM-DD"), entry);
			if (!oldest || m.isBefore(oldest)) oldest = m.clone();
		}

		this.periods = [];
		if (oldest) {
			const today = moment().startOf("day");
			const candidates: { label: string; date: moment.Moment }[] = [
				{ label: "30 days ago", date: today.clone().subtract(30, "days") },
			];
			let years = 1;
			while (true) {
				const d = today.clone().subtract(years, "years");
				if (d.isBefore(oldest, "day")) break;
				candidates.push({
					label: `${years} ${years === 1 ? "year" : "years"} ago`,
					date: d,
				});
				years++;
			}

			for (const c of candidates) {
				const entry = byDay.get(c.date.format("YYYY-MM-DD"));
				if (!entry) continue;
				this.periods.push({
					label: c.label,
					entry,
					hashes: allImmichHashes(this.app, entry, immichImagesProperty),
				});
			}
		}

		this.render();
	}

	private render() {
		this.containerEl.empty();
		this.containerEl.addClass("journal-memories-view");

		if (this.periods.length === 0) {
			this.containerEl.createDiv({
				cls: "journal-memories-empty",
				text: "No matching entries from past anniversaries.",
			});
			return;
		}

		const carousel = this.containerEl.createDiv({
			cls: "journal-memories-carousel",
		});
		const api = getImmichApi(this.app);
		this.periods.forEach((period, index) => {
			this.renderCard(carousel, period, index, api);
		});
	}

	private renderCard(
		parent: HTMLElement,
		period: Period,
		index: number,
		api: ImmichApi | null
	) {
		const card = parent.createDiv({ cls: "journal-memories-card" });
		card.addEventListener("click", () => {
			new MemoriesModal(this.app, this.plugin, this.periods, index).open();
		});

		const media = card.createDiv({ cls: "journal-memories-card-media" });
		const hash = period.hashes[0];
		if (hash && api) {
			void api.resolveImageSrc(hash).then((src) => {
				if (src) media.style.backgroundImage = `url("${src}")`;
			});
		} else {
			media.addClass("empty");
		}

		card.createDiv({
			cls: "journal-memories-card-caption",
			text: period.label,
		});
	}
}

interface Slide {
	period: Period;
	hash: string | null;
}

class MemoriesModal extends Modal {
	private slides: Slide[] = [];
	private index = 0;
	private stageEl!: HTMLElement;
	private slideComponent = new Component();

	constructor(
		app: App,
		private plugin: JournalPlugin,
		private periods: Period[],
		startPeriod: number
	) {
		super(app);
		let startIndex = 0;
		for (let i = 0; i < periods.length; i++) {
			const period = periods[i];
			if (!period) continue;
			if (i === startPeriod) startIndex = this.slides.length;
			if (period.hashes.length === 0) {
				this.slides.push({ period, hash: null });
			} else {
				for (const hash of period.hashes) {
					this.slides.push({ period, hash });
				}
			}
		}
		this.index = startIndex;
	}

	onOpen() {
		this.modalEl.addClass("journal-memories-modal");
		const { contentEl } = this;
		contentEl.empty();

		this.stageEl = contentEl.createDiv({ cls: "journal-memories-stage" });

		const closeBtn = contentEl.createEl("button", {
			cls: "journal-memories-close",
			text: "×",
			attr: { "aria-label": "Close" },
		});
		closeBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
		closeBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			this.close();
		});

		this.renderSlide();
	}

	onClose() {
		this.slideComponent.unload();
		this.contentEl.empty();
	}

	private renderSlide() {
		this.slideComponent.unload();
		this.slideComponent = new Component();
		this.slideComponent.load();
		this.stageEl.empty();
		const slide = this.slides[this.index];
		if (!slide) {
			this.close();
			return;
		}

		this.stageEl.createDiv({
			cls: "journal-memories-label",
			text: slide.period.label,
		});

		const media = this.stageEl.createDiv({ cls: "journal-memories-media" });
		this.attachGestures(media);

		const prefix = this.plugin.settings.journalPrefixProperty;

		if (slide.hash) {
			const img = media.createEl("img", { cls: "journal-memories-img" });
			const api = getImmichApi(this.app);
			void api?.resolveImageSrc(slide.hash).then((src) => {
				if (src) img.src = src;
			});
		} else {
			media.addClass("text-only");
			const text = media.createDiv({ cls: "journal-memories-text-slide" });
			void renderEntryTextBlock(
				this.app,
				text,
				slide.period.entry.file,
				prefix,
				this.slideComponent
			);
		}

		const openPanel = this.stageEl.createDiv({
			cls: "journal-memories-open-panel",
		});
		openPanel.addEventListener("pointerdown", (e) => e.stopPropagation());
		openPanel.addEventListener("click", (e) => {
			e.stopPropagation();
			void openEntry(this.app, slide.period.entry.file);
			this.close();
		});

		const lines = openPanel.createDiv({ cls: "journal-memories-open-lines" });
		void renderEntryTextBlock(
			this.app,
			lines,
			slide.period.entry.file,
			prefix,
			this.slideComponent
		);
		openPanel.createDiv({
			cls: "journal-memories-open-cta",
			text: "Open note ›",
		});
	}

	private attachGestures(target: HTMLElement) {
		let startX = 0;
		let startY = 0;
		let pointerId: number | null = null;
		const SWIPE = 50;

		target.addEventListener("pointerdown", (e) => {
			pointerId = e.pointerId;
			startX = e.clientX;
			startY = e.clientY;
			target.setPointerCapture(e.pointerId);
		});

		target.addEventListener("pointerup", (e) => {
			if (pointerId !== e.pointerId) return;
			pointerId = null;
			const dx = e.clientX - startX;
			const dy = e.clientY - startY;
			const absX = Math.abs(dx);
			const absY = Math.abs(dy);

			if (absY > SWIPE && -dy > absX) {
				this.close();
				return;
			}
			if (absX > SWIPE) {
				if (dx < 0) this.advance(1);
				else this.advance(-1);
				return;
			}
			this.advance(1);
		});
	}

	private advance(delta: number) {
		const next = this.index + delta;
		if (next < 0) return;
		if (next >= this.slides.length) {
			this.close();
			return;
		}
		this.index = next;
		this.renderSlide();
	}
}
