import { useState } from 'react';
import { useUserAuth } from '../auth/UserAuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';

function Register() {
  const { register } = useUserAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialRole = params.get('role') === 'seller' ? 'seller' : 'buyer';
  const [form, setForm] = useState({ name: '', email: '', password: '', role: initialRole });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      await register(form);
      if (form.role === 'seller') navigate('/seller/dashboard');
      else navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <main className="Container AuthLayout">
      <div className="Card AuthCard">
        <div className="CardBody">
          <h2 className="AuthTitle">Register</h2>
          {error && <p style={{ color: 'crimson' }}>{error}</p>}
          <form onSubmit={submit} className="Form">
            <label>
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </label>
            <label>
              Password
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </label>
            <label>
              Role
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="buyer">Buyer</option>
                <option value="seller">Farmer</option>
              </select>
            </label>
            <div className="FormActions">
              <button className="Btn" type="submit">Register</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

export default Register;
