<script>
  import falApi, { models } from "$lib/fal-api.svelte.js";
  import { imageManager } from "$lib/image-manager.svelte.js";

  /** @type {Model} */
  let model = $state(models.flux_kontext_pro)
  let prompt = $state("");
  let seed = $state("");
  let aspectRatio = $state("16:9");
  let outputFormat = $state("jpeg");
  let numImages = $state(1);
  let enableSafetyChecker = $state(false);
  let safetyTolerance = $state("6");
  let raw = $state(false);
  let isGenerating = $state(false);
  /** @type {string | null} */
  let generatedImage = $state(null);
  let error = $state("");
  
  // Image input state
  /** @type {string | null} */
  let referenceImageUrl = $state(null);
  /** @type {File | null} */
  let selectedFile = $state(null);
  let isDragOver = $state(false);

  const aspectRatios = ["21:9", "16:9", "4:3", "3:2", "1:1", "2:3", "3:4", "9:16", "9:21"];
  const outputFormats = ["jpeg", "png"];
  const safetyTolerances = ["1", "2", "3", "4", "5", "6"];
  const acceptedFileTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/avif"];
  
  const modelOptions = [
    { key: "flux_pro_1_1_ultra", value: models.flux_pro_1_1_ultra, label: "FLUX Pro 1.1 Ultra", description: "High-quality text-to-image generation" },
    { key: "flux_kontext_pro", value: models.flux_kontext_pro, label: "FLUX Kontext Pro", description: "Text-to-image + image editing capabilities" }
  ];

  /**
   * Convert file to base64 data URI
   * @param {File} file - The file to convert
   * @returns {Promise<string>} - Base64 data URI
   */
  async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file as string'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Handle file selection
   * @param {Event} event - File input change event
   */
  async function handleFileSelect(event) {
    const target = /** @type {HTMLInputElement} */ (event.target);
    const file = target.files?.[0];
    if (file) {
      await processFile(file);
    }
  }

  /**
   * Process selected file
   * @param {File} file - The selected file
   */
  async function processFile(file) {
    if (!acceptedFileTypes.includes(file.type)) {
      error = "Please select a valid image file (JPG, PNG, WebP, GIF, AVIF)";
      return;
    }

    try {
      selectedFile = file;
      referenceImageUrl = await fileToBase64(file);
      error = "";
    } catch (err) {
      error = "Failed to process image file";
      console.error("File processing error:", err);
    }
  }

  /**
   * Clear selected reference image
   */
  function clearReferenceImage() {
    selectedFile = null;
    referenceImageUrl = null;
    // Reset file input
    const fileInput = /** @type {HTMLInputElement} */ (document.getElementById("reference-image-input"));
    if (fileInput) fileInput.value = "";
  }

  /**
   * Handle drag and drop events
   * @param {DragEvent} event - Drag event
   */
  function handleDragOver(event) {
    event.preventDefault();
    isDragOver = true;
  }

  /**
   * @param {DragEvent} event - Drag event
   */
  function handleDragLeave(event) {
    event.preventDefault();
    isDragOver = false;
  }

  /**
   * @param {DragEvent} event - Drop event
   */
  async function handleDrop(event) {
    event.preventDefault();
    isDragOver = false;
    
    // Check for image URL data (from gallery drag)
    const imageUrl = event.dataTransfer?.getData('text/uri-list') || event.dataTransfer?.getData('text/plain');
    
    if (imageUrl && (imageUrl.startsWith('http') || imageUrl.startsWith('blob:') || imageUrl.startsWith('data:'))) {
      // Handle dragged image URL from gallery
      try {
        referenceImageUrl = imageUrl;
        selectedFile = null; // Clear file since we're using a URL
        error = "";
      } catch (err) {
        error = "Failed to use dragged image";
        console.error("Image URL error:", err);
      }
      return;
    }
    
    // Handle file drops
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  }

  async function generateImage() {
    if (!prompt.trim()) return;

    isGenerating = true;
    error = "";
    generatedImage = null;

    try {
      const options = {
        prompt,
        aspect_ratio: aspectRatio,
        output_format: outputFormat,
        num_images: numImages,
        enable_safety_checker: enableSafetyChecker,
        safety_tolerance: safetyTolerance,
        raw,
        seed: seed.trim() ? parseInt(seed) : Math.floor(Math.random() * 1000000),
      };

      // Add image_url if reference image is provided (works with any model that supports it)
      if (referenceImageUrl) {
        options.image_url = referenceImageUrl;
      }

      const imageUrl = await falApi.generateFluxImage(model, options);
      if (imageUrl) {
        generatedImage = imageUrl;
        await imageManager.saveImage(imageUrl, prompt);
      } else {
        error = "Failed to generate image";
      }
    } catch (/** @type {*} */ err) {
      error = `Error: ${err.message}`;
    } finally {
      isGenerating = false;
    }
  }

  /**
   * Handle key press event
   * @param {KeyboardEvent} event - The key press event
   */
  function handleKeyPress(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      generateImage();
    }
  }

  function downloadImage() {
    if (generatedImage) {
      const link = document.createElement("a");
      link.href = generatedImage;
      link.download = `fluxor-${Date.now()}.png`;
      link.click();
    }
  }
