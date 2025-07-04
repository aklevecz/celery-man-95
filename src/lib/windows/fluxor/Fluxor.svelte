<script>
  import falApi from "$lib/fal-api.svelte.js";
  import { imageManager } from "$lib/image-manager.svelte.js";

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

  const aspectRatios = ["21:9", "16:9", "4:3", "3:2", "1:1", "2:3", "3:4", "9:16", "9:21"];
  const outputFormats = ["jpeg", "png"];
  const safetyTolerances = ["1", "2", "3", "4", "5", "6"];

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


      const imageUrl = await falApi.generateFluxImage(options);
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
        <img src={generatedImage} alt="" class="max-w-full max-h-75 border border-gray-500 shadow-lg bg-white" />
      </div>
    {/if}
  </div>
</div>
