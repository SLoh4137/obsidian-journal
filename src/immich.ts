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
	const api = (
		app as unknown as {
			plugins?: {
				plugins?: Record<string, { api?: ImmichApi }>;
			};
		}
	).plugins?.plugins?.[IMMICH_PLUGIN_ID]?.api;
	return api ?? null;
}
