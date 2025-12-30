const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const Client = require('../models/Client');
const { auth, isMaster } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed.'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

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

    // Normalize PAN and phone if provided
    if (clientData.pan) {
      clientData.pan = clientData.pan.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
    }
    if (clientData.phone) {
      clientData.phone = clientData.phone.replace(/[^\d]/g, '').slice(-10); // Last 10 digits
    }

    // Generate clientId if not provided
    if (!clientData.clientId) {
      const count = await Client.countDocuments();
      clientData.clientId = `CLI${String(count + 1).padStart(4, '0')}`;
    }

    // Check if clientId or email already exists
    const existing = await Client.findOne({
      $or: [{ clientId: clientData.clientId }, { email: clientData.email }],
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Client ID or email already exists',
      });
    }

    const client = new Client(clientData);
    await client.save();

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: client,
    });
  } catch (error) {
    console.error('Create client error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Client ID or email already exists',
      });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/clients/bulk-upload
// @desc    Bulk upload clients from Excel/CSV file (Master only)
// @access  Private (Master)
router.post('/bulk-upload', auth, isMaster, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    let clientsData = [];

    // Parse Excel file
    if (fileExt === '.xlsx' || fileExt === '.xls') {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      clientsData = xlsx.utils.sheet_to_json(worksheet);
    }
    // Parse CSV file
    else if (fileExt === '.csv') {
      const results = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', resolve)
          .on('error', reject);
      });
      clientsData = results;
    }

    if (clientsData.length === 0) {
      fs.unlinkSync(filePath); // Delete uploaded file
      return res.status(400).json({ success: false, message: 'File is empty or invalid' });
    }

    // Process and validate data
    const clientsToInsert = [];
    const errors = [];
    const existingCount = await Client.countDocuments();

    for (let i = 0; i < clientsData.length; i++) {
      const row = clientsData[i];
      const rowNum = i + 2; // +2 because Excel rows start at 1 and header is row 1

      try {
        // Map CSV/Excel columns to our schema
        // Adjust column names based on your Excel/CSV structure
        const clientData = {
          name: row['Name'] || row['name'] || row['Client Name'] || '',
          email: (row['Email'] || row['email'] || '').toLowerCase().trim(),
          phone: (row['Phone'] || row['phone'] || row['Mobile'] || row['mobile'] || '').replace(/[^\d]/g, '').slice(-10), // Normalize phone to last 10 digits
          companyName: row['Company Name'] || row['companyName'] || row['Company'] || row['company'] || '',
          address: row['Address'] || row['address'] || '',
          city: row['City'] || row['city'] || '',
          state: row['State'] || row['state'] || '',
          pincode: row['Pincode'] || row['pincode'] || row['Pin Code'] || row['PIN'] || '',
          pan: (row['PAN'] || row['pan'] || row['Pan'] || '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim(), // Normalize PAN (uppercase, alphanumeric only)
          gstin: row['GSTIN'] || row['gstin'] || row['GST'] || row['gst'] || '',
        };

        // Validate required fields
        if (!clientData.name || !clientData.email) {
          errors.push(`Row ${rowNum}: Name and Email are required`);
          continue;
        }

        // Generate clientId if not provided in file
        clientData.clientId = row['Client ID'] || row['clientId'] || `CLI${String(existingCount + clientsToInsert.length + 1).padStart(4, '0')}`;

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

    // Delete uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'Bulk upload completed',
      summary: {
        total: clientsData.length,
        successful: successCount,
        duplicates: duplicateCount,
        errors: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    // Delete uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
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
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    res.json({
      success: true,
      message: 'Client updated successfully',
      data: client,
    });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
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
