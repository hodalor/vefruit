import { useState } from 'react';
import { useUserAuth } from '../auth/UserAuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../toast/ToastContext';
import LoadingButton from '../components/LoadingButton';

function Login() {
  const { login } = useUserAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await login(form);
      showToast('Login successful. Welcome back.');
      navigate('/');
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
          <h2 className="AuthTitle">Login</h2>
          {error && <p style={{ color: 'crimson' }}>{error}</p>}
          <form onSubmit={submit} className="Form">
            <label>
              Phone Number Or Email
              <input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} required />
            </label>
            <label>
              Password
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </label>
            <div className="FormActions">
              <LoadingButton className="Btn" type="submit" loading={submitting} loadingText="Logging in...">
                Login
              </LoadingButton>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

export default Login;
