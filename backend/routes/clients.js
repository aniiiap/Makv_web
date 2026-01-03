const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const os = require('os');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Client = require('../models/Client');
const { auth, isMaster } = require('../middleware/auth');

// Configure multer for temporary file storage (bulk upload files are NOT stored on Cloudinary)
// These files are only used to extract client data, then deleted
// Use OS temp directory for production compatibility
const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
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
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `bulk-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const bulkUpload = multer({
  storage: tempStorage,
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
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Helper function to delete temporary file
const deleteTempFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted temp file: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error deleting temp file ${filePath}:`, error);
  }
};

// Helper function to extract structured data from text using regex patterns
function extractClientDataFromText(text) {
  const data = {};
  
  // Split text into lines for better processing
  const lines = text.split(/\n|\r\n/);
  
  // Helper function to find value after a keyword (case-insensitive, handles various formats)
  const findValueAfterKeyword = (keywordPattern, lines) => {
    // Escape special regex characters in keywordPattern
    const escapedPattern = keywordPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Try multiple patterns to handle different document formats
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Pattern 1: "Keyword: Value" (with colon and optional space)
      // Example: "Name of Assessee: ABHAY KUMAR JAIN"
      let regex = new RegExp(`^${escapedPattern}\\s*:\\s*(.+)$`, 'i');
      let match = trimmedLine.match(regex);
      if (match && match[1]) {
        const value = match[1].trim();
        if (value.length > 0) return value;
      }
      
      // Pattern 2: "KeywordValue" (without colon/space, keyword directly followed by value)
      // Example: "PANAHXPJ0054D" or "NameABHAY KUMAR JAIN"
      // Match keyword at start, then capture everything after it (alphanumeric, spaces, commas, dots, hyphens)
      regex = new RegExp(`^${escapedPattern}([A-Za-z0-9\\s,\\.\\-]+)$`, 'i');
      match = trimmedLine.match(regex);
      if (match && match[1]) {
        const value = match[1].trim();
        // Make sure we got something meaningful (contains at least one letter or digit)
        if (value.length > 0 && /[A-Za-z0-9]/.test(value)) {
          // Stop at common field keywords that might appear on same line
          const cleaned = value.replace(/\s*(Status|City|State|Pincode|PIN|Email|E-mail|Mobile|Phone|Tele|PAN|Name|Aadhaar|Aadhar|Company|Form|Number|Filed|Address|Assessment|Year).*$/i, '').trim();
          if (cleaned.length > 0) return cleaned;
        }
      }
      
      // Pattern 3: Keyword anywhere in line before colon "Keyword: Value"
      regex = new RegExp(`${escapedPattern}[^:]*:\\s*(.+)$`, 'i');
      match = trimmedLine.match(regex);
      if (match && match[1]) {
        const value = match[1].trim();
        if (value.length > 0) return value;
      }
    }
    return null;
  };
  
  // Extract Name - match any line that contains "Name" (case-insensitive)
  // Try "Name of Assessee" first (common in tax documents), then other variations
  const nameKeywords = ['Name of Assessee', 'Name of Associates', 'Full Name', 'Name'];
  let nameValue = null;
  for (const keyword of nameKeywords) {
    nameValue = findValueAfterKeyword(keyword, lines);
    if (nameValue && nameValue.length >= 3) {
      // Clean name - remove trailing text that's not part of the name
      let cleanedName = nameValue;
      
      // Remove dates (like 2025-2026, 2024-2025, etc.)
      cleanedName = cleanedName.replace(/\s*\d{4}[-/]\d{4}.*$/i, '');
      
      // Remove PAN numbers (10 alphanumeric characters like BQFPG8839K)
      cleanedName = cleanedName.replace(/\s*[A-Z]{5}\d{4}[A-Z]{1}.*$/i, '');
      
      // Remove "Code :" followed by numbers
      cleanedName = cleanedName.replace(/\s*Code\s*:\s*\d+.*$/i, '');
      
      // Remove text starting with period, colon, or dash followed by numbers/dates
      cleanedName = cleanedName.replace(/\s*[.:-]\s*\d.*$/i, '');
      
      // Remove abbreviations like "A.Y", "A.Y.", "A Y", "A.Y 2024", etc. (Assessment Year abbreviations)
      // Pattern matches: space + letter + optional period + optional space + letter + optional period + optional year
      cleanedName = cleanedName.replace(/\s+[A-Z]\s*\.?\s*[A-Z]\s*\.?\s*(?:\d{2,4})?\s*$/i, '');
      
      // Remove single letter abbreviations followed by period (like "A.", "B.", etc.) at the end
      cleanedName = cleanedName.replace(/\s+[A-Z]\s*\.\s*$/i, '');
      
      // Remove common trailing field names that might have been captured
      cleanedName = cleanedName.replace(/\s+(Father|Mother|Email|E-mail|Mobile|Phone|PAN|Address|City|State|Pincode|PIN|Status|Ward|Gender|Date|Birth|Assessment|Year|Code|A\.Y|A\.Y\.).*$/i, '');
      
      // Remove any trailing numbers, codes, or special characters
      cleanedName = cleanedName.replace(/\s+[:\-]\s*.*$/, ''); // Remove anything after colon or dash
      cleanedName = cleanedName.replace(/\s+\d{4,}.*$/, ''); // Remove trailing long numbers (years, codes)
      
      // Final cleanup - remove leading/trailing spaces and special characters
      cleanedName = cleanedName.replace(/^[.:\-\s]+/, ''); // Remove leading special chars
      cleanedName = cleanedName.replace(/[.:\-\s]+$/, ''); // Remove trailing special chars
      cleanedName = cleanedName.trim();
      
      data.name = cleanedName;
      if (data.name.length >= 3) break; // Valid name found
    }
  }
  
  // Extract Aadhaar - match any line that contains "Aadhaar" (correct spelling)
  // This will match "Aadhaar No.", "Aadhaar Number", "Aadhaar", etc.
  const aadhaarKeywords = ['Aadhaar No', 'Aadhaar Number', 'Aadhaar', 'Aadhar No', 'Aadhar Number', 'Aadhar']; // Support both spellings for compatibility
  let aadhaarValue = null;
  for (const keyword of aadhaarKeywords) {
    aadhaarValue = findValueAfterKeyword(keyword, lines);
    if (aadhaarValue) break;
  }
  if (aadhaarValue) {
    // Extract 12 digits (with spaces/hyphens)
    const digitsMatch = aadhaarValue.match(/(\d{4}[\s-]?\d{4}[\s-]?\d{4})/);
    if (digitsMatch) {
      data.aadhar = digitsMatch[1].replace(/[\s-]/g, ''); // Use 'aadhar' to match database schema
    }
  } else {
    // Fallback: try to find 12-digit number anywhere in text (more lenient)
    const aadhaarMatch = text.match(/\b(\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/);
    if (aadhaarMatch) {
      data.aadhar = aadhaarMatch[1].replace(/[\s-]/g, ''); // Use 'aadhar' to match database schema
    }
  }
  
  // Extract PAN (10 alphanumeric characters, format: ABCDE1234F)
  // Try multiple PAN keyword patterns
  const panKeywords = ['PAN', 'Pan', 'Permanent Account Number'];
  let panValue = null;
  for (const keyword of panKeywords) {
    panValue = findValueAfterKeyword(keyword, lines);
    if (panValue) {
      const panMatch = panValue.match(/\b([A-Z]{5}[\s-]?\d{4}[\s-]?[A-Z]{1})\b/i);
      if (panMatch) {
        data.pan = panMatch[1].replace(/[\s-]/g, '').toUpperCase();
        break;
      }
    }
  }
  
  // Fallback: search for PAN pattern anywhere in text (more aggressive)
  if (!data.pan) {
    const panPatterns = [
      /PAN[:\s]+([A-Z]{5}[\s-]?\d{4}[\s-]?[A-Z]{1})\b/i,
      /\bPAN\b[^:]*[:\\s]+([A-Z]{5}[\s-]?\d{4}[\s-]?[A-Z]{1})\b/i,
      /\b([A-Z]{5}[\s-]?\d{4}[\s-]?[A-Z]{1})\b/i, // Any 10-char PAN pattern
    ];
    for (const pattern of panPatterns) {
      const panMatch = text.match(pattern);
      if (panMatch && panMatch[1]) {
        const pan = panMatch[1].replace(/[\s-]/g, '').toUpperCase();
        if (pan.length === 10) {
          data.pan = pan;
          break;
        }
      }
    }
  }
  
  // Extract Email (optional field) - try multiple email field patterns
  const emailKeywords = ['E-mail', 'Email', 'E-Mail'];
  let emailValue = null;
  for (const keyword of emailKeywords) {
    emailValue = findValueAfterKeyword(keyword, lines);
    if (emailValue) break;
  }
  if (emailValue) {
    const emailMatch = emailValue.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      data.email = emailMatch[1].toLowerCase().trim();
    }
  } else {
    // Fallback: find email anywhere in text
    const emailMatch = text.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
    if (emailMatch) {
      data.email = emailMatch[1].toLowerCase().trim();
    }
  }
  
  // Extract Mobile/Phone (optional field) - handle variations: Tele, Telephone, Phone, Mobile, Contact, Mob
  // Handle formats like "Tele: Mob:9967419858" or "Tele: 9967419858" or "Mobile: 9967419858"
  const mobileKeywords = ['Tele', 'Telephone', 'Tel', 'Mobile', 'Phone', 'Contact', 'Mob'];
  let mobileValue = null;
  for (const keyword of mobileKeywords) {
    mobileValue = findValueAfterKeyword(keyword, lines);
    if (mobileValue) {
      // Handle "Tele: Mob:9967419858" format - extract after "Mob:"
      if (mobileValue.includes('Mob:') || mobileValue.includes('Mob ')) {
        const mobMatch = mobileValue.match(/Mob[:\s]+(\d{10})/i);
        if (mobMatch) {
          data.phone = mobMatch[1];
          break;
        }
      }
      // Regular format: "Tele: 9967419858" or "Mobile: 9967419858"
      const mobileMatch = mobileValue.match(/(?:\+91[\s-]?)?(\d{10})\b/);
      if (mobileMatch) {
        data.phone = mobileMatch[1];
        break;
      }
    }
  }
  // Fallback: find 10-digit number anywhere in text
  if (!data.phone) {
    const mobileMatch = text.match(/(?:\+91[\s-]?)?(\d{10})\b/);
    if (mobileMatch) {
      data.phone = mobileMatch[1];
    }
  }
  
  // Extract Address - handle both "Address: value" and "Addressvalue" formats
  const addrIndex = lines.findIndex(line => {
    const trimmed = line.trim();
    return /^Address/i.test(trimmed);
  });
  
  if (addrIndex !== -1) {
    const addrLine = lines[addrIndex].trim();
    
    // Try Pattern 1: "Address: value" (with colon)
    let addrMatch = addrLine.match(/Address[^:]*:\s*(.+)/i);
    if (addrMatch && addrMatch[1]) {
      data.address = addrMatch[1].trim();
    } else {
      // Pattern 2: "Addressvalue" (without colon/space - direct concatenation)
      addrMatch = addrLine.match(/^Address(.+)$/i);
      if (addrMatch && addrMatch[1]) {
        let addressValue = addrMatch[1].trim();
        // Try to extract address until we hit another field keyword
        // Stop at common keywords that might appear on same line
        addressValue = addressValue.replace(/\s*(Status|City|State|Pincode|PIN|Email|E-mail|Mobile|Phone|Tele|PAN|Name|Aadhaar|Aadhar|Company|Form|Number|Filed).*$/i, '');
        data.address = addressValue.trim();
      }
    }
    
    // Clean up address - normalize spaces
    if (data.address) {
      data.address = data.address.replace(/\s+/g, ' ').trim();
    }
  }
  
  // Extract City - match any line that contains "City" at the start
  const cityValue = findValueAfterKeyword('City', lines);
  if (cityValue) {
    data.city = cityValue.replace(/\s+(State|Pincode|PIN|Email|Mobile|Phone|$)/i, '').trim();
  }
  
  // Extract State - match any line that contains "State" at the start
  const stateValue = findValueAfterKeyword('State', lines);
  if (stateValue) {
    data.state = stateValue.replace(/\s+(Pincode|PIN|Email|Mobile|Phone|$)/i, '').trim();
  }
  
  // Extract Pincode (6 digits)
  const pincodeValue = findValueAfterKeyword('(Pincode|Pin Code|PIN)', lines);
  if (pincodeValue) {
    const pincodeMatch = pincodeValue.match(/(\d{6})\b/);
    if (pincodeMatch) {
      data.pincode = pincodeMatch[1];
    }
  } else {
    const pincodeMatch = text.match(/(?:Pincode|Pin Code|PIN)[:\s]+\s*(\d{6})\b/i);
    if (pincodeMatch) {
      data.pincode = pincodeMatch[1];
    }
  }
  
  // Extract Company Name - match any line that contains "Company", "Organisation", etc. at the start
  const companyValue = findValueAfterKeyword('(Company|Organisation|Organization|Firm)', lines);
  if (companyValue) {
    data.companyName = companyValue.replace(/\s+(Address|Email|Mobile|Phone|PAN|$)/i, '').trim();
  }
  
  return data;
}

