<script>
  import { videoStorage } from "$lib/video-storage.svelte.js";
  import { onDestroy } from "svelte";
  
  let { savedVideos, error = $bindable(), currentVideo = $bindable() } = $props();

  /** @type {Set<string>} */
  let loadedVideos = new Set();

  /** @type {Map<string, string>} */
  let videoObjectUrls = new Map();

  onDestroy(() => {
    // Clean up all object URLs when component is destroyed
    for (const url of videoObjectUrls.values()) {
      URL.revokeObjectURL(url);
    }
    videoObjectUrls.clear();
  });

  /**
   * Get video object URL for preview (with caching)
   * @param {string} videoId - ID of the video
   * @returns {Promise<string|null>}
   */
  async function getVideoPreviewUrl(videoId) {
    if (videoObjectUrls.has(videoId)) {
      return videoObjectUrls.get(videoId);
    }

    try {
      const objectURL = await videoStorage.getVideoObjectURL(videoId);
      if (objectURL) {
        videoObjectUrls.set(videoId, objectURL);
        return objectURL;
      }
      return null;
    } catch (err) {
      console.error('Failed to get video preview URL:', err);
      return null;
    }
  }

  /**
   * Delete a saved video from storage
   * @param {string} videoId - The ID of the video to delete
   * @returns {Promise<void>}
   */
  async function deleteSavedVideo(videoId) {
    if (!confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      // Clean up object URL if exists
      const url = videoObjectUrls.get(videoId);
      if (url) {
        URL.revokeObjectURL(url);
        videoObjectUrls.delete(videoId);
      }

      await videoStorage.deleteVideo(videoId);
      
      // Refresh the saved videos list by removing the deleted video
      savedVideos = savedVideos.filter(video => video.id !== videoId);
      
    } catch (/** @type {*} */ err) {
      error = `Failed to delete video: ${err.message}`;
    }
  }

  /**
   * Load a saved video for preview in the main display area
   * @param {string} videoId - The ID of the saved video to load
   * @returns {Promise<void>}
   */
  async function loadSavedVideoPreview(videoId) {
    try {
      const objectURL = await getVideoPreviewUrl(videoId);
      if (objectURL) {
        currentVideo = objectURL;
        error = "";
      }
    } catch (/** @type {*} */ err) {
      error = `Failed to load video: ${err.message}`;
    }
  }

  /**
   * Download a saved video
   * @param {string} videoId - The ID of the saved video
   * @param {string} filename - The filename to use for download
   * @returns {Promise<void>}
   */
  async function downloadSavedVideo(videoId, filename) {
    try {
      await videoStorage.downloadVideo(videoId, filename);
    } catch (/** @type {*} */ err) {
      error = `Failed to download video: ${err.message}`;
    }
  }

  /**
   * Handle video thumbnail click with preview loading
   * @param {string} videoId - The ID of the video
   * @param {HTMLVideoElement} videoElement - The video element
   */
  async function handleVideoClick(videoId, videoElement) {
    if (!loadedVideos.has(videoId)) {
      const previewUrl = await getVideoPreviewUrl(videoId);
      if (previewUrl && videoElement) {
        videoElement.src = previewUrl;
        loadedVideos.add(videoId);
      }
    }
    
    // Load for main preview
    await loadSavedVideoPreview(videoId);
  }

  /**
   * Format file size for display
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size string
   */
  function formatFileSize(bytes) {
    if (!bytes) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  /**
   * Get display text for generation mode
   * @param {string} mode - Generation mode
   * @returns {string} Display text
   */
  function getModeDisplay(mode) {
    switch (mode) {
      case 'text-to-video': return 'Text→Video';
      case 'image-to-video': return 'Image→Video';
      default: return mode;
    }
  }

  /**
   * Handle drag start for videos
   * @param {DragEvent} event - Drag event
   * @param {string} videoId - The ID of the video being dragged
   */
  async function handleDragStart(event, videoId) {
    const objectURL = await getVideoPreviewUrl(videoId);
    if (objectURL && event.dataTransfer) {
      // Set the video URL for drag and drop
      event.dataTransfer.setData("text/uri-list", objectURL);
      event.dataTransfer.setData("text/plain", objectURL);
      event.dataTransfer.effectAllowed = "copy";
    }
  }
</script>

<div class="p-1 border-t border-gray-500 h-full">
  <h3 class="m-0 mb-2 text-base font-bold text-black">Saved Videos ({savedVideos.length})</h3>
  
  {#if savedVideos.length === 0}
    <div class="text-center py-8 text-gray-600">
      <div class="text-4xl mb-2">🎬</div>
      <p class="text-base">No saved videos yet</p>
      <p class="text-sm">Generate videos in Cinemator to see them here</p>
    </div>
  {:else}
    <div class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 h-full overflow-y-auto">
      {#each savedVideos as savedVideo (savedVideo.id)}
        <div class="border border-gray-500 bg-gray-300 p-2 flex flex-col gap-2">
          <!-- Video Preview Thumbnail -->
          <div class="relative">
            <button 
              class="w-full h-24 bg-gray-200 border border-gray-500 flex items-center justify-center cursor-pointer text-2xl font-sans hover:bg-gray-300 btn-outset relative overflow-hidden"
              onclick={(event) => {
                const videoElement = event.currentTarget.querySelector('video');
                handleVideoClick(savedVideo.id, videoElement);
              }}
              title="Click: Preview video | Drag: Use in video upscaler"
              draggable="true"
              ondragstart={(event) => handleDragStart(event, savedVideo.id)}
            >
              <!-- Video element for thumbnail (hidden initially) -->
              <video 
                class="absolute inset-0 w-full h-full object-cover hidden"
                muted
                preload="metadata"
                onloadedmetadata={(event) => {
                  const video = event.currentTarget;
                  video.classList.remove('hidden');
                  video.currentTime = 0.1; // Show first frame
                }}
              ></video>
              
              <!-- Fallback icon -->
              <div class="text-3xl text-gray-600">🎬</div>
              
              <!-- Play overlay -->
              <div class="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <div class="text-white text-2xl">▶️</div>
              </div>
            </button>
          </div>
          
          <!-- Video Information -->
          <div class="text-sm text-black">
            <!-- Prompt -->
            <div class="font-bold mb-1 leading-tight" title={savedVideo.prompt}>
              {savedVideo.prompt.length > 50 ? savedVideo.prompt.substring(0, 50) + '...' : savedVideo.prompt}
            </div>
            
            <!-- Technical Details -->
            <div class="text-xs text-gray-600 mb-1">
              <div>{getModeDisplay(savedVideo.mode)}</div>
              <div>{savedVideo.parameters?.resolution || 'Unknown'} • {savedVideo.parameters?.duration || '?'}s</div>
              <div>{formatFileSize(savedVideo.size)}</div>
            </div>
            
            <!-- Date -->
            <div class="text-xs text-gray-600 mb-2">
              {new Date(savedVideo.timestamp).toLocaleDateString()}
            </div>
            
            <!-- Action Buttons -->
            <div class="flex gap-1">
              <button 
                class="flex-1 px-2 py-1 border border-gray-400 bg-gray-300 text-black text-xs cursor-pointer btn-outset hover:bg-blue-200"
                onclick={() => loadSavedVideoPreview(savedVideo.id)}
                title="Preview video"
              >
                👁 Preview
              </button>
              <button 
                class="px-2 py-1 border border-gray-400 bg-gray-300 text-black text-xs cursor-pointer btn-outset hover:bg-gray-400"
                onclick={() => downloadSavedVideo(savedVideo.id, savedVideo.filename)}
                title="Download video"
              >
                ⬇
              </button>
              <button 
                class="px-2 py-1 border border-gray-400 bg-red-200 text-black text-xs cursor-pointer btn-outset hover:bg-red-300"
                onclick={() => deleteSavedVideo(savedVideo.id)}
                title="Delete video"
              >
                🗑
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>