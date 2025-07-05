/**
 * @typedef {Object} ReferenceImage
 * @property {string} id - Unique identifier
 * @property {File | null} file - Original file object
 * @property {string} url - Image URL (data URI or blob URL)
 * @property {string} name - Display name
 * @property {number} width - Image width
 * @property {number} height - Image height
 */

/**
 * @typedef {'horizontal' | 'vertical' | 'grid'} StitchMode
 */

/**
 * Load an image from URL and return HTMLImageElement
 * @param {string} url - Image URL
 * @returns {Promise<HTMLImageElement>}
 */
export async function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.crossOrigin = 'anonymous';
    img.src = url;
  });
}

/**
 * Get image dimensions from URL
 * @param {string} url - Image URL
 * @returns {Promise<{width: number, height: number}>}
 */
export async function getImageDimensions(url) {
  const img = await loadImageFromUrl(url);
  return { width: img.naturalWidth, height: img.naturalHeight };
}

/**
 * Convert File to ReferenceImage object
 * @param {File} file - Image file
 * @returns {Promise<ReferenceImage>}
 */
export async function fileToReferenceImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const url = reader.result;
        if (typeof url !== 'string') {
          reject(new Error('Failed to read file as string'));
          return;
        }
        
        const dimensions = await getImageDimensions(url);
        resolve({
          id: crypto.randomUUID(),
          file,
          url,
          name: file.name,
          width: dimensions.width,
          height: dimensions.height
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Create a composite image by stitching multiple images horizontally
 * @param {ReferenceImage[]} images - Array of reference images
 * @param {number} [padding=10] - Padding between images
 * @returns {Promise<string>} Data URL of composite image
 */
export async function stitchImagesHorizontally(images, padding = 10) {
  if (images.length === 0) {
    throw new Error('No images provided');
  }
  
  if (images.length === 1) {
    return images[0].url;
  }

  // Load all images
  const loadedImages = await Promise.all(images.map(img => loadImageFromUrl(img.url)));
  
  // Calculate dimensions
  const maxHeight = Math.max(...loadedImages.map(img => img.naturalHeight));
  const totalWidth = loadedImages.reduce((sum, img, index) => {
    const scaledWidth = (img.naturalWidth * maxHeight) / img.naturalHeight;
    return sum + scaledWidth + (index > 0 ? padding : 0);
  }, 0);

  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = totalWidth;
  canvas.height = maxHeight;

  // Fill with white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw images
  let currentX = 0;
  for (let i = 0; i < loadedImages.length; i++) {
    const img = loadedImages[i];
    const scaledWidth = (img.naturalWidth * maxHeight) / img.naturalHeight;
    
    ctx.drawImage(img, currentX, 0, scaledWidth, maxHeight);
    currentX += scaledWidth + padding;
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Create a composite image by stitching multiple images vertically
 * @param {ReferenceImage[]} images - Array of reference images
 * @param {number} [padding=10] - Padding between images
 * @returns {Promise<string>} Data URL of composite image
 */
export async function stitchImagesVertically(images, padding = 10) {
  if (images.length === 0) {
    throw new Error('No images provided');
  }
  
  if (images.length === 1) {
    return images[0].url;
  }

  // Load all images
  const loadedImages = await Promise.all(images.map(img => loadImageFromUrl(img.url)));
  
  // Calculate dimensions
  const maxWidth = Math.max(...loadedImages.map(img => img.naturalWidth));
  const totalHeight = loadedImages.reduce((sum, img, index) => {
    const scaledHeight = (img.naturalHeight * maxWidth) / img.naturalWidth;
    return sum + scaledHeight + (index > 0 ? padding : 0);
  }, 0);

  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = maxWidth;
  canvas.height = totalHeight;

  // Fill with white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw images
  let currentY = 0;
  for (let i = 0; i < loadedImages.length; i++) {
    const img = loadedImages[i];
    const scaledHeight = (img.naturalHeight * maxWidth) / img.naturalWidth;
    
    ctx.drawImage(img, 0, currentY, maxWidth, scaledHeight);
    currentY += scaledHeight + padding;
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Create a composite image by arranging images in a grid
 * @param {ReferenceImage[]} images - Array of reference images
 * @param {number} [padding=10] - Padding between images
 * @returns {Promise<string>} Data URL of composite image
 */
export async function stitchImagesGrid(images, padding = 10) {
  if (images.length === 0) {
    throw new Error('No images provided');
  }
  
  if (images.length === 1) {
    return images[0].url;
  }

  // Load all images
  const loadedImages = await Promise.all(images.map(img => loadImageFromUrl(img.url)));
  
  // Calculate grid dimensions
  const cols = Math.ceil(Math.sqrt(images.length));
  const rows = Math.ceil(images.length / cols);
  
  // Find the maximum dimensions to normalize all images
  const maxWidth = Math.max(...loadedImages.map(img => img.naturalWidth));
  const maxHeight = Math.max(...loadedImages.map(img => img.naturalHeight));
  
  // Use the smaller dimension to make square cells
  const cellSize = Math.min(maxWidth, maxHeight);
  
  // Calculate canvas dimensions
  const canvasWidth = cols * cellSize + (cols - 1) * padding;
  const canvasHeight = rows * cellSize + (rows - 1) * padding;

  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // Fill with white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw images in grid
  for (let i = 0; i < loadedImages.length; i++) {
    const img = loadedImages[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    
    const x = col * (cellSize + padding);
    const y = row * (cellSize + padding);
    
    // Calculate scaling to fit in cell while maintaining aspect ratio
    const scale = Math.min(cellSize / img.naturalWidth, cellSize / img.naturalHeight);
    const scaledWidth = img.naturalWidth * scale;
    const scaledHeight = img.naturalHeight * scale;
    
    // Center the image in the cell
    const offsetX = (cellSize - scaledWidth) / 2;
    const offsetY = (cellSize - scaledHeight) / 2;
    
    ctx.drawImage(img, x + offsetX, y + offsetY, scaledWidth, scaledHeight);
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Stitch images based on mode
 * @param {ReferenceImage[]} images - Array of reference images
 * @param {StitchMode} mode - Stitching mode
 * @param {number} [padding=10] - Padding between images
 * @returns {Promise<string>} Data URL of composite image
 */
export async function stitchImages(images, mode, padding = 10) {
  switch (mode) {
    case 'horizontal':
      return stitchImagesHorizontally(images, padding);
    case 'vertical':
      return stitchImagesVertically(images, padding);
    case 'grid':
      return stitchImagesGrid(images, padding);
    default:
      throw new Error(`Unknown stitch mode: ${mode}`);
  }
}

/**
 * Resize an image while maintaining aspect ratio
 * @param {string} imageUrl - Source image URL
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @returns {Promise<string>} Resized image data URL
 */
export async function resizeImage(imageUrl, maxWidth, maxHeight) {
  const img = await loadImageFromUrl(imageUrl);
  
  // Calculate new dimensions
  const scale = Math.min(maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
  const newWidth = img.naturalWidth * scale;
  const newHeight = img.naturalHeight * scale;
  
  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = newWidth;
  canvas.height = newHeight;
  
  // Draw resized image
  ctx.drawImage(img, 0, 0, newWidth, newHeight);
  
  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Clean up blob URLs to prevent memory leaks
 * @param {ReferenceImage[]} images - Array of reference images
 */
export function cleanupImageUrls(images) {
  images.forEach(img => {
    if (img.url.startsWith('blob:')) {
      URL.revokeObjectURL(img.url);
    }
  });
}