// @route   GET /api/clients
// @desc    Get all clients (Master only)
// @access  Private (Master)
router.get('/', auth, isMaster, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { clientId: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
      ];
    }

    const clients = await Client.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'email name');

    const total = await Client.countDocuments(query);

    res.json({
      success: true,
      data: clients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/clients/me
// @desc    Get current client's data (for client role)
// @access  Private (Client)
router.get('/me', auth, async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const client = await Client.findOne({ userId: req.user._id }).populate('userId', 'email name');
    
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    res.json({ success: true, data: client });
  } catch (error) {
    console.error('Get my client error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/clients/:id
// @desc    Get single client
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).populate('userId', 'email name');
    
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Clients can only view their own data
    if (req.user.role === 'client' && req.user._id.toString() !== client.userId?._id?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: client });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/clients
// @desc    Create a new client (Master only)
// @access  Private (Master)
router.post('/', auth, isMaster, async (req, res) => {
  try {
    const clientData = req.body;
    
    console.log('Received client data:', JSON.stringify(clientData, null, 2));

    // Validate required fields first
    if (!clientData.name || !clientData.name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    // Clean up clientData - remove any extra fields that shouldn't be saved (like _sourceFile, id, etc.)
    const cleanedData = {
      name: clientData.name ? clientData.name.trim() : '',
      pan: clientData.pan || '',
      phone: clientData.phone || '',
      companyName: clientData.companyName || '',
      address: clientData.address || '',
      city: clientData.city || '',
      state: clientData.state || '',
      pincode: clientData.pincode || '',
      aadhar: clientData.aadhar || '',
      gstin: clientData.gstin || '',
    };
    
    // Handle email separately - ONLY include if it has a value (for sparse unique index)
    // DO NOT include email field at all if empty - this is critical for sparse index
    if (clientData.email && clientData.email.trim() && clientData.email.trim().length > 0) {
      cleanedData.email = clientData.email.toLowerCase().trim();
    }
    // If email is empty, don't include it in cleanedData at all

    // Normalize PAN and phone
    if (cleanedData.pan) {
      cleanedData.pan = cleanedData.pan.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
    }
    if (cleanedData.phone) {
      cleanedData.phone = cleanedData.phone.replace(/[^\d]/g, '').slice(-10); // Last 10 digits
    }
    
    // Remove empty strings (except name and pan which might be needed)
    Object.keys(cleanedData).forEach(key => {
      if (cleanedData[key] === '' && key !== 'name' && key !== 'pan') {
        delete cleanedData[key];
      }
    });

    // Generate clientId if not provided
    if (!clientData.clientId) {
      const count = await Client.countDocuments();
      cleanedData.clientId = `CLI${String(count + 1).padStart(4, '0')}`;
    } else {
      cleanedData.clientId = clientData.clientId;
    }

    // Check if clientId already exists
    const existingClientId = await Client.findOne({ clientId: cleanedData.clientId });
    if (existingClientId) {
      // For bulk uploads, return success but indicate client was skipped
      // Check if this is from bulk upload (no userId field means it's a new client creation, not from bulk)
      // Actually, let's check if we should update or skip
      // For now, skip existing clients and return success
      return res.status(200).json({
        success: true,
        message: `Client ID ${cleanedData.clientId} already exists - skipped`,
        skipped: true,
        data: existingClientId,
      });
    }
    
    // If email is provided and not empty, check for email uniqueness
    if (cleanedData.email && cleanedData.email.trim()) {
      const existingEmail = await Client.findOne({ email: cleanedData.email });
      if (existingEmail) {
        // For bulk uploads, skip if email already exists (same client)
        // Return success but indicate client was skipped
        return res.status(200).json({
          success: true,
          message: `Email ${cleanedData.email} already exists - skipped`,
          skipped: true,
          data: existingEmail,
        });
      }
    }

    // Final cleanup: Remove email if it's empty to prevent sparse index issues
    // For sparse unique indexes, the field must be completely absent if empty
    if (!cleanedData.email || cleanedData.email.trim() === '') {
      delete cleanedData.email;
    }
    
    console.log('Creating client with cleaned data:', JSON.stringify(cleanedData, null, 2));
    
    const client = new Client(cleanedData);
    await client.save();
    
    console.log('✅ Client created successfully:', client._id);

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: client,
    });
  } catch (error) {
    console.error('========================================');
    console.error('CREATE CLIENT ERROR:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    console.error('========================================');
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      const errorMessage = errors.length > 0 ? errors.join(', ') : 'Validation error';
      return res.status(400).json({
        success: false,
        message: errorMessage,
        errors: errors,
      });
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      const duplicateValue = error.keyValue ? error.keyValue[field] : 'value';
      
      // Special handling for email null duplicates (sparse index issue)
      if (field === 'email' && (duplicateValue === null || duplicateValue === undefined || duplicateValue === 'null')) {
        console.error('Email sparse index conflict detected. This might indicate existing documents with null emails.');
        // Try to fix by ensuring email is completely omitted
        // For now, return a helpful error message
        return res.status(400).json({
          success: false,
          message: 'Email conflict detected. Please provide a unique email or contact admin to fix database index.',
          error: 'SPARSE_INDEX_CONFLICT'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: `${field} "${duplicateValue}" already exists`,
      });
    }
    
    // Return the actual error message for debugging
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error',
      error: error.toString()
    });
  }
});

