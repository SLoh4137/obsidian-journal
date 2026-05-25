import {
	AbstractInputSuggest,
	App,
	PluginSettingTab,
	Setting,
	TFolder,
} from "obsidian";
import JournalPlugin from "./main";

class FolderSuggest extends AbstractInputSuggest<TFolder> {
	constructor(
		app: App,
		private inputEl: HTMLInputElement,
		private onSelectFolder: (path: string) => void
	) {
		super(app, inputEl);
	}

	protected getSuggestions(query: string): TFolder[] {
		const lowerQuery = query.toLowerCase();
		return this.app.vault
			.getAllFolders(true)
			.filter((folder) => folder.path.toLowerCase().includes(lowerQuery));
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.path === "/" ? "/" : folder.path);
	}

	selectSuggestion(folder: TFolder): void {
		const value = folder.path === "/" ? "" : folder.path;
		this.inputEl.value = value;
		this.inputEl.trigger("input");
		this.onSelectFolder(value);
		this.close();
	}
}

export interface JournalPluginSettings {
	immichImagesProperty: string;
	journalEntriesFolder: string;
}

export const DEFAULT_SETTINGS: JournalPluginSettings = {
	immichImagesProperty: "immichImages",
	journalEntriesFolder: "",
};

export class JournalSettingTab extends PluginSettingTab {
	plugin: JournalPlugin;

	constructor(app: App, plugin: JournalPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Journal entries folder")
			.setDesc(
				"Vault-relative folder containing journal entries. Listeners and journal commands only act on files in this folder. Leave empty to act on all files."
			)
			.addText((text) => {
				text.setPlaceholder("Journal")
					.setValue(this.plugin.settings.journalEntriesFolder)
					.onChange(async (value) => {
						this.plugin.settings.journalEntriesFolder = value;
						await this.plugin.saveSettings();
					});
				new FolderSuggest(this.app, text.inputEl, async (value) => {
					this.plugin.settings.journalEntriesFolder = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Immich images property")
			.setDesc(
				"Frontmatter property name that holds the list of Immich asset hashes to look up coordinates for."
			)
			.addText((text) =>
				text
					.setPlaceholder("immichImages")
					.setValue(this.plugin.settings.immichImagesProperty)
					.onChange(async (value) => {
						this.plugin.settings.immichImagesProperty = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
