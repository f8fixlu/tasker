// Image optimization utility for profile images
const fs = require('fs');
const path = require('path');

// Dynamically require Sharp to handle cases where it might not be installed
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.warn('Sharp library not available. Image optimization will be skipped.');
  sharp = null;
}

/**
 * Optimize image by resizing and compressing
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {Object} options - Optimization options
 * @param {number} options.maxWidth - Maximum width for the image
 * @param {number} options.maxHeight - Maximum height for the image
 * @param {number} options.quality - JPEG/PNG quality (1-100)
 * @returns {Promise<Buffer>} - Optimized image buffer
 */
async function optimizeImage(imageBuffer, options = {}) {
  const {
    maxWidth = 200,      // Default max width for profile images
    maxHeight = 200,     // Default max height for profile images
    quality = 80         // Default quality for compression
  } = options;

  // If Sharp is not available, return the original buffer
  if (!sharp) {
    console.warn('Sharp not available, returning original image buffer');
    return imageBuffer;
  }

  try {
    let sharpInstance = sharp(imageBuffer);

    // Resize the image maintaining aspect ratio
    sharpInstance = sharpInstance.resize({
      width: maxWidth,
      height: maxHeight,
      fit: 'inside',      // Fit the image within the specified dimensions
      withoutEnlargement: true  // Don't enlarge if image is smaller than max dimensions
    });

    // Convert to WebP format if possible for better compression, otherwise use original format
    const imageMetadata = await sharpInstance.metadata();
    let optimizedBuffer;

    if (imageMetadata.format === 'jpeg') {
      optimizedBuffer = await sharpInstance.jpeg({ quality }).toBuffer();
    } else if (imageMetadata.format === 'png') {
      optimizedBuffer = await sharpInstance.png({ quality: Math.round(quality / 10) }).toBuffer(); // PNG quality scale is different
    } else if (imageMetadata.format === 'webp') {
      optimizedBuffer = await sharpInstance.webp({ quality }).toBuffer();
    } else {
      // For other formats, try to convert to JPEG with specified quality
      optimizedBuffer = await sharpInstance.jpeg({ quality }).toBuffer();
    }

    return optimizedBuffer;
  } catch (error) {
    console.error('Error optimizing image:', error);
    // If optimization fails, return original buffer
    return imageBuffer;
  }
}

/**
 * Get optimized dimensions for profile images
 * @param {string} uploadType - Type of upload (profile, attachment, etc.)
 * @returns {Object} - Dimensions and quality settings
 */
function getOptimizationSettings(uploadType) {
  switch (uploadType) {
    case 'profile':
      return {
        maxWidth: 150,    // Smaller size for profile images in header
        maxHeight: 150,
        quality: 75       // Good balance between quality and file size
      };
    case 'attachment':
      return {
        maxWidth: 1024,   // Larger size for attachments
        maxHeight: 1024,
        quality: 85
      };
    default:
      return {
        maxWidth: 800,
        maxHeight: 800,
        quality: 80
      };
  }
}

module.exports = {
  optimizeImage,
  getOptimizationSettings
};