import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { finalizePayment } from '../payments/paymentService';
import { useCart } from '../cart/CartContext';
import { useToast } from '../toast/ToastContext';

const PENDING_CHECKOUT_KEY = 'vefruit_pending_checkout_v1';
const PENDING_CHECKOUT_FALLBACK_KEY = 'vefruit_pending_checkout_fallback_v1';
const MAX_CONFIRM_ATTEMPTS = 8;
const RETRY_DELAY_MS = 3000;

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isPendingConfirmation(error) {
  return error?.status === 409 || /pending/i.test(String(error?.message || ''));
}

function CheckoutCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const { showToast } = useToast();
  const [status, setStatus] = useState('Verifying payment...');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const finalize = async () => {
      const raw = sessionStorage.getItem(PENDING_CHECKOUT_KEY);
      const fallbackRaw = localStorage.getItem(PENDING_CHECKOUT_FALLBACK_KEY);
      const pendingOrder = raw ? JSON.parse(raw) : (fallbackRaw ? JSON.parse(fallbackRaw) : null);
      const reference = params.get('reference') || params.get('trxref') || pendingOrder?.paystackReference;

      if (!reference) {
        if (!cancelled) setError('Missing payment reference.');
        return;
      }

      for (let attempt = 1; attempt <= MAX_CONFIRM_ATTEMPTS; attempt += 1) {
        try {
          if (!cancelled) {
            setStatus(attempt === 1 ? 'Confirming your payment...' : `Waiting for payment confirmation... (${attempt}/${MAX_CONFIRM_ATTEMPTS})`);
          }
          await finalizePayment(reference, pendingOrder);
          sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
          localStorage.removeItem(PENDING_CHECKOUT_FALLBACK_KEY);
          clearCart();
          if (!cancelled) {
            showToast('Payment confirmed and order saved successfully.');
            navigate('/orders', { replace: true });
          }
          return;
        } catch (err) {
          if (isPendingConfirmation(err) && attempt < MAX_CONFIRM_ATTEMPTS) {
            await wait(RETRY_DELAY_MS);
            continue;
          }
          throw err;
        }
      }

      throw new Error('Payment is still awaiting confirmation. Please reopen this page in a moment.');
    };

    finalize().catch((err) => {
      if (!cancelled) {
        setError(err.message || 'Unable to verify payment');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [clearCart, navigate, params, showToast]);

  return (
    <main className="Container">
      <h2>Checkout Status</h2>
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : <p>{status}</p>}
    </main>
  );
}

export default CheckoutCallback;
