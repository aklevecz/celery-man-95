/**
 * @typedef {Object} OllamaMessage
 * @property {'user' | 'assistant' | 'system'} role - Message role
 * @property {string} content - Message content
 */

/**
 * @typedef {Object} OllamaRequest
 * @property {string} model - Model name (e.g., "llama3.2")
 * @property {OllamaMessage[]} messages - Conversation history
 * @property {boolean} [stream] - Enable streaming responses
 * @property {Object} [options] - Additional model options
 */

/**
 * @typedef {Object} OllamaResponse
 * @property {string} model - Model used
 * @property {string} created_at - Response timestamp
 * @property {OllamaMessage} message - Response message
 * @property {boolean} done - Whether response is complete
 */

const OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3.2';

function createOllamaApi() {
  
  /**
   * Check if Ollama is available
   * @returns {Promise<boolean>} Whether Ollama is running
   */
  async function isAvailable() {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      return response.ok;
    } catch (error) {
      console.warn('Ollama not available:', error.message);
      return false;
    }
  }

  /**
   * Send a chat message to Ollama with streaming support
   * @param {OllamaMessage[]} messages - Conversation history
   * @param {function(string): void} onChunk - Callback for streaming chunks
   * @param {function(): void} onComplete - Callback when response is complete
   * @param {function(Error): void} onError - Callback for errors
   * @returns {Promise<void>}
   */
  async function sendMessage(messages, onChunk, onComplete, onError) {
    try {
      // Check if Ollama is available first
      const available = await isAvailable();
      if (!available) {
        throw new Error('Ollama is not running. Please start Ollama and ensure llama3.2 is installed.');
      }

      /** @type {OllamaRequest} */
      const requestBody = {
        model: DEFAULT_MODEL,
        messages: messages,
        stream: true,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 2048
        }
      };

      console.log('🦙 Sending request to Ollama:', requestBody);

      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(60000) // 60 second timeout
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body from Ollama');
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // Process any remaining data in buffer
            if (buffer.trim()) {
              processChunk(buffer, onChunk, onError);
            }
            break;
          }

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines (NDJSON format)
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.trim()) {
              processChunk(line, onChunk, onError);
            }
          }
        }
        
        console.log('✅ Ollama response completed');
        onComplete();
        
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      console.error('❌ Ollama API error:', error);
      onError(error);
    }
  }

  /**
   * Process a single response chunk from Ollama
   * @param {string} chunk - Raw chunk data
   * @param {function(string): void} onChunk - Callback for content chunks
   * @param {function(Error): void} onError - Callback for errors
   */
  function processChunk(chunk, onChunk, onError) {
    try {
      /** @type {OllamaResponse} */
      const data = JSON.parse(chunk);
      
      // Check for errors
      if (data.error) {
        onError(new Error(data.error));
        return;
      }
      
      // Extract content from the message
      if (data.message && data.message.content) {
        onChunk(data.message.content);
      }
      
      // Log completion
      if (data.done) {
        console.log('🦙 Ollama response complete');
      }
      
    } catch (error) {
      console.error('Failed to parse Ollama chunk:', chunk, error);
      // Don't call onError for parse failures - might be incomplete JSON
    }
  }

  /**
   * Get available models from Ollama
   * @returns {Promise<string[]>} List of available model names
   */
  async function getAvailableModels() {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to get models: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.models?.map(model => model.name) || [];
    } catch (error) {
      console.error('Failed to get Ollama models:', error);
      return [];
    }
  }

  return {
    sendMessage,
    isAvailable,
    getAvailableModels,
    get baseUrl() { return OLLAMA_BASE_URL; },
    get defaultModel() { return DEFAULT_MODEL; }
  };
}

export const ollamaApi = createOllamaApi();