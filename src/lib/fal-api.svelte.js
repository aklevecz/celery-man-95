import { fal } from "@fal-ai/client";

const models = {
  flux_pro_1_1_ultra: "fal-ai/flux-pro/v1.1-ultra",
};

const createFalApi = () => {
  let lastVideoUrl = $state("");

  fal.config({
    proxyUrl: "/api/fal/proxy",
  });

  /**
   * Generate an image using the FLUX PRO 1.1 ULTRA model from fal.ai
   * @param {string} prompt - The text prompt for image generation
   * @returns {Promise<string | null>} - The URL of the generated image, or null on failure
   */
  async function generateFluxImage(prompt) {
    const result = await fal.subscribe(models.flux_pro_1_1_ultra, {
      input: {
        prompt,
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
