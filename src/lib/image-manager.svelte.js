import imageStorage from "$lib/image-storage.js";

function createImageManager() {
  /** @type {SavedImage[]} */
  let savedImages = $state([]);

  /** @type {string} */
  let error = $state("");

  /** @type {boolean} */
  let isLoading = $state(false);

  /** @type {boolean} */
  let isSaving = $state(false);

  /** @type {Record<string, string>} */
  let imageUrls = $state({});

  /** @type {Record<string, number>} */
  let urlRefCounts = $state({});

  /** @type {string[]} */
  let urlAccessOrder = $state([]);

  const MAX_CACHED_URLS = 50;
  
  /** @type {number | null} */
  let cleanupTimer = null;

  async function loadSavedImages() {
    try {
      isLoading = true;
      savedImages.splice(0, savedImages.length, ...imageStorage.getSavedImagesMetadata());
      error = "";
    } catch (/** @type {any} */ err) {
      error = `Failed to load saved images: ${err.message}`;
    } finally {
      isLoading = false;
    }
  }

  /**
   * Save an image to storage
   * @param {string} imageUrl - The URL of the image to save
   * @param {string} prompt - The prompt used to generate the image
   * @param {GenerationParams} [generationParams] - All generation parameters used
   */
  async function saveImage(imageUrl, prompt, generationParams = null) {
    if (!imageUrl || !prompt.trim()) return;

    try {
      isSaving = true;
      await imageStorage.saveImage(imageUrl, prompt, generationParams);
      await loadSavedImages();
      await generateAllImageUrls();
      error = "";
    } catch (/** @type {any} */ err) {
      error = `Failed to save image: ${err.message}`;
    } finally {
      isSaving = false;
    }
  }

  /**
   * Delete a saved image from storage
   * @param {string} imageId - The ID of the image to delete
   */
  async function deleteImage(imageId) {
    try {
      await imageStorage.deleteSavedImage(imageId);

      // Clean up object URL if it exists
      if (imageUrls[imageId]) {
        URL.revokeObjectURL(imageUrls[imageId]);
        delete imageUrls[imageId];
      }

      await loadSavedImages();
      error = "";
    } catch (/** @type {any} */ err) {
      error = `Failed to delete image: ${err.message}`;
    }
  }

  /**
   * Download a saved image
   * @param {string} imageId - The ID of the image to download
   * @param {string} filename - The filename to use for download
   */
  async function downloadImage(imageId, filename) {
    try {
      await imageStorage.downloadSavedImage(imageId, filename);
      error = "";
    } catch (/** @type {any} */ err) {
      error = `Failed to download image: ${err.message}`;
    }
  }

  /**
   * Update LRU access order for an image
   * @param {string} imageId - The ID of the image
   */
  function updateAccessOrder(imageId) {
    // Remove from current position
    const index = urlAccessOrder.indexOf(imageId);
    if (index > -1) {
      urlAccessOrder.splice(index, 1);
    }
    // Add to end (most recently used)
    urlAccessOrder.push(imageId);
  }

  /**
   * Evict least recently used URLs if cache is full
   * Only evicts URLs that are not currently referenced
   */
  function evictLRUUrls() {
    console.log("evictLRUUrls", urlAccessOrder.length, MAX_CACHED_URLS, "ref counts:", Object.keys(urlRefCounts).length);
    
    if (urlAccessOrder.length <= MAX_CACHED_URLS) return;
    
    // Find unreferenced URLs to evict
    const toEvict = [];
    for (let i = 0; i < urlAccessOrder.length && toEvict.length < (urlAccessOrder.length - MAX_CACHED_URLS); i++) {
      const imageId = urlAccessOrder[i];
      if (urlRefCounts[imageId] === 0) {
        toEvict.push(imageId);
      }
    }
    
    // Evict the unreferenced URLs
    for (const imageId of toEvict) {
      const url = imageUrls[imageId];
      if (url) {
        console.log("revoking LRU url for", imageId);
        URL.revokeObjectURL(url);
        delete imageUrls[imageId];
        delete urlRefCounts[imageId];
        
        const index = urlAccessOrder.indexOf(imageId);
        if (index > -1) {
          urlAccessOrder.splice(index, 1);
        }
      }
    }
  }

  /**
   * Get or create object URL for an image with reference counting, retry logic, and LRU cache
   * @param {string} imageId - The ID of the image
   * @param {number} [retryCount=0] - Current retry attempt
   * @returns {Promise<string | null>}
   */
  async function getImageUrl(imageId, retryCount = 0) {
    try {
      // Return cached URL if available and increment reference count
      if (imageUrls[imageId]) {
        urlRefCounts[imageId] = (urlRefCounts[imageId] || 0) + 1;
        updateAccessOrder(imageId);
        return imageUrls[imageId];
      }
      
      // Create new Object URL from blob
      const url = await imageStorage.getImageObjectURL(imageId);
      if (url) {
        imageUrls[imageId] = url;
        urlRefCounts[imageId] = 1;
        updateAccessOrder(imageId);
        
        // Evict old URLs if cache is full
        evictLRUUrls();
        
        return url;
      }
      
      return null;
    } catch (/** @type {any} */ err) {
      console.warn(`Failed to get image URL for ${imageId} (attempt ${retryCount + 1}):`, err);
      
      // Retry with exponential backoff (max 2 retries)
      if (retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 500; // 500ms, 1s, 2s
        await new Promise(resolve => setTimeout(resolve, delay));
        return getImageUrl(imageId, retryCount + 1);
      }
      
      error = `Failed to get image URL after ${retryCount + 1} attempts: ${err.message}`;
      return null;
    }
  }

  /**
   * Release reference to an Object URL
   * @param {string} imageId - The ID of the image
   */
  function releaseImageUrl(imageId) {
    if (!urlRefCounts[imageId]) return;
    
    urlRefCounts[imageId]--;
    console.log("Released reference for", imageId, "new count:", urlRefCounts[imageId]);
    
    // Immediately clean up when no more references
    if (urlRefCounts[imageId] <= 0) {
      const url = imageUrls[imageId];
      if (url) {
        console.log("Immediately revoking URL for", imageId);
        URL.revokeObjectURL(url);
        delete imageUrls[imageId];
        delete urlRefCounts[imageId];
        
        const index = urlAccessOrder.indexOf(imageId);
        if (index > -1) {
          urlAccessOrder.splice(index, 1);
        }
      }
    }
  }

  async function generateAllImageUrls() {
    for (const image of savedImages) {
      if (!imageUrls[image.id]) {
        await getImageUrl(image.id);
      }
    }
  }

  /**
   * Clean up all object URLs (call on destroy)
   */
  function cleanupImageUrls() {
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
    
    for (const url of Object.values(imageUrls)) {
      URL.revokeObjectURL(url);
    }
    Object.keys(imageUrls).forEach((key) => delete imageUrls[key]);
    Object.keys(urlRefCounts).forEach((key) => delete urlRefCounts[key]);
    urlAccessOrder.splice(0, urlAccessOrder.length);
  }

  /**
   * Force cleanup of unreferenced URLs
   */
  function forceCleanupUnreferenced() {
    console.log("Force cleanup of unreferenced URLs");
    const toCleanup = [];
    
    for (const [imageId, refCount] of Object.entries(urlRefCounts)) {
      if (refCount === 0) {
        toCleanup.push(imageId);
      }
    }
    
    for (const imageId of toCleanup) {
      const url = imageUrls[imageId];
      if (url) {
        console.log("Force cleaning up", imageId);
        URL.revokeObjectURL(url);
        delete imageUrls[imageId];
        delete urlRefCounts[imageId];
        
        const index = urlAccessOrder.indexOf(imageId);
        if (index > -1) {
          urlAccessOrder.splice(index, 1);
        }
      }
    }
  }

  /**
   * Clean up URLs for specific images (when they're removed from saved images)
   * @param {string[]} imageIds - Array of image IDs to clean up
   */
  function cleanupSpecificUrls(imageIds) {
    for (const imageId of imageIds) {
      const url = imageUrls[imageId];
      if (url) {
        URL.revokeObjectURL(url);
        delete imageUrls[imageId];
        delete urlRefCounts[imageId];
        
        // Remove from access order
        const index = urlAccessOrder.indexOf(imageId);
        if (index > -1) {
          urlAccessOrder.splice(index, 1);
        }
      }
    }
  }

  /**
   * Download an image from URL
   * @param {string} imageUrl - The URL of the image to download
   * @param {string} filename - The filename for the download
   */
  function downloadImageFromUrl(imageUrl, filename) {
    if (imageUrl) {
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = filename || `image-${Date.now()}.png`;
      link.click();
    }
  }

  /**
   * Generate a better filename from prompt
   * @param {string} prompt - The full prompt
   * @param {number} timestamp - Timestamp for uniqueness
   * @returns {string} - Generated filename
   */
  function generateBetterFilename(prompt, timestamp) {
    // Take first 40 chars, remove special chars, replace spaces with underscores
    const sanitized = prompt.substring(0, 40)
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase()
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
    
    return sanitized ? `${sanitized}_${timestamp}.png` : `image_${timestamp}.png`;
  }

  /**
   * Create metadata JSON content
   * @param {SavedImage} savedImage - The saved image data
   * @returns {string} - JSON string for metadata file
   */
  function createMetadataJson(savedImage) {
    const metadata = {
      prompt: savedImage.prompt,
      generationParams: savedImage.generationParams || {},
      metadata: {
        timestamp: savedImage.timestamp,
        imageId: savedImage.id,
        originalUrl: savedImage.url,
        filename: savedImage.filename
      }
    };
    
    return JSON.stringify(metadata, null, 2);
  }

  /**
   * Download metadata as JSON file
   * @param {string} content - JSON content
   * @param {string} filename - Base filename (without extension)
   */
  function downloadMetadata(content, filename) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.replace(/\.(png|jpg|jpeg)$/i, '.json');
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Enhanced download with options
   * @param {string} imageId - The ID of the image to download
   * @param {'image' | 'metadata' | 'both'} downloadType - What to download
   */
  async function downloadWithMetadata(imageId, downloadType = 'image') {
    try {
      // Find the saved image data
      const savedImage = savedImages.find(img => img.id === imageId);
      if (!savedImage) {
        throw new Error('Image not found');
      }

      // Generate better filename
      const filename = generateBetterFilename(savedImage.prompt, savedImage.timestamp);
      
      if (downloadType === 'image' || downloadType === 'both') {
        // Download the image
        await imageStorage.downloadSavedImage(imageId, filename);
      }
      
      if (downloadType === 'metadata' || downloadType === 'both') {
        // Download metadata JSON
        const metadataContent = createMetadataJson(savedImage);
        downloadMetadata(metadataContent, filename);
      }
      
      error = "";
    } catch (/** @type {any} */ err) {
      error = `Failed to download: ${err.message}`;
    }
  }

  // Auto-load saved images on initialization
  loadSavedImages();

  // No periodic cleanup needed - we clean up immediately when refs drop to 0

  /**
   * Open image preview window
   * @param {string} imageUrl - URL of the image to preview
   * @param {Object} [options={}] - Preview options
   * @param {string} [options.imageId] - Optional ID of saved image
   * @param {string} [options.title] - Optional window title
   * @param {string} [options.prompt] - Optional prompt text for title
   */
  async function previewImage(imageUrl, options = {}) {
    const { imageId, title, prompt } = options;
    const { default: ImagePreviewController } = await import('$lib/windows/image-preview/ImagePreviewController.svelte.js');
    ImagePreviewController.openImagePreviewWindow({
      imageUrl,
      imageId,
      title,
      prompt
    });
  }

  return {
    get savedImages() {
      return savedImages;
    },
    get error() {
      return error;
    },
    get isLoading() {
      return isLoading;
    },
    get isSaving() {
      return isSaving;
    },
    get imageUrls() {
      return imageUrls;
    },
    saveImage,
    deleteImage,
    downloadImage,
    getImageUrl,
    generateAllImageUrls,
    cleanupImageUrls,
    cleanupSpecificUrls,
    forceCleanupUnreferenced,
    releaseImageUrl,
    downloadImageFromUrl,
    downloadWithMetadata,
    previewImage,
  };
}

export const imageManager = createImageManager();
