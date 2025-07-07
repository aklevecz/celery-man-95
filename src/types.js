/**
 * @typedef {Object} WindowComponentContent
 * @property {any} component - The Svelte component constructor
 * @property {Object} [props] - Props to pass to the component
 */

/**
 * @typedef {Object} AppWindow
 * @property {string} id
 * @property {string} title
 * @property {string | WindowComponentContent} content
 * @property {number} width
 * @property {number} height
 * @property {number} x
 * @property {number} y
 * @property {number} zIndex
 * @property {boolean} isMinimized
 * @property {boolean} isMaximized
 * @property {{x: number, y: number, width: number, height: number} | null} originalBounds
 */

/**
 * @typedef {Object} SerializableWindow
 * @property {string} id
 * @property {string} title
 * @property {number} width
 * @property {number} height
 * @property {number} x
 * @property {number} y
 * @property {number} zIndex
 * @property {boolean} isMinimized
 * @property {boolean} isMaximized
 * @property {{x: number, y: number, width: number, height: number} | null} originalBounds
 * @property {string} contentType - 'string' or 'component'
 * @property {string} contentData - Serialized content
 */

/**
 * @typedef {Object} Theme
 * @property {string} name - Display name of the theme
 * @property {string} id - Unique identifier for the theme
 * @property {Object} colors - Color palette for the theme
 * @property {string} colors.desktop - Desktop background color
 * @property {string} colors.window - Window background color
 * @property {string} colors.windowHeader - Window header background
 * @property {string} colors.windowHeaderActive - Active window header background
 * @property {string} colors.windowHeaderText - Window header text color
 * @property {string} colors.windowBorder - Window border color
 * @property {string} colors.button - Button background color
 * @property {string} colors.buttonText - Button text color
 * @property {string} colors.taskbar - Taskbar background color
 * @property {string} colors.taskbarText - Taskbar text color
 * @property {string} colors.text - Default text color
 * @property {string} colors.textHighlight - Highlighted text color
 * @property {string} colors.shadow - Shadow color
 */

/**
 * @typedef {Object} GenerationParams
 * @property {Model} model - The model used for generation
 * @property {number} [seed] - The seed used for generation
 * @property {AspectRatio} [aspectRatio] - Aspect ratio of the image
 * @property {OutputFormat} [outputFormat] - Output format
 * @property {number} [numImages] - Number of images generated
 * @property {boolean} [enableSafetyChecker] - Whether safety checker was enabled
 * @property {SafetyTolerance} [safetyTolerance] - Safety tolerance level
 * @property {boolean} [raw] - Whether raw mode was enabled
 * @property {number} [guidanceScale] - Guidance scale value
 * @property {number} [numInferenceSteps] - Number of inference steps
 * @property {boolean} [hasReferenceImage] - Whether a reference image was used (boolean flag only)
 */

/**
 * @typedef {Object} SavedImage
 * @property {string} id - Unique image ID
 * @property {string} prompt - The complete prompt used to generate the image (no truncation)
 * @property {string} url - Original URL from the API
 * @property {number} timestamp - When the image was saved
 * @property {string} filename - Generated filename
 * @property {GenerationParams} [generationParams] - All generation parameters used
 */

/** @typedef {"fal-ai/flux-pro/v1.1-ultra" | "fal-ai/flux-pro/kontext" | "fal-ai/flux-pro/kontext/text-to-image" | "fal-ai/bytedance/seedance/v1/pro/text-to-video" | "fal-ai/bytedance/seedance/v1/pro/image-to-video" | "fal-ai/clarity-upscaler" | "fal-ai/esrgan" | "fal-ai/creative-upscaler" | "fal-ai/aura-sr" | "fal-ai/fooocus/upscale-or-vary" | "fal-ai/video-upscaler" | "fal-ai/topaz/upscale/video"} Model */

/**
 * @typedef {'21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16'} AspectRatio
 * @typedef {'jpeg' | 'png'} OutputFormat
 * @typedef {'1' | '2' | '3' | '4' | '5' | '6'} SafetyTolerance
 * @typedef {'480p' | '1080p'} Resolution
 * @typedef {'5' | '10'} VideoDuration
 * @typedef {'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED'} QueueStatus
 *
 * @typedef {Object} ImageGenerationOptions
 * @property {string} prompt - The text prompt for image generation
 * @property {string} [image_url] - Optional reference image URL for image-to-image generation
 * @property {number} [seed] - The seed for reproducible results
 * @property {number} [num_images] - Number of images to generate (1-4)
 * @property {AspectRatio} [aspect_ratio] - Aspect ratio of the image
 * @property {OutputFormat} [output_format] - Output format
 * @property {boolean} [enable_safety_checker] - Enable safety checker
 * @property {SafetyTolerance} [safety_tolerance] - Safety tolerance level
 * @property {boolean} [raw] - Generate less processed images
 * @property {number} [guidance_scale] - Controls how closely the model follows the prompt
 * @property {number} [num_inference_steps] - Number of inference steps (1-50)
 *
 * @typedef {Object} VideoGenerationOptions
 * @property {string} prompt - The text prompt for video generation
 * @property {string} [image_url] - Optional image URL for image-to-video generation
 * @property {AspectRatio} [aspect_ratio] - Aspect ratio
 * @property {Resolution} [resolution] - Resolution
 * @property {VideoDuration} [duration] - Duration in seconds
 * @property {boolean} [camera_fixed] - Whether to fix camera position
 * @property {number} [seed] - Seed for reproducible results
 *
 * @typedef {Object} UpscalingOptions
 * @property {string} image_url - The image URL to upscale (required)
 * @property {2 | 4 | 6 | 8} [scale_factor] - Upscaling factor
 * @property {string} [model_type] - Model variant (for models that support it)
 * @property {boolean} [enhance_face] - Enable face enhancement
 * @property {boolean} [reduce_noise] - Enable noise reduction
 *
 * @typedef {Object} VideoUpscalingOptions
 * @property {string} video_url - The video URL to upscale (required)
 * @property {1 | 2 | 3 | 4 | 6 | 8} [scale_factor] - Upscaling factor (1-8x)
 * @property {number} [target_fps] - Target FPS for frame interpolation (Topaz only)
 * @property {boolean} [enable_frame_interpolation] - Enable frame interpolation (Topaz only)
 * @property {'proteus-v4' | 'apollo-v8'} [model_name] - Model variant for Topaz
 *
 * @typedef {Object} QueueUpdate
 * @property {QueueStatus} status - Current status of the request
 * @property {string} request_id - Request identifier
 * @property {string} response_url - URL to get the response
 * @property {string} status_url - URL to check status
 * @property {string} cancel_url - URL to cancel the request
 * @property {Array<{message: string}>} [logs] - Log messages
 *
 * @typedef {Object} ApiResponse
 * @property {Object} data - Response data
 * @property {Array<{url: string}>} [data.images] - Generated images
 * @property {{url: string}} [data.image] - Single generated image
 * @property {{url: string}} [data.video] - Generated video
 * @property {string} [data.error] - Error message if any
 *
 * @typedef {Object} TestResult
 * @property {boolean} success - Whether the test was successful
 * @property {string} message - Result message
 * @property {any} [data] - Test data
 * @property {any} [error] - Error details
 */
