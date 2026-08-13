import { useState } from 'react';
import { useUserAuth } from '../auth/UserAuthContext';
import { useNavigate } from 'react-router-dom';
import LoadingButton from '../components/LoadingButton';
import { useToast } from '../toast/ToastContext';

function AdminLogin() {
  const { login } = useUserAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const user = await login(form);
      if (user.role !== 'admin') {
        setError('Not an admin account');
        showToast('Not an admin account', { type: 'error' });
        return;
      }
      showToast('Admin login successful.');
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Login failed');
      showToast(err.message || 'Login failed', { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="Container AuthLayout">
      <div className="Card AuthCard">
        <div className="CardBody">
          <h2 className="AuthTitle">Admin Login</h2>
          {error && <p style={{ color: 'crimson' }}>{error}</p>}
          <form onSubmit={submit} className="Form">
            <label>
              Username, Phone, Or Email
              <input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} required />
            </label>
            <label>
              Password
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </label>
            <div className="FormActions">
              <LoadingButton className="Btn" type="submit" loading={submitting} loadingText="Signing in...">
                Login
              </LoadingButton>
            </div>
          </form>
          <div className="Muted" style={{ marginTop: '0.75rem' }}>
            Test admin: admin@vefruit.local or your admin username / admin123
          </div>
        </div>
      </div>
    </main>
  );
}

export default AdminLogin;
