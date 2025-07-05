<script>
  import falApi, { models } from "$lib/fal-api.svelte.js";

  /**
   * @typedef {1 | 2 | 3 | 4 | 6 | 8} ScaleFactor
   * @typedef {'proteus-v4' | 'apollo-v8'} TopazModel
   * 
   * @typedef {Object} VideoUpscalingOptions
   * @property {string} video_url - The video URL to upscale (required)
   * @property {ScaleFactor} [scale_factor] - Upscaling factor (1-8x)
   * @property {number} [target_fps] - Target FPS for frame interpolation (Topaz only)
   * @property {boolean} [enable_frame_interpolation] - Enable frame interpolation (Topaz only)
   * @property {TopazModel} [model_name] - Model variant for Topaz
   */

  /** @type {string} */
  let selectedModel = $state(models.video_upscaler);
  /** @type {ScaleFactor} */
  let scaleFactor = $state(2);
  /** @type {number} */
  let targetFps = $state(30);
  /** @type {boolean} */
  let enableFrameInterpolation = $state(false);
  /** @type {TopazModel} */
  let topazModel = $state('proteus-v4');
  /** @type {boolean} */
  let isUpscaling = $state(false);
  /** @type {string | null} */
  let originalVideoUrl = $state(null);
  /** @type {string | null} */
  let upscaledVideoUrl = $state(null);
  /** @type {File | null} */
  let selectedFile = $state(null);
  /** @type {boolean} */
  let isDragOver = $state(false);
  /** @type {string} */
  let error = $state("");

  const acceptedVideoTypes = ["video/mp4", "video/mov", "video/webm", "video/m4v", "image/gif"];
  
  const modelOptions = [
    { 
      key: "video_upscaler", 
      value: models.video_upscaler, 
      label: "Standard Video Upscaler", 
      description: "Fast RealESRGAN-based upscaling",
      pricing: "$0.0008/megapixel"
    },
    { 
      key: "topaz_video_upscaler", 
      value: models.topaz_video_upscaler, 
      label: "Topaz Video AI", 
      description: "Professional-grade upscaling with frame interpolation",
      pricing: "$0.1/second"
    }
  ];

  /** @type {ScaleFactor[]} */
  const scaleFactors = [1, 2, 3, 4, 6, 8];

  /** @type {TopazModel[]} */
  const topazModels = ['proteus-v4', 'apollo-v8'];

  const topazModelLabels = {
    'proteus-v4': 'Proteus v4 (General)',
    'apollo-v8': 'Apollo v8 (Fine Details)'
  };

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
    if (!acceptedVideoTypes.includes(file.type)) {
      error = "Please select a valid video file (MP4, MOV, WebM, M4V, GIF)";
      return;
    }

    try {
      selectedFile = file;
      originalVideoUrl = await fileToBase64(file);
      upscaledVideoUrl = null; // Clear previous result
      error = "";
    } catch (err) {
      error = "Failed to process video file";
      console.error("File processing error:", err);
    }
  }

  /**
   * Clear selected video
   * @param {Event} [event] - Click event to prevent bubbling
   */
  function clearVideo(event) {
    if (event) {
      event.stopPropagation();
    }
    
    selectedFile = null;
    originalVideoUrl = null;
    upscaledVideoUrl = null;
    
    // Reset file input
    const fileInput = /** @type {HTMLInputElement} */ (document.getElementById("video-input"));
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
    
    // Check for video URL data (from video gallery drag)
    const videoUrl = event.dataTransfer?.getData('text/uri-list') || event.dataTransfer?.getData('text/plain');
    
    if (videoUrl && (videoUrl.startsWith('http') || videoUrl.startsWith('blob:') || videoUrl.startsWith('data:'))) {
      // Handle dragged video URL from gallery
      try {
        originalVideoUrl = videoUrl;
        selectedFile = null; // Clear file since we're using a URL
        upscaledVideoUrl = null;
        error = "";
      } catch (err) {
        error = "Failed to use dragged video";
        console.error("Video URL error:", err);
      }
      return;
    }
    
    // Handle file drops
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  }

  async function upscaleVideo() {
    if (!originalVideoUrl) return;

    isUpscaling = true;
    error = "";
    upscaledVideoUrl = null;

    try {
      // Upload video file to FAL.AI storage instead of using base64
      let videoData = originalVideoUrl;
      
      if (originalVideoUrl.startsWith('blob:') || selectedFile) {
        // Upload the file to FAL.AI storage
        try {
          let fileToUpload = selectedFile;
          
          if (!fileToUpload && originalVideoUrl.startsWith('blob:')) {
            // Convert blob URL to File object
            const response = await fetch(originalVideoUrl);
            const blob = await response.blob();
            fileToUpload = new File([blob], 'video.mp4', { type: blob.type });
          }
          
          if (fileToUpload) {
            console.log("📁 Uploading video file to FAL.AI storage...");
            videoData = await falApi.uploadFile(fileToUpload);
            console.log("✅ Video uploaded, URL:", videoData);
          }
        } catch (err) {
          error = "Failed to upload video to FAL.AI storage";
          console.error("File upload error:", err);
          return;
        }
      }

      /** @type {VideoUpscalingOptions} */
      const options = {
        video_url: videoData,
        scale_factor: scaleFactor,
      };

      // Add Topaz-specific options
      if (selectedModel === models.topaz_video_upscaler) {
        options.model_name = topazModel;
        if (enableFrameInterpolation) {
          options.enable_frame_interpolation = true;
          options.target_fps = targetFps;
        }
      }

      const videoUrl = await falApi.generateUpscaledVideo(selectedModel, options);
      if (videoUrl) {
        upscaledVideoUrl = videoUrl;
        console.log(`Video upscaled successfully: ${videoUrl}`);
      } else {
        error = "Failed to upscale video";
      }
    } catch (/** @type {*} */ err) {
      error = `Error: ${err.message}`;
      console.error("Video upscaling error:", err);
    } finally {
      isUpscaling = false;
    }
  }


  function downloadVideo() {
    if (upscaledVideoUrl) {
      const link = document.createElement("a");
      link.href = upscaledVideoUrl;
      link.download = `upscaled-${selectedFile?.name || 'video'}-${scaleFactor}x.mp4`;
      link.click();
    }
  }
