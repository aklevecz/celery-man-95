import { ollamaApi } from './ollama-api.svelte.js';
import FluxorController from '$lib/windows/fluxor/FluxorController.svelte.js';
import CinematOrController from '$lib/windows/cinemator/CinematOrController.svelte.js';
import UpscalerController from '$lib/windows/upscaler/UpscalerController.svelte.js';
import VideoUpscalerController from '$lib/windows/video-upscaler/VideoUpscalerController.svelte.js';
import ImageGalleryController from '$lib/windows/image-gallery/ImageGalleryController.js';
import VideoGalleryController from '$lib/windows/video-gallery/VideoGalleryController.js';
import SettingsController from '$lib/windows/settings/SettingsController.svelte.js';
import NotepadController from '$lib/windows/notepad/NotepadController.svelte.js';
import LoRAStudioController from '$lib/windows/lora-studio/LoRAStudioController.svelte.js';

/** 
 * @typedef {'user' | 'assistant' | 'system'} ChatRole
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id - Unique message identifier
 * @property {ChatRole} role - Message role
 * @property {string} content - Message content
 * @property {number} timestamp - Message timestamp
 * @property {boolean} [isStreaming] - Whether message is still being streamed
 * @property {string} [error] - Error message if failed
 */

/**
 * @typedef {Object} ChatSession
 * @property {string} id - Session identifier
 * @property {string} name - Session name
 * @property {ChatMessage[]} messages - Session messages
 * @property {number} createdAt - Session creation timestamp
 * @property {number} updatedAt - Last update timestamp
 */

const STORAGE_KEY = 'chat-sessions';

// Define available tools for the AI assistant
const availableTools = {
  generate_image: {
    name: 'generate_image',
    description: 'Create, generate, make, or design an image or photo',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: () => {
      FluxorController.openFluxorWindow();
      return 'Opened image generator';
    }
  },
  generate_video: {
    name: 'generate_video',
    description: 'Create, generate, make, or design a video or movie',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: () => {
      CinematOrController.openCinematOrWindow();
      return 'Opened video generator';
    }
  },
  enhance_image: {
    name: 'enhance_image',
    description: 'Upscale, enhance, improve, or increase image quality or resolution',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: () => {
      UpscalerController.openUpscalerWindow();
      return 'Opened image enhancer';
    }
  },
  enhance_video: {
    name: 'enhance_video',
    description: 'Upscale, enhance, improve, or increase video quality or resolution',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: () => {
      VideoUpscalerController.openVideoUpscalerWindow();
      return 'Opened video enhancer';
    }
  },
  view_images: {
    name: 'view_images',
    description: 'View, show, browse, or open saved images or photos',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: () => {
      ImageGalleryController.openImageGalleryWindow();
      return 'Opened image gallery';
    }
  },
  view_videos: {
    name: 'view_videos',
    description: 'View, show, browse, or open saved videos or movies',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: () => {
      VideoGalleryController.openVideoGalleryWindow();
      return 'Opened video gallery';
    }
  },
  open_settings: {
    name: 'open_settings',
    description: 'Open settings, preferences, or configuration',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: () => {
      SettingsController.openSettingsWindow();
      return 'Opened settings';
    }
  },
  open_notepad: {
    name: 'open_notepad',
    description: 'Open notepad, text editor, or write text',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: () => {
      NotepadController.openNotepadWindow();
      return 'Opened notepad';
    }
  },
  open_lora_studio: {
    name: 'open_lora_studio',
    description: 'Open LoRA Studio for image editing with LoRA adaptations',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: () => {
      LoRAStudioController.openLoRAStudioWindow();
      return 'Opened LoRA Studio';
    }
  }
};

