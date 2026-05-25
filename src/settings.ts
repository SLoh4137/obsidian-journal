import {App, PluginSettingTab, Setting} from "obsidian";
import MyPlugin from "./main";

export interface MyPluginSettings {
	immichImagesProperty: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	immichImagesProperty: 'immichImages'
}

export class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Immich images property')
			.setDesc('Frontmatter property name that holds the list of Immich asset hashes to look up coordinates for.')
			.addText(text => text
				.setPlaceholder('immichImages')
				.setValue(this.plugin.settings.immichImagesProperty)
				.onChange(async (value) => {
					this.plugin.settings.immichImagesProperty = value;
					await this.plugin.saveSettings();
				}));
	}
}
