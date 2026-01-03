/**
 * Script to fix email sparse index issue
 * This removes null/empty emails from existing documents and ensures the index is sparse
 */

const mongoose = require('mongoose');
require('dotenv').config();

const clientSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
  },
  phone: { type: String, default: '' },
  companyName: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
  pan: { type: String, default: '' },
  aadhar: { type: String, default: '' },
  gstin: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { strict: false });

const Client = mongoose.model('Client', clientSchema);

async function fixEmailIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
    console.log('✅ Connected to MongoDB');

    // Step 1: Remove null/empty emails from all documents
    console.log('\n📝 Step 1: Removing null/empty emails from documents...');
    const result = await Client.updateMany(
      { $or: [{ email: null }, { email: '' }, { email: { $exists: false } }] },
      { $unset: { email: 1 } }
    );
    console.log(`✅ Updated ${result.modifiedCount} documents`);

    // Step 2: Drop existing email index
    console.log('\n📝 Step 2: Dropping existing email index...');
    try {
      await Client.collection.dropIndex('email_1');
      console.log('✅ Dropped existing email index');
    } catch (err) {
      if (err.codeName === 'IndexNotFound') {
        console.log('ℹ️  Email index does not exist, continuing...');
      } else {
        throw err;
      }
    }

    // Step 3: Create new sparse unique index
    console.log('\n📝 Step 3: Creating new sparse unique index...');
    await Client.collection.createIndex({ email: 1 }, { unique: true, sparse: true });
    console.log('✅ Created new sparse unique index on email');

    console.log('\n✅ Email index fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing email index:', error);
    process.exit(1);
  }
}

fixEmailIndex();