</script>

<div class="flex flex-col h-full font-sans bg-gray-300 text-black">
  <div class="p-3 border-b border-gray-500 bg-gray-300">
    <h2 class="m-0 text-2xl font-bold text-black">Video Upscaler</h2>
    <p class="mt-1 mb-0 text-lg text-gray-600">Enhance video quality with AI upscaling</p>
  </div>

  <div class="p-4 border-b border-gray-500">
    <!-- Video Input Section -->
    <div class="mb-4">
      <label for="video-input" class="block mb-2 text-lg font-bold">Select Video to Upscale:</label>
      <div 
        class="border-2 border-dashed border-gray-400 rounded p-4 text-center cursor-pointer transition-colors {isDragOver ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-600'}"
        role="button"
        tabindex="0"
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
        onclick={() => document.getElementById('video-input')?.click()}
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            document.getElementById('video-input')?.click();
          }
        }}
      >
        {#if originalVideoUrl}
          <div class="relative">
            <video 
              src={originalVideoUrl} 
              class="max-w-full max-h-32 mx-auto border border-gray-500 rounded" 
              controls
              muted
            ></video>
            <button 
              class="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full hover:bg-red-600 flex items-center justify-center"
              onclick={(event) => clearVideo(event)}
              title="Remove video"
            >
              ×
            </button>
            <p class="mt-2 text-sm text-gray-600">{selectedFile?.name}</p>
          </div>
        {:else}
          <div class="py-8">
            <div class="text-4xl mb-2">🎬</div>
            <p class="text-base text-gray-600 mb-1">Drag & drop a video here, or click to select</p>
            <p class="text-sm text-gray-500">Supports: MP4, MOV, WebM, M4V, GIF</p>
            <p class="text-sm text-blue-600 mt-2">💡 You can also drag videos from the gallery!</p>
          </div>
        {/if}
      </div>
      <input 
        id="video-input"
        type="file" 
        accept="video/*,.gif"
        class="hidden"
        onchange={handleFileSelect}
      />
    </div>

    <!-- Upscaling Options -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div>
        <label for="model-select" class="block mb-1 text-base font-bold">Upscaling Model:</label>
        <select id="model-select" class="w-full border border-gray-500 p-2 text-base bg-white text-black" bind:value={selectedModel}>
          {#each modelOptions as modelOption}
            <option value={modelOption.value}>{modelOption.label}</option>
          {/each}
        </select>
        <p class="text-xs text-gray-600 mt-1">
          {modelOptions.find(m => m.value === selectedModel)?.description || ""}
        </p>
        <p class="text-xs text-blue-600">
          {modelOptions.find(m => m.value === selectedModel)?.pricing || ""}
        </p>
      </div>

      <div>
        <label for="scale-factor" class="block mb-1 text-base font-bold">Scale Factor:</label>
        <select id="scale-factor" class="w-full border border-gray-500 p-2 text-base bg-white text-black" bind:value={scaleFactor}>
          {#each scaleFactors as factor}
            <option value={factor}>{factor}x</option>
          {/each}
        </select>
        <p class="text-xs text-gray-600 mt-1">Higher values = better quality but longer processing time</p>
      </div>
    </div>

    <!-- Topaz-specific options -->
    {#if selectedModel === models.topaz_video_upscaler}
      <div class="p-3 bg-blue-50 rounded mb-4">
        <h3 class="text-sm font-bold text-blue-800 mb-2">Topaz Video AI Options</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label for="topaz-model" class="block mb-1 text-sm font-bold">AI Model:</label>
            <select id="topaz-model" class="w-full border border-gray-400 p-2 text-sm bg-white text-black" bind:value={topazModel}>
              {#each topazModels as model}
                <option value={model}>{topazModelLabels[model]}</option>
              {/each}
            </select>
          </div>

          <div>
            <label class="flex items-center text-sm font-bold mb-2">
              <input type="checkbox" class="mr-2" bind:checked={enableFrameInterpolation}>
              Frame Interpolation
            </label>
            {#if enableFrameInterpolation}
              <div>
                <label for="target-fps" class="block mb-1 text-sm">Target FPS:</label>
                <input 
                  id="target-fps" 
                  type="number" 
                  min="24" 
                  max="120" 
                  class="w-full border border-gray-400 p-1 text-sm bg-white text-black" 
                  bind:value={targetFps}
                >
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <div class="flex gap-2 mt-4 items-center">
      <button
        class="px-4 py-2 border border-gray-400 bg-gray-300 text-black text-lg font-bold cursor-pointer font-sans disabled:bg-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed btn-outset"
        onclick={upscaleVideo}
        disabled={isUpscaling || !originalVideoUrl}
      >
        {isUpscaling ? "Upscaling..." : "Upscale Video"}
      </button>

      {#if upscaledVideoUrl}
        <button 
          class="px-3 py-2 border border-gray-400 bg-gray-300 text-black text-lg cursor-pointer font-sans btn-outset" 
          onclick={downloadVideo}
        >
          Download
        </button>
      {/if}
    </div>
  </div>

  {#if error}
    <div class="p-3 bg-red-100 border border-red-600 text-red-600 text-lg mx-3 my-2">
      ⚠️ {error}
    </div>
  {/if}

  {#if isUpscaling}
    <div class="flex flex-col items-center p-6 text-center">
      <div class="w-10 h-10 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-3"></div>
      <p class="m-0 text-lg text-black">Upscaling your video... This may take several minutes.</p>
      <p class="m-0 text-sm text-gray-600 mt-1">Processing time depends on video length and scale factor</p>
    </div>
  {/if}

  <div class="flex-1 overflow-auto flex flex-col">
    {#if originalVideoUrl || upscaledVideoUrl}
      <div class="p-4">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Original Video -->
          {#if originalVideoUrl}
            <div>
              <h3 class="text-lg font-bold mb-2">Original</h3>
              <video 
                src={originalVideoUrl} 
                class="w-full border border-gray-500 shadow-lg bg-white rounded" 
                controls
                muted
              ></video>
              <p class="text-sm text-gray-600 mt-1">{selectedFile?.name || 'Source Video'}</p>
            </div>
          {/if}

          <!-- Upscaled Video -->
          {#if upscaledVideoUrl}
            <div>
              <h3 class="text-lg font-bold mb-2">Upscaled ({scaleFactor}x)</h3>
              <video 
                src={upscaledVideoUrl} 
                class="w-full border border-gray-500 shadow-lg bg-white rounded" 
                controls
                muted
              ></video>
              <p class="text-sm text-gray-600 mt-1">Enhanced with {modelOptions.find(m => m.value === selectedModel)?.label}</p>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>