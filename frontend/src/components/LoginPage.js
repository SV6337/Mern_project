import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post('/api/auth/login', form);
      const user = response.data.user;
      onLogin(user);
      setIsError(false);
      setMessage(response.data.message || 'Login successful');
      navigate('/dashboard');
    } catch (error) {
      setIsError(true);
      setMessage(error.response?.data?.message || 'Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page container py-5">
      <div className="card auth-card border-0 shadow-lg mx-auto">
        <div className="row g-0">
          <div className="col-lg-5 auth-info-panel">
            <div className="auth-info-content">
              <h2 className="mb-3">Welcome Back</h2>
              <p className="mb-4">
                Sign in to continue managing your team board, priorities, and daily tasks in one place.
              </p>
              <ul className="auth-info-list mb-0">
                <li>Track issues by status and priority</li>
                <li>Assign tasks to your team quickly</li>
                <li>Stay updated with real-time board changes</li>
              </ul>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="card-body p-4 p-md-5 auth-form-panel">
              <h2 className="mb-1">Login</h2>
              <p className="text-muted mb-4">Enter your account details to access dashboard.</p>
              {message && <div className={`alert ${isError ? 'alert-danger' : 'alert-success'}`}>{message}</div>}
              <form onSubmit={onSubmit}>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input type="email" name="email" value={form.email} onChange={onChange} className="form-control" required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input type="password" name="password" value={form.password} onChange={onChange} className="form-control" required />
                </div>
                <div className="mb-3 text-end">
                  <Link to="/forgot-password" className="small text-decoration-none">Forgot password?</Link>
                </div>
                <div className="d-grid gap-2">
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Signing in...' : 'Login'}
                  </button>
                  <Link to="/signup" className="btn btn-outline-primary">Create New Account</Link>
                  <Link to="/" className="btn btn-link">Back to Home</Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;