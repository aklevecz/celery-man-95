<script>
  import { chatManager } from "$lib/chat-manager.svelte.js";
  import VoiceController from "$lib/components/VoiceController.svelte";
  import { ollamaApi } from "$lib/ollama-api.svelte.js";
  import { onMount } from "svelte";

  /** @type {string} */
  let messageInput = $state("");
  /** @type {HTMLDivElement | null} */
  let messagesContainer = null;
  /** @type {HTMLTextAreaElement | null} */
  let textareaRef = null;
  /** @type {boolean} */
  let shouldFocusAfterSend = $state(false);
  /** @type {boolean} */
  let isOllamaAvailable = $state(true);

  // Auto-scroll to bottom when new messages arrive
  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Handle message submission
  async function handleSubmit() {
    if (!messageInput.trim() || chatManager.isLoading) return;
    
    const message = messageInput.trim();
    messageInput = "";
    shouldFocusAfterSend = true;
    
    // Auto-resize textarea
    if (textareaRef) {
      textareaRef.style.height = "auto";
    }
    
    await chatManager.sendMessage(message);
    scrollToBottom();
  }

  // Handle keyboard shortcuts
  /** @param {KeyboardEvent} event */
  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  // Auto-resize textarea
  function autoResizeTextarea() {
    if (textareaRef) {
      textareaRef.style.height = "auto";
      textareaRef.style.height = textareaRef.scrollHeight + "px";
    }
  }

  // Format timestamp
  /** @param {number} timestamp */
  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  // Auto-scroll when messages change
  $effect(() => {
    if (chatManager.currentSession?.messages) {
      // Multiple scroll attempts to ensure it works reliably
      setTimeout(scrollToBottom, 100);
      setTimeout(scrollToBottom, 300);
      setTimeout(scrollToBottom, 600);
    }
  });

  // Focus textarea after sending message when loading completes
  $effect(() => {
    if (shouldFocusAfterSend && !chatManager.isLoading && textareaRef) {
      textareaRef.focus();
      shouldFocusAfterSend = false;
    }
  });

  // Handle voice commands
  /** @param {string} command */
  function handleVoiceCommand(command) {
    messageInput = command;
    autoResizeTextarea();
    // Auto-send voice commands immediately
    handleSubmit();
    // Force scroll after voice command to ensure visibility
    setTimeout(scrollToBottom, 200);
  }

  // Handle interim voice results (live transcription)
  /** @param {string} text */
  function handleVoiceInterim(text) {
    // Show interim results in the input field but don't auto-resize constantly
    if (textareaRef) {
      const currentValue = messageInput;
      messageInput = text;
      // Only resize if the text is significantly different
      if (Math.abs(text.length - currentValue.length) > 10) {
        autoResizeTextarea();
      }
    }
  }

  onMount(async () => {
    scrollToBottom();
    isOllamaAvailable = await ollamaApi.isAvailable();
  });
</script>

