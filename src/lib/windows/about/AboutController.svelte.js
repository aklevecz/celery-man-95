import { windowManager } from '$lib/window-manager.svelte.js';

export function openAboutWindow() {
	const windowId = 'about-window';
	
	windowManager.registerWindowCreator(windowId, openAboutWindow);
	
	return windowManager.createWindow({
		id: windowId,
		title: 'About Windows',
		content: `
			<div style="padding: 20px; font-family: 'MS Sans Serif', sans-serif;">
				<h2 style="margin-top: 0; color: #000080;">About This Application</h2>
				<p>This is a Windows 95-style desktop environment built with SvelteKit.</p>
				<hr>
				<h3>Features:</h3>
				<ul>
					<li>Draggable windows</li>
					<li>Resizable windows</li>
					<li>Minimize/Maximize/Close controls</li>
					<li>Window persistence across page reloads</li>
					<li>Taskbar integration</li>
					<li>Multiple window support</li>
				</ul>
				<hr>
				<p><strong>Built with:</strong> SvelteKit, Tailwind CSS</p>
				<p><strong>Inspired by:</strong> Windows 95 UI</p>
			</div>
		`,
		width: 400,
		height: 350,
		x: 300,
		y: 150
	});
}