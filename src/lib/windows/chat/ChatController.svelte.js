import { windowManager } from '$lib/window-manager.svelte.js';
import Chat from './Chat.svelte';

const windowId = 'chat-window';

function openChatWindow() {
	windowManager.createWindow({
		id: windowId,
		title: 'Chat - AI Agent',
		content: {
			component: Chat,
			props: {}
		},
		width: 500,
		height: 600,
		x: 200,
		y: 100
	});
}

function ChatController() {
	windowManager.registerWindowCreator(windowId, openChatWindow);
	return { openChatWindow };
}

export default ChatController();