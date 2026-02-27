import { useCallback, useEffect, useMemo, useState } from 'react';
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
const PRIORITY_RANK = { Low: 1, Medium: 2, High: 3, Critical: 4 };

const EMPTY_FORM = {
  title: '',
  description: '',
  status: 'Backlog',
  priority: 'Medium',
  assignee: '',
  assignmentScope: 'all',
  labelsInput: ''
};

const priorityClassName = {
  Low: 'bg-success-subtle text-success-emphasis',
  Medium: 'bg-info-subtle text-info-emphasis',
  High: 'bg-warning-subtle text-warning-emphasis',
  Critical: 'bg-danger-subtle text-danger-emphasis'
};

const getStoredJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
};

const getInitials = (name) => {
  if (!name || typeof name !== 'string') {
    return 'NA';
  }

  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) {
    return 'NA';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

function IssueModal({
  isOpen,
  form,
  setForm,
  userOptions,
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
          <label className="form-label">Send Issue To</label>
          <select
            className="form-select"
            value={form.assignmentScope}
            onChange={(event) => {
              const nextScope = event.target.value;
              setForm((prev) => ({
                ...prev,
                assignmentScope: nextScope,
                assignee: nextScope === 'all' ? '' : prev.assignee
              }));
            }}
          >
            <option value="all">All</option>
            <option value="one">One</option>
          </select>
        </div>

        {form.assignmentScope === 'one' && (
          <div className="mb-3">
            <label className="form-label">Assign To Employee</label>
            <select
              className="form-select"
              value={form.assignee}
              onChange={(event) => setForm((prev) => ({ ...prev, assignee: event.target.value }))}
            >
              <option value="">Select employee</option>
              {userOptions.map((employee) => (
                <option key={employee._id} value={employee.name}>{`${employee.name} (${employee.role})`}</option>
              ))}
            </select>
          </div>
        )}

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

  const [filters, setFilters] = useState(() => getStoredJSON('jira-dashboard-filters', {
    search: '',
    status: 'All',
    priority: 'All'
  }));
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('jira-dashboard-sort') || 'updated');
  const [selectedLabel, setSelectedLabel] = useState(() => localStorage.getItem('jira-dashboard-label') || 'All');
  const [showOnlyMine, setShowOnlyMine] = useState(() => localStorage.getItem('jira-dashboard-only-mine') === 'true');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('jira-dashboard-view') || 'board');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIssueId, setEditingIssueId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [modalFeedback, setModalFeedback] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [userOptions, setUserOptions] = useState([]);

  const loadIssues = useCallback(async (activeFilters) => {
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
      if (user?.id) {
        params.viewerId = user.id;
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
  }, [user?.id]);

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
    const loadUsers = async () => {
      try {
        if (!user?.id) {
          setUserOptions([]);
          return;
        }

        const response = await axios.get('/api/users', { params: { requesterId: user.id } });
        setUserOptions(response.data.users || []);
      } catch (error) {
        setUserOptions([]);
      }
    };

    loadUsers();
  }, [user?.id]);

  useEffect(() => {
    loadIssues(filters);
  }, [filters, loadIssues]);

  useEffect(() => {
    localStorage.setItem('jira-dashboard-filters', JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    localStorage.setItem('jira-dashboard-sort', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('jira-dashboard-label', selectedLabel);
  }, [selectedLabel]);

  useEffect(() => {
    localStorage.setItem('jira-dashboard-only-mine', String(showOnlyMine));
  }, [showOnlyMine]);

  useEffect(() => {
    localStorage.setItem('jira-dashboard-view', viewMode);
  }, [viewMode]);

  const availableLabels = useMemo(() => {
    const labelSet = new Set();

    for (const issue of issues) {
      if (Array.isArray(issue.labels)) {
        for (const label of issue.labels) {
          if (label && typeof label === 'string') {
            labelSet.add(label.trim());
          }
        }
      }
    }

    return Array.from(labelSet).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [issues]);

  const visibleIssues = useMemo(() => {
    const byMine = showOnlyMine && user?.name
      ? issues.filter((issue) => issue.assignee?.toLowerCase() === user.name.toLowerCase())
      : issues;

    const byLabel = selectedLabel !== 'All'
      ? byMine.filter((issue) => Array.isArray(issue.labels) && issue.labels.includes(selectedLabel))
      : byMine;

    const sorted = [...byLabel];

    if (sortBy === 'priority') {
      sorted.sort((a, b) => (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0));
      return sorted;
    }

    if (sortBy === 'title') {
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      return sorted;
    }

    if (sortBy === 'assignee') {
      sorted.sort((a, b) => (a.assignee || '').localeCompare(b.assignee || ''));
      return sorted;
    }

    if (sortBy === 'newest') {
      sorted.sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));
      return sorted;
    }

    sorted.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    return sorted;
  }, [issues, selectedLabel, showOnlyMine, sortBy, user?.name]);

  const stats = useMemo(() => {
    const total = visibleIssues.length;
    const done = visibleIssues.filter((issue) => issue.status === 'Done').length;
    const highPriority = visibleIssues.filter((issue) => ['High', 'Critical'].includes(issue.priority)).length;
    const mine = user?.name
      ? visibleIssues.filter((issue) => issue.assignee?.toLowerCase() === user.name.toLowerCase()).length
      : 0;
    const completion = total ? Math.round((done / total) * 100) : 0;

    return {
      total,
      done,
      highPriority,
      mine,
      completion
    };
  }, [visibleIssues, user?.name]);

  const grouped = useMemo(() => {
    const bucket = Object.fromEntries(STATUS_COLUMNS.map((status) => [status, []]));

    for (const issue of visibleIssues) {
      if (!bucket[issue.status]) {
        bucket[issue.status] = [];
      }
      bucket[issue.status].push(issue);
    }

    return bucket;
  }, [visibleIssues]);

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
      assignmentScope: issue.assignmentScope || 'all',
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
    title: form.title.trim(),
    description: form.description.trim(),
    status: form.status,
    priority: form.priority,
    assignee: form.assignmentScope === 'one' ? form.assignee : '',
    assignmentScope: form.assignmentScope,
    requesterId: user?.id || '',
    labels: form.labelsInput
      .split(',')
      .map((label) => label.trim())
      .filter(Boolean)
  });

  const handleSaveIssue = async () => {
    setIsSaving(true);
    setModalFeedback(null);

    try {
      if (!form.title.trim()) {
        setModalFeedback({ type: 'error', message: 'Please enter an issue title' });
        setIsSaving(false);
        return;
      }

      if (form.assignmentScope === 'one' && !form.assignee.trim()) {
        setModalFeedback({ type: 'error', message: 'Please select an employee when sending to one person' });
        setIsSaving(false);
        return;
      }

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

  const clearFilters = () => {
    setFilters({ search: '', status: 'All', priority: 'All' });
    setSortBy('updated');
    setSelectedLabel('All');
    setShowOnlyMine(false);
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

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm('This will permanently delete your account. Do you want to continue?');

    if (!confirmed) {
      return;
    }

    try {
      const response = await axios.post('/api/auth/delete-account', {
        userId: user?.id,
        email: user?.email
      });

      window.alert(response.data?.message || 'Account deleted successfully');

      if (onLogout) {
        onLogout();
      }

      navigate('/signup');
    } catch (error) {
      window.alert(error.response?.data?.message || 'Could not delete account. Try again.');
    }
  };

  return (
    <div className="jira-page container-fluid py-4 px-4">
      <nav className="navbar navbar-dark bg-dark rounded mb-3 px-3">
        <span className="navbar-brand mb-0 h5">Dashboard</span>
        <div className="d-flex align-items-center gap-3 text-white">
          <small>Welcome {user?.name || 'User'}</small>
          <button onClick={handleDeleteAccount} className="btn btn-outline-danger btn-sm">Delete Account</button>
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
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="btn-group" role="group" aria-label="View mode toggle">
            <button
              className={`btn btn-sm ${viewMode === 'board' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setViewMode('board')}
            >
              Board
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>

          <button className="btn btn-outline-secondary btn-sm" onClick={() => loadIssues(filters)}>
            Refresh
          </button>
          <button className="btn btn-primary" onClick={openCreateModal}>Create Issue</button>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <div className="jira-stat-card">
            <small className="text-muted">Total Issues</small>
            <h3 className="mb-0">{stats.total}</h3>
          </div>
        </div>
        <div className="col-md-3">
          <div className="jira-stat-card">
            <small className="text-muted">Completed</small>
            <h3 className="mb-1">{stats.done}</h3>
            <div className="progress" role="progressbar" aria-valuenow={stats.completion} aria-valuemin="0" aria-valuemax="100">
              <div className="progress-bar bg-success" style={{ width: `${stats.completion}%` }} />
            </div>
            <small className="text-muted">{stats.completion}% done</small>
          </div>
        </div>
        <div className="col-md-3">
          <div className="jira-stat-card">
            <small className="text-muted">High Priority</small>
            <h3 className="mb-0 text-danger">{stats.highPriority}</h3>
          </div>
        </div>
        <div className="col-md-3">
          <div className="jira-stat-card">
            <small className="text-muted">Assigned to You</small>
            <h3 className="mb-0">{stats.mine}</h3>
          </div>
        </div>
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

          <div className="col-md-3">
            <select
              className="form-select"
              value={selectedLabel}
              onChange={(event) => setSelectedLabel(event.target.value)}
            >
              <option value="All">All Labels</option>
              {availableLabels.map((label) => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
          </div>

          <div className="col-md-3">
            <select className="form-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="updated">Sort: Recently Updated</option>
              <option value="newest">Sort: Newest Created</option>
              <option value="priority">Sort: Priority</option>
              <option value="title">Sort: Title</option>
              <option value="assignee">Sort: Assignee</option>
            </select>
          </div>

          <div className="col-md-3 d-flex align-items-center gap-3">
            <div className="form-check form-switch m-0">
              <input
                id="onlyMine"
                type="checkbox"
                className="form-check-input"
                checked={showOnlyMine}
                onChange={(event) => setShowOnlyMine(event.target.checked)}
              />
              <label className="form-check-label" htmlFor="onlyMine">Only my issues</label>
            </div>
            <button className="btn btn-sm btn-outline-secondary" onClick={clearFilters}>Reset</button>
          </div>
        </div>
      </div>

      {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}

      {viewMode === 'board' ? (
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

                    {Array.isArray(issue.labels) && issue.labels.length > 0 && (
                      <div className="jira-label-row mb-2">
                        {issue.labels.slice(0, 3).map((label) => (
                          <span key={label} className="badge rounded-pill text-bg-light border jira-label-chip">
                            {label}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="d-flex justify-content-between align-items-center small text-muted">
                      <div className="d-flex align-items-center gap-2">
                        <span className="jira-avatar-mini">{getInitials(issue.assignee || 'Unassigned')}</span>
                        <span>{issue.assignee || 'Unassigned'}</span>
                      </div>
                      <span>{issue.updatedAt ? new Date(issue.updatedAt).toLocaleDateString() : ''}</span>
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
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assignee</th>
                  <th>Labels</th>
                  <th>Move</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleIssues.map((issue) => (
                  <tr key={issue._id}>
                    <td>
                      <div className="fw-semibold">{issue.title}</div>
                      {issue.description && <small className="text-muted">{issue.description.split('\n')[0]}</small>}
                    </td>
                    <td>{issue.status}</td>
                    <td>
                      <span className={`badge ${priorityClassName[issue.priority] || 'text-bg-light'}`}>
                        {issue.priority}
                      </span>
                    </td>
                    <td>{issue.assignee || 'Unassigned'}</td>
                    <td>
                      {Array.isArray(issue.labels) && issue.labels.length > 0
                        ? issue.labels.slice(0, 2).join(', ')
                        : '-'}
                    </td>
                    <td style={{ minWidth: '170px' }}>
                      <select
                        className="form-select form-select-sm"
                        value={issue.status}
                        onChange={(event) => updateIssueStatus(issue._id, event.target.value)}
                      >
                        {STATUS_COLUMNS.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary" onClick={() => openEditModal(issue)}>
                        Open
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && visibleIssues.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      No issues found for the selected filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <IssueModal
        isOpen={isModalOpen}
        form={form}
        setForm={setForm}
        userOptions={userOptions}
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