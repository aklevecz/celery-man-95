<script>
  import {
      addAnalysisToImage,
      deleteAnalyzedImage,
      exportAnalyzedImageMetadata,
      getAllTags,
      getAnalyzedImages,
      saveAnalyzedImage,
      searchAnalyzedImages
  } from '$lib/analyzed-image-storage.js';
  import { geminiApi } from '$lib/gemini-api.svelte.js';
  import { onMount } from 'svelte';

  /** @type {AnalyzedImage[]} */
  let analyzedImages = $state([]);
  /** @type {AnalyzedImage | null} */
  let selectedImage = $state(null);
  /** @type {string} */
  let searchTerm = $state('');
  /** @type {string[]} */
  let availableTags = $state([]);
  /** @type {boolean} */
  let isDragOver = $state(false);
  /** @type {boolean} */
  let isAnalyzing = $state(false);
  /** @type {string} */
  let error = $state('');
  /** @type {string} */
  let newImageName = $state('');
  /** @type {string} */
  let newImageTags = $state('');
  /** @type {string} */
  let newImageNotes = $state('');
  /** @type {'prompt' | 'artistic' | 'technical' | 'subject' | 'style'} */
  let analysisType = $state('prompt');
  /** @type {File | null} */
  let draggedFile = $state(null);
  /** @type {string | null} */
  let draggedImagePreview = $state(null);

  /**
   * Load analyzed images from storage
   */
  function loadAnalyzedImages() {
    analyzedImages = getAnalyzedImages();
    availableTags = getAllTags();
  }

  /**
   * Filter images based on search term
   */
  const filteredImages = $derived(
    searchTerm ? searchAnalyzedImages(searchTerm) : analyzedImages
  );

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

    // Check for image URL data (from gallery drag or browser)
    const imageUrl = event.dataTransfer?.getData("text/uri-list") || event.dataTransfer?.getData("text/plain");

    if (imageUrl && (imageUrl.startsWith("http") || imageUrl.startsWith("blob:") || imageUrl.startsWith("data:"))) {
      // Handle dragged image URL
      try {
        // Convert URL to blob and then to file
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        // Try to extract filename from URL
        let filename = 'Dragged Image';
        try {
          const url = new URL(imageUrl);
          const pathname = url.pathname;
          const lastSegment = pathname.split('/').pop();
          if (lastSegment && lastSegment.includes('.')) {
            filename = lastSegment.replace(/\.[^/.]+$/, ''); // Remove extension
          }
        } catch {
          // If URL parsing fails, use default name
        }
        
        const file = new File([blob], filename + '.jpg', { type: blob.type });
        
        draggedFile = file;
        draggedImagePreview = URL.createObjectURL(file);
        newImageName = filename;
        newImageTags = '';
        newImageNotes = '';
        selectedImage = null;
        error = '';
      } catch (err) {
        error = "Failed to use dragged image";
        console.error("Image URL error:", err);
      }
      return;
    }

    // Handle file drops
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const imageFile = Array.from(files).find(file => file.type.startsWith('image/'));
      
      if (imageFile) {
        draggedFile = imageFile;
        draggedImagePreview = URL.createObjectURL(imageFile);
        newImageName = imageFile.name.replace(/\.[^/.]+$/, ''); // Remove extension
        newImageTags = '';
        newImageNotes = '';
        selectedImage = null;
        error = '';
      }
    }
  }

  /**
   * Handle file input change
   * @param {Event} event
   */
  function handleFileInput(event) {
    const target = /** @type {HTMLInputElement} */ (event.target);
    const file = target.files?.[0];
    
    if (file && file.type.startsWith('image/')) {
      draggedFile = file;
      draggedImagePreview = URL.createObjectURL(file);
      newImageName = file.name.replace(/\.[^/.]+$/, '');
      newImageTags = '';
      newImageNotes = '';
      selectedImage = null;
      error = '';
    }
  }

  /**
   * Analyze the current image
   */
  async function analyzeImage() {
    if (!draggedFile) return;
    
    try {
      isAnalyzing = true;
      error = '';
      
      // Convert file to data URL
      const reader = new FileReader();
      const imageDataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(/** @type {string} */ (reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(draggedFile || new Blob());
      });
      
      // Perform analysis
      const description = await geminiApi.describeImage({
        image: imageDataUrl,
        style: analysisType
      });
      
      // Create or update analyzed image
      const imageId = `analyzed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const tags = newImageTags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      /** @type AnalyzedImage} */
      const analyzedImage = {
        id: imageId,
        name: newImageName || 'Untitled Image',
        imageUrl: imageDataUrl,
        analyses: [{
          type: analysisType,
          description,
          timestamp: Date.now()
        }],
        tags: tags.length > 0 ? tags : undefined,
        notes: newImageNotes || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      // Save to storage
      if (saveAnalyzedImage(analyzedImage)) {
        loadAnalyzedImages();
        selectedImage = analyzedImage;
        
        // Clean up preview URL
        if (draggedImagePreview) {
          URL.revokeObjectURL(draggedImagePreview);
        }
        
        draggedFile = null;
        draggedImagePreview = null;
        newImageName = '';
        newImageTags = '';
        newImageNotes = '';
      } else {
        error = 'Failed to save analyzed image';
      }
      
    } catch (err) {
      error = err.message || 'Failed to analyze image';
    } finally {
      isAnalyzing = false;
    }
  }

  /**
   * Add new analysis to existing image
   * @param AnalyzedImage} image
   */
  async function addAnalysisToExistingImage(image) {
    if (!image.imageUrl) return;
    
    try {
      isAnalyzing = true;
      error = '';
      
      // Perform analysis
      const description = await geminiApi.describeImage({
        image: image.imageUrl,
        style: analysisType
      });
      
      // Add analysis to image
      const analysis = {
        type: analysisType,
        description,
        timestamp: Date.now()
      };
      
      if (addAnalysisToImage(image.id, analysis)) {
        loadAnalyzedImages();
        // Update selected image
        selectedImage = getAnalyzedImages().find(img => img.id === image.id) || null;
      } else {
        error = 'Failed to add analysis';
      }
      
    } catch (err) {
      error = err.message || 'Failed to analyze image';
    } finally {
      isAnalyzing = false;
    }
  }

  /**
   * Delete analyzed image
   * @param {string} imageId
   */
  function deleteImage(imageId) {
    if (confirm('Are you sure you want to delete this analyzed image?')) {
      if (deleteAnalyzedImage(imageId)) {
        loadAnalyzedImages();
        if (selectedImage?.id === imageId) {
          selectedImage = null;
        }
      }
    }
  }

  /**
   * Export image metadata
   * @param {string} imageId
   */
  function exportMetadata(imageId) {
    const metadata = exportAnalyzedImageMetadata(imageId);
    if (metadata) {
      const blob = new Blob([metadata], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analyzed_image_${imageId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Select image for viewing
   * @param AnalyzedImage} image
   */
  function selectImage(image) {
    selectedImage = image;
    draggedFile = null;
  }

  /**
   * Clear current selection
   */
  function clearSelection() {
    selectedImage = null;
    
    // Clean up preview URL
    if (draggedImagePreview) {
      URL.revokeObjectURL(draggedImagePreview);
    }
    
    draggedFile = null;
    draggedImagePreview = null;
    newImageName = '';
    newImageTags = '';
    newImageNotes = '';
  }

  /**
   * Get analysis by type
   * @param AnalyzedImage} image
   * @param {string} type
   * @returns ImageAnalysis | undefined}
   */
  function getAnalysis(image, type) {
    return image.analyses.find(a => a.type === type);
  }

  /**
   * Format timestamp
   * @param {number} timestamp
   * @returns {string}
   */
  function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();
  }

  onMount(() => {
    loadAnalyzedImages();
  });
</script>

<div class="flex flex-col h-full font-sans bg-gray-300 text-black">
  <!-- Header -->
  <div class="p-3 border-b border-gray-500 bg-gray-300">
    <h2 class="m-0 text-xl font-bold text-black">Image Analyzer</h2>
    <p class="mt-1 mb-0 text-sm text-gray-600">Analyze images and catalog their metadata</p>
  </div>

  <!-- Main Content -->
  <div class="flex flex-1 min-h-0">
    <!-- Left Panel: Image List -->
    <div class="w-1/3 border-r border-gray-500 bg-gray-200 flex flex-col">
      <!-- Search -->
      <div class="p-3 border-b border-gray-500">
        <input
          type="text"
          placeholder="Search images..."
          class="w-full border border-gray-500 p-2 text-sm bg-white text-black"
          bind:value={searchTerm}
        />
        <div class="mt-2 text-xs text-gray-600">
          {filteredImages.length} of {analyzedImages.length} images
        </div>
      </div>

      <!-- Image List -->
      <div class="flex-1 overflow-auto">
        {#each filteredImages as image (image.id)}
          <div 
            class="border-b border-gray-400 p-3 cursor-pointer hover:bg-gray-300 {selectedImage?.id === image.id ? 'bg-blue-200' : ''}"
            role="button"
            tabindex="0"
            onclick={() => selectImage(image)}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectImage(image);
              }
            }}
          >
            <div class="flex items-center gap-2">
              <img 
                src={image.imageUrl} 
                alt={image.name}
                class="w-12 h-12 object-cover border border-gray-500"
              />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-sm truncate">{image.name}</div>
                <div class="text-xs text-gray-600">
                  {image.analyses.length} analysis{image.analyses.length !== 1 ? 'es' : ''}
                </div>
                {#if image.tags}
                  <div class="text-xs text-blue-600 mt-1">
                    {image.tags.join(', ')}
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Right Panel: Analysis -->
    <div class="flex-1 flex flex-col">
      {#if selectedImage}
        <!-- Selected Image View -->
        <div class="p-4 border-b border-gray-500 bg-gray-200">
          <div class="flex gap-4">
            <img 
              src={selectedImage.imageUrl} 
              alt={selectedImage.name}
              class="w-32 h-32 object-cover border border-gray-500"
            />
            <div class="flex-1">
              <h3 class="text-lg font-bold mb-2">{selectedImage.name}</h3>
              {#if selectedImage.tags}
                <div class="mb-2">
                  <span class="text-sm font-bold">Tags:</span>
                  <span class="text-sm text-blue-600">{selectedImage.tags.join(', ')}</span>
                </div>
              {/if}
              {#if selectedImage.notes}
                <div class="mb-2">
                  <span class="text-sm font-bold">Notes:</span>
                  <span class="text-sm">{selectedImage.notes}</span>
                </div>
              {/if}
              <div class="text-xs text-gray-600">
                Created: {formatTimestamp(selectedImage.createdAt)}
                {#if selectedImage.updatedAt !== selectedImage.createdAt}
                  • Updated: {formatTimestamp(selectedImage.updatedAt)}
                {/if}
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <button
                class="px-3 py-1 text-sm border border-gray-400 bg-gray-300 text-black cursor-pointer btn-outset hover:bg-gray-400"
                onclick={() => exportMetadata(selectedImage.id)}
              >
                Export
              </button>
              <button
                class="px-3 py-1 text-sm border border-gray-400 bg-red-300 text-black cursor-pointer btn-outset hover:bg-red-400"
                onclick={() => deleteImage(selectedImage.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        <!-- Analysis Results -->
        <div class="flex-1 overflow-auto p-4">
          <h4 class="text-md font-bold mb-3">Analysis Results</h4>
          
          {#each selectedImage.analyses as analysis (analysis.type + analysis.timestamp)}
            <div class="mb-4 p-3 border border-gray-500 bg-white rounded">
              <div class="flex justify-between items-center mb-2">
                <span class="font-bold text-sm capitalize">{analysis.type}</span>
                <span class="text-xs text-gray-600">{formatTimestamp(analysis.timestamp)}</span>
              </div>
              <div class="text-sm">{analysis.description}</div>
            </div>
          {/each}

          <!-- Add New Analysis -->
          <div class="mt-6 p-3 border border-gray-500 bg-gray-100 rounded">
            <h5 class="font-bold mb-2">Add New Analysis</h5>
            <div class="flex gap-2 mb-2">
              <select 
                class="flex-1 border border-gray-500 p-2 text-sm bg-white text-black"
                bind:value={analysisType}
              >
                <option value="prompt">Prompt Style</option>
                <option value="artistic">Artistic Style</option>
                <option value="technical">Technical Details</option>
                <option value="subject">Subject Description</option>
                <option value="style">Style & Lighting</option>
              </select>
              <button
                class="px-4 py-2 border border-gray-400 bg-blue-300 text-black cursor-pointer btn-outset hover:bg-blue-400 disabled:opacity-50"
                onclick={() => addAnalysisToExistingImage(selectedImage)}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
          </div>
        </div>
      {:else if draggedFile}
        <!-- New Image Analysis -->
        <div class="p-4 border-b border-gray-500 bg-gray-200">
          <h3 class="text-lg font-bold mb-3">New Image Analysis</h3>
          <div class="flex gap-4">
            <div class="w-32 h-32 border border-gray-500 bg-gray-100 flex items-center justify-center">
              {#if draggedImagePreview}
                <img 
                  src={draggedImagePreview} 
                  alt="Preview"
                  class="w-full h-full object-cover"
                />
              {:else}
                <span class="text-gray-600">Image Preview</span>
              {/if}
            </div>
            <div class="flex-1">
              <div class="mb-2">
                <label class="block text-sm font-bold mb-1" for="image-name">Name:</label>
                <input
                  id="image-name"
                  type="text"
                  class="w-full border border-gray-500 p-2 text-sm bg-white text-black"
                  bind:value={newImageName}
                  placeholder="Enter image name"
                />
              </div>
              <div class="mb-2">
                <label class="block text-sm font-bold mb-1" for="image-tags">Tags (comma-separated):</label>
                <input
                  id="image-tags"
                  type="text"
                  class="w-full border border-gray-500 p-2 text-sm bg-white text-black"
                  bind:value={newImageTags}
                  placeholder="portrait, landscape, digital art"
                />
              </div>
              <div class="mb-2">
                <label class="block text-sm font-bold mb-1" for="image-notes">Notes:</label>
                <textarea
                  id="image-notes"
                  class="w-full border border-gray-500 p-2 text-sm bg-white text-black"
                  bind:value={newImageNotes}
                  placeholder="Optional notes about this image"
                  rows="2"
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- Analysis Controls -->
        <div class="flex-1 overflow-auto p-4">
          <div class="mb-4">
            <label class="block text-sm font-bold mb-2" for="analysis-type">Analysis Type:</label>
            <select 
              id="analysis-type"
              class="w-full border border-gray-500 p-2 text-sm bg-white text-black"
              bind:value={analysisType}
            >
              <option value="prompt">Prompt Style</option>
              <option value="artistic">Artistic Style</option>
              <option value="technical">Technical Details</option>
              <option value="subject">Subject Description</option>
              <option value="style">Style & Lighting</option>
            </select>
          </div>
          
          <button
            class="w-full px-4 py-3 border border-gray-400 bg-blue-300 text-black cursor-pointer btn-outset hover:bg-blue-400 disabled:opacity-50"
            onclick={analyzeImage}
            disabled={isAnalyzing || !newImageName.trim()}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Image'}
          </button>
        </div>
      {:else}
        <!-- Drop Zone -->
        <div class="flex-1 flex items-center justify-center p-4">
          <div
            class="w-full max-w-md border-2 border-dashed border-gray-400 rounded p-8 text-center cursor-pointer transition-colors {isDragOver ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-600'}"
            role="button"
            tabindex="0"
            ondragover={handleDragOver}
            ondragleave={handleDragLeave}
            ondrop={handleDrop}
            onclick={() => document.getElementById("image-input")?.click()}
            onkeydown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                document.getElementById("image-input")?.click();
              }
            }}
          >
            <div class="text-4xl mb-4">📸</div>
            <p class="text-lg mb-2">Drop an image here to analyze</p>
            <p class="text-sm text-gray-600 mb-4">or</p>
            <input
              type="file"
              accept="image/*"
              class="hidden"
              onchange={handleFileInput}
              id="image-input"
            />
            <button
              type="button"
              class="px-4 py-2 border border-gray-400 bg-gray-300 text-black cursor-pointer btn-outset hover:bg-gray-400"
            >
              Choose Image
            </button>
          </div>
        </div>
      {/if}

      <!-- Clear Selection -->
      {#if selectedImage || draggedFile}
        <div class="p-3 border-t border-gray-500 bg-gray-200">
          <button
            class="px-4 py-2 border border-gray-400 bg-gray-300 text-black cursor-pointer btn-outset hover:bg-gray-400"
            onclick={clearSelection}
          >
            Clear Selection
          </button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Error Display -->
  {#if error}
    <div class="p-3 border-t border-gray-500 bg-red-100 text-red-700">
      <strong>Error:</strong> {error}
    </div>
  {/if}
</div>