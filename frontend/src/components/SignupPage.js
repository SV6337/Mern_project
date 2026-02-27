import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const ROLE_OPTIONS = ['Intern', 'Associate', 'Engineer', 'Lead', 'Manager', 'Admin'];

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Intern' });
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
      const response = await axios.post('/api/auth/signup', form);
      setIsError(false);
      setMessage(response.data.message || 'Signup successful. Please login.');
      setTimeout(() => navigate('/login'), 700);
    } catch (error) {
      setIsError(true);
      setMessage(error.response?.data?.message || 'Signup failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page container py-5">
      <div className="card auth-card border-0 shadow-lg mx-auto">
        <div className="row g-0">
          <div className="col-lg-5 auth-info-panel auth-info-panel-signup">
            <div className="auth-info-content">
              <h2 className="mb-3">Create Account</h2>
              <p className="mb-4">
                Join your team workspace and start organizing issues with priorities and clear ownership.
              </p>
              <ul className="auth-info-list mb-0">
                <li>Simple signup with role selection</li>
                <li>Personalized dashboard experience</li>
                <li>Quick issue tracking and collaboration</li>
              </ul>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="card-body p-4 p-md-5 auth-form-panel">
              <h2 className="mb-1">Sign Up</h2>
              <p className="text-muted mb-4">Create your profile to start using the board.</p>
              {message && <div className={`alert ${isError ? 'alert-danger' : 'alert-success'}`}>{message}</div>}
              <form onSubmit={onSubmit}>
                <div className="mb-3">
                  <label className="form-label">Name</label>
                  <input type="text" name="name" value={form.name} onChange={onChange} className="form-control" required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input type="email" name="email" value={form.email} onChange={onChange} className="form-control" required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input type="password" name="password" value={form.password} onChange={onChange} className="form-control" required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Role</label>
                  <select name="role" value={form.role} onChange={onChange} className="form-select" required>
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                <div className="d-grid gap-2">
                  <button type="submit" className="btn btn-success" disabled={loading}>
                    {loading ? 'Creating account...' : 'Signup'}
                  </button>
                  <Link to="/login" className="btn btn-outline-success">Already have account? Login</Link>
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

export default SignupPage;