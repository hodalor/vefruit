import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useCart } from '../cart/CartContext';
import { useUserAuth } from '../auth/UserAuthContext';
import { initializePayment } from '../payments/paymentService';
import LoadingButton from '../components/LoadingButton';
import { useToast } from '../toast/ToastContext';

const PENDING_CHECKOUT_KEY = 'vefruit_pending_checkout_v1';
const PENDING_CHECKOUT_FALLBACK_KEY = 'vefruit_pending_checkout_fallback_v1';

function Checkout() {
  const { items, total } = useCart();
  const navigate = useNavigate();
  const { current } = useUserAuth();
  const { showToast } = useToast();
  const [contactEmail, setContactEmail] = useState(current?.email || '');
  const [neededBy, setNeededBy] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async () => {
    if (submitting) return;
    if (!current) {
      showToast('Please login before checking out.', { type: 'info' });
      navigate('/login');
      return;
    }
    const email = String(contactEmail || current.email || '').trim();
    if (!email) {
      setError('An email address is required for Paystack checkout.');
      showToast('An email address is required for Paystack checkout.', { type: 'error' });
      return;
    }
    setSubmitting(true);
    setError('');
    const order = {
      buyerId: current.id,
      items: items.map((i) => ({ productId: i.id, quantity: i.qty, price: i.price })),
      totalAmount: total,
      paymentStatus: 'pending',
      orderStatus: 'pending-payment',
      neededBy,
      requestNote,
    };
    try {
      sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(order));
      localStorage.setItem(PENDING_CHECKOUT_FALLBACK_KEY, JSON.stringify(order));
      const payment = await initializePayment({
        email,
        amount: Math.round(total * 100),
        metadata: {
          buyerId: current.id,
          neededBy,
          requestNote,
          totalAmount: total,
          order: {
            buyerId: current.id,
            items: order.items,
            totalAmount: total,
            neededBy,
            requestNote,
          },
          mobileMoneySupported: true,
        },
        callback_url: `${window.location.origin}/checkout/callback`,
      });
      if (!payment?.authorization_url) {
        throw new Error('Unable to start Paystack checkout');
      }
      sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify({
        ...order,
        paystackReference: payment.reference || '',
      }));
      localStorage.setItem(PENDING_CHECKOUT_FALLBACK_KEY, JSON.stringify({
        ...order,
        paystackReference: payment.reference || '',
      }));
      showToast('Redirecting to Paystack for payment...', { type: 'info' });
      window.location.assign(payment.authorization_url);
    } catch (err) {
      setError(err.message || 'Unable to start payment');
      showToast(err.message || 'Unable to start payment', { type: 'error' });
      setSubmitting(false);
    }
  };

  return (
    <main className="Container">
      <h2>Checkout</h2>
      {items.length === 0 ? (
        <p>No items to checkout.</p>
      ) : (
        <div className="Checkout">
          <ul>
            {items.map((i) => (
              <li key={i.id}>{i.name} × {i.qty} — GHS { (i.price * i.qty).toFixed(2) }</li>
            ))}
          </ul>
          <p><strong>Total:</strong> GHS {total.toFixed(2)}</p>
          <div className="Form" style={{ marginTop: '1rem', maxWidth: 520 }}>
            <label>
              Payment Email
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
            </label>
            <label>
              Needed By
              <input type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
            </label>
            <label>
              Product Request Note
              <textarea rows="4" value={requestNote} onChange={(e) => setRequestNote(e.target.value)} placeholder="Add delivery details or extra produce requirements." />
            </label>
            {error && <p style={{ color: 'crimson', margin: 0 }}>{error}</p>}
            <LoadingButton className="Btn" type="button" onClick={handlePay} loading={submitting} loadingText="Redirecting...">
              Pay With Paystack
            </LoadingButton>
          </div>
        </div>
      )}
    </main>
  );
}

export default Checkout;
