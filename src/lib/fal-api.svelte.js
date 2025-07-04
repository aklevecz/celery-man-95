import { fal } from "@fal-ai/client";

/** @type {Record<string, Model>} */
export const models = {
  flux_pro_1_1_ultra: "fal-ai/flux-pro/v1.1-ultra",
  flux_kontext_pro: "fal-ai/flux-pro/kontext",
};



// Response examples
// let IN_QUEUE_EXAMPLE = {status: 'IN_QUEUE', request_id: '734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9', response_url: 'https://queue.fal.run/fal-ai/flux-pro/requests/734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9', status_url: 'https://queue.fal.run/fal-ai/flux-pro/requests/734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9/status', cancel_url: 'https://queue.fal.run/fal-ai/flux-pro/requests/734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9/cancel', …}
// let IN_PROGRESS_EXAMPLE = {status: 'IN_PROGRESS', request_id: '734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9', response_url: 'https://queue.fal.run/fal-ai/flux-pro/requests/734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9', status_url: 'https://queue.fal.run/fal-ai/flux-pro/requests/734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9/status', cancel_url: 'https://queue.fal.run/fal-ai/flux-pro/requests/734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9/cancel', …}

const createFalApi = () => {
  let lastVideoUrl = $state("");

  fal.config({
    proxyUrl: "/api/fal/proxy",
  });

  /**
   * Generate an image using the FLUX PRO 1.1 ULTRA model from fal.ai
   * @param {Model} model - The model to use
   * @param {Object} options - The options for image generation
   * @param {string} options.prompt - The text prompt for image generation
   * @param {number} [options.seed] - The seed for reproducible results
   * @param {number} [options.num_images=1] - Number of images to generate (1-4)
   * @param {string} [options.aspect_ratio="16:9"] - Aspect ratio of the image
   * @param {string} [options.output_format="jpeg"] - Output format (jpeg/png)
   * @param {boolean} [options.enable_safety_checker=true] - Enable safety checker
   * @param {string} [options.safety_tolerance="2"] - Safety tolerance level (1-6)
   * @param {boolean} [options.raw=false] - Generate less processed images
   * @returns {Promise<string | null>} - The URL of the generated image, or null on failure
   */
  async function generateFluxImage(model, options) {
    const { prompt, ...otherOptions } = options;
    const result = await fal.subscribe(model, {
      input: {
        prompt,
        ...otherOptions,
      },
      logs: true,
      onQueueUpdate: (update) => {
        console.log(update);
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });
	// Could be multiple images
    if (result.data.images) {
      return result.data.images[0].url;
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
