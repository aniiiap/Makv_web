require('dotenv').config();
const mongoose = require('mongoose');
const TaskManagerUser = require('../models/TaskManagerUser');

const checkUsers = async () => {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ca-website';
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const allUsers = await TaskManagerUser.find({});
        console.log(`Total users in TaskManagerUser collection: ${allUsers.length}\n`);

        allUsers.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Active: ${user.isActive}`);
            console.log(`   First Login: ${user.isFirstLogin}`);
            console.log(`   Provider: ${user.provider}`);
            console.log('');
        });

        const activeUsers = await TaskManagerUser.countDocuments({ isActive: true });
        console.log(`Active users: ${activeUsers}`);

        const admins = await TaskManagerUser.countDocuments({ role: 'admin', isActive: true });
        console.log(`Active admins: ${admins}`);

        const regularUsers = await TaskManagerUser.countDocuments({ role: 'user', isActive: true });
        console.log(`Active regular users: ${regularUsers}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

checkUsers();