</script>

<div class="flex flex-col h-full font-sans bg-gray-300 text-black">
  <div class="p-3 border-b border-gray-500 bg-gray-300">
    <h2 class="m-0 text-2xl font-bold text-black">Fluxor - AI Image Generator</h2>
    <p class="mt-1 mb-0 text-lg text-gray-600">Powered by FLUX PRO 1.1 Ultra</p>
  </div>

  <div class="p-4 border-b border-gray-500">
    <!-- Reference Image Input Section -->
    <div class="mb-4">
      <label class="block mb-2 text-lg font-bold">
        Reference Image (optional):
      </label>
      <div 
        class="border-2 border-dashed border-gray-400 rounded p-4 text-center cursor-pointer transition-colors {isDragOver ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-600'}"
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
        onclick={() => document.getElementById('reference-image-input')?.click()}
      >
        {#if referenceImageUrl}
          <div class="relative">
            <img src={referenceImageUrl} alt="Reference" class="max-w-full max-h-32 mx-auto border border-gray-500 rounded" />
            <button 
              class="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full hover:bg-red-600 flex items-center justify-center"
              onclick={clearReferenceImage}
              title="Remove image"
            >
              ×
            </button>
            <p class="mt-2 text-sm text-gray-600">{selectedFile?.name}</p>
          </div>
        {:else}
          <div class="py-8">
            <div class="text-4xl mb-2">📁</div>
            <p class="text-base text-gray-600 mb-1">Drag & drop an image here, or click to select</p>
            <p class="text-sm text-gray-500">Supports: JPG, PNG, WebP, GIF, AVIF</p>
            <p class="text-sm text-blue-600 mt-2">💡 You can also drag images from the gallery!</p>
          </div>
        {/if}
      </div>
      <input 
        id="reference-image-input"
        type="file" 
        accept="image/*"
        class="hidden"
        onchange={handleFileSelect}
      />
    </div>

    <label for="prompt-input" class="block mb-2 text-lg font-bold">Enter your prompt:</label>
    <textarea
      id="prompt-input"
      class="w-full h-24 border border-gray-500 p-3 text-lg font-sans resize-y bg-white text-black box-border disabled:bg-gray-200 disabled:text-gray-600"
      bind:value={prompt}
      placeholder="Describe the image you want to generate..."
      onkeypress={handleKeyPress}
      disabled={isGenerating}
    ></textarea>

    <div class="grid grid-cols-3 gap-3 mt-3">
      <div>
        <label for="model-select" class="block mb-1 text-base font-bold">Model:</label>
        <select id="model-select" class="w-full border border-gray-500 p-2 text-base bg-white text-black" bind:value={model}>
          {#each modelOptions as modelOption}
            <option value={modelOption.value}>{modelOption.label}</option>
          {/each}
        </select>
        <p class="text-xs text-gray-600 mt-1">
          {modelOptions.find(m => m.value === model)?.description || ""}
        </p>
      </div>

      <div>
        <label for="aspect-ratio" class="block mb-1 text-base font-bold">Aspect Ratio:</label>
        <select id="aspect-ratio" class="w-full border border-gray-500 p-2 text-base bg-white text-black" bind:value={aspectRatio}>
          {#each aspectRatios as ratio}
            <option value={ratio}>{ratio}</option>
          {/each}
        </select>
      </div>

      <div>
        <label for="output-format" class="block mb-1 text-base font-bold">Format:</label>
        <select id="output-format" class="w-full border border-gray-500 p-2 text-base bg-white text-black" bind:value={outputFormat}>
          {#each outputFormats as format}
            <option value={format}>{format.toUpperCase()}</option>
          {/each}
        </select>
      </div>

      <div>
        <label for="seed" class="block mb-1 text-base font-bold">Seed (optional):</label>
        <input id="seed" type="number" class="w-full border border-gray-500 p-2 text-base bg-white text-black" bind:value={seed} placeholder="Random">
      </div>

      <div>
        <label for="safety-tolerance" class="block mb-1 text-base font-bold">Safety Level:</label>
        <select id="safety-tolerance" class="w-full border border-gray-500 p-2 text-base bg-white text-black" bind:value={safetyTolerance}>
          {#each safetyTolerances as tolerance}
            <option value={tolerance}>{tolerance}</option>
          {/each}
        </select>
      </div>

      <div class="flex items-center">
        <label class="flex items-center text-base font-bold">
          <input type="checkbox" class="mr-2" bind:checked={enableSafetyChecker}>
          Safety Checker
        </label>
      </div>

      <div class="flex items-center">
        <label class="flex items-center text-base font-bold">
          <input type="checkbox" class="mr-2" bind:checked={raw}>
          Raw (Natural)
        </label>
      </div>
    </div>

    <div class="flex gap-2 mt-4 items-center">
      <button
        class="px-4 py-2 border border-gray-400 bg-gray-300 text-black text-lg font-bold cursor-pointer font-sans disabled:bg-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed btn-outset"
        onclick={generateImage}
        disabled={isGenerating || !prompt.trim()}
      >
        {isGenerating ? "Generating..." : "Generate Image"}
      </button>

      {#if generatedImage}
        <button class="px-3 py-2 border border-gray-400 bg-gray-300 text-black text-lg cursor-pointer font-sans btn-outset" onclick={downloadImage}>Download</button>
      {/if}
    </div>
  </div>

  {#if error}
    <div class="p-3 bg-red-100 border border-red-600 text-red-600 text-lg mx-3 my-2">
      ⚠️ {error}
    </div>
  {/if}

  {#if isGenerating}
    <div class="flex flex-col items-center p-6 text-center">
      <div class="w-10 h-10 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-3"></div>
      <p class="m-0 text-lg text-black">Generating your image... This may take a moment.</p>
    </div>
  {/if}

  <div class="flex-1 overflow-auto flex flex-col">
    {#if generatedImage}
      <div class="p-4 text-center flex items-center justify-center">
        <button 
          class="border-0 p-0 bg-transparent cursor-pointer"
          onclick={() => generatedImage && imageManager.previewImage(generatedImage, { prompt, title: "Generated Image" })}
          title="Click to view full size"
        >
          <img src={generatedImage} alt="" class="max-w-full max-h-75 border border-gray-500 shadow-lg bg-white hover:opacity-90 transition-opacity" />
        </button>
      </div>
    {/if}
  </div>
</div>
