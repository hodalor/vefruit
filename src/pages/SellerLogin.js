import { useState } from 'react';
import { useSellerAuth } from '../auth/SellerAuthContext';
import { useNavigate } from 'react-router-dom';
import LoadingButton from '../components/LoadingButton';
import { useToast } from '../toast/ToastContext';

function SellerLogin() {
  const { login } = useSellerAuth();
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
      await login(form);
      showToast('Login successful. Welcome back.');
      navigate('/seller/dashboard');
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
          <h2 className="AuthTitle">Farmer Login</h2>
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
              <LoadingButton className="Btn" type="submit" loading={submitting} loadingText="Signing in...">
                Login
              </LoadingButton>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

export default SellerLogin;
