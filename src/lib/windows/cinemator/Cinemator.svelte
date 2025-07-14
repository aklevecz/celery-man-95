<script>
  import falApi, { models } from '$lib/fal-api.svelte.js';
  import { videoStorage } from '$lib/video-storage.svelte.js';

  // Generation modes
  const MODES = {
    TEXT_TO_VIDEO: 'text-to-video',
    IMAGE_TO_VIDEO: 'image-to-video'
  };

  // State variables
  let mode = $state(MODES.TEXT_TO_VIDEO);
  let prompt = $state('');
  let aspectRatio = $state('16:9');
  let resolution = $state('1080p');
  let duration = $state('5');
  let cameraFixed = $state(false);
  let seed = $state('');
  let isGenerating = $state(false);
  let error = $state('');
  
  // Image input state (for image-to-video mode)
  /** @type {string | null} */
  let referenceImageUrl = $state(null);
  /** @type {File | null} */
  let selectedFile = $state(null);
  let isDragOver = $state(false);
  
  // Generated video state
  /** @type {string | null} */
  let generatedVideoUrl = $state(null);

  // Configuration options
  const aspectRatios = ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'];
  const resolutions = ['480p', '1080p'];
  const durations = ['5', '10'];
  const acceptedFileTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

  // Initialize component

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
      error = 'Please select a valid image file (JPG, PNG, WebP, GIF, AVIF)';
      return;
    }

    try {
      selectedFile = file;
      referenceImageUrl = await fileToBase64(file);
      error = '';
    } catch (err) {
      error = 'Failed to process image file';
      console.error('File processing error:', err);
    }
  }

  /**
   * Clear selected reference image
   * @param {Event} [event] - Click event to prevent bubbling
   */
  function clearReferenceImage(event) {
    if (event) {
      event.stopPropagation();
    }
    
    selectedFile = null;
    referenceImageUrl = null;
    const fileInput = /** @type {HTMLInputElement} */ (document.getElementById('reference-video-input'));
    if (fileInput) fileInput.value = '';
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
        selectedFile = null;
        error = '';
      } catch (err) {
        error = 'Failed to use dragged image';
        console.error('Image URL error:', err);
      }
      return;
    }
    
    // Handle file drops
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  }

  /**
   * Generate video
   */
  async function generateVideo() {
    if (!prompt.trim()) {
      error = 'Please enter a prompt';
      return;
    }

    if (mode === MODES.IMAGE_TO_VIDEO && !referenceImageUrl) {
      error = 'Please select a reference image for image-to-video generation';
      return;
    }

    isGenerating = true;
    error = '';
    generatedVideoUrl = null;

    try {
      // Determine model based on mode
      const model = mode === MODES.TEXT_TO_VIDEO 
        ? models.seedance_pro_text_to_video 
        : models.seedance_pro_image_to_video;

      // Prepare options
      const options = {
        prompt: prompt.trim(),
        aspect_ratio: aspectRatio,
        resolution: resolution,
        duration: duration,
        camera_fixed: cameraFixed,
        seed: seed.trim() ? parseInt(seed) : undefined,
      };

      // Add image for image-to-video mode
      if (mode === MODES.IMAGE_TO_VIDEO && referenceImageUrl) {
        let imageData = referenceImageUrl;
        
        if (referenceImageUrl.startsWith('blob:')) {
          // Convert blob URL to data URI
          const response = await fetch(referenceImageUrl);
          const blob = await response.blob();
          const dataUri = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result;
              if (typeof result === 'string') {
                resolve(result);
              } else {
                resolve('');
              }
            };
            reader.readAsDataURL(blob);
          });
          imageData = dataUri;
        }
        
        /** @type {any} */
        options.image_url = imageData;
        delete options.aspect_ratio
      }



      console.log('🎬 Generating video with options:', options);

      // Generate video
      const videoUrl = await falApi.generateSeedanceVideo(model, options);
      
      if (videoUrl) {
        generatedVideoUrl = videoUrl;
        
        // Auto-save the generated video
        await saveCurrentVideo();
      } else {
        error = 'Failed to generate video';
      }

    } catch (/** @type {*} */ err) {
      error = `Error: ${err.message}`;
      console.error('Video generation error:', err);
    } finally {
      isGenerating = false;
    }
  }

  /**
   * Save the currently generated video
   */
  async function saveCurrentVideo() {
    if (!generatedVideoUrl || !prompt.trim()) return;

    try {
      const parameters = {
        aspect_ratio: aspectRatio,
        resolution: resolution,
        duration: duration,
        camera_fixed: cameraFixed,
        seed: seed.trim() ? parseInt(seed) : undefined,
      };

      const model = mode === MODES.TEXT_TO_VIDEO 
        ? models.seedance_pro_text_to_video 
        : models.seedance_pro_image_to_video;

      await videoStorage.saveVideo(
        generatedVideoUrl,
        prompt.trim(),
        model,
        mode,
        parameters,
        selectedFile?.name
      );
      
    } catch (/** @type {*} */ err) {
      console.error('Failed to save video:', err);
      error = `Failed to save video: ${err.message}`;
    }
  }

  /**
   * Download the currently displayed video
   */
  function downloadVideo() {
    if (generatedVideoUrl) {
      const link = document.createElement('a');
      link.href = generatedVideoUrl;
      link.download = `cinemator-${mode}-${Date.now()}.mp4`;
      link.click();
    }
  }




  /**
   * Handle keyboard events in the prompt textarea
   * @param {KeyboardEvent} event - The keyboard event
   */
  function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      generateVideo();
    }
  }

  /**
   * Clear generated video
   */
  function clearVideo() {
    generatedVideoUrl = null;
    error = '';
  }
