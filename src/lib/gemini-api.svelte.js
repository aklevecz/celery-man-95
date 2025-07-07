import { GoogleGenerativeAI } from "@google/generative-ai";
import { settingsManager } from "$lib/settings-manager.svelte.js";

/**
 * @typedef {Object} PromptGenerationOptions
 * @property {string} scenePremise - The general scene type/premise
 * @property {'detailed' | 'artistic' | 'realistic' | 'cinematic'} [style] - Style of the prompt
 * @property {boolean} [appendMode] - Whether to append to existing prompt or replace
 */

/**
 * @typedef {Object} ImageDescriptionOptions
 * @property {File | string} image - Image file or URL to analyze
 * @property {'prompt' | 'artistic' | 'technical' | 'subject' | 'style'} [style] - Style of description
 * @property {boolean} [appendMode] - Whether to append to existing prompt or replace
 */

function createGeminiApi() {
  /** @type {GoogleGenerativeAI | null} */
  let genAI = null;

  /** @type {string} */
  let error = $state("");

  /** @type {boolean} */
  let isGenerating = $state(false);

  /**
   * Initialize Gemini AI with user's API key
   * @returns {boolean} - True if successfully initialized
   */
  function initializeGemini() {
    const apiKey = settingsManager.getSetting("geminiApiKey");
    if (!apiKey || !apiKey.trim()) {
      error = "Gemini API key not configured. Please add it in Settings.";
      return false;
    }

    try {
      genAI = new GoogleGenerativeAI(apiKey.trim());
      error = "";
      return true;
    } catch (/** @type {any} */ err) {
      error = `Failed to initialize Gemini: ${err.message}`;
      return false;
    }
  }

  /**
   * Convert image to base64 for Gemini API
   * @param {File | string} image - Image file or URL
   * @returns {Promise<{data: string, mimeType: string}>}
   */
  async function imageToBase64(image) {
    if (typeof image === 'string') {
      // If it's a URL, fetch it
      const response = await fetch(image);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = /** @type {string} */ (reader.result).split(',')[1];
          resolve({
            data: base64,
            mimeType: blob.type || 'image/jpeg'
          });
        };
        reader.readAsDataURL(blob);
      });
    } else {
      // If it's a File
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = /** @type {string} */ (reader.result).split(',')[1];
          resolve({
            data: base64,
            mimeType: image.type || 'image/jpeg'
          });
        };
        reader.readAsDataURL(image);
      });
    }
  }

  /**
   * Describe an image and optionally generate a prompt
   * @param {ImageDescriptionOptions} options - Description options
   * @returns {Promise<string>} - Generated description/prompt
   */
  async function describeImage(options) {
    const { image, style = 'prompt', appendMode = false } = options;

    if (!image) {
      throw new Error('Image is required');
    }

    if (!initializeGemini()) {
      throw new Error(error);
    }

    isGenerating = true;
    error = '';

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      // Convert image to base64
      const { data, mimeType } = await imageToBase64(image);

      // Build the system prompt based on style
      const styleInstructions = {
        prompt: 'Describe this image in a way that could recreate it with AI image generation. Return only the descriptive text.',
        artistic: 'Describe the artistic style, composition, and aesthetic qualities. Return only the descriptive text.',
        technical: 'Describe the technical aspects: composition, lighting setup, camera perspective. Return only the descriptive text.',
        subject: 'Describe only what is shown: objects, people, elements, their appearance and poses. Return only the descriptive text.',
        style: 'Describe only the lighting, mood, color palette, and visual style. Do not mention subjects. Return only the descriptive text.'
      };

      const systemPrompt = `${styleInstructions[style]}

Respond with only a concise description (30-100 words) that could be used directly in an AI image prompt. Do not include phrases like "Generate an image" or "Create a picture". Just describe what you see.`;

      const result = await model.generateContent([
        systemPrompt,
        {
          inlineData: {
            data: data,
            mimeType: mimeType
          }
        }
      ]);

      const response = result.response;
      const description = response.text().trim();

      if (!description) {
        throw new Error('Empty response from Gemini');
      }

      return description;
      
    } catch (/** @type {any} */ err) {
      error = `Failed to describe image: ${err.message}`;
      throw new Error(error);
    } finally {
      isGenerating = false;
    }
  }

  /**
   * Generate a random prompt based on scene premise
   * @param {PromptGenerationOptions} options - Generation options
   * @returns {Promise<string>} - Generated prompt
   */
  async function generatePrompt(options) {
    const { scenePremise, style = "detailed", appendMode = false } = options;

    if (!scenePremise.trim()) {
      throw new Error("Scene premise is required");
    }

    if (!initializeGemini()) {
      throw new Error(error);
    }

    isGenerating = true;
    error = "";

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // Build the system prompt based on style
      const styleInstructions = {
        detailed: "Create a highly detailed, descriptive prompt with specific details about lighting, composition.",
        artistic: "Create an artistic prompt emphasizing creative expression, unique perspectives, and artistic techniques or styles.",
        realistic: "Create a photorealistic prompt focusing on natural lighting, realistic proportions, and authentic details.",
        cinematic: "Create a cinematic prompt with dramatic lighting, composition techniques, and movie-like atmosphere.",
      };

      const systemPrompt = `You are a professional AI image prompt generator. Your task is to create compelling, detailed prompts for AI image generation based on a given scene premise.

Requirements:
- Generate a single, comprehensive prompt describing the scene (not multiple options)
- ${styleInstructions[style]}
- Include specific details about: subject, setting, lighting, composition, style, mood
- Make it vivid and descriptive but concise (aim for 50-150 words)
- Focus on visual elements that would help an AI create a compelling image
- Avoid overly complex or contradictory instructions
- Don't include technical camera settings unless specifically relevant
- Place the subject or person in the scene, but do not describe them.

Scene premise: "${scenePremise}"
Style: ${style}

Generate one detailed prompt:`;

      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      const generatedPrompt = response.text().trim();

      if (!generatedPrompt) {
        throw new Error("Empty response from Gemini");
      }

      return generatedPrompt;
    } catch (/** @type {any} */ err) {
      error = `Failed to generate prompt: ${err.message}`;
      throw new Error(error);
    } finally {
      isGenerating = false;
    }
  }

  /**
   * Get predefined scene categories
   * @returns {Array<{id: string, label: string, description: string}>}
   */
  function getSceneCategories() {
    return [
      { id: "landscape", label: "Landscape", description: "Natural outdoor scenes, mountains, forests, etc." },
      { id: "portrait", label: "Portrait", description: "Human subjects, face close-ups, character studies" },
      { id: "architecture", label: "Architecture", description: "Buildings, structures, urban environments" },
      { id: "abstract", label: "Abstract", description: "Non-representational art, patterns, concepts" },
      { id: "fantasy", label: "Fantasy", description: "Magical creatures, fantastical worlds, mythology" },
      { id: "scifi", label: "Sci-Fi", description: "Futuristic technology, space, cyberpunk themes" },
      { id: "animal", label: "Animals", description: "Wildlife, pets, creatures in their environment" },
      { id: "still_life", label: "Still Life", description: "Objects, food, arrangements, product shots" },
      { id: "vehicles", label: "Vehicles", description: "Cars, aircraft, ships, transportation" },
      { id: "interior", label: "Interior", description: "Indoor spaces, rooms, architectural interiors" },
    ];
  }

  /**
   * Get style options
   * @returns {Array<{id: string, label: string, description: string}>}
   */
  function getStyleOptions() {
    return [
      { id: "detailed", label: "Detailed", description: "Highly descriptive with specific visual elements" },
      { id: "artistic", label: "Artistic", description: "Creative expression and unique artistic techniques" },
      { id: "realistic", label: "Realistic", description: "Photorealistic with natural lighting and proportions" },
      { id: "cinematic", label: "Cinematic", description: "Movie-like atmosphere with dramatic composition" },
    ];
  }

  /**
   * Check if Gemini is available (API key configured)
   * @returns {boolean}
   */
  function isAvailable() {
    const apiKey = settingsManager.getSetting("geminiApiKey");
    return !!(apiKey && apiKey.trim());
  }

  return {
    get error() {
      return error;
    },
    get isGenerating() {
      return isGenerating;
    },
    generatePrompt,
    describeImage,
    getSceneCategories,
    getStyleOptions,
    isAvailable,
  };
}

export const geminiApi = createGeminiApi();
