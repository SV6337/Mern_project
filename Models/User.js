const mongoose = require('mongoose');

const USER_ROLES = ['Intern', 'Associate', 'Engineer', 'Lead', 'Manager', 'Admin'];

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true
        },
        role: {
            type: String,
            enum: USER_ROLES,
            default: 'Intern',
            required: true
        }
    },
    {
        timestamps: true,
        collection: 'users'
    }
);

module.exports = {
    User: mongoose.model('User', userSchema),
    USER_ROLES
};
