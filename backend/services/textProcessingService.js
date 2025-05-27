const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');

/**
 * Extract text from a file based on its type
 * @param {string} filePath - Path to the file
 * @param {string} fileType - Type of the file (pdf, txt, md, png, jpg, etc.)
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromFile(filePath, fileType) {
  try {
    // Text files (.txt, .md)
    if (fileType === 'txt' || fileType === 'md') {
      return fs.readFileSync(filePath, 'utf8');
    }
    
    // PDF files
    else if (fileType === 'pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    }
    
    // Image files (png, jpg, jpeg, webp)
    else if (['png', 'jpg', 'jpeg', 'webp'].includes(fileType)) {
      const { data } = await Tesseract.recognize(filePath, 'eng');
      return data.text;
    }
    
    // Unsupported file type
    else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error(`Error extracting text from ${filePath}:`, error);
    throw error;
  }
}

/**
 * Chunk text into smaller segments for embedding
 * @param {string} text - The text to chunk
 * @param {number} maxChunkSize - Maximum size of each chunk
 * @param {number} overlap - Number of characters to overlap between chunks
 * @returns {Array<Object>} - Array of text chunks
 */
function chunkText(text, maxChunkSize = 1000, overlap = 200) {
  const chunks = [];
  
  // Clean and normalize text
  const cleanedText = text
    .replace(/\s+/g, ' ')
    .trim();
  
  // If text is shorter than max chunk size, return as single chunk
  if (cleanedText.length <= maxChunkSize) {
    return [{ text: cleanedText }];
  }
  
  // Split text into sentences
  const sentences = cleanedText.match(/[^.!?]+[.!?]+/g) || [cleanedText];
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    // If adding this sentence would exceed max chunk size
    if (currentChunk.length + sentence.length > maxChunkSize) {
      // Add current chunk to chunks array
      if (currentChunk.length > 0) {
        chunks.push({ text: currentChunk.trim() });
      }
      
      // Start new chunk with overlap from previous chunk
      if (currentChunk.length > overlap) {
        const overlapText = currentChunk.slice(-overlap);
        currentChunk = overlapText + ' ' + sentence;
      } else {
        currentChunk = sentence;
      }
    } else {
      // Add sentence to current chunk
      currentChunk += ' ' + sentence;
    }
  }
  
  // Add final chunk if not empty
  if (currentChunk.trim().length > 0) {
    chunks.push({ text: currentChunk.trim() });
  }
  
  return chunks;
}

module.exports = {
  extractTextFromFile,
  chunkText
};
