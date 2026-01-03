const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ============================================
// CLOUDINARY CONFIGURATION
// ============================================

// Validate Cloudinary credentials
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error('❌ ERROR: Cloudinary credentials missing!');
  console.error('❌ Required environment variables:');
  console.error('   - CLOUDINARY_CLOUD_NAME');
  console.error('   - CLOUDINARY_API_KEY');
  console.error('   - CLOUDINARY_API_SECRET');
  console.error('❌ Please add them to your backend/.env file');
  throw new Error('Cloudinary configuration is required. Check your .env file.');
}

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

console.log('✅ Cloudinary configured successfully');
console.log('   Cloud Name:', cloudName);

// ============================================
// MULTER STORAGE CONFIGURATION
// ============================================

/**
 * Create Cloudinary storage for multer
 * This handles ALL file uploads (documents, bulk uploads, etc.)
 */
const createCloudinaryStorage = (folderName = 'makv') => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: (req, file) => {
      // Generate unique filename
      const timestamp = Date.now();
      const randomNum = Math.round(Math.random() * 1E9);
      const originalName = file.originalname;
      const ext = originalName.substring(originalName.lastIndexOf('.'));
      const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
      const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
      
      // Determine resource type based on file extension
      let resourceType = 'raw'; // Default for documents (PDF, DOC, XLS, CSV)
      const extLower = ext.toLowerCase();
      
      // For images, use 'image' resource type
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(extLower)) {
        resourceType = 'image';
      }
      // For videos, use 'video' resource type
      else if (['.mp4', '.mov', '.avi', '.mkv'].includes(extLower)) {
        resourceType = 'video';
      }
      
      // Construct public_id with folder for proper organization
      // Cloudinary will store as: {folder}/{public_id}
      const publicId = `${timestamp}-${randomNum}-${sanitizedName}`;
      
      const params = {
        folder: folderName,
        resource_type: resourceType,
        public_id: publicId,
        overwrite: false,
        invalidate: true,
        type: 'upload', // Regular upload (not private)
        use_filename: false, // Don't use original filename
        unique_filename: true, // Ensure unique filename
      };
      
      // For raw files, ensure they're publicly accessible and include format
      if (resourceType === 'raw') {
        params.access_mode = 'public';
        // Include format in the upload for proper URL generation
        if (ext) {
          params.format = ext.substring(1); // Remove the dot
        }
        // Force public access and allow delivery of restricted file types
        params.overwrite = false;
        params.invalidate = true;
      }
      
      return params;
    },
  });
};

// ============================================
// UPLOAD MIDDLEWARES
// ============================================

/**
 * Multer middleware for document uploads (to /makv/documents folder)
 */
const documentUpload = multer({
  storage: createCloudinaryStorage('makv/documents'),
  fileFilter: (req, file, cb) => {
    // Allow all document types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];
    
    const ext = file.originalname.split('.').pop().toLowerCase();
    const allowedExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'];
    
    if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.originalname}. Allowed: PDF, Word, Excel, CSV, TXT`));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

/**
 * Multer middleware for bulk client uploads (to /makv/bulk-uploads folder)
 */
const bulkUpload = multer({
  storage: createCloudinaryStorage('makv/bulk-uploads'),
  fileFilter: (req, file, cb) => {
    // Allow CSV, Excel, PDF, Word, RTF files for bulk uploads
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.xlsx', '.xls', '.csv', '.pdf', '.doc', '.docx', '.rtf'];
    
    // Also check MIME types for RTF files
    const allowedMimeTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/rtf',
      'text/rtf',
    ];
    
    if (allowedExts.includes(ext) || allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.originalname}. Allowed: Excel (.xlsx, .xls), CSV (.csv), PDF (.pdf), Word (.doc, .docx), RTF (.rtf)`));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Note: For bulk uploads, we need to download from Cloudinary temporarily to parse
// Then delete the temporary file after processing

console.log('✅ Multer upload middlewares configured');

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Download file from Cloudinary URL to temporary local file
 * This is needed for parsing files (Excel, CSV, PDF, Word)
 * @param {string} cloudinaryUrl - The Cloudinary URL
 * @param {string} originalName - Original filename
 * @returns {Promise<string>} - Path to temporary file
 */
const downloadFromCloudinary = (cloudinaryUrl, originalName) => {
  return new Promise((resolve, reject) => {
    // Use OS temp directory for production compatibility
    // In production (Render, Heroku, etc.), use system temp directory
    // In development, use project temp folder
    let tempDir;
    if (process.env.NODE_ENV === 'production' || process.env.TEMP_DIR) {
      // Production: Use system temp directory or custom TEMP_DIR env variable
      tempDir = process.env.TEMP_DIR || os.tmpdir();
    } else {
      // Development: Use project temp folder
      tempDir = path.join(__dirname, '../temp');
    }
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const ext = path.extname(originalName);
    const tempFilePath = path.join(tempDir, `temp-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
    
    // Ensure URL uses https
    let url = cloudinaryUrl;
    if (!url.startsWith('http')) {
      // If no protocol, it might be a public_id, construct URL
      reject(new Error('Invalid Cloudinary URL format'));
      return;
    }
    
    url = url.replace('http://', 'https://');
    
    const file = fs.createWriteStream(tempFilePath);
    
    // Use https for Cloudinary
    const https = require('https');
    
    https.get(url, {
      headers: {
        'User-Agent': 'Node.js'
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
        if (response.headers.location) {
          // Follow redirect
          return downloadFromCloudinary(response.headers.location, originalName)
            .then(resolve)
            .catch(reject);
        }
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(tempFilePath);
        reject(new Error(`Failed to download file from Cloudinary: HTTP ${response.statusCode} - ${response.statusMessage || url}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(tempFilePath);
      });
      
      file.on('error', (err) => {
        file.close();
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        reject(err);
      });
    }).on('error', (err) => {
      // Clean up file on error
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      reject(new Error(`Network error downloading from Cloudinary: ${err.message}`));
    });
  });
};

/**
 * Delete temporary file
 * @param {string} filePath - Path to file to delete
 */
const deleteTempFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Error deleting temp file ${filePath}:`, error);
  }
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  cloudinary,
  documentUpload, // For document uploads
  bulkUpload,     // For bulk client uploads
  createCloudinaryStorage, // For custom folder uploads
  downloadFromCloudinary,  // Helper to download from Cloudinary for parsing
  deleteTempFile,          // Helper to clean up temp files
};

