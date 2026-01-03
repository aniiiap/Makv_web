const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    default: '', // Legacy support for local files
  },
  cloudinaryUrl: {
    type: String,
    default: '', // Cloudinary URL for the file
  },
  cloudinaryPublicId: {
    type: String,
    default: '', // Cloudinary public ID for file management
  },
  fileType: {
    type: String,
    required: true, // e.g., 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  },
  fileSize: {
    type: Number,
    required: true,
  },
  documentType: {
    type: String,
    enum: ['payslip', 'acknowledgment', 'certificate', 'other'],
    default: 'other',
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  description: {
    type: String,
    default: '',
  },
});

module.exports = mongoose.model('Document', documentSchema);

