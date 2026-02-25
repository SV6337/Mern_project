const mongoose = require('mongoose');

const ISSUE_STATUSES = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];
const ISSUE_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const issueSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            trim: true,
            default: ''
        },
        status: {
            type: String,
            enum: ISSUE_STATUSES,
            default: 'Backlog'
        },
        priority: {
            type: String,
            enum: ISSUE_PRIORITIES,
            default: 'Medium'
        },
        assignee: {
            type: String,
            trim: true,
            default: ''
        },
        labels: {
            type: [String],
            default: []
        }
    },
    {
        timestamps: true,
        collection: 'issues'
    }
);

module.exports = {
    Issue: mongoose.model('Issue', issueSchema),
    ISSUE_STATUSES,
    ISSUE_PRIORITIES
};
