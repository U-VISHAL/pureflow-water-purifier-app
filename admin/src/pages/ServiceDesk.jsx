import { useState } from 'react';
import { Badge, Drawer, Empty, Field, Tabs, Toast } from '../components';
import { update } from '../backend';
import { fmtDate, formatAddress } from '../lib/data';
import { notifyUser, summarize } from '../lib/notify';

const STATUSES = ['open', 'assigned', 'in_progress', 'resolved', 'cancelled'];
const TECHNICIANS = [
  { name: 'Ravi Kumar', phone: '9876500011' },
  { name: 'Anita Sharma', phone: '9876500022' },
  { name: 'Mohammed Irfan', phone: '9876500033' },
  { name: 'Suresh Patil', phone: '9876500044' },
];

const label = (s) => s.replace('_', ' ').replace(/^./, (c) => c.toUpperCase());

function TicketDrawer({ t, onClose, onToast }) {
  const [tech, setTech] = useState(t.technician || { name: '', phone: '' });
  const [status, setStatus] = useState(t.status === 'open' ? 'assigned' : t.status);
  const [note, setNote] = useState(t.adminNote || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (['assigned', 'in_progress'].includes(status) && !tech.name) return onToast('Pick a technician first.');
    setBusy(true);
    try {
      const changed = status !== t.status;
      await update('serviceRequests', t.id, {
        status,
        technician: tech.name ? tech : null,
        adminNote: note.trim(),
        history: changed ? [...(t.history || []), { status, at: new Date().toISOString(), by: 'admin' }] : t.history || [],
        updatedAt: 'now',
      });
      const visit = `${new Date(t.preferredDate).toDateString()} (${t.slot})`;
      const body = {
        assigned: `Technician ${tech.name} (${tech.phone}) will visit on ${visit} for your ${t.type.toLowerCase()} request.`,
        in_progress: `${tech.name} is working on your ${t.type.toLowerCase()} request.`,
        resolved: `Your service request #${t.ticketNo} has been resolved.${note ? ' ' + note.trim() : ''}`,
        cancelled: `Your service request #${t.ticketNo} was cancelled.${note ? ' ' + note.trim() : ''}`,
        open: `Your service request #${t.ticketNo} was updated.`,
      }[status];
      const r = await notifyUser(t.userId, `Service #${t.ticketNo}: ${label(status)}`, body, { ticketId: t.id });
      onToast(`Ticket #${t.ticketNo} saved. ${summarize(r)}`);
      onClose();
    } catch (e) {
      onToast('Error: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      title={`${t.type} · #${t.ticketNo}`}
      subtitle={`Raised ${fmtDate(t.createdAt)}`}
      onClose={onClose}
      footer={<button className="btn primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save & notify customer'}</button>}
    >
      <p><Badge status={t.status} /> {t.role === 'dealer' ? <Badge status="dealer">dealer</Badge> : null}</p>
      <div className="kv">
        <span>Customer</span><strong>{t.name}</strong>
        <span>Phone</span><a href={`tel:${t.phone}`}>{t.phone}</a>
        <span>Product</span><span>{t.product}</span>
        <span>Preferred visit</span><strong>{new Date(t.preferredDate).toDateString()} · {t.slot}</strong>
        <span>Address</span><span>{formatAddress(t.address)}</span>
        {t.issue ? <><span>Issue</span><em>{t.issue}</em></> : null}
      </div>
      {t.address?.lat ? (
        <iframe
          title="Service location"
          className="map"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${t.address.lng - 0.01},${t.address.lat - 0.006},${t.address.lng + 0.01},${t.address.lat + 0.006}&layer=mapnik&marker=${t.address.lat},${t.address.lng}`}
        />
      ) : null}

      <h4>Dispatch</h4>
      <Field label="Technician">
        <select value={tech.name} onChange={(e) => setTech(TECHNICIANS.find((x) => x.name === e.target.value) || { name: '', phone: '' })}>
          <option value="">— Select technician —</option>
          {TECHNICIANS.map((x) => <option key={x.name} value={x.name}>{x.name} · {x.phone}</option>)}
        </select>
      </Field>
      <Field label="Status">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
      </Field>
      <Field label="Note to customer">
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Replaced sediment filter and RO membrane." />
      </Field>

      <h4>History</h4>
      <ul className="history">
        {(t.history || []).map((h, i) => <li key={i}><Badge status={h.status} /> <span className="muted small">{fmtDate(h.at)}{h.by ? ` · ${h.by}` : ''}</span></li>)}
      </ul>
    </Drawer>
  );
}

export default function ServiceDesk({ tickets }) {
  const [tab, setTab] = useState('open');
  const [type, setType] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [toast, setToast] = useState('');
  const types = [...new Set(tickets.docs.map((t) => t.type))];
  const list = tickets.docs.filter((t) => (tab === 'all' || t.status === tab) && (type === 'all' || t.type === type));
  const open = tickets.docs.find((t) => t.id === openId);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Service desk</h1>
          <p className="muted">Assign technicians and keep customers updated.</p>
        </div>
        <div className="filters">
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All request types</option>
            {types.map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
      </header>
      <Tabs
        value={tab}
        onChange={setTab}
        options={[...STATUSES.map((s) => ({ value: s, label: label(s), count: tickets.docs.filter((t) => t.status === s).length })), { value: 'all', label: 'All', count: tickets.docs.length }]}
      />
      <div className="card flush">
        {!list.length ? <Empty>{tickets.loading ? 'Loading…' : 'No tickets here.'}</Empty> : (
          <table className="table">
            <thead><tr><th>Ticket</th><th>Customer</th><th>Request</th><th>Visit</th><th>City</th><th>Technician</th><th>Status</th></tr></thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id} className="clickable" onClick={() => setOpenId(t.id)}>
                  <td><strong>#{t.ticketNo}</strong><div className="muted small">{fmtDate(t.createdAt)}</div></td>
                  <td>{t.name}<div className="muted small">{t.phone}</div></td>
                  <td>{t.type}<div className="muted small">{t.product}</div></td>
                  <td className="small">{new Date(t.preferredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}<div className="muted">{t.slot}</div></td>
                  <td>{t.address?.city || '—'}</td>
                  <td>{t.technician?.name || <span className="muted">Unassigned</span>}</td>
                  <td><Badge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {open ? <TicketDrawer key={open.id} t={open} onClose={() => setOpenId(null)} onToast={setToast} /> : null}
      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  );
}
