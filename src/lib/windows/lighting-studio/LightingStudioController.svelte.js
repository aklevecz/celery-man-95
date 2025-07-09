import { windowManager } from '$lib/window-manager.svelte.js';
import LightingStudio from './LightingStudio.svelte';

const windowId = 'lighting-studio-window';

function openLightingStudioWindow() {
	windowManager.createWindow({
		id: windowId,
		title: 'Lighting Studio',
		content: {
			component: LightingStudio,
			props: {}
		},
		width: 900,
		height: 700,
		x: 100,
		y: 100
	});
}

function LightingStudioController() {
	windowManager.registerWindowCreator(windowId, openLightingStudioWindow);
	return { openLightingStudioWindow };
}

export default LightingStudioController();