<script>
  import { imageManager } from "$lib/image-manager.svelte.js";
  import { geminiApi } from "$lib/gemini-api.svelte.js";
  import { onDestroy } from "svelte";
  import UpscalerController from "$lib/windows/upscaler/UpscalerController.svelte.js";
  let { savedImages, error = $bindable(), generatedImage = $bindable(), onDescribeImage = $bindable() } = $props();

  // Batch selection state
  /** @type {Set<string>} */
  let selectedImages = $state(new Set());
  /** @type {boolean} */
  let isBatchMode = $state(false);
  /** @type {boolean} */
  let isBatchDownloading = $state(false);

  /** @type {IntersectionObserver | null} */
  let intersectionObserver = null;

  /** @type {Set<string>} */
  let loadedImages = new Set();

  /**
   * Generate object URLs for visible saved images using Intersection Observer
   * @param {Array<SavedImage>} savedImages - The saved images to observe
   * @returns {void}
   */
  function setupLazyLoading(savedImages) {
    // Clean up existing observer
    if (intersectionObserver) {
      intersectionObserver.disconnect();
    }

    // Create new observer for lazy loading
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(async (entry) => {
          if (entry.isIntersecting) {
            const imageId = entry.target.getAttribute("data-image-id");
            if (imageId && !loadedImages.has(imageId)) {
              loadedImages.add(imageId);
              await imageManager.getImageUrl(imageId);
              // Stop observing this element
              intersectionObserver?.unobserve(entry.target);
            }
          }
        });
      },
      {
        rootMargin: "50px", // Start loading 50px before the image becomes visible
        threshold: 0.1,
      }
    );

    // Observe all image containers
    setTimeout(() => {
      const imageContainers = document.querySelectorAll("[data-image-id]");
      imageContainers.forEach((container) => {
        intersectionObserver?.observe(container);
      });
    }, 0);
  }

  $effect(() => {
    if (savedImages.length > 0) {
      setupLazyLoading(savedImages);
    }
  });

  onDestroy(() => {
    // Clean up intersection observer
    if (intersectionObserver) {
      intersectionObserver.disconnect();
    }

    // Release references for all images this component was using
    for (const image of loadedImages) {
      imageManager.releaseImageUrl(image);
    }

    // URLs are now cleaned up immediately when references drop to 0
  });

  /**
   * Delete a saved image from storage
   * Removes both the blob and metadata, then refreshes the saved images list
   * @param {string} imageId - The ID of the image to delete
   * @returns {Promise<void>}
   */
  async function deleteSavedImage(imageId) {
    await imageManager.deleteImage(imageId);
  }

  /**
   * Load a saved image for preview in the main display area
   * Creates an object URL from the stored blob and displays it
   * @param {string} imageId - The ID of the saved image to load
   * @returns {Promise<void>}
   */
  async function loadSavedImagePreview(imageId) {
    const objectURL = await imageManager.getImageUrl(imageId);
    if (objectURL) {
      generatedImage = objectURL;
      error = "";
    }
  }

  /**
   * Open full-size preview window for a saved image
   * @param {string} imageId - The ID of the saved image
   * @param {SavedImage} savedImage - The saved image metadata
   */
  async function openImagePreview(imageId, savedImage) {
    const objectURL = await imageManager.getImageUrl(imageId);
    if (objectURL) {
      await imageManager.previewImage(objectURL, {
        imageId,
        prompt: savedImage.prompt,
        title: savedImage.prompt.length > 30 ? `${savedImage.prompt.substring(0, 30)}...` : savedImage.prompt,
      });
    }
  }

  /**
   * Handle drag start for images
   * @param {DragEvent} event - Drag event
   * @param {string} imageId - The ID of the image being dragged
   */
  async function handleDragStart(event, imageId) {
    const objectURL = await imageManager.getImageUrl(imageId);
    if (objectURL && event.dataTransfer) {
      // Set the image URL for drag and drop
      event.dataTransfer.setData("text/uri-list", objectURL);
      event.dataTransfer.setData("text/plain", objectURL);
      event.dataTransfer.effectAllowed = "copy";
    }
  }

  /**
   * Describe a saved image using Gemini Vision
   * @param {string} imageId - The ID of the saved image
   */
  async function describeSavedImage(imageId) {
    const objectURL = await imageManager.getImageUrl(imageId);
    if (objectURL && onDescribeImage) {
      onDescribeImage(objectURL);
    }
  }

  /**
   * Toggle batch mode
   */
  function toggleBatchMode() {
    isBatchMode = !isBatchMode;
    if (!isBatchMode) {
      selectedImages.clear();
    }
  }

  /**
   * Toggle image selection
   * @param {string} imageId - The ID of the image
   */
  function toggleImageSelection(imageId) {
    if (selectedImages.has(imageId)) {
      selectedImages.delete(imageId);
    } else {
      selectedImages.add(imageId);
    }
    selectedImages = selectedImages; // Trigger reactivity
  }

  /**
   * Select all images
   */
  function selectAllImages() {
    selectedImages = new Set(savedImages.map(img => img.id));
  }

  /**
   * Clear all selections
   */
  function clearAllSelections() {
    selectedImages.clear();
    selectedImages = selectedImages; // Trigger reactivity
  }

  /**
   * Batch download selected images
   * @param {'image' | 'metadata' | 'both'} downloadType - What to download
   */
  async function batchDownloadSelected(downloadType) {
    if (selectedImages.size === 0) return;
    
    isBatchDownloading = true;
    try {
      await imageManager.batchDownload(Array.from(selectedImages), downloadType);
      selectedImages.clear();
      selectedImages = selectedImages; // Trigger reactivity
    } catch (err) {
      console.error('Batch download failed:', err);
    } finally {
      isBatchDownloading = false;
    }
  }
