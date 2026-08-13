import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { CartProvider } from './cart/CartContext';
import { SellerAuthProvider } from './auth/SellerAuthContext';
import { UserAuthProvider } from './auth/UserAuthContext';
import { ToastProvider } from './toast/ToastContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <UserAuthProvider>
          <SellerAuthProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </SellerAuthProvider>
        </UserAuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
