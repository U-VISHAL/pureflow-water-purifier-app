import { useState } from 'react';
import { Badge, Drawer, Empty, Field, Tabs, Toast } from '../components';
import { update } from '../backend';
import { fmtDate, formatAddress, inr } from '../lib/data';
import { notifyUser, summarize } from '../lib/notify';

function DealerDrawer({ dealer, orders, onClose, onToast }) {
  const [reason, setReason] = useState(dealer.rejectionReason || '');
  const [busy, setBusy] = useState(false);
  const mine = orders.filter((o) => o.userId === dealer.id);
  const spend = mine.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);

  const decide = async (status) => {
    if (status === 'rejected' && !reason.trim()) return onToast('Add a reason before rejecting.');
    setBusy(true);
    try {
      await update('users', dealer.id, {
        dealerStatus: status,
        rejectionReason: status === 'rejected' ? reason.trim() : null,
        reviewedAt: 'now',
        reviewedBy: 'admin',
      });
      const r = await notifyUser(
        dealer.id,
        status === 'approved' ? 'Dealer account approved 🎉' : 'Dealer application update',
        status === 'approved'
          ? `Welcome aboard, ${dealer.businessName}! Wholesale prices and bulk ordering are now unlocked in the PureFlow app.`
          : `We could not approve your dealer application. Reason: ${reason.trim()}`,
        { dealer: status },
      );
      onToast(`${dealer.businessName} ${status}. ${summarize(r)}`);
      onClose();
    } catch (e) {
      onToast('Error: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      title={dealer.businessName || dealer.name}
      subtitle={`Applied ${fmtDate(dealer.createdAt)}`}
      onClose={onClose}
      footer={
        <>
          {dealer.dealerStatus !== 'approved' ? <button className="btn primary" disabled={busy} onClick={() => decide('approved')}>Approve dealer</button> : null}
          {dealer.dealerStatus !== 'rejected' ? <button className="btn danger" disabled={busy} onClick={() => decide('rejected')}>{dealer.dealerStatus === 'approved' ? 'Revoke access' : 'Reject'}</button> : null}
        </>
      }
    >
      <p><Badge status={dealer.dealerStatus} /></p>
      <div className="kv">
        <span>Contact</span><strong>{dealer.name}</strong>
        <span>Email</span><span>{dealer.email}</span>
        <span>Phone</span><span>{dealer.phone}</span>
        <span>GSTIN</span><span>{dealer.gstin || <em className="muted">Not provided</em>}</span>
        <span>Location</span><span>{formatAddress(dealer.address)}</span>
        {dealer.reviewedBy ? <><span>Reviewed</span><span>{fmtDate(dealer.reviewedAt)} by {dealer.reviewedBy}</span></> : null}
      </div>
      {dealer.gstin ? (
        <p className="small"><a href={`https://services.gst.gov.in/services/searchtp`} target="_blank" rel="noreferrer">Verify GSTIN on the GST portal ↗</a></p>
      ) : null}
      <h4>Order history</h4>
      <p className="muted">{mine.length} orders · {inr(spend)} total</p>
      <ul className="history">
        {mine.slice(0, 8).map((o) => <li key={o.id}>#{o.orderNo} · {inr(o.total)} <Badge status={o.status} /></li>)}
      </ul>
      {dealer.dealerStatus !== 'rejected' ? (
        <Field label="Reason (required to reject or revoke)">
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="GSTIN could not be verified" />
        </Field>
      ) : null}
    </Drawer>
  );
}

export default function Dealers({ users, orders }) {
  const [tab, setTab] = useState('pending');
  const [openId, setOpenId] = useState(null);
  const [toast, setToast] = useState('');
  const dealers = users.docs.filter((u) => u.role === 'dealer');
  const list = dealers.filter((d) => d.dealerStatus === tab);
  const open = dealers.find((d) => d.id === openId);
  const count = (s) => dealers.filter((d) => d.dealerStatus === s).length;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Dealers</h1>
          <p className="muted">Approve dealer applications to unlock wholesale pricing in the app.</p>
        </div>
      </header>
      <Tabs
        value={tab}
        onChange={setTab}
        options={['pending', 'approved', 'rejected'].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1), count: count(s) }))}
      />
      <div className="card flush">
        {!list.length ? <Empty>{users.loading ? 'Loading…' : `No ${tab} dealers.`}</Empty> : (
          <table className="table">
            <thead><tr><th>Business</th><th>Contact</th><th>GSTIN</th><th>City</th><th>Applied</th><th>Status</th><th /></tr></thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id} className="clickable" onClick={() => setOpenId(d.id)}>
                  <td><strong>{d.businessName}</strong></td>
                  <td>{d.name}<div className="muted small">{d.phone} · {d.email}</div></td>
                  <td className="mono small">{d.gstin || '—'}</td>
                  <td>{d.address?.city || '—'}</td>
                  <td className="small muted">{fmtDate(d.createdAt)}</td>
                  <td><Badge status={d.dealerStatus} /></td>
                  <td className="right"><button className="btn ghost sm">Review</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {open ? <DealerDrawer key={open.id} dealer={open} orders={orders.docs} onClose={() => setOpenId(null)} onToast={setToast} /> : null}
      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  );
}
