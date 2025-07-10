<script>
  import { geminiApi } from "$lib/gemini-api.svelte.js";
  import { fluxApiManager } from "$lib/flux-api-manager.svelte.js";
  import { imageManager } from "$lib/image-manager.svelte.js";

  // Image input state
  /** @type {File | null} */
  let selectedFile = $state(null);
  /** @type {string | null} */
  let imagePreviewUrl = $state(null);
  /** @type {boolean} */
  let isDragOver = $state(false);

  // Analysis state
  /** @type {string} */
  let subjectDescription = $state('');
  /** @type {boolean} */
  let isAnalyzing = $state(false);
  /** @type {string} */
  let analysisError = $state('');

  // Generation state
  /** @type {boolean} */
  let isGenerating = $state(false);
  /** @type {string} */
  let generationError = $state('');

  // Lighting scenarios
  const lightingScenarios = [
    {
      id: 'golden-hour',
      name: 'Golden Hour',
      description: 'Warm, soft, directional light',
      prompt: 'bathed in warm golden hour sunlight, soft directional lighting, golden glow',
      status: 'idle', // idle, generating, completed, error
      imageUrl: null,
      error: null
    },
    {
      id: 'studio-portrait',
      name: 'Studio Portrait',
      description: 'Professional, even lighting',
      prompt: 'professional studio lighting, even illumination, soft shadows, clean background',
      status: 'idle',
      imageUrl: null,
      error: null
    },
    {
      id: 'dramatic',
      name: 'Dramatic',
      description: 'High contrast, moody shadows',
      prompt: 'dramatic lighting with deep shadows, high contrast, moody atmosphere',
      status: 'idle',
      imageUrl: null,
      error: null
    },
    {
      id: 'backlit',
      name: 'Backlit',
      description: 'Rim lighting, silhouette effects',
      prompt: 'backlit with rim lighting, silhouette effect, glowing edges',
      status: 'idle',
      imageUrl: null,
      error: null
    },
    {
      id: 'neon',
      name: 'Neon/Cyberpunk',
      description: 'Colorful artificial lighting',
      prompt: 'neon lighting, cyberpunk atmosphere, colorful artificial lights, futuristic glow',
      status: 'idle',
      imageUrl: null,
      error: null
    },
    {
      id: 'window',
      name: 'Natural Window',
      description: 'Soft, diffused indoor light',
      prompt: 'natural window lighting, soft diffused light, indoor atmosphere',
      status: 'idle',
      imageUrl: null,
      error: null
    },
    {
      id: 'sunset',
      name: 'Sunset/Sunrise',
      description: 'Warm, atmospheric',
      prompt: 'sunset lighting, warm atmospheric glow, orange and pink hues',
      status: 'idle',
      imageUrl: null,
      error: null
    },
    {
      id: 'moonlight',
      name: 'Moonlight',
      description: 'Cool, blue-tinted, mysterious',
      prompt: 'moonlight illumination, cool blue tones, mysterious atmosphere, night lighting',
      status: 'idle',
      imageUrl: null,
      error: null
    }
  ];

  /** @type {Array<{id: string, name: string, description: string, prompt: string, status: string, imageUrl: string | null, error: string | null}>} */
  let scenarios = $state([...lightingScenarios]);

  /**
   * Handle file selection
   * @param {Event} event
   */
  async function handleFileSelect(event) {
    const target = /** @type {HTMLInputElement | null} */ (event.target);
    const files = target?.files;
    if (files && files.length > 0) {
      await processSelectedFile(files[0]);
    }
  }

  /**
   * Handle drag over
   * @param {DragEvent} event
   */
  function handleDragOver(event) {
    event.preventDefault();
    isDragOver = true;
  }

  /**
   * Handle drag leave
   * @param {DragEvent} event
   */
  function handleDragLeave(event) {
    event.preventDefault();
    isDragOver = false;
  }

  /**
   * Handle file drop
   * @param {DragEvent} event
   */
  async function handleDrop(event) {
    event.preventDefault();
    isDragOver = false;
    
    // Check for image URL data (from gallery drag)
    const imageUrl = event.dataTransfer?.getData("text/uri-list") || event.dataTransfer?.getData("text/plain");

    if (imageUrl && (imageUrl.startsWith("http") || imageUrl.startsWith("blob:") || imageUrl.startsWith("data:"))) {
      // Handle dragged image URL from gallery
      try {
        // Create a temporary image element to get the blob
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        // Convert blob to File object
        const file = new File([blob], 'dragged-image.jpg', { type: blob.type });
        await processSelectedFile(file);
      } catch (err) {
        console.error("Failed to process dragged image:", err);
        analysisError = "Failed to process dragged image";
      }
      return;
    }

    // Handle file drops
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      await processSelectedFile(files[0]);
    }
  }

  /**
   * Process selected file
   * @param {File} file
   */
  async function processSelectedFile(file) {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select a valid image file');
      }

      selectedFile = file;
      
      // Create preview URL
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      imagePreviewUrl = URL.createObjectURL(file);

      // Reset analysis and generation state
      subjectDescription = '';
      analysisError = '';
      resetScenarios();

    } catch (error) {
      console.error('Error processing file:', error);
      analysisError = (error instanceof Error ? error.message : String(error)) || 'Failed to process file';
    }
  }

  /**
   * Reset scenarios to initial state
   */
  function resetScenarios() {
    scenarios = scenarios.map(scenario => ({
      ...scenario,
      status: 'idle',
      imageUrl: null,
      error: null
    }));
  }

  /**
   * Analyze the uploaded image
   */
  async function analyzeImage() {
    if (!selectedFile) {
      analysisError = 'Please select an image first';
      return;
    }

    if (!geminiApi.isAvailable()) {
      analysisError = 'Gemini API key not configured. Please add it in Settings.';
      return;
    }

    isAnalyzing = true;
    analysisError = '';

    try {
      const description = await geminiApi.describeImage({
        image: selectedFile,
        style: 'subject'
      });

      subjectDescription = description;

    } catch (error) {
      console.error('Analysis error:', error);
      analysisError = (error instanceof Error ? error.message : String(error)) || 'Failed to analyze image';
    } finally {
      isAnalyzing = false;
    }
  }

  /**
   * Generate all lighting scenarios
   */
  async function generateAllLighting() {
    if (!subjectDescription) {
      generationError = 'Please analyze the image first';
      return;
    }

    isGenerating = true;
    generationError = '';

    // Reset all scenarios
    resetScenarios();

    // Generate all scenarios in parallel
    const promises = scenarios.map(scenario => generateScenario(scenario));
    
    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Generation error:', error);
      generationError = (error instanceof Error ? error.message : String(error)) || 'Failed to generate lighting variations';
    } finally {
      isGenerating = false;
    }
  }

  /**
   * Generate a single lighting scenario
   * @param {{id: string, name: string, description: string, prompt: string, status: string, imageUrl: string | null, error: string | null}} scenario
   */
  async function generateScenario(scenario) {
    const scenarioIndex = scenarios.findIndex(s => s.id === scenario.id);
    if (scenarioIndex === -1) return;

    try {
      // Update status
      scenarios[scenarioIndex] = { ...scenarios[scenarioIndex], status: 'generating', error: null };

      // Create the combined prompt
      const fullPrompt = `${subjectDescription}, ${scenario.prompt}`;

      // Convert the original image to data URI for image-to-image generation
      let imageData = null;
      console.log('🔍 Converting image for', scenario.name);
      console.log('🔍 selectedFile:', !!selectedFile);
      console.log('🔍 imagePreviewUrl:', !!imagePreviewUrl);
      
      if (selectedFile) {
        // Convert file to data URI
        console.log('🔍 Using selectedFile for image data');
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
          reader.readAsDataURL(selectedFile);
        });
        imageData = dataUri;
        console.log('🔍 Image data length:', imageData ? imageData.length : 0);
        console.log('🔍 Image data type:', imageData ? imageData.substring(0, 50) + '...' : 'null');
      } else if (imagePreviewUrl) {
        // If we have a preview URL, convert it to data URI
        console.log('🔍 Using imagePreviewUrl for image data');
        try {
          const response = await fetch(imagePreviewUrl);
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
          console.log('🔍 Image data from URL length:', imageData ? imageData.length : 0);
          console.log('🔍 Image data from URL type:', imageData ? imageData.substring(0, 50) + '...' : 'null');
        } catch (err) {
          console.error("Failed to convert preview URL to data URI:", err);
        }
      } else {
        console.log('🔍 No image source available');
      }

      // Generate image with original image as reference using flux kontext for image editing
      /** @type {any} */
      const options = {
        prompt: fullPrompt,
        aspect_ratio: '16:9',
        output_format: 'jpeg',
        num_images: 1,
        enable_safety_checker: false,
        safety_tolerance: '6',
        raw: false
      };

      // Add image reference if available
      if (imageData) {
        options.image_url = imageData;
        console.log('✅ Added image_url to options for', scenario.name);
      } else {
        console.log('❌ No image data available for', scenario.name);
      }

      console.log('🔍 Options being sent:', {
        prompt: fullPrompt,
        hasImageUrl: !!options.image_url,
        imageUrlLength: options.image_url ? options.image_url.length : 0
      });

      // Force flux kontext model for image editing/relighting
      const result = await fluxApiManager.generateImage(options, 'fal-ai/flux-pro/kontext');
      
      if (result && result.images && result.images.length > 0) {
        const imageUrl = result.images[0].url;
        
        // Save to gallery
        await imageManager.saveImage(imageUrl, fullPrompt, {
          model: 'fal-ai/flux-pro/kontext',
          aspectRatio: '16:9',
          outputFormat: 'jpeg',
          numImages: 1,
          enableSafetyChecker: false,
          safetyTolerance: '6',
          raw: false,
          hasReferenceImage: !!imageData,
          provider: result.provider
        });

        // Update scenario
        scenarios[scenarioIndex] = { 
          ...scenarios[scenarioIndex], 
          status: 'completed', 
          imageUrl: imageUrl,
          error: null 
        };
      } else {
        throw new Error('No image generated');
      }

    } catch (error) {
      console.error(`Error generating ${scenario.name}:`, error);
      scenarios[scenarioIndex] = { 
        ...scenarios[scenarioIndex], 
        status: 'error', 
        error: (error instanceof Error ? error.message : String(error)) || 'Generation failed' 
      };
    }
  }

  /**
   * Regenerate a single scenario
   * @param {{id: string, name: string, description: string, prompt: string, status: string, imageUrl: string | null, error: string | null}} scenario
   */
  async function regenerateScenario(scenario) {
    await generateScenario(scenario);
  }

  /**
   * Get status color class
   * @param {string} status
   * @returns {string}
   */
  function getStatusColor(status) {
    switch (status) {
      case 'generating': return 'border-blue-500 bg-blue-50';
      case 'completed': return 'border-green-500 bg-green-50';
      case 'error': return 'border-red-500 bg-red-50';
      default: return 'border-gray-400 bg-gray-100';
    }
  }
