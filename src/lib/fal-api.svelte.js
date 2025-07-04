import { fal } from "@fal-ai/client";

/** @type {Record<string, Model>} */
export const models = {
  flux_pro_1_1_ultra: "fal-ai/flux-pro/v1.1-ultra",
  flux_kontext_pro: "fal-ai/flux-pro/kontext",
  flux_kontext_pro_text_to_image: "fal-ai/flux-pro/kontext/text-to-image",
};

/** @typedef {"fal-ai/flux-pro/v1.1-ultra" | "fal-ai/flux-pro/kontext" | "fal-ai/flux-pro/kontext/text-to-image"} Model */



// Response examples
// let IN_QUEUE_EXAMPLE = {status: 'IN_QUEUE', request_id: '734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9', response_url: 'https://queue.fal.run/fal-ai/flux-pro/requests/734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9', status_url: 'https://queue.fal.run/fal-ai/flux-pro/requests/734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9/status', cancel_url: 'https://queue.fal.run/fal-ai/flux-pro/requests/734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9/cancel', …}
// let IN_PROGRESS_EXAMPLE = {status: 'IN_PROGRESS', request_id: '734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9', response_url: 'https://queue.fal.run/fal-ai/flux-pro/requests/734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9', status_url: 'https://queue.fal.run/fal-ai/flux-pro/requests/734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9/status', cancel_url: 'https://queue.fal.run/fal-ai/flux-pro/requests/734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9/cancel', …}

const createFalApi = () => {
  let lastVideoUrl = $state("");

  fal.config({
    proxyUrl: "/api/fal/proxy",
  });

  /**
   * Generate an image using FLUX models from fal.ai
   * @param {Model} model - The model to use
   * @param {Object} options - The options for image generation
   * @param {string} options.prompt - The text prompt for image generation
   * @param {string} [options.image_url] - Optional reference image URL for image-to-image generation (required for Kontext model)
   * @param {number} [options.seed] - The seed for reproducible results
   * @param {number} [options.num_images=1] - Number of images to generate (1-4)
   * @param {string} [options.aspect_ratio="16:9"] - Aspect ratio of the image
   * @param {string} [options.output_format="jpeg"] - Output format (jpeg/png)
   * @param {boolean} [options.enable_safety_checker=true] - Enable safety checker
   * @param {string} [options.safety_tolerance="2"] - Safety tolerance level (1-6)
   * @param {boolean} [options.raw=false] - Generate less processed images
   * @param {number} [options.guidance_scale] - Controls how closely the model follows the prompt
   * @param {number} [options.num_inference_steps=28] - Number of inference steps (1-50)
   * @returns {Promise<string | null>} - The URL of the generated image, or null on failure
   */
  async function generateFluxImage(model, options) {
    const { prompt, image_url, ...otherOptions } = options;
    console.log(image_url)
    // For FLUX Kontext, choose the correct endpoint based on whether image_url is provided
    let actualModel = model;
    if (model === models.flux_kontext_pro) {
      if (image_url) {
        // Image-to-image: use base kontext endpoint
        actualModel = models.flux_kontext_pro;
      } else {
        // Text-to-image: use text-to-image endpoint
        actualModel = models.flux_kontext_pro_text_to_image;
      }
    }
    console.log(actualModel)
    // Prepare input parameters
    const inputParams = { prompt, ...otherOptions };
    if (image_url) {
      inputParams.image_url = image_url;
    }
    
    // Debug logging
    console.log('🔧 Debug: Original Model:', model);
    console.log('🔧 Debug: Actual Model:', actualModel);
    console.log('🔧 Debug: Input Params:', inputParams);
    
    const result = await fal.subscribe(actualModel, {
      input: inputParams,
      logs: true,
      onQueueUpdate: (update) => {
        console.log('📡 Queue Update:', update);
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });
    
    // Debug the full result
    console.log('🎯 Final Result:', result);
    
	// Could be multiple images
    if (result.data && result.data.images) {
      return result.data.images[0].url;
    }
    
    // Check for errors in the response
    if (result.data && result.data.error) {
      throw new Error(`API Error: ${result.data.error}`);
    }
    
    return null;
  }

  /**
   * Generate an image using fal.ai via server endpoint
   * @param {string} prompt - The text prompt for image generation
   * @param {string} imageBase64 - The base64-encoded image data
   */
  async function generateSeedanceImageToVideo(prompt, imageBase64) {
    const result = await fal.subscribe("fal-ai/bytedance/seedance/v1/pro/image-to-video", {
      input: {
        prompt,
        image_url: imageBase64,
      },
      logs: true,
      onQueueUpdate: (update) => {
        console.log(update);
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });
    if (result.data.video) {
      lastVideoUrl = result.data.video.url;
    }

    return lastVideoUrl;
  }

  return {
	generateFluxImage,
    generateSeedanceImageToVideo,
  };
};

const falApi = createFalApi();
export default falApi;