<div class="flex flex-col h-full font-sans bg-gray-300 text-black">
  <!-- Chat Header -->
  <div class="p-3 border-b border-gray-500 bg-gray-300">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="m-0 text-2xl font-bold text-black">AI Assistant</h2>
        <p class="mt-1 mb-0 text-lg text-gray-600">Chat with your AI helper</p>
      </div>
      <div class="flex gap-2">
        <button
          class="px-3 py-1 border border-gray-400 bg-gray-300 text-black text-sm cursor-pointer btn-outset hover:bg-gray-400"
          onclick={() => chatManager.clearCurrentSession()}
          title="Clear conversation"
        >
          Clear
        </button>
        <button
          class="px-3 py-1 border border-gray-400 bg-gray-300 text-black text-sm cursor-pointer btn-outset hover:bg-gray-400"
          onclick={() => chatManager.createNewSession()}
          title="New conversation"
        >
          New
        </button>
      </div>
    </div>
  </div>

  <!-- Messages Area -->
  <div 
    bind:this={messagesContainer}
    class="flex-1 overflow-y-auto p-4 space-y-3"
  >
    {#if chatManager.currentSession?.messages.length === 0}
      <div class="text-center py-8 text-gray-600">
        <div class="text-4xl mb-2">🤖</div>
        <p class="text-base mb-2">Welcome to your AI Assistant!</p>
        <p class="text-sm">I can help you with image generation, video creation, upscaling, and more.</p>
        <p class="text-sm">Type a message below to get started.</p>
      </div>
    {:else}
      {#each chatManager.currentSession?.messages || [] as message (message.id)}
        <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
          <div class="max-w-[80%] {message.role === 'user' ? 'ml-12' : 'mr-12'}">
            <div class="flex items-center gap-2 mb-1">
              <div class="text-xs text-gray-600 font-bold">
                {message.role === 'user' ? 'You' : 'AI Assistant'}
              </div>
              <div class="text-xs text-gray-500">
                {formatTime(message.timestamp)}
              </div>
            </div>
            <div class="
              p-3 rounded-lg border border-gray-400 
              {message.role === 'user' 
                ? 'bg-blue-200 text-black' 
                : 'bg-white text-black'
              }
              {message.error ? 'border-red-500 bg-red-100' : ''}
            ">
              {#if message.error}
                <div class="text-red-600 text-sm mb-1">⚠️ Error</div>
                <div class="text-red-700">{message.error}</div>
              {:else if message.isStreaming}
                <div class="flex items-center gap-2">
                  <div class="text-gray-600">Thinking...</div>
                  <div class="w-4 h-4 border-2 border-gray-400 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              {:else}
                <div class="whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Input Area -->
  <div class="p-3 border-t border-gray-500 bg-gray-300">
    <div class="flex gap-2">
      <div class="flex-1">
        <textarea
          bind:this={textareaRef}
          bind:value={messageInput}
          placeholder={isOllamaAvailable ? "Type your message... (Enter to send, Shift+Enter for new line) or use voice commands" : "Ollama not available - please install and start Ollama"}
          class="w-full p-2 border border-gray-400 bg-white text-black resize-none min-h-[40px] max-h-[120px] text-sm"
          rows="1"
          onkeydown={handleKeyDown}
          oninput={autoResizeTextarea}
          disabled={chatManager.isLoading || !isOllamaAvailable}
        ></textarea>
      </div>
      
      <!-- Voice Controller -->
      <VoiceController 
        onCommand={handleVoiceCommand}
        onInterimResult={handleVoiceInterim}
      />
      
      <!-- Send Button -->
      <button
        class="px-4 py-2 border border-gray-400 bg-gray-300 text-black cursor-pointer btn-outset hover:bg-blue-200 disabled:bg-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed"
        onclick={handleSubmit}
        disabled={chatManager.isLoading || !messageInput.trim() || !isOllamaAvailable}
      >
        {#if chatManager.isLoading}
          <div class="w-4 h-4 border-2 border-gray-400 border-t-blue-600 rounded-full animate-spin"></div>
        {:else}
          Send
        {/if}
      </button>
    </div>
    
    <!-- Voice Instructions and Warnings -->
    <div class="mt-2 text-xs text-gray-600">
      💡 Voice commands: Say "computer [command] please" • Example: "computer open fluxor please"
    </div>
    
    {#if !isOllamaAvailable}
      <div class="mt-2 text-xs text-red-600">
        ⚠️ Ollama not available - Please install and start Ollama to use the AI chat
      </div>
    {/if}
  </div>

  <!-- Error Display -->
  {#if chatManager.error}
    <div class="p-3 bg-red-100 border border-red-600 text-red-600 text-sm mx-3 mb-2">
      ⚠️ {chatManager.error}
    </div>
  {/if}
</div>

<style>
  .btn-outset {
    border-style: outset;
  }
  
  .btn-outset:active {
    border-style: inset;
  }
</style>