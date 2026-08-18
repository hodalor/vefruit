import { useState } from 'react';
import { useUserAuth } from '../auth/UserAuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../toast/ToastContext';
import LoadingButton from '../components/LoadingButton';
import { useSellerAuth } from '../auth/SellerAuthContext';
import { api } from '../api/client';
import PasswordField from '../components/PasswordField';

function Login() {
  const { setAuthenticatedUser, logout: logoutUser } = useUserAuth();
  const { setAuthenticatedSeller, logout: logoutSeller } = useSellerAuth();
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
      const data = await api.post('/auth/login', form);
      const user = data.user;
      logoutUser();
      logoutSeller();
      if (user.role === 'farmer') {
        setAuthenticatedSeller(user);
      } else {
        setAuthenticatedUser(user);
      }
      showToast('Login successful. Welcome back.');
      if (user.role === 'farmer') {
        navigate('/seller/dashboard');
      } else if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/buyer/dashboard');
      }
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
          <p className="AuthSubtle">Use your phone number, email, or username. We will detect whether you are a buyer, farmer, or admin automatically.</p>
          {error && <p style={{ color: 'crimson' }}>{error}</p>}
          <form onSubmit={submit} className="Form">
            <label>
              Phone Number, Email, Or Username
              <input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} required />
            </label>
            <label>
              Password
              <PasswordField
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
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
