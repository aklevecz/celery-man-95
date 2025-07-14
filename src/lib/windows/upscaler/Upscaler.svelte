<script>
  import falApi, { models } from "$lib/fal-api.svelte.js";
  import { imageManager } from "$lib/image-manager.svelte.js";

  /** @type {Model} */
  let model = $state(models.clarity_upscaler);
  let scaleFactor = $state(2);
  let enhanceFace = $state(false);
  let reduceNoise = $state(true);
  let isUpscaling = $state(false);
  /** @type {string | null} */
  let originalImage = $state(null);
  /** @type {string | null} */
  let upscaledImage = $state(null);
  let error = $state("");
  
  // Image input state
  /** @type {string | null} */
  let inputImageUrl = $state(null);
  /** @type {File | null} */
  let selectedFile = $state(null);
  let isDragOver = $state(false);

  const scaleFactors = [2, 4, 6, 8];
  const acceptedFileTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/avif"];
  
  const modelOptions = [
    { key: "clarity_upscaler", value: models.clarity_upscaler, label: "Clarity Upscaler", description: "High-quality image upscaling with clarity enhancement" },
    { key: "esrgan", value: models.esrgan, label: "ESRGAN", description: "Enhanced Super-Resolution GAN for photo-realistic upscaling" },
    { key: "creative_upscaler", value: models.creative_upscaler, label: "Creative Upscaler", description: "Artistic upscaling with creative enhancement" },
    { key: "aura_sr", value: models.aura_sr, label: "AuraSR", description: "Advanced super-resolution with high fidelity" },
    { key: "fooocus_upscale", value: models.fooocus_upscale, label: "Fooocus Upscale", description: "Upscale and variation with advanced options" }
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
   * Handle file input change
   * @param {Event} event - File input change event
   */
  async function handleFileInput(event) {
    const target = event.target;
    if (target?.files && target.files.length > 0) {
      const file = target.files[0];
      
      if (!acceptedFileTypes.includes(file.type)) {
        error = `Unsupported file type. Please use: ${acceptedFileTypes.join(', ')}`;
        return;
      }
      
      selectedFile = file;
      try {
        const base64 = await fileToBase64(file);
        inputImageUrl = base64;
        originalImage = base64;
        upscaledImage = null;
        error = "";
      } catch (e) {
        error = "Failed to process image file";
        console.error("File processing error:", e);
      }
    }
  }

  /**
   * Handle drag over event
   * @param {DragEvent} event - Drag event
   */
  function handleDragOver(event) {
    event.preventDefault();
    isDragOver = true;
  }

  /**
   * Handle drag leave event
   * @param {DragEvent} event - Drag event
   */
  function handleDragLeave(event) {
    event.preventDefault();
    isDragOver = false;
  }

  /**
   * Handle drop event
   * @param {DragEvent} event - Drop event
   */
  async function handleDrop(event) {
    event.preventDefault();
    isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      if (!acceptedFileTypes.includes(file.type)) {
        error = `Unsupported file type. Please use: ${acceptedFileTypes.join(', ')}`;
        return;
      }
      
      selectedFile = file;
      try {
        const base64 = await fileToBase64(file);
        inputImageUrl = base64;
        originalImage = base64;
        upscaledImage = null;
        error = "";
      } catch (e) {
        error = "Failed to process dropped image";
        console.error("Drop processing error:", e);
      }
    }
    
    // Also check for URL drops from image gallery
    const urls = event.dataTransfer?.getData('text/uri-list') || event.dataTransfer?.getData('text/plain');
    if (urls && urls.startsWith('blob:')) {
      try {
        // Convert blob URL to base64
        const response = await fetch(urls);
        const blob = await response.blob();
        const file = new File([blob], 'image.jpg', { type: blob.type });
        const base64 = await fileToBase64(file);
        inputImageUrl = base64;
        originalImage = base64;
        upscaledImage = null;
        error = "";
      } catch (e) {
        error = "Failed to process dropped image from gallery";
        console.error("Gallery drop processing error:", e);
      }
    }
  }

  /**
   * Remove the selected image
   */
  function removeImage() {
    selectedFile = null;
    inputImageUrl = null;
    originalImage = null;
    upscaledImage = null;
    error = "";
  }

  /**
   * Generate upscaled image
   */
  async function generateUpscaledImage() {
    if (!inputImageUrl) {
      error = "Please select an image first";
      return;
    }

    isUpscaling = true;
    error = "";
    
    try {
      const options = {
        image_url: inputImageUrl,
        scale_factor: scaleFactor,
        enhance_face: enhanceFace,
        reduce_noise: reduceNoise,
      };

      console.log("Starting upscaling with options:", options);
      
      const result = await falApi.generateUpscaledImage(model, options);
      
      if (result) {
        upscaledImage = result;
        
        // Save the upscaled image
        const timestamp = Date.now();
        const filename = `upscaled_${scaleFactor}x_${timestamp}.jpg`;
        await imageManager.saveImage(result, filename);
        // await imageManager.saveImageFromUrl(result, filename, {
        //   prompt: `Upscaled ${scaleFactor}x using ${modelOptions.find(m => m.value === model)?.label || model}`,
        //   model: model,
        //   seed: null,
        //   originalImage: originalImage,
        //   scaleFactor: scaleFactor,
        //   enhanceFace: enhanceFace,
        //   reduceNoise: reduceNoise,
        // });
        
        console.log("Upscaled image saved successfully");
      }
    } catch (e) {
      error = e.message || "Failed to upscale image";
      console.error("Upscaling error:", e);
    } finally {
      isUpscaling = false;
    }
  }

  /**
   * Download the upscaled image
   */
  async function downloadUpscaledImage() {
    if (!upscaledImage) return;
    
    try {
      const response = await fetch(upscaledImage);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `upscaled_${scaleFactor}x_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download error:", e);
      error = "Failed to download upscaled image";
    }
  }
</script>

<div class="flex flex-col h-full font-sans bg-gray-300 text-black">
  <!-- Header -->
  <div class="p-3 border-b border-gray-500 bg-gray-300">
    <h2 class="m-0 text-xl font-bold text-black">Image Upscaler</h2>
    <p class="mt-1 mb-0 text-sm text-gray-600">Enhance image quality with AI upscaling</p>
  </div>

  <!-- Main Content -->
  <div class="flex-1 flex gap-4 p-4 overflow-hidden">
    <!-- Left Panel: Controls -->
    <div class="w-80 flex flex-col gap-4 overflow-auto">
      <!-- Model Selection -->
      <div class="bg-gray-200 border border-gray-500 p-3">
        <h3 class="text-sm font-bold text-black mb-2">Model</h3>
        <select 
          class="w-full border border-gray-500 p-2 text-sm bg-white text-black"
          bind:value={model}
        >
          {#each modelOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
        <p class="text-xs text-gray-600 mt-1">
          {modelOptions.find(m => m.value === model)?.description || ""}
        </p>
      </div>

      <!-- Image Input -->
      <div class="bg-gray-200 border border-gray-500 p-3">
        <h3 class="text-sm font-bold text-black mb-2">Input Image</h3>
        
        <!-- Dropzone -->
        <div 
          class="border-2 border-dashed border-gray-400 p-4 text-center cursor-pointer hover:border-blue-500 transition-colors {isDragOver ? 'border-blue-500 bg-blue-50' : 'bg-white'}"
          role="button"
          tabindex="0"
          ondragover={handleDragOver}
          ondragleave={handleDragLeave}
          ondrop={handleDrop}
          onclick={() => document.getElementById('file-input')?.click()}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              document.getElementById('file-input')?.click();
            }
          }}
        >
          {#if inputImageUrl}
            <div class="relative">
              <img src={inputImageUrl} alt="Input" class="max-w-full max-h-32 mx-auto" />
              <button 
                class="absolute top-0 right-0 w-6 h-6 bg-red-500 text-white border-0 cursor-pointer text-xs flex items-center justify-center"
                onclick={removeImage}
                title="Remove image"
              >
                ×
              </button>
            </div>
          {:else}
            <div class="text-gray-500">
              <div class="text-2xl mb-2">📁</div>
              <p class="text-sm">Click or drag image here</p>
              <p class="text-xs">Supports: JPG, PNG, WebP, GIF, AVIF</p>
            </div>
          {/if}
        </div>
        
        <input 
          id="file-input"
          type="file" 
          accept={acceptedFileTypes.join(',')}
          class="hidden"
          onchange={handleFileInput}
        />
      </div>

      <!-- Upscaling Options -->
      <div class="bg-gray-200 border border-gray-500 p-3">
        <h3 class="text-sm font-bold text-black mb-2">Options</h3>
        
        <!-- Scale Factor -->
        <div class="mb-3">
          <label class="block text-sm font-bold text-black mb-1" for="scale-factor">Scale Factor</label>
          <select 
            id="scale-factor"
            class="w-full border border-gray-500 p-2 text-sm bg-white text-black"
            bind:value={scaleFactor}
          >
            {#each scaleFactors as factor}
              <option value={factor}>{factor}x</option>
            {/each}
          </select>
        </div>

        <!-- Face Enhancement -->
        <div class="mb-3">
          <label class="flex items-center text-sm font-bold text-black">
            <input 
              type="checkbox" 
              class="mr-2"
              bind:checked={enhanceFace}
            />
            Enhance Face
          </label>
          <p class="text-xs text-gray-600">Improve facial details and features</p>
        </div>

        <!-- Noise Reduction -->
        <div class="mb-3">
          <label class="flex items-center text-sm font-bold text-black">
            <input 
              type="checkbox" 
              class="mr-2"
              bind:checked={reduceNoise}
            />
            Reduce Noise
          </label>
          <p class="text-xs text-gray-600">Remove artifacts and noise</p>
        </div>
      </div>

      <!-- Generate Button -->
      <button
        class="w-full px-4 py-3 border border-gray-400 bg-gray-300 text-black text-sm font-bold cursor-pointer btn-outset hover:bg-gray-400 disabled:bg-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed"
        onclick={generateUpscaledImage}
        disabled={isUpscaling || !inputImageUrl}
      >
        {isUpscaling ? 'Upscaling...' : 'Upscale Image'}
      </button>
    </div>

    <!-- Right Panel: Preview -->
    <div class="flex-1 bg-gray-200 border border-gray-500 p-3 overflow-auto">
      <h3 class="text-sm font-bold text-black mb-2">Preview</h3>
      
      {#if error}
        <div class="bg-red-100 border border-red-300 text-red-600 p-3 mb-3 text-sm">
          ❌ {error}
        </div>
      {/if}

      {#if isUpscaling}
        <div class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="text-4xl mb-2">⏳</div>
            <p class="text-sm text-gray-600">Upscaling image...</p>
          </div>
        </div>
      {:else if upscaledImage}
        <div class="space-y-4">
          <!-- Comparison View -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#if originalImage}
              <div>
                <h4 class="text-sm font-bold text-black mb-1">Original</h4>
                <img src={originalImage} alt="Original" class="max-w-full border border-gray-400" />
              </div>
            {/if}
            <div>
              <h4 class="text-sm font-bold text-black mb-1">Upscaled ({scaleFactor}x)</h4>
              <img src={upscaledImage} alt="Upscaled" class="max-w-full border border-gray-400" />
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <button
              class="px-3 py-2 border border-gray-400 bg-gray-300 text-black text-sm font-bold cursor-pointer btn-outset hover:bg-gray-400"
              onclick={downloadUpscaledImage}
            >
              Download
            </button>
          </div>
        </div>
      {:else if originalImage}
        <div class="text-center">
          <img src={originalImage} alt="Original" class="max-w-full max-h-96 mx-auto border border-gray-400" />
          <p class="text-sm text-gray-600 mt-2">Ready to upscale</p>
        </div>
      {:else}
        <div class="flex items-center justify-center h-64">
          <div class="text-center text-gray-500">
            <div class="text-4xl mb-2">🖼️</div>
            <p class="text-sm">Upload an image to get started</p>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>