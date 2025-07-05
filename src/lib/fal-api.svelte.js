import { fal } from "@fal-ai/client";

/** @type {Record<string, Model>} */
export const models = {
  flux_pro_1_1_ultra: "fal-ai/flux-pro/v1.1-ultra",
  flux_kontext_pro: "fal-ai/flux-pro/kontext",
  flux_kontext_pro_text_to_image: "fal-ai/flux-pro/kontext/text-to-image",
  seedance_pro_text_to_video: "fal-ai/bytedance/seedance/v1/pro/text-to-video",
  seedance_pro_image_to_video: "fal-ai/bytedance/seedance/v1/pro/image-to-video",
  clarity_upscaler: "fal-ai/clarity-upscaler",
  esrgan: "fal-ai/esrgan",
  creative_upscaler: "fal-ai/creative-upscaler",
  aura_sr: "fal-ai/aura-sr",
  fooocus_upscale: "fal-ai/fooocus/upscale-or-vary",
};

// Response examples
// let IN_QUEUE_EXAMPLE = {status: 'IN_QUEUE', request_id: '734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9', response_url: 'https://queue.fal.run/fal-ai/flux-pro/requests/734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9', status_url: 'https://queue.fal.run/fal-ai/flux-pro/requests/734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9/status', cancel_url: 'https://queue.fal.run/fal-ai/flux-pro/requests/734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9/cancel', …}
// let IN_PROGRESS_EXAMPLE = {status: 'IN_PROGRESS', request_id: '734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9', response_url: 'https://queue.fal.run/fal-ai/flux-pro/requests/734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9', status_url: 'https://queue.fal.run/fal-ai/flux-pro/requests/734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9/status', cancel_url: 'https://queue.fal.run/fal-ai/flux-pro/requests/734b9d70-86d2-4dfb-9eeb-d14c5c7c6ed9/cancel', …}

