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
   */
  async function saveImage(imageUrl, prompt) {
    if (!imageUrl || !prompt.trim()) return;

    try {
      isSaving = true;
      await imageStorage.saveImage(imageUrl, prompt);
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
   * Get or create object URL for an image
   * @param {string} imageId - The ID of the image
   * @returns {Promise<string | null>}
   */
  async function getImageUrl(imageId) {
    try {
      if (imageUrls[imageId]) {
        return imageUrls[imageId];
      }
      if (!imageUrls[imageId]) {
        const url = await imageStorage.getImageObjectURL(imageId);
        if (url) {
          imageUrls[imageId] = url;
          return url;
        }
      }
      return null;
    } catch (/** @type {any} */ err) {
      error = `Failed to get image URL: ${err.message}`;
      return null;
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
    for (const url of Object.values(imageUrls)) {
      URL.revokeObjectURL(url);
    }
    Object.keys(imageUrls).forEach((key) => delete imageUrls[key]);
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

  // Auto-load saved images on initialization
  loadSavedImages();

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
    downloadImageFromUrl,
  };
}

export const imageManager = createImageManager();
