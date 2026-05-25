import {MarkdownView, Notice, Plugin, TFile} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";
import {updateCoordinates} from "./frontmatter";

interface LatLng {
	latitude: number;
	longitude: number;
}

interface ImmichPluginApi {
	getLatLng(hash: string): Promise<LatLng | null>;
}

const IMMICH_PLUGIN_ID = 'obsidian-immich-sync';

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

		this.addCommand({
			id: 'set-coordinates-from-immich-images',
			name: 'Set coordinates from immich images',
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveViewOfType(MarkdownView)?.file;
				if (!file) return false;
				if (!checking) {
					void this.setCoordinatesFromImmich(file);
				}
				return true;
			},
		});

		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	async setCoordinatesFromImmich(file: TFile) {
		const property = this.settings.immichImagesProperty;
		const images: unknown = this.app.metadataCache.getFileCache(file)?.frontmatter?.[property];
		if (!Array.isArray(images) || images.length === 0) {
			new Notice(`No "${property}" frontmatter found`);
			return;
		}
		const immich = (this.app as unknown as {
			plugins?: { plugins?: Record<string, { api?: ImmichPluginApi }> };
		}).plugins?.plugins?.[IMMICH_PLUGIN_ID];
		if (!immich?.api?.getLatLng) {
			new Notice(`Plugin "${IMMICH_PLUGIN_ID}" not found or its API is unavailable`);
			return;
		}
		for (const hash of images) {
			if (typeof hash !== 'string') continue;
			const latLng = await immich.api.getLatLng(hash);
			if (latLng) {
				await updateCoordinates(this.app, file, latLng.latitude, latLng.longitude);
				new Notice('Coordinates updated from immich');
				return;
			}
		}
		new Notice('No coordinates found in immich for any of the images');
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
