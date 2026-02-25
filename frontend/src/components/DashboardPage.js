import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

/*
Current structure:
- App uses this component as the main Jira-style board screen.

Refactor in this file:
- Keep all board CRUD/filter/drag-drop logic in DashboardPage.js as requested.
*/

const STATUS_COLUMNS = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

const EMPTY_FORM = {
  title: '',
  description: '',
  status: 'Backlog',
  priority: 'Medium',
  assignee: '',
  labelsInput: ''
};

const priorityClassName = {
  Low: 'bg-success-subtle text-success-emphasis',
  Medium: 'bg-info-subtle text-info-emphasis',
  High: 'bg-warning-subtle text-warning-emphasis',
  Critical: 'bg-danger-subtle text-danger-emphasis'
};

function IssueModal({
  isOpen,
  form,
  setForm,
  onClose,
  onSave,
  onDelete,
  isSaving,
  isEditMode,
  feedback
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="jira-modal-backdrop" onClick={onClose}>
      <div className="jira-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="mb-0">{isEditMode ? 'Issue Details' : 'Create Issue'}</h4>
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>✕</button>
        </div>

        {feedback && (
          <div className={`alert ${feedback.type === 'error' ? 'alert-danger' : 'alert-success'}`}>
            {feedback.message}
          </div>
        )}

        <div className="mb-3">
          <label className="form-label">Title</label>
          <input
            className="form-control"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Issue title"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Description</label>
          <textarea
            rows={4}
            className="form-control"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Describe the issue"
          />
        </div>

        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
            >
              {STATUS_COLUMNS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="col-md-6">
            <label className="form-label">Priority</label>
            <select
              className="form-select"
              value={form.priority}
              onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
            >
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Assignee</label>
          <input
            className="form-control"
            value={form.assignee}
            onChange={(event) => setForm((prev) => ({ ...prev, assignee: event.target.value }))}
            placeholder="Name"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Labels (comma separated)</label>
          <input
            className="form-control"
            value={form.labelsInput}
            onChange={(event) => setForm((prev) => ({ ...prev, labelsInput: event.target.value }))}
            placeholder="bug, backend, urgent"
          />
        </div>

        <div className="d-flex justify-content-between gap-2 mt-4">
          <div>
            {isEditMode && (
              <button className="btn btn-outline-danger" onClick={onDelete} disabled={isSaving}>
                Delete
              </button>
            )}
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
            <button className="btn btn-primary" onClick={onSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardPage({ user, onLogout }) {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [dbStatus, setDbStatus] = useState('checking');
  const [draggingIssueId, setDraggingIssueId] = useState('');

  const [filters, setFilters] = useState({
    search: '',
    status: 'All',
    priority: 'All'
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIssueId, setEditingIssueId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [modalFeedback, setModalFeedback] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadIssues = async (activeFilters = filters) => {
    setLoading(true);
    setErrorMessage('');

    try {
      const params = {};

      if (activeFilters.search.trim()) {
        params.search = activeFilters.search.trim();
      }
      if (activeFilters.status !== 'All') {
        params.status = activeFilters.status;
      }
      if (activeFilters.priority !== 'All') {
        params.priority = activeFilters.priority;
      }

      const response = await axios.get('/api/issues', { params });
      setIssues(response.data.issues || []);
      setDbStatus('connected');
    } catch (error) {
      const message = error.response?.data?.message
        || 'Could not load issues. Start backend server on port 5000.';
      setErrorMessage(message);
      setDbStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkApi = async () => {
      try {
        await axios.get('/api/health');
        setDbStatus('connected');
      } catch (error) {
        setDbStatus('disconnected');
      }
    };

    checkApi();
  }, []);

  useEffect(() => {
    loadIssues(filters);
  }, [filters.search, filters.status, filters.priority]);

  const grouped = useMemo(() => {
    const bucket = Object.fromEntries(STATUS_COLUMNS.map((status) => [status, []]));

    for (const issue of issues) {
      if (!bucket[issue.status]) {
        bucket[issue.status] = [];
      }
      bucket[issue.status].push(issue);
    }

    return bucket;
  }, [issues]);

  const openCreateModal = () => {
    setEditingIssueId('');
    setModalFeedback(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (issue) => {
    setEditingIssueId(issue._id);
    setModalFeedback(null);
    setForm({
      title: issue.title || '',
      description: issue.description || '',
      status: issue.status || 'Backlog',
      priority: issue.priority || 'Medium',
      assignee: issue.assignee || '',
      labelsInput: Array.isArray(issue.labels) ? issue.labels.join(', ') : ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingIssueId('');
    setModalFeedback(null);
    setForm(EMPTY_FORM);
  };

  const buildPayloadFromForm = () => ({
    title: form.title,
    description: form.description,
    status: form.status,
    priority: form.priority,
    assignee: form.assignee,
    labels: form.labelsInput
      .split(',')
      .map((label) => label.trim())
      .filter(Boolean)
  });

  const handleSaveIssue = async () => {
    setIsSaving(true);
    setModalFeedback(null);

    try {
      const payload = buildPayloadFromForm();

      if (editingIssueId) {
        await axios.put(`/api/issues/${editingIssueId}`, payload);
        setModalFeedback({ type: 'success', message: 'Issue updated successfully' });
      } else {
        await axios.post('/api/issues', payload);
        setModalFeedback({ type: 'success', message: 'Issue created successfully' });
      }

      await loadIssues(filters);
      setTimeout(() => closeModal(), 300);
    } catch (error) {
      setModalFeedback({
        type: 'error',
        message: error.response?.data?.message || 'Failed to save issue. Check backend/database connection.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteIssue = async () => {
    if (!editingIssueId) {
      return;
    }

    setIsSaving(true);
    setModalFeedback(null);

    try {
      await axios.delete(`/api/issues/${editingIssueId}`);
      await loadIssues(filters);
      closeModal();
    } catch (error) {
      setModalFeedback({
        type: 'error',
        message: error.response?.data?.message || 'Failed to delete issue. Check backend/database connection.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateIssueStatus = async (issueId, nextStatus) => {
    try {
      await axios.put(`/api/issues/${issueId}`, { status: nextStatus });
      await loadIssues(filters);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Failed to update issue status');
    }
  };

  const handleDrop = async (status) => {
    if (!draggingIssueId) {
      return;
    }

    setDraggingIssueId('');
    await updateIssueStatus(draggingIssueId, status);
  };

  const handleLogoutClick = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
    }

    if (onLogout) {
      onLogout();
    }
    navigate('/');
  };

  return (
    <div className="jira-page container-fluid py-4 px-4">
      <nav className="navbar navbar-dark bg-dark rounded mb-3 px-3">
        <span className="navbar-brand mb-0 h5">Dashboard</span>
        <div className="d-flex align-items-center gap-3 text-white">
          <small>Welcome {user?.name || 'User'}</small>
          <button onClick={handleLogoutClick} className="btn btn-outline-light btn-sm">Log out</button>
        </div>
      </nav>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h1 className="h3 mb-0">Personal Jira Board</h1>
          <small className="text-muted">Track issues with statuses, priorities, and filters</small>
          <div className="mt-1">
            <span className={`badge ${dbStatus === 'connected' ? 'text-bg-success' : dbStatus === 'disconnected' ? 'text-bg-danger' : 'text-bg-secondary'}`}>
              {dbStatus === 'connected' ? 'Database Connected' : dbStatus === 'disconnected' ? 'Database Disconnected' : 'Checking Database...'}
            </span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>Create Issue</button>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body row g-2 align-items-center">
          <div className="col-md-6">
            <input
              className="form-control"
              placeholder="Search title/description"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            />
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="All">All Statuses</option>
              {STATUS_COLUMNS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              value={filters.priority}
              onChange={(event) => setFilters((prev) => ({ ...prev, priority: event.target.value }))}
            >
              <option value="All">All Priorities</option>
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}

      <div className="jira-board">
        {STATUS_COLUMNS.map((status) => (
          <div
            key={status}
            className="jira-column"
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleDrop(status)}
          >
            <div className="jira-column-header">
              <span>{status}</span>
              <span className="badge text-bg-secondary rounded-pill">{(grouped[status] || []).length}</span>
            </div>

            <div className="jira-column-body">
              {(grouped[status] || []).map((issue) => (
                <div
                  key={issue._id}
                  className="jira-card"
                  draggable
                  onDragStart={() => setDraggingIssueId(issue._id)}
                  onClick={() => openEditModal(issue)}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2 gap-2">
                    <h6 className="mb-0 jira-card-title">{issue.title}</h6>
                    <span className={`badge ${priorityClassName[issue.priority] || 'text-bg-light'}`}>
                      {issue.priority}
                    </span>
                  </div>

                  {issue.description && (
                    <p className="text-muted small mb-2 jira-card-description">
                      {issue.description.split('\n')[0]}
                    </p>
                  )}

                  <div className="d-flex justify-content-between align-items-center small text-muted">
                    <span>{issue.assignee || 'Unassigned'}</span>
                    <span>{Array.isArray(issue.labels) ? issue.labels.slice(0, 2).join(', ') : ''}</span>
                  </div>
                </div>
              ))}

              {!loading && (grouped[status] || []).length === 0 && (
                <div className="jira-empty">Drop issues here</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <IssueModal
        isOpen={isModalOpen}
        form={form}
        setForm={setForm}
        onClose={closeModal}
        onSave={handleSaveIssue}
        onDelete={handleDeleteIssue}
        isSaving={isSaving}
        isEditMode={Boolean(editingIssueId)}
        feedback={modalFeedback}
      />
    </div>
  );
}

export default DashboardPage;