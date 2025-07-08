/**
 * Analyzed Image Storage
 * Handles storage and retrieval of analyzed images with their metadata
 */

const ANALYZED_IMAGES_KEY = 'analyzed_images';
const ANALYZED_IMAGES_METADATA_KEY = 'analyzed_images_metadata';

/**
 * Get all analyzed images from localStorage
 * @returns {import('./types.js').AnalyzedImage[]}
 */
export function getAnalyzedImages() {
  try {
    const stored = localStorage.getItem(ANALYZED_IMAGES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading analyzed images:', error);
    return [];
  }
}

/**
 * Save analyzed image to storage
 * @param {import('./types.js').AnalyzedImage} analyzedImage
 * @returns {boolean} Success status
 */
export function saveAnalyzedImage(analyzedImage) {
  try {
    const images = getAnalyzedImages();
    const existingIndex = images.findIndex(img => img.id === analyzedImage.id);
    
    if (existingIndex >= 0) {
      // Update existing image
      images[existingIndex] = {
        ...analyzedImage,
        updatedAt: Date.now()
      };
    } else {
      // Add new image
      images.push({
        ...analyzedImage,
        createdAt: analyzedImage.createdAt || Date.now(),
        updatedAt: Date.now()
      });
    }
    
    localStorage.setItem(ANALYZED_IMAGES_KEY, JSON.stringify(images));
    return true;
  } catch (error) {
    console.error('Error saving analyzed image:', error);
    return false;
  }
}

/**
 * Get analyzed image by ID
 * @param {string} id
 * @returns {import('./types.js').AnalyzedImage | null}
 */
export function getAnalyzedImage(id) {
  const images = getAnalyzedImages();
  return images.find(img => img.id === id) || null;
}

/**
 * Delete analyzed image by ID
 * @param {string} id
 * @returns {boolean} Success status
 */
export function deleteAnalyzedImage(id) {
  try {
    const images = getAnalyzedImages();
    const filteredImages = images.filter(img => img.id !== id);
    localStorage.setItem(ANALYZED_IMAGES_KEY, JSON.stringify(filteredImages));
    return true;
  } catch (error) {
    console.error('Error deleting analyzed image:', error);
    return false;
  }
}

/**
 * Add analysis to an existing analyzed image
 * @param {string} imageId
 * @param {import('./types.js').ImageAnalysis} analysis
 * @returns {boolean} Success status
 */
export function addAnalysisToImage(imageId, analysis) {
  try {
    const images = getAnalyzedImages();
    const imageIndex = images.findIndex(img => img.id === imageId);
    
    if (imageIndex >= 0) {
      const image = images[imageIndex];
      
      // Remove existing analysis of the same type
      image.analyses = image.analyses.filter(a => a.type !== analysis.type);
      
      // Add new analysis
      image.analyses.push({
        ...analysis,
        timestamp: analysis.timestamp || Date.now()
      });
      
      // Update timestamp
      image.updatedAt = Date.now();
      
      localStorage.setItem(ANALYZED_IMAGES_KEY, JSON.stringify(images));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error adding analysis to image:', error);
    return false;
  }
}

/**
 * Get analysis by type for an image
 * @param {string} imageId
 * @param {string} analysisType
 * @returns {import('./types.js').ImageAnalysis | null}
 */
export function getImageAnalysis(imageId, analysisType) {
  const image = getAnalyzedImage(imageId);
  if (!image) return null;
  
  return image.analyses.find(a => a.type === analysisType) || null;
}

/**
 * Search analyzed images by name, tags, or analysis descriptions
 * @param {string} query
 * @returns {import('./types.js').AnalyzedImage[]}
 */
export function searchAnalyzedImages(query) {
  const images = getAnalyzedImages();
  const searchTerm = query.toLowerCase().trim();
  
  if (!searchTerm) return images;
  
  return images.filter(image => {
    // Search in name
    if (image.name.toLowerCase().includes(searchTerm)) return true;
    
    // Search in tags
    if (image.tags && image.tags.some(tag => tag.toLowerCase().includes(searchTerm))) return true;
    
    // Search in notes
    if (image.notes && image.notes.toLowerCase().includes(searchTerm)) return true;
    
    // Search in analysis descriptions
    if (image.analyses.some(analysis => 
      analysis.description.toLowerCase().includes(searchTerm)
    )) return true;
    
    return false;
  });
}

/**
 * Get analyzed images by tag
 * @param {string} tag
 * @returns {import('./types.js').AnalyzedImage[]}
 */
export function getAnalyzedImagesByTag(tag) {
  const images = getAnalyzedImages();
  return images.filter(image => 
    image.tags && image.tags.includes(tag)
  );
}

/**
 * Get all unique tags from analyzed images
 * @returns {string[]}
 */
export function getAllTags() {
  const images = getAnalyzedImages();
  const tagSet = new Set();
  
  images.forEach(image => {
    if (image.tags) {
      image.tags.forEach(tag => tagSet.add(tag));
    }
  });
  
  return Array.from(tagSet).sort();
}

/**
 * Update analyzed image metadata (name, tags, notes)
 * @param {string} imageId
 * @param {Partial<Pick<import('./types.js').AnalyzedImage, 'name' | 'tags' | 'notes'>>} updates
 * @returns {boolean} Success status
 */
export function updateAnalyzedImageMetadata(imageId, updates) {
  try {
    const images = getAnalyzedImages();
    const imageIndex = images.findIndex(img => img.id === imageId);
    
    if (imageIndex >= 0) {
      const image = images[imageIndex];
      
      // Update fields
      if (updates.name !== undefined) image.name = updates.name;
      if (updates.tags !== undefined) image.tags = updates.tags;
      if (updates.notes !== undefined) image.notes = updates.notes;
      
      // Update timestamp
      image.updatedAt = Date.now();
      
      localStorage.setItem(ANALYZED_IMAGES_KEY, JSON.stringify(images));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error updating analyzed image metadata:', error);
    return false;
  }
}

/**
 * Export analyzed image with metadata as JSON
 * @param {string} imageId
 * @returns {string | null} JSON string or null if not found
 */
export function exportAnalyzedImageMetadata(imageId) {
  const image = getAnalyzedImage(imageId);
  if (!image) return null;
  
  return JSON.stringify(image, null, 2);
}

/**
 * Clear all analyzed images (for testing/cleanup)
 * @returns {boolean} Success status
 */
export function clearAnalyzedImages() {
  try {
    localStorage.removeItem(ANALYZED_IMAGES_KEY);
    localStorage.removeItem(ANALYZED_IMAGES_METADATA_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing analyzed images:', error);
    return false;
  }
}