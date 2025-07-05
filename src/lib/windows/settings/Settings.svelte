<script>
  import { settingsManager } from "$lib/settings-manager.svelte.js";
  import { themeManager } from "$lib/theme-manager.svelte.js";

  // Local state for form handling
  let localApiKey = $state('');
  let showApiKey = $state(false);
  let hasChanges = $state(false);
  let saveStatus = $state(''); // 'saving', 'saved', 'error'

  // Load current settings when component mounts
  $effect(() => {
    if (settingsManager.isLoaded) {
      localApiKey = settingsManager.getSetting('falApiKey') || '';
    }
  });

  // Track changes
  $effect(() => {
    const currentApiKey = settingsManager.getSetting('falApiKey') || '';
    hasChanges = localApiKey !== currentApiKey;
  });


  /**
   * Save settings
   */
  async function saveSettings() {
    saveStatus = 'saving';
    
    try {
      // Validate API key if provided
      if (localApiKey.trim() && !settingsManager.validateApiKey(localApiKey)) {
        saveStatus = 'error';
        return;
      }

      // Save API key
      settingsManager.setSetting('falApiKey', localApiKey.trim());
      
      saveStatus = 'saved';
      hasChanges = false;
      
      // Clear success message after 2 seconds
      setTimeout(() => {
        if (saveStatus === 'saved') saveStatus = '';
      }, 2000);
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      saveStatus = 'error';
    }
  }

  /**
   * Reset to defaults
   */
  function resetSettings() {
    localApiKey = '';
    settingsManager.resetSettings();
    hasChanges = false;
    saveStatus = '';
  }

  /**
   * Clear all stored settings
   */
  function clearAllSettings() {
    if (confirm('Are you sure you want to clear all settings? This will remove your API key and reset all preferences.')) {
      localApiKey = '';
      settingsManager.clearSettings();
      hasChanges = false;
      saveStatus = '';
    }
  }

  /**
   * Toggle API key visibility
   */
  function toggleApiKeyVisibility() {
    showApiKey = !showApiKey;
  }

  /**
   * Handle keyboard shortcut for save
   * @param {KeyboardEvent} event 
   */
  function handleKeyboard(event) {
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      if (hasChanges) saveSettings();
    }
  }
</script>

<svelte:window onkeydown={handleKeyboard} />

