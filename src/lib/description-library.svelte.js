/**
 * Description Library
 * Provides a unified interface for image descriptions that can be reused across components
 * Integrates with both the gemini-api for generation and analyzed-image-storage for persistence
 */

import { geminiApi } from './gemini-api.svelte.js';
import { getAnalyzedImages, getImageAnalysis } from './analyzed-image-storage.js';

function createDescriptionLibrary() {
  /** @type {import('./types.js').AnalyzedImage[]} */
  let availableDescriptions = $state([]);
  /** @type {boolean} */
  let isLoading = $state(false);

  /**
   * Load available descriptions from storage
   */
  function loadDescriptions() {
    availableDescriptions = getAnalyzedImages();
  }

  /**
   * Get descriptions by style/type
   * @param {string} style - The analysis type to filter by
   * @returns {Array<{id: string, name: string, description: string, timestamp: number}>}
   */
  function getDescriptionsByStyle(style) {
    return availableDescriptions
      .map(image => {
        const analysis = getImageAnalysis(image.id, style);
        return analysis ? {
          id: image.id,
          name: image.name,
          description: analysis.description,
          timestamp: analysis.timestamp,
          imageUrl: image.imageUrl,
          tags: image.tags
        } : null;
      })
      .filter(item => item !== null);
  }

  /**
   * Search descriptions by content
   * @param {string} query - Search query
   * @param {string} [style] - Optional style filter
   * @returns {Array<{id: string, name: string, description: string, timestamp: number}>}
   */
  function searchDescriptions(query, style) {
    const searchTerm = query.toLowerCase().trim();
    
    return availableDescriptions
      .flatMap(image => {
        const analyses = style ? 
          image.analyses.filter(a => a.type === style) : 
          image.analyses;
        
        return analyses
          .filter(analysis => 
            analysis.description.toLowerCase().includes(searchTerm) ||
            image.name.toLowerCase().includes(searchTerm) ||
            (image.tags && image.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
          )
          .map(analysis => ({
            id: image.id,
            name: image.name,
            description: analysis.description,
            timestamp: analysis.timestamp,
            imageUrl: image.imageUrl,
            tags: image.tags,
            analysisType: analysis.type
          }));
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Generate a new description using Gemini API
   * @param {File | string} image - Image file or URL
   * @param {string} style - Analysis style
   * @returns {Promise<string>} Generated description
   */
  async function generateDescription(image, style) {
    return await geminiApi.describeImage({ image, style });
  }

  /**
   * Get description suggestions for prompt enhancement
   * @param {string} currentPrompt - Current prompt text
   * @param {string} style - Desired style
   * @returns {Array<{id: string, name: string, description: string, relevance: number}>}
   */
  function getDescriptionSuggestions(currentPrompt, style) {
    const promptLower = currentPrompt.toLowerCase();
    const descriptions = getDescriptionsByStyle(style);
    
    return descriptions
      .map(desc => {
        // Simple relevance scoring based on keyword overlap
        const descWords = desc.description.toLowerCase().split(/\s+/);
        const promptWords = promptLower.split(/\s+/);
        
        const overlap = descWords.filter(word => 
          promptWords.some(pWord => pWord.includes(word) || word.includes(pWord))
        ).length;
        
        const relevance = overlap / Math.max(descWords.length, promptWords.length);
        
        return {
          ...desc,
          relevance
        };
      })
      .filter(desc => desc.relevance > 0.1) // Filter out low relevance
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5); // Top 5 suggestions
  }

  /**
   * Get popular/frequently used descriptions
   * @param {string} [style] - Optional style filter
   * @param {number} [limit=10] - Number of results to return
   * @returns {Array<{id: string, name: string, description: string, timestamp: number}>}
   */
  function getPopularDescriptions(style, limit = 10) {
    // For now, just return recent descriptions
    // In the future, this could track usage counts
    const descriptions = style ? getDescriptionsByStyle(style) : 
      availableDescriptions.flatMap(image => 
        image.analyses.map(analysis => ({
          id: image.id,
          name: image.name,
          description: analysis.description,
          timestamp: analysis.timestamp,
          imageUrl: image.imageUrl,
          tags: image.tags,
          analysisType: analysis.type
        }))
      );
    
    return descriptions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get descriptions by tags
   * @param {string[]} tags - Tags to filter by
   * @param {string} [style] - Optional style filter
   * @returns {Array<{id: string, name: string, description: string, timestamp: number}>}
   */
  function getDescriptionsByTags(tags, style) {
    return availableDescriptions
      .filter(image => 
        image.tags && tags.some(tag => image.tags.includes(tag))
      )
      .map(image => {
        const analyses = style ? 
          image.analyses.filter(a => a.type === style) : 
          image.analyses;
        
        return analyses.map(analysis => ({
          id: image.id,
          name: image.name,
          description: analysis.description,
          timestamp: analysis.timestamp,
          imageUrl: image.imageUrl,
          tags: image.tags,
          analysisType: analysis.type
        }));
      })
      .flat()
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Format description for use in prompts
   * @param {string} description - Raw description
   * @param {string} [prefix=''] - Optional prefix
   * @param {string} [suffix=''] - Optional suffix
   * @returns {string} Formatted description
   */
  function formatDescriptionForPrompt(description, prefix = '', suffix = '') {
    // Clean up the description for prompt use
    const cleaned = description
      .replace(/^\s*Generate\s+/i, '') // Remove "Generate" prefixes
      .replace(/^\s*Create\s+/i, '') // Remove "Create" prefixes
      .replace(/^\s*This\s+image\s+shows?\s*/i, '') // Remove "This image shows"
      .replace(/^\s*The\s+image\s+depicts?\s*/i, '') // Remove "The image depicts"
      .trim();
    
    return `${prefix}${cleaned}${suffix}`.trim();
  }

  // Initialize
  loadDescriptions();

  return {
    get availableDescriptions() {
      return availableDescriptions;
    },
    get isLoading() {
      return isLoading;
    },
    loadDescriptions,
    getDescriptionsByStyle,
    searchDescriptions,
    generateDescription,
    getDescriptionSuggestions,
    getPopularDescriptions,
    getDescriptionsByTags,
    formatDescriptionForPrompt,
    // Re-export gemini API for convenience
    get geminiError() {
      return geminiApi.error;
    },
    get isGenerating() {
      return geminiApi.isGenerating;
    },
    get isGeminiAvailable() {
      return geminiApi.isAvailable();
    }
  };
}

export const descriptionLibrary = createDescriptionLibrary();