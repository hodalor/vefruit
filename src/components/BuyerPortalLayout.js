import { NavLink } from 'react-router-dom';

const menu = [
  { to: '/buyer/dashboard', label: 'Dashboard' },
  { to: '/buyer/orders', label: 'Orders' },
  { to: '/buyer/payments', label: 'Payments' },
  { to: '/buyer/purchase-history', label: 'Purchase History' },
  { to: '/buyer/profile', label: 'Profile' },
];

function BuyerPortalLayout({ title, subtitle, children, sidebarNote }) {
  return (
    <main className="BuyerShell">
      <aside className="BuyerSidebar">
        <div className="BuyerSidebarBrand">
          <h3>Buyer Portal</h3>
          <p>Manage your orders, payments, history, and account details from one place.</p>
        </div>
        <nav className="BuyerSidebarMenu">
          {menu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `BuyerSidebarLink${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        {sidebarNote ? <div className="BuyerSidebarNote">{sidebarNote}</div> : null}
      </aside>

      <section className="BuyerMain">
        <div className="BuyerHeading">
          <div>
            <h1>{title}</h1>
            {subtitle ? <p className="AdminSubtle">{subtitle}</p> : null}
          </div>
        </div>
        {children}
      </section>
    </main>
  );
}

export default BuyerPortalLayout;
