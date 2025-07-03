<script>
	import { windowManager } from '$lib/window-manager.svelte.js';
</script>

<div class="taskbar">
	<button class="start-button">
		<span class="start-logo">🪟</span>
		Start
	</button>

	<div class="taskbar-buttons">
		{#each windowManager.windows as window (window.id)}
			<button
				class="taskbar-button"
				class:active={windowManager.activeWindowId === window.id}
				onclick={() => windowManager.focusWindow(window.id)}
			>
				{window.title}
			</button>
		{/each}
	</div>

	<div class="system-tray">
		<span class="time"
			>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span
		>
	</div>
</div>

<style>
	.taskbar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: 28px;
		background: var(--theme-taskbar);
		border-top: 1px solid #dfdfdf;
		display: flex;
		align-items: center;
		padding: 2px;
		box-shadow: 0 -1px 3px var(--theme-shadow);
		color: var(--theme-taskbarText);
	}

	.start-button {
		height: 24px;
		padding: 0 8px;
		border: 1px outset var(--theme-button);
		background: var(--theme-button);
		color: var(--theme-buttonText);
		font-size: 11px;
		font-weight: bold;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.start-button:active {
		border: 1px inset var(--theme-button);
	}

	.start-logo {
		font-size: 14px;
	}

	.taskbar-buttons {
		flex: 1;
		display: flex;
		gap: 2px;
		margin-left: 4px;
	}

	.taskbar-button {
		height: 22px;
		padding: 0 8px;
		border: 1px outset var(--theme-button);
		background: var(--theme-button);
		color: var(--theme-buttonText);
		font-size: 11px;
		cursor: pointer;
		max-width: 150px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.taskbar-button.active {
		border: 1px inset var(--theme-button);
		background: #a0a0a0;
	}

	.taskbar-button:hover:not(.active) {
		background: #d4d0c8;
	}

	.system-tray {
		height: 24px;
		padding: 0 8px;
		border: 1px inset var(--theme-button);
		background: var(--theme-button);
		color: var(--theme-buttonText);
		display: flex;
		align-items: center;
		font-size: 11px;
		min-width: 60px;
	}

	.time {
		font-family: 'MS Sans Serif', 'Microsoft Sans Serif', 'Tahoma', sans-serif;
		font-weight: normal;
	}
</style>