// @route   POST /api/clients/bulk-upload
// @desc    Bulk upload clients from Excel/CSV/PDF/Word files (Master only)
// @access  Private (Master)
router.post('/bulk-upload', auth, isMaster, bulkUpload.array('files', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      // Fallback to single file for backward compatibility
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No files uploaded' });
      }
      req.files = [req.file];
    }

    const files = req.files;
    let clientsData = [];

    // Process each file
    // Files are stored temporarily in local temp folder, will be deleted after processing
    const tempFilePaths = [];
    
    for (const file of files) {
      const fileExt = path.extname(file.originalname).toLowerCase();
      const tempFilePath = file.path; // File is already in temp folder
      tempFilePaths.push(tempFilePath);
      
      try {
        console.log(`Processing file: ${file.originalname}`);
        console.log(`Temp file path: ${tempFilePath}`);

        // Parse Excel file
        if (fileExt === '.xlsx' || fileExt === '.xls') {
          const workbook = xlsx.readFile(tempFilePath);
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const excelData = xlsx.utils.sheet_to_json(worksheet);
          clientsData.push(...excelData);
          console.log(`✅ Extracted ${excelData.length} client(s) from Excel file`);
        }
        // Parse CSV file
        else if (fileExt === '.csv') {
          const results = [];
          await new Promise((resolve, reject) => {
            fs.createReadStream(tempFilePath)
              .pipe(csv())
              .on('data', (data) => results.push(data))
              .on('end', resolve)
              .on('error', reject);
          });
          clientsData.push(...results);
          console.log(`✅ Extracted ${results.length} client(s) from CSV file`);
        }
        // Parse PDF file
        else if (fileExt === '.pdf') {
          try {
            const dataBuffer = fs.readFileSync(tempFilePath);
            const pdfData = await pdfParse(dataBuffer);
            console.log(`\n=== Extracting from PDF: ${file.originalname} ===`);
            console.log(`PDF text preview (first 800 chars):`, pdfData.text.substring(0, 800));
            const extractedData = extractClientDataFromText(pdfData.text);
            console.log(`Extracted data:`, JSON.stringify(extractedData, null, 2));
            extractedData._sourceFile = file.originalname; // Track source file
            clientsData.push(extractedData); // Single document = single client data
            console.log(`✅ Extracted client data from PDF`);
          } catch (error) {
            console.error(`Error parsing PDF ${file.originalname}:`, error.message);
            // Continue processing other files instead of failing completely
          }
        }
        // Parse Word file (.docx)
        else if (fileExt === '.docx') {
          try {
            // Read file buffer and pass to mammoth
            const fileBuffer = fs.readFileSync(tempFilePath);
            const result = await mammoth.extractRawText({ buffer: fileBuffer });
            console.log(`\n=== Extracting from Word: ${file.originalname} ===`);
            console.log(`Word text preview (first 800 chars):`, result.value.substring(0, 800));
            const extractedData = extractClientDataFromText(result.value);
            console.log(`Extracted data:`, JSON.stringify(extractedData, null, 2));
            extractedData._sourceFile = file.originalname; // Track source file
            clientsData.push(extractedData); // Single document = single client data
            console.log(`✅ Extracted client data from Word document`);
          } catch (error) {
            console.error(`Error parsing Word document ${file.originalname}:`, error);
            console.error(`Error details:`, error.message);
            // Continue processing other files instead of failing completely
          }
        }
        // Parse RTF file (.rtf)
        else if (fileExt === '.rtf') {
          try {
            // RTF files are text-based, read as UTF-8
            const rtfContent = fs.readFileSync(tempFilePath, 'utf8');
            console.log(`\n=== Extracting from RTF: ${file.originalname} ===`);
            console.log(`RTF raw preview (first 1000 chars):`, rtfContent.substring(0, 1000));
            
            // Simple and effective RTF text extraction
            // Strategy: Remove RTF codes but preserve actual text content and structure
            let plainText = rtfContent;
            
            // Step 1: Convert RTF line breaks to actual newlines (preserve structure)
            plainText = plainText.replace(/\\par\s*/gi, '\n');
            plainText = plainText.replace(/\\line\s*/gi, '\n');
            
            // Step 2: Remove RTF control words (like \b, \f0, \fs24, etc.) but keep text
            // Be careful: don't remove text that might look like codes
            plainText = plainText.replace(/\\[a-z]+\d*\s*/gi, ' ');
            
            // Step 3: Remove RTF groups that contain only formatting codes
            // But preserve groups that might contain text
            plainText = plainText.replace(/\{[^}]*\\[a-z]+\d*[^}]*\}/gi, ' ');
            
            // Step 4: Remove escaped characters
            plainText = plainText.replace(/\\[{}'"]/g, ' ');
            
            // Step 5: Remove remaining braces (but text inside should already be extracted)
            plainText = plainText.replace(/[{}]/g, ' ');
            
            // Step 6: Remove hex-encoded characters (like \'XX)
            plainText = plainText.replace(/\\'[0-9a-f]{2}/gi, ' ');
            
            // Step 7: Clean up whitespace but preserve newlines
            plainText = plainText.replace(/[ \t]+/g, ' '); // Multiple spaces to single
            plainText = plainText.replace(/\n\s+/g, '\n'); // Remove leading spaces from lines
            plainText = plainText.replace(/\s+\n/g, '\n'); // Remove trailing spaces from lines
            plainText = plainText.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
            
            // Step 8: Remove any remaining RTF artifacts
            plainText = plainText.replace(/\\[^a-z\s]/gi, ' '); // Any remaining backslash codes
            
            // Final cleanup
            plainText = plainText.trim();
            
            console.log(`RTF extracted text preview (first 2000 chars):`, plainText.substring(0, 2000));
            console.log(`RTF extracted text length:`, plainText.length);
            console.log(`RTF extracted text (line count):`, plainText.split('\n').length);
            
            if (!plainText || plainText.length < 10) {
              console.error(`❌ Failed to extract meaningful text from RTF file`);
              throw new Error('Could not extract text from RTF file - file may be corrupted or in unsupported format');
            }
            
            const extractedData = extractClientDataFromText(plainText);
            console.log(`Extracted data:`, JSON.stringify(extractedData, null, 2));
            
            // Ensure we have at least some data - if empty, create object with at least the raw text
            if (!extractedData || Object.keys(extractedData).length === 0) {
              console.warn(`⚠️ No structured data extracted from RTF file. Raw text preview:`);
              console.warn(plainText.substring(0, 1000));
              // Still create an object so the form shows up (user can manually fill)
              extractedData.name = '';
              extractedData.pan = '';
              extractedData.phone = '';
              extractedData.address = '';
            }
            
            // Ensure extractedData is an object
            if (!extractedData || typeof extractedData !== 'object') {
              extractedData = {};
            }
            
            extractedData._sourceFile = file.originalname; // Track source file
            clientsData.push(extractedData); // Single document = single client data
            console.log(`✅ Extracted client data from RTF document`);
          } catch (error) {
            console.error(`Error parsing RTF file ${file.originalname}:`, error);
            console.error(`Error details:`, error.message);
            console.error(`Error stack:`, error.stack);
            // Continue processing other files instead of failing completely
          }
        }
        // .doc files are not supported (binary format, requires additional libraries)
        else if (fileExt === '.doc') {
          console.error(`File ${file.originalname}: .doc files are not supported. Please convert to .docx format.`);
          // Continue processing other files
        }
        
        console.log(`✅ File processed successfully: ${file.originalname}`);
      } catch (error) {
        console.error(`❌ Error processing file ${file.originalname}:`, error.message);
        console.error(`   Full error:`, error);
        // Continue with next file but log the error
      }
    }

    // Clean up all temporary files after processing
    console.log(`Cleaning up ${tempFilePaths.length} temporary files...`);
    tempFilePaths.forEach(tempFilePath => {
      deleteTempFile(tempFilePath);
    });
    console.log('✅ Temporary files cleaned up');

    if (clientsData.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid data extracted from files' });
    }

    // Check if we have any PDF/Word files (these need preview/edit before saving)
    const hasPdfWordFiles = clientsData.some(row => row._sourceFile !== undefined);
    const hasCsvExcelFiles = clientsData.some(row => !row._sourceFile);
    
    // Store original extracted data for response (before processing)
    const extractedDataForResponse = clientsData.map(row => {
      const preview = { ...row };
      delete preview._sourceFile;
      return preview;
    });

    // If we have PDF/Word files, just return extracted data without saving
    // Frontend will show preview/edit modal and save via regular POST /clients
    if (hasPdfWordFiles && !hasCsvExcelFiles) {
      return res.json({
        success: true,
        message: 'Data extracted successfully. Please review and save.',
        extractedData: extractedDataForResponse,
        requiresReview: true,
      });
    }

    // Process and validate data (for CSV/Excel files, auto-save as before)
    const clientsToInsert = [];
    const errors = [];
    const existingCount = await Client.countDocuments();

    for (let i = 0; i < clientsData.length; i++) {
      const row = clientsData[i];
      const rowNum = i + 2; // +2 because Excel rows start at 1 and header is row 1
      const sourceFile = row._sourceFile || 'CSV/Excel'; // Track source for PDF/Word files

      try {
        let clientData;
        
        // Check if this is from PDF/Word (has _sourceFile property) or CSV/Excel
        const isPdfWord = row._sourceFile !== undefined;
        
        // Skip PDF/Word files in auto-save mode (they should have been returned above)
        if (isPdfWord) {
          continue;
        }
        
        // For PDF/Word files, data is already extracted and in the row object
        if (isPdfWord) {
          clientData = {
            name: row.name || '',
            email: (row.email || '').toLowerCase().trim(),
            phone: (row.phone || '').replace(/[^\d]/g, '').slice(-10),
            companyName: row.companyName || '',
            address: row.address || '',
            city: row.city || '',
            state: row.state || '',
            pincode: row.pincode || '',
            pan: (row.pan || '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim(),
            aadhar: (row.aadhaar || row.aadhar || '').replace(/[^\d]/g, '').trim(), // Support both spellings during transition
            gstin: row.gstin || '',
          };
        } else {
          // Map CSV/Excel columns to our schema
          clientData = {
            name: row['Name'] || row['name'] || row['Client Name'] || '',
            email: (row['Email'] || row['email'] || row['E-mail'] || '').toLowerCase().trim(),
            phone: (row['Phone'] || row['phone'] || row['Mobile'] || row['mobile'] || row['Tele'] || row['Tel'] || '').replace(/[^\d]/g, '').slice(-10),
            companyName: row['Company Name'] || row['companyName'] || row['Company'] || row['company'] || '',
            address: row['Address'] || row['address'] || '',
            city: row['City'] || row['city'] || '',
            state: row['State'] || row['state'] || '',
            pincode: row['Pincode'] || row['pincode'] || row['Pin Code'] || row['PIN'] || '',
            pan: (row['PAN'] || row['pan'] || row['Pan'] || '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim(),
            aadhar: (row['Aadhaar'] || row['aadhaar'] || row['Aadhaar No'] || row['Aadhaar Number'] || row['Aadhar'] || row['aadhar'] || row['AADHAAR'] || '').replace(/[^\d]/g, '').trim(),
            gstin: row['GSTIN'] || row['gstin'] || row['GST'] || row['gst'] || '',
          };
        }

        // Remove _sourceFile from clientData before saving
        delete clientData._sourceFile;

        // Validate required fields
        if (isPdfWord) {
          // PAN is required for PDF/Word files
          const hasPan = clientData.pan && clientData.pan.length === 10;
          if (!hasPan) {
            errors.push(`File "${sourceFile}": PAN is required but not found`);
            continue;
          }
          
          // Fix phone if it's close to 10 digits
          if (clientData.phone) {
            const normalizedPhone = clientData.phone.replace(/[^\d]/g, '');
            if (normalizedPhone.length > 10) {
              clientData.phone = normalizedPhone.slice(-10);
            } else if (normalizedPhone.length < 10 && normalizedPhone.length > 0) {
              clientData.phone = normalizedPhone.padStart(10, '0');
            }
          }
        } else {
          // For CSV/Excel: Only Name is required (Email is optional)
          if (!clientData.name || !clientData.name.trim()) {
            errors.push(`Row ${rowNum}: Name is required`);
            continue;
          }
        }

        // Generate clientId if not provided in file
        if (isPdfWord) {
          clientData.clientId = `CLI${String(existingCount + clientsToInsert.length + 1).padStart(4, '0')}`;
        } else {
          clientData.clientId = row['Client ID'] || row['clientId'] || `CLI${String(existingCount + clientsToInsert.length + 1).padStart(4, '0')}`;
        }

        clientsToInsert.push(clientData);
      } catch (error) {
        errors.push(`Row ${rowNum}: ${error.message}`);
      }
    }

    // Insert clients (ignore duplicates)
    let successCount = 0;
    let duplicateCount = 0;

    for (const clientData of clientsToInsert) {
      try {
        // Check if client already exists
        const existing = await Client.findOne({
          $or: [{ clientId: clientData.clientId }, { email: clientData.email }],
        });

        if (existing) {
          duplicateCount++;
          continue;
        }

        const client = new Client(clientData);
        await client.save();
        successCount++;
      } catch (error) {
        if (error.code === 11000) {
          duplicateCount++;
        } else {
          errors.push(`Error inserting ${clientData.email}: ${error.message}`);
        }
      }
    }

    // Files are already deleted above after processing

    res.json({
      success: true,
      message: 'Bulk upload completed',
      summary: {
        total: clientsData.length,
        successful: successCount,
        duplicates: duplicateCount,
        errors: errors.length,
      },
      extractedData: extractedDataForResponse, // Include extracted data in response
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    // Delete uploaded files on error
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (err) {
          console.error(`Error deleting file ${file.path}:`, err);
        }
      });
    } else if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Bulk upload error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/clients/:id
// @desc    Update client (Master only)
// @access  Private (Master)
router.put('/:id', auth, isMaster, async (req, res) => {
  try {
    const clientData = req.body;
    
    console.log('Updating client:', req.params.id);
    console.log('Received client data:', JSON.stringify(clientData, null, 2));

    // Check if client exists
    const existingClient = await Client.findById(req.params.id);
    if (!existingClient) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Validate required fields
    if (!clientData.name || !clientData.name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    // Clean up clientData - remove any extra fields that shouldn't be saved
    const cleanedData = {
      name: clientData.name ? clientData.name.trim() : '',
      pan: clientData.pan || '',
      phone: clientData.phone || '',
      companyName: clientData.companyName || '',
      address: clientData.address || '',
      city: clientData.city || '',
      state: clientData.state || '',
      pincode: clientData.pincode || '',
      aadhar: clientData.aadhar || '',
      gstin: clientData.gstin || '',
    };
    
    // Handle email separately - ONLY include if it has a value (for sparse unique index)
    if (clientData.email && clientData.email.trim() && clientData.email.trim().length > 0) {
      cleanedData.email = clientData.email.toLowerCase().trim();
      
      // Check for email uniqueness (but allow same email for same client)
      const existingEmail = await Client.findOne({ email: cleanedData.email });
      if (existingEmail && existingEmail._id.toString() !== req.params.id) {
        return res.status(400).json({
          success: false,
          message: `Email ${cleanedData.email} already exists for another client`,
        });
      }
    } else {
      // If email is empty, don't include it (for sparse index)
      delete cleanedData.email;
    }

    // Normalize PAN and phone
    if (cleanedData.pan) {
      cleanedData.pan = cleanedData.pan.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
    }
    if (cleanedData.phone) {
      cleanedData.phone = cleanedData.phone.replace(/[^\d]/g, '').slice(-10); // Last 10 digits
    }
    
    // Remove empty strings (except name and pan which might be needed)
    Object.keys(cleanedData).forEach(key => {
      if (cleanedData[key] === '' && key !== 'name' && key !== 'pan') {
        delete cleanedData[key];
      }
    });

    // Don't update clientId - it should remain the same
    // Add updatedAt timestamp
    cleanedData.updatedAt = Date.now();

    console.log('Updating client with cleaned data:', JSON.stringify(cleanedData, null, 2));

    const client = await Client.findByIdAndUpdate(
      req.params.id,
      cleanedData,
      { new: true, runValidators: true }
    );

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    console.log('✅ Client updated successfully:', client._id);

    res.json({
      success: true,
      message: 'Client updated successfully',
      data: client,
    });
  } catch (error) {
    console.error('Update client error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: errors.join(', '),
        errors: errors,
      });
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
});

// @route   DELETE /api/clients/:id
// @desc    Delete client (Master only)
// @access  Private (Master)
router.delete('/:id', auth, isMaster, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // If client has a user account, delete it too
    if (client.userId) {
      const User = require('../models/User');
      await User.findByIdAndDelete(client.userId);
    }

    await Client.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Client deleted successfully',
    });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
