<script>
  import { speechRecognition } from '$lib/speech-recognition.svelte.js';
  import { onDestroy } from 'svelte';

  /** @type {{ onCommand: function(string): void, onInterimResult: function(string): void }} */
  let { onCommand, onInterimResult } = $props();

  /** @type {boolean} */
  let isListening = $state(false);
  /** @type {string} */
  let currentState = $state('idle');
  /** @type {string} */
  let statusMessage = $state('');
  /** @type {string} */
  let errorMessage = $state('');
  /** @type {boolean} */
  let isSupported = $state(false);
  /** @type {boolean} */
  let isCapturing = $state(false);

  // Check support on component mount
  isSupported = speechRecognition.isSupported();

  /**
   * Toggle voice recognition on/off
   */
  async function toggleListening() {
    if (!isSupported) {
      errorMessage = 'Speech recognition not supported in this browser';
      return;
    }

    if (isListening) {
      // Stop listening
      speechRecognition.stop();
      isListening = false;
      statusMessage = '';
      errorMessage = '';
    } else {
      // Start listening
      errorMessage = '';
      statusMessage = 'Initializing microphone...';
      
      const initialized = await speechRecognition.initialize({
        onStateChange: handleStateChange,
        onCommand: handleCommand,
        onInterimResult: handleInterimResult,
        onError: handleError,
        onWakeWord: handleWakeWord
      });

      if (initialized) {
        speechRecognition.start();
        isListening = true;
        statusMessage = 'Listening for "computer"...';
      } else {
        statusMessage = '';
      }
    }
  }

  /**
   * Emergency stop - force stop everything
   */
  function emergencyStop() {
    console.log('🚨 Emergency stop triggered');
    speechRecognition.forceStop();
    isListening = false;
    statusMessage = '';
    errorMessage = 'Voice recognition stopped.';
  }

  /**
   * Manual restart - restart speech recognition
   */
  function manualRestart() {
    console.log('🔄 Manual restart triggered');
    errorMessage = '';
    statusMessage = 'Restarting...';
    speechRecognition.restart();
    setTimeout(() => {
      if (isListening) {
        statusMessage = 'Listening for "computer"...';
      }
    }, 1500);
  }

  /**
   * Handle state changes from speech recognition
   * @param {import('$lib/speech-recognition.svelte.js').SpeechState} state
   */
  function handleStateChange(state) {
    currentState = state;
    isCapturing = speechRecognition.isCapturing;
    
    switch (state) {
      case 'listening':
        statusMessage = 'Listening for "computer"...';
        break;
      case 'capturing':
        statusMessage = 'Recording command... (say "please" to send)';
        break;
      case 'processing':
        statusMessage = 'Processing command...';
        break;
      case 'error':
        statusMessage = '';
        break;
      default:
        statusMessage = '';
    }
  }

  /**
   * Handle completed commands
   * @param {string} command
   */
  function handleCommand(command) {
    console.log('🎤 Voice command received:', command);
    onCommand(command);
    statusMessage = 'Command sent! Listening for "computer"...';
  }

  /**
   * Handle interim results (partial transcription)
   * @param {string} text
   */
  function handleInterimResult(text) {
    onInterimResult(text);
  }

  /**
   * Handle wake word detection
   */
  function handleWakeWord() {
    console.log('👋 Wake word detected');
    // Visual feedback could be added here
  }

  /**
   * Handle errors from speech recognition
   * @param {string} error
   */
  function handleError(error) {
    errorMessage = error;
    statusMessage = '';
    console.error('🎤 Speech recognition error:', error);
    
    // Auto-stop if we get a serious error
    if (error.includes('too many errors') || error.includes('permission denied')) {
      isListening = false;
    }
  }

  /**
   * Get appropriate icon based on current state
   */
  function getStateIcon() {
    if (!isSupported) return '🚫';
    if (!isListening) return '🎤';
    if (isCapturing) return '🔴';
    return '🎧';
  }

  /**
   * Get button title based on current state
   */
  function getButtonTitle() {
    if (!isSupported) return 'Speech recognition not supported';
    if (!isListening) return 'Start voice commands';
    if (isCapturing) return 'Recording... say "please" to send';
    return 'Listening for "computer"... click to stop';
  }

  /**
   * Get button class based on current state
   */
  function getButtonClass() {
    const baseClass = 'px-3 py-2 border border-gray-400 text-black cursor-pointer btn-outset text-sm';
    
    if (!isSupported) {
      return `${baseClass} bg-gray-400 text-gray-500 cursor-not-allowed`;
    }
    
    if (!isListening) {
      return `${baseClass} bg-gray-300 hover:bg-blue-200`;
    }
    
    if (isCapturing) {
      return `${baseClass} bg-red-200 animate-pulse`;
    }
    
    return `${baseClass} bg-green-200`;
  }

  // Cleanup on component destroy
  onDestroy(() => {
    if (isListening) {
      speechRecognition.stop();
    }
  });
</script>

<div class="flex flex-col gap-1">
  <!-- Voice Control Buttons -->
  <div class="flex gap-1">
    <!-- Main Voice Button -->
    <button
      class={getButtonClass()}
      onclick={toggleListening}
      disabled={!isSupported}
      title={getButtonTitle()}
    >
      <div class="flex items-center gap-1">
        <span class="text-base">{getStateIcon()}</span>
        <span class="text-xs">
          {#if !isSupported}
            N/A
          {:else if !isListening}
            Voice
          {:else if isCapturing}
            Recording
          {:else}
            Listening
          {/if}
        </span>
      </div>
    </button>
    
    <!-- Control Buttons (only show when listening) -->
    {#if isListening}
      <button
        class="px-2 py-2 border border-blue-400 bg-blue-200 text-black cursor-pointer btn-outset hover:bg-blue-300 text-xs"
        onclick={manualRestart}
        title="Restart voice recognition if it gets stuck"
      >
        🔄
      </button>
      <button
        class="px-2 py-2 border border-red-400 bg-red-300 text-black cursor-pointer btn-outset hover:bg-red-400 text-xs"
        onclick={emergencyStop}
        title="Emergency stop - force stop voice recognition"
      >
        🛑
      </button>
    {/if}
  </div>

  <!-- Status Messages -->
  {#if statusMessage}
    <div class="text-xs text-gray-600 px-1">
      {statusMessage}
    </div>
  {/if}

  {#if errorMessage}
    <div class="text-xs text-red-600 px-1">
      ⚠️ {errorMessage}
    </div>
  {/if}
</div>

<style>
  .btn-outset {
    border-style: outset;
  }
  
  .btn-outset:active:not(:disabled) {
    border-style: inset;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  .animate-pulse {
    animation: pulse 1s infinite;
  }
</style>