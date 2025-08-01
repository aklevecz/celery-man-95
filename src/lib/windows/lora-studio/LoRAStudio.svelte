<script>
  import { models } from "$lib/fal-api.svelte.js";
  import { fluxApiManager } from "$lib/flux-api-manager.svelte.js";
  import { imageManager } from "$lib/image-manager.svelte.js";
  import { settingsManager } from "$lib/settings-manager.svelte.js";
  import { fileToReferenceImage } from "$lib/image-utils.js";

  /**
   * @typedef {Object} LoRAOptions
   * @property {string} prompt - The prompt to edit the image
   * @property {string} image_url - The URL of the image to edit
   * @property {string} [image_size] - Image size (default: "landscape_4_3")
   * @property {number} [num_inference_steps] - Number of inference steps (10-50, default: 30)
   * @property {number} [guidance_scale] - Guidance scale (1-20, default: 2.5)
   * @property {number} [seed] - Seed for consistent results
   * @property {boolean} [sync_mode] - Wait for image generation (default: false)
   * @property {boolean} [enable_safety_checker] - Enable safety checker (default: true)
   * @property {string} [output_format] - Output format (jpeg/png, default: "png")
   * @property {Array} [loras] - Custom LoRA adaptations
   * @property {string} [resolution_mode] - Resolution mode (default: "match_input")
   */

  // Core generation state
  /** @type {string} */
  let prompt = $state("");
  /** @type {string | null} */
  let imageUrl = $state(null);
  /** @type {File | null} */
  let selectedFile = $state(null);
  /** @type {boolean} */
  let isGenerating = $state(false);
  /** @type {string | null} */
  let generatedImage = $state(null);
  /** @type {string} */
  let error = $state("");

  // LoRA Studio specific parameters
  /** @type {string} */
  let imageSize = $state("landscape_4_3");
  /** @type {number} */
  let numInferenceSteps = $state(30);
  /** @type {number} */
  let guidanceScale = $state(2.5);
  /** @type {string} */
  let seed = $state("");
  /** @type {boolean} */
  let syncMode = $state(false);
  /** @type {boolean} */
  let enableSafetyChecker = $state(false);
  /** @type {string} */
  let outputFormat = $state("png");
  /** @type {string} */
  let resolutionMode = $state("match_input");

  // LoRA management
  /** @type {Array<{path: string, scale: number}>} */
  let loras = $state([{
    path:"aklevecz/bose_flux_kontext",
    scale: 1.0
  }]);
  /** @type {string} */
  let newLoraPath = $state("");
  /** @type {number} */
  let newLoraScale = $state(1.0);

  // Image upload state
  /** @type {boolean} */
  let isDragOver = $state(false);
  /** @type {HTMLInputElement} */
  let fileInput;

  // Image size options
  const imageSizeOptions = [
    "landscape_4_3",
    "landscape_16_9",
    "portrait_4_3",
    "portrait_16_9",
    "square_hd",
    "square",
  ];

  // Output format options
  const outputFormatOptions = ["png", "jpeg"];

  // Resolution mode options
  const resolutionModeOptions = ["match_input", "hd", "2k", "4k"];

  /**
   * Handle file drop
   * @param {DragEvent} event
   */
  function handleDrop(event) {
    event.preventDefault();
    isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }

  /**
   * Handle file selection
   * @param {File} file
   */
  async function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) {
      error = "Please select a valid image file";
      return;
    }

    try {
      selectedFile = file;
      const referenceImage = await fileToReferenceImage(file);
      imageUrl = referenceImage.url;
      error = "";
    } catch (err) {
      error = `Failed to load image: ${err.message}`;
      console.error("File selection error:", err);
    }
  }

  /**
   * Handle file input change
   * @param {Event} event
   */
  function handleFileChange(event) {
    const input = /** @type {HTMLInputElement} */ (event.target);
    const file = input.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }

  /**
   * Add LoRA to the list
   */
  function addLora() {
    if (newLoraPath.trim()) {
      loras = [...loras, { path: newLoraPath.trim(), scale: newLoraScale }];
      newLoraPath = "";
      newLoraScale = 1.0;
    }
  }

  /**
   * Remove LoRA from the list
   * @param {number} index
   */
  function removeLora(index) {
    loras = loras.filter((_, i) => i !== index);
  }

  /**
   * Generate image with LoRA
   */
  async function generateImage() {
    if (!prompt.trim()) {
      error = "Please enter a prompt";
      return;
    }

    // if (!imageUrl) {
      // error = "Please select an image to edit";
      // return;
    // }

    isGenerating = true;
    error = "";
    generatedImage = null;

    try {
      /** @type {LoRAOptions} */
      const options = {
        prompt: prompt.trim(),
        image_url: imageUrl,
        image_size: imageSize,
        num_inference_steps: numInferenceSteps,
        guidance_scale: guidanceScale,
        sync_mode: syncMode,
        enable_safety_checker: enableSafetyChecker,
        output_format: outputFormat,
        resolution_mode: resolutionMode,
      };

      // Add seed if provided
      if (seed.trim()) {
        const seedNum = parseInt(seed.trim());
        if (!isNaN(seedNum)) {
          options.seed = seedNum;
        }
      }

      // Add LoRAs if any (convert proxy to plain array)
      if (loras.length > 0) {
        options.loras = loras.map(lora => ({ path: lora.path, scale: lora.scale }));
      }

      console.log("🎨 LoRA Studio generation options:", options);

      // Choose correct endpoint based on whether image is provided
      const model = imageUrl ? models.flux_kontext_lora : models.flux_kontext_lora_text_to_image;
      console.log("🎨 Using model:", model);

      const result = await fluxApiManager.falApi.generateFluxImage(model, options);
      
      if (result) {
        generatedImage = result;
        
        // Save to image manager
        await imageManager.saveImage(result, prompt.trim(), {
          model: imageUrl ? "flux-kontext-lora" : "flux-kontext-lora-text-to-image",
          timestamp: Date.now(),
          ...options,
        });
      } else {
        error = "Failed to generate image";
      }
    } catch (err) {
      error = err.message || "Generation failed";
      console.error("LoRA generation error:", err);
    } finally {
      isGenerating = false;
    }
  }

  /**
   * Clear the current input image
   */
  function clearImage() {
    imageUrl = null;
    selectedFile = null;
    error = "";
  }

  /**
   * Use generated image as new input
   */
  function useGeneratedAsInput() {
    if (generatedImage) {
      imageUrl = generatedImage;
      selectedFile = null;
    }
  }

  // Check if FAL API is available
  const isFalAvailable = settingsManager.hasApiKey();
