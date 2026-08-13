import './App.css';
import { Navigate, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import CheckoutCallback from './pages/CheckoutCallback';
import Orders from './pages/Orders';
import BuyerDashboard from './pages/BuyerDashboard';
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
import { useUserAuth } from './auth/UserAuthContext';
import { useSellerAuth } from './auth/SellerAuthContext';

function App() {
  useRealtimeBridge();

  return (
    <div className="App">
      <HeaderBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<BuyerRoute><Checkout /></BuyerRoute>} />
        <Route path="/checkout/callback" element={<CheckoutCallback />} />
        <Route path="/buyer/dashboard" element={<BuyerRoute><BuyerDashboard /></BuyerRoute>} />
        <Route path="/orders" element={<BuyerRoute><Orders /></BuyerRoute>} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/requests" element={<ProductRequests />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/seller/register" element={<SellerRegister />} />
        <Route path="/seller/login" element={<SellerLogin />} />
        <Route path="/seller/dashboard" element={<FarmerRoute><SellerDashboard /></FarmerRoute>} />
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="/admin/login" element={<AdminLogin />} />
      </Routes>
      <footer className="Footer">
        <small>© {new Date().getFullYear()} veFruit</small>
      </footer>
    </div>
  );
}

function BuyerRoute({ children }) {
  const { current } = useUserAuth();
  if (!current) {
    return <Navigate to="/login" replace />;
  }
  if (current.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  return children;
}

function FarmerRoute({ children }) {
  const { current } = useSellerAuth();
  if (!current) {
    return <Navigate to="/seller/login" replace />;
  }
  return children;
}

function AdminRoute({ children }) {
  const { current } = useUserAuth();
  if (!current || current.role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

export default App;
