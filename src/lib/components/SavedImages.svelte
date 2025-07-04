<script>
  import { imageManager } from "$lib/image-manager.svelte.js";
  import { onDestroy } from "svelte";
  let { savedImages, error = $bindable(), generatedImage = $bindable() } = $props();

  /**
   * Generate object URLs for all saved images
   * @param {Array<SavedImage>} savedImages - The saved images to generate object URLs for
   * @returns {Promise<void>}
   */
  async function generateObjectUrls(savedImages) {
    for (const image of savedImages) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await imageManager.getImageUrl(image.id);
    }
  }

  $effect(() => {
    generateObjectUrls(savedImages);
  });

  onDestroy(() => {
    imageManager.cleanupImageUrls();
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
</script>

<div class="p-1 border-t border-gray-500 h-full">
  <h3 class="m-0 mb-2 text-base font-bold text-black">Saved Images ({savedImages.length})</h3>
  <div class="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 max-h-0 overflow-y- bg-red-300 h-full">
    {#each savedImages as savedImage (savedImage.id)}
      <div class="border border-inset border-gray-500 bg-gray-300 p-2 flex flex-col gap-1">
        <button
          class="w-full h-30 bg-gray-200 border border-inset border-gray-500 flex items-center justify-center cursor-pointer text-2xl p-0 font-sans hover:bg-gray-300"
          onclick={() => loadSavedImagePreview(savedImage.id)}
          aria-label="Load saved image: {savedImage.prompt.substring(0, 50)}"
        >
          <div>
            <img src={imageManager.imageUrls[savedImage.id] || "favicon.svg"} alt="Saved generation thumbnail" class="" />
          </div>
        </button>
        <div class="text-base text-black">
          <div class="font-bold mb-0.5 leading-tight" title={savedImage.prompt}>
            {savedImage.prompt.length > 30 ? savedImage.prompt.substring(0, 30) + "..." : savedImage.prompt}
          </div>
          <div class="text-gray-600 mb-1">
            {new Date(savedImage.timestamp).toLocaleDateString()}
          </div>

          <div class="flex gap-2">
            <button
              class="w-4 h-4 border border-outset border-gray-300 bg-gray-300 text-black text-base cursor-pointer flex items-center justify-center p-0 leading-none hover:bg-gray-400 active:border-inset"
              onclick={() => imageManager.downloadImage(savedImage.id, savedImage.filename)}
              title="Download"
            >
              ⬇
            </button>
            <button
              class="w-4 h-4 border border-outset border-gray-300 bg-gray-300 text-black text-base cursor-pointer flex items-center justify-center p-0 leading-none hover:bg-red-200 active:border-inset"
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
