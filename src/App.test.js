import { render, screen } from '@testing-library/react';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { CartProvider } from './cart/CartContext';
import { SellerAuthProvider } from './auth/SellerAuthContext';
import { UserAuthProvider } from './auth/UserAuthContext';

test('renders home content', () => {
  render(
    <BrowserRouter>
      <UserAuthProvider>
        <SellerAuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </SellerAuthProvider>
      </UserAuthProvider>
    </BrowserRouter>
  );
  expect(screen.getByText(/Popular Products/i)).toBeInTheDocument();
});