</script>

<div class="p-1 border-t border-gray-500 h-full">
  <div class="flex justify-between items-center mb-2">
    <h3 class="m-0 text-base font-bold text-black">Saved Images ({savedImages.length})</h3>
    
    <!-- Batch mode toggle -->
    <button
      class="px-2 py-1 text-xs border border-gray-400 bg-gray-300 text-black cursor-pointer btn-outset hover:bg-gray-400 {isBatchMode ? 'bg-blue-300' : ''}"
      onclick={toggleBatchMode}
      title="Toggle batch selection mode"
    >
      {isBatchMode ? '✅ Batch' : '📦 Batch'}
    </button>
  </div>

  <!-- Batch controls (shown when in batch mode) -->
  {#if isBatchMode}
    <div class="mb-2 p-2 bg-gray-200 border border-gray-400">
      <div class="flex flex-wrap gap-1 items-center text-xs">
        <span class="font-bold">Selected: {selectedImages.size}</span>
        
        <button
          class="px-1 py-0.5 border border-gray-400 bg-gray-300 text-black cursor-pointer btn-outset hover:bg-gray-400"
          onclick={selectAllImages}
          title="Select all images"
        >
          All
        </button>
        
        <button
          class="px-1 py-0.5 border border-gray-400 bg-gray-300 text-black cursor-pointer btn-outset hover:bg-gray-400"
          onclick={clearAllSelections}
          title="Clear selection"
        >
          None
        </button>
        
        {#if selectedImages.size > 0}
          <span class="text-gray-600">|</span>
          
          <button
            class="px-1 py-0.5 border border-gray-400 bg-green-300 text-black cursor-pointer btn-outset hover:bg-green-400 disabled:bg-gray-400 disabled:cursor-not-allowed"
            onclick={() => batchDownloadSelected('image')}
            disabled={isBatchDownloading}
            title="Download selected images"
          >
            {isBatchDownloading ? '⏳' : '📥'} Images
          </button>
          
          <button
            class="px-1 py-0.5 border border-gray-400 bg-green-300 text-black cursor-pointer btn-outset hover:bg-green-400 disabled:bg-gray-400 disabled:cursor-not-allowed"
            onclick={() => batchDownloadSelected('both')}
            disabled={isBatchDownloading}
            title="Download selected images + metadata"
          >
            {isBatchDownloading ? '⏳' : '📦'} All
          </button>
        {/if}
      </div>
    </div>
  {/if}
  
  <div class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 overflow-y-auto h-full">
    {#each savedImages as savedImage (savedImage.id)}
      <div class="border border-inset border-gray-500 bg-gray-300 p-2 flex flex-col gap-1 relative" data-image-id={savedImage.id}>
        <!-- Batch mode checkbox overlay -->
        {#if isBatchMode}
          <div 
            class="absolute top-1 left-1 w-6 h-6 z-10 cursor-pointer"
            role="button"
            tabindex="0"
            onclick={() => toggleImageSelection(savedImage.id)}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleImageSelection(savedImage.id);
              }
            }}
          >
            <div class="w-6 h-6 border-2 border-white bg-black bg-opacity-50 flex items-center justify-center text-white text-sm font-bold">
              {selectedImages.has(savedImage.id) ? '✓' : ''}
            </div>
          </div>
        {/if}
        
        <button
          class="w-full aspect-square bg-gray-200 border border-inset border-gray-500 flex items-center justify-center cursor-pointer text-2xl p-0 font-sans hover:bg-gray-300 {selectedImages.has(savedImage.id) ? 'ring-2 ring-blue-500' : ''}"
          onclick={() => isBatchMode ? toggleImageSelection(savedImage.id) : loadSavedImagePreview(savedImage.id)}
          ondblclick={() => !isBatchMode && openImagePreview(savedImage.id, savedImage)}
          aria-label="Click to load, double-click to preview full size: {savedImage.prompt.substring(0, 50)}"
          title="{isBatchMode ? 'Click to select/deselect' : 'Click: Load to main view | Double-click: Open full size preview | Drag: Use as reference image'}"
          draggable={!isBatchMode ? "true" : "false"}
          ondragstart={(event) => !isBatchMode && handleDragStart(event, savedImage.id)}
        >
          <div>
            <img src={imageManager.imageUrls[savedImage.id] || "favicon.svg"} alt="Saved generation thumbnail" class="w-full h-full object-cover" draggable="false" />
          </div>
        </button>
        <div class="text-base text-black">
          <div class="font-bold mb-0.5 leading-tight" title={savedImage.prompt}>
            {savedImage.prompt.length > 30 ? savedImage.prompt.substring(0, 30) + "..." : savedImage.prompt}
          </div>
          <div class="text-gray-600 mb-1">
            {new Date(savedImage.timestamp).toLocaleDateString()}
          </div>

          <div class="flex gap-1">
            <button
              class="w-4 h-4 border border-outset border-gray-300 bg-gray-300 text-black text-xs cursor-pointer flex items-center justify-center p-0 leading-none hover:bg-blue-200 active:border-inset"
              onclick={() => openImagePreview(savedImage.id, savedImage)}
              title="Preview Full Size"
            >
              👁
            </button>
            <div class="relative inline-block">
              <select
                class="w-4 h-4 text-xs border border-outset border-gray-300 bg-gray-300 text-black cursor-pointer hover:bg-gray-400 active:border-inset appearance-none text-center p-0"
                onchange={(event) => {
                  const target = /** @type {HTMLSelectElement} */ (event.target);
                  const value = /** @type {'image' | 'metadata' | 'both'} */ (target.value);
                  if (value) {
                    imageManager.downloadWithMetadata(savedImage.id, value);
                    target.value = ''; // Reset selection
                  }
                }}
                title="Download Options"
              >
                <option value="">⬇</option>
                <option value="image">Image Only</option>
                <option value="metadata">Metadata Only</option>
                <option value="both">Image + Metadata</option>
              </select>
            </div>
            <button
              class="w-4 h-4 border border-outset border-gray-300 bg-gray-300 text-black text-xs cursor-pointer flex items-center justify-center p-0 leading-none hover:bg-green-200 active:border-inset"
              onclick={() => UpscalerController.openUpscalerWindow()}
              title="Upscale Image"
            >
              🔍
            </button>
            {#if geminiApi.isAvailable() && onDescribeImage}
              <button
                class="w-4 h-4 border border-outset border-gray-300 bg-gray-300 text-black text-xs cursor-pointer flex items-center justify-center p-0 leading-none hover:bg-blue-200 active:border-inset disabled:bg-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed"
                onclick={() => describeSavedImage(savedImage.id)}
                disabled={geminiApi.isGenerating}
                title="Describe Image"
              >
                🤖
              </button>
            {/if}
            <button
              class="w-4 h-4 border border-outset border-gray-300 bg-gray-300 text-black text-xs cursor-pointer flex items-center justify-center p-0 leading-none hover:bg-red-200 active:border-inset"
              onclick={() => deleteSavedImage(savedImage.id)}
              title="Delete"
            >
              🗑
            </button>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>
