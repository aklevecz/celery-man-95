<script>
  import { imageManager } from "$lib/image-manager.svelte.js";

  /** @type {{ imageUrl: string, imageId?: string, title?: string }} */
  let { imageUrl, imageId, title = "Image Preview" } = $props();

  function downloadImage() {
    if (imageId) {
      // Download saved image using image manager
      const savedImage = imageManager.savedImages.find(img => img.id === imageId);
      if (savedImage) {
        imageManager.downloadImage(imageId, savedImage.filename);
      }
    } else {
      // Download current image URL
      imageManager.downloadImageFromUrl(imageUrl, `image-${Date.now()}.png`);
    }
  }
</script>

<div class="flex flex-col h-full bg-gray-300 text-black font-sans">
  <div class="p-3 border-b border-gray-500 bg-gray-300 flex justify-between items-center">
    <div>
      <h2 class="m-0 text-lg font-bold text-black">{title}</h2>
      {#if imageId}
        <p class="mt-0 mb-0 text-sm text-gray-600">Saved Image</p>
      {/if}
    </div>
    <button 
      class="px-3 py-1 border border-gray-400 bg-gray-300 text-black text-base cursor-pointer font-sans btn-outset"
      onclick={downloadImage}
    >
      Download
    </button>
  </div>

  <div class="flex-1 overflow-auto bg-gray-200 flex items-center justify-center p-4">
    <img 
      src={imageUrl} 
      alt="Full size preview" 
      class="max-w-full max-h-full object-contain border border-gray-500 shadow-lg bg-white"
    />
  </div>
</div>