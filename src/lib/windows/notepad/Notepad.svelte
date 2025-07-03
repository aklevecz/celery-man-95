<script>
	let content = '';
	
	// Simple notepad functionality
	function clearContent() {
		content = '';
	}
	
	function saveToLocalStorage() {
		localStorage.setItem('notepad-content', content);
		alert('Content saved to local storage!');
	}
	
	function loadFromLocalStorage() {
		const saved = localStorage.getItem('notepad-content');
		if (saved) {
			content = saved;
		}
	}
</script>

<div class="notepad">
	<div class="notepad-toolbar">
		<button class="btn" on:click={clearContent}>Clear</button>
		<button class="btn" on:click={saveToLocalStorage}>Save</button>
		<button class="btn" on:click={loadFromLocalStorage}>Load</button>
	</div>
	<textarea 
		bind:value={content}
		placeholder="Start typing your notes here..."
		class="notepad-textarea"
	></textarea>
</div>

<style>
	.notepad {
		display: flex;
		flex-direction: column;
		height: 100%;
		font-family: 'MS Sans Serif', 'Microsoft Sans Serif', 'Tahoma', sans-serif;
	}
	
	.notepad-toolbar {
		display: flex;
		gap: 4px;
		padding: 4px;
		border-bottom: 1px solid #808080;
		background-color: var(--theme-window);
	}
	
	.btn {
		padding: 4px 8px;
		border: 1px outset var(--theme-button);
		background-color: var(--theme-button);
		color: var(--theme-buttonText);
		font-size: 11px;
		cursor: pointer;
		font-family: inherit;
	}
	
	.btn:active {
		border: 1px inset var(--theme-button);
	}
	
	.notepad-textarea {
		flex: 1;
		border: none;
		outline: none;
		padding: 8px;
		font-family: 'MS Sans Serif', 'Microsoft Sans Serif', 'Tahoma', sans-serif;
		font-size: 11px;
		resize: none;
		background-color: white;
		line-height: 1.2;
	}
</style>