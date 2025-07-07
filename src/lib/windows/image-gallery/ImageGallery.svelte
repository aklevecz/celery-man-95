<script>
  import SavedImages from "$lib/components/SavedImages.svelte";
  import { imageManager } from "$lib/image-manager.svelte.js";
</script>

<div style="padding: 20px; font-family: 'MS Sans Serif', sans-serif;">
  <h2 style="margin-top: 0; color: #000080;">Image Gallery</h2>
  {#if imageManager.savedImages.length > 0}
    <SavedImages 
      savedImages={imageManager.savedImages} 
      onDescribeImage={null}
    />
  {/if}
</div>
