const mongoose = require('mongoose');

const billSchema = new mongoose.Schema(
  {
    invoiceNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // New fields for the top-right grid
    deliveryNote: String,
    modeOfPayment: String,
    referenceNo: String,
    otherReferences: String,
    buyersOrderNo: String,
    buyersOrderDate: Date,
    dispatchDocNo: String,
    deliveryNoteDate: Date,
    dispatchedThrough: String,
    destination: String,
    termsOfDelivery: String,

    buyerDetails: {
      name: { type: String, required: true },
      address: { type: String, required: true },
      gstin: { type: String },
      stateCode: { type: String },
    },
    items: [
      {
        description: { type: String, required: true },
        hsn: { type: String },
        amount: { type: Number, required: true },
        taxRate: { type: Number, default: 0 },
      },
    ],
    taxDetails: {
      cgst: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      igst: { type: Number, default: 0 }, // For future use if needed
      totalAmount: { type: Number, required: true },
      taxableAmount: { type: Number, required: true },
    },
    amountInWords: {
      type: String,
      required: true,
    },
    taxAmountInWords: {
      type: String,
      // required: true
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskManagerUser',
      required: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskManagerTeam',
    },
    pdfUrl: {
      type: String,
    },
    sentToEmail: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Bill', billSchema);
