<script>
  import SavedVideos from "$lib/components/SavedVideos.svelte";
  import { videoStorage } from "$lib/video-storage.svelte.js";

  // State for saved videos and current video preview
  let savedVideos = $state([]);
  let currentVideo = $state(null);
  let error = $state('');

  // Load saved videos on component mount
  function loadSavedVideos() {
    savedVideos = videoStorage.getSavedVideosMetadata();
  }

  // Initialize
  loadSavedVideos();
</script>

<div class="h-full flex flex-col font-sans text-base bg-gray-300 text-black">
  <!-- Header -->
  <div class="p-3 border-b border-gray-500 bg-gray-300">
    <h2 class="m-0 text-2xl font-bold text-black">Video Gallery</h2>
    <p class="mt-1 mb-0 text-lg text-gray-600">Your saved Cinemator videos</p>
  </div>

  <!-- Main Content Area -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Video Preview Section -->
    <div class="flex-1 flex flex-col p-4 border-r border-gray-500">
      {#if currentVideo}
        <div class="flex-1 flex items-center justify-center">
          <video 
            src={currentVideo} 
            class="max-w-full max-h-full border border-gray-500 shadow-lg bg-black" 
            controls 
            autoplay 
            muted 
            loop
          ></video>
        </div>
      {:else}
        <div class="flex-1 flex items-center justify-center text-center">
          <div class="text-gray-600">
            <div class="text-6xl mb-4">🎬</div>
            <h3 class="text-xl mb-2">No video selected</h3>
            <p class="text-base">Click on a video from the gallery to preview it here</p>
          </div>
        </div>
      {/if}
    </div>

    <!-- Video Gallery Section -->
    <div class="w-80 flex flex-col overflow-hidden">
      <SavedVideos 
        bind:savedVideos={savedVideos} 
        bind:error={error} 
        bind:currentVideo={currentVideo} 
      />
    </div>
  </div>

  <!-- Error Display -->
  {#if error}
    <div class="p-3 bg-red-100 border border-red-600 text-red-600 text-base mx-3 my-2">
      ⚠️ {error}
    </div>
  {/if}
</div>