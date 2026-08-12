import './App.css';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import CheckoutCallback from './pages/CheckoutCallback';
import Orders from './pages/Orders';
import SellerRegister from './pages/SellerRegister';
import SellerLogin from './pages/SellerLogin';
import SellerDashboard from './pages/SellerDashboard';
import Register from './pages/Register';
import Login from './pages/Login';
import HeaderBar from './components/HeaderBar';
import Admin from './pages/Admin';
import ProductDetail from './pages/ProductDetail';
import AdminLogin from './pages/AdminLogin';
import Messages from './pages/Messages';
import ProductRequests from './pages/ProductRequests';
import useRealtimeBridge from './realtime/useRealtimeBridge';

function App() {
  useRealtimeBridge();

  return (
    <div className="App">
      <HeaderBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/checkout/callback" element={<CheckoutCallback />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/requests" element={<ProductRequests />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/seller/register" element={<SellerRegister />} />
        <Route path="/seller/login" element={<SellerLogin />} />
        <Route path="/seller/dashboard" element={<SellerDashboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
      </Routes>
      <footer className="Footer">
        <small>© {new Date().getFullYear()} veFruit</small>
      </footer>
    </div>
  );
}

export default App;
