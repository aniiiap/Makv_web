const mongoose = require('mongoose');
const dotenv = require('dotenv');
const TaskManagerTeam = require('./models/taskManager.Team');

// Load environment variables
dotenv.config({ path: './.env' });

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ca-website', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(async () => {
    console.log('Connected to DB');
    
    // For all existing teams, set clientsEnabled to true and all members clientsAccess to true
    const teams = await TaskManagerTeam.find();
    let updatedCount = 0;

    for (const team of teams) {
        team.clientsEnabled = true;
        for (const member of team.members) {
            member.clientsAccess = true;
        }
        await team.save();
        updatedCount++;
    }

    console.log(`Updated ${updatedCount} teams to have clientsAccess enabled by default`);

    mongoose.connection.close();
    console.log('Migration complete');
}).catch(err => {
    console.error('DB Connection error:', err);
});
