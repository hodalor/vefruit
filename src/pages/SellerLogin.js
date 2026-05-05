import { useState } from 'react';
import { useSellerAuth } from '../auth/SellerAuthContext';
import { useNavigate } from 'react-router-dom';

function SellerLogin() {
  const { login } = useSellerAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    try {
      login(form);
      navigate('/seller/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
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
              <button className="Btn" type="submit">Login</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

export default SellerLogin;
