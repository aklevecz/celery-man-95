<script>
  import { onMount } from 'svelte';
  import { geminiApi } from '$lib/gemini-api.svelte.js';
  import { promptManager } from '$lib/prompt-manager.svelte.js';

  /** @type {string} */
  let searchTerm = $state('');
  /** @type {string} */
  let scenePremise = $state('');
  /** @type {'detailed' | 'artistic' | 'realistic' | 'cinematic'} */
  let promptStyle = $state('detailed');
  /** @type {string} */
  let generatedPrompt = $state('');
  /** @type {boolean} */
  let isGenerating = $state(false);
  /** @type {string} */
  let error = $state('');
  /** @type {'all' | 'favorites' | 'rated' | 'style'} */
  let filterType = $state('all');
  /** @type {number} */
  let minRating = $state(4);
  /** @type {string} */
  let styleFilter = $state('detailed');

  /**
   * Get filtered prompts - simple derived
   */
  const filteredPrompts = $derived(
    (() => {
      let result = promptManager.prompts;

      // Apply search filter
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        result = result.filter(p => 
          p.prompt.toLowerCase().includes(searchLower) ||
          p.scenePremise.toLowerCase().includes(searchLower)
        );
      }

      // Apply additional filters
      if (filterType === 'favorites') {
        result = result.filter(p => p.isFavorite);
      } else if (filterType === 'rated') {
        result = result.filter(p => p.rating >= minRating);
      } else if (filterType === 'style') {
        result = result.filter(p => p.style === styleFilter);
      }

      // Sort by saved date (newest first)
      return [...result].sort((a, b) => b.savedAt - a.savedAt);
    })()
  );

  /**
   * Generate a new prompt
   */
  async function generatePrompt() {
    if (!scenePremise.trim()) {
      error = 'Please enter a scene premise';
      return;
    }

    try {
      isGenerating = true;
      error = '';
      
      const prompt = await geminiApi.generatePrompt({
        scenePremise,
        style: promptStyle
      });
      
      generatedPrompt = prompt;
    } catch (err) {
      error = err.message || 'Failed to generate prompt';
    } finally {
      isGenerating = false;
    }
  }

  /**
   * Save the generated prompt
   * @param {number} rating - Initial rating (1-5)
   */
  function saveGeneratedPrompt(rating) {
    if (!generatedPrompt.trim()) return;

    const prompt = {
      prompt: generatedPrompt,
      scenePremise,
      style: promptStyle,
      rating,
      isFavorite: rating >= 4 // Auto-favorite high-rated prompts
    };

    if (promptManager.addPrompt(prompt)) {
      generatedPrompt = '';
      scenePremise = '';
    } else {
      error = 'Failed to save prompt';
    }
  }

  /**
   * Delete a saved prompt
   * @param {string} id
   */
  function deletePromptById(id) {
    if (confirm('Are you sure you want to delete this prompt?')) {
      if (!promptManager.deletePrompt(id)) {
        error = 'Failed to delete prompt';
      }
    }
  }

  /**
   * Update prompt rating
   * @param {string} id
   * @param {number} rating
   */
  function updateRating(id, rating) {
    promptManager.updateRating(id, rating);
  }

  /**
   * Toggle favorite status
   * @param {string} id
   */
  function toggleFavorite(id) {
    promptManager.toggleFavorite(id);
  }

  /**
   * Copy prompt to clipboard and record usage
   * @param {Object} prompt
   */
  async function copyPrompt(prompt) {
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      promptManager.recordUsage(prompt.id);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  }

  /**
   * Export selected prompts
   * @param {string[]} [ids] - Optional prompt IDs to export
   */
  function exportSelectedPrompts(ids) {
    const jsonString = promptManager.exportPrompts(ids);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompts_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Get style options for dropdown
   */
  const styleOptions = [
    { id: 'detailed', label: 'Detailed', description: 'Highly descriptive with specific visual elements' },
    { id: 'artistic', label: 'Artistic', description: 'Creative expression and unique artistic techniques' },
    { id: 'realistic', label: 'Realistic', description: 'Photorealistic with natural lighting and proportions' },
    { id: 'cinematic', label: 'Cinematic', description: 'Movie-like atmosphere with dramatic composition' }
  ];

  /**
   * Format timestamp
   * @param {number} timestamp
   * @returns {string}
   */
  function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();
  }

  /**
   * Get star rating display
   * @param {number} rating
   * @returns {string}
   */
  function getStars(rating) {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }
