import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../cart/CartContext';
import { useUserAuth } from '../auth/UserAuthContext';
import { useSellerAuth } from '../auth/SellerAuthContext';

function HeaderBar() {
  const { items } = useCart();
  const { current, logout } = useUserAuth();
  const { current: sellerCurrent, logout: sellerLogout } = useSellerAuth();
  const cartCount = items.reduce((sum, i) => sum + i.qty, 0);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQ(params.get('q') || '');
  }, [params]);

  const onSearch = (e) => {
    e.preventDefault();
    const query = q.trim();
    navigate(query ? `/?q=${encodeURIComponent(query)}` : '/');
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
            placeholder="Search by name, ID, category, seller"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="SearchButton" type="submit">Search</button>
        </form>
        <nav className="TopActions">
          <div className="Account" onMouseLeave={() => setOpen(false)}>
            <button className="AccountBtn" type="button" data-open={open} onClick={() => setOpen((v) => !v)}>
              Account <span className="Caret">▾</span>
            </button>
            {open && (
              <div className="Dropdown">
                {current ? (
                  <button className="DropdownItem" onClick={() => { logout(); setOpen(false); }}>Logout</button>
                ) : (
                  <>
                    <Link className="DropdownItem" to="/login" onClick={() => setOpen(false)}>Buyer Login</Link>
                    <Link className="DropdownItem" to="/register?role=buyer" onClick={() => setOpen(false)}>Buyer Register</Link>
                  </>
                )}
                {sellerCurrent ? (
                  <>
                    <Link className="DropdownItem" to="/seller/dashboard" onClick={() => setOpen(false)}>Seller Dashboard</Link>
                    <button className="DropdownItem" onClick={() => { sellerLogout(); setOpen(false); }}>Logout Seller</button>
                  </>
                ) : (
                  <>
                    <Link className="DropdownItem" to="/seller/login" onClick={() => setOpen(false)}>Seller Login</Link>
                    <Link className="DropdownItem" to="/seller/register" onClick={() => setOpen(false)}>Seller Register</Link>
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
