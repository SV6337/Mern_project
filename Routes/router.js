const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../Models/User');
const { Issue, ISSUE_PRIORITIES, ISSUE_STATUSES } = require('../Models/Issue');

/*
Current structure:
- This router currently exposes health + basic auth endpoints.

Refactor plan:
- Keep existing route/error handling style and add Jira-like JSON issue APIs.
- Add full CRUD for /issues with filter support and input validation.
- Keep auth endpoints intact so existing login UI remains usable if needed.
*/

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const normalizeLabels = (labelsInput) => {
    if (!labelsInput) {
        return [];
    }

    if (Array.isArray(labelsInput)) {
        return labelsInput
            .map((label) => String(label).trim())
            .filter(Boolean);
    }

    if (typeof labelsInput === 'string') {
        return labelsInput
            .split(',')
            .map((label) => label.trim())
            .filter(Boolean);
    }

    return [];
};

const validateIssuePayload = (payload, isUpdate = false) => {
    const errors = [];
    const normalizedPayload = {};

    if (!isUpdate || Object.prototype.hasOwnProperty.call(payload, 'title')) {
        const title = String(payload.title || '').trim();
        if (!title) {
            errors.push('Title is required');
        } else {
            normalizedPayload.title = title;
        }
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'description')) {
        normalizedPayload.description = String(payload.description || '').trim();
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
        const status = String(payload.status || '').trim();
        if (!ISSUE_STATUSES.includes(status)) {
            errors.push(`Status must be one of: ${ISSUE_STATUSES.join(', ')}`);
        } else {
            normalizedPayload.status = status;
        }
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'priority')) {
        const priority = String(payload.priority || '').trim();
        if (!ISSUE_PRIORITIES.includes(priority)) {
            errors.push(`Priority must be one of: ${ISSUE_PRIORITIES.join(', ')}`);
        } else {
            normalizedPayload.priority = priority;
        }
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'assignee')) {
        normalizedPayload.assignee = String(payload.assignee || '').trim();
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'labels')) {
        normalizedPayload.labels = normalizeLabels(payload.labels);
    }

    return { errors, normalizedPayload };
};

router.get('/health', (req, res) => {
    return res.json({ ok: true, message: 'API is running', statuses: ISSUE_STATUSES, priorities: ISSUE_PRIORITIES });
});

router.get('/issues', async (req, res) => {
    const { status, priority, search } = req.query;
    const query = {};

    if (status && status !== 'All') {
        if (!ISSUE_STATUSES.includes(status)) {
            return res.status(400).json({ ok: false, message: `Invalid status filter. Allowed: ${ISSUE_STATUSES.join(', ')}` });
        }
        query.status = status;
    }

    if (priority && priority !== 'All') {
        if (!ISSUE_PRIORITIES.includes(priority)) {
            return res.status(400).json({ ok: false, message: `Invalid priority filter. Allowed: ${ISSUE_PRIORITIES.join(', ')}` });
        }
        query.priority = priority;
    }

    if (search) {
        const searchRegex = new RegExp(String(search).trim(), 'i');
        query.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    try {
        const issues = await Issue.find(query).sort({ updatedAt: -1 });
        return res.status(200).json({ ok: true, count: issues.length, issues });
    } catch (error) {
        return res.status(500).json({ ok: false, message: 'Failed to fetch issues' });
    }
});

router.get('/issues/:id', async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        return res.status(400).json({ ok: false, message: 'Invalid issue id' });
    }

    try {
        const issue = await Issue.findById(id);

        if (!issue) {
            return res.status(404).json({ ok: false, message: 'Issue not found' });
        }

        return res.status(200).json({ ok: true, issue });
    } catch (error) {
        return res.status(500).json({ ok: false, message: 'Failed to fetch issue' });
    }
});

router.post('/issues', async (req, res) => {
    const payload = {
        ...req.body,
        status: req.body.status || 'Backlog',
        priority: req.body.priority || 'Medium',
        assignee: req.body.assignee || '',
        labels: req.body.labels || []
    };

    const { errors, normalizedPayload } = validateIssuePayload(payload, false);

    if (errors.length > 0) {
        return res.status(400).json({ ok: false, message: errors.join('. ') });
    }

    try {
        const createdIssue = await Issue.create(normalizedPayload);
        return res.status(201).json({ ok: true, message: 'Issue created', issue: createdIssue });
    } catch (error) {
        return res.status(500).json({ ok: false, message: 'Failed to create issue' });
    }
});

router.put('/issues/:id', async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        return res.status(400).json({ ok: false, message: 'Invalid issue id' });
    }

    const { errors, normalizedPayload } = validateIssuePayload(req.body, true);

    if (errors.length > 0) {
        return res.status(400).json({ ok: false, message: errors.join('. ') });
    }

    if (Object.keys(normalizedPayload).length === 0) {
        return res.status(400).json({ ok: false, message: 'No valid fields provided for update' });
    }

    try {
        const updatedIssue = await Issue.findByIdAndUpdate(
            id,
            normalizedPayload,
            { new: true, runValidators: true }
        );

        if (!updatedIssue) {
            return res.status(404).json({ ok: false, message: 'Issue not found' });
        }

        return res.status(200).json({ ok: true, message: 'Issue updated', issue: updatedIssue });
    } catch (error) {
        return res.status(500).json({ ok: false, message: 'Failed to update issue' });
    }
});

router.delete('/issues/:id', async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        return res.status(400).json({ ok: false, message: 'Invalid issue id' });
    }

    try {
        const deletedIssue = await Issue.findByIdAndDelete(id);

        if (!deletedIssue) {
            return res.status(404).json({ ok: false, message: 'Issue not found' });
        }

        return res.status(200).json({ ok: true, message: 'Issue deleted' });
    } catch (error) {
        return res.status(500).json({ ok: false, message: 'Failed to delete issue' });
    }
});

router.post('/auth/signup', async (req, res) => {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!name || !email || !password) {
        return res.status(400).json({ ok: false, message: 'Name, email and password are required' });
    }

    try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({ ok: false, message: 'Email already exists' });
        }

        const createdUser = await User.create({ name, email, password });

        return res.status(201).json({
            ok: true,
            message: 'Signup successful. Please login.',
            user: {
                id: createdUser._id,
                name: createdUser.name,
                email: createdUser.email
            }
        });
    } catch (error) {
        return res.status(500).json({ ok: false, message: 'Signup failed. Try again.' });
    }
});

router.post('/auth/login', async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!email || !password) {
        return res.status(400).json({ ok: false, message: 'Email and password are required' });
    }

    try {
        const user = await User.findOne({ email, password });

        if (user) {
            return res.status(200).json({
                ok: true,
                message: `Login successful. Welcome ${user.name}`,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email
                }
            });
        }

        const emailOnlyMatch = await User.findOne({ email });

        if (emailOnlyMatch) {
            return res.status(401).json({ ok: false, message: 'Invalid password' });
        }

        return res.status(404).json({ ok: false, message: 'User not found. Please signup first.' });
    } catch (error) {
        return res.status(500).json({ ok: false, message: 'Login failed. Try again.' });
    }
});

router.post('/auth/logout', (req, res) => {
    return res.status(200).json({ ok: true, message: 'Logged out' });
});

module.exports = router;