</script>

<div class="flex flex-col h-full font-sans text-base bg-gray-300 text-black">
  <!-- Header -->
  <div class="p-3 border-b border-gray-500 bg-gray-300">
    <h2 class="m-0 text-2xl font-bold text-black">Cinemator - AI Video Generator</h2>
    <p class="mt-1 mb-0 text-lg text-gray-600">Powered by Seedance Pro</p>
  </div>

  <div class="p-4 border-b border-gray-500">
    <!-- Mode Selection -->
    <div class="mb-4">
      <div class="block mb-2 text-lg font-bold">Generation Mode:</div>
      <div class="flex gap-4">
        <label class="flex items-center text-base font-bold">
          <input 
            type="radio" 
            class="mr-2" 
            bind:group={mode} 
            value={MODES.TEXT_TO_VIDEO}
          />
          Text-to-Video
        </label>
        <label class="flex items-center text-base font-bold">
          <input 
            type="radio" 
            class="mr-2" 
            bind:group={mode} 
            value={MODES.IMAGE_TO_VIDEO}
          />
          Image-to-Video
        </label>
      </div>
    </div>

    <!-- Reference Image Input (only for image-to-video mode) -->
    {#if mode === MODES.IMAGE_TO_VIDEO}
      <div class="mb-4">
        <div class="block mb-2 text-lg font-bold">Reference Image:</div>
        <div 
          class="border-2 border-dashed border-gray-400 rounded p-4 text-center cursor-pointer transition-colors {isDragOver ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-600'}"
          role="button"
          tabindex="0"
          ondragover={handleDragOver}
          ondragleave={handleDragLeave}
          ondrop={handleDrop}
          onclick={() => document.getElementById('reference-video-input')?.click()}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              document.getElementById('reference-video-input')?.click();
            }
          }}
        >
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
            </div>
          {:else}
            <div class="py-8">
              <div class="text-4xl mb-2">🎬</div>
              <p class="text-base text-gray-600 mb-1">Drag & drop an image here, or click to select</p>
              <p class="text-sm text-gray-500">Supports: JPG, PNG, WebP, GIF, AVIF</p>
              <p class="text-sm text-blue-600 mt-2">💡 You can also drag images from the gallery!</p>
            </div>
          {/if}
        </div>
        <input 
          id="reference-video-input"
          type="file" 
          accept="image/*"
          class="hidden"
          onchange={handleFileSelect}
        />
      </div>
    {/if}

    <!-- Prompt Input -->
    <div class="mb-4">
      <label for="prompt-input" class="block mb-2 text-lg font-bold">Video Description:</label>
      <textarea
        id="prompt-input"
        class="w-full h-24 border border-gray-500 p-3 text-lg font-sans resize-y bg-white text-black box-border disabled:bg-gray-200 disabled:text-gray-600"
        bind:value={prompt}
        placeholder="Describe the video you want to generate..."
        onkeypress={handleKeyPress}
        disabled={isGenerating}
      ></textarea>
    </div>

    <!-- Generation Parameters -->
    <div class="grid grid-cols-2 gap-4 mb-4">
      <div>
        <label for="aspect-ratio" class="block mb-1 text-base font-bold">Aspect Ratio:</label>
        <select id="aspect-ratio" class="w-full border border-gray-500 p-2 text-base bg-white text-black" bind:value={aspectRatio}>
          {#each aspectRatios as ratio}
            <option value={ratio}>{ratio}</option>
          {/each}
        </select>
      </div>

      <div>
        <label for="resolution" class="block mb-1 text-base font-bold">Resolution:</label>
        <select id="resolution" class="w-full border border-gray-500 p-2 text-base bg-white text-black" bind:value={resolution}>
          {#each resolutions as res}
            <option value={res}>{res}</option>
          {/each}
        </select>
      </div>

      <div>
        <label for="duration" class="block mb-1 text-base font-bold">Duration:</label>
        <select id="duration" class="w-full border border-gray-500 p-2 text-base bg-white text-black" bind:value={duration}>
          {#each durations as dur}
            <option value={dur}>{dur} seconds</option>
          {/each}
        </select>
      </div>

      <div>
        <label for="seed" class="block mb-1 text-base font-bold">Seed (optional):</label>
        <input id="seed" type="number" class="w-full border border-gray-500 p-2 text-base bg-white text-black" bind:value={seed} placeholder="Random">
      </div>
    </div>

    <!-- Camera Fixed Option -->
    <div class="mb-4">
      <label class="flex items-center text-base font-bold">
        <input type="checkbox" class="mr-2" bind:checked={cameraFixed}>
        Fixed Camera (static camera position)
      </label>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-2 items-center">
      <button
        class="px-4 py-2 border border-gray-400 bg-gray-300 text-black text-lg font-bold cursor-pointer font-sans disabled:bg-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed btn-outset"
        onclick={generateVideo}
        disabled={isGenerating || !prompt.trim()}
      >
        {isGenerating ? 'Generating Video...' : 'Generate Video'}
      </button>

      {#if generatedVideoUrl}
        <button class="px-3 py-2 border border-gray-400 bg-gray-300 text-black text-lg cursor-pointer font-sans btn-outset" onclick={clearVideo}>Clear</button>
        <button class="px-3 py-2 border border-gray-400 bg-gray-300 text-black text-lg cursor-pointer font-sans btn-outset" onclick={downloadVideo}>Download</button>
      {/if}
    </div>
  </div>

  <!-- Error Display -->
  {#if error}
    <div class="p-3 bg-red-100 border border-red-600 text-red-600 text-lg mx-3 my-2">
      ⚠️ {error}
    </div>
  {/if}

  <!-- Loading State -->
  {#if isGenerating}
    <div class="flex flex-col items-center p-6 text-center">
      <div class="w-10 h-10 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-3"></div>
      <p class="m-0 text-lg text-black">Generating your video... This may take 30-60 seconds.</p>
    </div>
  {/if}

  <!-- Video Preview and Gallery -->
  <div class="flex-1 overflow-auto flex flex-col">
    {#if generatedVideoUrl}
      <div class="p-4 text-center">
        <video 
          src={generatedVideoUrl} 
          class="max-w-full max-h-80 border border-gray-500 shadow-lg bg-black" 
          controls 
          autoplay 
          muted 
          loop
        ></video>
      </div>
    {/if}

  </div>
</div>