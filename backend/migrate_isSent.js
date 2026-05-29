const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Bill = require('./models/Bill');
const Document = require('./models/Document');

// Load environment variables
dotenv.config({ path: './.env' });

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ca-website', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(async () => {
    console.log('Connected to DB');
    
    // For all bills created before now, update isSent to true
    // Because any bill that currently exists was generated under the old system where it was sent immediately.
    const billsResult = await Bill.updateMany(
        { isSent: { $ne: true } }, 
        { $set: { isSent: true } }
    );
    console.log(`Updated ${billsResult.modifiedCount} bills to isSent: true`);

    const payslipsResult = await Document.updateMany(
        { documentType: 'payslip', isSent: { $ne: true } },
        { $set: { isSent: true } }
    );
    console.log(`Updated ${payslipsResult.modifiedCount} payslips to isSent: true`);

    mongoose.connection.close();
    console.log('Migration complete');
}).catch(err => {
    console.error('DB Connection error:', err);
});
