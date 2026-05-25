import { App } from "obsidian";

export interface LatLng {
	latitude: number;
	longitude: number;
}

export interface ImmichApi {
	getLatLng(hash: string): Promise<LatLng | null>;
	resolveImageSrc(hash: string): Promise<string | null>;
}

export const IMMICH_PLUGIN_ID = "obsidian-immich-sync";

interface AppWithPlugins {
	plugins: {
		getPlugin(id: string): { api?: ImmichApi } | null;
	};
}

export function getImmichApi(app: App): ImmichApi | null {
	const plugin = (app as unknown as AppWithPlugins).plugins.getPlugin(
		IMMICH_PLUGIN_ID
	);
	return plugin?.api ?? null;
}
