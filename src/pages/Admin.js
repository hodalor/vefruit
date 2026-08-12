import { useEffect, useMemo, useState } from 'react';
import { addHeroSlide, deleteHeroSlide, reorderHeroSlides, updateHeroSlide } from '../hero/heroService';
import useHeroSlides from '../hero/useHeroSlides';
import { useSellerAuth } from '../auth/SellerAuthContext';
import { useUserAuth } from '../auth/UserAuthContext';
import { addProduct, deleteProduct } from '../products/productService';
import useProducts from '../products/useProducts';
import { getOrderEventName, loadOrders } from '../orders/orderService';
import { addCategory, deleteCategory, formatCategoryLabel } from '../categories/categoryService';
import useCategories from '../categories/useCategories';
import { PRODUCT_FALLBACK_IMAGE, SLIDE_FALLBACK_IMAGE, resolveImageSource, resolveProductImage } from '../utils/images';

const CHART_COLORS = ['#2f67dc', '#f59e0b', '#8b5cf6', '#0f766e', '#ec4899', '#22c55e', '#ef4444', '#94a3b8'];

function Admin() {
  const [tab, setTab] = useState('dashboard');
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingImageUrl, setEditingImageUrl] = useState('');
  const [period, setPeriod] = useState('7d');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [q, setQ] = useState('');
  const [notice, setNotice] = useState('');
  const [orders, setOrders] = useState([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [farmersMenuOpen, setFarmersMenuOpen] = useState(true);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('categories');
  const [categoryName, setCategoryName] = useState('');
  const [productForm, setProductForm] = useState({
    name: '',
    category: '',
    price: '',
    inventory: '',
    description: '',
    tags: '',
    imageUrl: '',
    farmerId: '',
  });
  const { sellers, approveSeller, rejectSeller, suspendSeller, deleteSeller } = useSellerAuth();
  const { users, updateUser, deleteUser, register, current } = useUserAuth();
  const slides = useHeroSlides();
  const products = useProducts();
  const categories = useCategories();
  const farmers = sellers;
  const productsMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const farmersMap = useMemo(() => new Map(farmers.map((f) => [f.id, f])), [farmers]);

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 1800);
  };

  const goToTab = (nextTab) => {
    setTab(nextTab);
    setQ('');
    if (nextTab.startsWith('farmers-')) setFarmersMenuOpen(true);
    if (nextTab.startsWith('settings-')) setSettingsMenuOpen(true);
  };

  useEffect(() => {
    const sync = () => loadOrders().then(setOrders).catch(() => setOrders([]));
    sync();
    window.addEventListener(getOrderEventName(), sync);
    return () => {
      window.removeEventListener(getOrderEventName(), sync);
    };
  }, []);

  useEffect(() => {
    if (!categories.length) return;
    setProductForm((prev) => ({ ...prev, category: prev.category || categories[0] }));
  }, [categories]);

  const rangeOrders = useMemo(
    () => filterOrdersByRange(orders, period, fromDate, toDate),
    [orders, period, fromDate, toDate]
  );

  const metricStats = useMemo(() => {
    const revenue = rangeOrders.reduce((sum, order) => sum + getOrderValue(order), 0);
    const itemsSold = rangeOrders.reduce((sum, order) => sum + getOrderItems(order).reduce((inner, item) => inner + getItemQty(item), 0), 0);
    const transactions = rangeOrders.length;
    const approvedFarmersCount = farmers.filter((farmer) => getFarmerStatus(farmer) === 'approved').length;
    const pendingFarmersCount = farmers.filter((farmer) => getFarmerStatus(farmer) === 'pending').length;
    return {
      revenue,
      itemsSold,
      transactions,
      approvedFarmersCount,
      pendingFarmersCount,
      products: products.length,
    };
  }, [farmers, products.length, rangeOrders]);

  const revenueSeries = useMemo(() => buildDailySeries(rangeOrders, (order) => getOrderValue(order)), [rangeOrders]);
  const ordersSeries = useMemo(() => buildDailySeries(rangeOrders, () => 1), [rangeOrders]);
  const unitsByCategory = useMemo(() => buildUnitsByCategory(rangeOrders, productsMap), [rangeOrders, productsMap]);
  const topProducts = useMemo(() => buildTopProducts(rangeOrders, productsMap), [rangeOrders, productsMap]);
  const farmerPerformance = useMemo(() => buildFarmerPerformance(rangeOrders, productsMap, farmersMap), [rangeOrders, productsMap, farmersMap]);

  const approvedFarmers = useMemo(
    () => farmers.filter((farmer) => getFarmerStatus(farmer) === 'approved'),
    [farmers]
  );
  const reviewFarmers = useMemo(
    () => farmers.filter((farmer) => getFarmerStatus(farmer) === 'pending'),
    [farmers]
  );
  const rejectedFarmers = useMemo(
    () => farmers.filter((farmer) => ['rejected', 'blocked', 'suspended'].includes(getFarmerStatus(farmer))),
    [farmers]
  );

  const search = q.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    return users.filter((user) => (
      matchesSearch(user.name, search) ||
      matchesSearch(user.email, search) ||
      matchesSearch(user.phone, search) ||
      matchesSearch(user.address, search) ||
      matchesSearch(user.idType, search) ||
      matchesSearch(user.idNumber, search) ||
      matchesSearch(user.role, search) ||
      String(user.id).includes(search)
    ));
  }, [users, search]);

  const filteredProducts = useMemo(() => {
    if (!search) return products;
    return products.filter((product) => {
      const farmer = farmersMap.get(product.sellerId);
      return (
        matchesSearch(product.name, search) ||
        matchesSearch(product.category, search) ||
        matchesSearch(product.description, search) ||
        matchesSearch(farmer?.name, search) ||
        String(product.id).includes(search)
      );
    });
  }, [products, farmersMap, search]);

  const filteredOrders = useMemo(() => {
    if (!search) return orders;
    return orders.filter((order) => (
      String(order.id).includes(search) ||
      matchesSearch(order.orderStatus || order.status, search)
    ));
  }, [orders, search]);

  const filteredReviewFarmers = useMemo(
    () => filterFarmers(reviewFarmers, search),
    [reviewFarmers, search]
  );
  const filteredApprovedFarmers = useMemo(
    () => filterFarmers(approvedFarmers, search),
    [approvedFarmers, search]
  );
  const filteredRejectedFarmers = useMemo(
    () => filterFarmers(rejectedFarmers, search),
    [rejectedFarmers, search]
  );

  const addUrl = async () => {
    if (!imageUrl.trim()) return;
    await addHeroSlide({ title: title || 'Banner', image: imageUrl, cta: { text: 'Shop', href: '/' } });
    setTitle('');
    setImageUrl('');
    flash('Hero slide added');
  };

  const toDataUrls = async (fileList) => {
    const files = Array.from(fileList || []).slice(0, 5);
    const readers = files.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('read'));
      reader.readAsDataURL(file);
    }));
    try {
      return await Promise.all(readers);
    } catch {
      return [];
    }
  };

  const uploadImages = async (files) => {
    const urls = await toDataUrls(files);
    await Promise.all(urls.map((url) => addHeroSlide({ title: title || 'Banner', image: url, cta: { text: 'Shop', href: '/' } })));
    setTitle('');
    flash('Hero slides uploaded');
  };

  const removeSlide = async (id) => {
    await deleteHeroSlide(id);
    flash('Hero slide removed');
  };

  const moveUp = async (id) => {
    const ids = slides.map((slide) => slide.id);
    const index = ids.indexOf(id);
    if (index > 0) {
      [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
      await reorderHeroSlides(ids);
    }
  };

  const moveDown = async (id) => {
    const ids = slides.map((slide) => slide.id);
    const index = ids.indexOf(id);
    if (index >= 0 && index < ids.length - 1) {
      [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]];
      await reorderHeroSlides(ids);
    }
  };

  const startEdit = (slide) => {
    setEditingId(slide.id);
    setEditingTitle(slide.title || '');
    setEditingImageUrl(slide.image || '');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateHeroSlide(editingId, { title: editingTitle, image: editingImageUrl });
    setEditingId(null);
    flash('Hero slide updated');
  };

  const cancelEdit = () => setEditingId(null);

  const onEditUpload = async (files) => {
    const urls = await toDataUrls(files);
    if (urls[0]) setEditingImageUrl(urls[0]);
  };

  const removeProduct = async (id) => {
    await deleteProduct(id);
    flash('Product removed');
  };

  const submitProduct = async (e) => {
    e.preventDefault();
    const farmer = approvedFarmers.find((entry) => String(entry.id) === productForm.farmerId);
    if (!farmer) {
      flash('Select an approved farmer first');
      return;
    }
    await addProduct({
      name: productForm.name,
      category: productForm.category,
      price: productForm.price,
      inventory: productForm.inventory,
      description: productForm.description,
      tags: productForm.tags,
      image: productForm.imageUrl || null,
      images: productForm.imageUrl ? [productForm.imageUrl] : [],
      sellerId: farmer.id,
    });
    setProductForm({
      name: '',
      category: categories[0] || '',
      price: '',
      inventory: '',
      description: '',
      tags: '',
      imageUrl: '',
      farmerId: '',
    });
    setShowAddProduct(false);
    flash(`Product added for ${farmer.name}`);
  };

  const submitCategory = async (e) => {
    e.preventDefault();
    try {
      await addCategory(categoryName);
      setCategoryName('');
      flash('Category created');
    } catch (err) {
      flash(err.message || 'Failed to create category');
    }
  };

  const categoryCounts = useMemo(() => {
    const counts = new Map();
    products.forEach((product) => {
      const key = String(product.category || '').toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [products]);

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
    <main className="AdminShell">
      <aside className="AdminSidebar">
        <div className="AdminSidebarBrand">
          <div className="AdminSidebarLogo">VF</div>
          <div>
            <strong>veFruit Admin</strong>
            <p>{current.name}</p>
          </div>
        </div>

        <SidebarGroup title="Overview">
          <SidebarButton label="Dashboard" active={tab === 'dashboard'} onClick={() => goToTab('dashboard')} />
        </SidebarGroup>

        <SidebarGroup title="Management">
          <SidebarButton label="Hero" active={tab === 'hero'} onClick={() => goToTab('hero')} />
          <SidebarButton label="Users" active={tab === 'users'} onClick={() => goToTab('users')} />
          <SidebarButton label="Orders" active={tab === 'orders'} onClick={() => goToTab('orders')} />
          <SidebarButton label="Products" active={tab === 'products'} onClick={() => goToTab('products')} />
          <SidebarButton label="Global Search" active={tab === 'search'} onClick={() => goToTab('search')} />
        </SidebarGroup>

        <SidebarDropdown
          title="Farmers"
          open={farmersMenuOpen}
          onToggle={() => setFarmersMenuOpen((prev) => !prev)}
          active={tab === 'farmers-review' || tab === 'farmers-list' || tab === 'farmers-rejected'}
        >
          <SidebarButton compact label="Review Farmers" active={tab === 'farmers-review'} onClick={() => goToTab('farmers-review')} count={reviewFarmers.length} />
          <SidebarButton compact label="List Of Farmers" active={tab === 'farmers-list'} onClick={() => goToTab('farmers-list')} count={approvedFarmers.length} />
          <SidebarButton compact label="Rejected Farmers" active={tab === 'farmers-rejected'} onClick={() => goToTab('farmers-rejected')} count={rejectedFarmers.length} />
        </SidebarDropdown>

        <SidebarDropdown
          title="Settings"
          open={settingsMenuOpen}
          onToggle={() => setSettingsMenuOpen((prev) => !prev)}
          active={tab.startsWith('settings-')}
        >
          <SidebarButton compact label="Categories" active={tab === 'settings-categories'} onClick={() => { setSettingsTab('categories'); goToTab('settings-categories'); }} count={categories.length} />
          <SidebarButton compact label="General" active={tab === 'settings-general'} onClick={() => { setSettingsTab('general'); goToTab('settings-general'); }} />
          <SidebarButton compact label="Storefront" active={tab === 'settings-storefront'} onClick={() => { setSettingsTab('storefront'); goToTab('settings-storefront'); }} />
        </SidebarDropdown>
      </aside>

      <section className="AdminMain">
        <div className="AdminBreadcrumb">Admin / {tabLabel(tab)}</div>

        <div className="AdminHeading">
          <div>
            <h1>{tabLabel(tab)}</h1>
            <p className="AdminSubtle">
              {tab === 'dashboard' && 'Track store activity with charts and a cleaner visual dashboard.'}
              {tab === 'farmers-review' && 'Approve or reject new farmer registrations from one place.'}
              {tab === 'farmers-list' && 'See every approved farmer currently active on the platform.'}
              {tab === 'farmers-rejected' && 'Review rejected, suspended, or blocked farmers.'}
              {tab === 'products' && 'Manage catalog items and post products on behalf of approved farmers.'}
              {tab === 'users' && 'Manage buyers and admins.'}
              {tab === 'orders' && 'Review all orders placed in the marketplace.'}
              {tab === 'hero' && 'Update homepage banners and slide order.'}
              {tab === 'search' && 'Search across users, farmers, products, and orders.'}
              {tab === 'settings-categories' && 'Manage live categories used across the storefront and product forms.'}
              {tab === 'settings-general' && 'General settings panel.'}
              {tab === 'settings-storefront' && 'Storefront settings panel.'}
            </p>
          </div>
        </div>

        {notice && <div className="AdminNotice">{notice}</div>}

        {tab === 'dashboard' && (
          <div className="AdminDashboard">
            <div className="AdminFilterBar Card">
              <div className="CardBody AdminFilterGrid">
                <label>
                  Period
                  <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="all">All time</option>
                    <option value="custom">Custom range</option>
                  </select>
                </label>
                <label>
                  From
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} disabled={period !== 'custom'} />
                </label>
                <label>
                  To
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} disabled={period !== 'custom'} />
                </label>
              </div>
            </div>

            <div className="AdminMetricGrid">
              <MetricCard title="Sales" value={`GHS ${metricStats.revenue.toFixed(2)}`} meta="Selected range revenue" tone="blue" badge="SL" />
              <MetricCard title="Transactions" value={metricStats.transactions} meta="Completed order count" tone="orange" badge="TX" />
              <MetricCard title="Items Sold" value={metricStats.itemsSold} meta="Units moved in range" tone="teal" badge="IT" />
              <MetricCard title="Approved Farmers" value={metricStats.approvedFarmersCount} meta="Farmers ready to sell" tone="green" badge="FM" />
              <MetricCard title="Pending Reviews" value={metricStats.pendingFarmersCount} meta="Waiting for admin action" tone="pink" badge="RV" />
              <MetricCard title="Products" value={metricStats.products} meta="Live catalog items" tone="purple" badge="PD" />
            </div>

            <div className="AdminChartGrid AdminChartGridPrimary">
              <ChartCard title="Revenue (Selected Range)" wide>
                <LineChart points={revenueSeries.points} prefix="GHS " />
              </ChartCard>
              <ChartCard title="Units By Category">
                <DonutChart entries={unitsByCategory.entries} total={unitsByCategory.total} />
              </ChartCard>
            </div>

            <div className="AdminChartGrid">
              <ChartCard title="Top Products (Units)">
                <HorizontalBarChart items={topProducts} />
              </ChartCard>
              <ChartCard title="Orders By Day">
                <VerticalBarChart items={ordersSeries.points} />
              </ChartCard>
            </div>

            <ChartCard title="Farmer Performance">
              <div className="AdminPerformanceGrid">
                <HorizontalBarChart items={farmerPerformance} formatter={(value) => `GHS ${value.toFixed(2)}`} />
                <div className="AdminTableWrap">
                  <table className="AdminTable">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Farmer</th>
                        <th>Sales</th>
                        <th>Units</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {farmerPerformance.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="AdminEmptyCell">No farmer sales in this range.</td>
                        </tr>
                      ) : (
                        farmerPerformance.map((farmer, index) => (
                          <tr key={farmer.label}>
                            <td>{index + 1}</td>
                            <td>{farmer.label}</td>
                            <td>{farmer.orders}</td>
                            <td>{farmer.units}</td>
                            <td>GHS {farmer.value.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </ChartCard>
          </div>
        )}

        {tab === 'hero' && (
          <div className="AdminStack">
            <section className="Card">
              <div className="CardBody">
                <div className="AdminSectionHeader">
                  <div>
                    <h2 className="SectionTitle">Hero Slides</h2>
                    <p className="AdminSubtle">Upload or add banner images for the homepage slider.</p>
                  </div>
                </div>
                <div className="AdminFormGrid">
                  <label>
                    Title
                    <input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </label>
                  <label>
                    Image URL
                    <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                  </label>
                  <div className="AdminButtonRow AdminFormActions">
                    <button className="Btn" type="button" onClick={addUrl}>Add From URL</button>
                    <label className="BtnOutline AdminUploadButton">
                      Upload Images
                      <input type="file" accept="image/*" multiple onChange={(e) => uploadImages(e.target.files)} />
                    </label>
                  </div>
                </div>
              </div>
            </section>

            {slides.length === 0 ? (
              <p className="Muted">No slides yet.</p>
            ) : (
              <div className="Grid">
                {slides.map((slide) => (
                  <div className="Card" key={slide.id}>
                    <img src={resolveImageSource(slide.image, SLIDE_FALLBACK_IMAGE, 'landscape_16_9')} alt={slide.title} onError={(e) => { e.currentTarget.src = SLIDE_FALLBACK_IMAGE; }} />
                    <div className="CardBody">
                      <h3>{slide.title}</h3>
                      <div className="AdminButtonRow">
                        <button className="BtnOutline" type="button" onClick={() => moveUp(slide.id)}>Up</button>
                        <button className="BtnOutline" type="button" onClick={() => moveDown(slide.id)}>Down</button>
                        <button className="BtnOutline" type="button" onClick={() => startEdit(slide)}>Edit</button>
                        <button className="BtnDanger" type="button" onClick={() => removeSlide(slide.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'users' && (
          <div className="AdminStack">
            <section className="Card">
              <div className="CardBody">
                <div className="AdminSectionHeader">
                  <div>
                    <h2 className="SectionTitle">Manage Users</h2>
                    <p className="AdminSubtle">Create admins and update user roles.</p>
                  </div>
                </div>
                <AdminCreateForm onCreate={async (payload) => { await register({ ...payload, role: 'admin' }); flash('Admin created'); }} />
              </div>
            </section>

            <section className="Card">
              <div className="CardBody">
                <input className="SearchInput" placeholder="Search users" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </section>

            {filteredUsers.length === 0 ? (
              <p className="Muted">No users found.</p>
            ) : (
              <div className="Grid">
                {filteredUsers.map((user) => (
                  <div className="Card" key={user.id}>
                    <div className="CardBody">
                      <h3>{user.name}</h3>
                      <p className="Muted">{user.phone || 'No phone number'}</p>
                      {user.email && <p className="Muted">{user.email}</p>}
                      <div className="AdminDetailList">
                        {user.address && <div><strong>Address:</strong> {user.address}</div>}
                        {(user.idType || user.idNumber) && <div><strong>ID:</strong> {[user.idType, user.idNumber].filter(Boolean).join(' - ')}</div>}
                      </div>
                      <div className="AdminInlineField">
                        <label>
                          Role
                          <select value={user.role || 'buyer'} onChange={(e) => updateUser(user.id, { role: e.target.value })}>
                            <option value="buyer">Buyer</option>
                            <option value="farmer">Farmer</option>
                            <option value="admin">Admin</option>
                          </select>
                        </label>
                        <button className="BtnDanger" type="button" onClick={() => deleteUser(user.id)}>Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'farmers-review' && (
          <FarmerSection
            title="Review Farmers"
            searchValue={q}
            onSearchChange={setQ}
            placeholder="Search farmers awaiting review"
            farmers={filteredReviewFarmers}
            emptyText="No farmers waiting for review."
            actions={(farmer) => (
              <>
                <button className="Btn" type="button" onClick={async () => { await approveSeller(farmer.id); goToTab('farmers-list'); flash(`${farmer.name} approved`); }}>Approve</button>
                <button className="BtnDanger" type="button" onClick={async () => { await rejectSeller(farmer.id); goToTab('farmers-rejected'); flash(`${farmer.name} rejected`); }}>Reject</button>
              </>
            )}
          />
        )}

        {tab === 'farmers-list' && (
          <FarmerSection
            title="List Of Farmers"
            searchValue={q}
            onSearchChange={setQ}
            placeholder="Search approved farmers"
            farmers={filteredApprovedFarmers}
            emptyText="No approved farmers found."
            actions={(farmer) => (
              <>
                <button className="BtnOutline" type="button" onClick={async () => { await suspendSeller(farmer.id); flash(`${farmer.name} suspended`); }}>Suspend</button>
                <button className="BtnDanger" type="button" onClick={async () => { await rejectSeller(farmer.id); goToTab('farmers-rejected'); flash(`${farmer.name} moved to rejected`); }}>Reject</button>
              </>
            )}
          />
        )}

        {tab === 'farmers-rejected' && (
          <FarmerSection
            title="Rejected Farmers"
            searchValue={q}
            onSearchChange={setQ}
            placeholder="Search rejected farmers"
            farmers={filteredRejectedFarmers}
            emptyText="No rejected farmers found."
            actions={(farmer) => (
              <>
                <button className="Btn" type="button" onClick={async () => { await approveSeller(farmer.id); goToTab('farmers-list'); flash(`${farmer.name} restored`); }}>Approve</button>
                <button className="BtnDanger" type="button" onClick={async () => { await deleteSeller(farmer.id); flash(`${farmer.name} removed`); }}>Delete</button>
              </>
            )}
          />
        )}

        {tab === 'orders' && (
          <div className="AdminStack">
            <section className="Card">
              <div className="CardBody">
                <input className="SearchInput" placeholder="Search orders" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </section>
            {filteredOrders.length === 0 ? (
              <p className="Muted">No orders found.</p>
            ) : (
              <div className="AdminOrdersList">
                {filteredOrders.map((order) => (
                  <div className="OrderCard" key={order.id}>
                    <div className="OrderHeader">
                      <strong>Order #{order.id}</strong>
                      <span>{new Date(order.createdAt || order.placedAt).toLocaleString()}</span>
                    </div>
                    <div className="OrderTotal">Status: {order.orderStatus || order.status || 'processing'}</div>
                    <div className="Muted">Items: {getOrderItems(order).length}</div>
                    {order.neededBy && <div className="Muted">Needed by: {order.neededBy}</div>}
                    {order.requestNote && <div className="Muted">Request: {order.requestNote}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'products' && (
          <div className="AdminStack">
            <section className="Card">
              <div className="CardBody">
                <div className="AdminSectionHeader">
                  <div>
                    <h2 className="SectionTitle">Products</h2>
                    <p className="AdminSubtle">Create products for approved farmers and manage the catalog.</p>
                  </div>
                  <button className="Btn" type="button" onClick={() => setShowAddProduct(true)}>Add Product</button>
                </div>
              </div>
            </section>

            <section className="Card">
              <div className="CardBody">
                <input className="SearchInput" placeholder="Search products or farmers" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </section>

            {filteredProducts.length === 0 ? (
              <p className="Muted">No products found.</p>
            ) : (
              <div className="Grid">
                {filteredProducts.map((product) => {
                  const farmer = farmersMap.get(product.sellerId);
                  return (
                    <div className="Card" key={product.id}>
                      <img src={resolveProductImage(product)} alt={product.name} onError={(e) => { e.currentTarget.src = PRODUCT_FALLBACK_IMAGE; }} />
                      <div className="CardBody">
                        <h3>{product.name}</h3>
                        <p className="Muted">{product.category}</p>
                        <div className="AdminPillRow">
                          <span className="AdminPill">{farmer?.name || 'No farmer'}</span>
                          <span className="AdminPill">Stock {Number(product.inventory ?? product.quantity ?? 0)}</span>
                        </div>
                        <div className="AdminButtonRow">
                          <button className="BtnDanger" type="button" onClick={() => removeProduct(product.id)}>Remove</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'search' && (
          <div className="AdminStack">
            <section className="Card">
              <div className="CardBody">
                <input className="SearchInput" placeholder="Search across users, farmers, products, orders" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </section>
            <div className="AdminSearchGrid">
              <SearchSummaryCard label="Users" value={filteredUsers.length} />
              <SearchSummaryCard label="Farmers" value={filterFarmers(farmers, search).length} />
              <SearchSummaryCard label="Products" value={filteredProducts.length} />
              <SearchSummaryCard label="Orders" value={filteredOrders.length} />
            </div>
          </div>
        )}

        {(tab === 'settings-categories' || tab === 'settings-general' || tab === 'settings-storefront') && (
          <div className="AdminStack">
            <section className="Card">
              <div className="CardBody">
                <div className="AdminSettingsTabs">
                  <button className={`BtnOutline ${settingsTab === 'categories' ? 'AdminSettingsTabActive' : ''}`} type="button" onClick={() => { setSettingsTab('categories'); goToTab('settings-categories'); }}>Categories</button>
                  <button className={`BtnOutline ${settingsTab === 'general' ? 'AdminSettingsTabActive' : ''}`} type="button" onClick={() => { setSettingsTab('general'); goToTab('settings-general'); }}>General</button>
                  <button className={`BtnOutline ${settingsTab === 'storefront' ? 'AdminSettingsTabActive' : ''}`} type="button" onClick={() => { setSettingsTab('storefront'); goToTab('settings-storefront'); }}>Storefront</button>
                </div>
              </div>
            </section>

            {settingsTab === 'categories' && (
              <>
                <section className="Card">
                  <div className="CardBody">
                    <div className="AdminSectionHeader">
                      <div>
                        <h2 className="SectionTitle">Categories</h2>
                        <p className="AdminSubtle">Create categories once and reuse them across the frontend and product forms.</p>
                      </div>
                    </div>
                    <form onSubmit={submitCategory} className="AdminFormGrid">
                      <label>
                        Category Name
                        <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="e.g. root crops" required />
                      </label>
                      <div className="AdminFieldWide AdminButtonRow">
                        <button className="Btn" type="submit">Create Category</button>
                      </div>
                    </form>
                  </div>
                </section>

                <section className="Card">
                  <div className="CardBody">
                    <div className="AdminCategoryList">
                      {categories.map((category) => (
                        <div key={category} className="AdminCategoryRow">
                          <div>
                            <strong>{formatCategoryLabel(category)}</strong>
                            <div className="Muted">{categoryCounts.get(category) || 0} product(s)</div>
                          </div>
                          <button
                            className="BtnDanger"
                            type="button"
                            disabled={(categoryCounts.get(category) || 0) > 0}
                            onClick={async () => { await deleteCategory(category); flash(`${formatCategoryLabel(category)} removed`); }}
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </>
            )}

            {settingsTab === 'general' && (
              <section className="Card">
                <div className="CardBody">
                  <h2 className="SectionTitle">General Settings</h2>
                  <p className="Muted">More general settings tabs can be added here.</p>
                </div>
              </section>
            )}

            {settingsTab === 'storefront' && (
              <section className="Card">
                <div className="CardBody">
                  <h2 className="SectionTitle">Storefront Settings</h2>
                  <p className="Muted">More storefront settings tabs can be added here.</p>
                </div>
              </section>
            )}
          </div>
        )}
      </section>

      {editingId && (
        <div className="EditOverlay">
          <div className="EditModal Card">
            <div className="CardBody">
              <h3 style={{ marginTop: 0 }}>Edit Slide</h3>
              <div className="AdminFormGrid">
                <label>
                  Title
                  <input value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} />
                </label>
                <label>
                  Image URL
                  <input value={editingImageUrl} onChange={(e) => setEditingImageUrl(e.target.value)} />
                </label>
                <label className="AdminFieldWide">
                  Upload Image
                  <input type="file" accept="image/*" onChange={(e) => onEditUpload(e.target.files)} />
                </label>
                <div className="AdminFieldWide AdminButtonRow AdminAlignEnd">
                  <button className="BtnOutline" type="button" onClick={cancelEdit}>Cancel</button>
                  <button className="Btn" type="button" onClick={saveEdit}>Save</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddProduct && (
        <div className="EditOverlay">
          <div className="EditModal Card AdminModalMedium">
            <div className="CardBody">
              <div className="AdminSectionHeader">
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: '0.2rem' }}>Add Product</h3>
                  <p className="AdminSubtle">Post a product for an approved farmer.</p>
                </div>
                <button className="BtnOutline" type="button" onClick={() => setShowAddProduct(false)}>Close</button>
              </div>
              <form onSubmit={submitProduct} className="AdminFormGrid">
                <label>
                  Product Name
                  <input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required />
                </label>
                <label>
                  Category
                  <select value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}>
                    {categories.map((category) => (
                      <option key={category} value={category}>{formatCategoryLabel(category)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Farmer
                  <select value={productForm.farmerId} onChange={(e) => setProductForm({ ...productForm, farmerId: e.target.value })} required>
                    <option value="">Select approved farmer</option>
                    {approvedFarmers.map((farmer) => (
                      <option key={farmer.id} value={farmer.id}>{farmer.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Price (GHS)
                  <input type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} required />
                </label>
                <label>
                  Inventory
                  <input type="number" value={productForm.inventory} onChange={(e) => setProductForm({ ...productForm, inventory: e.target.value })} required />
                </label>
                <label>
                  Image URL
                  <input value={productForm.imageUrl} onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })} />
                </label>
                <label className="AdminFieldWide">
                  Description
                  <textarea rows="3" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
                </label>
                <label className="AdminFieldWide">
                  Tags
                  <input value={productForm.tags} onChange={(e) => setProductForm({ ...productForm, tags: e.target.value })} placeholder="fresh, organic, local" />
                </label>
                <div className="AdminFieldWide AdminButtonRow AdminAlignEnd">
                  <button className="BtnOutline" type="button" onClick={() => setShowAddProduct(false)}>Cancel</button>
                  <button className="Btn" type="submit">Save Product</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function SidebarGroup({ title, children }) {
  return (
    <div className="AdminSidebarGroup">
      <div className="AdminSidebarTitle">{title}</div>
      <div className="AdminSidebarMenu">{children}</div>
    </div>
  );
}

function SidebarDropdown({ title, open, onToggle, active, children }) {
  return (
    <div className="AdminSidebarGroup">
      <button className={`AdminSidebarButton AdminSidebarToggle ${active ? 'active' : ''}`} type="button" onClick={onToggle}>
        <span>{title}</span>
        <span className={`AdminSidebarArrow ${open ? 'open' : ''}`}>▾</span>
      </button>
      {open && <div className="AdminSidebarSubmenu">{children}</div>}
    </div>
  );
}

function SidebarButton({ label, active, onClick, count, compact = false }) {
  return (
    <button className={`AdminSidebarButton ${compact ? 'compact' : ''} ${active ? 'active' : ''}`} type="button" onClick={onClick}>
      <span>{label}</span>
      {typeof count === 'number' && <span className="AdminSidebarCount">{count}</span>}
    </button>
  );
}

function MetricCard({ title, value, meta, tone, badge }) {
  return (
    <div className={`AdminMetricCard AdminMetricCard--${tone}`}>
      <div className="AdminMetricCardTop">
        <div>
          <div className="AdminMetricLabel">{title}</div>
          <div className="AdminMetricValue">{value}</div>
        </div>
        <div className="AdminMetricBadge">{badge}</div>
      </div>
      <p className="AdminMetricMeta">{meta}</p>
      <div className="AdminMetricStripe" />
    </div>
  );
}

function ChartCard({ title, wide = false, children }) {
  return (
    <section className={`AdminChartCard ${wide ? 'AdminChartCard--wide' : ''}`}>
      <div className="AdminChartHeader">
        <h3>{title}</h3>
      </div>
      <div className="AdminChartBody">{children}</div>
    </section>
  );
}

function LineChart({ points, prefix = '' }) {
  if (!points.length) return <p className="Muted">No data in this range.</p>;

  const width = 760;
  const height = 300;
  const padX = 28;
  const padY = 20;
  const max = points.reduce((acc, point) => Math.max(acc, point.value), 0) || 1;
  const xValues = points.map((_, index) => (points.length === 1 ? width / 2 : padX + ((width - padX * 2) * index) / (points.length - 1)));
  const yValues = points.map((point) => height - padY - ((height - padY * 2) * point.value) / max);
  const linePoints = xValues.map((x, index) => `${x},${yValues[index]}`).join(' ');
  const areaPoints = `${padX},${height - padY} ${linePoints} ${width - padX},${height - padY}`;

  return (
    <div className="AdminChartCanvasWrap">
      <svg className="AdminLineSvg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {[0, 1, 2, 3, 4].map((step) => {
          const y = padY + ((height - padY * 2) * step) / 4;
          return <line key={step} x1={padX} x2={width - padX} y1={y} y2={y} className="AdminGridLine" />;
        })}
        <polyline points={areaPoints} className="AdminAreaShape" />
        <polyline points={linePoints} className="AdminLineShape" />
        {xValues.map((x, index) => (
          <circle key={points[index].label} cx={x} cy={yValues[index]} r="4" className="AdminLineDot" />
        ))}
      </svg>
      <div className="AdminChartAxis" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(86px, 1fr))` }}>
        {points.map((point) => (
          <div key={point.label} className="AxisTick">
            <span className="AxisLabel">{point.label}</span>
            <span className="AxisValue">{prefix}{point.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ entries, total }) {
  if (!entries.length) return <p className="Muted">No data in this range.</p>;

  const width = 260;
  const height = 260;
  const cx = width / 2;
  const cy = height / 2;
  const radius = 92;
  let start = -Math.PI / 2;

  const slices = entries.map((entry, index) => {
    const angle = (entry.value / Math.max(total, 1)) * Math.PI * 2;
    const end = start + angle;
    const x0 = cx + radius * Math.cos(start);
    const y0 = cy + radius * Math.sin(start);
    const x1 = cx + radius * Math.cos(end);
    const y1 = cy + radius * Math.sin(end);
    const largeArc = angle > Math.PI ? 1 : 0;
    const path = `M ${cx},${cy} L ${x0},${y0} A ${radius},${radius} 0 ${largeArc} 1 ${x1},${y1} Z`;
    const color = CHART_COLORS[index % CHART_COLORS.length];
    start = end;
    return { ...entry, path, color };
  });

  return (
    <div className="AdminDonutWrap">
      <div className="Legend">
        {slices.map((slice) => (
          <div key={slice.label} className="LegendItem">
            <span className="LegendSwatch" style={{ background: slice.color }} />
            <span>{slice.label}</span>
            <strong>{slice.value}</strong>
          </div>
        ))}
      </div>
      <svg className="PieSvg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {slices.map((slice) => (
          <path key={slice.label} d={slice.path} style={{ fill: slice.color }} />
        ))}
        <circle cx={cx} cy={cy} r="58" fill="#ffffff" />
        <text x={cx} y={cy - 4} textAnchor="middle" className="AdminDonutValue">{total}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="AdminDonutLabel">Units</text>
      </svg>
    </div>
  );
}

function HorizontalBarChart({ items, formatter = (value) => value }) {
  if (!items.length) return <p className="Muted">No data in this range.</p>;
  const max = items.reduce((acc, item) => Math.max(acc, item.value ?? item.qty ?? 0), 0) || 1;

  return (
    <div className="ChartBars">
      {items.map((item, index) => {
        const value = item.value ?? item.qty ?? 0;
        const width = Math.max(8, Math.round((value / max) * 100));
        return (
          <div key={item.label || item.name} className="AdminBarRow">
            <span className="BarLabel" title={item.label || item.name}>{item.label || item.name}</span>
            <div className="Bar">
              <div className="BarFill" style={{ width: `${width}%`, background: CHART_COLORS[index % CHART_COLORS.length] }} />
            </div>
            <span className="BarValue">{formatter(value)}</span>
          </div>
        );
      })}
    </div>
  );
}

function VerticalBarChart({ items }) {
  if (!items.length) return <p className="Muted">No data in this range.</p>;
  const max = items.reduce((acc, item) => Math.max(acc, item.value), 0) || 1;

  return (
    <div className="AdminColumnChart">
      <div className="AdminColumnBars">
        {items.map((item, index) => (
          <div key={item.label} className="AdminColumn">
            <div className="AdminColumnValue">{item.value}</div>
            <div className="AdminColumnTrack">
              <div
                className="AdminColumnFill"
                style={{
                  height: `${Math.max(8, Math.round((item.value / max) * 100))}%`,
                  background: CHART_COLORS[index % CHART_COLORS.length],
                }}
              />
            </div>
            <div className="AdminColumnLabel">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FarmerSection({ title, searchValue, onSearchChange, placeholder, farmers, emptyText, actions }) {
  return (
    <div className="AdminStack">
      <section className="Card">
        <div className="CardBody">
          <div className="AdminSectionHeader">
            <div>
              <h2 className="SectionTitle">{title}</h2>
            </div>
          </div>
          <input className="SearchInput" placeholder={placeholder} value={searchValue} onChange={(e) => onSearchChange(e.target.value)} />
        </div>
      </section>

      {farmers.length === 0 ? (
        <p className="Muted">{emptyText}</p>
      ) : (
        <div className="Grid">
          {farmers.map((farmer) => (
            <div className="Card" key={farmer.id}>
              <div className="CardBody">
                <h3>{farmer.name}</h3>
                <p className="Muted">{farmer.phone || 'No phone number'}</p>
                {farmer.email && <p className="Muted">{farmer.email}</p>}
                <div className="AdminPillRow">
                  <span className="AdminPill">{capitalize(getFarmerStatus(farmer))}</span>
                  <span className="AdminPill">{new Date(farmer.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
                <div className="AdminDetailList">
                  {farmer.address && <div><strong>Address:</strong> {farmer.address}</div>}
                  {(farmer.idType || farmer.idNumber) && <div><strong>ID:</strong> {[farmer.idType, farmer.idNumber].filter(Boolean).join(' - ')}</div>}
                  {farmer.businessName && <div><strong>Business:</strong> {farmer.businessName}</div>}
                  {farmer.businessAddress && <div><strong>Business Address:</strong> {farmer.businessAddress}</div>}
                  {farmer.businessPhone && <div><strong>Business Phone:</strong> {farmer.businessPhone}</div>}
                  {farmer.registrationNumber && <div><strong>Registration No:</strong> {farmer.registrationNumber}</div>}
                  {(farmer.bankName || farmer.accountName || farmer.accountNumber) && (
                    <div><strong>Bank:</strong> {[farmer.bankName, farmer.branchName, farmer.branchCode, farmer.accountName, farmer.accountNumber].filter(Boolean).join(' | ')}</div>
                  )}
                  {(farmer.mobileMoneyNumber || farmer.mobileMoneyMtnName) && (
                    <div><strong>MTN MoMo:</strong> {[farmer.mobileMoneyMtnName, farmer.mobileMoneyNumber].filter(Boolean).join(' - ')}</div>
                  )}
                </div>
                <div className="AdminButtonRow">
                  {actions(farmer)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchSummaryCard({ label, value }) {
  return (
    <div className="Card">
      <div className="CardBody">
        <strong>{label}</strong>
        <div className="Muted">{value} match(es)</div>
      </div>
    </div>
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
    <form onSubmit={submit} className="AdminFormGrid">
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
      <div className="AdminFieldWide AdminButtonRow">
        <button className="Btn" type="submit">Create Admin</button>
        {ok && <span style={{ color: '#16a34a' }}>{ok}</span>}
        {error && <span style={{ color: 'crimson' }}>{error}</span>}
      </div>
    </form>
  );
}

function filterOrdersByRange(orders, period, fromDate, toDate) {
  if (period === 'all') return orders;

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  let start = null;
  let end = null;

  if (period === '7d') {
    start = new Date(today);
    start.setDate(today.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    end = today;
  } else if (period === '30d') {
    start = new Date(today);
    start.setDate(today.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    end = today;
  } else if (period === 'custom') {
    start = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    end = toDate ? new Date(`${toDate}T23:59:59`) : null;
  }

  return orders.filter((order) => {
    const date = getOrderDate(order);
    if (start && date < start) return false;
    if (end && date > end) return false;
    return true;
  });
}

function buildDailySeries(orders, selector) {
  const map = new Map();
  orders.forEach((order) => {
    const key = getOrderDate(order).toISOString().slice(0, 10);
    map.set(key, (map.get(key) || 0) + selector(order));
  });
  return {
    points: Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, value]) => ({ label, value })),
  };
}

function buildUnitsByCategory(orders, productsMap) {
  const map = new Map();
  let total = 0;
  orders.forEach((order) => {
    getOrderItems(order).forEach((item) => {
      const product = productsMap.get(item.productId || item.id);
      const category = product?.category || 'other';
      const qty = getItemQty(item);
      total += qty;
      map.set(category, (map.get(category) || 0) + qty);
    });
  });
  return {
    total,
    entries: Array.from(map.entries()).map(([label, value]) => ({ label, value })),
  };
}

function buildTopProducts(orders, productsMap) {
  const map = new Map();
  orders.forEach((order) => {
    getOrderItems(order).forEach((item) => {
      const product = productsMap.get(item.productId || item.id);
      const name = product?.name || String(item.productId || item.id);
      map.set(name, (map.get(name) || 0) + getItemQty(item));
    });
  });
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

function buildFarmerPerformance(orders, productsMap, farmersMap) {
  const map = new Map();
  orders.forEach((order) => {
    getOrderItems(order).forEach((item) => {
      const product = productsMap.get(item.productId || item.id);
      if (!product?.sellerId) return;
      const farmer = farmersMap.get(product.sellerId);
      const label = farmer?.name || `Farmer ${product.sellerId}`;
      const current = map.get(label) || { label, value: 0, units: 0, orders: new Set() };
      current.value += (Number(item.price) || 0) * getItemQty(item);
      current.units += getItemQty(item);
      current.orders.add(order.id);
      map.set(label, current);
    });
  });
  return Array.from(map.values())
    .map((entry) => ({ ...entry, orders: entry.orders.size }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

function getOrderDate(order) {
  return new Date(order.createdAt || order.placedAt || Date.now());
}

function getOrderItems(order) {
  return Array.isArray(order.items) ? order.items : [];
}

function getItemQty(item) {
  return Number(item.quantity || item.qty || 0);
}

function getOrderValue(order) {
  if (order.totalAmount !== undefined) return Number(order.totalAmount) || 0;
  return getOrderItems(order).reduce((sum, item) => sum + (Number(item.price) || 0) * getItemQty(item), 0);
}

function getFarmerStatus(farmer) {
  return farmer.status || (farmer.approved ? 'approved' : 'pending');
}

function matchesSearch(value, search) {
  return String(value || '').toLowerCase().includes(search);
}

function filterFarmers(list, search) {
  if (!search) return list;
  return list.filter((farmer) => (
    matchesSearch(farmer.name, search) ||
    matchesSearch(farmer.email, search) ||
    matchesSearch(farmer.phone, search) ||
    matchesSearch(farmer.address, search) ||
    matchesSearch(farmer.idType, search) ||
    matchesSearch(farmer.idNumber, search) ||
    matchesSearch(farmer.businessName, search) ||
    matchesSearch(farmer.businessAddress, search) ||
    matchesSearch(farmer.businessPhone, search) ||
    matchesSearch(farmer.registrationNumber, search) ||
    matchesSearch(farmer.bankName, search) ||
    matchesSearch(farmer.branchName, search) ||
    matchesSearch(farmer.branchCode, search) ||
    matchesSearch(farmer.accountName, search) ||
    matchesSearch(farmer.accountNumber, search) ||
    matchesSearch(farmer.mobileMoneyNumber, search) ||
    matchesSearch(farmer.mobileMoneyMtnName, search) ||
    matchesSearch(getFarmerStatus(farmer), search) ||
    String(farmer.id).includes(search)
  ));
}

function tabLabel(tab) {
  switch (tab) {
    case 'dashboard': return 'Dashboard';
    case 'hero': return 'Hero';
    case 'users': return 'Users';
    case 'orders': return 'Orders';
    case 'products': return 'Products';
    case 'search': return 'Global Search';
    case 'farmers-review': return 'Review Farmers';
    case 'farmers-list': return 'List Of Farmers';
    case 'farmers-rejected': return 'Rejected Farmers';
    case 'settings-categories': return 'Settings';
    case 'settings-general': return 'Settings';
    case 'settings-storefront': return 'Settings';
    default: return 'Dashboard';
  }
}

function capitalize(value) {
  const text = String(value || '');
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : '';
}

export default Admin;
