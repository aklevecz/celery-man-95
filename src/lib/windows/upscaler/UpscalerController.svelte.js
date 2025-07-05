import { windowManager } from '$lib/window-manager.svelte.js';
import Upscaler from './Upscaler.svelte';

const windowId = 'upscaler-window';

function openUpscalerWindow() {
	windowManager.createWindow({
		id: windowId,
		title: 'Image Upscaler - AI Enhancement',
		content: {
			component: Upscaler,
			props: {}
		},
		width: 800,
		height: 600,
		x: 200,
		y: 100
	});
}

function UpscalerController() {
	windowManager.registerWindowCreator(windowId, openUpscalerWindow);
	return { openUpscalerWindow };
}

export default UpscalerController();