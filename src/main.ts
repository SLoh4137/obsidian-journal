import {MarkdownView, Notice, Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";
import {updateCoordinates} from "./frontmatter";

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'set-coordinates-from-device-gps',
			name: 'Set coordinates from device GPS',
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveViewOfType(MarkdownView)?.file;
				if (!file) return false;
				if (!checking) {
					if (!navigator.geolocation) {
						new Notice('Geolocation is not supported on this device');
						return;
					}
					navigator.geolocation.getCurrentPosition(
						async (pos) => {
							await updateCoordinates(this.app, file, pos.coords.latitude, pos.coords.longitude);
							new Notice('Coordinates updated from device GPS');
						},
						(err) => {
							new Notice(`Could not get device location: ${err.message}`);
						},
					);
				}
				return true;
			},
		});

		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MyPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
