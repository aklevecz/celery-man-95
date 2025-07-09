/** @param {string} apiKey */
const blackForestApi = (apiKey) => {
	const baseUrl = 'https://api.bfl.ai/v1';

	const headers = {
		'Content-Type': 'application/json',
		'x-key': apiKey
	};

	/**
	 * Edit or create an image using Flux Kontext Pro
	 * @param {Model} model - The model to use (e.g., 'flux-kontext-pro')
	 * @param {FluxKontextProRequest} generationOptions - The request parameters
	 * @returns {Promise<FluxKontextProResponse>} Promise resolving to task information
	 */
	async function startGeneration(model, generationOptions) {
		const response = await fetch(`${baseUrl}/${model}`, {
			method: 'POST',
			headers,
			body: JSON.stringify(generationOptions)
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		return await response.json();
	}

	/** * Poll the status of a Flux Kontext Pro task
	 * @param {string} pollingUrl - The URL to poll for task status
	 * @returns {Promise<Object>} Promise resolving to task status and results
	 */
	async function pollGenerationStatus(pollingUrl) {
		const response = await fetch(pollingUrl, {
			method: 'GET',
			headers
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		return await response.json();
	}

	/** note that this errors before it becomes available
	 * Fetch the result of a Flux Kontext Pro task
	 * @param {string} taskId - The task ID returned from the initial request
	 * @returns {Promise<Object>} Promise resolving to task status and results
	 */
	async function getGenerationResult(taskId) {
		const response = await fetch(`${baseUrl}/get_result?id=${taskId}`, {
			method: 'GET',
			headers
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		return await response.json();
	}

	return {
		startGeneration,
		pollGenerationStatus,
		getGenerationResult
	};
};

export default blackForestApi;

// If you add the webhook url then polling will not work properly
export const exampleGenerationOptions = {
	prompt: 'A beautiful landscape with mountains and a river',
	input_image: null, // Base64 encoded image if needed
	seed: 42
	// aspect_ratio: '16:9',
	// output_format: 'jpeg',
	// webhook_url: 'https://your-webhook-url.com/callback',
	// webhook_secret: 'your-webhook-secret',
	// prompt_upsampling: true,
	// safety_tolerance: 6
};

const examplePollingResult = {
	id: '4eb35f12-0212-42a2-9863-c4daba12e99e',
	status: 'Ready',
	result: {
		sample:
			'https://delivery-eu1.bfl.ai/results/c4/167987832e14f8/832e14f82e7c4d79a16f2394cfc9d40d/sample.png?se=2025-07-01T04%3A22%3A49Z&sp=r&sv=2024-11-04&sr=b&rsct=image/png&sig=sBqP9Go%2BswmmF%2BiXd4plV99AESdH0LRIywKckunaLWo%3D',
		prompt: 'A beautiful landscape with mountains and a river',
		seed: 42,
		start_time: 1751343166.353921,
		end_time: 1751343169.024074,
		duration: 2.6701531410217285
	},
	progress: null,
	details: null,
	preview: null
};
