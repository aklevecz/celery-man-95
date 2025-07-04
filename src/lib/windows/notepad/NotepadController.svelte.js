import { windowManager } from '$lib/window-manager.svelte.js';
import Notepad from '$lib/windows/notepad/Notepad.svelte';

const windowId = 'notepad-window';

function openNotepadWindow() {
	windowManager.createWindow({
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

function NotepadController() {
	windowManager.registerWindowCreator(windowId, openNotepadWindow);
	return { openNotepadWindow };
}

export default NotepadController();