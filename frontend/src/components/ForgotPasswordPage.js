import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (form.newPassword !== form.confirmPassword) {
      setIsError(true);
      setMessage('New password and confirm password must match');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/auth/forgot-password', {
        email: form.email,
        newPassword: form.newPassword
      });
      setIsError(false);
      setMessage(response.data.message || 'Password updated successfully');
      setTimeout(() => navigate('/login'), 1000);
    } catch (error) {
      setIsError(true);
      setMessage(error.response?.data?.message || 'Could not reset password. Try again.');
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
              <h2 className="mb-3">Reset Password</h2>
              <p className="mb-4">
                Enter your registered email and set a new password to regain access to your account.
              </p>
              <ul className="auth-info-list mb-0">
                <li>Use at least 6 characters</li>
                <li>Keep your password secure</li>
                <li>Login again after reset</li>
              </ul>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="card-body p-4 p-md-5 auth-form-panel">
              <h2 className="mb-1">Forgot Password</h2>
              <p className="text-muted mb-4">Update your password and continue securely.</p>

              {message && <div className={`alert ${isError ? 'alert-danger' : 'alert-success'}`}>{message}</div>}

              <form onSubmit={onSubmit}>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    className="form-control"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={form.newPassword}
                    onChange={onChange}
                    className="form-control"
                    minLength={6}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={onChange}
                    className="form-control"
                    minLength={6}
                    required
                  />
                </div>
                <div className="d-grid gap-2">
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                  <Link to="/login" className="btn btn-outline-primary">Back to Login</Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
