import { useMemo, useState } from 'react';
import { Badge, Drawer, Empty, Field, Tabs, Toast } from '../components';
import { update } from '../backend';
import { fmtDate, formatAddress, inr } from '../lib/data';
import { notifyUser, summarize } from '../lib/notify';

const FLOW = ['placed', 'confirmed', 'shipped', 'delivered'];
const MESSAGES = {
  confirmed: 'has been confirmed and is being packed.',
  shipped: 'has been shipped.',
  delivered: 'has been delivered. Thank you for shopping with PureFlow!',
  cancelled: 'has been cancelled.',
};

function OrderDrawer({ order, onClose, onToast }) {
  const [tracking, setTracking] = useState(order.tracking || { carrier: '', number: '' });
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const idx = FLOW.indexOf(order.status);
  const next = idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null;

  const setStatus = async (status) => {
    if (status === 'cancelled' && !window.confirm(`Cancel order #${order.orderNo}?`)) return;
    setBusy(true);
    try {
      const patch = {
        status,
        statusHistory: [...(order.statusHistory || []), { status, at: new Date().toISOString(), by: 'admin' }],
        updatedAt: 'now',
      };
      if (status === 'shipped' && tracking.number) patch.tracking = tracking;
      if (status === 'cancelled') patch.cancelReason = reason || 'Cancelled by store';
      if (status === 'delivered' && order.payment?.method === 'cod') patch.payment = { ...order.payment, status: 'paid' };
      await update('orders', order.id, patch);
      let body = `Your order #${order.orderNo} ${MESSAGES[status]}`;
      if (status === 'shipped' && tracking.number) body += ` ${tracking.carrier || 'Courier'} tracking: ${tracking.number}.`;
      if (status === 'cancelled' && reason) body += ` Reason: ${reason}.`;
      const r = await notifyUser(order.userId, `Order ${status}`, body, { orderId: order.id });
      onToast(`Order #${order.orderNo} → ${status}. ${summarize(r)}`);
    } catch (e) {
      onToast('Error: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveTracking = async () => {
    await update('orders', order.id, { tracking, updatedAt: 'now' });
    onToast('Tracking saved');
  };

  return (
    <Drawer
      title={`Order #${order.orderNo}`}
      subtitle={`${fmtDate(order.createdAt)} · ${order.channel === 'dealer' ? 'Dealer bulk order' : 'Retail order'}`}
      onClose={onClose}
      footer={
        <>
          {next ? <button className="btn primary" disabled={busy} onClick={() => setStatus(next)}>Mark as {next}</button> : null}
          {['placed', 'confirmed', 'shipped'].includes(order.status) ? (
            <button className="btn danger" disabled={busy} onClick={() => setStatus('cancelled')}>Cancel order</button>
          ) : null}
        </>
      }
    >
      <div className="timeline">
        {FLOW.map((s, i) => (
          <div key={s} className={`tl-step ${order.status !== 'cancelled' && i <= idx ? 'done' : ''}`}>
            <span className="tl-dot" />
            <span>{s}</span>
          </div>
        ))}
        {order.status === 'cancelled' ? <Badge status="cancelled" /> : null}
      </div>

      <h4>Customer</h4>
      <div className="kv">
        <span>Name</span><strong>{order.customerName}{order.businessName ? ` (${order.businessName})` : ''}</strong>
        <span>Email</span><span>{order.customerEmail}</span>
        <span>Phone</span><span>{order.customerPhone}</span>
        <span>Address</span><span>{formatAddress(order.address)}</span>
        {order.address?.lat ? (
          <>
            <span>Map</span>
            <a href={`https://www.openstreetmap.org/?mlat=${order.address.lat}&mlon=${order.address.lng}#map=17/${order.address.lat}/${order.address.lng}`} target="_blank" rel="noreferrer">View on OpenStreetMap ↗</a>
          </>
        ) : null}
        {order.note ? <><span>Note</span><em>{order.note}</em></> : null}
      </div>

      <h4>Items ({order.itemCount} units)</h4>
      <table className="table compact">
        <tbody>
          {order.items.map((it) => (
            <tr key={it.productId}>
              <td><img src={it.image} alt="" className="thumb" /></td>
              <td>{it.name}<div className="muted small">{it.qty} × {inr(it.price)}</div></td>
              <td className="right"><strong>{inr(it.qty * it.price)}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="kv totals">
        <span>Subtotal</span><span>{inr(order.subtotal)}</span>
        {order.discount ? <><span>Bulk discount</span><span>-{inr(order.discount)}</span></> : null}
        <span>Delivery</span><span>{order.shipping ? inr(order.shipping) : 'Free'}</span>
        <span>Total</span><strong>{inr(order.total)}</strong>
        <span>Payment</span>
        <span>
          {order.payment?.method} · <Badge status={order.payment?.status === 'paid' ? 'delivered' : 'shipped'}>{order.payment?.status}</Badge>
          {order.payment?.razorpayPaymentId ? <div className="muted small">{order.payment.razorpayPaymentId}</div> : null}
        </span>
      </div>

      {['confirmed', 'shipped'].includes(order.status) ? (
        <>
          <h4>Shipment tracking</h4>
          <div className="row-2">
            <Field label="Carrier"><input value={tracking.carrier} onChange={(e) => setTracking({ ...tracking, carrier: e.target.value })} placeholder="Delhivery" /></Field>
            <Field label="Tracking number"><input value={tracking.number} onChange={(e) => setTracking({ ...tracking, number: e.target.value })} /></Field>
          </div>
          {order.status === 'shipped' ? <button className="btn ghost" onClick={saveTracking}>Save tracking</button> : <p className="muted small">Saved when you mark the order as shipped.</p>}
        </>
      ) : null}

      {['placed', 'confirmed', 'shipped'].includes(order.status) ? (
        <Field label="Cancellation reason (optional)"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Out of stock in your area" /></Field>
      ) : null}

      <h4>History</h4>
      <ul className="history">
        {(order.statusHistory || []).map((h, i) => <li key={i}><Badge status={h.status} /> <span className="muted small">{fmtDate(h.at)}{h.by ? ` · by ${h.by}` : ''}</span></li>)}
      </ul>
    </Drawer>
  );
}

export default function Orders({ orders }) {
  const [tab, setTab] = useState('all');
  const [channel, setChannel] = useState('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);
  const [toast, setToast] = useState('');

  const counts = useMemo(() => Object.fromEntries(['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((s) => [s, orders.docs.filter((o) => o.status === s).length])), [orders.docs]);
  const list = orders.docs.filter((o) => (tab === 'all' || o.status === tab)
    && (channel === 'all' || o.channel === channel)
    && (!q || `${o.orderNo} ${o.customerName} ${o.customerEmail} ${o.customerPhone} ${o.businessName || ''}`.toLowerCase().includes(q.toLowerCase())));
  const open = orders.docs.find((o) => o.id === openId);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Orders</h1>
          <p className="muted">{orders.docs.length} orders · click a row to manage</p>
        </div>
        <div className="filters">
          <input className="search" placeholder="Search order #, name, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="all">All channels</option>
            <option value="retail">Retail</option>
            <option value="dealer">Dealer</option>
          </select>
        </div>
      </header>
      <Tabs
        value={tab}
        onChange={setTab}
        options={[{ value: 'all', label: 'All', count: orders.docs.length }, ...Object.entries(counts).map(([k, v]) => ({ value: k, label: k[0].toUpperCase() + k.slice(1), count: v }))]}
      />
      <div className="card flush">
        {orders.error ? <Empty>{orders.error}</Empty> : !list.length ? <Empty>{orders.loading ? 'Loading…' : 'No orders match.'}</Empty> : (
          <table className="table">
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Channel</th><th>Items</th><th>Payment</th><th>Status</th><th className="right">Total</th></tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id} className="clickable" onClick={() => setOpenId(o.id)}>
                  <td><strong>#{o.orderNo}</strong><div className="muted small">{fmtDate(o.createdAt)}</div></td>
                  <td>{o.customerName}<div className="muted small">{o.businessName || o.customerPhone}</div></td>
                  <td><Badge status={o.channel === 'dealer' ? 'dealer' : 'retail'}>{o.channel}</Badge></td>
                  <td>{o.itemCount}</td>
                  <td className="small">{o.payment?.method}<div className="muted">{o.payment?.status}</div></td>
                  <td><Badge status={o.status} /></td>
                  <td className="right"><strong>{inr(o.total)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {open ? <OrderDrawer key={open.id} order={open} onClose={() => setOpenId(null)} onToast={setToast} /> : null}
      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  );
}
