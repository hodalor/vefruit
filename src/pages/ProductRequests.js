import { useEffect, useMemo, useState } from 'react';
import { createRequest, getRequestEventName, loadRequests, updateRequest } from '../requests/requestService';
import useCategories from '../categories/useCategories';
import { formatCategoryLabel, getCategoryValue } from '../categories/categoryService';
import { useUserAuth } from '../auth/UserAuthContext';
import { useNavigate } from 'react-router-dom';
import { useSellerAuth } from '../auth/SellerAuthContext';

function ProductRequests() {
  const { current } = useUserAuth();
  const { current: farmerCurrent } = useSellerAuth();
  const navigate = useNavigate();
  const categories = useCategories();
  const [requests, setRequests] = useState([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    desiredProduct: '',
    category: '',
    quantity: 1,
    neededBy: '',
    location: current?.address || '',
    note: '',
  });

  useEffect(() => {
    const isBuyer = Boolean(current?.id);
    const isFarmer = Boolean(farmerCurrent?.id);
    if (!isBuyer && !isFarmer) {
      setRequests([]);
      return undefined;
    }

    const sync = () => loadRequests(isBuyer ? { buyerId: current.id } : { status: 'open' }).then(setRequests).catch(() => setRequests([]));
    sync();
    window.addEventListener(getRequestEventName(), sync);
    return () => window.removeEventListener(getRequestEventName(), sync);
  }, [current?.id, farmerCurrent?.id]);

  const categoryOptions = useMemo(() => categories.map((category) => ({
    id: category.id,
    value: getCategoryValue(category),
    label: formatCategoryLabel(category),
  })), [categories]);

  const submit = async (e) => {
    e.preventDefault();
    if (!current) {
      navigate('/login');
      return;
    }

    setError('');
    try {
      await createRequest({
        buyerId: current.id,
        buyerName: current.name,
        buyerPhone: current.phone,
        ...form,
      });
      setForm({
        desiredProduct: '',
        category: '',
        quantity: 1,
        neededBy: '',
        location: current?.address || '',
        note: '',
      });
      setNotice('Produce request submitted');
      setTimeout(() => setNotice(''), 1800);
    } catch (err) {
      setError(err.message || 'Unable to submit request');
    }
  };

  return (
    <main className="Container">
      <div className="AdminHeading" style={{ marginBottom: '1rem' }}>
        <div>
          <h1>Request Produce</h1>
          <p className="AdminSubtle">Ask for vegetables or fruits that are not yet listed, including the quantity and day you need them.</p>
        </div>
      </div>

      <section className="Card">
        <div className="CardBody">
          {farmerCurrent ? (
            <>
              <h2 className="SectionTitle">Open Buyer Requests</h2>
              <p className="Muted">Farmers can monitor unmet demand here in realtime.</p>
            </>
          ) : (
            <form onSubmit={submit} className="AdminFormGrid">
              <label>
                Product Needed
                <input value={form.desiredProduct} onChange={(e) => setForm({ ...form, desiredProduct: e.target.value })} required />
              </label>
              <label>
                Category
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="">Select a category</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.value}>{category.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Quantity
                <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
              </label>
              <label>
                Needed By
                <input type="date" value={form.neededBy} onChange={(e) => setForm({ ...form, neededBy: e.target.value })} />
              </label>
              <label className="AdminFieldWide">
                Location
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Delivery or pickup location" />
              </label>
              <label className="AdminFieldWide">
                Note
                <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows="4" placeholder="Describe size, variety, packaging, or delivery details." />
              </label>
              <div className="AdminFieldWide AdminButtonRow">
                <button className="Btn" type="submit">Submit Request</button>
                {notice && <span style={{ color: '#16a34a' }}>{notice}</span>}
                {error && <span style={{ color: 'crimson' }}>{error}</span>}
              </div>
            </form>
          )}
        </div>
      </section>

      <section className="Card" style={{ marginTop: '1rem' }}>
        <div className="CardBody">
          <h2 className="SectionTitle">My Requests</h2>
          {requests.length === 0 ? (
            <p className="Muted">No produce requests yet.</p>
          ) : (
            <div className="AdminOrdersList">
              {requests.map((request) => (
                <div className="OrderCard" key={request.id}>
                  <div className="OrderHeader">
                    <strong>{request.desiredProduct}</strong>
                    <span>{new Date(request.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="Muted">{request.category ? formatCategoryLabel(request.category) : 'Uncategorized'} • Qty {request.quantity}</div>
                  {request.neededBy && <div className="Muted">Needed by: {request.neededBy}</div>}
                  {request.location && <div className="Muted">Location: {request.location}</div>}
                  {request.note && <div>{request.note}</div>}
                  <div className="AdminPillRow">
                    <span className="AdminPill">{request.status}</span>
                    {farmerCurrent && request.status === 'open' && (
                      <button className="BtnOutline" type="button" onClick={() => updateRequest(request.id, { status: 'matched' })}>Mark Matched</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default ProductRequests;
