/**
 * Video Storage Manager - Handles video storage using IndexedDB for blobs and localStorage for metadata
 * Similar to image-storage but optimized for video files
 */

const DB_NAME = 'CeleryManVideos';
const DB_VERSION = 1;
const STORE_NAME = 'videos';
const METADATA_KEY = 'video-metadata';

/** @typedef {Object} SavedVideo
 * @property {string} id - Unique identifier for the video
 * @property {string} prompt - Text prompt used to generate the video
 * @property {string} model - Model used for generation
 * @property {string} mode - "text-to-video" or "image-to-video"
 * @property {string} filename - Original filename
 * @property {number} timestamp - Creation timestamp
 * @property {Object} parameters - Generation parameters (resolution, duration, etc.)
 * @property {string} [referenceImageId] - ID of reference image if image-to-video
 */

/**
 * Open IndexedDB connection
 * @returns {Promise<IDBDatabase>}
 */
async function openVideoDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Generate unique ID for video
 * @returns {string}
 */
function generateVideoId() {
  return `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convert video URL to blob
 * @param {string} videoUrl - Video URL to convert
 * @returns {Promise<Blob>}
 */
async function urlToBlob(videoUrl) {
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch video: ${response.statusText}`);
  }
  return response.blob();
}

/**
 * Create the video storage manager
 */
function createVideoStorage() {
  /**
   * Save a video to storage
   * @param {string} videoUrl - URL of the video to save
   * @param {string} prompt - Text prompt used to generate the video
   * @param {string} model - Model used for generation
   * @param {string} mode - Generation mode ("text-to-video" or "image-to-video")
   * @param {Object} parameters - Generation parameters
   * @param {string} [referenceImageId] - Reference image ID if image-to-video
   * @returns {Promise<string>} - The ID of the saved video
   */
  async function saveVideo(videoUrl, prompt, model, mode, parameters, referenceImageId = null) {
    try {
      const videoId = generateVideoId();
      const timestamp = Date.now();
      const filename = `${mode}_${timestamp}.mp4`;
      
      // Convert URL to blob
      const blob = await urlToBlob(videoUrl);
      
      // Save blob to IndexedDB
      const db = await openVideoDatabase();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      await new Promise((resolve, reject) => {
        const request = store.put({
          id: videoId,
          blob: blob,
          timestamp: timestamp
        });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      // Save metadata to localStorage
      const metadata = {
        id: videoId,
        prompt,
        model,
        mode,
        filename,
        timestamp,
        parameters,
        referenceImageId,
        size: blob.size,
        type: blob.type || 'video/mp4'
      };
      
      const existingMetadata = getSavedVideosMetadata();
      existingMetadata.push(metadata);
      localStorage.setItem(METADATA_KEY, JSON.stringify(existingMetadata));
      
      console.log(`Video saved: ${videoId}`);
      return videoId;
      
    } catch (error) {
      console.error('Failed to save video:', error);
      throw error;
    }
  }

  /**
   * Get all saved video metadata
   * @returns {SavedVideo[]}
   */
  function getSavedVideosMetadata() {
    try {
      const stored = localStorage.getItem(METADATA_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load video metadata:', error);
      return [];
    }
  }

  /**
   * Get video blob from IndexedDB
   * @param {string} videoId - ID of the video
   * @returns {Promise<Blob|null>}
   */
  async function getVideoBlob(videoId) {
    try {
      const db = await openVideoDatabase();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      return new Promise((resolve, reject) => {
        const request = store.get(videoId);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.blob : null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get video blob:', error);
      return null;
    }
  }

  /**
   * Get video object URL for playback
   * @param {string} videoId - ID of the video
   * @returns {Promise<string|null>}
   */
  async function getVideoObjectURL(videoId) {
    const blob = await getVideoBlob(videoId);
    return blob ? URL.createObjectURL(blob) : null;
  }

  /**
   * Download a saved video
   * @param {string} videoId - ID of the video to download
   * @param {string} filename - Filename for download
   * @returns {Promise<void>}
   */
  async function downloadVideo(videoId, filename) {
    try {
      const objectURL = await getVideoObjectURL(videoId);
      if (!objectURL) {
        throw new Error('Video not found');
      }
      
      const link = document.createElement('a');
      link.href = objectURL;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up object URL
      URL.revokeObjectURL(objectURL);
      
    } catch (error) {
      console.error('Failed to download video:', error);
      throw error;
    }
  }

  /**
   * Delete a saved video
   * @param {string} videoId - ID of the video to delete
   * @returns {Promise<void>}
   */
  async function deleteVideo(videoId) {
    try {
      // Remove from IndexedDB
      const db = await openVideoDatabase();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      await new Promise((resolve, reject) => {
        const request = store.delete(videoId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      // Remove from metadata
      const existingMetadata = getSavedVideosMetadata();
      const filteredMetadata = existingMetadata.filter(video => video.id !== videoId);
      localStorage.setItem(METADATA_KEY, JSON.stringify(filteredMetadata));
      
      console.log(`Video deleted: ${videoId}`);
      
    } catch (error) {
      console.error('Failed to delete video:', error);
      throw error;
    }
  }

  /**
   * Get total storage usage
   * @returns {Promise<{count: number, totalSize: number}>}
   */
  async function getStorageInfo() {
    try {
      const metadata = getSavedVideosMetadata();
      const totalSize = metadata.reduce((sum, video) => sum + (video.size || 0), 0);
      
      return {
        count: metadata.length,
        totalSize: totalSize
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return { count: 0, totalSize: 0 };
    }
  }

  /**
   * Clear all saved videos
   * @returns {Promise<void>}
   */
  async function clearAllVideos() {
    try {
      // Clear IndexedDB
      const db = await openVideoDatabase();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      // Clear metadata
      localStorage.removeItem(METADATA_KEY);
      
      console.log('All videos cleared');
      
    } catch (error) {
      console.error('Failed to clear videos:', error);
      throw error;
    }
  }

  return {
    saveVideo,
    getSavedVideosMetadata,
    getVideoBlob,
    getVideoObjectURL,
    downloadVideo,
    deleteVideo,
    getStorageInfo,
    clearAllVideos
  };
}

// Export singleton instance
export const videoStorage = createVideoStorage();