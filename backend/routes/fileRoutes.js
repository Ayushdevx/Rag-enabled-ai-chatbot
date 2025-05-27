const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');
const { extractTextFromFile, chunkText } = require('../services/textProcessingService');
const { storeDocumentChunks, deleteFileVectors } = require('../services/vectorDbService');

const router = express.Router();

// In-memory storage for development mode
let inMemoryFiles = [];
let fileIdCounter = 1;

// Conditionally require models only if MongoDB is available
let File;
if (config.mongoURI) {
  File = require('../models/File');
}

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), config.fileStoragePath);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// File filter to accept only allowed file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.txt', '.md', '.png', '.jpg', '.jpeg', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, TXT, MD, PNG, JPG, JPEG, and WEBP files are allowed.'));
  }
};

// Configure multer upload
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * Upload a file
 * POST /api/files/upload
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const filePath = req.file.path;
    const fileType = path.extname(req.file.originalname).substring(1).toLowerCase();

    // Extract text from file
    const extractedText = await extractTextFromFile(filePath, fileType);

    // Chunk the text
    const chunks = chunkText(extractedText);

    // Create file record
    let file;

    if (config.mongoURI && File) {
      // Use MongoDB
      file = await File.create({
        userId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileType,
        fileSize: req.file.size,
        storagePath: filePath
      });

      // Store chunks in vector database
      const vectorIds = await storeDocumentChunks(chunks, userId, file._id.toString());

      // Update file with vector IDs
      file.vectorIds = vectorIds;
      await file.save();

      return res.status(201).json({
        fileId: file._id,
        filename: file.originalName,
        fileType,
        fileSize: file.fileSize,
        chunkCount: chunks.length
      });
    } else {
      // Use in-memory storage
      const fileId = fileIdCounter++;
      file = {
        id: fileId,
        userId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileType,
        fileSize: req.file.size,
        storagePath: filePath,
        vectorIds: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store chunks in vector database
      const vectorIds = await storeDocumentChunks(chunks, userId, fileId.toString());

      // Update file with vector IDs
      file.vectorIds = vectorIds;
      inMemoryFiles.push(file);

      return res.status(201).json({
        fileId: file.id,
        filename: file.originalName,
        fileType,
        fileSize: file.fileSize,
        chunkCount: chunks.length
      });
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    return res.status(500).json({ error: 'Error uploading file' });
  }
});

/**
 * Get user's files
 * GET /api/files
 */
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    let files;

    if (config.mongoURI && File) {
      // Use MongoDB
      files = await File.find({ userId }).sort({ createdAt: -1 });

      return res.status(200).json({
        files: files.map(file => ({
          id: file._id,
          filename: file.originalName,
          fileType: file.fileType,
          fileSize: file.fileSize,
          uploadDate: file.createdAt,
          vectorCount: file.vectorIds.length
        }))
      });
    } else {
      // Use in-memory storage
      files = inMemoryFiles
        .filter(file => file.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return res.status(200).json({
        files: files.map(file => ({
          id: file.id,
          filename: file.originalName,
          fileType: file.fileType,
          fileSize: file.fileSize,
          uploadDate: file.createdAt,
          vectorCount: file.vectorIds.length
        }))
      });
    }
  } catch (error) {
    console.error('Error getting files:', error);
    return res.status(500).json({ error: 'Error getting files' });
  }
});

/**
 * Delete a file
 * DELETE /api/files/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    let file;

    if (config.mongoURI && File) {
      // Use MongoDB
      file = await File.findOne({ _id: id, userId });

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Delete file from storage
      if (fs.existsSync(file.storagePath)) {
        fs.unlinkSync(file.storagePath);
      }

      // Delete vectors from vector database
      await deleteFileVectors(file._id.toString());

      // Delete file record from database
      await file.deleteOne();
    } else {
      // Use in-memory storage
      const fileIndex = inMemoryFiles.findIndex(f => f.id === parseInt(id) && f.userId === userId);

      if (fileIndex === -1) {
        return res.status(404).json({ error: 'File not found' });
      }

      file = inMemoryFiles[fileIndex];

      // Delete file from storage
      if (fs.existsSync(file.storagePath)) {
        fs.unlinkSync(file.storagePath);
      }

      // Delete vectors from vector database
      await deleteFileVectors(file.id.toString());

      // Remove file record from in-memory storage
      inMemoryFiles.splice(fileIndex, 1);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return res.status(500).json({ error: 'Error deleting file' });
  }
});

module.exports = router;
