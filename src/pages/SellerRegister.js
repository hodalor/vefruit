import { useState } from 'react';
import { useSellerAuth } from '../auth/SellerAuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../toast/ToastContext';
import LoadingButton from '../components/LoadingButton';

function SellerRegister() {
  const { register } = useSellerAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    idType: '',
    idNumber: '',
    password: '',
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
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      showToast('Account created successfully. Waiting for approval.');
      navigate('/seller/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
      showToast(err.message || 'Registration failed', { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="Container AuthLayout">
      <div className="Card AuthCard">
        <div className="CardBody">
          <h2 className="AuthTitle">Farmer Registration</h2>
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
            <div className="FormActions">
              <LoadingButton className="Btn" type="submit" loading={submitting} loadingText="Creating account...">
                Register
              </LoadingButton>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

export default SellerRegister;
