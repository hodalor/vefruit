import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../cart/CartContext';
import { useUserAuth } from '../auth/UserAuthContext';
import { useSellerAuth } from '../auth/SellerAuthContext';

function HeaderBar() {
  const { items } = useCart();
  const { current, logout } = useUserAuth();
  const { current: sellerCurrent, logout: sellerLogout } = useSellerAuth();
  const activeAccount = sellerCurrent || current;
  const cartCount = items.reduce((sum, i) => sum + i.qty, 0);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [open, setOpen] = useState(false);
  const accountRef = useRef(null);

  useEffect(() => {
    setQ(params.get('q') || '');
  }, [params]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!accountRef.current) return;
      if (!accountRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const onSearch = (e) => {
    e.preventDefault();
    const query = q.trim();
    navigate(query ? `/?q=${encodeURIComponent(query)}` : '/');
  };

  const handleBuyerLogout = () => {
    logout();
    setOpen(false);
    navigate('/', { replace: true });
  };

  const handleFarmerLogout = () => {
    sellerLogout();
    setOpen(false);
    navigate('/login', { replace: true });
  };

  return (
    <header className="HeaderBar">
      <div className="HeaderInner">
        <div className="Brand">
          <Link to="/">VeFruit</Link>
        </div>
        <form className="SearchForm" onSubmit={onSearch}>
          <input
            className="SearchInput"
            placeholder="Search by name, ID, category, farmer"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="SearchButton" type="submit">Search</button>
        </form>
        <nav className="TopActions">
          <Link to="/requests">Request Produce</Link>
          <Link to="/messages">Messages</Link>
          <div className="Account" ref={accountRef}>
            <button className="AccountBtn" type="button" data-open={open} onClick={() => setOpen((v) => !v)}>
              Account <span className="Caret">▾</span>
            </button>
            {open && (
              <div className="Dropdown">
                {activeAccount ? (
                  <>
                    {current?.role === 'buyer' && (
                      <>
                        <Link className="DropdownItem" to="/buyer/dashboard" onClick={() => setOpen(false)}>Buyer Dashboard</Link>
                        <Link className="DropdownItem" to="/buyer/orders" onClick={() => setOpen(false)}>My Orders</Link>
                        <Link className="DropdownItem" to="/buyer/payments" onClick={() => setOpen(false)}>Payments</Link>
                        <Link className="DropdownItem" to="/buyer/profile" onClick={() => setOpen(false)}>Profile</Link>
                      </>
                    )}
                    {current?.role === 'admin' && (
                      <Link className="DropdownItem" to="/admin" onClick={() => setOpen(false)}>Admin Dashboard</Link>
                    )}
                    {sellerCurrent && (
                      <Link className="DropdownItem" to="/seller/dashboard" onClick={() => setOpen(false)}>Farmer Dashboard</Link>
                    )}
                    {sellerCurrent ? (
                      <button className="DropdownItem" onClick={handleFarmerLogout}>Logout</button>
                    ) : (
                      <button className="DropdownItem" onClick={handleBuyerLogout}>Logout</button>
                    )}
                  </>
                ) : (
                  <>
                    <Link className="DropdownItem" to="/login" onClick={() => setOpen(false)}>Login</Link>
                    <Link className="DropdownItem" to="/register" onClick={() => setOpen(false)}>Register</Link>
                  </>
                )}
              </div>
            )}
          </div>
          <Link to="/cart">Cart ({cartCount})</Link>
          <Link to="/admin">Admin</Link>
        </nav>
      </div>
    </header>
  );
}

export default HeaderBar;
