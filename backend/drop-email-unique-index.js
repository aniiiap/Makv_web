/**
 * Script to drop the unique email index from Client collection
 * This allows the same email to be used for multiple clients
 */

const mongoose = require('mongoose');
require('dotenv').config();

const clientSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: {
    type: String,
    required: false,
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

async function dropEmailUniqueIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
    console.log('✅ Connected to MongoDB');

    // Get all indexes
    console.log('\n📝 Checking existing indexes...');
    const indexes = await Client.collection.getIndexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));

    // Drop unique email index if it exists
    console.log('\n📝 Dropping unique email index...');
    try {
      // Try to drop the sparse unique index
      await Client.collection.dropIndex('email_1');
      console.log('✅ Dropped email_1 index');
    } catch (err) {
      if (err.codeName === 'IndexNotFound') {
        console.log('ℹ️  Email unique index does not exist, nothing to drop');
      } else {
        throw err;
      }
    }

    // Verify indexes after drop
    console.log('\n📝 Verifying indexes after drop...');
    const indexesAfter = await Client.collection.getIndexes();
    console.log('Indexes after drop:', JSON.stringify(indexesAfter, null, 2));

    console.log('\n✅ Email unique index removal completed successfully!');
    console.log('✅ You can now add the same email to multiple clients');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error dropping email unique index:', error);
    process.exit(1);
  }
}

dropEmailUniqueIndex();

