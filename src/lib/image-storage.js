const DB_NAME = "FluxorImageDB";
const DB_VERSION = 1;
const STORE_NAME = "images";
const METADATA_KEY = "saved_images";

/** @type {IDBDatabase | null} */
let db = null;

/**
 * Initialize IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    /** @param {IDBVersionChangeEvent} event */
    request.onupgradeneeded = (event) => {
      /** @type {IDBDatabase} */
      const database = /** @type {IDBRequest} */ (event.target).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

/**
 * Convert image URL to blob
 * @param {string} imageUrl - Image URL to fetch
 * @returns {Promise<Blob>}
 */
async function urlToBlob(imageUrl) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  return await response.blob();
}

/**
 * Save image to IndexedDB and metadata to localStorage
 * @param {string} imageUrl - Image URL to save
 * @param {string} prompt - The prompt used to generate this image
 * @returns {Promise<string>} - Returns the saved image ID
 */
async function saveImage(imageUrl, prompt) {
  try {
    await initDB();

    // Generate unique ID
    const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    const filename = `fluxor_${timestamp}.png`;

    // Convert URL to blob
    const blob = await urlToBlob(imageUrl);

    // Save blob to IndexedDB
    if (!db) throw new Error("Database not initialized");
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    await new Promise((resolve, reject) => {
      const request = store.put({ id, blob });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Save metadata to localStorage
    /** @type {SavedImage} */
    const metadata = {
      id,
      prompt: prompt.substring(0, 200), // Limit prompt length
      url: imageUrl,
      timestamp,
      filename,
    };

    const savedImages = getSavedImagesMetadata();
    savedImages.unshift(metadata); // Add to beginning of array

    // Keep only last 50 images
    if (savedImages.length > 50) {
      const removed = savedImages.splice(50);
      // Clean up old blobs from IndexedDB
      for (const oldImage of removed) {
        await deleteImageBlob(oldImage.id);
      }
    }

    localStorage.setItem(METADATA_KEY, JSON.stringify(savedImages));

    return id;
  } catch (error) {
    console.error("Failed to save image:", error);
    throw error;
  }
}

/**
 * Get saved images metadata from localStorage
 * @returns {SavedImage[]}
 */
function getSavedImagesMetadata() {
  try {
    const saved = localStorage.getItem(METADATA_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Failed to get saved images metadata:", error);
    return [];
  }
}

/**
 * Get image blob from IndexedDB
 * @param {string} imageId - Image ID to retrieve
 * @returns {Promise<Blob|null>}
 */
async function getImageBlob(imageId) {
  try {
    await initDB();
    if (!db) throw new Error("Database not initialized");

    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(imageId);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.blob : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to get image blob:", error);
    return null;
  }
}

/**
 * Create object URL from saved image
 * @param {string} imageId - Image ID to retrieve
 * @returns {Promise<string|null>}
 */
async function getImageObjectURL(imageId) {
  const blob = await getImageBlob(imageId);
  return blob ? URL.createObjectURL(blob) : null;
}

/**
 * Delete image blob from IndexedDB
 * @param {string} imageId - Image ID to delete
 * @returns {Promise<boolean>}
 */
async function deleteImageBlob(imageId) {
  try {
    await initDB();
    if (!db) throw new Error("Database not initialized");

    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(imageId);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to delete image blob:", error);
    return false;
  }
}

/**
 * Delete saved image (both metadata and blob)
 * @param {string} imageId - Image ID to delete
 * @returns {Promise<boolean>}
 */
async function deleteSavedImage(imageId) {
  try {
    // Remove from localStorage metadata
    const savedImages = getSavedImagesMetadata();
    const updatedImages = savedImages.filter((img) => img.id !== imageId);
    localStorage.setItem(METADATA_KEY, JSON.stringify(updatedImages));

    // Remove blob from IndexedDB
    await deleteImageBlob(imageId);

    return true;
  } catch (error) {
    console.error("Failed to delete saved image:", error);
    return false;
  }
}

/**
 * Download saved image
 * @param {string} imageId - Image ID to download
 * @param {string} filename - Filename for download
 * @returns {Promise<boolean>}
 */
async function downloadSavedImage(imageId, filename) {
  /** @type {string | null} */
  let tempObjectURL = null;
  try {
    // Create a temporary Object URL just for downloading
    tempObjectURL = await getImageObjectURL(imageId);
    if (!tempObjectURL) return false;

    const link = document.createElement("a");
    link.href = tempObjectURL;
    link.download = filename;
    link.click();

    return true;
  } catch (error) {
    console.error("Failed to download saved image:", error);
    return false;
  } finally {
    // Always clean up the temporary Object URL
    if (tempObjectURL && typeof tempObjectURL === "string") {
      // @ts-ignore
      setTimeout(() => URL.revokeObjectURL(tempObjectURL), 100);
    }
  }
}

/**
 * Clear all saved images
 * @returns {Promise<boolean>}
 */
async function clearAllSavedImages() {
  try {
    // Clear localStorage metadata
    localStorage.removeItem(METADATA_KEY);

    // Clear IndexedDB
    await initDB();
    if (!db) throw new Error("Database not initialized");

    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to clear all saved images:", error);
    return false;
  }
}

export default {
  saveImage,
  getSavedImagesMetadata,
  getImageBlob,
  getImageObjectURL,
  deleteSavedImage,
  downloadSavedImage,
  clearAllSavedImages,
};