const createFalApi = () => {
  let lastVideoUrl = $state("");

  // Simple configuration without middleware for now
  fal.config({
    proxyUrl: "/api/fal/proxy",
  });

  // /**
  //  * Function to get request headers with API key
  //  * @returns {Record<string, string>} Headers object
  //  */
  // function getRequestHeaders() {
  //   /** @type {Record<string, string>} */
  //   const headers = {};
  //   try {
  //     const clientApiKey = settingsManager.getSetting("falApiKey");
  //     if (clientApiKey && clientApiKey.trim()) {
  //       headers["x-fal-client-key"] = clientApiKey.trim();
  //     }
  //   } catch (error) {
  //     console.warn("Error getting API key:", error);
  //   }
  //   return headers;
  // }

  /**
   * Generate an image using FLUX models from fal.ai
   * @param {Model} model - The model to use
   * @param {ImageGenerationOptions} options - The options for image generation
   * @returns {Promise<string | null>} - The URL of the generated image, or null on failure
   */
  async function generateFluxImage(model, options) {
    const { prompt, image_url, ...otherOptions } = options;
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
    // Prepare input parameters
    /** @type {Record<string, any>} */
    const inputParams = { prompt, ...otherOptions };
    if (image_url) {
      inputParams.image_url = image_url;
    }

    // Debug logging
    console.log("🔧 Debug: Original Model:", model);
    console.log("🔧 Debug: Actual Model:", actualModel);
    console.log("🔧 Debug: Input Params:", inputParams);

    const result = await fal.subscribe(actualModel, {
      input: inputParams,
      logs: true,
      onQueueUpdate: (update) => {
        console.log("📡 Queue Update:", update);
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });

    // Debug the full result
    console.log("🎯 Final Result:", result);

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
   * @returns {Promise<string>} - The URL of the generated video
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

  /**
   * Generate a video using Seedance models from fal.ai
   * @param {Model} model - The Seedance model to use
   * @param {VideoGenerationOptions} options - The options for video generation
   * @returns {Promise<string | null>} - The URL of the generated video, or null on failure
   */
  async function generateSeedanceVideo(model, options) {
    const { prompt, image_url, ...otherOptions } = options;
    /** @type {Record<string, any>} */
    const otherOpts = otherOptions;

    // Validate inputs
    if (!model || typeof model !== "string") {
      throw new Error("Invalid model specified");
    }

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      throw new Error("Prompt is required");
    }

    // Prepare input parameters - clean up undefined values
    /** @type {Record<string, any>} */
    const inputParams = { prompt: prompt.trim() };

    // Add other options only if they have valid values
    Object.keys(otherOpts).forEach((key) => {
      const value = otherOpts[key];
      if (value !== undefined && value !== null && value !== "") {
        inputParams[key] = value;
      }
    });

    // Add image URL if provided
    if (image_url) {
      inputParams.image_url = image_url;
    }

    // Debug logging
    console.log("🎬 Debug: Video Model:", model);
    console.log("🎬 Debug: Video Input Params:", inputParams);

    try {
      // Get headers with API key (for future use)
      // const headers = getRequestHeaders();

      const result = await fal.subscribe(model, {
        input: inputParams,
        logs: true,
        onQueueUpdate: (update) => {
          console.log("🎬 Video Queue Update:", update);
          if (update.status === "IN_PROGRESS" && update.logs) {
            update.logs.map((log) => log.message).forEach(console.log);
          }
        },
      });

      // Debug the full result
      console.log("🎬 Video Final Result:", result);

      // Check for video in response
      if (result?.data?.video?.url) {
        return result.data.video.url;
      }

      // Check for errors in the response
      if (result?.data?.error) {
        throw new Error(`API Error: ${result.data.error}`);
      }

      console.warn("No video URL found in response:", result);
      return null;
    } catch (error) {
      console.error("Video generation error:", error);
      throw error;
    }
  }

  /**
   * Test WebSocket connection using fal.realtime.connect
   * @returns {Promise<TestResult>} Test result with status and data
   */
  async function testRealTime() {
    return new Promise((resolve, reject) => {
      console.log("🔗 Testing WebSocket connection...");
      // const connection = fal.realtime.connect("fal-ai/fast-turbo-diffusion", {
      //   onResult: (result) => {
      //     console.log(result);
      //   },
      //   onError: (error) => {
      //     console.error(error);
      //   },
      // });
      // console.log(connection);
      // connection.send({
      //   prompt: "a cat",
      //   seed: 6252023,
      //   image_size: "landscape_4_3",
      //   num_images: 1,
      // });

      const realTimeModel = "fal-ai/fast-turbo-diffusion";

      const connection = fal.realtime.connect(realTimeModel, {
        onResult: (result) => {
          console.log("✅ WebSocket success:", result);
          resolve({
            success: true,
            message: "WebSocket connection successful!",
            data: result,
          });
        },
        onError: (error) => {
          console.error("❌ WebSocket error:", error);
          reject({
            success: false,
            message: `WebSocket connection failed: ${error.message || error}`,
            error: error,
          });
        },
      });

      // Send a simple test request
      connection.send({
        prompt: "simple test image of a red circle",
        num_images: 1,
        image_size: "square",
      });

      // Set a timeout in case the connection hangs
      setTimeout(() => {
        reject({
          success: false,
          message: "WebSocket connection timed out after 30 seconds",
          error: "Timeout",
        });
      }, 30000);
    });

    // async function uploadFile() {
    //   const file = new File(["Hello, World!"], "hello.txt", { type: "text/plain" });
    //   const url = await fal.storage.upload(file);
    // }
  }

  /**
   * Upscale an image using FAL.AI upscaling models
   * @param {Model} model - The upscaling model to use
   * @param {UpscalingOptions} options - The options for image upscaling
   * @returns {Promise<string | null>} - The URL of the upscaled image, or null on failure
   */
  async function generateUpscaledImage(model, options) {
    const { image_url, scale_factor = 2, ...otherOptions } = options;
    /** @type {Record<string, any>} */
    const otherOpts = otherOptions;

    // Validate inputs
    if (!model || typeof model !== "string") {
      throw new Error("Invalid model specified");
    }

    if (!image_url || typeof image_url !== "string") {
      throw new Error("Image URL is required");
    }

    // Prepare input parameters
    /** @type {Record<string, any>} */
    const inputParams = { image_url };

    // Add scale factor if supported by model
    if (model.includes("esrgan") || model.includes("clarity") || model.includes("creative")) {
      inputParams.scale_factor = scale_factor;
    }

    // Add other options only if they have valid values
    Object.keys(otherOpts).forEach((key) => {
      const value = otherOpts[key];
      if (value !== undefined && value !== null && value !== "") {
        inputParams[key] = value;
      }
    });

    // Debug logging
    console.log("🔍 Debug: Upscaling Model:", model);
    console.log("🔍 Debug: Upscaling Input Params:", inputParams);

    try {
      const result = await fal.subscribe(model, {
        input: inputParams,
        logs: true,
        onQueueUpdate: (update) => {
          console.log("🔍 Upscaling Queue Update:", update);
          if (update.status === "IN_PROGRESS" && update.logs) {
            update.logs.map((log) => log.message).forEach(console.log);
          }
        },
      });

      // Debug the full result
      console.log("🔍 Upscaling Final Result:", result);

      // Check for image in response
      if (result?.data?.image?.url) {
        return result.data.image.url;
      }

      // Some models return images array
      if (result?.data?.images && result.data.images.length > 0) {
        return result.data.images[0].url;
      }

      // Check for errors in the response
      if (result?.data?.error) {
        throw new Error(`API Error: ${result.data.error}`);
      }

      console.warn("No image URL found in upscaling response:", result);
      return null;
    } catch (error) {
      console.error("Image upscaling error:", error);
      throw error;
    }
  }

  return {
    generateFluxImage,
    generateSeedanceImageToVideo,
    generateSeedanceVideo,
    generateUpscaledImage,
    testRealTime,
  };
};

const falApi = createFalApi();
export default falApi;