</script>

<div class="lora-studio">
  {#if !isFalAvailable}
    <div class="warning">
      <p>⚠️ FAL.AI API key required for LoRA Studio. Please configure it in Settings.</p>
    </div>
  {/if}

  <div class="studio-content" class:disabled={!isFalAvailable}>
    <!-- Image Input Section -->
    <div class="section">
      <h3>Input Image <span style="color: #666; font-size: 12px;">(Optional - for image editing)</span></h3>
      <div 
        class="image-drop-zone" 
        class:drag-over={isDragOver}
        class:has-image={imageUrl}
        ondrop={handleDrop}
        ondragover={(e) => { e.preventDefault(); isDragOver = true; }}
        ondragleave={() => { isDragOver = false; }}
      >
        {#if imageUrl}
          <div class="image-preview">
            <img src={imageUrl} alt="Input image" />
            <div class="image-actions">
              <button type="button" onclick={clearImage}>Clear</button>
            </div>
          </div>
        {:else}
          <div class="drop-message">
            <p>Drop an image here or click to select</p>
            <input 
              type="file" 
              accept="image/*" 
              onchange={handleFileChange}
              style="display: none;"
              bind:this={fileInput}
            />
            <button type="button" onclick={() => fileInput?.click()}>Select Image</button>
          </div>
        {/if}
      </div>
    </div>

    <!-- Prompt Section -->
    <div class="section">
      <h3>Edit Prompt</h3>
      <textarea 
        bind:value={prompt}
        placeholder="Describe how you want to edit the image..."
        rows="3"
        disabled={!isFalAvailable}
      ></textarea>
    </div>

    <!-- LoRA Configuration -->
    <div class="section">
      <h3>LoRA Adaptations</h3>
      <div class="lora-input">
        <input 
          type="text" 
          bind:value={newLoraPath}
          placeholder="LoRA path/URL"
          disabled={!isFalAvailable}
        />
        <input 
          type="number" 
          bind:value={newLoraScale}
          min="0.1" 
          max="2.0" 
          step="0.1"
          placeholder="Scale"
          disabled={!isFalAvailable}
        />
        <button type="button" onclick={addLora} disabled={!isFalAvailable || !newLoraPath.trim()}>
          Add LoRA
        </button>
      </div>
      
      {#if loras.length > 0}
        <div class="lora-list">
          {#each loras as lora, index}
            <div class="lora-item">
              <span class="lora-path">{lora.path}</span>
              <span class="lora-scale">Scale: {lora.scale}</span>
              <button type="button" onclick={() => removeLora(index)}>×</button>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Generation Parameters -->
    <div class="section">
      <h3>Generation Parameters</h3>
      <div class="params-grid">
        <div class="param-group">
          <label>Image Size:</label>
          <select bind:value={imageSize} disabled={!isFalAvailable}>
            {#each imageSizeOptions as option}
              <option value={option}>{option}</option>
            {/each}
          </select>
        </div>
        
        <div class="param-group">
          <label>Inference Steps:</label>
          <input 
            type="number" 
            bind:value={numInferenceSteps}
            min="10" 
            max="50" 
            disabled={!isFalAvailable}
          />
        </div>
        
        <div class="param-group">
          <label>Guidance Scale:</label>
          <input 
            type="number" 
            bind:value={guidanceScale}
            min="1" 
            max="20" 
            step="0.1"
            disabled={!isFalAvailable}
          />
        </div>
        
        <div class="param-group">
          <label>Seed:</label>
          <input 
            type="text" 
            bind:value={seed}
            placeholder="Optional"
            disabled={!isFalAvailable}
          />
        </div>
        
        <div class="param-group">
          <label>Output Format:</label>
          <select bind:value={outputFormat} disabled={!isFalAvailable}>
            {#each outputFormatOptions as option}
              <option value={option}>{option}</option>
            {/each}
          </select>
        </div>
        
        <div class="param-group">
          <label>Resolution Mode:</label>
          <select bind:value={resolutionMode} disabled={!isFalAvailable}>
            {#each resolutionModeOptions as option}
              <option value={option}>{option}</option>
            {/each}
          </select>
        </div>
      </div>
      
      <div class="checkbox-group">
        <label>
          <input 
            type="checkbox" 
            bind:checked={syncMode}
            disabled={!isFalAvailable}
          />
          Sync Mode (wait for completion)
        </label>
        
        <label>
          <input 
            type="checkbox" 
            bind:checked={enableSafetyChecker}
            disabled={!isFalAvailable}
          />
          Enable Safety Checker
        </label>
      </div>
    </div>

    <!-- Generation Button -->
    <div class="section">
      <button 
        type="button" 
        onclick={generateImage}
        disabled={!isFalAvailable || isGenerating || !prompt.trim()}
        class="generate-button"
      >
        {isGenerating ? "Generating..." : "Generate with LoRA"}
      </button>
    </div>

    <!-- Error Display -->
    {#if error}
      <div class="error">
        {error}
      </div>
    {/if}

    <!-- Generated Image -->
    {#if generatedImage}
      <div class="section">
        <h3>Generated Image</h3>
        <div class="result-image">
          <img src={generatedImage} alt="Generated image" />
          <div class="result-actions">
            <button type="button" onclick={useGeneratedAsInput}>Use as Input</button>
            <a href={generatedImage} download="lora-studio-result.png">
              <button type="button">Download</button>
            </a>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .lora-studio {
    padding: 20px;
    max-width: 800px;
    margin: 0 auto;
  }

  .warning {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 20px;
    color: #856404;
  }

  .studio-content.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .section {
    margin-bottom: 24px;
  }

  .section h3 {
    margin: 0 0 12px 0;
    color: #333;
    font-size: 16px;
  }

  .image-drop-zone {
    border: 2px dashed #ddd;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    transition: all 0.3s ease;
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .image-drop-zone.drag-over {
    border-color: #007bff;
    background: #f8f9fa;
  }

  .image-drop-zone.has-image {
    padding: 0;
    border: 1px solid #ddd;
  }

  .image-preview {
    position: relative;
    width: 100%;
  }

  .image-preview img {
    width: 100%;
    height: auto;
    border-radius: 4px;
  }

  .image-actions {
    position: absolute;
    top: 8px;
    right: 8px;
  }

  .drop-message p {
    margin: 0 0 12px 0;
    color: #666;
  }

  .lora-input {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .lora-input input[type="text"] {
    flex: 1;
  }

  .lora-input input[type="number"] {
    width: 80px;
  }

  .lora-list {
    background: #f8f9fa;
    border-radius: 4px;
    padding: 12px;
  }

  .lora-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid #eee;
  }

  .lora-item:last-child {
    border-bottom: none;
  }

  .lora-path {
    flex: 1;
    font-family: monospace;
    font-size: 14px;
  }

  .lora-scale {
    font-size: 12px;
    color: #666;
  }

  .params-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 16px;
  }

  .param-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .param-group label {
    font-size: 14px;
    font-weight: 500;
    color: #333;
  }

  .checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .checkbox-group label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    cursor: pointer;
  }

  .generate-button {
    width: 100%;
    padding: 12px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .generate-button:hover:not(:disabled) {
    background: #0056b3;
  }

  .generate-button:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }

  .error {
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    color: #721c24;
    padding: 12px;
    border-radius: 4px;
    margin-top: 12px;
  }

  .result-image {
    position: relative;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
  }

  .result-image img {
    width: 100%;
    height: auto;
    display: block;
  }

  .result-actions {
    position: absolute;
    bottom: 8px;
    right: 8px;
    display: flex;
    gap: 8px;
  }

  .result-actions button {
    padding: 6px 12px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
  }

  .result-actions a {
    text-decoration: none;
  }

  input, select, textarea {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }

  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: #007bff;
  }

  button {
    padding: 8px 16px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  button:hover:not(:disabled) {
    background: #0056b3;
  }

  button:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
</style>