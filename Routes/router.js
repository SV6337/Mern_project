const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { User, USER_ROLES } = require('../Models/User');
const { Issue, ISSUE_PRIORITIES, ISSUE_STATUSES, ISSUE_ASSIGNMENT_SCOPES } = require('../Models/Issue');

/*
Current structure:
- This router currently exposes health + basic auth endpoints.

Refactor plan:
- Keep existing route/error handling style and add Jira-like JSON issue APIs.
- Add full CRUD for /issues with filter support and input validation.
- Keep auth endpoints intact so existing login UI remains usable if needed.
*/

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const roleRankMap = new Map(USER_ROLES.map((role, index) => [role, index]));

const getRoleRank = (role) => {
    if (!roleRankMap.has(role)) {
        return -1;
    }

    return roleRankMap.get(role);
};

const getAssignableUsersForRole = async (requesterRole) => {
    const requesterRank = getRoleRank(requesterRole || 'Intern');

    if (requesterRank <= 0) {
        return [];
    }

    const lowerRoles = USER_ROLES.filter((role) => getRoleRank(role) < requesterRank);
    return User.find({ role: { $in: lowerRoles } }, { _id: 1, name: 1, email: 1, role: 1 }).sort({ name: 1 });
};

const validateAssignmentByHierarchy = async ({ requesterId, assigneeName, assignmentScope }) => {
    if (assignmentScope !== 'one') {
        return null;
    }

    if (!assigneeName) {
        return 'Assignee is required when assignment is set to one';
    }

    if (!requesterId || !isValidObjectId(requesterId)) {
        return 'Valid requester is required for role-based assignment';
    }

    const requester = await User.findById(requesterId);

    if (!requester) {
        return 'Requester not found';
    }

    const assignee = await User.findOne({ name: new RegExp(`^${escapeRegex(assigneeName)}$`, 'i') });

    if (!assignee) {
        return 'Selected assignee user was not found';
    }

    const requesterRank = getRoleRank(requester.role || 'Intern');
    const assigneeRank = getRoleRank(assignee.role || 'Intern');

    if (requesterRank <= assigneeRank) {
        return `${requester.role || 'Intern'} can only assign work to lower roles`;
    }

    return null;
};

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

    if (Object.prototype.hasOwnProperty.call(payload, 'assignmentScope')) {
        const assignmentScope = String(payload.assignmentScope || '').trim().toLowerCase();
        if (!ISSUE_ASSIGNMENT_SCOPES.includes(assignmentScope)) {
            errors.push(`Assignment scope must be one of: ${ISSUE_ASSIGNMENT_SCOPES.join(', ')}`);
        } else {
            normalizedPayload.assignmentScope = assignmentScope;
        }
    }

    const effectiveAssignmentScope = normalizedPayload.assignmentScope || String(payload.assignmentScope || '').trim().toLowerCase();
    const effectiveAssignee = Object.prototype.hasOwnProperty.call(normalizedPayload, 'assignee')
        ? normalizedPayload.assignee
        : String(payload.assignee || '').trim();

    if (effectiveAssignmentScope === 'one' && !effectiveAssignee) {
        errors.push('Assignee is required when assignment is set to one');
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'labels')) {
        normalizedPayload.labels = normalizeLabels(payload.labels);
    }

    return { errors, normalizedPayload };
};

router.get('/health', (req, res) => {
    return res.json({ ok: true, message: 'API is running', statuses: ISSUE_STATUSES, priorities: ISSUE_PRIORITIES, assignmentScopes: ISSUE_ASSIGNMENT_SCOPES, roles: USER_ROLES });
});

