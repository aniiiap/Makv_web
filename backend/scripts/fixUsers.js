require('dotenv').config();
const mongoose = require('mongoose');
const TaskManagerUser = require('../models/TaskManagerUser');

const fixUsers = async () => {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ca-website';
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Fix all users to have isActive: true
        const result1 = await TaskManagerUser.updateMany(
            {},
            { $set: { isActive: true } }
        );
        console.log(`✅ Updated ${result1.modifiedCount} users to be active`);

        // Fix Demo User to have isFirstLogin: true
        const result2 = await TaskManagerUser.updateOne(
            { email: 'anisha@docfyleadvisory.com' },
            { $set: { isFirstLogin: true } }
        );
        console.log(`✅ Updated Demo User isFirstLogin: ${result2.modifiedCount > 0 ? 'true' : 'already set'}`);

        // Show current state
        const users = await TaskManagerUser.find({});
        console.log(`\nCurrent users:`);
        users.forEach(u => {
            console.log(`  ${u.name} - Active: ${u.isActive}, FirstLogin: ${u.isFirstLogin}`);
        });

        const activeCount = await TaskManagerUser.countDocuments({ isActive: true });
        console.log(`\n✅ Total active users: ${activeCount}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

fixUsers();
