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

export function getImmichApi(app: App): ImmichApi | null {
	// @ts-ignore
	return app?.plugins.getPlugin(IMMICH_PLUGIN_ID)?.api;
}