function createChatManager() {
  /** @type {ChatSession[]} */
  let sessions = $state([]);
  /** @type {string | null} */
  let currentSessionId = $state(null);
  /** @type {boolean} */
  let isLoading = $state(false);
  /** @type {string} */
  let error = $state('');

  // Load sessions from localStorage
  function loadSessions() {
    try {
      if (typeof localStorage === 'undefined') {
        // Create default session if localStorage is not available
        if (sessions.length === 0) {
          createNewSession();
        }
        return;
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        sessions = JSON.parse(stored);
      }
      
      // Create default session if none exist
      if (sessions.length === 0) {
        createNewSession();
      } else {
        currentSessionId = sessions[0].id;
      }
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
      error = 'Failed to load chat history';
      createNewSession();
    }
  }

  // Save sessions to localStorage
  function saveSessions() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      }
    } catch (err) {
      console.error('Failed to save chat sessions:', err);
      error = 'Failed to save chat history';
    }
  }

  // Create a new chat session
  function createNewSession() {
    const newSession = {
      id: `session-${Date.now()}`,
      name: `Chat ${sessions.length + 1}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    sessions.push(newSession);
    currentSessionId = newSession.id;
    saveSessions();
    
    return newSession;
  }

  // Get current session
  function getCurrentSession() {
    return sessions.find(s => s.id === currentSessionId) || null;
  }

  /** @param {string} sessionId */
  function switchToSession(sessionId) {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      currentSessionId = sessionId;
      error = '';
    }
  }

  /** @param {ChatRole} role @param {string} content  */
  function addMessage(role, content, isStreaming = false) {
    const session = getCurrentSession();
    if (!session) return null;

    const message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      role,
      content,
      timestamp: Date.now(),
      isStreaming
    };

    session.messages.push(message);
    session.updatedAt = Date.now();
    saveSessions();
    
    return message;
  }

  /** @param {string} messageId @param {*} updates */
  function updateMessage(messageId, updates) {
    const session = getCurrentSession();
    if (!session) return;

    const message = session.messages.find(m => m.id === messageId);
    if (message) {
      Object.assign(message, updates);
      session.updatedAt = Date.now();
      saveSessions();
    }
  }

  /** @param {string} sessionId */
  function deleteSession(sessionId) {
    const index = sessions.findIndex(s => s.id === sessionId);
    if (index !== -1) {
      sessions.splice(index, 1);
      
      // If deleted session was current, switch to another
      if (currentSessionId === sessionId) {
        if (sessions.length > 0) {
          currentSessionId = sessions[0].id;
        } else {
          createNewSession();
        }
      }
      
      saveSessions();
    }
  }

  // Clear current session
  function clearCurrentSession() {
    const session = getCurrentSession();
    if (session) {
      session.messages = [];
      session.updatedAt = Date.now();
      saveSessions();
    }
  }

  /** @param {string} content */
  async function sendMessage(content) {
    if (!content.trim()) return;

    const session = getCurrentSession();
    if (!session) return;

    // Add user message
    const userMessage = addMessage('user', content.trim());
    if (!userMessage) return;

    // Add assistant message placeholder with streaming state immediately
    const assistantMessage = addMessage('assistant', '', true);
    if (!assistantMessage) return;
    isLoading = true;
    error = '';

    try {
      // Use real Ollama API
      await sendToOllama(session, assistantMessage);
    } catch (/** @type {*} */ err) {
      console.error('Failed to send message:', err);
      updateMessage(assistantMessage.id, {
        error: err.message || 'Failed to get response',
        isStreaming: false
      });
      error = 'Failed to get AI response';
    } finally {
      isLoading = false;
    }
  }

  // Send conversation to Ollama and handle streaming response
  /** 
   * @param {ChatSession} session 
   * @param {ChatMessage} assistantMessage 
   */
  async function sendToOllama(session, assistantMessage) {
    // Convert session messages to Ollama format
    const ollamaMessages = session.messages
      .filter(/** @param {ChatMessage} msg */ (msg) => msg.role !== 'system' && msg.content.trim() && !msg.error)
      .map(/** @param {ChatMessage} msg */ (msg) => (/** @type {import('./ollama-api.svelte.js').OllamaMessage} */ ({
        role: /** @type {'user' | 'assistant' | 'system'} */ (msg.role),
        content: msg.content
      })));

    // Add system message for context
    const toolsList = Object.values(availableTools).map(tool => `- ${tool.name}: ${tool.description}`).join('\n');
    /** @type {import('./ollama-api.svelte.js').OllamaMessage} */
    const systemMessage = {
      role: 'system',
      content: `You are an AI assistant integrated into a Windows 95-style multimedia application. You can help users with image generation, video creation, upscaling, and other creative tasks. Be helpful, concise, and friendly.

CRITICAL INSTRUCTION: You have access to tools that can open windows in the application. When users request features like image generation, video creation, or opening galleries, you MUST include the exact text "TOOL_CALL: tool_name" in your response.

IMPORTANT: Use ONLY these exact tool names:
- generate_image (for any image creation request)
- generate_video (for any video creation request) 
- enhance_image (for image upscaling/enhancement)
- enhance_video (for video upscaling/enhancement)
- view_images (for viewing saved images)
- view_videos (for viewing saved videos)
- open_settings (for settings/preferences)
- open_notepad (for text editing)

MANDATORY RULE: Your response MUST contain "TOOL_CALL: exact_tool_name" using only the names listed above.

CORRECT examples:
- User: "I want to make a video" → You: "TOOL_CALL: generate_video Let me open the video generator!"
- User: "create an image" → You: "TOOL_CALL: generate_image Opening the image generator!"
- User: "show my videos" → You: "TOOL_CALL: view_videos Opening your video gallery!"

Use ONLY the exact tool names from the list above.`
    };

    const messages = [systemMessage, ...ollamaMessages];

    return new Promise(/** @param {(value?: any) => void} resolve @param {(reason?: any) => void} reject */ (resolve, reject) => {
      let responseContent = '';

      ollamaApi.sendMessage(
        messages,
        // onChunk: Handle streaming content
        (chunk) => {
          responseContent += chunk;
          updateMessage(assistantMessage.id, {
            content: responseContent,
            isStreaming: true
          });
        },
        // onComplete: Response finished
        async () => {
          // Check for tool calls in the response
          const toolCallResult = await handleToolCalls(responseContent);
          
          // Update the message with final content (may include tool results)
          updateMessage(assistantMessage.id, {
            content: toolCallResult.content,
            isStreaming: false
          });
          
          resolve();
        },
        // onError: Handle errors
        (error) => {
          console.error('Ollama error:', error);
          updateMessage(assistantMessage.id, {
            error: error.message,
            isStreaming: false
          });
          reject(error);
        }
      );
    });
  }

  /**
   * Handle tool calls in AI response
   * @param {string} content - The AI response content
   * @returns {Promise<{content: string}>} - Updated content with tool results
   */
  async function handleToolCalls(content) {
    console.log('🔍 Checking for tool calls in response:', content);
    
    // Look for tool call pattern: TOOL_CALL: tool_name
    const toolCallRegex = /TOOL_CALL:\s*(\w+)/g;
    const matches = [...content.matchAll(toolCallRegex)];
    
    console.log(`🔍 Found ${matches.length} tool calls:`, matches.map(m => m[1]));
    
    if (matches.length === 0) {
      console.log('⚠️ No tool calls found in AI response. Response was:', content);
      return { content };
    }

    let updatedContent = content;
    
    for (const match of matches) {
      const toolName = match[1];
      /** @type {any} */
      const tool = availableTools[/** @type {keyof typeof availableTools} */ (toolName)];
      
      if (tool) {
        try {
          console.log(`🔧 Executing tool: ${toolName}`);
          
          // Execute the tool
          const toolResult = tool.execute();
          
          // Replace the TOOL_CALL with the result
          const toolCallText = match[0];
          const replacement = `✅ ${toolResult}`;
          updatedContent = updatedContent.replace(toolCallText, replacement);
          
          console.log(`✅ Tool ${toolName} executed successfully: ${toolResult}`);
          
        } catch (/** @type {*} */ error) {
          console.error(`❌ Tool execution failed for ${toolName}:`, error);
          
          // Replace with error message
          const toolCallText = match[0];
          const replacement = `❌ Failed to execute ${toolName}: ${error.message}`;
          updatedContent = updatedContent.replace(toolCallText, replacement);
        }
      } else {
        console.warn(`⚠️ Unknown tool: ${toolName}`);
        
        // Replace with unknown tool message
        const toolCallText = match[0];
        const replacement = `❌ Unknown tool: ${toolName}`;
        updatedContent = updatedContent.replace(toolCallText, replacement);
      }
    }
    
    return { content: updatedContent };
  }

  // Initialize
  loadSessions();

  return {
    get sessions() { return sessions; },
    get currentSessionId() { return currentSessionId; },
    get currentSession() { return getCurrentSession(); },
    get isLoading() { return isLoading; },
    get error() { return error; },
    
    createNewSession,
    switchToSession,
    deleteSession,
    clearCurrentSession,
    sendMessage,
    addMessage,
    updateMessage
  };
}

export const chatManager = createChatManager();