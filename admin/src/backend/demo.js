// Demo backend for the admin panel: sample store data kept in this browser's
// localStorage, so the deployed panel works without a Firebase project.
import { catalog } from '../../scripts/catalog.mjs';

const KEY = 'pureflow-admin-demo-v1';
const ADMIN = { email: 'admin@pureflow.test', password: 'Admin@123', uid: 'demo-admin' };

const now = () => new Date().toISOString();
const at = (daysAgo, hour = 11, min = 15) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
};
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ------------------------------------------------------------- sample data
function seed() {
  const products = Object.fromEntries(catalog.map(({ look, ...p }) => [p.id, { ...p, image: `/products/${p.id}.jpg`, active: true }]));
  const byId = (id) => products[id];

  const customers = [
    ['c1', 'Priya Nair', 'priya.nair@example.com', '9876543210', { line1: '42, 12th Main, Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038', lat: 12.9719, lng: 77.6412 }],
    ['c2', 'Arjun Sharma', 'arjun.s@example.com', '9810012345', { line1: 'B-14, Sector 22', city: 'Noida', state: 'Uttar Pradesh', pincode: '201301', lat: 28.5965, lng: 77.3486 }],
    ['c3', 'Meera Iyer', 'meera.iyer@example.com', '9840098400', { line1: '7, TTK Road, Alwarpet', city: 'Chennai', state: 'Tamil Nadu', pincode: '600018', lat: 13.0339, lng: 80.2541 }],
    ['c4', 'Rohit Deshmukh', 'rohit.d@example.com', '9822098220', { line1: 'Flat 304, Baner Road', city: 'Pune', state: 'Maharashtra', pincode: '411045', lat: 18.559, lng: 73.7868 }],
    ['c5', 'Sneha Reddy', 'sneha.r@example.com', '9900990099', { line1: 'Plot 21, Jubilee Hills', city: 'Hyderabad', state: 'Telangana', pincode: '500033', lat: 17.4326, lng: 78.4071 }],
  ];
  const dealers = [
    ['d1', 'Rahul Mehta', 'dealer@pureflow.test', '9822012345', 'Mehta Water Solutions', '27AAPFM1234C1Z5', 'approved', { line1: 'Shop 7, Lamington Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400007', lat: 18.9596, lng: 72.8196 }, 60],
    ['d2', 'Kavita Rao', 'newdealer@pureflow.test', '9845098450', 'Rao Aqua Traders', '29AAKFR5678D1Z2', 'pending', { city: 'Mysuru', state: 'Karnataka' }, 1],
    ['d3', 'Imran Qureshi', 'imran@aquacare.example', '9829098290', 'AquaCare Distributors', '08AAHFA4321K1Z9', 'pending', { city: 'Jaipur', state: 'Rajasthan' }, 0],
    ['d4', 'Suresh Pillai', 'suresh@kochiro.example', '9847098470', 'Kochi RO Point', '', 'rejected', { city: 'Kochi', state: 'Kerala' }, 9],
  ];

  const users = {};
  customers.forEach(([id, name, email, phone, address], i) => {
    users[id] = { role: 'customer', name, email, phone, address, createdAt: at(30 - i * 4) };
  });
  dealers.forEach(([id, name, email, phone, businessName, gstin, dealerStatus, address, days]) => {
    users[id] = {
      role: 'dealer', name, email, phone, businessName, gstin, dealerStatus, address, createdAt: at(days, 10),
      ...(dealerStatus === 'rejected' ? { rejectionReason: 'GSTIN not provided; please re-apply with GST details.', reviewedBy: ADMIN.email, reviewedAt: at(8) } : {}),
      ...(dealerStatus === 'approved' ? { reviewedBy: ADMIN.email, reviewedAt: at(58) } : {}),
    };
  });

  const flow = ['placed', 'confirmed', 'shipped', 'delivered'];
  let n = 10000100;
  const orders = {};
  const order = (uid, items, status, daysAgo, hour, payment) => {
    const u = users[uid];
    const channel = u.role === 'dealer' ? 'dealer' : 'retail';
    const lines = items.map(([pid, qty]) => {
      const p = byId(pid);
      return { productId: pid, name: p.name, image: p.image, category: p.category, price: channel === 'dealer' ? p.dealerPrice : p.price, qty };
    });
    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const discountRate = channel === 'dealer' ? (subtotal >= 100000 ? 0.05 : subtotal >= 50000 ? 0.03 : 0) : 0;
    const discount = Math.round(subtotal * discountRate);
    const shipping = channel === 'dealer' || subtotal >= 999 ? 0 : 79;
    const total = subtotal - discount + shipping;
    n += 1;
    const history = status === 'cancelled'
      ? [{ status: 'placed', at: at(daysAgo, hour) }, { status: 'cancelled', at: at(daysAgo, hour + 3), by: 'customer' }]
      : flow.slice(0, flow.indexOf(status) + 1).map((s, i) => ({ status: s, at: at(Math.max(daysAgo - i, 0), hour + i), ...(i ? { by: 'admin' } : {}) }));
    orders[`o${n}`] = {
      orderNo: `PF${n}`, userId: uid, customerName: u.name, customerEmail: u.email, customerPhone: u.phone,
      businessName: u.businessName || null, channel, items: lines, itemCount: lines.reduce((s, l) => s + l.qty, 0),
      subtotal, discount, discountRate, shipping, total, gst: Math.round(total - total / 1.18),
      address: u.address, note: '', payment, status, statusHistory: history,
      ...(status === 'cancelled' ? { cancelReason: 'Customer changed mind' } : {}),
      ...(['shipped', 'delivered'].includes(status) ? { tracking: { carrier: 'Delhivery', number: `DLV${n}IN` } } : {}),
      createdAt: at(daysAgo, hour),
    };
  };
  const paid = () => ({ method: 'razorpay', status: 'paid', razorpayPaymentId: `pay_demo${newId()}`, mode: 'test' });
  const cod = () => ({ method: 'cod', status: 'pending' });
  order('c1', [['pur-elite-ro-uv-uf', 1], ['spr-tds-meter', 1]], 'delivered', 6, 10, paid());
  order('d1', [['flt-ro-membrane-80', 50], ['flt-sediment-10', 100], ['spr-smps-24v', 50]], 'delivered', 6, 15, paid());
  order('c2', [['pur-smart-iot-ro', 1]], 'delivered', 5, 12, paid());
  order('c3', [['flt-service-kit', 1], ['spr-ro-faucet-ss', 1]], 'shipped', 4, 9, cod());
  order('c4', [['dis-hot-cold-floor', 1]], 'cancelled', 4, 18, cod());
  order('d1', [['pur-classic-ro-7l', 10], ['pmp-ro-booster-100', 20]], 'shipped', 3, 11, { method: 'credit', status: 'credit' });
  order('c5', [['pur-nova-ro-alkaline', 1], ['flt-alkaline-cartridge', 2]], 'confirmed', 2, 16, paid());
  order('c1', [['dis-electric-bottle-pump', 2]], 'delivered', 2, 19, cod());
  order('c2', [['pmp-pressure-booster-home', 1]], 'confirmed', 1, 10, paid());
  order('d1', [['pur-aqua-max-ro-copper', 5], ['flt-mineral-cartridge', 50]], 'placed', 0, 9, paid());
  order('c3', [['pur-gravity-classic-23l', 1]], 'placed', 0, 11, cod());
  order('c4', [['pur-under-sink-ro', 1]], 'placed', 0, 13, paid());

  const tickets = {};
  const ticket = (no, uid, type, product, issue, status, daysAgo, slot, tech, note) => {
    const u = users[uid];
    const pref = new Date(at(daysAgo - 2));
    tickets[`t${no}`] = {
      ticketNo: `SR${no}`, userId: uid, name: u.name, email: u.email, phone: u.phone, role: u.role, type, product, issue,
      preferredDate: pref.toISOString().slice(0, 10), slot, address: u.address, status,
      ...(tech ? { technician: tech } : {}), ...(note ? { adminNote: note } : {}),
      history: [{ status: 'open', at: at(daysAgo) }, ...(status !== 'open' ? [{ status, at: at(Math.max(daysAgo - 1, 0), 16), by: 'admin' }] : [])],
      createdAt: at(daysAgo, 9),
    };
  };
  ticket(1000101, 'c1', 'Installation', 'PureFlow Elite RO+UV+UF 10L', '', 'resolved', 5, '12 PM - 3 PM', { name: 'Ravi Kumar', phone: '9876500011' }, 'Installed and demoed. Output TDS 45 ppm.');
  ticket(1000102, 'c2', 'Installation', 'PureFlow Smart IoT RO+UV 10L', 'Please bring a longer inlet pipe.', 'assigned', 3, '9 AM - 12 PM', { name: 'Anita Sharma', phone: '9876500022' });
  ticket(1000103, 'c5', 'Repair', 'PureFlow Nova Alkaline RO 9L', 'Water flow has become very slow and the tank fills overnight.', 'open', 1, '3 PM - 6 PM');
  ticket(1000104, 'c3', 'AMC / Annual service', 'PureFlow Classic RO 7L', 'Yearly maintenance due.', 'open', 0, '12 PM - 3 PM');
  ticket(1000105, 'c4', 'Water quality test', 'Borewell supply', 'Water tastes salty, want a TDS test before buying a purifier.', 'in_progress', 2, '9 AM - 12 PM', { name: 'Mohammed Irfan', phone: '9876500033' });

  users[ADMIN.uid] = { role: 'admin', name: 'Store Admin', email: ADMIN.email, phone: '9000000001', createdAt: at(90) };
  return { users, products, orders, serviceRequests: tickets, notifications: {}, session: null };
}

