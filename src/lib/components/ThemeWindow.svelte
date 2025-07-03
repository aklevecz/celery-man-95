<script>
	import { themeManager } from '$lib/theme-manager.svelte.js';

	let themes = themeManager.getThemes();
	let currentTheme = $derived(themeManager.getCurrentTheme());
	let selectedTheme = $state(currentTheme.id);

	function selectTheme(themeId) {
		selectedTheme = themeId;
	}

	function applyTheme() {
		themeManager.setTheme(selectedTheme);
	}

	function previewTheme(themeId) {
		themeManager.setTheme(themeId);
		selectedTheme = themeId;
	}
</script>

<div class="theme-window">
	<div class="theme-tabs">
		<button class="theme-tab active">Themes</button>
		<button class="theme-tab">Appearance</button>
	</div>
	
	<div class="theme-content">
		<div class="theme-preview">
			<div class="preview-window">
				<div class="preview-header">
					<span class="preview-title">Sample Window</span>
					<div class="preview-controls">
						<span class="preview-button">_</span>
						<span class="preview-button">□</span>
						<span class="preview-button">×</span>
					</div>
				</div>
				<div class="preview-body">
					<p>This is how windows will look with the selected theme.</p>
				</div>
			</div>
		</div>
		
		<div class="theme-selector">
			<label for="theme-select">Theme:</label>
			<select id="theme-select" bind:value={selectedTheme} onchange={() => previewTheme(selectedTheme)}>
				{#each themes as theme}
					<option value={theme.id}>{theme.name}</option>
				{/each}
			</select>
		</div>
		
		<div class="theme-actions">
			<button class="theme-apply-btn" onclick={applyTheme}>Apply</button>
			<button class="theme-cancel-btn">Cancel</button>
		</div>
	</div>
</div>

<style>
	.theme-window {
		padding: 0;
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.theme-tabs {
		display: flex;
		background: var(--theme-window);
		border-bottom: 1px solid #808080;
	}

	.theme-tab {
		padding: 4px 12px;
		border: 1px outset var(--theme-button);
		background: var(--theme-button);
		color: var(--theme-buttonText);
		cursor: pointer;
		font-size: 11px;
		font-family: inherit;
		margin-right: 2px;
	}

	.theme-tab.active {
		background: var(--theme-window);
		border-bottom: 1px solid var(--theme-window);
	}

	.theme-content {
		flex: 1;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.theme-preview {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--theme-desktop);
		border: 1px inset var(--theme-windowBorder);
		padding: 20px;
		min-height: 120px;
	}

	.preview-window {
		background: var(--theme-window);
		border: 2px outset var(--theme-windowBorder);
		box-shadow: 2px 2px 4px var(--theme-shadow);
		width: 180px;
		height: 100px;
	}

	.preview-header {
		background: var(--theme-windowHeader);
		color: var(--theme-windowHeaderText);
		padding: 2px 4px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 10px;
		font-weight: bold;
	}

	.preview-controls {
		display: flex;
		gap: 1px;
	}

	.preview-button {
		width: 12px;
		height: 10px;
		border: 1px outset var(--theme-button);
		background: var(--theme-button);
		color: var(--theme-buttonText);
		font-size: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	.preview-body {
		padding: 8px;
		font-size: 9px;
		color: var(--theme-text);
		background: var(--theme-window);
		height: calc(100% - 20px);
		overflow: hidden;
	}

	.theme-selector {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
	}

	.theme-selector select {
		flex: 1;
		padding: 2px;
		border: 1px inset var(--theme-windowBorder);
		background: white;
		color: var(--theme-text);
		font-size: 11px;
		font-family: inherit;
	}

	.theme-actions {
		display: flex;
		gap: 8px;
		justify-content: flex-end;
	}

	.theme-apply-btn,
	.theme-cancel-btn {
		padding: 4px 16px;
		border: 1px outset var(--theme-button);
		background: var(--theme-button);
		color: var(--theme-buttonText);
		cursor: pointer;
		font-size: 11px;
		font-family: inherit;
	}

	.theme-apply-btn:hover,
	.theme-cancel-btn:hover {
		background: #d4d0c8;
	}

	.theme-apply-btn:active,
	.theme-cancel-btn:active {
		border: 1px inset var(--theme-button);
	}
</style>