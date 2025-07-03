import { windowManager } from '$lib/window-manager.svelte.js';
import Notepad from '$lib/windows/notepad/Notepad.svelte';

export function openNotepadWindow() {
	const windowId = 'notepad-window';
	
	windowManager.registerWindowCreator(windowId, openNotepadWindow);
	
	return windowManager.createWindow({
		id: windowId,
		title: 'Notepad',
		content: {
			component: Notepad,
			props: {}
		},
		width: 500,
		height: 400,
		x: 250,
		y: 200
	});
}