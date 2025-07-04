import { windowManager } from '$lib/window-manager.svelte.js';
import Fluxor from './Fluxor.svelte';

const windowId = 'fluxor-window';

function openFluxorWindow() {
	windowManager.createWindow({
		id: windowId,
		title: 'Fluxor - AI Image Generator',
		content: {
			component: Fluxor,
			props: {}
		},
		width: 500,
		height: 600,
		x: 150,
		y: 50
	});
}

function FluxorController() {
	windowManager.registerWindowCreator(windowId, openFluxorWindow);
	return { openFluxorWindow };
}

export default FluxorController();