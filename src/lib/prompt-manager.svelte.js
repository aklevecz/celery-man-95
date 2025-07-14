/**
 * Prompt Manager
 * Reactive manager for handling saved prompts with proper SSR support
 */

// Check if we're in browser environment

const SAVED_PROMPTS_KEY = 'saved_prompts';

function createPromptManager() {
  /** @type {import('./types.js').SavedPrompt[]} */
  let prompts = $state([]);
  /** @type {boolean} */
  let isLoaded = $state(false);

  /**
   * Load prompts from localStorage
   */
  function loadPrompts() {
    
    try {
      if (typeof localStorage === 'undefined') {
        prompts = [];
        isLoaded = true;
        return;
      }
      const stored = localStorage.getItem(SAVED_PROMPTS_KEY);
      prompts = stored ? JSON.parse(stored) : [];
      isLoaded = true;
    } catch (error) {
      console.error('Error loading saved prompts:', error);
      prompts = [];
      isLoaded = true;
    }
  }

  /**
   * Save prompts to localStorage
   */
  function saveToStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(prompts));
      }
    } catch (error) {
      console.error('Error saving prompts:', error);
    }
  }

  /**
   * Add a new prompt
   * @param {import('./types.js').SavedPrompt} prompt
   * @returns {boolean} Success status
   */
  function addPrompt(prompt) {
    try {
      const newPrompt = {
        ...prompt,
        id: prompt.id || `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        createdAt: prompt.createdAt || Date.now(),
        savedAt: Date.now(),
        usageCount: prompt.usageCount || 0
      };
      
      prompts = [...prompts, newPrompt];
      saveToStorage();
      return true;
    } catch (error) {
      console.error('Error adding prompt:', error);
      return false;
    }
  }

  /**
   * Update an existing prompt
   * @param {string} id
   * @param {Partial<import('./types.js').SavedPrompt>} updates
   * @returns {boolean} Success status
   */
  function updatePrompt(id, updates) {
    try {
      const index = prompts.findIndex(p => p.id === id);
      if (index >= 0) {
        prompts[index] = { ...prompts[index], ...updates };
        prompts = [...prompts]; // Trigger reactivity
        saveToStorage();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating prompt:', error);
      return false;
    }
  }

  /**
   * Delete a prompt
   * @param {string} id
   * @returns {boolean} Success status
   */
  function deletePrompt(id) {
    try {
      prompts = prompts.filter(p => p.id !== id);
      saveToStorage();
      return true;
    } catch (error) {
      console.error('Error deleting prompt:', error);
      return false;
    }
  }

  /**
   * Update prompt rating
   * @param {string} id
   * @param {number} rating
   * @returns {boolean} Success status
   */
  function updateRating(id, rating) {
    return updatePrompt(id, { rating: Math.max(1, Math.min(5, rating)) });
  }

  /**
   * Toggle favorite status
   * @param {string} id
   * @returns {boolean} Success status
   */
  function toggleFavorite(id) {
    const prompt = prompts.find(p => p.id === id);
    if (prompt) {
      return updatePrompt(id, { isFavorite: !prompt.isFavorite });
    }
    return false;
  }

  /**
   * Record prompt usage
   * @param {string} id
   * @returns {boolean} Success status
   */
  function recordUsage(id) {
    const prompt = prompts.find(p => p.id === id);
    if (prompt) {
      return updatePrompt(id, {
        usageCount: (prompt.usageCount || 0) + 1,
        lastUsed: Date.now()
      });
    }
    return false;
  }

  /**
   * Search prompts
   * @param {string} query
   * @returns {import('./types.js').SavedPrompt[]}
   */
  function searchPrompts(query) {
    if (!query.trim()) return prompts;
    
    const searchTerm = query.toLowerCase().trim();
    return prompts.filter(prompt => {
      return (
        prompt.prompt.toLowerCase().includes(searchTerm) ||
        prompt.scenePremise.toLowerCase().includes(searchTerm) ||
        (prompt.tags && prompt.tags.some(tag => tag.toLowerCase().includes(searchTerm))) ||
        (prompt.notes && prompt.notes.toLowerCase().includes(searchTerm))
      );
    });
  }

  /**
   * Get prompts by style
   * @param {string} style
   * @returns {import('./types.js').SavedPrompt[]}
   */
  function getPromptsByStyle(style) {
    return prompts.filter(prompt => prompt.style === style);
  }

  /**
   * Get prompts by minimum rating
   * @param {number} minRating
   * @returns {import('./types.js').SavedPrompt[]}
   */
  function getPromptsByRating(minRating) {
    return prompts.filter(prompt => prompt.rating >= minRating);
  }

  /**
   * Get favorite prompts
   * @returns {import('./types.js').SavedPrompt[]}
   */
  function getFavoritePrompts() {
    return prompts.filter(prompt => prompt.isFavorite);
  }

  /**
   * Get all unique tags
   * @returns {string[]}
   */
  function getAllTags() {
    const tagSet = new Set();
    prompts.forEach(prompt => {
      if (prompt.tags) {
        prompt.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }

  /**
   * Export prompts as JSON
   * @param {string[]} [ids] - Optional array of prompt IDs to export
   * @returns {string} JSON string
   */
  function exportPrompts(ids) {
    const toExport = ids ? prompts.filter(p => ids.includes(p.id)) : prompts;
    return JSON.stringify(toExport, null, 2);
  }

  /**
   * Import prompts from JSON
   * @param {string} jsonString
   * @returns {boolean} Success status
   */
  function importPrompts(jsonString) {
    try {
      const importedPrompts = JSON.parse(jsonString);
      
      // Merge imported prompts, avoiding duplicates by ID
      const existingIds = new Set(prompts.map(p => p.id));
      const newPrompts = importedPrompts.filter(p => !existingIds.has(p.id));
      
      prompts = [...prompts, ...newPrompts];
      saveToStorage();
      return true;
    } catch (error) {
      console.error('Error importing prompts:', error);
      return false;
    }
  }

  /**
   * Clear all prompts
   * @returns {boolean} Success status
   */
  function clearAllPrompts() {
    try {
      prompts = [];
      saveToStorage();
      return true;
    } catch (error) {
      console.error('Error clearing prompts:', error);
      return false;
    }
  }

  /**
   * Get prompt statistics
   * @returns {Object}
   */
  function getStats() {
    const stats = {
      total: prompts.length,
      favorites: prompts.filter(p => p.isFavorite).length,
      byStyle: {},
      byRating: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      totalUsage: 0,
      mostUsed: null
    };
    
    prompts.forEach(prompt => {
      // Count by style
      stats.byStyle[prompt.style] = (stats.byStyle[prompt.style] || 0) + 1;
      
      // Count by rating
      stats.byRating[prompt.rating] = (stats.byRating[prompt.rating] || 0) + 1;
      
      // Total usage
      stats.totalUsage += prompt.usageCount || 0;
      
      // Most used prompt
      if (!stats.mostUsed || (prompt.usageCount || 0) > (stats.mostUsed.usageCount || 0)) {
        stats.mostUsed = prompt;
      }
    });
    
    return stats;
  }

  // Initialize on browser
    loadPrompts();

  return {
    // State
    get prompts() {
      return prompts;
    },
    get isLoaded() {
      return isLoaded;
    },
    
    // Actions
    loadPrompts,
    addPrompt,
    updatePrompt,
    deletePrompt,
    updateRating,
    toggleFavorite,
    recordUsage,
    
    // Queries
    searchPrompts,
    getPromptsByStyle,
    getPromptsByRating,
    getFavoritePrompts,
    getAllTags,
    getStats,
    
    // Import/Export
    exportPrompts,
    importPrompts,
    clearAllPrompts
  };
}

export const promptManager = createPromptManager();