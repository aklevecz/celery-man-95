<script>
	import { themeManager } from '$lib/theme-manager.svelte.js';
	import { windowManager } from '$lib/window-manager.svelte.js';

	let isOpen = $state(false);
	let themes = themeManager.getThemes();
	let currentTheme = $derived(themeManager.getCurrentTheme());

	function toggleMenu() {
		isOpen = !isOpen;
	}

	function selectTheme(themeId) {
		themeManager.setTheme(themeId);
		isOpen = false;
	}

	function openThemeWindow() {
		import('$lib/components/ThemeWindow.svelte').then((module) => {
			windowManager.createWindow({
				id: 'theme-selector',
				title: 'Display Properties',
				content: { component: module.default, props: {} },
				width: 400,
				height: 300,
				x: 100,
				y: 100
			});
		});
		isOpen = false;
	}
</script>

<div class="theme-switcher">
	<button class="theme-button" onclick={toggleMenu} aria-label="Change theme">
		🎨
	</button>
	
	{#if isOpen}
		<div class="theme-menu">
			<div class="theme-header">Themes</div>
			{#each themes as theme}
				<button 
					class="theme-option" 
					class:active={currentTheme.id === theme.id}
					onclick={() => selectTheme(theme.id)}
				>
					{theme.name}
				</button>
			{/each}
			<hr class="theme-divider" />
			<button class="theme-option" onclick={openThemeWindow}>
				Display Properties...
			</button>
		</div>
	{/if}
</div>

<style>
	.theme-switcher {
		position: fixed;
		top: 10px;
		right: 10px;
		z-index: 10000;
	}

	.theme-button {
		width: 32px;
		height: 32px;
		border: 2px outset var(--theme-button);
		background: var(--theme-button);
		color: var(--theme-buttonText);
		font-size: 16px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
	}

	.theme-button:hover {
		background: #d4d0c8;
	}

	.theme-button:active {
		border: 2px inset var(--theme-button);
	}

	.theme-menu {
		position: absolute;
		top: 100%;
		right: 0;
		background: var(--theme-window);
		border: 2px outset var(--theme-windowBorder);
		box-shadow: 2px 2px 4px var(--theme-shadow);
		min-width: 180px;
		margin-top: 2px;
	}

	.theme-header {
		background: var(--theme-windowHeader);
		color: var(--theme-windowHeaderText);
		padding: 4px 8px;
		font-weight: bold;
		font-size: 11px;
		text-align: center;
	}

	.theme-option {
		display: block;
		width: 100%;
		padding: 6px 12px;
		border: none;
		background: none;
		color: var(--theme-text);
		cursor: pointer;
		text-align: left;
		font-size: 11px;
		font-family: inherit;
	}

	.theme-option:hover {
		background: var(--theme-windowHeader);
		color: var(--theme-windowHeaderText);
	}

	.theme-option.active {
		background: var(--theme-windowHeader);
		color: var(--theme-windowHeaderText);
		font-weight: bold;
	}

	.theme-divider {
		margin: 2px 0;
		border: none;
		border-top: 1px solid #808080;
		border-bottom: 1px solid #ffffff;
	}
</style>