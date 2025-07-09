/**
 * BlackForest Labs API Integration
 * Provides Flux model generation through BlackForest Labs API
 */

import { settingsManager } from './settings-manager.svelte.js';

const BLACKFOREST_BASE_URL = 'https://api.bfl.ml';

/**
 * Map FAL model names to BlackForest endpoints
 * @param {string} falModel - The FAL model name
 * @returns {string} BlackForest endpoint
 */
function mapToBlackForestEndpoint(falModel) {
  // Map common FAL models to BlackForest equivalents
  const modelMap = {
    'fal-ai/flux-pro/v1.1-ultra': '/v1/flux-pro-1.1',
    'fal-ai/flux-pro/kontext': '/v1/flux-kontext-pro', 
    'fal-ai/flux-pro/kontext/text-to-image': '/v1/flux-kontext-pro',
    // Default to flux-pro-1.1 for unknown models
  };
  
  return modelMap[falModel] || '/v1/flux-pro-1.1';
}

function createBlackForestApi() {
  /** @type {string} */
  let error = $state('');
  /** @type {boolean} */
  let isGenerating = $state(false);

  /**
   * Get API key from settings
   * @returns {string | null}
   */
  function getApiKey() {
    const apiKey = settingsManager.getSetting('blackforestApiKey');
    return apiKey && apiKey.trim() ? apiKey.trim() : null;
  }

  /**
   * Check if BlackForest API is available
   * @returns {boolean}
   */
  function isAvailable() {
    const apiKey = getApiKey();
    return !!apiKey;
  }

  /**
   * Make authenticated request to BlackForest API via proxy
   * @param {string} endpoint
   * @param {RequestInit} options
   * @returns {Promise<Response>}
   */
  async function makeRequest(endpoint, options = {}) {
    const targetUrl = `${BLACKFOREST_BASE_URL}${endpoint}`;
    const proxyUrl = '/api/blackforest/proxy';
    
    // Prepare headers for proxy request
    const headers = {
      'Content-Type': 'application/json',
      'x-blackforest-target-url': targetUrl,
      ...options.headers
    };

    // Add client API key if available
    const apiKey = getApiKey();
    if (apiKey) {
      headers['x-blackforest-client-key'] = apiKey;
      console.log('🔍 BlackForest client - sending API key:', `${apiKey.substring(0, 8)}...`);
    } else {
      console.log('🔍 BlackForest client - no API key available');
    }

    console.log('🔍 BlackForest client - headers being sent:', headers);

    return fetch(proxyUrl, {
      ...options,
      headers
    });
  }

  /**
   * Generate image using BlackForest Flux model
   * @param {import('./types.js').ImageGenerationOptions} options
   * @param {string} [model] - The model to use
   * @returns {Promise<{images: Array<{url: string}>}>}
   */
  async function generateImage(options, model) {
    if (!isAvailable()) {
      throw new Error('BlackForest API key not configured');
    }

    isGenerating = true;
    error = '';

    try {
      // Map our options to BlackForest API format
      const requestBody = {
        prompt: options.prompt,
        aspect_ratio: options.aspect_ratio || '16:9'
      };

      // Add image URL for image-to-image if provided
      if (options.image_url) {
        requestBody.input_image = options.image_url;
      }

      // Add other optional parameters if provided
      if (options.seed) {
        requestBody.seed = parseInt(options.seed);
      }

      console.log('BlackForest API request:', requestBody);

      // Map the model to BlackForest endpoint
      const modelToUse = model || 'fal-ai/flux-pro/v1.1-ultra'; // Default model
      const endpoint = mapToBlackForestEndpoint(modelToUse);
      console.log('Using BlackForest endpoint:', endpoint, 'for model:', modelToUse);

      // Initial request to start generation
      const response = await makeRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('BlackForest API initial response:', data);
      console.log('BlackForest response keys:', Object.keys(data));
      console.log('BlackForest response type:', typeof data);

      // Check what fields are actually in the response
      if (!data) {
        throw new Error('Empty response from BlackForest API');
      }

      // BlackForest API returns id and polling_url for async processing
      if (!data.id || !data.polling_url) {
        console.error('Missing fields in BlackForest response:', {
          has_id: !!data.id,
          has_polling_url: !!data.polling_url,
          actual_response: data
        });
        throw new Error(`Invalid response from BlackForest API - missing id or polling_url. Got: ${JSON.stringify(data)}`);
      }

      // Poll for completion
      const result = await pollForCompletion(data.polling_url);
      return { images: [{ url: result.image_url }] };

    } catch (err) {
      error = err.message || 'Failed to generate image with BlackForest API';
      console.error('BlackForest API error:', err);
      throw err;
    } finally {
      isGenerating = false;
    }
  }

  /**
   * Poll the BlackForest API for completion
   * @param {string} pollingUrl
   * @returns {Promise<{image_url: string}>}
   */
  async function pollForCompletion(pollingUrl) {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const apiKey = getApiKey();
        const headers = {
          'Content-Type': 'application/json',
          'x-blackforest-target-url': pollingUrl
        };
        
        if (apiKey) {
          headers['x-blackforest-client-key'] = apiKey;
        }

        const response = await fetch('/api/blackforest/proxy', {
          method: 'GET',
          headers
        });

        if (!response.ok) {
          throw new Error(`Polling failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('BlackForest polling response:', data);

        if (data.status === 'Ready' && data.result && data.result.sample) {
          // BlackForest URLs have CORS issues, so proxy them through our proxy-image endpoint
          try {
            const proxyResponse = await fetch('/api/proxy-image', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ url: data.result.sample })
            });

            if (!proxyResponse.ok) {
              throw new Error(`Proxy failed: ${proxyResponse.status}`);
            }

            const blob = await proxyResponse.blob();
            const blobUrl = URL.createObjectURL(blob);
            return { image_url: blobUrl };
          } catch (proxyError) {
            console.error('Failed to proxy BlackForest image:', proxyError);
            // Fallback to original URL (might have CORS issues but better than nothing)
            return { image_url: data.result.sample };
          }
        } else if (data.status === 'Error' || data.status === 'Failed') {
          throw new Error(`Generation failed: ${data.error || 'Unknown error'}`);
        }

        // Wait before next poll (exponential backoff)
        const delay = Math.min(1000 * Math.pow(1.5, attempts), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        attempts++;

      } catch (err) {
        console.error('Polling error:', err);
        throw err;
      }
    }

    throw new Error('Generation timed out');
  }

  /**
   * Get width from aspect ratio
   * @param {string} aspectRatio
   * @returns {number}
   */
  function getWidthFromAspectRatio(aspectRatio) {
    const aspectRatioMap = {
      '21:9': 1344,
      '16:9': 1024,
      '4:3': 1024,
      '1:1': 1024,
      '3:4': 768,
      '9:16': 576
    };
    return aspectRatioMap[aspectRatio] || 1024;
  }

  /**
   * Get height from aspect ratio
   * @param {string} aspectRatio
   * @returns {number}
   */
  function getHeightFromAspectRatio(aspectRatio) {
    const aspectRatioMap = {
      '21:9': 576,
      '16:9': 576,
      '4:3': 768,
      '1:1': 1024,
      '3:4': 1024,
      '9:16': 1024
    };
    return aspectRatioMap[aspectRatio] || 1024;
  }

  /**
   * Get available models
   * @returns {Promise<Array>}
   */
  async function getModels() {
    try {
      const response = await makeRequest('/v1/models');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      console.error('Failed to fetch BlackForest models:', err);
      return [];
    }
  }

  /**
   * Check API key validity
   * @returns {Promise<boolean>}
   */
  async function validateApiKey() {
    try {
      const response = await makeRequest('/v1/models');
      return response.ok;
    } catch (err) {
      return false;
    }
  }

  /**
   * Test the API connection
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async function testConnection() {
    if (!isAvailable()) {
      return { success: false, message: 'No API key configured' };
    }

    try {
      const isValid = await validateApiKey();
      if (isValid) {
        return { success: true, message: 'BlackForest API connection successful' };
      } else {
        return { success: false, message: 'Invalid API key or connection failed' };
      }
    } catch (err) {
      return { success: false, message: err.message || 'Connection test failed' };
    }
  }

  return {
    // State
    get error() {
      return error;
    },
    get isGenerating() {
      return isGenerating;
    },

    // Methods
    isAvailable,
    generateImage,
    getModels,
    validateApiKey,
    testConnection,

    // Utils
    getWidthFromAspectRatio,
    getHeightFromAspectRatio
  };
}

export const blackforestApi = createBlackForestApi();