<div class="flex flex-col h-full font-sans bg-gray-300 text-black">
  <!-- Header -->
  <div class="p-3 border-b border-gray-500 bg-gray-300">
    <h2 class="m-0 text-xl font-bold text-black">Settings</h2>
    <p class="mt-1 mb-0 text-sm text-gray-600">Configure application preferences</p>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-auto p-4">
    <!-- API Configuration Section -->
    <div class="mb-6">
      <h3 class="text-lg font-bold text-black mb-3 border-b border-gray-400 pb-1">API Configuration</h3>
      
      <div class="bg-gray-200 border border-gray-500 p-3 mb-4">
        <div class="mb-3">
          <label for="fal-api-key" class="block text-sm font-bold text-black mb-2">
            FAL.AI API Key:
          </label>
          <div class="flex gap-2 items-center">
            <input
              id="fal-api-key"
              type={showApiKey ? 'text' : 'password'}
              class="flex-1 border border-gray-500 p-2 text-sm bg-white text-black font-mono"
              bind:value={localApiKey}
              placeholder="Enter your FAL.AI API key..."
              autocomplete="off"
            />
            <button
              class="px-3 py-2 border border-gray-400 bg-gray-300 text-black text-sm font-bold cursor-pointer btn-outset hover:bg-gray-400"
              onclick={toggleApiKeyVisibility}
              title={showApiKey ? 'Hide API key' : 'Show API key'}
            >
              {showApiKey ? '🙈' : '👁️'}
            </button>
          </div>
          
          {#if localApiKey.trim() && !settingsManager.validateApiKey(localApiKey)}
            <p class="text-red-600 text-xs mt-1">⚠️ API key format appears invalid</p>
          {/if}
        </div>

        <div class="text-xs text-gray-600 mb-2">
          <p><strong>🔒 Security Note:</strong> Your API key is stored locally in your browser only.</p>
          <p><strong>📖 Get API Key:</strong> Visit <a href="https://fal.ai/dashboard" target="_blank" class="text-blue-600 underline">fal.ai/dashboard</a> to create an API key.</p>
        </div>

        {#if settingsManager.hasApiKey()}
          <div class="text-xs text-green-600">
            ✅ API key is configured
          </div>
        {:else}
          <div class="text-xs text-orange-600">
            ⚠️ No API key configured - using server default (if available)
          </div>
        {/if}
      </div>
    </div>

    <!-- Theme Section -->
    <div class="mb-6">
      <h3 class="text-lg font-bold text-black mb-3 border-b border-gray-400 pb-1">Appearance</h3>
      
      <div class="bg-gray-200 border border-gray-500 p-3">
        <div class="mb-3">
          <label for="theme-select" class="block text-sm font-bold text-black mb-2">
            Theme:
          </label>
          <select 
            id="theme-select" 
            class="w-full border border-gray-500 p-2 text-sm bg-white text-black"
            value={themeManager.currentTheme}
            onchange={(e) => themeManager.setTheme(e.target.value)}
          >
            <option value="windows95">Windows 95</option>
            <option value="windows98">Windows 98</option>
            <option value="windowsxp">Windows XP</option>
            <option value="windows2000">Windows 2000</option>
          </select>
        </div>
        
        <div class="text-xs text-gray-600">
          Current theme: <strong>{themeManager.currentTheme}</strong>
        </div>
      </div>
    </div>

    <!-- Advanced Section -->
    <div class="mb-6">
      <h3 class="text-lg font-bold text-black mb-3 border-b border-gray-400 pb-1">Advanced</h3>
      
      <div class="bg-gray-200 border border-gray-500 p-3">
        <label class="flex items-center text-sm font-bold text-black mb-2">
          <input 
            type="checkbox" 
            class="mr-2"
            checked={settingsManager.getSetting('debugMode')}
            onchange={(e) => settingsManager.setSetting('debugMode', e.target.checked)}
          />
          Enable debug mode
        </label>
        <p class="text-xs text-gray-600">Shows additional console logging for troubleshooting</p>
      </div>
    </div>
  </div>

  <!-- Footer with action buttons -->
  <div class="border-t border-gray-500 p-3 bg-gray-300">
    <!-- Status messages -->
    {#if saveStatus}
      <div class="mb-2">
        {#if saveStatus === 'saving'}
          <div class="text-blue-600 text-sm">💾 Saving settings...</div>
        {:else if saveStatus === 'saved'}
          <div class="text-green-600 text-sm">✅ Settings saved successfully!</div>
        {:else if saveStatus === 'error'}
          <div class="text-red-600 text-sm">❌ Failed to save settings</div>
        {/if}
      </div>
    {/if}

    <!-- Action buttons -->
    <div class="flex gap-2 justify-between items-center">
      <div class="flex gap-2">
        <button
          class="px-4 py-2 border border-gray-400 bg-gray-300 text-black text-sm font-bold cursor-pointer btn-outset disabled:bg-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed"
          onclick={saveSettings}
          disabled={!hasChanges || saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
        </button>
        
        <button
          class="px-4 py-2 border border-gray-400 bg-gray-300 text-black text-sm font-bold cursor-pointer btn-outset"
          onclick={resetSettings}
          disabled={saveStatus === 'saving'}
        >
          Reset to Defaults
        </button>
      </div>

      <button
        class="px-3 py-2 border border-gray-400 bg-red-200 text-black text-sm font-bold cursor-pointer btn-outset hover:bg-red-300"
        onclick={clearAllSettings}
        disabled={saveStatus === 'saving'}
        title="Clear all settings and API keys"
      >
        Clear All
      </button>
    </div>

    {#if hasChanges}
      <div class="text-xs text-orange-600 mt-2">
        💡 You have unsaved changes. Press Ctrl+S to save quickly.
      </div>
    {/if}
  </div>
</div>