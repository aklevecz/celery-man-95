/**
 * Settings Manager - Handles persistent application settings
 * Stores settings in localStorage for client-side persistence
 */

const STORAGE_KEY = 'celery-man-windows-settings';

const DEFAULT_SETTINGS = {
  falApiKey: '',
  geminiApiKey: '',
  blackforestApiKey: '',
  preferredFluxProvider: 'fal',
  theme: 'windows95',
  autoSave: true,
  debugMode: false
};

/**
 * Create the settings manager
 */
function createSettingsManager() {
  let settings = $state({ ...DEFAULT_SETTINGS });
  let isLoaded = $state(false);

  /**
   * Load settings from localStorage
   */
  function loadSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        // Merge with defaults to handle new settings added in updates
        settings = { ...DEFAULT_SETTINGS, ...parsedSettings };
      }
      isLoaded = true;
    } catch (error) {
      console.error('Failed to load settings:', error);
      settings = { ...DEFAULT_SETTINGS };
      isLoaded = true;
    }
  }

  /**
   * Save settings to localStorage
   */
  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  /**
   * Get a specific setting value
   * @param {keyof typeof DEFAULT_SETTINGS} key - Setting key
   * @returns {any} Setting value
   */
  function getSetting(key) {
    return settings[key];
  }

  /**
   * Set a specific setting value
   * @param {keyof typeof DEFAULT_SETTINGS} key - Setting key
   * @param {any} value - Setting value
   */
  function setSetting(key, value) {
    settings[key] = value;
    saveSettings();
  }

  /**
   * Reset all settings to defaults
   */
  function resetSettings() {
    settings = { ...DEFAULT_SETTINGS };
    saveSettings();
  }

  /**
   * Clear all settings (useful for API key security)
   */
  function clearSettings() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      settings = { ...DEFAULT_SETTINGS };
      return true;
    } catch (error) {
      console.error('Failed to clear settings:', error);
      return false;
    }
  }

  /**
   * Check if API key is configured
   * @returns {boolean} True if API key is set
   */
  function hasApiKey() {
    return Boolean(settings.falApiKey && settings.falApiKey.trim());
  }

  /**
   * Validate FAL API key format
   * @param {string} apiKey - API key to validate
   * @returns {boolean} True if format appears valid
   */
  function validateApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') return false;
    // Basic validation - FAL API keys typically start with certain patterns
    const trimmed = apiKey.trim();
    return trimmed.length > 10; // Basic length check
  }


  // Auto-load settings when manager is created
  if (typeof window !== 'undefined') {
    loadSettings();
  }

  return {
    // Reactive state
    get settings() { return settings; },
    get isLoaded() { return isLoaded; },
    
    // Methods
    loadSettings,
    saveSettings,
    getSetting,
    setSetting,
    resetSettings,
    clearSettings,
    hasApiKey,
    validateApiKey,
    
  };
}

// Export singleton instance
export const settingsManager = createSettingsManager();