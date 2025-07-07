<script>
  import falApi, { models } from "$lib/fal-api.svelte.js";
  import { imageManager } from "$lib/image-manager.svelte.js";
  import { geminiApi } from "$lib/gemini-api.svelte.js";
  import { 
    fileToReferenceImage, 
    stitchImages, 
    cleanupImageUrls,
    getImageDimensions 
  } from "$lib/image-utils.js";

  /**
   * @typedef {'21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16'} AspectRatio
   * @typedef {'jpeg' | 'png'} OutputFormat
   * @typedef {'1' | '2' | '3' | '4' | '5' | '6'} SafetyTolerance
   * @typedef {'horizontal' | 'vertical' | 'grid'} StitchMode
   * 
   * @typedef {Object} ReferenceImage
   * @property {string} id - Unique identifier
   * @property {File | null} file - Original file object
   * @property {string} url - Image URL (data URI or blob URL)
   * @property {string} name - Display name
   * @property {number} width - Image width
   * @property {number} height - Image height
   * 
   * @typedef {Object} ImageGenerationOptions
   * @property {string} prompt - The text prompt for image generation
   * @property {string} [image_url] - Optional reference image URL for image-to-image generation
   * @property {number} [seed] - The seed for reproducible results
   * @property {number} [num_images] - Number of images to generate (1-4)
   * @property {AspectRatio} [aspect_ratio] - Aspect ratio of the image
   * @property {OutputFormat} [output_format] - Output format
   * @property {boolean} [enable_safety_checker] - Enable safety checker
   * @property {SafetyTolerance} [safety_tolerance] - Safety tolerance level
   * @property {boolean} [raw] - Generate less processed images
   * @property {number} [guidance_scale] - Controls how closely the model follows the prompt
   * @property {number} [num_inference_steps] - Number of inference steps (1-50)
   */

  /** @type {Model} */
  let model = $state(models.flux_kontext_pro);
  /** @type {string} */
  let prompt = $state("");
  /** @type {string} */
  let seed = $state("");
  /** @type {AspectRatio} */
  let aspectRatio = $state("16:9");
  /** @type {OutputFormat} */
  let outputFormat = $state("jpeg");
  /** @type {number} */
  let numImages = $state(1);
  /** @type {boolean} */
  let enableSafetyChecker = $state(false);
  /** @type {SafetyTolerance} */
  let safetyTolerance = $state("6");
  /** @type {boolean} */
  let raw = $state(false);
  /** @type {boolean} */
  let isGenerating = $state(false);
  /** @type {string | null} */
  let generatedImage = $state(null);
  /** @type {string} */
  let error = $state("");

  // Image input state
  /** @type {ReferenceImage[]} */
  let referenceImages = $state([]);
  /** @type {string | null} */
  let compositeImageUrl = $state(null);
  /** @type {boolean} */
  let isDragOver = $state(false);
  /** @type {StitchMode} */
  let stitchMode = $state('horizontal');
  /** @type {boolean} */
  let isGeneratingComposite = $state(false);
  /** @type {boolean} */
  let useMultipleImages = $state(false);
  
  // Legacy single image support
  /** @type {string | null} */
  let referenceImageUrl = $state(null);
  /** @type {File | null} */
  let selectedFile = $state(null);

  // Random prompt generation state
  /** @type {string} */
  let scenePremise = $state("");
  /** @type {'detailed' | 'artistic' | 'realistic' | 'cinematic'} */
  let promptStyle = $state('detailed');
  /** @type {boolean} */
  let appendMode = $state(false);
  /** @type {boolean} */
  let showRandomPromptSection = $state(false);

  // Image description state
  /** @type {'prompt' | 'artistic' | 'technical'} */
  let imageDescriptionStyle = $state('prompt');
  /** @type {boolean} */
  let imageAppendMode = $state(false);

  /** @type {AspectRatio[]} */
  const aspectRatios = ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"];
  /** @type {OutputFormat[]} */
  const outputFormats = ["jpeg", "png"];
  /** @type {SafetyTolerance[]} */
  const safetyTolerances = ["1", "2", "3", "4", "5", "6"];
  const acceptedFileTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/avif"];
  
  /** @type {StitchMode[]} */
  const stitchModes = ['horizontal', 'vertical', 'grid'];
  
  const stitchModeLabels = {
    horizontal: 'Side by Side',
    vertical: 'Top to Bottom', 
    grid: 'Grid Layout'
  };

  /** @type {Array<{key: string, value: string, label: string, description: string}>} */
  const modelOptions = [
    { key: "flux_pro_1_1_ultra", value: models.flux_pro_1_1_ultra, label: "FLUX Pro 1.1 Ultra", description: "High-quality text-to-image generation" },
    { key: "flux_kontext_pro", value: models.flux_kontext_pro, label: "FLUX Kontext Pro", description: "Text-to-image + image editing capabilities" },
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
        if (typeof result === "string") {
          resolve(result);
        } else {
          reject(new Error("Failed to read file as string"));
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
    const files = target.files;
    if (files && files.length > 0) {
      if (useMultipleImages) {
        await processMultipleFiles(Array.from(files));
      } else {
        await processFile(files[0]);
      }
    }
  }

  /**
   * Process selected file (single image mode)
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
   * Process multiple selected files
   * @param {File[]} files - Array of selected files
   */
  async function processMultipleFiles(files) {
    try {
      error = "";
      
      // Filter valid image files
      const validFiles = files.filter(file => acceptedFileTypes.includes(file.type));
      
      if (validFiles.length === 0) {
        error = "Please select valid image files (JPG, PNG, WebP, GIF, AVIF)";
        return;
      }
      
      if (validFiles.length !== files.length) {
        error = `Skipped ${files.length - validFiles.length} invalid file(s)`;
      }
      
      // Convert files to ReferenceImage objects
      const newImages = await Promise.all(
        validFiles.map(file => fileToReferenceImage(file))
      );
      
      referenceImages = [...referenceImages, ...newImages];
      
      // Clear single image state when using multiple
      selectedFile = null;
      referenceImageUrl = null;
      
    } catch (err) {
      error = "Failed to process image files";
      console.error("File processing error:", err);
    }
  }

  /**
   * Clear selected reference image(s)
   * @param {Event} [event] - Click event to prevent bubbling
   */
  function clearReferenceImage(event) {
    // Prevent the click from bubbling up to the parent dropzone
    if (event) {
      event.stopPropagation();
    }

    // Clear single image
    selectedFile = null;
    referenceImageUrl = null;
    
    // Clear multiple images
    cleanupImageUrls(referenceImages);
    referenceImages = [];
    compositeImageUrl = null;
    
    // Reset file input
    const fileInput = /** @type {HTMLInputElement} */ (document.getElementById("reference-image-input"));
    if (fileInput) fileInput.value = "";
  }
  
  /**
   * Remove a specific image from the reference images array
   * @param {string} imageId - ID of the image to remove
   */
  function removeReferenceImage(imageId) {
    const imageIndex = referenceImages.findIndex(img => img.id === imageId);
    if (imageIndex >= 0) {
      const imageToRemove = referenceImages[imageIndex];
      if (imageToRemove.url.startsWith('blob:')) {
        URL.revokeObjectURL(imageToRemove.url);
      }
      referenceImages = referenceImages.filter(img => img.id !== imageId);
      
      // Clear composite if no images left
      if (referenceImages.length === 0) {
        compositeImageUrl = null;
      }
    }
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
    const imageUrl = event.dataTransfer?.getData("text/uri-list") || event.dataTransfer?.getData("text/plain");

    if (imageUrl && (imageUrl.startsWith("http") || imageUrl.startsWith("blob:") || imageUrl.startsWith("data:"))) {
      // Handle dragged image URL from gallery
      try {
        if (useMultipleImages) {
          // Add to multiple images array
          const dimensions = await getImageDimensions(imageUrl);
          const newImage = {
            id: crypto.randomUUID(),
            file: null,
            url: imageUrl,
            name: 'Dragged Image',
            width: dimensions.width,
            height: dimensions.height
          };
          referenceImages = [...referenceImages, newImage];
        } else {
          // Single image mode
          referenceImageUrl = imageUrl;
          selectedFile = null;
        }
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
      if (useMultipleImages) {
        await processMultipleFiles(Array.from(files));
      } else {
        await processFile(files[0]);
      }
    }
  }

  async function generateImage() {
    if (!prompt.trim()) return;

    isGenerating = true;
    error = "";
    generatedImage = null;

    try {
      /** @type {ImageGenerationOptions} */
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

      // Determine which image to use as reference
      let finalReferenceImage = null;
      
      if (useMultipleImages && referenceImages.length > 0) {
        // Use composite image if available, otherwise generate it
        if (compositeImageUrl) {
          finalReferenceImage = compositeImageUrl;
        } else if (referenceImages.length === 1) {
          finalReferenceImage = referenceImages[0].url;
        } else {
          // Generate composite on the fly
          try {
            finalReferenceImage = await stitchImages(referenceImages, stitchMode, 10);
          } catch (err) {
            error = "Failed to create composite image for generation";
            console.error("Composite generation error:", err);
            return;
          }
        }
      } else if (referenceImageUrl) {
        // Single image mode
        finalReferenceImage = referenceImageUrl;
      }
      
      console.log("Final reference image:", finalReferenceImage);

      // Add image_url if reference image is provided
      if (finalReferenceImage) {
        let imageData = finalReferenceImage;

        if (finalReferenceImage.startsWith("blob:")) {
          // Convert blob URL to data URI
          try {
            const response = await fetch(finalReferenceImage);
            const blob = await response.blob();
            const dataUri = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result;
                if (typeof result === "string") {
                  resolve(result);
                } else {
                  resolve("");
                }
              };
              reader.readAsDataURL(blob);
            });
            imageData = dataUri;
          } catch (err) {
            error = "Failed to convert image for API";
            console.error("Blob conversion error:", err);
            return;
          }
        }

        // Add image_url to options
        options.image_url = imageData;
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

  /**
   * Generate composite image from multiple reference images
   */
  async function generateCompositeImage() {
    if (referenceImages.length === 0) {
      error = "No images to combine";
      return;
    }
    
    if (referenceImages.length === 1) {
      compositeImageUrl = referenceImages[0].url;
      return;
    }
    
    isGeneratingComposite = true;
    error = "";
    
    try {
      compositeImageUrl = await stitchImages(referenceImages, stitchMode, 10);
    } catch (err) {
      error = "Failed to create composite image";
      console.error("Composite generation error:", err);
    } finally {
      isGeneratingComposite = false;
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

  /**
   * Generate a random prompt using Gemini AI
   */
  async function generateRandomPrompt() {
    if (!scenePremise.trim()) {
      error = "Please enter a scene premise first";
      return;
    }

    try {
      const generatedPrompt = await geminiApi.generatePrompt({
        scenePremise,
        style: promptStyle,
        appendMode
      });

      if (appendMode && prompt.trim()) {
        prompt = `${prompt.trim()} ${generatedPrompt}`;
      } else {
        prompt = generatedPrompt;
      }

      error = "";
    } catch (/** @type {any} */ err) {
      error = err.message || "Failed to generate random prompt";
    }
  }

  /**
   * Set scene premise from predefined category
   * @param {string} category - The category ID
   */
  function setScenePremise(category) {
    const categories = geminiApi.getSceneCategories();
    const selectedCategory = categories.find(c => c.id === category);
    if (selectedCategory) {
      scenePremise = selectedCategory.label.toLowerCase();
    }
  }

  /**
   * Describe an image using Gemini Vision
   * @param {File | string} image - Image file or URL to analyze
   */
  async function describeImageToPrompt(image) {
    try {
      const description = await geminiApi.describeImage({
        image,
        style: imageDescriptionStyle,
        appendMode: imageAppendMode
      });

      if (imageAppendMode && prompt.trim()) {
        prompt = `${prompt.trim()} ${description}`;
      } else {
        prompt = description;
      }

      error = "";
    } catch (/** @type {any} */ err) {
      error = err.message || "Failed to describe image";
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
      <!-- Mode Toggle -->
      <div class="mb-3">
        <label class="flex items-center text-base font-bold mb-2">
          <input type="checkbox" class="mr-2" bind:checked={useMultipleImages}>
          Use Multiple Reference Images
        </label>
        {#if useMultipleImages}
          <p class="text-sm text-gray-600">Upload multiple images to create a composite reference image</p>
        {:else}
          <p class="text-sm text-gray-600">Upload a single reference image</p>
        {/if}
      </div>
      
      <label for="reference-image-input" class="block mb-2 text-lg font-bold"> Reference Image{useMultipleImages ? 's' : ''} (optional): </label>
      
      <!-- Stitch Mode Selection (only show when multiple images mode is active) -->
      {#if useMultipleImages && referenceImages.length > 1}
        <div class="mb-3 p-3 bg-gray-100 rounded">
          <label for="stitch-mode-group" class="block mb-2 text-sm font-bold">Composition Style:</label>
          <div class="flex gap-2" id="stitch-mode-group" role="group" aria-labelledby="stitch-mode-group">
            {#each stitchModes as mode}
              <label class="flex items-center">
                <input type="radio" bind:group={stitchMode} value={mode} class="mr-1">
                <span class="text-sm">{stitchModeLabels[mode]}</span>
              </label>
            {/each}
          </div>
          <button 
            class="mt-2 px-3 py-1 text-sm border border-gray-400 bg-white text-black cursor-pointer hover:bg-gray-50 disabled:bg-gray-200 disabled:cursor-not-allowed"
            onclick={generateCompositeImage}
            disabled={isGeneratingComposite}
          >
            {isGeneratingComposite ? 'Creating...' : 'Preview Composite'}
          </button>
        </div>
      {/if}
      
      <div
        class="border-2 border-dashed border-gray-400 rounded p-4 text-center cursor-pointer transition-colors {isDragOver ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-600'}"
        role="button"
        tabindex="0"
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
        onclick={() => document.getElementById("reference-image-input")?.click()}
        onkeydown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            document.getElementById("reference-image-input")?.click();
          }
        }}
      >
        {#if useMultipleImages}
          <!-- Multiple Images Display -->
          {#if referenceImages.length > 0}
            <div class="space-y-3">
              <!-- Image Grid -->
              <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                {#each referenceImages as img (img.id)}
                  <div class="relative group">
                    <img src={img.url} alt={img.name} class="w-full h-20 object-cover border border-gray-500 rounded" />
                    <button
                      class="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onclick={(event) => {
                        event.stopPropagation();
                        removeReferenceImage(img.id);
                      }}
                      title="Remove image"
                    >
                      ×
                    </button>
                    <div class="text-xs text-gray-600 mt-1 truncate">{img.name}</div>
                  </div>
                {/each}
              </div>
              
              <!-- Composite Preview -->
              {#if compositeImageUrl}
                <div class="mt-3 p-2 bg-blue-50 rounded">
                  <p class="text-sm font-bold text-blue-800 mb-2">Composite Preview:</p>
                  <img src={compositeImageUrl} alt="Composite" class="max-w-full max-h-32 mx-auto border border-blue-300 rounded" />
                </div>
              {/if}
              
              <div class="text-sm text-gray-600">
                {referenceImages.length} image{referenceImages.length !== 1 ? 's' : ''} selected
                <button 
                  class="ml-2 text-red-600 hover:text-red-800 underline"
                  onclick={(event) => {
                    event.stopPropagation();
                    clearReferenceImage();
                  }}
                >
                  Clear all
                </button>
              </div>
            </div>
          {:else}
            <div class="py-8">
              <div class="text-4xl mb-2">📁</div>
              <p class="text-base text-gray-600 mb-1">Drag & drop multiple images here, or click to select</p>
              <p class="text-sm text-gray-500">Supports: JPG, PNG, WebP, GIF, AVIF</p>
              <p class="text-sm text-blue-600 mt-2">💡 You can also drag images from the gallery!</p>
            </div>
          {/if}
        {:else}
          <!-- Single Image Display -->
          {#if referenceImageUrl}
            <div class="relative">
              <img src={referenceImageUrl} alt="Reference" class="max-w-full max-h-32 mx-auto border border-gray-500 rounded" />
              <button
                class="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full hover:bg-red-600 flex items-center justify-center"
                onclick={(event) => clearReferenceImage(event)}
                title="Remove image"
              >
                ×
              </button>
              <p class="mt-2 text-sm text-gray-600">{selectedFile?.name}</p>
              
              {#if geminiApi.isAvailable()}
                <div class="mt-2 flex flex-col gap-2">
                  <div class="flex gap-2 items-center">
                    <select 
                      class="text-xs border border-gray-500 p-1 bg-white text-black"
                      bind:value={imageDescriptionStyle}
                    >
                      <option value="prompt">Generate Prompt</option>
                      <option value="artistic">Artistic Analysis</option>
                      <option value="technical">Technical Description</option>
                    </select>
                    <label class="flex items-center text-xs">
                      <input type="checkbox" class="mr-1" bind:checked={imageAppendMode}>
                      Append
                    </label>
                  </div>
                  <button
                    class="px-2 py-1 text-xs border border-gray-400 bg-gray-300 text-black cursor-pointer btn-outset hover:bg-gray-400 disabled:bg-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed"
                    onclick={() => describeImageToPrompt(selectedFile || referenceImageUrl)}
                    disabled={geminiApi.isGenerating}
                  >
                    {geminiApi.isGenerating ? 'Analyzing...' : 'Describe Image 🔍'}
                  </button>
                </div>
              {/if}
            </div>
          {:else}
            <div class="py-8">
              <div class="text-4xl mb-2">📁</div>
              <p class="text-base text-gray-600 mb-1">Drag & drop an image here, or click to select</p>
              <p class="text-sm text-gray-500">Supports: JPG, PNG, WebP, GIF, AVIF</p>
              <p class="text-sm text-blue-600 mt-2">💡 You can also drag images from the gallery!</p>
            </div>
          {/if}
        {/if}
      </div>
      <input 
        id="reference-image-input" 
        type="file" 
        accept="image/*" 
        multiple={useMultipleImages}
        class="hidden" 
        onchange={handleFileSelect} 
      />
    </div>

    <div class="flex items-center justify-between mb-2">
      <label for="prompt-input" class="text-lg font-bold">Enter your prompt:</label>
      {#if geminiApi.isAvailable()}
        <button
          class="px-3 py-1 text-sm border border-gray-400 bg-gray-300 text-black cursor-pointer btn-outset hover:bg-gray-400"
          onclick={() => showRandomPromptSection = !showRandomPromptSection}
        >
          {showRandomPromptSection ? 'Hide' : 'Random Prompt'} 🎲
        </button>
      {/if}
    </div>

    {#if showRandomPromptSection && geminiApi.isAvailable()}
      <div class="bg-gray-200 border border-gray-500 p-3 mb-3 rounded">
        <h4 class="text-sm font-bold mb-2">🎲 Random Prompt Generator</h4>
        
        <!-- Quick category buttons -->
        <div class="mb-3">
          <label class="block text-xs font-bold mb-1">Quick Categories:</label>
          <div class="flex flex-wrap gap-1">
            {#each geminiApi.getSceneCategories().slice(0, 6) as category}
              <button
                class="px-2 py-1 text-xs border border-gray-400 bg-white text-black cursor-pointer hover:bg-gray-100"
                onclick={() => setScenePremise(category.id)}
                title={category.description}
              >
                {category.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- Custom scene premise -->
        <div class="mb-3">
          <label for="scene-premise" class="block text-xs font-bold mb-1">Scene Premise:</label>
          <input
            id="scene-premise"
            type="text"
            class="w-full border border-gray-500 p-2 text-sm bg-white text-black"
            bind:value={scenePremise}
            placeholder="e.g., mountain landscape, portrait, cyberpunk city..."
          />
        </div>

        <!-- Style and options -->
        <div class="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label for="prompt-style" class="block text-xs font-bold mb-1">Style:</label>
            <select id="prompt-style" class="w-full border border-gray-500 p-1 text-xs bg-white text-black" bind:value={promptStyle}>
              {#each geminiApi.getStyleOptions() as style}
                <option value={style.id}>{style.label}</option>
              {/each}
            </select>
          </div>
          <div class="flex items-end">
            <label class="flex items-center text-xs">
              <input type="checkbox" class="mr-1" bind:checked={appendMode}>
              Append to existing prompt
            </label>
          </div>
        </div>

        <!-- Generate button -->
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-2 border border-gray-400 bg-gray-300 text-black text-sm font-bold cursor-pointer btn-outset hover:bg-gray-400 disabled:bg-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed"
            onclick={generateRandomPrompt}
            disabled={geminiApi.isGenerating || !scenePremise.trim()}
          >
            {geminiApi.isGenerating ? 'Generating...' : 'Generate Random Prompt'}
          </button>
          {#if geminiApi.error}
            <span class="text-xs text-red-600">⚠️ {geminiApi.error}</span>
          {/if}
        </div>
      </div>
    {:else if !geminiApi.isAvailable()}
      <div class="bg-orange-100 border border-orange-300 p-2 mb-3 rounded">
        <p class="text-xs text-orange-700">
          💡 Add a Gemini API key in Settings to enable random prompt generation for benchmarking.
        </p>
      </div>
    {/if}

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
          {modelOptions.find((m) => m.value === model)?.description || ""}
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
        <input id="seed" type="number" class="w-full border border-gray-500 p-2 text-base bg-white text-black" bind:value={seed} placeholder="Random" />
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
          <input type="checkbox" class="mr-2" bind:checked={enableSafetyChecker} />
          Safety Checker
        </label>
      </div>

      <div class="flex items-center">
        <label class="flex items-center text-base font-bold">
          <input type="checkbox" class="mr-2" bind:checked={raw} />
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
