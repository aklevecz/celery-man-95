/**
 * Prompt Storage
 * Handles storage and retrieval of saved prompts
 */

const SAVED_PROMPTS_KEY = 'saved_prompts';

/**
 * Get all saved prompts from localStorage
 * @returns {import('./types.js').SavedPrompt[]}
 */
export function getSavedPrompts() {
  try {
    const stored = localStorage.getItem(SAVED_PROMPTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading saved prompts:', error);
    return [];
  }
}

/**
 * Save prompt to storage
 * @param {import('./types.js').SavedPrompt} savedPrompt
 * @returns {boolean} Success status
 */
export function savePrompt(savedPrompt) {
  try {
    const prompts = getSavedPrompts();
    const existingIndex = prompts.findIndex(p => p.id === savedPrompt.id);
    
    if (existingIndex >= 0) {
      // Update existing prompt
      prompts[existingIndex] = savedPrompt;
    } else {
      // Add new prompt
      prompts.push(savedPrompt);
    }
    
    localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(prompts));
    return true;
  } catch (error) {
    console.error('Error saving prompt:', error);
    return false;
  }
}

/**
 * Get saved prompt by ID
 * @param {string} id
 * @returns {import('./types.js').SavedPrompt | null}
 */
export function getPromptById(id) {
  const prompts = getSavedPrompts();
  return prompts.find(p => p.id === id) || null;
}

/**
 * Delete prompt by ID
 * @param {string} id
 * @returns {boolean} Success status
 */
export function deletePrompt(id) {
  try {
    const prompts = getSavedPrompts();
    const filteredPrompts = prompts.filter(p => p.id !== id);
    localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(filteredPrompts));
    return true;
  } catch (error) {
    console.error('Error deleting prompt:', error);
    return false;
  }
}

/**
 * Update prompt rating
 * @param {string} id
 * @param {number} rating - Rating from 1-5
 * @returns {boolean} Success status
 */
export function updatePromptRating(id, rating) {
  try {
    const prompts = getSavedPrompts();
    const promptIndex = prompts.findIndex(p => p.id === id);
    
    if (promptIndex >= 0) {
      prompts[promptIndex].rating = Math.max(1, Math.min(5, rating));
      localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(prompts));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error updating prompt rating:', error);
    return false;
  }
}

/**
 * Toggle prompt favorite status
 * @param {string} id
 * @returns {boolean} Success status
 */
export function togglePromptFavorite(id) {
  try {
    const prompts = getSavedPrompts();
    const promptIndex = prompts.findIndex(p => p.id === id);
    
    if (promptIndex >= 0) {
      prompts[promptIndex].isFavorite = !prompts[promptIndex].isFavorite;
      localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(prompts));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error toggling prompt favorite:', error);
    return false;
  }
}

/**
 * Record prompt usage
 * @param {string} id
 * @returns {boolean} Success status
 */
export function recordPromptUsage(id) {
  try {
    const prompts = getSavedPrompts();
    const promptIndex = prompts.findIndex(p => p.id === id);
    
    if (promptIndex >= 0) {
      const prompt = prompts[promptIndex];
      prompt.usageCount = (prompt.usageCount || 0) + 1;
      prompt.lastUsed = Date.now();
      localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(prompts));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error recording prompt usage:', error);
    return false;
  }
}

/**
 * Search prompts by text, tags, or scene premise
 * @param {string} query
 * @returns {import('./types.js').SavedPrompt[]}
 */
export function searchPrompts(query) {
  const prompts = getSavedPrompts();
  const searchTerm = query.toLowerCase().trim();
  
  if (!searchTerm) return prompts;
  
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
export function getPromptsByStyle(style) {
  const prompts = getSavedPrompts();
  return prompts.filter(prompt => prompt.style === style);
}

/**
 * Get prompts by rating
 * @param {number} minRating - Minimum rating (1-5)
 * @returns {import('./types.js').SavedPrompt[]}
 */
export function getPromptsByRating(minRating) {
  const prompts = getSavedPrompts();
  return prompts.filter(prompt => prompt.rating >= minRating);
}

/**
 * Get favorite prompts
 * @returns {import('./types.js').SavedPrompt[]}
 */
export function getFavoritePrompts() {
  const prompts = getSavedPrompts();
  return prompts.filter(prompt => prompt.isFavorite);
}

/**
 * Get prompts by tags
 * @param {string[]} tags
 * @returns {import('./types.js').SavedPrompt[]}
 */
export function getPromptsByTags(tags) {
  const prompts = getSavedPrompts();
  return prompts.filter(prompt => 
    prompt.tags && tags.some(tag => prompt.tags.includes(tag))
  );
}

/**
 * Get all unique tags from prompts
 * @returns {string[]}
 */
export function getAllPromptTags() {
  const prompts = getSavedPrompts();
  const tagSet = new Set();
  
  prompts.forEach(prompt => {
    if (prompt.tags) {
      prompt.tags.forEach(tag => tagSet.add(tag));
    }
  });
  
  return Array.from(tagSet).sort();
}

/**
 * Get prompt statistics
 * @returns {Object}
 */
export function getPromptStats() {
  const prompts = getSavedPrompts();
  
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

/**
 * Export prompts as JSON
 * @param {string[]} [ids] - Optional array of prompt IDs to export. If not provided, exports all prompts
 * @returns {string} JSON string
 */
export function exportPrompts(ids) {
  const prompts = getSavedPrompts();
  const toExport = ids ? prompts.filter(p => ids.includes(p.id)) : prompts;
  return JSON.stringify(toExport, null, 2);
}

/**
 * Import prompts from JSON
 * @param {string} jsonString
 * @returns {boolean} Success status
 */
export function importPrompts(jsonString) {
  try {
    const importedPrompts = JSON.parse(jsonString);
    const existingPrompts = getSavedPrompts();
    
    // Merge imported prompts, avoiding duplicates by ID
    const existingIds = new Set(existingPrompts.map(p => p.id));
    const newPrompts = importedPrompts.filter(p => !existingIds.has(p.id));
    
    const mergedPrompts = [...existingPrompts, ...newPrompts];
    localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(mergedPrompts));
    
    return true;
  } catch (error) {
    console.error('Error importing prompts:', error);
    return false;
  }
}

/**
 * Clear all prompts (for testing/cleanup)
 * @returns {boolean} Success status
 */
export function clearAllPrompts() {
  try {
    localStorage.removeItem(SAVED_PROMPTS_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing prompts:', error);
    return false;
  }
}