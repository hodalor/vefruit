import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saveOrder } from '../orders/orderService';
import { verifyPayment } from '../payments/paymentService';
import { useCart } from '../cart/CartContext';

const PENDING_CHECKOUT_KEY = 'vefruit_pending_checkout_v1';

function CheckoutCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [status, setStatus] = useState('Verifying payment...');
  const [error, setError] = useState('');

  useEffect(() => {
    const reference = params.get('reference') || params.get('trxref');
    const raw = sessionStorage.getItem(PENDING_CHECKOUT_KEY);

    if (!reference || !raw) {
      setError('Missing payment reference or pending checkout details.');
      return;
    }

    const order = JSON.parse(raw);

    verifyPayment(reference)
      .then(async (payment) => {
        if (String(payment?.status || '').toLowerCase() !== 'success') {
          throw new Error('Payment was not successful');
        }
        setStatus('Saving your order...');
        await saveOrder({
          ...order,
          paymentStatus: 'paid',
          orderStatus: 'processing',
          paystackReference: reference,
        });
        sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
        clearCart();
        navigate('/orders');
      })
      .catch((err) => {
        setError(err.message || 'Unable to verify payment');
      });
  }, [clearCart, navigate, params]);

  return (
    <main className="Container">
      <h2>Checkout Status</h2>
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : <p>{status}</p>}
    </main>
  );
}

export default CheckoutCallback;
