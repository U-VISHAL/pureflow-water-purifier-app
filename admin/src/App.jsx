import { useState } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { resetDemo } from './backend';
import { Icon } from './components';
import { useCollection } from './lib/data';
import Dashboard from './pages/Dashboard';
import Dealers from './pages/Dealers';
import Login from './pages/Login';
import Orders from './pages/Orders';
import Products from './pages/Products';
import ServiceDesk from './pages/ServiceDesk';

function Shell() {
  const { profile, logout, isDemo } = useAuth();
  const [open, setOpen] = useState(false);
  const orders = useCollection('orders');
  const users = useCollection('users');
  const tickets = useCollection('serviceRequests');
  const products = useCollection('products');
  const data = { orders, users, tickets, products };

  const newOrders = orders.docs.filter((o) => o.status === 'placed').length;
  const pendingDealers = users.docs.filter((u) => u.role === 'dealer' && u.dealerStatus === 'pending').length;
  const openTickets = tickets.docs.filter((t) => t.status === 'open').length;

  const nav = [
    { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
    { to: '/orders', label: 'Orders', icon: 'orders', count: newOrders },
    { to: '/dealers', label: 'Dealers', icon: 'dealers', count: pendingDealers },
    { to: '/service', label: 'Service desk', icon: 'service', count: openTickets },
    { to: '/products', label: 'Products', icon: 'products' },
  ];

  return (
    <div className={`shell ${open ? 'nav-open' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <img src="/favicon.svg" alt="" width="32" height="32" />
          <div>
            <strong>PureFlow</strong>
            <span>Admin console</span>
          </div>
        </div>
        <nav>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)} className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
              <Icon name={n.icon} />
              {n.label}
              {n.count ? <span className="nav-count">{n.count}</span> : null}
            </NavLink>
          ))}
        </nav>
        {isDemo ? (
          <div className="demo-note">
            <strong>Demo data</strong>
            <span>Sample store data, saved in this browser only.</span>
            <button className="link-btn" onClick={() => window.confirm('Reset all demo data to the original sample?') && resetDemo()}>
              Reset demo data
            </button>
          </div>
        ) : null}
        <div className="sidebar-foot">
          <div className="me">
            <div className="avatar">{(profile?.name || 'A')[0]}</div>
            <div>
              <strong>{profile?.name || 'Admin'}</strong>
              <span>{profile?.email}</span>
            </div>
          </div>
          <button className="btn ghost full" onClick={logout}>Sign out</button>
        </div>
      </aside>
      <div className="scrim" onClick={() => setOpen(false)} />
      <main className="main">
        <button className="menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
        <Routes>
          <Route path="/" element={<Dashboard {...data} />} />
          <Route path="/orders" element={<Orders orders={orders} />} />
          <Route path="/dealers" element={<Dealers users={users} orders={orders} />} />
          <Route path="/service" element={<ServiceDesk tickets={tickets} />} />
          <Route path="/products" element={<Products products={products} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="boot"><div className="spinner" /></div>;
  return user ? <Shell /> : <Login />;
}
