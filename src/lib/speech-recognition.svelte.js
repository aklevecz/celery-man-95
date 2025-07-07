/**
 * @typedef {'idle' | 'listening' | 'capturing' | 'processing' | 'error'} SpeechState
 * 
 * @typedef {Object} SpeechRecognitionResult
 * @property {string} command - The captured command text
 * @property {boolean} isComplete - Whether the command is complete (ended with "please")
 * 
 * @typedef {Object} SpeechRecognitionCallbacks
 * @property {function(SpeechState): void} onStateChange - Called when recognition state changes
 * @property {function(string): void} onCommand - Called when a complete command is captured
 * @property {function(string): void} onInterimResult - Called with partial transcription
 * @property {function(string): void} onError - Called when an error occurs
 * @property {function(): void} onWakeWord - Called when "computer" wake word is detected
 */

function createSpeechRecognition() {
  /** @type {any | null} */
  let recognition = null;
  /** @type {SpeechState} */
  let currentState = $state('idle');
  /** @type {string} */
  let commandBuffer = $state('');
  /** @type {boolean} */
  let isCapturing = $state(false);
  /** @type {SpeechRecognitionCallbacks | null} */
  let callbacks = null;
  /** @type {number | null} */
  let restartTimeout = null;
  /** @type {boolean} */
  let shouldBeRunning = false;
  /** @type {boolean} */
  let isRestarting = false;
  /** @type {number} */
  let consecutiveErrors = 0;
  /** @type {MediaStream | null} */
  let currentStream = null;
  /** @type {boolean} */
  let isProcessingCommand = false;
  /** @type {number} */
  let lastWakeWordTime = 0;
  /** @type {number} */
  let lastCommandTime = 0;

  const WAKE_WORD = 'computer';
  const END_WORD = 'please';
  const RESTART_INTERVAL = 45000; // Restart every 45 seconds to prevent memory leaks
  const MAX_CONSECUTIVE_ERRORS = 3; // Stop after too many errors
  const WAKE_WORD_COOLDOWN = 2000; // 2 seconds between wake word detections
  const COMMAND_COOLDOWN = 3000; // 3 seconds between command completions

  /**
   * Check if speech recognition is supported
   * @returns {boolean}
   */
  function isSupported() {
    return typeof window !== 'undefined' && 
           ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }

  /**
   * Initialize speech recognition
   * @param {SpeechRecognitionCallbacks} speechCallbacks
   * @returns {Promise<boolean>} Success status
   */
  async function initialize(speechCallbacks) {
    if (!isSupported()) {
      console.warn('Speech recognition not supported in this browser');
      return false;
    }

    callbacks = speechCallbacks;

    try {
      // Clean up any existing stream
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
      }

      // Request microphone permission and store stream reference
      currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone permission granted');
      consecutiveErrors = 0;
      return true;
    } catch (error) {
      console.error('❌ Microphone permission denied:', error);
      callbacks?.onError('Microphone permission denied. Please allow microphone access to use voice commands.');
      return false;
    }
  }

  /**
   * Create and configure speech recognition instance
   */
  function createRecognitionInstance() {
    if (!isSupported()) return null;

    // @ts-ignore - WebKit prefix handling
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const instance = new SpeechRecognition();

    instance.continuous = true;
    instance.interimResults = true;
    instance.lang = 'en-US';
    instance.maxAlternatives = 1;

    instance.onstart = () => {
      console.log('🎤 Speech recognition started');
      currentState = 'listening';
      isRestarting = false;
      consecutiveErrors = 0;
      callbacks?.onStateChange(currentState);
    };

    instance.onresult = (/** @type {any} */ event) => {
      handleSpeechResult(event);
    };

    instance.onerror = (/** @type {any} */ event) => {
      console.error('Speech recognition error:', event.error);
      consecutiveErrors++;
      
      // Handle specific errors
      switch (event.error) {
        case 'no-speech':
          // Ignore no-speech errors in continuous mode
          consecutiveErrors--; // Don't count this as a real error
          break;
        case 'audio-capture':
          callbacks?.onError('Microphone not available. Please check your microphone settings.');
          forceStop();
          break;
        case 'not-allowed':
          callbacks?.onError('Microphone permission denied. Please allow microphone access.');
          forceStop();
          break;
        case 'network':
          // Network errors are temporary, allow restart
          break;
        default:
          callbacks?.onError(`Speech recognition error: ${event.error}`);
      }

      // Stop if too many consecutive errors
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.error('❌ Too many consecutive errors, stopping speech recognition');
        callbacks?.onError('Speech recognition encountered too many errors. Please try again.');
        forceStop();
      }
    };

    instance.onend = () => {
      console.log('🔇 Speech recognition ended');
      
      // Only restart if we should be running and we're not already restarting
      if (shouldBeRunning && !isRestarting && currentState !== 'idle' && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
        console.log('🔄 Auto-restarting speech recognition');
        isRestarting = true;
        setTimeout(() => {
          if (shouldBeRunning && currentState !== 'idle') {
            isRestarting = false;
            startRecognition();
          }
        }, 1000); // Longer delay to prevent rapid restarts
      } else {
        console.log('🛑 Not restarting speech recognition');
        isRestarting = false;
      }
    };

    return instance;
  }

  /**
   * Handle speech recognition results
   * @param {any} event
   */
  function handleSpeechResult(event) {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript.toLowerCase().trim();
      
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript + ' ';
      }
    }

    const fullTranscript = (finalTranscript + interimTranscript).trim();
    
    if (fullTranscript) {
      processTranscript(fullTranscript, event.results[event.results.length - 1].isFinal);
    }
  }

  /**
   * Process transcript for wake words and commands
   * @param {string} transcript
   * @param {boolean} isFinal
   */
  function processTranscript(transcript, isFinal) {
    const now = Date.now();
    console.log(`🎤 ${isFinal ? 'Final' : 'Interim'}: "${transcript}"`);

    // Ignore all input if we're processing a command
    if (isProcessingCommand) {
      console.log('⏸️ Ignoring input - command processing in progress');
      return;
    }

    // Check for wake word if not currently capturing
    if (!isCapturing && transcript.includes(WAKE_WORD)) {
      // Apply wake word cooldown to prevent multiple detections
      if (now - lastWakeWordTime < WAKE_WORD_COOLDOWN) {
        console.log('🔇 Wake word cooldown active, ignoring');
        return;
      }

      console.log('👋 Wake word detected: starting command capture');
      lastWakeWordTime = now;
      isCapturing = true;
      commandBuffer = '';
      currentState = 'capturing';
      callbacks?.onStateChange(currentState);
      callbacks?.onWakeWord();
      
      // Extract text after wake word, but only if it doesn't already contain the end word
      const wakeIndex = transcript.indexOf(WAKE_WORD);
      const afterWake = transcript.substring(wakeIndex + WAKE_WORD.length).trim();
      
      // If the entire command is in one go (wake word + command + end word), handle it immediately
      if (afterWake.includes(END_WORD)) {
        const endIndex = afterWake.indexOf(END_WORD);
        const command = afterWake.substring(0, endIndex).trim();
        if (command) {
          console.log(`📨 Complete command in one go: "${command}"`);
          completeCommand(command);
        }
        return;
      }
      
      // Otherwise, start capturing
      if (afterWake && afterWake.length > 0) {
        commandBuffer = afterWake;
        callbacks?.onInterimResult(commandBuffer);
      }
      return;
    }

    // If capturing, accumulate command text
    if (isCapturing) {
      // Check for end word
      if (transcript.includes(END_WORD)) {
        console.log('✋ End word detected: completing command');
        
        // Extract text before end word
        const endIndex = transcript.lastIndexOf(END_WORD);
        let finalCommand = transcript.substring(0, endIndex).trim();
        
        // Remove wake word if it's still in the command
        if (finalCommand.startsWith(WAKE_WORD)) {
          finalCommand = finalCommand.substring(WAKE_WORD.length).trim();
        }
        
        // Use the more complete version
        if (commandBuffer && commandBuffer.length > finalCommand.length && commandBuffer.includes(finalCommand)) {
          finalCommand = commandBuffer;
        } else if (finalCommand && finalCommand.length > commandBuffer.length) {
          finalCommand = finalCommand;
        } else if (commandBuffer) {
          finalCommand = commandBuffer;
        }
        
        // Remove any duplicate phrases that might have been concatenated
        finalCommand = removeDuplicatePhrases(finalCommand.trim());
        
        if (finalCommand) {
          completeCommand(finalCommand);
        } else {
          // Reset if no valid command
          resetCapture();
        }
        return;
      }
      
      // Update command buffer for ongoing capture (only for final results to avoid noise)
      if (isFinal) {
        // Remove wake word if present
        let cleanTranscript = transcript;
        if (cleanTranscript.startsWith(WAKE_WORD)) {
          cleanTranscript = cleanTranscript.substring(WAKE_WORD.length).trim();
        }
        
        // Only update buffer if new transcript is meaningfully different
        if (cleanTranscript && (cleanTranscript.length > commandBuffer.length || !commandBuffer)) {
          commandBuffer = cleanTranscript;
          callbacks?.onInterimResult(commandBuffer);
        }
      } else {
        // Show interim results without modifying the buffer
        let interimCommand = transcript;
        if (interimCommand.startsWith(WAKE_WORD)) {
          interimCommand = interimCommand.substring(WAKE_WORD.length).trim();
        }
        
        // Only show interim if it's meaningful and doesn't include end word
        if (interimCommand && !interimCommand.includes(END_WORD) && interimCommand.length > 2) {
          callbacks?.onInterimResult(interimCommand);
        }
      }
    }
  }

  /**
   * Complete a command and reset state
   * @param {string} command
   */
  function completeCommand(command) {
    if (isProcessingCommand) {
      console.log('⚠️ Command already being processed, ignoring duplicate');
      return;
    }

    console.log(`📨 Completing command: "${command}"`);
    
    // Set processing lock
    isProcessingCommand = true;
    lastCommandTime = Date.now();
    currentState = 'processing';
    callbacks?.onStateChange(currentState);
    callbacks?.onCommand(command);
    
    // Reset capture state immediately
    resetCapture();
    
    // Release processing lock after cooldown
    setTimeout(() => {
      isProcessingCommand = false;
      if (currentState === 'processing') {
        currentState = 'listening';
        callbacks?.onStateChange(currentState);
        console.log('🔓 Command processing complete, ready for next command');
      }
    }, COMMAND_COOLDOWN);
  }

  /**
   * Reset capture state
   */
  function resetCapture() {
    isCapturing = false;
    commandBuffer = '';
  }

  /**
   * Remove duplicate phrases that might have been concatenated
   * @param {string} text
   * @returns {string}
   */
  function removeDuplicatePhrases(text) {
    const words = text.split(' ');
    if (words.length <= 3) return text;
    
    // Look for patterns where the same sequence of words is repeated
    const halfLength = Math.floor(words.length / 2);
    const firstHalf = words.slice(0, halfLength).join(' ');
    const secondHalf = words.slice(halfLength).join(' ');
    
    // If the two halves are similar, return just the first half
    if (firstHalf === secondHalf) {
      return firstHalf;
    }
    
    // Check for partial duplicates at the end
    for (let i = 1; i <= halfLength; i++) {
      const ending = words.slice(-i).join(' ');
      const beforeEnding = words.slice(-(i * 2), -i).join(' ');
      if (ending === beforeEnding) {
        return words.slice(0, -i).join(' ');
      }
    }
    
    return text;
  }

  /**
   * Force stop speech recognition (emergency stop)
   */
  function forceStop() {
    console.log('🚨 Force stopping speech recognition');
    shouldBeRunning = false;
    isRestarting = false;
    isProcessingCommand = false;
    currentState = 'idle';
    isCapturing = false;
    commandBuffer = '';
    lastWakeWordTime = 0;
    lastCommandTime = 0;

    if (restartTimeout) {
      clearTimeout(restartTimeout);
      restartTimeout = null;
    }

    if (recognition) {
      try {
        recognition.stop();
      } catch (error) {
        console.warn('Error stopping recognition:', error);
      }
      recognition = null;
    }

    // Clean up media stream
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      currentStream = null;
    }

    callbacks?.onStateChange(currentState);
  }

  /**
   * Start continuous speech recognition
   */
  function startRecognition() {
    if (!isSupported() || !callbacks) {
      console.warn('Cannot start speech recognition: not supported or not initialized');
      return;
    }

    // Prevent multiple simultaneous starts
    if (isRestarting) {
      console.log('⏳ Already restarting, skipping start request');
      return;
    }

    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.warn('❌ Too many errors, not starting');
      callbacks?.onError('Too many speech recognition errors. Please refresh the page and try again.');
      return;
    }

    shouldBeRunning = true;

    // Clean up existing recognition
    if (recognition) {
      try {
        recognition.stop();
      } catch (error) {
        console.warn('Error stopping existing recognition:', error);
      }
    }

    recognition = createRecognitionInstance();
    if (recognition) {
      try {
        recognition.start();
        
        // Clear any existing restart timeout since we're starting fresh
        if (restartTimeout) {
          clearTimeout(restartTimeout);
          restartTimeout = null;
        }
        
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        consecutiveErrors++;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          forceStop();
        }
        callbacks?.onError('Failed to start speech recognition');
      }
    }
  }

  /**
   * Stop speech recognition (normal stop)
   */
  function stop() {
    console.log('🛑 Stopping speech recognition');
    shouldBeRunning = false;
    isRestarting = false;
    isProcessingCommand = false;
    currentState = 'idle';
    isCapturing = false;
    commandBuffer = '';
    lastWakeWordTime = 0;
    lastCommandTime = 0;
    
    if (restartTimeout) {
      clearTimeout(restartTimeout);
      restartTimeout = null;
    }
    
    if (recognition) {
      try {
        recognition.stop();
      } catch (error) {
        console.warn('Error stopping recognition:', error);
      }
      recognition = null;
    }
    
    // Clean up media stream
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      currentStream = null;
    }
    
    callbacks?.onStateChange(currentState);
  }

  /**
   * Get current recognition state
   * @returns {SpeechState}
   */
  function getState() {
    return currentState;
  }

  /**
   * Get current command buffer
   * @returns {string}
   */
  function getCommandBuffer() {
    return commandBuffer;
  }

  /**
   * Manual restart - completely stop and start again
   */
  function restart() {
    console.log('🔄 Manual restart requested');
    if (isRestarting) {
      console.log('⏳ Already restarting, ignoring manual restart');
      return;
    }
    
    isRestarting = true;
    consecutiveErrors = 0; // Reset error count on manual restart
    
    // Stop current recognition
    if (recognition) {
      try {
        recognition.stop();
      } catch (error) {
        console.warn('Error stopping recognition during restart:', error);
      }
    }
    
    // Start fresh after a brief delay
    setTimeout(() => {
      if (shouldBeRunning) {
        startRecognition();
      }
      isRestarting = false;
    }, 1000);
  }

  return {
    isSupported,
    initialize,
    start: startRecognition,
    stop,
    forceStop,
    restart,
    getState,
    getCommandBuffer,
    get state() { return currentState; },
    get isCapturing() { return isCapturing; },
    get commandBuffer() { return commandBuffer; },
    get shouldBeRunning() { return shouldBeRunning; },
    get isRestarting() { return isRestarting; },
    get consecutiveErrors() { return consecutiveErrors; }
  };
}

export const speechRecognition = createSpeechRecognition();