import { useMemo, useState } from 'react';
import { useSellerAuth } from '../auth/SellerAuthContext';
import { addProduct, productsBySeller, updateProduct, loadProducts, deleteProduct } from '../products/productService';
import { loadOrders, updateOrderStatus } from '../orders/orderService';

function SellerDashboard() {
  const { current, logout } = useSellerAuth();
  const [tab, setTab] = useState('dashboard');
  const [form, setForm] = useState({ name: '', category: 'fruit', price: '', inventory: '', description: '', tags: '', images: [] });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', category: 'fruit', price: '', inventory: '', description: '', tags: '', images: [] });
  const [myProducts, setMyProducts] = useState(() => (current ? productsBySeller(current.id) : []));
  const [message, setMessage] = useState('');
  const [revTooltip, setRevTooltip] = useState(null);

  const orders = loadOrders();
  const productsMap = useMemo(() => new Map(loadProducts().map((p) => [p.id, p])), []);
  const sellerId = current?.id;
  const myOrderItems = useMemo(() => {
    const list = [];
    orders.forEach((o) => {
      const placedAt = o.createdAt || o.placedAt;
      const status = o.orderStatus || o.status || 'processing';
      (o.items || []).forEach((i) => {
        const pid = i.productId || i.id;
        const prod = productsMap.get(pid);
        const qty = i.quantity || i.qty || 0;
        const price = i.price || (prod ? prod.price : 0);
        if (prod && sellerId && prod.sellerId === sellerId) {
          list.push({ orderId: o.id, placedAt, status, productId: pid, name: prod.name, qty, price });
        }
      });
    });
    return list;
  }, [orders, productsMap, sellerId]);

  const stats = {
    products: myProducts.length,
    inventory: myProducts.reduce((sum, p) => sum + (Number(p.inventory || p.quantity || 0)), 0),
    orders: myOrderItems.length,
    revenue: myOrderItems.reduce((sum, i) => sum + i.price * i.qty, 0),
  };

  const byDay = useMemo(() => {
    const map = new Map();
    myOrderItems.forEach((i) => {
      const d = new Date(i.placedAt || Date.now());
      const key = d.toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + i.qty);
    });
    const keys = Array.from(map.keys()).sort();
    const days = keys.slice(Math.max(0, keys.length - 7));
    const max = days.reduce((m, k) => Math.max(m, map.get(k)), 0) || 1;
    return days.map((k) => {
      const dt = new Date(k);
      const wds = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      return { day: k.slice(5), label: wds[dt.getDay()], value: map.get(k), pct: Math.round((map.get(k) / max) * 100) };
    });
  }, [myOrderItems]);

  const revenueSeries = useMemo(() => {
    const map = new Map();
    myOrderItems.forEach((i) => {
      const d = new Date(i.placedAt || Date.now());
      const key = d.toISOString().slice(0, 10);
      const val = i.price * i.qty;
      map.set(key, (map.get(key) || 0) + val);
    });
    const keys = Array.from(map.keys()).sort();
    const days = keys.slice(Math.max(0, keys.length - 7));
    const max = days.reduce((m, k) => Math.max(m, map.get(k)), 0) || 1;
    return {
      days,
      max,
      points: days.map((k) => {
        const dt = new Date(k);
        const wds = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        return { label: wds[dt.getDay()], value: map.get(k) };
      }),
    };
  }, [myOrderItems]);

  const ordersLineSeries = useMemo(() => {
    const points = byDay.map((d) => ({ label: d.label, value: d.value }));
    const max = points.reduce((m, p) => Math.max(m, p.value), 0) || 1;
    return { max, points };
  }, [byDay]);

  const revenueByCategory = useMemo(() => {
    const map = new Map();
    let total = 0;
    myOrderItems.forEach((i) => {
      const prod = productsMap.get(i.productId);
      const cat = (prod && prod.category) ? prod.category : 'other';
      const val = i.price * i.qty;
      total += val;
      map.set(cat, (map.get(cat) || 0) + val);
    });
    const entries = Array.from(map.entries()).map(([label, value]) => ({ label, value }));
    return { total, entries };
  }, [myOrderItems, productsMap]);

  const topProducts = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0,0,0,0);
    start.setDate(now.getDate() - 6);
    const map = new Map();
    myOrderItems.forEach((i) => {
      const dt = new Date(i.placedAt || Date.now());
      if (dt >= start) {
        const key = i.name || String(i.productId);
        map.set(key, (map.get(key) || 0) + i.qty);
      }
    });
    const list = Array.from(map.entries()).map(([name, qty]) => ({ name, qty }));
    list.sort((a, b) => b.qty - a.qty);
    const top = list.slice(0, 5);
    const max = top.reduce((m, x) => Math.max(m, x.qty), 0) || 1;
    return top.map((x) => ({ ...x, pct: Math.round((x.qty / max) * 100) }));
  }, [myOrderItems]);

  const weekAgg = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0,0,0,0);
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    let units = 0, revenue = 0;
    myOrderItems.forEach((i) => {
      const dt = new Date(i.placedAt || Date.now());
      if (dt >= start && dt < end) { units += i.qty; revenue += i.price * i.qty; }
    });
    return { units, revenue };
  }, [myOrderItems]);

  const prevWeekAgg = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0,0,0,0);
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    let units = 0, revenue = 0;
    myOrderItems.forEach((i) => {
      const dt = new Date(i.placedAt || Date.now());
      if (dt >= start && dt < end) { units += i.qty; revenue += i.price * i.qty; }
    });
    return { units, revenue };
  }, [myOrderItems]);

  if (!current) {
    return (
      <main className="Container">
        <h2>Seller Dashboard</h2>
        <p>Please login to manage your products.</p>
      </main>
    );
  }

  const submitProduct = (e) => {
    e.preventDefault();
    const created = addProduct({
      name: form.name,
      category: form.category,
      price: form.price,
      inventory: form.inventory,
      description: form.description,
      tags: form.tags,
      images: (form.images || []).slice(0, 5),
      sellerId: current.id,
    });
    setMyProducts([created, ...myProducts]);
    setForm({ name: '', category: 'fruit', price: '', inventory: '', description: '', tags: '', images: [] });
    setMessage('Product added');
    setTimeout(() => setMessage(''), 1500);
  };

  const saveProduct = (p) => {
    const updated = updateProduct(p.id, { price: Number(p.price), inventory: Number(p.inventory) });
    setMyProducts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    setMessage('Product updated');
    setTimeout(() => setMessage(''), 1500);
  };

  const toDataUrls = async (fileList) => {
    const files = Array.from(fileList || []).slice(0, 5);
    const readers = files.map((f) => new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error('read'));
      r.readAsDataURL(f);
    }));
    try {
      const urls = await Promise.all(readers);
      return urls;
    } catch {
      return [];
    }
  };

  const addFormImages = async (files) => {
    const urls = await toDataUrls(files);
    setForm((prev) => ({ ...prev, images: [...(prev.images || []), ...urls].slice(0, 5) }));
  };

  const removeFormImage = (idx) => {
    setForm((prev) => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== idx) }));
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditForm({
      name: p.name || '',
      category: p.category || 'fruit',
      price: p.price || '',
      inventory: (p.inventory ?? p.quantity ?? ''),
      description: p.description || '',
      tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
      images: (p.images || []).slice(0, 5),
    });
  };

  const addEditImages = async (files) => {
    const urls = await toDataUrls(files);
    setEditForm((prev) => ({ ...prev, images: [...(prev.images || []), ...urls].slice(0, 5) }));
  };

  const removeEditImage = (idx) => {
    setEditForm((prev) => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== idx) }));
  };

  const saveEdit = () => {
    const updated = updateProduct(editingId, {
      name: editForm.name,
      category: editForm.category,
      price: Number(editForm.price),
      inventory: Number(editForm.inventory),
      description: editForm.description,
      tags: Array.isArray(editForm.tags) ? editForm.tags : String(editForm.tags || '').split(',').map((s) => s.trim()).filter(Boolean),
      images: (editForm.images || []).slice(0, 5),
      image: (editForm.images || [])[0] || null,
    });
    setMyProducts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    setEditingId(null);
    setMessage('Product updated');
    setTimeout(() => setMessage(''), 1500);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const removeProduct = (id) => {
    deleteProduct(id);
    setMyProducts((prev) => prev.filter((x) => x.id !== id));
    if (editingId === id) setEditingId(null);
    setMessage('Product deleted');
    setTimeout(() => setMessage(''), 1500);
  };

  const advanceOrderStatus = (orderId, currentStatus) => {
    const next = currentStatus === 'processing' ? 'packed' : (currentStatus === 'packed' ? 'shipped' : null);
    if (!next) return;
    updateOrderStatus(orderId, next);
    setMessage(`Order #${orderId} marked ${next}`);
    setTimeout(() => setMessage(''), 1500);
  };


  return (
    <main className="Container">
      <div className="SellerLayout">
        <aside className="Sidebar">
          <div className="SidebarHeader">
            <h3 style={{ margin: 0 }}>Seller</h3>
            <p className="Muted" style={{ margin: 0 }}>{current.name}</p>
          </div>
          <nav className="Menu">
            <button className={`MenuItem ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>Dashboard</button>
            <button className={`MenuItem ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>Products</button>
            <button className={`MenuItem ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>Orders</button>
          </nav>
          <button className="BtnOutline" onClick={logout} style={{ marginTop: '1rem', width: '100%' }}>Logout</button>
        </aside>
        <section className="Content">
          {message && <p style={{ color: '#16a34a' }}>{message}</p>}
          {tab === 'dashboard' && (
            <div>
              <h2 className="SectionTitle">Dashboard</h2>
              <div className="StatGrid">
                <div className="StatCard"><div className="StatLabel">Products</div><div className="StatValue">{stats.products}</div></div>
                <div className="StatCard"><div className="StatLabel">Inventory</div><div className="StatValue">{stats.inventory}</div></div>
                <div className="StatCard"><div className="StatLabel">Orders</div><div className="StatValue">{stats.orders}</div></div>
                <div className="StatCard"><div className="StatLabel">Revenue</div><div className="StatValue">GHS {stats.revenue.toFixed(2)}</div></div>
              </div>
              <div className="Card" style={{ marginTop: '1rem' }}>
                <div className="CardBody">
                  <h3 style={{ marginTop: 0 }}>Orders (last 7 days)</h3>
                  <div className="ChartBars">
                    {byDay.length === 0 ? (
                      <p className="Muted">No recent orders.</p>
                    ) : (
                      byDay.map((d) => (
                        <div key={d.day} className="BarRow" title={`${d.label} • ${d.value}`}>
                          <span className="BarLabel">{d.label}</span>
                          <div className="Bar"><div className="BarFill" style={{ width: `${d.pct}%` }}></div></div>
                          <span className="BarValue">{d.value}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div className="Card" style={{ marginTop: '1rem' }}>
                <div className="CardBody">
                  <h3 style={{ marginTop: 0 }}>Weekly</h3>
                  <div className="StatGrid">
                    <div className="StatCard">
                      <div className="StatLabel">Units (this week)</div>
                      <div className="StatValue">{weekAgg.units}</div>
                      <div className="Muted">vs last week {prevWeekAgg.units > 0 ? `${Math.round(((weekAgg.units - prevWeekAgg.units) / Math.max(prevWeekAgg.units, 1)) * 100)}%` : '—'}</div>
                    </div>
                    <div className="StatCard">
                      <div className="StatLabel">Revenue (this week)</div>
                      <div className="StatValue">GHS {weekAgg.revenue.toFixed(2)}</div>
                      <div className="Muted">vs last week {prevWeekAgg.revenue > 0 ? `${Math.round(((weekAgg.revenue - prevWeekAgg.revenue) / Math.max(prevWeekAgg.revenue, 1)) * 100)}%` : '—'}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="Card" style={{ marginTop: '1rem' }}>
                <div className="CardBody">
                  <h3 style={{ marginTop: 0 }}>Revenue by Category</h3>
                  {revenueByCategory.entries.length === 0 ? (
                    <p className="Muted">No data.</p>
                  ) : (
                    <div className="Chart" style={{ display: 'grid', gap: '0.75rem', justifyItems: 'center' }}>
                      {(function(){
                        const w = 240, h = 240, cx = w/2, cy = h/2, r = 90;
                        const total = revenueByCategory.total || 1;
                        const palette = ['#16a34a','#f59e0b','#3b82f6','#ef4444','#8b5cf6','#22c55e'];
                        let a0 = -Math.PI/2;
                        const slices = revenueByCategory.entries.map((e, idx) => {
                          const ang = (e.value / total) * Math.PI * 2;
                          const a1 = a0 + ang;
                          const x0 = cx + r * Math.cos(a0);
                          const y0 = cy + r * Math.sin(a0);
                          const x1 = cx + r * Math.cos(a1);
                          const y1 = cy + r * Math.sin(a1);
                          const large = ang > Math.PI ? 1 : 0;
                          const d = `M ${cx},${cy} L ${x0},${y0} A ${r},${r} 0 ${large} 1 ${x1},${y1} Z`;
                          const fill = palette[idx % palette.length];
                          a0 = a1;
                          return { d, fill, label: e.label, value: e.value };
                        });
                        return (
                          <>
                            <svg className="PieSvg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
                              {slices.map((s, i) => (
                                <path key={i} d={s.d} style={{ fill: s.fill }} title={`${s.label} • GHS ${s.value.toFixed(2)}`} />
                              ))}
                              <circle cx={cx} cy={cy} r={50} style={{ fill: '#fff' }} />
                            </svg>
                            <div className="Legend">
                              {revenueByCategory.entries.map((e, idx) => (
                                <div key={idx} className="LegendItem">
                                  <span className="LegendSwatch" style={{ background: palette[idx % palette.length] }}></span>
                                  <span>{e.label}</span>
                                  <strong>GHS {e.value.toFixed(2)}</strong>
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
              <div className="Card" style={{ marginTop: '1rem' }}>
                <div className="CardBody">
                  <h3 style={{ marginTop: 0 }}>Top Products (last 7 days)</h3>
                  {topProducts.length === 0 ? (
                    <p className="Muted">No top products yet.</p>
                  ) : (
                    <div className="ChartBars">
                      {topProducts.map((p) => (
                        <div key={p.name} className="BarRow">
                          <span className="BarLabel" title={p.name}>{p.name.length > 8 ? `${p.name.slice(0,8)}…` : p.name}</span>
                          <div className="Bar"><div className="BarFill" style={{ width: `${p.pct}%` }}></div></div>
                          <span className="BarValue">{p.qty}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="Card" style={{ marginTop: '1rem' }}>
                <div className="CardBody">
                  <h3 style={{ marginTop: 0 }}>Revenue (last 7 days)</h3>
                  {revenueSeries.points.length === 0 ? (
                    <p className="Muted">No recent revenue.</p>
                  ) : (
                    <div className="Chart" style={{ position: 'relative' }}>
                      {(function(){
                        const w = 600, h = 160, pad = 12;
                        const max = revenueSeries.max || 1;
                        const n = revenueSeries.points.length;
                        const xs = revenueSeries.points.map((_, i) => (n > 1 ? (i/(n-1)) : 0) * (w - 2*pad) + pad);
                        const ys = revenueSeries.points.map((p) => h - pad - (p.value / max) * (h - 2*pad));
                        const pts = xs.map((x, i) => `${Math.round(x)},${Math.round(ys[i])}`).join(' ');
                        const areaPts = [`${pad},${h-pad}`, pts, `${w-pad},${h-pad}`].join(' ');
                        return (
                          <>
                            <svg className="ChartSvg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
                              <polyline points={areaPts} className="ChartArea" />
                              <polyline points={pts} className="ChartLine" />
                              {xs.map((x, i) => (
                                <circle
                                  key={i}
                                  cx={x}
                                  cy={ys[i]}
                                  r={2.5}
                                  className="ChartDot"
                                  onMouseEnter={() => setRevTooltip({ label: revenueSeries.points[i].label, value: revenueSeries.points[i].value, leftPct: (x / w) * 100, topPct: (ys[i] / h) * 100 })}
                                  onMouseLeave={() => setRevTooltip(null)}
                                />
                              ))}
                            </svg>
                            {revTooltip && (
                              <div className="Tooltip" style={{ left: `${revTooltip.leftPct}%`, top: `${revTooltip.topPct}%` }}>
                                <div className="TooltipInner">
                                  <div>{revTooltip.label}</div>
                                  <div>GHS {revTooltip.value.toFixed(2)}</div>
                                </div>
                              </div>
                            )}
                            <div className="ChartAxis">
                              {revenueSeries.points.map((p, i) => (
                                <div key={i} className="AxisTick">
                                  <span className="AxisLabel">{p.label}</span>
                                  <span className="AxisValue">GHS {p.value.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
              <div className="Card" style={{ marginTop: '1rem' }}>
                <div className="CardBody">
                  <h3 style={{ marginTop: 0 }}>Orders (last 7 days)</h3>
                  {ordersLineSeries.points.length === 0 ? (
                    <p className="Muted">No recent orders.</p>
                  ) : (
                    <div className="Chart">
                      {(function(){
                        const w = 600, h = 160, pad = 12;
                        const max = ordersLineSeries.max || 1;
                        const n = ordersLineSeries.points.length;
                        const xs = ordersLineSeries.points.map((_, i) => (n > 1 ? (i/(n-1)) : 0) * (w - 2*pad) + pad);
                        const ys = ordersLineSeries.points.map((p) => h - pad - (p.value / max) * (h - 2*pad));
                        const pts = xs.map((x, i) => `${Math.round(x)},${Math.round(ys[i])}`).join(' ');
                        const areaPts = [`${pad},${h-pad}`, pts, `${w-pad},${h-pad}`].join(' ');
                        return (
                          <>
                            <svg className="ChartSvg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
                              <polyline points={areaPts} className="ChartArea" />
                              <polyline points={pts} className="ChartLine" />
                              {xs.map((x, i) => (
                                <circle key={i} cx={x} cy={ys[i]} r={2.5} className="ChartDot" />
                              ))}
                            </svg>
                            <div className="ChartAxis">
                              {ordersLineSeries.points.map((p, i) => (
                                <div key={i} className="AxisTick">
                                  <span className="AxisLabel">{p.label}</span>
                                  <span className="AxisValue">{p.value}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {tab === 'products' && (
            <div>
              <h2 className="SectionTitle">Products</h2>
              <div className="Card">
                <div className="CardBody">
                  <h3 style={{ marginTop: 0 }}>Add Product</h3>
                  <form onSubmit={submitProduct} className="Form" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    <label>
                      Name
                      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    </label>
                    <label>
                      Category
                      <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                        <option value="fruit">Fruit</option>
                        <option value="vegetable">Vegetable</option>
                      </select>
                    </label>
                    <label>
                      Price (GHS)
                      <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                    </label>
                    <label>
                      Inventory
                      <input type="number" value={form.inventory} onChange={(e) => setForm({ ...form, inventory: e.target.value })} required />
                    </label>
                    <label style={{ gridColumn: '1 / span 2' }}>
                      Description
                      <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </label>
                    <label style={{ gridColumn: '1 / span 2' }}>
                      Tags (comma-separated)
                      <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                    </label>
                    <div style={{ gridColumn: '1 / span 2' }}>
                      <label>
                        Upload Images (max 5)
                        <input type="file" accept="image/*" multiple onChange={(e) => addFormImages(e.target.files)} />
                      </label>
                      {(form.images || []).length > 0 && (
                        <div className="Thumbs" style={{ marginTop: '0.5rem' }}>
                          {(form.images || []).map((src, idx) => (
                            <div key={idx} className="Thumb">
                              <img src={src} alt={`img-${idx}`} onError={(e) => { e.currentTarget.src = 'https://placehold.co/80x80'; }} />
                              <button type="button" className="BtnOutline" onClick={() => removeFormImage(idx)}>Remove</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ gridColumn: '1 / span 2' }}>
                      <button className="Btn" type="submit">Add</button>
                    </div>
                  </form>
                </div>
              </div>

              <h3 style={{ marginTop: '1rem' }}>My Products</h3>
              {myProducts.length === 0 ? (
                <p className="Muted">No products yet.</p>
              ) : (
                <div className="Grid">
                  {myProducts.map((p) => (
                    <div className="Card" key={p.id}>
                      <img
                        src={(function(){
                          const base = p.image || (p.images && p.images[0]) || 'https://placehold.co/400x300?text=Product';
                          if (typeof base === 'string' && base.startsWith('http')) {
                            const hostPath = base.replace(/^https?:\/\//, '');
                            return `https://images.weserv.nl/?url=${hostPath}&w=400&h=300&fit=cover`;
                          }
                          return base;
                        })()}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x300?text=Product'; }}
                      />
                      <div className="CardBody">
                        <h3>{p.name}</h3>
                        <p className="Muted">{p.category}</p>
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                          <label>
                            Price (GHS)
                            <input type="number" step="0.01" value={p.price} onChange={(e) => setMyProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, price: e.target.value } : x))} />
                          </label>
                          <label>
                            Inventory
                            <input type="number" value={p.inventory || 0} onChange={(e) => setMyProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, inventory: e.target.value } : x))} />
                          </label>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="Btn" onClick={() => saveProduct(p)}>Save</button>
                          <button className="BtnOutline" onClick={() => startEdit(p)}>Edit</button>
                          <button className="BtnDanger" onClick={() => removeProduct(p.id)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === 'orders' && (
            <div>
              <h2 className="SectionTitle">Orders</h2>
              {myOrderItems.length === 0 ? (
                <p className="Muted">No orders yet.</p>
              ) : (
                <div className="Orders">
                  {myOrderItems.map((i) => (
                    <div className="OrderCard" key={`${i.orderId}-${i.productId}`}>
                      <div className="OrderHeader">
                        <strong>Order #{i.orderId}</strong>
                        <span>{new Date(i.placedAt).toLocaleString()}</span>
                      </div>
                      <div>
                        {i.name} × {i.qty} — GHS { (i.price * i.qty).toFixed(2) }
                      </div>
                      <div className="OrderTotal">Status: {i.status}</div>
                      {(i.status === 'processing' || i.status === 'packed') && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                          {i.status === 'processing' && (
                            <button className="Btn" onClick={() => advanceOrderStatus(i.orderId, i.status)}>Mark Packed</button>
                          )}
                          {i.status === 'packed' && (
                            <button className="Btn" onClick={() => advanceOrderStatus(i.orderId, i.status)}>Ship</button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
      {editingId && (
        <div className="EditOverlay">
          <div className="EditModal Card">
            <div className="CardBody">
              <h3 style={{ marginTop: 0 }}>Edit Product</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <label>
                  Name
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                </label>
                <label>
                  Category
                  <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>
                    <option value="fruit">Fruit</option>
                    <option value="vegetable">Vegetable</option>
                  </select>
                </label>
                <label>
                  Price (GHS)
                  <input type="number" step="0.01" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} />
                </label>
                <label>
                  Inventory
                  <input type="number" value={editForm.inventory} onChange={(e) => setEditForm({ ...editForm, inventory: e.target.value })} />
                </label>
                <label style={{ gridColumn: '1 / span 2' }}>
                  Description
                  <input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                </label>
                <label style={{ gridColumn: '1 / span 2' }}>
                  Tags (comma-separated)
                  <input value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} />
                </label>
                <div style={{ gridColumn: '1 / span 2' }}>
                  <label>
                    Upload Images (max 5)
                    <input type="file" accept="image/*" multiple onChange={(e) => addEditImages(e.target.files)} />
                  </label>
                  {(editForm.images || []).length > 0 && (
                    <div className="Thumbs" style={{ marginTop: '0.5rem' }}>
                      {(editForm.images || []).map((src, idx) => (
                        <div key={idx} className="Thumb">
                          <img src={src} alt={`img-${idx}`} onError={(e) => { e.currentTarget.src = 'https://placehold.co/80x80'; }} />
                          <button type="button" className="BtnOutline" onClick={() => removeEditImage(idx)}>Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ gridColumn: '1 / span 2', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button className="BtnOutline" onClick={cancelEdit}>Cancel</button>
                  <button className="Btn" onClick={saveEdit}>Save</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default SellerDashboard;