</script>

<div class="flex flex-col h-full font-sans bg-gray-300 text-black">
  <!-- Header -->
  <div class="p-3 border-b border-gray-500 bg-gray-300">
    <h2 class="m-0 text-xl font-bold text-black">Lighting Studio</h2>
    <p class="mt-1 mb-0 text-sm text-gray-600">Transform your images with different lighting scenarios</p>
  </div>

  <!-- Main Content -->
  <div class="flex-1 overflow-auto p-4">
    <!-- Top Section: Image Upload and Analysis -->
    <div class="grid grid-cols-2 gap-4 mb-6">
      <!-- Left: Image Upload -->
      <div class="bg-gray-200 border border-gray-500 p-4">
        <h3 class="text-lg font-bold mb-3">Upload Image</h3>
        
        <!-- File Drop Zone -->
        <div
          class="border-2 border-dashed border-gray-400 p-6 text-center cursor-pointer transition-colors duration-200 {isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-400 bg-gray-100'}"
          role="button"
          tabindex="0"
          ondragover={handleDragOver}
          ondragleave={handleDragLeave}
          ondrop={handleDrop}
          onclick={() => document.getElementById('image-input')?.click()}
          onkeydown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              document.getElementById('image-input')?.click();
            }
          }}
        >
          {#if imagePreviewUrl}
            <img src={imagePreviewUrl} alt="Preview" class="max-w-full max-h-48 mx-auto mb-2" />
            <p class="text-sm text-gray-600">Click to change image</p>
          {:else}
            <div class="text-4xl mb-2">📸</div>
            <p class="text-base text-gray-600 mb-1">Drop image here or click to select</p>
            <p class="text-sm text-gray-500">JPG, PNG, WebP supported</p>
          {/if}
        </div>

        <input
          id="image-input"
          type="file"
          accept="image/*"
          class="hidden"
          onchange={handleFileSelect}
        />

        <button
          class="w-full mt-3 px-4 py-2 border border-gray-400 bg-gray-300 text-black text-sm font-bold cursor-pointer btn-outset hover:bg-gray-400 disabled:bg-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed"
          onclick={analyzeImage}
          disabled={!selectedFile || isAnalyzing || !geminiApi.isAvailable()}
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Image'}
        </button>

        {#if analysisError}
          <p class="text-red-600 text-sm mt-2">{analysisError}</p>
        {/if}
      </div>

      <!-- Right: Analysis Results -->
      <div class="bg-gray-200 border border-gray-500 p-4">
        <h3 class="text-lg font-bold mb-3">Subject Analysis</h3>
        
        <!-- {#if subjectDescription} -->
          <div class="mb-3">
            <label for="subject-description" class="block text-sm font-bold mb-1">Subject Description:</label>
            <textarea
              id="subject-description"
              class="w-full h-20 border border-gray-400 p-2 text-sm bg-white text-black resize-y"
              bind:value={subjectDescription}
              placeholder="Edit the subject description before generating lighting variations..."
            ></textarea>
            <p class="text-xs text-gray-600 mt-1">💡 You can edit this description to refine how the subject will be lit</p>
          </div>
        <!-- {:else}
          <div class="bg-gray-100 border border-gray-400 p-3 mb-3">
            <p class="text-sm text-gray-500 italic">Upload and analyze an image to see editable subject description</p>
          </div>
        {/if} -->

        <button
          class="w-full px-4 py-2 border border-gray-400 bg-gray-300 text-black text-sm font-bold cursor-pointer btn-outset hover:bg-gray-400 disabled:bg-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed"
          onclick={generateAllLighting}
          disabled={!subjectDescription || isGenerating}
        >
          {isGenerating ? 'Generating All...' : 'Generate All Lighting'}
        </button>

        {#if generationError}
          <p class="text-red-600 text-sm mt-2">{generationError}</p>
        {/if}
      </div>
    </div>

    <!-- Bottom Section: Lighting Scenarios Grid -->
    <div class="bg-gray-200 border border-gray-500 p-4">
      <h3 class="text-lg font-bold mb-3">Lighting Variations</h3>
      
      <div class="grid grid-cols-4 gap-4">
        {#each scenarios as scenario}
          <div class="border-2 p-3 {getStatusColor(scenario.status)}">
            <div class="text-center">
              <h4 class="font-bold text-sm mb-1">{scenario.name}</h4>
              <p class="text-xs text-gray-600 mb-2">{scenario.description}</p>
              
              {#if scenario.imageUrl}
                <img src={scenario.imageUrl} alt={scenario.name} class="w-full h-24 object-cover border border-gray-400 mb-2" />
              {:else}
                <div class="w-full h-24 bg-gray-300 border border-gray-400 mb-2 flex items-center justify-center">
                  {#if scenario.status === 'generating'}
                    <span class="text-xs text-blue-600">Generating...</span>
                  {:else if scenario.status === 'error'}
                    <span class="text-xs text-red-600">Error</span>
                  {:else}
                    <span class="text-xs text-gray-500">No image</span>
                  {/if}
                </div>
              {/if}

              {#if scenario.status === 'completed' || scenario.status === 'error'}
                <button
                  class="w-full px-2 py-1 text-xs border border-gray-400 bg-gray-300 text-black cursor-pointer btn-outset hover:bg-gray-400"
                  onclick={() => regenerateScenario(scenario)}
                >
                  Regenerate
                </button>
              {:else if scenario.status === 'idle'}
                <button
                  class="w-full px-2 py-1 text-xs border border-gray-400 bg-gray-300 text-black cursor-pointer btn-outset hover:bg-gray-400 disabled:bg-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed"
                  onclick={() => generateScenario(scenario)}
                  disabled={!subjectDescription || isGenerating}
                >
                  Generate
                </button>
              {/if}

              {#if scenario.error}
                <p class="text-xs text-red-600 mt-1">{scenario.error}</p>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>