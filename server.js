const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

/*
Current structure:
- Express server + Mongo connection + API router mounted at /api.
- React build (frontend/build) is served for non-API routes.

High-level refactor plan:
1) Keep existing server/bootstrap pattern unchanged.
2) Move task logic into Jira-style issue APIs in Routes/router.js.
3) Use the same API base (/api) so the React frontend can implement
    Kanban board CRUD, filters, drag/drop status updates, and edit modal.
*/

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const myrouter = require('./Routes/router');
app.use('/api', myrouter);

const frontendBuildPath = path.join(__dirname, 'frontend', 'build');

if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));

    app.get(/^(?!\/api).*/, (req, res) => {
        res.sendFile(path.join(frontendBuildPath, 'index.html'));
    });
}

const mongoUri = process.env.MONGODB_URI || "mongodb+srv://sathvikvasishta0_db_user:rn7pcs6337@mern.gtcn3bo.mongodb.net/myapp?appName=Mern";

if (!mongoUri) {
    console.error('MONGODB_URI is missing. Add it in your .env file.');
    process.exit(1);
}

mongoose.connect(mongoUri)
    .then(() => {
        console.log('MongoDB Atlas connected');
        console.log('Database:', mongoose.connection.name);
        console.log('Collections used: users, issues');
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    })
    .catch((error) => {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    });
