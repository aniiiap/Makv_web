/**
 * Script to sync admin password from User model to TaskManagerUser model
 * This ensures the same credentials work for both Office Login and TaskFlow Login
 * 
 * Usage: node scripts/syncAdminPassword.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const TaskManagerUser = require('../models/TaskManagerUser');

const syncAdminPassword = async () => {
    try {
        // Connect to MongoDB
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ca-website';
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');

        const ADMIN_EMAIL = 'webmakv@gmail.com';

        // Get admin from User model (Office Login)
        const officeAdmin = await User.findOne({ email: ADMIN_EMAIL }).select('+password');

        if (!officeAdmin) {
            console.log('❌ Admin user not found in User model');
            process.exit(1);
        }

        console.log('✅ Found admin in User model');
        console.log('   Email:', officeAdmin.email);
        console.log('   Name:', officeAdmin.name);

        // Get or create admin in TaskManagerUser model
        let taskFlowAdmin = await TaskManagerUser.findOne({ email: ADMIN_EMAIL });

        if (taskFlowAdmin) {
            console.log('✅ Found admin in TaskManagerUser model');

            // Update with the same password hash from User model
            // We need to update directly without triggering the pre-save hook
            await TaskManagerUser.updateOne(
                { email: ADMIN_EMAIL },
                {
                    $set: {
                        password: officeAdmin.password, // Copy the hashed password directly
                        role: 'admin',
                        isActive: true,
                        emailVerified: true,
                        isFirstLogin: false,
                        name: officeAdmin.name,
                    }
                }
            );

            console.log('✅ Synced password from User model to TaskManagerUser model');
        } else {
            console.log('ℹ️  Creating new admin in TaskManagerUser model');

            // Create new admin with the same password hash
            await TaskManagerUser.create({
                email: ADMIN_EMAIL,
                name: officeAdmin.name,
                password: officeAdmin.password, // Use the same hashed password
                role: 'admin',
                provider: 'local',
                emailVerified: true,
                isFirstLogin: false,
                isActive: true,
            });

            console.log('✅ Created admin in TaskManagerUser model with synced password');
        }

        console.log('\n✅ Password sync complete!');
        console.log('You can now login to TaskFlow with the same credentials as Office Login');

    } catch (error) {
        console.error('❌ Error syncing admin password:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
};

syncAdminPassword();