router.get('/issues', async (req, res) => {
    const { status, priority, search, viewer, viewerId } = req.query;
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

    if (viewer && String(viewer).trim()) {
        const viewerRegex = new RegExp(`^${escapeRegex(String(viewer).trim())}$`, 'i');
        const visibilityCondition = {
            $or: [
                { assignmentScope: 'all' },
                { assignmentScope: { $exists: false } },
                { assignmentScope: 'one', assignee: viewerRegex }
            ]
        };

        if (!query.$and) {
            query.$and = [];
        }

        query.$and.push(visibilityCondition);
    }

    if (viewerId && isValidObjectId(viewerId)) {
        const viewerUser = await User.findById(viewerId, { name: 1 });
        if (viewerUser?.name) {
            const viewerRegex = new RegExp(`^${escapeRegex(String(viewerUser.name).trim())}$`, 'i');
            const visibilityCondition = {
                $or: [
                    { assignmentScope: 'all' },
                    { assignmentScope: { $exists: false } },
                    { assignmentScope: 'one', assignee: viewerRegex }
                ]
            };

            if (!query.$and) {
                query.$and = [];
            }

            query.$and.push(visibilityCondition);
        }
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
        assignmentScope: req.body.assignmentScope || 'all',
        assignee: req.body.assignee || '',
        labels: req.body.labels || []
    };

    const { errors, normalizedPayload } = validateIssuePayload(payload, false);

    if (errors.length > 0) {
        return res.status(400).json({ ok: false, message: errors.join('. ') });
    }

    try {
        const hierarchyError = await validateAssignmentByHierarchy({
            requesterId: req.body.requesterId,
            assigneeName: normalizedPayload.assignee,
            assignmentScope: normalizedPayload.assignmentScope
        });

        if (hierarchyError) {
            return res.status(403).json({ ok: false, message: hierarchyError });
        }

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
        const existingIssue = await Issue.findById(id);

        if (!existingIssue) {
            return res.status(404).json({ ok: false, message: 'Issue not found' });
        }

        const effectiveScope = normalizedPayload.assignmentScope || existingIssue.assignmentScope || 'all';
        const effectiveAssignee = Object.prototype.hasOwnProperty.call(normalizedPayload, 'assignee')
            ? normalizedPayload.assignee
            : existingIssue.assignee;

        const hierarchyError = await validateAssignmentByHierarchy({
            requesterId: req.body.requesterId,
            assigneeName: effectiveAssignee,
            assignmentScope: effectiveScope
        });

        if (hierarchyError) {
            return res.status(403).json({ ok: false, message: hierarchyError });
        }

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

router.get('/users', async (req, res) => {
    const requesterId = String(req.query.requesterId || '').trim();

    try {
        if (!requesterId || !isValidObjectId(requesterId)) {
            return res.status(400).json({ ok: false, message: 'Valid requesterId is required' });
        }

        const requester = await User.findById(requesterId, { role: 1 });

        if (!requester) {
            return res.status(404).json({ ok: false, message: 'Requester not found' });
        }

        const users = await getAssignableUsersForRole(requester.role);
        return res.status(200).json({ ok: true, users });
    } catch (error) {
        return res.status(500).json({ ok: false, message: 'Failed to fetch users' });
    }
});

router.post('/auth/signup', async (req, res) => {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';
    const role = String(req.body.role || '').trim();

    if (!name || !email || !password || !role) {
        return res.status(400).json({ ok: false, message: 'Name, email, password and role are required' });
    }

    if (!USER_ROLES.includes(role)) {
        return res.status(400).json({ ok: false, message: `Role must be one of: ${USER_ROLES.join(', ')}` });
    }

    try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({ ok: false, message: 'Email already exists' });
        }

        const createdUser = await User.create({ name, email, password, role });

        return res.status(201).json({
            ok: true,
            message: 'Signup successful. Please login.',
            user: {
                id: createdUser._id,
                name: createdUser.name,
                email: createdUser.email,
                role: createdUser.role
            }
        });
    } catch (error) {
        return res.status(500).json({ ok: false, message: 'Signup failed. Try again.' });
    }
});

router.post('/auth/forgot-password', async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const newPassword = req.body.newPassword || '';

    if (!email || !newPassword) {
        return res.status(400).json({ ok: false, message: 'Email and new password are required' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ ok: false, message: 'New password must be at least 6 characters' });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ ok: false, message: 'User not found for this email' });
        }

        user.password = newPassword;
        await user.save();

        return res.status(200).json({ ok: true, message: 'Password updated successfully. Please login.' });
    } catch (error) {
        return res.status(500).json({ ok: false, message: 'Could not reset password. Try again.' });
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
                    email: user.email,
                    role: user.role || 'Intern'
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

router.post('/auth/delete-account', async (req, res) => {
    const userId = String(req.body.userId || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!userId || !isValidObjectId(userId) || !email) {
        return res.status(400).json({ ok: false, message: 'Valid userId and email are required' });
    }

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ ok: false, message: 'User not found' });
        }

        if ((user.email || '').toLowerCase() !== email) {
            return res.status(403).json({ ok: false, message: 'Email does not match account' });
        }

        await Issue.updateMany(
            { assignee: new RegExp(`^${escapeRegex(user.name)}$`, 'i') },
            { $set: { assignee: '', assignmentScope: 'all' } }
        );

        await User.findByIdAndDelete(userId);

        return res.status(200).json({ ok: true, message: 'Account deleted successfully' });
    } catch (error) {
        return res.status(500).json({ ok: false, message: 'Failed to delete account' });
    }
});

module.exports = router;