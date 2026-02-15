import { useMemo, useState } from 'react';
import { addHeroSlide, deleteHeroSlide, loadHeroSlides, reorderHeroSlides, updateHeroSlide } from '../hero/heroService';
import { useSellerAuth } from '../auth/SellerAuthContext';
import { useUserAuth } from '../auth/UserAuthContext';
import { loadProducts, deleteProduct } from '../products/productService';
import { loadOrders } from '../orders/orderService';

function Admin() {
  const [tab, setTab] = useState('hero');
  const [slides, setSlides] = useState(() => loadHeroSlides());
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const refreshSlides = () => setSlides(loadHeroSlides());
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingImageUrl, setEditingImageUrl] = useState('');
  const { sellers, approveSeller, suspendSeller, blockSeller, unblockSeller, deleteSeller } = useSellerAuth();
  const { users, updateUser, deleteUser, register, current } = useUserAuth();
  const [products, setProducts] = useState(() => loadProducts());
  const orders = useMemo(() => loadOrders(), []);
  const [q, setQ] = useState('');

  const addUrl = () => {
    if (!imageUrl) return;
    addHeroSlide({ title: title || 'Banner', image: imageUrl, cta: { text: 'Shop', href: '/' } });
    setTitle('');
    setImageUrl('');
    refreshSlides();
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

  const uploadImages = async (files) => {
    const urls = await toDataUrls(files);
    urls.forEach((u) => addHeroSlide({ title: title || 'Banner', image: u, cta: { text: 'Shop', href: '/' } }));
    setTitle('');
    refreshSlides();
  };

  const removeSlide = (id) => { deleteHeroSlide(id); refreshSlides(); };
  const moveUp = (id) => { const ids = slides.map((s) => s.id); const i = ids.indexOf(id); if (i > 0) { [ids[i-1], ids[i]] = [ids[i], ids[i-1]]; reorderHeroSlides(ids); refreshSlides(); } };
  const moveDown = (id) => { const ids = slides.map((s) => s.id); const i = ids.indexOf(id); if (i >= 0 && i < ids.length-1) { [ids[i+1], ids[i]] = [ids[i], ids[i+1]]; reorderHeroSlides(ids); refreshSlides(); } };
  const startEdit = (s) => { setEditingId(s.id); setEditingTitle(s.title || ''); setEditingImageUrl(s.image || ''); };
  const saveEdit = () => { if (!editingId) return; updateHeroSlide(editingId, { title: editingTitle, image: editingImageUrl }); setEditingId(null); refreshSlides(); };
  const cancelEdit = () => { setEditingId(null); };
  const onEditUpload = async (files) => { const urls = await toDataUrls(files); const u = urls[0]; if (u) setEditingImageUrl(u); };

  const refreshProducts = () => setProducts(loadProducts());
  const removeProduct = (id) => { deleteProduct(id); refreshProducts(); };

  const filteredUsers = useMemo(() => {
    const s = q.toLowerCase();
    if (!s) return users;
    return users.filter((u) => (
      (u.name || '').toLowerCase().includes(s) ||
      (u.email || '').toLowerCase().includes(s) ||
      String(u.id).includes(s) ||
      (u.role || '').toLowerCase().includes(s)
    ));
  }, [users, q]);

  const filteredSellers = useMemo(() => {
    const s = q.toLowerCase();
    if (!s) return sellers;
    return sellers.filter((u) => (
      (u.name || '').toLowerCase().includes(s) ||
      (u.email || '').toLowerCase().includes(s) ||
      String(u.id).includes(s) ||
      (u.status || '').toLowerCase().includes(s)
    ));
  }, [sellers, q]);

  const filteredProducts = useMemo(() => {
    const s = q.toLowerCase();
    if (!s) return products;
    return products.filter((p) => (
      (p.name || '').toLowerCase().includes(s) ||
      (p.category || '').toLowerCase().includes(s) ||
      String(p.id).includes(s) ||
      (p.description || '').toLowerCase().includes(s)
    ));
  }, [products, q]);

  const filteredOrders = useMemo(() => {
    const s = q.toLowerCase();
    if (!s) return orders;
    return orders.filter((o) => (
      String(o.id).includes(s) ||
      (o.orderStatus || o.status || '').toLowerCase().includes(s)
    ));
  }, [orders, q]);

  if (!current || current.role !== 'admin') {
    return (
      <main className="Container">
        <h2>Admin Dashboard</h2>
        <p>Admin access required. Please login as an admin user.</p>
        <p><a className="Btn" href="/admin/login">Go to Admin Login</a></p>
      </main>
    );
  }

  return (
    <main className="Container">
      <h2>Admin Dashboard</h2>
      <div className="SellerLayout">
        <aside className="Sidebar">
          <div className="SidebarHeader"><strong>Admin Menu</strong></div>
          <div className="Menu">
            <button className={`MenuItem ${tab==='hero'?'active':''}`} onClick={() => setTab('hero')}>Manage Hero</button>
            <button className={`MenuItem ${tab==='users'?'active':''}`} onClick={() => setTab('users')}>Manage Users</button>
            <button className={`MenuItem ${tab==='sellers'?'active':''}`} onClick={() => setTab('sellers')}>Approve Sellers</button>
            <button className={`MenuItem ${tab==='orders'?'active':''}`} onClick={() => setTab('orders')}>View Orders</button>
            <button className={`MenuItem ${tab==='products'?'active':''}`} onClick={() => setTab('products')}>Remove Products</button>
            <button className={`MenuItem ${tab==='search'?'active':''}`} onClick={() => setTab('search')}>Global Search</button>
          </div>
        </aside>
        <section className="Content">
          {tab === 'hero' && (
            <div>
              <section className="Card" style={{ marginBottom: '1rem' }}>
                <div className="CardBody">
                  <h3 className="SectionTitle">Hero Slides</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(220px,1fr))', gap: '0.75rem' }}>
                    <label>
                      Title
                      <input value={title} onChange={(e) => setTitle(e.target.value)} />
                    </label>
                    <label>
                      Image URL
                      <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                    </label>
                    <div style={{ gridColumn: '1 / span 2', display: 'flex', gap: '0.5rem' }}>
                      <button className="Btn" onClick={addUrl}>Add From URL</button>
                      <label className="BtnOutline" style={{ display: 'inline-block' }}>
                        Upload Images
                        <input type="file" accept="image/*" multiple onChange={(e) => uploadImages(e.target.files)} style={{ display: 'none' }} />
                      </label>
                    </div>
                  </div>
                </div>
              </section>
              {slides.length === 0 ? (
                <p className="Muted">No slides yet.</p>
              ) : (
                <div className="Grid">
                  {slides.map((s) => (
                    <div className="Card" key={s.id}>
                      <img src={s.image} alt={s.title} onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x300?text=Slide'; }} />
                      <div className="CardBody">
                        <h3>{s.title}</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="BtnOutline" onClick={() => moveUp(s.id)}>Up</button>
                          <button className="BtnOutline" onClick={() => moveDown(s.id)}>Down</button>
                          <button className="BtnOutline" onClick={() => startEdit(s)}>Edit</button>
                          <button className="BtnDanger" onClick={() => removeSlide(s.id)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'users' && (
            <div>
              <h3 className="SectionTitle">Manage Users</h3>
              <div style={{ marginBottom: '0.5rem' }}>
                <input className="SearchInput" placeholder="Search users" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="Card" style={{ marginBottom: '0.75rem' }}>
                <div className="CardBody">
                  <h3 style={{ marginTop: 0 }}>Create Admin</h3>
                  <AdminCreateForm onCreate={async (payload) => { await register({ ...payload, role: 'admin' }); }} />
                </div>
              </div>
              {filteredUsers.length === 0 ? (
                <p className="Muted">No users found.</p>
              ) : (
                <div className="Grid">
                  {filteredUsers.map((u) => (
                    <div className="Card" key={u.id}>
                      <div className="CardBody">
                        <h3>{u.name}</h3>
                        <p className="Muted">{u.email}</p>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <label>
                            Role
                            <select value={u.role || 'buyer'} onChange={(e) => updateUser(u.id, { role: e.target.value })}>
                              <option value="buyer">Buyer</option>
                              <option value="seller">Seller</option>
                              <option value="admin">Admin</option>
                            </select>
                          </label>
                          <button className="BtnDanger" onClick={() => deleteUser(u.id)}>Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'sellers' && (
            <div>
              <h3 className="SectionTitle">Approve Sellers</h3>
              <div style={{ marginBottom: '0.5rem' }}>
                <input className="SearchInput" placeholder="Search sellers" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              {filteredSellers.length === 0 ? (
                <p className="Muted">No sellers found.</p>
              ) : (
                <div className="Grid">
                  {filteredSellers.map((s) => (
                    <div className="Card" key={s.id}>
                      <div className="CardBody">
                        <h3>{s.name}</h3>
                        <p className="Muted">{s.email}</p>
                        <p>Status: {s.status || (s.approved ? 'approved' : 'pending')}</p>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {!s.approved && s.status !== 'blocked' && (
                            <button className="Btn" onClick={() => approveSeller(s.id)}>Approve</button>
                          )}
                          {s.approved && (
                            <button className="BtnOutline" onClick={() => suspendSeller(s.id)}>Suspend</button>
                          )}
                          {s.status !== 'blocked' && (
                            <button className="BtnDanger" onClick={() => blockSeller(s.id)}>Block</button>
                          )}
                          {s.status === 'blocked' && (
                            <button className="Btn" onClick={() => unblockSeller(s.id)}>Unblock</button>
                          )}
                          <button className="BtnDanger" onClick={() => deleteSeller(s.id)}>Remove</button>
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
              <h3 className="SectionTitle">All Orders</h3>
              <div style={{ marginBottom: '0.5rem' }}>
                <input className="SearchInput" placeholder="Search orders" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              {filteredOrders.length === 0 ? (
                <p className="Muted">No orders found.</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {filteredOrders.map((o) => (
                    <div className="OrderCard" key={o.id}>
                      <div className="OrderHeader">
                        <strong>Order #{o.id}</strong>
                        <span>{new Date(o.createdAt || o.placedAt).toLocaleString()}</span>
                      </div>
                      <div className="OrderTotal">Status: {o.orderStatus || o.status || 'processing'}</div>
                      <div className="Muted">Items: {(o.items || []).length}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'products' && (
            <div>
              <h3 className="SectionTitle">Products</h3>
              <div style={{ marginBottom: '0.5rem' }}>
                <input className="SearchInput" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              {filteredProducts.length === 0 ? (
                <p className="Muted">No products found.</p>
              ) : (
                <div className="Grid">
                  {filteredProducts.map((p) => (
                    <div className="Card" key={p.id}>
                      <img src={(p.image || (p.images && p.images[0]) || 'https://placehold.co/400x300?text=Product')} alt={p.name} onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x300?text=Product'; }} />
                      <div className="CardBody">
                        <h3>{p.name}</h3>
                        <p className="Muted">{p.category}</p>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="BtnDanger" onClick={() => removeProduct(p.id)}>Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'search' && (
            <div>
              <h3 className="SectionTitle">Global Search</h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <input className="SearchInput" placeholder="Search across users, sellers, products, orders" value={q} onChange={(e) => setQ(e.target.value)} />
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div className="Card">
                    <div className="CardBody">
                      <strong>Users</strong>
                      <div className="Muted">{filteredUsers.length} match(es)</div>
                    </div>
                  </div>
                  <div className="Card">
                    <div className="CardBody">
                      <strong>Sellers</strong>
                      <div className="Muted">{filteredSellers.length} match(es)</div>
                    </div>
                  </div>
                  <div className="Card">
                    <div className="CardBody">
                      <strong>Products</strong>
                      <div className="Muted">{filteredProducts.length} match(es)</div>
                    </div>
                  </div>
                  <div className="Card">
                    <div className="CardBody">
                      <strong>Orders</strong>
                      <div className="Muted">{filteredOrders.length} match(es)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
      {editingId && (
        <div className="EditOverlay">
          <div className="EditModal Card">
            <div className="CardBody">
              <h3 style={{ marginTop: 0 }}>Edit Slide</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))', gap: '0.75rem' }}>
                <label>
                  Title
                  <input value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} />
                </label>
                <label>
                  Image URL
                  <input value={editingImageUrl} onChange={(e) => setEditingImageUrl(e.target.value)} />
                </label>
                <label style={{ gridColumn: '1 / span 2' }}>
                  Upload Image
                  <input type="file" accept="image/*" onChange={(e) => onEditUpload(e.target.files)} />
                </label>
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

function AdminCreateForm({ onCreate }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setOk('');
    try {
      await onCreate(form);
      setOk('Admin created');
      setForm({ name: '', email: '', password: '' });
      setTimeout(() => setOk(''), 1500);
    } catch (err) {
      setError(err.message || 'Failed');
    }
  };
  return (
    <form onSubmit={submit} className="Form" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(160px, 1fr))', gap: '0.5rem' }}>
      <label>
        Name
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </label>
      <label>
        Email
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      </label>
      <label>
        Password
        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
      </label>
      <div style={{ gridColumn: '1 / span 3', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button className="Btn" type="submit">Create Admin</button>
        {ok && <span style={{ color: '#16a34a' }}>{ok}</span>}
        {error && <span style={{ color: 'crimson' }}>{error}</span>}
      </div>
    </form>
  );
}

export default Admin;
