// Quick script to check Cloudinary configuration
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

const hasConfig = process.env.CLOUDINARY_CLOUD_NAME && 
                  process.env.CLOUDINARY_API_KEY && 
                  process.env.CLOUDINARY_API_SECRET;

console.log('========================================');
console.log('Cloudinary Configuration Check');
console.log('========================================');

if (!hasConfig) {
  console.error('❌ Cloudinary is NOT configured!');
  console.error('');
  console.error('Missing environment variables:');
  if (!process.env.CLOUDINARY_CLOUD_NAME) console.error('  - CLOUDINARY_CLOUD_NAME');
  if (!process.env.CLOUDINARY_API_KEY) console.error('  - CLOUDINARY_API_KEY');
  if (!process.env.CLOUDINARY_API_SECRET) console.error('  - CLOUDINARY_API_SECRET');
  console.error('');
  console.error('Please add these to your backend/.env file');
  console.error('========================================');
  process.exit(1);
} else {
  console.log('✅ Cloudinary credentials found in environment');
  console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
  console.log('API Key:', process.env.CLOUDINARY_API_KEY ? '***' + process.env.CLOUDINARY_API_KEY.slice(-4) : 'Not set');
  console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? '***' + process.env.CLOUDINARY_API_SECRET.slice(-4) : 'Not set');
  console.log('========================================');
  process.exit(0);
}

