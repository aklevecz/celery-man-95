/**
 * Flux API Manager
 * Unified interface for Flux image generation with multiple providers
 */

import falApi from './fal-api.svelte.js';
import { blackforestApi } from './blackforest-api.svelte.js';
import { settingsManager } from './settings-manager.svelte.js';

function createFluxApiManager() {
  /** @type {string} */
  let error = $state('');
  /** @type {boolean} */
  let isGenerating = $state(false);
  /** @type {'fal' | 'blackforest' | null} */
  let currentProvider = $state(null);

  /**
   * Get the preferred provider from settings
   * @returns {'fal' | 'blackforest'}
   */
  function getPreferredProvider() {
    return settingsManager.getSetting('preferredFluxProvider') || 'fal';
  }

  /**
   * Get available providers
   * @returns {Array<{id: string, name: string, available: boolean}>}
   */
  function getAvailableProviders() {
    return [
      {
        id: 'fal',
        name: 'FAL.AI',
        available: settingsManager.hasApiKey()
      },
      {
        id: 'blackforest',
        name: 'BlackForest Labs',
        available: blackforestApi.isAvailable()
      }
    ];
  }

  /**
   * Get the best available provider
   * @returns {'fal' | 'blackforest' | null}
   */
  function getBestProvider() {
    const preferred = getPreferredProvider();
    const providers = getAvailableProviders();
    
    
    // First try preferred provider if available
    const preferredProvider = providers.find(p => p.id === preferred && p.available);
    if (preferredProvider) {
      return preferredProvider.id;
    }
    
    // Fallback to any available provider
    const availableProvider = providers.find(p => p.available);
    const result = availableProvider ? availableProvider.id : null;
    return result;
  }

  /**
   * Generate image using the best available provider
   * @param {import('./types.js').ImageGenerationOptions} options
   * @param {import('./types.js').Model} [model] - The model to use (for FAL API)
   * @returns {Promise<{images: Array<{url: string}>, provider: string}>}
   */
  async function generateImage(options, model) {
    isGenerating = true;
    error = '';
    currentProvider = null;

    try {
      const provider = getBestProvider();
      
      if (!provider) {
        throw new Error('No API providers available. Please configure FAL.AI or BlackForest Labs API key in Settings.');
      }

      currentProvider = provider;
      let result;

      console.log(`Using ${provider} for image generation`, options.image_url ? 'with image' : 'text-only');
      if (options.image_url) {
        console.log('🖼️ Image data type:', options.image_url.startsWith('data:') ? 'base64' : 'URL');
        console.log('🖼️ Image data preview:', options.image_url.substring(0, 100) + '...');
      }

      if (provider === 'fal') {
        // Use FAL API - using generateFluxImage method
        // Default to flux-pro-1.1-ultra if no model specified
        const modelToUse = model || 'fal-ai/flux-pro/v1.1-ultra';
        const imageUrl = await falApi.generateFluxImage(modelToUse, options);
        if (!imageUrl) {
          throw new Error('FAL API returned no image URL');
        }
        return { 
          images: [{ url: imageUrl }],
          provider: 'fal'
        };
      } else if (provider === 'blackforest') {
        // Use BlackForest API
        result = await blackforestApi.generateImage(options, model);
        return { 
          images: result.images,
          provider: 'blackforest'
        };
      } else {
        throw new Error(`Unknown provider: ${provider}`);
      }

    } catch (err) {
      error = err.message || 'Failed to generate image';
      currentProvider = null;
      
      // If the preferred provider fails, try fallback
      const preferred = getPreferredProvider();
      const providers = getAvailableProviders();
      const fallbackProvider = providers.find(p => p.id !== preferred && p.available);
      
      if (fallbackProvider && !error.includes('No API providers available')) {
        console.log(`Primary provider failed, trying fallback: ${fallbackProvider.id}`);
        try {
          currentProvider = fallbackProvider.id;
          
          let result;
          if (fallbackProvider.id === 'fal') {
            const modelToUse = model || 'fal-ai/flux-pro/v1.1-ultra';
            const imageUrl = await falApi.generateFluxImage(modelToUse, options);
            return { images: [{ url: imageUrl }], provider: 'fal' };
          } else if (fallbackProvider.id === 'blackforest') {
            result = await blackforestApi.generateImage(options, model);
            return { images: result.images, provider: 'blackforest' };
          }
        } catch (fallbackErr) {
          console.error('Fallback provider also failed:', fallbackErr);
          error = `Both providers failed. Primary: ${err.message}. Fallback: ${fallbackErr.message}`;
        }
      }
      
      throw new Error(error);
    } finally {
      isGenerating = false;
    }
  }

  /**
   * Test connection for a specific provider
   * @param {'fal' | 'blackforest'} provider
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async function testProvider(provider) {
    if (provider === 'fal') {
      return await falApi.testApiKey();
    } else if (provider === 'blackforest') {
      return await blackforestApi.testConnection();
    } else {
      return { success: false, message: 'Unknown provider' };
    }
  }

  /**
   * Test all available providers
   * @returns {Promise<Array<{provider: string, success: boolean, message: string}>>}
   */
  async function testAllProviders() {
    const providers = getAvailableProviders();
    const results = [];

    for (const provider of providers) {
      if (provider.available) {
        const result = await testProvider(provider.id);
        results.push({
          provider: provider.name,
          providerId: provider.id,
          success: result.success,
          message: result.message
        });
      } else {
        results.push({
          provider: provider.name,
          providerId: provider.id,
          success: false,
          message: 'API key not configured'
        });
      }
    }

    return results;
  }

  /**
   * Get provider status
   * @returns {{preferred: string, available: Array<{id: string, name: string, available: boolean}>, best: string | null, fallbackAvailable: boolean}}
   */
  function getProviderStatus() {
    const preferred = getPreferredProvider();
    const available = getAvailableProviders();
    const best = getBestProvider();

    return {
      preferred,
      available,
      best,
      fallbackAvailable: available.filter(p => p.available).length > 1
    };
  }

  return {
    // State
    get error() {
      return error;
    },
    get isGenerating() {
      return isGenerating;
    },
    get currentProvider() {
      return currentProvider;
    },

    // Methods
    generateImage,
    getPreferredProvider,
    getAvailableProviders,
    getBestProvider,
    testProvider,
    testAllProviders,
    getProviderStatus,

    // Direct access to underlying APIs
    get falApi() {
      return falApi;
    },
    get blackforestApi() {
      return blackforestApi;
    }
  };
}

export const fluxApiManager = createFluxApiManager();