// ------------------------------------------------------------- store
let db;
try {
  db = JSON.parse(localStorage.getItem(KEY)) || seed();
} catch {
  db = seed();
}
const listeners = new Set();
const authListeners = new Set();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // storage full or blocked: keep working in memory
  }
  listeners.forEach((fn) => fn());
}

const rows = (name) => Object.entries(db[name]).map(([id, d]) => ({ id, ...structuredClone(d) }));
const stamp = (data) => {
  const out = { ...data };
  for (const k of ['createdAt', 'updatedAt', 'reviewedAt']) if (out[k] === 'now') out[k] = now();
  return out;
};
const authUser = () => (db.session ? { uid: db.session, email: db.users[db.session]?.email } : null);

// ------------------------------------------------------------- API
export function onAuth(cb) {
  authListeners.add(cb);
  queueMicrotask(() => cb(authUser()));
  return () => authListeners.delete(cb);
}

export async function signIn(email, password) {
  await new Promise((r) => setTimeout(r, 300));
  if (email.trim().toLowerCase() !== ADMIN.email || password !== ADMIN.password) {
    const e = new Error('Incorrect email or password.');
    e.code = 'auth/invalid-credential';
    throw e;
  }
  db.session = ADMIN.uid;
  save();
  authListeners.forEach((fn) => fn(authUser()));
}

export async function signOut() {
  db.session = null;
  save();
  authListeners.forEach((fn) => fn(null));
}

export const getProfile = async (uid) => structuredClone(db.users[uid] || null);
export const getIdToken = async () => null;

export function watchAll(name, cb) {
  const run = () => cb(rows(name));
  listeners.add(run);
  queueMicrotask(run);
  return () => listeners.delete(run);
}

export async function add(name, data) {
  const id = newId();
  db[name][id] = stamp(data);
  save();
  return id;
}

export async function update(name, id, patch) {
  if (!db[name][id]) throw new Error('Not found');
  Object.assign(db[name][id], stamp(patch));
  save();
}

export async function set(name, id, data) {
  db[name][id] = stamp(data);
  save();
}

export function resetDemo() {
  const session = db.session;
  db = seed();
  db.session = session;
  save();
}
