import { useState } from 'react';
import { useUserAuth } from '../auth/UserAuthContext';
import { useNavigate } from 'react-router-dom';

function AdminLogin() {
  const { login } = useUserAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      const user = await login(form);
      if (user.role !== 'admin') {
        setError('Not an admin account');
        return;
      }
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Login failed');
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
              <button className="Btn" type="submit">Login</button>
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
