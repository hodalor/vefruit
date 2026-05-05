import { useState } from 'react';
import { useUserAuth } from '../auth/UserAuthContext';
import { useSellerAuth } from '../auth/SellerAuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';

function Register() {
  const { register } = useUserAuth();
  const { register: registerFarmer } = useSellerAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialRole = params.get('role') === 'seller' ? 'seller' : 'buyer';
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    idType: '',
    idNumber: '',
    password: '',
    role: initialRole,
    businessName: '',
    businessAddress: '',
    businessPhone: '',
    registrationNumber: '',
    bankName: '',
    branchName: '',
    branchCode: '',
    accountName: '',
    accountNumber: '',
    mobileMoneyNumber: '',
    mobileMoneyMtnName: '',
  });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (form.role === 'seller') {
        await registerFarmer(form);
        navigate('/seller/dashboard');
      } else {
        await register(form);
        navigate('/');
      }
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
          <form onSubmit={submit} className="Form AuthGridForm">
            <div className="AuthSectionLabel AuthFieldWide">Personal Details</div>
            <label>
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label>
              Phone Number
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </label>
            <label>
              Email (Optional)
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label>
              Password
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </label>
            <label>
              Address
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </label>
            <label>
              ID Type
              <input value={form.idType} onChange={(e) => setForm({ ...form, idType: e.target.value })} placeholder="Ghana Card, Passport, Voter ID" />
            </label>
            <label>
              ID Number
              <input value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} />
            </label>
            <label>
              Role
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="buyer">Buyer</option>
                <option value="seller">Farmer</option>
              </select>
            </label>
            {form.role === 'seller' && (
              <>
                <div className="AuthSectionLabel AuthFieldWide">Business Information</div>
                <label>
                  Business Name
                  <input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
                </label>
                <label>
                  Business Address
                  <input value={form.businessAddress} onChange={(e) => setForm({ ...form, businessAddress: e.target.value })} />
                </label>
                <label>
                  Business Phone
                  <input value={form.businessPhone} onChange={(e) => setForm({ ...form, businessPhone: e.target.value })} />
                </label>
                <label>
                  Registration Number
                  <input value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} />
                </label>
                <div className="AuthSectionLabel AuthFieldWide">Payment Details</div>
                <label>
                  Bank Name
                  <input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
                </label>
                <label>
                  Branch Name
                  <input value={form.branchName} onChange={(e) => setForm({ ...form, branchName: e.target.value })} />
                </label>
                <label>
                  Branch Code
                  <input value={form.branchCode} onChange={(e) => setForm({ ...form, branchCode: e.target.value })} />
                </label>
                <label>
                  Account Name
                  <input value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} />
                </label>
                <label>
                  Account Number
                  <input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
                </label>
                <label>
                  MTN Mobile Money Number
                  <input value={form.mobileMoneyNumber} onChange={(e) => setForm({ ...form, mobileMoneyNumber: e.target.value })} />
                </label>
                <label className="AuthFieldWide">
                  MTN Mobile Money Name
                  <input value={form.mobileMoneyMtnName} onChange={(e) => setForm({ ...form, mobileMoneyMtnName: e.target.value })} />
                </label>
              </>
            )}
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