</script>

<div class="flex flex-col h-full font-sans bg-gray-300 text-black">
  <!-- Header -->
  <div class="p-3 border-b border-gray-500 bg-gray-300">
    <h2 class="m-0 text-xl font-bold text-black">Prompt Generator</h2>
    <p class="mt-1 mb-0 text-sm text-gray-600">Generate and organize AI prompts for image generation</p>
  </div>

  <!-- Main Content -->
  <div class="flex flex-1 min-h-0">
    <!-- Left Panel: Generator -->
    <div class="w-1/2 border-r border-gray-500 bg-gray-200 flex flex-col">
      <!-- Generator Controls -->
      <div class="p-4 border-b border-gray-500">
        <h3 class="text-lg font-bold mb-3">Generate New Prompt</h3>
        
        <div class="mb-3">
          <label class="block text-sm font-bold mb-1">Scene Premise:</label>
          <textarea
            class="w-full border border-gray-500 p-2 text-sm bg-white text-black"
            bind:value={scenePremise}
            placeholder="e.g., A warrior in a mystical forest, A futuristic cityscape, A serene mountain lake"
            rows="3"
          ></textarea>
        </div>

        <div class="mb-3">
          <label class="block text-sm font-bold mb-1">Style:</label>
          <select 
            class="w-full border border-gray-500 p-2 text-sm bg-white text-black"
            bind:value={promptStyle}
          >
            {#each styleOptions as style}
              <option value={style.id}>{style.label} - {style.description}</option>
            {/each}
          </select>
        </div>

        <button
          class="w-full px-4 py-2 border border-gray-400 bg-blue-300 text-black cursor-pointer btn-outset hover:bg-blue-400 disabled:opacity-50"
          onclick={generatePrompt}
          disabled={isGenerating || !scenePremise.trim() || !geminiApi.isAvailable()}
        >
          {isGenerating ? 'Generating...' : 'Generate Prompt'}
        </button>

        {#if !geminiApi.isAvailable()}
          <p class="text-xs text-red-600 mt-2">Gemini API key not configured</p>
        {/if}
      </div>

      <!-- Generated Prompt -->
      {#if generatedPrompt}
        <div class="p-4 border-b border-gray-500 bg-blue-50">
          <h4 class="font-bold mb-2">Generated Prompt:</h4>
          <div class="bg-white border border-gray-500 p-3 mb-3 text-sm">
            {generatedPrompt}
          </div>
          
          <div class="flex gap-2">
            <button
              class="px-3 py-1 text-sm border border-gray-400 bg-green-300 text-black cursor-pointer btn-outset hover:bg-green-400"
              onclick={() => saveGeneratedPrompt(5)}
            >
              ★★★★★ Save
            </button>
            <button
              class="px-3 py-1 text-sm border border-gray-400 bg-yellow-300 text-black cursor-pointer btn-outset hover:bg-yellow-400"
              onclick={() => saveGeneratedPrompt(4)}
            >
              ★★★★☆ Save
            </button>
            <button
              class="px-3 py-1 text-sm border border-gray-400 bg-orange-300 text-black cursor-pointer btn-outset hover:bg-orange-400"
              onclick={() => saveGeneratedPrompt(3)}
            >
              ★★★☆☆ Save
            </button>
            <button
              class="px-3 py-1 text-sm border border-gray-400 bg-red-300 text-black cursor-pointer btn-outset hover:bg-red-400"
              onclick={() => generatedPrompt = ''}
            >
              Delete
            </button>
          </div>
        </div>
      {/if}

      <!-- Quick Stats -->
      <div class="p-4 bg-gray-100">
        <h4 class="font-bold mb-2">Quick Stats:</h4>
        <div class="text-sm text-gray-600">
          <div>Total Prompts: {promptManager.prompts.length}</div>
          <div>Favorites: {promptManager.prompts.filter(p => p.isFavorite).length}</div>
          <div>High Rated (4+): {promptManager.prompts.filter(p => p.rating >= 4).length}</div>
        </div>
      </div>
    </div>

    <!-- Right Panel: Saved Prompts -->
    <div class="flex-1 flex flex-col">
      <!-- Search and Filters -->
      <div class="p-3 border-b border-gray-500 bg-gray-200">
        <div class="flex gap-2 items-center mb-2">
          <input
            type="text"
            placeholder="Search prompts..."
            class="flex-1 border border-gray-500 p-2 text-sm bg-white text-black"
            bind:value={searchTerm}
          />
          <button
            class="px-3 py-2 text-sm border border-gray-400 bg-gray-300 text-black cursor-pointer btn-outset hover:bg-gray-400"
            onclick={() => exportSelectedPrompts()}
          >
            Export All
          </button>
        </div>
        
        <div class="flex gap-2 items-center">
          <select 
            class="border border-gray-500 p-1 text-xs bg-white text-black"
            bind:value={filterType}
          >
            <option value="all">All Prompts</option>
            <option value="favorites">Favorites</option>
            <option value="rated">Min Rating</option>
            <option value="style">By Style</option>
          </select>
          
          {#if filterType === 'rated'}
            <select 
              class="border border-gray-500 p-1 text-xs bg-white text-black"
              bind:value={minRating}
            >
              <option value="1">1+ Stars</option>
              <option value="2">2+ Stars</option>
              <option value="3">3+ Stars</option>
              <option value="4">4+ Stars</option>
              <option value="5">5 Stars</option>
            </select>
          {/if}
          
          {#if filterType === 'style'}
            <select 
              class="border border-gray-500 p-1 text-xs bg-white text-black"
              bind:value={styleFilter}
            >
              {#each styleOptions as style}
                <option value={style.id}>{style.label}</option>
              {/each}
            </select>
          {/if}
        </div>
        
        <div class="mt-2 text-xs text-gray-600">
          {filteredPrompts.length} of {promptManager.prompts.length} prompts
        </div>
      </div>

      <!-- Prompt List -->
      <div class="flex-1 overflow-auto">
        {#if filteredPrompts.length === 0}
          <div class="flex items-center justify-center h-full">
            <div class="text-center text-gray-600">
              {searchTerm ? 'No prompts match your search' : 'No saved prompts yet'}
              <br>
              <span class="text-sm">Generate your first prompt to get started!</span>
            </div>
          </div>
        {:else}
          {#each filteredPrompts as prompt (prompt.id)}
            <div class="border-b border-gray-400 p-3 hover:bg-gray-100">
              <!-- Prompt Header -->
              <div class="flex justify-between items-start mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold">{getStars(prompt.rating)}</span>
                  <button
                    class="text-lg cursor-pointer {prompt.isFavorite ? 'text-red-500' : 'text-gray-400'}"
                    onclick={() => toggleFavorite(prompt.id)}
                    title="Toggle favorite"
                  >
                    ♥
                  </button>
                  <span class="text-xs text-gray-600 capitalize">{prompt.style}</span>
                </div>
                <div class="flex gap-1">
                  <button
                    class="px-2 py-1 text-xs border border-gray-400 bg-blue-300 text-black cursor-pointer btn-outset hover:bg-blue-400"
                    onclick={() => copyPrompt(prompt)}
                    title="Copy to clipboard"
                  >
                    Copy
                  </button>
                  <button
                    class="px-2 py-1 text-xs border border-gray-400 bg-red-300 text-black cursor-pointer btn-outset hover:bg-red-400"
                    onclick={() => deletePromptById(prompt.id)}
                    title="Delete prompt"
                  >
                    ×
                  </button>
                </div>
              </div>

              <!-- Scene Premise -->
              <div class="text-xs text-blue-600 mb-1">
                <strong>Scene:</strong> {prompt.scenePremise}
              </div>

              <!-- Prompt Text -->
              <div class="text-sm mb-2 bg-white border border-gray-300 p-2 rounded">
                {prompt.prompt}
              </div>

              <!-- Metadata -->
              <div class="flex justify-between items-center text-xs text-gray-600">
                <div>
                  Saved: {formatTimestamp(prompt.savedAt)}
                  {#if prompt.usageCount}
                    • Used: {prompt.usageCount} times
                  {/if}
                </div>
                
                <!-- Rating Buttons -->
                <div class="flex gap-1">
                  {#each [1, 2, 3, 4, 5] as rating}
                    <button
                      class="cursor-pointer {rating <= prompt.rating ? 'text-yellow-500' : 'text-gray-300'}"
                      onclick={() => updateRating(prompt.id, rating)}
                      title="Rate {rating} stars"
                    >
                      ★
                    </button>
                  {/each}
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>

  <!-- Error Display -->
  {#if error}
    <div class="p-3 border-t border-gray-500 bg-red-100 text-red-700">
      <strong>Error:</strong> {error}
    </div>
  {/if}
</div>