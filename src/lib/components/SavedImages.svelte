<script>
  import { imageManager } from "$lib/image-manager.svelte.js";
  import { onDestroy } from "svelte";
  let { savedImages, error = $bindable(), generatedImage = $bindable() } = $props();

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
            const imageId = entry.target.getAttribute('data-image-id');
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
        rootMargin: '50px', // Start loading 50px before the image becomes visible
        threshold: 0.1
      }
    );

    // Observe all image containers
    setTimeout(() => {
      const imageContainers = document.querySelectorAll('[data-image-id]');
      imageContainers.forEach(container => {
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
      event.dataTransfer.setData('text/uri-list', objectURL);
      event.dataTransfer.setData('text/plain', objectURL);
      event.dataTransfer.effectAllowed = 'copy';
    }
  }
</script>

<div class="p-1 border-t border-gray-500 h-full">
  <h3 class="m-0 mb-2 text-base font-bold text-black">Saved Images ({savedImages.length})</h3>
  <div class="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 max-h-0 overflow-y- bg-red-300 h-full">
    {#each savedImages as savedImage (savedImage.id)}
      <div class="border border-inset border-gray-500 bg-gray-300 p-2 flex flex-col gap-1" data-image-id={savedImage.id}>
        <button
          class="w-full h-30 bg-gray-200 border border-inset border-gray-500 flex items-center justify-center cursor-pointer text-2xl p-0 font-sans hover:bg-gray-300"
          onclick={() => loadSavedImagePreview(savedImage.id)}
          ondblclick={() => openImagePreview(savedImage.id, savedImage)}
          aria-label="Click to load, double-click to preview full size: {savedImage.prompt.substring(0, 50)}"
          title="Click: Load to main view | Double-click: Open full size preview | Drag: Use as reference image"
          draggable="true"
          ondragstart={(event) => handleDragStart(event, savedImage.id)}
        >
          <div>
            <img src={imageManager.imageUrls[savedImage.id] || "favicon.svg"} alt="Saved generation thumbnail" class="" draggable="false" />
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
            <button
              class="w-4 h-4 border border-outset border-gray-300 bg-gray-300 text-black text-xs cursor-pointer flex items-center justify-center p-0 leading-none hover:bg-gray-400 active:border-inset"
              onclick={() => imageManager.downloadImage(savedImage.id, savedImage.filename)}
              title="Download"
            >
              ⬇
            </button>
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
