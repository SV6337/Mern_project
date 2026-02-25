import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div>
      <nav className="navbar navbar-light bg-white border-bottom px-4 py-3">
        <div className="container-fluid">
          <span className="navbar-brand mb-0 h1 fw-bold" style={{ color: '#0052CC' }}>
            TaskBoard
          </span>
          <div className="d-flex gap-2">
            <Link to="/login" className="btn btn-outline-primary">Log in</Link>
            <Link to="/signup" className="btn btn-primary">Get started</Link>
          </div>
        </div>
      </nav>

      <div className="bg-light">
        <div className="container py-5">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <h1 className="display-4 fw-bold mb-4" style={{ color: '#172B4D' }}>
                Move work forward
              </h1>
              <p className="lead text-muted mb-4">
                Plan, track, and manage your projects with the tools your team already knows and loves.
                Keep everyone aligned with a flexible Kanban board.
              </p>
              <div className="d-flex gap-3 mb-4">
                <Link to="/signup" className="btn btn-primary btn-lg px-4">Get started free</Link>
                <Link to="/login" className="btn btn-outline-primary btn-lg px-4">Sign in</Link>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="card shadow-sm border-0">
                <div className="card-body p-4">
                  <h5 className="card-title fw-bold mb-3">✨ Features</h5>
                  <div className="d-flex flex-column gap-3">
                    <div className="d-flex align-items-start gap-2">
                      <span className="badge bg-primary">📋</span>
                      <div>
                        <strong>Kanban boards</strong>
                        <p className="text-muted small mb-0">Visualize your workflow from start to finish</p>
                      </div>
                    </div>
                    <div className="d-flex align-items-start gap-2">
                      <span className="badge bg-success">🎯</span>
                      <div>
                        <strong>Issue tracking</strong>
                        <p className="text-muted small mb-0">Track bugs, tasks, and stories in one place</p>
                      </div>
                    </div>
                    <div className="d-flex align-items-start gap-2">
                      <span className="badge bg-info">⚡</span>
                      <div>
                        <strong>Real-time updates</strong>
                        <p className="text-muted small mb-0">Drag and drop to update task status instantly</p>
                      </div>
                    </div>
                    <div className="d-flex align-items-start gap-2">
                      <span className="badge bg-warning">🔍</span>
                      <div>
                        <strong>Advanced filtering</strong>
                        <p className="text-muted small mb-0">Find what you need with powerful search and filters</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-5">
        <div className="text-center mb-5">
          <h2 className="fw-bold mb-3" style={{ color: '#172B4D' }}>
            Everything you need to ship faster
          </h2>
          <p className="text-muted">
            Powerful features to help your team collaborate and deliver
          </p>
        </div>
        <div className="row g-4">
          <div className="col-md-4">
            <div className="text-center">
              <div className="mb-3">
                <span className="badge bg-primary rounded-circle p-3 fs-4">📊</span>
              </div>
              <h5 className="fw-bold">Track work</h5>
              <p className="text-muted">
                Manage tasks with customizable workflows that fit your team&apos;s needs
              </p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="text-center">
              <div className="mb-3">
                <span className="badge bg-success rounded-circle p-3 fs-4">👥</span>
              </div>
              <h5 className="fw-bold">Collaborate</h5>
              <p className="text-muted">
                Assign tasks, set priorities, and keep your whole team in sync
              </p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="text-center">
              <div className="mb-3">
                <span className="badge bg-info rounded-circle p-3 fs-4">🚀</span>
              </div>
              <h5 className="fw-bold">Ship faster</h5>
              <p className="text-muted">
                Spend less time in meetings and more time building what matters
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-dark text-white border-top py-4 mt-auto">
        <div className="container text-center">
          <p className="mb-0">
            &copy; Built By{' '}
            <span className="text-white-50 fw-medium">Sathvik Vasishta (1JT23IS047)</span>
            {' '}and{' '}
            <span className="text-white-50 fw-medium">R P Varada Rangan (1JT23IS041)</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;