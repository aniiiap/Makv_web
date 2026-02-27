/**
 * Script to create or verify admin user for TaskFlow
 * Run this script once to set up the admin account
 * 
 * Usage: node scripts/createAdminUser.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const TaskManagerUser = require('../models/TaskManagerUser');

const ADMIN_EMAIL = 'webmakv@gmail.com';
const ADMIN_NAME = 'Master Admin';
// You should change this password after first login
const ADMIN_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123456';

const createAdminUser = async () => {
    try {
        // Connect to MongoDB
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ca-website';
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');

        // Check if admin user already exists
        const existingAdmin = await TaskManagerUser.findOne({ email: ADMIN_EMAIL });

        if (existingAdmin) {
            console.log('ℹ️  Admin user already exists');
            console.log('Email:', existingAdmin.email);
            console.log('Name:', existingAdmin.name);
            console.log('Role:', existingAdmin.role);

            // Update role to admin if not already
            if (existingAdmin.role !== 'admin') {
                existingAdmin.role = 'admin';
                await existingAdmin.save();
                console.log('✅ Updated existing user to admin role');
            }
        } else {
            // Create new admin user
            const adminUser = await TaskManagerUser.create({
                email: ADMIN_EMAIL,
                name: ADMIN_NAME,
                password: ADMIN_PASSWORD,
                role: 'admin',
                provider: 'local',
                emailVerified: true,
                isFirstLogin: false,
                isActive: true,
            });

            console.log('✅ Admin user created successfully!');
            console.log('Email:', adminUser.email);
            console.log('Name:', adminUser.name);
            console.log('Role:', adminUser.role);
            console.log('\n⚠️  IMPORTANT: Please change the default password after first login!');
            console.log('Default password:', ADMIN_PASSWORD);
        }

        console.log('\n✅ Admin setup complete!');
        console.log('You can now login at: /taskflow/login');

    } catch (error) {
        console.error('❌ Error creating admin user:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
};

createAdminUser();
