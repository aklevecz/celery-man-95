<script>
  import { onMount } from 'svelte';

  /** @type {Array<{name: string, path: string, size: number, modified: string, extension: string}>} */
  let files = $state([]);
  /** @type {boolean} */
  let isLoading = $state(true);
  /** @type {string} */
  let error = $state('');
  /** @type {string} */
  let searchTerm = $state('');

  /**
   * Load static files from the API
   */
  async function loadFiles() {
    try {
      isLoading = true;
      error = '';
      
      const response = await fetch('/api/static-files');
      const data = await response.json();
      
      if (data.success) {
        files = data.files;
      } else {
        error = data.error || 'Failed to load files';
      }
    } catch (err) {
      error = 'Failed to fetch files: ' + err.message;
    } finally {
      isLoading = false;
    }
  }

  /**
   * Handle drag start for images
   * @param {DragEvent} event
   * @param {string} imagePath
   */
  function handleDragStart(event, imagePath) {
    if (event.dataTransfer) {
      const fullUrl = window.location.origin + imagePath;
      event.dataTransfer.setData('text/uri-list', fullUrl);
      event.dataTransfer.setData('text/plain', fullUrl);
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  /**
   * Copy image URL to clipboard
   * @param {string} imagePath
   */
  async function copyImageUrl(imagePath) {
    try {
      const fullUrl = window.location.origin + imagePath;
      await navigator.clipboard.writeText(fullUrl);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  }

  /**
   * Format file size in human readable format
   * @param {number} bytes
   * @returns {string}
   */
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Filter files based on search term
   */
  const filteredFiles = $derived(files.filter(file => 
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  ));

  onMount(() => {
    loadFiles();
  });
</script>

<div class="flex flex-col h-full font-sans bg-gray-300 text-black">
  <!-- Header -->
  <div class="p-3 border-b border-gray-500 bg-gray-300">
    <h2 class="m-0 text-xl font-bold text-black">Static Files Browser</h2>
    <p class="mt-1 mb-0 text-sm text-gray-600">Browse and use static image files</p>
  </div>

  <!-- Search and Controls -->
  <div class="p-3 border-b border-gray-500 bg-gray-200">
    <div class="flex gap-2 items-center">
      <input
        type="text"
        placeholder="Search files..."
        class="flex-1 border border-gray-500 p-2 text-sm bg-white text-black"
        bind:value={searchTerm}
      />
      <button
        class="px-3 py-2 border border-gray-400 bg-gray-300 text-black text-sm font-bold cursor-pointer btn-outset hover:bg-gray-400"
        onclick={loadFiles}
      >
        Refresh
      </button>
    </div>
    
    {#if !isLoading}
      <div class="mt-2 text-xs text-gray-600">
        {filteredFiles.length} of {files.length} files
        {#if searchTerm}(filtered by "{searchTerm}"){/if}
      </div>
    {/if}
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-auto p-3">
    {#if isLoading}
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
          <p class="text-sm text-gray-600">Loading files...</p>
        </div>
      </div>
    {:else if error}
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <p class="text-red-600 mb-2">⚠️ {error}</p>
          <button
            class="px-3 py-2 border border-gray-400 bg-gray-300 text-black text-sm font-bold cursor-pointer btn-outset hover:bg-gray-400"
            onclick={loadFiles}
          >
            Try Again
          </button>
        </div>
      </div>
    {:else if filteredFiles.length === 0}
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <p class="text-gray-600 mb-2">
            {searchTerm ? 'No files match your search' : 'No image files found'}
          </p>
          {#if searchTerm}
            <button
              class="px-3 py-2 border border-gray-400 bg-gray-300 text-black text-sm font-bold cursor-pointer btn-outset hover:bg-gray-400"
              onclick={() => searchTerm = ''}
            >
              Clear Search
            </button>
          {/if}
        </div>
      </div>
    {:else}
      <!-- Image Grid -->
      <div class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {#each filteredFiles as file (file.name)}
          <div class="border border-gray-500 bg-white p-2 rounded">
            <!-- Image Preview -->
            <div class="aspect-square bg-gray-100 border border-gray-300 rounded mb-2 overflow-hidden">
              <button
                class="w-full h-full p-0 border-0 bg-transparent cursor-pointer"
                onclick={() => copyImageUrl(file.path)}
                title="Click to copy URL, drag to use as reference"
              >
                <img
                  src={file.path}
                  alt={file.name}
                  class="w-full h-full object-cover hover:opacity-80 transition-opacity"
                  draggable="true"
                  ondragstart={(event) => handleDragStart(event, file.path)}
                />
              </button>
            </div>
            
            <!-- File Info -->
            <div class="text-xs">
              <div class="font-bold text-black mb-1 truncate" title={file.name}>
                {file.name}
              </div>
              <div class="text-gray-600 space-y-1">
                <div>{formatFileSize(file.size)}</div>
                <div>{file.extension.toUpperCase()}</div>
              </div>
            </div>
            
            <!-- Actions -->
            <div class="flex gap-1 mt-2">
              <button
                class="flex-1 px-2 py-1 text-xs border border-gray-400 bg-gray-300 text-black cursor-pointer btn-outset hover:bg-gray-400"
                onclick={() => copyImageUrl(file.path)}
                title="Copy URL"
              >
                Copy URL
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Help Text -->
  <div class="p-2 border-t border-gray-500 bg-gray-200">
    <p class="text-xs text-gray-600 text-center">
      💡 Click images to copy URL • Drag images to Fluxor as reference • Search to filter files
    </p>
  </div>
</div>