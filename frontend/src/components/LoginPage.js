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
    <div className="container py-5">
      <div className="card shadow-sm border-0 mx-auto" style={{ maxWidth: 500 }}>
        <div className="card-body p-4">
          <h2 className="text-center mb-4">Login</h2>
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
            <div className="d-grid gap-2">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Signing in...' : 'Login'}
              </button>
              <Link to="/" className="btn btn-secondary">Cancel</Link>
              <Link to="/signup" className="btn btn-link">Don&apos;t have an account? Signup</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;