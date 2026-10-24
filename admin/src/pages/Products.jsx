import { useState } from 'react';
import { Drawer, Empty, Field, Tabs, Toast } from '../components';
import { set as setRecord, update } from '../backend';
import { inr } from '../lib/data';

const CATEGORIES = ['Purifiers', 'Dispensers', 'Pumps', 'Filters', 'Spares'];
const BLANK = { name: '', category: 'Purifiers', price: '', mrp: '', dealerPrice: '', moq: 5, stock: 50, image: '', description: '', rating: 4.3, active: true };

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);

function ProductDrawer({ product, onClose, onToast }) {
  const isNew = !product.id;
  const [p, setP] = useState({ ...BLANK, ...product, specsText: Object.entries(product.specs || {}).map(([k, v]) => `${k}: ${v}`).join('\n') });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setP({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    const num = (v) => Number(v) || 0;
    if (num(p.dealerPrice) >= num(p.price)) return onToast('Dealer price should be lower than the retail price.');
    setBusy(true);
    try {
      const specs = Object.fromEntries(p.specsText.split('\n').map((l) => l.split(':')).filter((a) => a.length > 1).map(([k, ...v]) => [k.trim(), v.join(':').trim()]));
      const data = {
        name: p.name.trim(), category: p.category, image: p.image.trim(), description: p.description.trim(),
        price: num(p.price), mrp: num(p.mrp) || num(p.price), dealerPrice: num(p.dealerPrice), moq: num(p.moq) || 1,
        stock: num(p.stock), rating: num(p.rating), active: !!p.active, specs, updatedAt: 'now',
      };
      if (isNew) await setRecord('products', `${p.category.slice(0, 3).toLowerCase()}-${slug(p.name)}`, { ...data, createdAt: 'now' });
      else await update('products', product.id, data);
      onToast(`${data.name} saved`);
      onClose();
    } catch (err) {
      onToast('Error: ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer title={isNew ? 'Add product' : p.name} onClose={onClose} footer={<button form="pform" className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>}>
      <form id="pform" onSubmit={save}>
        {p.image ? <img src={p.image} alt="" className="preview" /> : null}
        <Field label="Name"><input required value={p.name} onChange={set('name')} /></Field>
        <div className="row-2">
          <Field label="Category"><select value={p.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Stock"><input type="number" min="0" value={p.stock} onChange={set('stock')} /></Field>
        </div>
        <div className="row-3">
          <Field label="Retail price ₹"><input required type="number" min="1" value={p.price} onChange={set('price')} /></Field>
          <Field label="MRP ₹"><input type="number" min="0" value={p.mrp} onChange={set('mrp')} /></Field>
          <Field label="Dealer price ₹"><input required type="number" min="1" value={p.dealerPrice} onChange={set('dealerPrice')} /></Field>
        </div>
        <div className="row-2">
          <Field label="Dealer MOQ"><input type="number" min="1" value={p.moq} onChange={set('moq')} /></Field>
          <Field label="Rating"><input type="number" step="0.1" min="0" max="5" value={p.rating} onChange={set('rating')} /></Field>
        </div>
        <Field label="Image URL (Cloudinary / ImgBB / /products/…)"><input required value={p.image} onChange={set('image')} placeholder="https://res.cloudinary.com/…" /></Field>
        <Field label="Description"><textarea rows={3} value={p.description} onChange={set('description')} /></Field>
        <Field label="Specifications (one per line, Key: Value)"><textarea rows={5} value={p.specsText} onChange={set('specsText')} className="mono" /></Field>
        <label className="check"><input type="checkbox" checked={!!p.active} onChange={set('active')} /> Visible in the app</label>
      </form>
    </Drawer>
  );
}

export default function Products({ products }) {
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState('');
  const list = products.docs
    .filter((p) => (cat === 'All' || p.category === cat) && (!q || p.name.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name));

  const quickStock = async (p, stock) => {
    await update('products', p.id, { stock: Math.max(0, Number(stock) || 0), updatedAt: 'now' });
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Products</h1>
          <p className="muted">{products.docs.length} products in catalog</p>
        </div>
        <div className="filters">
          <input className="search" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn primary" onClick={() => setEditing({})}>+ Add product</button>
        </div>
      </header>
      <Tabs value={cat} onChange={setCat} options={['All', ...CATEGORIES].map((c) => ({ value: c, label: c, count: c === 'All' ? products.docs.length : products.docs.filter((p) => p.category === c).length }))} />
      <div className="card flush">
        {!list.length ? <Empty>{products.loading ? 'Loading…' : 'No products. Run the seed script (see README).'}</Empty> : (
          <table className="table">
            <thead><tr><th /><th>Product</th><th>Category</th><th className="right">Retail</th><th className="right">Dealer</th><th className="right">MOQ</th><th>Stock</th><th>Status</th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="clickable" onClick={() => setEditing(p)}>
                  <td><img src={p.image} alt="" className="thumb" loading="lazy" /></td>
                  <td><strong>{p.name}</strong><div className="muted small mono">{p.id}</div></td>
                  <td>{p.category}</td>
                  <td className="right">{inr(p.price)}</td>
                  <td className="right dealer-price">{inr(p.dealerPrice)}</td>
                  <td className="right">{p.moq}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input className={`stock-input ${p.stock < 10 ? 'low' : ''}`} type="number" min="0" defaultValue={p.stock} onBlur={(e) => +e.target.value !== p.stock && quickStock(p, e.target.value)} aria-label={`Stock for ${p.name}`} />
                  </td>
                  <td>{p.active === false ? <span className="badge badge-cancelled">hidden</span> : <span className="badge badge-delivered">live</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {editing ? <ProductDrawer key={editing.id || 'new'} product={editing} onClose={() => setEditing(null)} onToast={setToast} /> : null}
      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  );
}
