const express = require('express');
const router = express.Router();
const path = require('path');
const Document = require('../models/Document');
const Client = require('../models/Client');
const { auth, isMaster } = require('../middleware/auth');
const { cloudinary, documentUpload } = require('../config/cloudinary');

// Debug middleware to log all document route requests
router.use((req, res, next) => {
  console.log('📋 Document route request:', req.method, req.originalUrl, 'Path:', req.path, 'Params:', req.params);
  next();
});

// @route   POST /api/documents/:clientId
// @desc    Upload document for a specific client (Master only)
// @access  Private (Master)
router.post('/:clientId', auth, isMaster, (req, res, next) => {
  documentUpload.array('files', 10)(req, res, (err) => {
    if (err) {
      console.error('========================================');
      console.error('MULTER UPLOAD ERROR:', err);
      console.error('Error message:', err.message);
      console.error('Error code:', err.code);
      console.error('Error stack:', err.stack);
      console.error('========================================');
      
      // Check if it's a Cloudinary configuration error
      if (err.message && (err.message.toLowerCase().includes('cloudinary') || err.message.toLowerCase().includes('invalid api'))) {
        return res.status(500).json({ 
          success: false, 
          message: 'Cloudinary is not configured properly. Please check your CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables in backend/.env file.',
          error: err.message
        });
      }
      
      // Check for authentication errors
      if (err.message && (err.message.toLowerCase().includes('authentication') || err.message.toLowerCase().includes('401'))) {
        return res.status(500).json({ 
          success: false, 
          message: 'Cloudinary authentication failed. Please verify your API credentials.',
          error: err.message
        });
      }
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false, 
          message: 'File too large. Maximum size is 50MB.' 
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ 
          success: false, 
          message: 'Too many files. Maximum is 10 files per upload.' 
        });
      }
      if (err.message) {
        return res.status(400).json({ 
          success: false, 
          message: err.message 
        });
      }
      return res.status(500).json({ 
        success: false, 
        message: 'File upload error', 
        error: err.message || 'Unknown error',
        details: err.toString()
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { documentType, description } = req.body;

    console.log('========================================');
    console.log('Document upload request received');
    console.log('ClientId:', clientId);
    console.log('Files received:', req.files ? req.files.length : 0);
    console.log('Document type:', documentType);
    console.log('Description:', description);

    console.log('Using storage: Cloudinary (mandatory)');

    // Check if client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const uploadedDocuments = [];
    const errors = [];

    for (const file of req.files) {
      try {
        console.log('Processing file:', file.originalname);
        console.log('File path (Cloudinary URL):', file.path);
        console.log('File public_id:', file.public_id);
        
        // Verify Cloudinary upload was successful
        if (!file.path) {
          throw new Error(`Failed to upload ${file.originalname} to Cloudinary - no URL returned`);
        }

        // CloudinaryStorage returns file.path as the secure URL
        // Get the public_id (which includes folder path)
        const cloudinaryPublicId = file.public_id || '';
        let cloudinaryUrl = file.path || '';
        const format = file.format || path.extname(file.originalname).substring(1) || 'pdf';
        
        // Always reconstruct URL using Cloudinary SDK to ensure proper format and public access
        if (cloudinaryPublicId) {
          // Use Cloudinary SDK to generate the proper secure URL
          // For raw files (PDF, DOC, etc.), ensure they're publicly accessible
          cloudinaryUrl = cloudinary.url(cloudinaryPublicId, {
            resource_type: 'raw',
            secure: true,
            format: format,
            type: 'upload',
            sign_url: false, // Public files - no signature needed
          });
          
          console.log('Generated Cloudinary URL:', cloudinaryUrl);
          
          // Ensure the uploaded file is set to public access mode (async, don't wait)
          cloudinary.uploader.explicit(cloudinaryPublicId, {
            resource_type: 'raw',
            type: 'upload',
            access_mode: 'public',
            invalidate: true,
          }).then(() => {
            console.log('✅ File set to public access mode:', cloudinaryPublicId);
          }).catch((accessError) => {
            console.warn('⚠️ Could not set file to public (might already be public):', accessError.message);
          });
        } else if (cloudinaryUrl && cloudinaryUrl.startsWith('http')) {
          // If we have a URL from CloudinaryStorage, use it but ensure https
          cloudinaryUrl = cloudinaryUrl.replace('http://', 'https://');
          // Remove any query parameters that might block access
          cloudinaryUrl = cloudinaryUrl.split('?')[0];
        } else {
          throw new Error('No Cloudinary URL or public_id returned for uploaded file');
        }
        
        console.log('✅ File uploaded to Cloudinary');
        console.log('   URL:', cloudinaryUrl);
        console.log('   Public ID:', cloudinaryPublicId);

        // Create document record (only Cloudinary, no local storage)
        const document = new Document({
          clientId,
          fileName: file.filename || file.originalname,
          originalName: file.originalname,
          cloudinaryUrl: cloudinaryUrl, // Cloudinary URL
          cloudinaryPublicId: cloudinaryPublicId, // Cloudinary public ID
          filePath: '', // Empty - files are only on Cloudinary
          fileType: file.mimetype,
          fileSize: file.size,
          documentType: documentType || 'other',
          uploadedBy: req.user._id,
          description: description || '',
        });

        await document.save();
        console.log('Document saved successfully:', document._id);
        uploadedDocuments.push(document);
      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        console.error('File error stack:', fileError.stack);
        errors.push({ file: file.originalname, error: fileError.message });
      }
    }

    if (uploadedDocuments.length === 0) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to upload any documents', 
        errors: errors 
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${uploadedDocuments.length} document(s)${errors.length > 0 ? `. ${errors.length} file(s) failed.` : ''}`,
      data: uploadedDocuments,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('========================================');
    console.error('UPLOAD DOCUMENT ERROR:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('========================================');
    
    // Always send a response to prevent hanging
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Server error during upload', 
        error: error.message || 'Unknown error occurred',
        details: error.toString()
      });
    } else {
      console.error('Response already sent, cannot send error response');
    }
  }
});

// @route   GET /api/documents/client/:clientId
// @desc    Get all documents for a specific client
// @access  Private
router.get('/client/:clientId', auth, async (req, res) => {
  try {
    const { clientId } = req.params;

    // Check if client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Clients can only view their own documents
    if (req.user.role === 'client') {
      if (client.userId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    let documents = await Document.find({ clientId })
      .populate('uploadedBy', 'name email')
      .sort({ uploadedAt: -1 });

    // Regenerate Cloudinary URLs to ensure they're publicly accessible
    documents = documents.map(doc => {
      const docObj = doc.toObject();
      
      // Regenerate URL from public_id to ensure it's public and properly formatted
      if (docObj.cloudinaryPublicId) {
        const format = path.extname(docObj.originalName || docObj.fileName || '').substring(1) || 'pdf';
        docObj.cloudinaryUrl = cloudinary.url(docObj.cloudinaryPublicId, {
          resource_type: 'raw',
          secure: true,
          format: format,
          type: 'upload',
          sign_url: false, // Public files don't need signed URLs
        });
      } else if (docObj.cloudinaryUrl) {
        // Ensure existing URL uses https
        docObj.cloudinaryUrl = docObj.cloudinaryUrl.replace('http://', 'https://');
      }
      
      return docObj;
    });

    res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/documents/all
// @desc    Get all documents (Master only)
// @access  Private (Master only)
router.get('/all', auth, isMaster, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    let documents = await Document.find({})
      .populate('clientId', 'name clientId email phone')
      .populate('uploadedBy', 'name email')
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Document.countDocuments();

    // Regenerate Cloudinary URLs
    documents = documents.map(doc => {
      const docObj = doc.toObject();
      
      if (docObj.cloudinaryPublicId) {
        const format = path.extname(docObj.originalName || docObj.fileName || '').substring(1) || 'pdf';
        docObj.cloudinaryUrl = cloudinary.url(docObj.cloudinaryPublicId, {
          resource_type: 'raw',
          secure: true,
          format: format,
          type: 'upload',
          sign_url: false,
        });
      } else if (docObj.cloudinaryUrl) {
        docObj.cloudinaryUrl = docObj.cloudinaryUrl.replace('http://', 'https://');
      }
      
      return docObj;
    });

    res.json({
      success: true,
      data: documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get all documents error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/documents/my-documents
// @desc    Get all documents for the logged-in client
// @access  Private (Client only)
router.get('/my-documents', auth, async (req, res) => {
  try {
    // Find client by userId
    const client = await Client.findOne({ userId: req.user._id });
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    let documents = await Document.find({ clientId: client._id })
      .populate('uploadedBy', 'name email')
      .sort({ uploadedAt: -1 });

    // Regenerate Cloudinary URLs to ensure they're publicly accessible
    documents = documents.map(doc => {
      const docObj = doc.toObject();
      
      // Ensure _id is included and properly formatted as string
      if (!docObj._id) {
        docObj._id = doc._id ? doc._id.toString() : null;
      } else if (typeof docObj._id === 'object' && docObj._id.toString) {
        docObj._id = docObj._id.toString();
      }
      
      // Regenerate URL from public_id to ensure it's public and properly formatted
      if (docObj.cloudinaryPublicId) {
        const format = path.extname(docObj.originalName || docObj.fileName || '').substring(1) || 'pdf';
        docObj.cloudinaryUrl = cloudinary.url(docObj.cloudinaryPublicId, {
          resource_type: 'raw',
          secure: true,
          format: format,
          type: 'upload',
          sign_url: false, // Public files don't need signed URLs
        });
      } else if (docObj.cloudinaryUrl) {
        // Ensure existing URL uses https
        docObj.cloudinaryUrl = docObj.cloudinaryUrl.replace('http://', 'https://');
      }
      
      return docObj;
    });

    // Log document IDs for debugging
    console.log('📄 Returning documents to client:', documents.length);
    documents.forEach((doc, index) => {
      console.log(`   Document ${index + 1}: ID=${doc._id} (type: ${typeof doc._id}), Name=${doc.originalName}`);
    });

    res.json({
      success: true,
      data: documents,
      clientId: client._id,
    });
  } catch (error) {
    console.error('Get my documents error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/documents/:id/view
// @desc    View document (stream from Cloudinary)
// @access  Private
// IMPORTANT: This route must come BEFORE the generic /:id route
router.get('/:id/view', auth, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    let documentId = req.params.id;
    
    // Remove 'view' if accidentally included in the ID
    if (documentId.endsWith('/view')) {
      documentId = documentId.replace('/view', '');
    }
    
    console.log('🔍 VIEW ROUTE HIT - Document ID:', documentId);
    console.log('   Full URL:', req.originalUrl);
    console.log('   Request path:', req.path);
    console.log('   Request params:', req.params);
    console.log('   ID length:', documentId?.length);
    console.log('   User:', req.user?._id, 'Role:', req.user?.role);
    
    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      console.log('❌ Invalid document ID format:', documentId);
      return res.status(400).json({ success: false, message: 'Invalid document ID format' });
    }
    
    // Try to find document - use multiple methods
    let document = await Document.findById(documentId).populate('clientId');
    
    // If not found, try with ObjectId conversion
    if (!document) {
      try {
        document = await Document.findById(new mongoose.Types.ObjectId(documentId)).populate('clientId');
      } catch (e) {
        // Ignore
      }
    }

    if (!document) {
      console.log('❌ Document not found. Searching database...');
      
      // Get all documents for this user's client to help debug
      if (req.user.role === 'client') {
        const client = await Client.findOne({ userId: req.user._id });
        if (client) {
          const clientDocs = await Document.find({ clientId: client._id }).select('_id originalName').limit(10);
          console.log('   Documents for this client:', clientDocs.map(d => ({ id: d._id.toString(), name: d.originalName })));
        }
      }
      
      // List all documents for debugging
      const allDocs = await Document.find({}).select('_id originalName').limit(10);
      console.log('   Total documents in database:', await Document.countDocuments());
      console.log('   Sample document IDs:', allDocs.map(d => d._id.toString()));
      
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    
    console.log('✅ Document found:', document._id.toString(), document.originalName);

    console.log('Document found - Client ID:', document.clientId?._id);
    console.log('Document Client userId:', document.clientId?.userId);

    // Clients can only view their own documents
    if (req.user.role === 'client') {
      const clientUserId = document.clientId?.userId?.toString();
      const currentUserId = req.user._id.toString();
      console.log('Checking access - Client userId:', clientUserId, 'Current user:', currentUserId);
      
      if (clientUserId !== currentUserId) {
        console.log('Access denied - userId mismatch');
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    // Get file URL from Cloudinary - use same logic as download route
    let fileUrl = document.cloudinaryUrl;
    
    if (!fileUrl && document.cloudinaryPublicId) {
      // Generate signed URL using Cloudinary SDK (works even if file isn't public)
      const format = path.extname(document.originalName || document.fileName || '').substring(1) || 'pdf';
      fileUrl = cloudinary.url(document.cloudinaryPublicId, {
        resource_type: 'raw',
        secure: true,
        format: format,
        type: 'upload',
        sign_url: true, // Use signed URL - works with backend API credentials
      });
    }

    if (!fileUrl) {
      return res.status(404).json({ success: false, message: 'File URL not available' });
    }

    // Ensure file is public before streaming (try to set it)
    if (document.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.explicit(document.cloudinaryPublicId, {
          resource_type: 'raw',
          type: 'upload',
          access_mode: 'public',
          invalidate: true,
        });
        console.log('✅ File set to public access mode:', document.cloudinaryPublicId);
        // Wait a moment for the change to propagate
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (accessError) {
        console.warn('⚠️ Could not set file to public:', accessError.message);
      }
    }

    // Use Cloudinary signed URL (already signed above)
    fileUrl = fileUrl.replace('http://', 'https://').split('?')[0];

    // Fetch and stream file from Cloudinary using https - same as download route
    const https = require('https');
    
    https.get(fileUrl, {
      headers: {
        'User-Agent': 'Node.js',
      }
    }, (cloudinaryResponse) => {
      // Handle redirects
      if (cloudinaryResponse.statusCode === 301 || cloudinaryResponse.statusCode === 302 || 
          cloudinaryResponse.statusCode === 307 || cloudinaryResponse.statusCode === 308) {
        if (cloudinaryResponse.headers.location) {
          return https.get(cloudinaryResponse.headers.location, {
            headers: { 'User-Agent': 'Node.js' }
          }, (redirectResponse) => {
            // Set headers BEFORE piping
            const contentType = document.fileType || 'application/pdf';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalName)}"`);
            res.setHeader('Cache-Control', 'public, max-age=3600');
            redirectResponse.pipe(res);
          }).on('error', (error) => {
            console.error('Error fetching redirected file:', error);
            res.status(500).json({ success: false, message: 'Error fetching file' });
          });
        }
      }

      if (cloudinaryResponse.statusCode !== 200) {
        console.error('❌ Cloudinary returned status:', cloudinaryResponse.statusCode);
        
        // If 401, try with signed URL
        if (cloudinaryResponse.statusCode === 401) {
          console.log('Trying with signed URL...');
          const format = path.extname(document.originalName || document.fileName || '').substring(1) || 'pdf';
          const signedUrl = cloudinary.url(document.cloudinaryPublicId, {
            resource_type: 'raw',
            secure: true,
            format: format,
            type: 'upload',
            sign_url: true, // Use signed URL
          });
          
          const url = require('url');
          const signedParsed = url.parse(signedUrl);
          https.get({
            hostname: signedParsed.hostname,
            path: signedParsed.path,
            headers: { 'User-Agent': 'Node.js' }
          }, (signedResponse) => {
            if (signedResponse.statusCode === 200) {
              // Set headers BEFORE piping
              const contentType = document.fileType || 'application/pdf';
              res.setHeader('Content-Type', contentType);
              res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalName)}"`);
              res.setHeader('Cache-Control', 'public, max-age=3600');
              signedResponse.pipe(res);
            } else {
              res.status(signedResponse.statusCode || 500).json({ 
                success: false, 
                message: `Failed to fetch file from Cloudinary (Status: ${signedResponse.statusCode})` 
              });
            }
          }).on('error', (error) => {
            console.error('Error fetching signed URL:', error);
            res.status(500).json({ success: false, message: 'Error fetching file', error: error.message });
          });
          return;
        }
        
        return res.status(cloudinaryResponse.statusCode || 500).json({ 
          success: false, 
          message: `Failed to fetch file from Cloudinary (Status: ${cloudinaryResponse.statusCode})` 
        });
      }

      // Set headers BEFORE piping to ensure they're sent correctly
      const contentType = document.fileType || 'application/pdf';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalName)}"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      console.log('📤 Streaming file with Content-Type:', contentType);

      cloudinaryResponse.pipe(res);
    }).on('error', (error) => {
      console.error('Error fetching file from Cloudinary:', error);
      res.status(500).json({ success: false, message: 'Error fetching file', error: error.message });
    });
  } catch (error) {
    console.error('View document error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/documents/:id/download
// @desc    Download document (stream from Cloudinary)
// @access  Private
router.get('/:id/download', auth, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    let documentId = req.params.id;
    
    // Remove 'download' if accidentally included in the ID
    if (documentId.endsWith('/download')) {
      documentId = documentId.replace('/download', '');
    }
    
    console.log('🔍 Download request - Document ID:', documentId);
    console.log('   ID length:', documentId?.length);
    console.log('   User:', req.user?._id, 'Role:', req.user?.role);
    
    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      console.log('❌ Invalid document ID format:', documentId);
      return res.status(400).json({ success: false, message: 'Invalid document ID format' });
    }
    
    // Try to find document - use multiple methods
    let document = await Document.findById(documentId).populate('clientId');
    
    // If not found, try with ObjectId conversion
    if (!document) {
      try {
        document = await Document.findById(new mongoose.Types.ObjectId(documentId)).populate('clientId');
      } catch (e) {
        // Ignore
      }
    }

    if (!document) {
      console.log('❌ Document not found. Searching database...');
      
      // Get all documents for this user's client to help debug
      if (req.user.role === 'client') {
        const client = await Client.findOne({ userId: req.user._id });
        if (client) {
          const clientDocs = await Document.find({ clientId: client._id }).select('_id originalName').limit(10);
          console.log('   Documents for this client:', clientDocs.map(d => ({ id: d._id.toString(), name: d.originalName })));
        }
      }
      
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    
    console.log('✅ Document found:', document._id.toString(), document.originalName);

    console.log('Document found - Client ID:', document.clientId?._id);
    console.log('Document Client userId:', document.clientId?.userId);

    // Clients can only download their own documents
    if (req.user.role === 'client') {
      const clientUserId = document.clientId?.userId?.toString();
      const currentUserId = req.user._id.toString();
      console.log('Checking access - Client userId:', clientUserId, 'Current user:', currentUserId);
      
      if (clientUserId !== currentUserId) {
        console.log('Access denied - userId mismatch');
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    // Get file URL from Cloudinary
    let fileUrl = document.cloudinaryUrl;
    
    if (!fileUrl && document.cloudinaryPublicId) {
      // Generate signed URL using Cloudinary SDK (works even if file isn't public)
      const format = path.extname(document.originalName || document.fileName || '').substring(1) || 'pdf';
      fileUrl = cloudinary.url(document.cloudinaryPublicId, {
        resource_type: 'raw',
        secure: true,
        format: format,
        type: 'upload',
        sign_url: true, // Use signed URL - works with backend API credentials
      });
    }

    if (!fileUrl) {
      return res.status(404).json({ success: false, message: 'File URL not available' });
    }

    // Ensure file is public before streaming (try to set it)
    if (document.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.explicit(document.cloudinaryPublicId, {
          resource_type: 'raw',
          type: 'upload',
          access_mode: 'public',
          invalidate: true,
        });
        console.log('✅ File set to public access mode:', document.cloudinaryPublicId);
        // Wait a moment for the change to propagate
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (accessError) {
        console.warn('⚠️ Could not set file to public:', accessError.message);
      }
    }

    // Use Cloudinary signed URL (already signed above)
    fileUrl = fileUrl.replace('http://', 'https://').split('?')[0];

    // Fetch and stream file from Cloudinary using https
    const https = require('https');
    
    https.get(fileUrl, {
      headers: {
        'User-Agent': 'Node.js',
      }
    }, (cloudinaryResponse) => {
      // Handle redirects
      if (cloudinaryResponse.statusCode === 301 || cloudinaryResponse.statusCode === 302 || 
          cloudinaryResponse.statusCode === 307 || cloudinaryResponse.statusCode === 308) {
        if (cloudinaryResponse.headers.location) {
          return https.get(cloudinaryResponse.headers.location, {
            headers: { 'User-Agent': 'Node.js' }
          }, (redirectResponse) => {
            res.setHeader('Content-Type', document.fileType || 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.originalName)}"`);
            res.setHeader('Cache-Control', 'public, max-age=3600');
            redirectResponse.pipe(res);
          }).on('error', (error) => {
            console.error('Error fetching redirected file:', error);
            res.status(500).json({ success: false, message: 'Error fetching file' });
          });
        }
      }

      if (cloudinaryResponse.statusCode !== 200) {
        console.error('❌ Cloudinary returned status:', cloudinaryResponse.statusCode);
        
        // If 401, try with signed URL
        if (cloudinaryResponse.statusCode === 401) {
          console.log('Trying with signed URL...');
          const format = path.extname(document.originalName || document.fileName || '').substring(1) || 'pdf';
          const signedUrl = cloudinary.url(document.cloudinaryPublicId, {
            resource_type: 'raw',
            secure: true,
            format: format,
            type: 'upload',
            sign_url: true, // Use signed URL
          });
          
          const url = require('url');
          const signedParsed = url.parse(signedUrl);
          https.get({
            hostname: signedParsed.hostname,
            path: signedParsed.path,
            headers: { 'User-Agent': 'Node.js' }
          }, (signedResponse) => {
            if (signedResponse.statusCode === 200) {
              res.setHeader('Content-Type', document.fileType || 'application/octet-stream');
              res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.originalName)}"`);
              res.setHeader('Cache-Control', 'public, max-age=3600');
              signedResponse.pipe(res);
            } else {
              res.status(signedResponse.statusCode || 500).json({ 
                success: false, 
                message: `Failed to fetch file from Cloudinary (Status: ${signedResponse.statusCode})` 
              });
            }
          }).on('error', (error) => {
            console.error('Error fetching signed URL:', error);
            res.status(500).json({ success: false, message: 'Error fetching file', error: error.message });
          });
          return;
        }
        
        return res.status(cloudinaryResponse.statusCode || 500).json({ 
          success: false, 
          message: `Failed to fetch file from Cloudinary (Status: ${cloudinaryResponse.statusCode})` 
        });
      }

      res.setHeader('Content-Type', document.fileType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.originalName)}"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');

      cloudinaryResponse.pipe(res);
    }).on('error', (error) => {
      console.error('Error fetching file from Cloudinary:', error);
      res.status(500).json({ success: false, message: 'Error fetching file', error: error.message });
    });
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/documents/:id
// @desc    Get single document
// @access  Private
// NOTE: This route must come AFTER /:id/view and /:id/download to avoid route conflicts
router.get('/:id', auth, async (req, res) => {
  try {
    // CRITICAL: Prevent this route from matching /view or /download
    // Express should match /:id/view before /:id, but this is a safety check
    const path = req.path || req.originalUrl.split('?')[0];
    if (path.endsWith('/view') || path.endsWith('/download')) {
      console.log('⚠️⚠️⚠️ Generic /:id route incorrectly matched a /view or /download request!');
      console.log('   Request path:', req.path);
      console.log('   Request originalUrl:', req.originalUrl);
      console.log('   Request params.id:', req.params.id);
      console.log('   This should NOT happen - /:id/view should match first!');
      // Don't return 404 here - let it fall through or return a proper error
      return res.status(500).json({ 
        success: false, 
        message: 'Route matching error - contact admin',
        debug: {
          path: req.path,
          originalUrl: req.originalUrl,
          paramsId: req.params.id
        }
      });
    }
    
    // Also check params.id for safety
    if (req.params.id && (req.params.id === 'view' || req.params.id === 'download' || 
        String(req.params.id).endsWith('/view') || String(req.params.id).endsWith('/download'))) {
      console.log('⚠️ Generic /:id route matched with view/download in params.id:', req.params.id);
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    
    console.log('🔍 Generic /:id route - Document ID:', req.params.id);
    
    const document = await Document.findById(req.params.id).populate('clientId').populate('uploadedBy', 'name email');

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Clients can only view their own documents
    if (req.user.role === 'client') {
      if (document.clientId.userId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    res.json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/documents/:id
// @desc    Delete document (Master only)
// @access  Private (Master)
router.delete('/:id', auth, isMaster, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Delete file from Cloudinary
    if (document.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(document.cloudinaryPublicId, {
          resource_type: 'raw',
        });
        console.log('✅ File deleted from Cloudinary:', document.cloudinaryPublicId);
      } catch (error) {
        console.error('❌ Error deleting file from Cloudinary:', error);
        // Continue with document deletion even if Cloudinary deletion fails
      }
    } else {
      console.warn('⚠️  No Cloudinary public_id found for document:', document._id);
    }

    await Document.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

