import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addHeroSlide, deleteHeroSlide, reorderHeroSlides, updateHeroSlide } from '../hero/heroService';
import useHeroSlides from '../hero/useHeroSlides';
import { useSellerAuth } from '../auth/SellerAuthContext';
import { useUserAuth } from '../auth/UserAuthContext';
import { addProduct, deleteProduct } from '../products/productService';
import useProducts from '../products/useProducts';
import { getOrderEventName, loadOrders } from '../orders/orderService';
import { addCategory, deleteCategory, formatCategoryLabel, getCategoryValue, updateCategory } from '../categories/categoryService';
import useCategories from '../categories/useCategories';
import { PRODUCT_FALLBACK_IMAGE, SLIDE_FALLBACK_IMAGE, resolveImageSource, resolveProductImage } from '../utils/images';
import LoadingButton from '../components/LoadingButton';
import { useToast } from '../toast/ToastContext';

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
  const [pendingActions, setPendingActions] = useState({});
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [farmerViewMode, setFarmerViewMode] = useState('cards');
  const [farmersMenuOpen, setFarmersMenuOpen] = useState(true);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('categories');
  const [categoryName, setCategoryName] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryParentId, setEditingCategoryParentId] = useState('');
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
  const { sellers, approveSeller, rejectSeller, suspendSeller, deleteSeller, resetSellerPassword } = useSellerAuth();
  const { users, updateUser, deleteUser, register, current } = useUserAuth();
  const { showToast } = useToast();
  const slides = useHeroSlides();
  const products = useProducts();
  const categories = useCategories();
  const farmers = sellers;
  const productsMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const farmersMap = useMemo(() => new Map(farmers.map((f) => [f.id, f])), [farmers]);
  const usersMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const isActionLoading = (key) => Boolean(pendingActions[key]);

  const runAction = async (key, action, options = {}) => {
    if (pendingActions[key]) return null;
    setPendingActions((prev) => ({ ...prev, [key]: true }));
    try {
      const result = await action();
      const successMessage = typeof options.successMessage === 'function'
        ? options.successMessage(result)
        : options.successMessage;
      if (successMessage) {
        showToast(successMessage, { type: options.successType || 'success' });
      }
      return result;
    } catch (err) {
      const message = typeof options.errorMessage === 'function'
        ? options.errorMessage(err)
        : (options.errorMessage || err.message || 'Action failed');
      showToast(message, { type: 'error' });
      return null;
    } finally {
      setPendingActions((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const goToTab = (nextTab) => {
    setTab(nextTab);
    setQ('');
    if (nextTab.startsWith('farmers-')) setFarmersMenuOpen(true);
    if (nextTab.startsWith('settings-')) setSettingsMenuOpen(true);
  };

  const openFarmerDetails = (farmer) => {
    setSelectedFarmer(farmer);
  };

  const closeFarmerDetails = () => {
    setSelectedFarmer(null);
  };

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
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
    const names = categories.map((category) => getCategoryValue(category));
    setProductForm((prev) => ({ ...prev, category: names.includes(prev.category) ? prev.category : getCategoryValue(categories[0]) }));
  }, [categories]);

  useEffect(() => {
    if (!selectedFarmer?.id) return;
    const liveFarmer = farmers.find((entry) => String(entry.id) === String(selectedFarmer.id));
    if (liveFarmer) {
      setSelectedFarmer(liveFarmer);
    } else {
      setSelectedFarmer(null);
    }
  }, [farmers, selectedFarmer?.id]);

  useEffect(() => {
    if (!selectedOrder?.id) return;
    const liveOrder = orders.find((entry) => String(entry.id) === String(selectedOrder.id));
    if (liveOrder) {
      setSelectedOrder(liveOrder);
    } else {
      setSelectedOrder(null);
    }
  }, [orders, selectedOrder?.id]);

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
      matchesSearch(user.username, search) ||
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

  const adminUsers = useMemo(
    () => filteredUsers.filter((user) => user.role === 'admin'),
    [filteredUsers]
  );

  const buyerUsers = useMemo(
    () => filteredUsers.filter((user) => user.role === 'buyer'),
    [filteredUsers]
  );

  const marketplaceUsers = useMemo(() => {
    const buyerEntries = buyerUsers.map((user) => ({ ...user, accountType: 'buyer' }));
    const farmerEntries = filterFarmers(farmers, search).map((farmer) => ({ ...farmer, accountType: 'farmer' }));
    return [...buyerEntries, ...farmerEntries].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [buyerUsers, farmers, search]);

  const addUrl = async () => {
    const nextImageUrl = imageUrl.trim();
    if (!nextImageUrl) return;
    await runAction(
      'hero-add-url',
      async () => {
        await addHeroSlide({ title: title || 'Banner', image: nextImageUrl, cta: { text: 'Shop', href: '/' } });
        setTitle('');
        setImageUrl('');
      },
      {
        successMessage: 'Hero slide added.',
        errorMessage: 'Failed to add hero slide.',
      }
    );
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
    if (!urls.length) {
      showToast('No images were selected.', { type: 'error' });
      return;
    }
    await runAction(
      'hero-upload',
      async () => {
        await Promise.all(urls.map((url) => addHeroSlide({ title: title || 'Banner', image: url, cta: { text: 'Shop', href: '/' } })));
        setTitle('');
        setImageUrl('');
      },
      {
        successMessage: urls.length === 1 ? 'Hero slide uploaded.' : 'Hero slides uploaded.',
        errorMessage: 'Failed to upload hero slides.',
      }
    );
  };

  const removeSlide = async (id) => {
    await runAction(
      `hero-delete-${id}`,
      () => deleteHeroSlide(id),
      {
        successMessage: 'Hero slide removed.',
        errorMessage: 'Failed to remove hero slide.',
      }
    );
  };

  const moveUp = async (id) => {
    const ids = slides.map((slide) => slide.id);
    const index = ids.indexOf(id);
    if (index > 0) {
      [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
      await runAction(
        `hero-up-${id}`,
        () => reorderHeroSlides(ids),
        {
          successMessage: 'Hero slide moved up.',
          errorMessage: 'Failed to reorder hero slides.',
        }
      );
    }
  };

  const moveDown = async (id) => {
    const ids = slides.map((slide) => slide.id);
    const index = ids.indexOf(id);
    if (index >= 0 && index < ids.length - 1) {
      [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]];
      await runAction(
        `hero-down-${id}`,
        () => reorderHeroSlides(ids),
        {
          successMessage: 'Hero slide moved down.',
          errorMessage: 'Failed to reorder hero slides.',
        }
      );
    }
  };

  const startEdit = (slide) => {
    setEditingId(slide.id);
    setEditingTitle(slide.title || '');
    setEditingImageUrl(slide.image || '');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await runAction(
      'hero-edit-save',
      async () => {
        await updateHeroSlide(editingId, { title: editingTitle, image: editingImageUrl });
        setEditingId(null);
      },
      {
        successMessage: 'Hero slide updated.',
        errorMessage: 'Failed to update hero slide.',
      }
    );
  };

  const cancelEdit = () => setEditingId(null);

  const onEditUpload = async (files) => {
    const urls = await toDataUrls(files);
    if (urls[0]) setEditingImageUrl(urls[0]);
  };

  const removeProduct = async (id) => {
    await runAction(
      `product-delete-${id}`,
      () => deleteProduct(id),
      {
        successMessage: 'Product removed.',
        errorMessage: 'Failed to remove product.',
      }
    );
  };

  const submitProduct = async (e) => {
    e.preventDefault();
    const farmer = approvedFarmers.find((entry) => String(entry.id) === productForm.farmerId);
    if (!farmer) {
      showToast('Select an approved farmer first.', { type: 'error' });
      return;
    }
    await runAction(
      'product-create',
      async () => {
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
          category: getCategoryValue(categories[0]) || '',
          price: '',
          inventory: '',
          description: '',
          tags: '',
          imageUrl: '',
          farmerId: '',
        });
        setShowAddProduct(false);
      },
      {
        successMessage: `Product created for ${farmer.name}.`,
        errorMessage: 'Failed to create product.',
      }
    );
  };

  const submitCategory = async (e) => {
    e.preventDefault();
    await runAction(
      'category-create',
      async () => {
        await addCategory({ name: categoryName, parentId: parentCategoryId });
        setCategoryName('');
        setParentCategoryId('');
      },
      {
        successMessage: 'Category created.',
        errorMessage: (err) => err.message || 'Failed to create category.',
      }
    );
  };

  const categoryCounts = useMemo(() => {
    const byName = new Map(categories.map((category) => [getCategoryValue(category), category]));
    const byId = new Map(categories.map((category) => [String(category.id), category]));
    const counts = new Map();
    products.forEach((product) => {
      let current = byName.get(String(product.category || '').toLowerCase());
      while (current) {
        const key = getCategoryValue(current);
        counts.set(key, (counts.get(key) || 0) + 1);
        current = current.parentId ? byId.get(String(current.parentId)) : null;
      }
    });
    return counts;
  }, [categories, products]);

  const parentCategoryOptions = useMemo(
    () => categories.filter((category) => category.level === 0),
    [categories]
  );

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
          <SidebarButton compact label="Storefront" active={tab === 'settings-storefront'} onClick={() => { setSettingsTab('storefront'); goToTab('settings-storefront'); }} count={slides.length} />
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
              {tab === 'users' && 'Manage marketplace users and keep admin accounts separate.'}
              {tab === 'orders' && 'Review all orders placed in the marketplace.'}
              {tab === 'search' && 'Search across users, farmers, products, and orders.'}
              {tab === 'settings-categories' && 'Manage live categories with parent and child structure for the storefront and product forms.'}
              {tab === 'settings-general' && 'General settings panel.'}
              {tab === 'settings-storefront' && 'Manage hero banners and storefront presentation settings.'}
            </p>
          </div>
        </div>

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

        {tab === 'users' && (
          <div className="AdminStack">
            <section className="Card">
              <div className="CardBody">
                <div className="AdminSectionHeader">
                  <div>
                    <h2 className="SectionTitle">Admin Accounts</h2>
                    <p className="AdminSubtle">Create admin-only accounts with full name, username, phone number, and password.</p>
                  </div>
                  <button className="Btn" type="button" onClick={() => setShowCreateUserModal(true)}>Create User</button>
                </div>
              </div>
            </section>

            <section className="Card">
              <div className="CardBody">
                <input className="SearchInput" placeholder="Search buyers, farmers, and admins" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </section>

            <div className="AdminSearchGrid">
              <SearchSummaryCard label="Buyers" value={buyerUsers.length} />
              <SearchSummaryCard label="Farmers" value={filterFarmers(farmers, search).length} />
              <SearchSummaryCard label="Admins" value={adminUsers.length} />
              <SearchSummaryCard label="All Users" value={marketplaceUsers.length + adminUsers.length} />
            </div>

            <section className="Card">
              <div className="CardBody">
                <div className="AdminSectionHeader">
                  <div>
                    <h2 className="SectionTitle">Marketplace Users</h2>
                    <p className="AdminSubtle">Buyers and farmers are kept separate from admin accounts.</p>
                  </div>
                </div>
                {marketplaceUsers.length === 0 ? (
                  <p className="Muted">No marketplace users found.</p>
                ) : (
                  <div className="Grid">
                    {marketplaceUsers.map((user) => (
                      <div className="Card" key={`${user.accountType}-${user.id}`}>
                        <div className="CardBody">
                          <h3>{user.name}</h3>
                          <div className="AdminPillRow">
                            <span className="AdminPill">{capitalize(user.accountType)}</span>
                            {user.isVerified && <span className="AdminPill">Verified</span>}
                            {user.accountType === 'farmer' && <span className="AdminPill">{capitalize(getFarmerStatus(user))}</span>}
                          </div>
                          {user.username && <p className="Muted">@{user.username}</p>}
                          <p className="Muted">{user.phone || 'No phone number'}</p>
                          {user.email && <p className="Muted">{user.email}</p>}
                          <div className="AdminDetailList">
                            {user.address && <div><strong>Address:</strong> {user.address}</div>}
                            {(user.idType || user.idNumber) && <div><strong>ID:</strong> {[user.idType, user.idNumber].filter(Boolean).join(' - ')}</div>}
                            {user.accountType === 'farmer' && user.businessName && <div><strong>Business:</strong> {user.businessName}</div>}
                          </div>
                          <div className="AdminButtonRow">
                            {user.accountType === 'buyer' ? (
                              <>
                                <LoadingButton
                                  className="BtnOutline"
                                  type="button"
                                  loading={isActionLoading(`buyer-verify-${user.id}`)}
                                  loadingText="Saving..."
                                  onClick={() => runAction(
                                    `buyer-verify-${user.id}`,
                                    () => updateUser(user.id, { isVerified: !user.isVerified }),
                                    {
                                      successMessage: user.isVerified ? 'Buyer verification removed.' : 'Buyer marked as verified.',
                                      errorMessage: 'Failed to update buyer verification.',
                                    }
                                  )}
                                >
                                  {user.isVerified ? 'Remove Verification' : 'Mark Verified'}
                                </LoadingButton>
                                <LoadingButton
                                  className="BtnDanger"
                                  type="button"
                                  loading={isActionLoading(`buyer-delete-${user.id}`)}
                                  loadingText="Removing..."
                                  onClick={() => runAction(
                                    `buyer-delete-${user.id}`,
                                    () => deleteUser(user.id),
                                    {
                                      successMessage: 'Buyer removed.',
                                      errorMessage: 'Failed to remove buyer.',
                                    }
                                  )}
                                >
                                  Remove Buyer
                                </LoadingButton>
                              </>
                            ) : (
                              <>
                                <LoadingButton
                                  className="BtnOutline"
                                  type="button"
                                  loading={isActionLoading(`farmer-verify-${user.id}`)}
                                  loadingText="Saving..."
                                  onClick={() => runAction(
                                    `farmer-verify-${user.id}`,
                                    () => updateUser(user.id, { isVerified: !user.isVerified }),
                                    {
                                      successMessage: user.isVerified ? 'Farmer verification removed.' : 'Farmer marked as verified.',
                                      errorMessage: 'Failed to update farmer verification.',
                                    }
                                  )}
                                >
                                  {user.isVerified ? 'Remove Verification' : 'Mark Verified'}
                                </LoadingButton>
                                <button
                                  className="BtnOutline"
                                  type="button"
                                  onClick={() => {
                                    goToTab(getFarmerStatus(user) === 'approved' ? 'farmers-list' : getFarmerStatus(user) === 'pending' ? 'farmers-review' : 'farmers-rejected');
                                    openFarmerDetails(user);
                                  }}
                                >
                                  Open Farmer Record
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="Card">
              <div className="CardBody">
                <div className="AdminSectionHeader">
                  <div>
                    <h2 className="SectionTitle">Admin Users</h2>
                    <p className="AdminSubtle">These accounts can access the admin dashboard.</p>
                  </div>
                </div>
                {adminUsers.length === 0 ? (
                  <p className="Muted">No admin users found.</p>
                ) : (
                  <div className="Grid">
                    {adminUsers.map((user) => (
                      <div className="Card" key={user.id}>
                        <div className="CardBody">
                          <h3>{user.name}</h3>
                          {user.username && <p className="Muted">@{user.username}</p>}
                          <p className="Muted">{user.phone || 'No phone number'}</p>
                          {user.email && <p className="Muted">{user.email}</p>}
                          <div className="AdminInlineField">
                            <label>
                              Role
                              <select
                                value={user.role || 'admin'}
                                disabled={isActionLoading(`admin-role-${user.id}`)}
                                onChange={(e) => runAction(
                                  `admin-role-${user.id}`,
                                  () => updateUser(user.id, { role: e.target.value }),
                                  {
                                    successMessage: 'Admin role updated.',
                                    errorMessage: 'Failed to update admin role.',
                                  }
                                )}
                              >
                                <option value="admin">Admin</option>
                              </select>
                            </label>
                            <LoadingButton
                              className="BtnDanger"
                              type="button"
                              loading={isActionLoading(`admin-delete-${user.id}`)}
                              loadingText="Removing..."
                              onClick={() => runAction(
                                `admin-delete-${user.id}`,
                                () => deleteUser(user.id),
                                {
                                  successMessage: 'Admin removed.',
                                  errorMessage: 'Failed to remove admin.',
                                }
                              )}
                            >
                              Remove
                            </LoadingButton>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
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
            viewMode={farmerViewMode}
            onViewModeChange={setFarmerViewMode}
            onSelectFarmer={openFarmerDetails}
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
            viewMode={farmerViewMode}
            onViewModeChange={setFarmerViewMode}
            onSelectFarmer={openFarmerDetails}
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
            viewMode={farmerViewMode}
            onViewModeChange={setFarmerViewMode}
            onSelectFarmer={openFarmerDetails}
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
              <div className="AdminOrdersGrid">
                {filteredOrders.map((order) => (
                  <button className="AdminOrderCard" key={order.id} type="button" onClick={() => openOrderDetails(order)}>
                    <div className="OrderHeader">
                      <strong>Order #{String(order.id).slice(-8)}</strong>
                      <span>{new Date(order.createdAt || order.placedAt).toLocaleString()}</span>
                    </div>
                    <div className="OrderTotal">Status: {formatOrderStatusLabel(order.orderStatus || order.status || 'processing')}</div>
                    <div className="Muted">Buyer: {usersMap.get(String(order.buyerId || ''))?.name || `Buyer ${String(order.buyerId || '').slice(-6)}`}</div>
                    <div className="Muted">Items: {getOrderItems(order).length}</div>
                    <div className="Muted">Total: GHS {getOrderValue(order).toFixed(2)}</div>
                    <div className="AdminPillRow" style={{ marginTop: '0.65rem' }}>
                      {buildOrderTimeline(order.orderStatus || order.status || 'processing').map((step) => (
                        <span key={step.label} className="AdminPill" style={{ background: step.active ? '#dcfce7' : '#e2e8f0', color: step.active ? '#166534' : '#475569' }}>
                          {step.label}
                        </span>
                      ))}
                    </div>
                    {order.neededBy && <div className="Muted">Needed by: {order.neededBy}</div>}
                    {order.requestNote && <div className="Muted AdminOrderPreviewNote">{order.requestNote}</div>}
                    <div className="AdminOrderCardFooter">Click to view full order details</div>
                  </button>
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
                          <LoadingButton
                            className="BtnDanger"
                            type="button"
                            loading={isActionLoading(`product-delete-${product.id}`)}
                            loadingText="Removing..."
                            onClick={() => removeProduct(product.id)}
                          >
                            Remove
                          </LoadingButton>
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
                        <p className="AdminSubtle">Create parent and child categories once and reuse them across the storefront and product forms.</p>
                      </div>
                    </div>
                    <form onSubmit={submitCategory} className="AdminFormGrid">
                      <label>
                        Category Name
                        <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="e.g. root crops" required />
                      </label>
                      <label>
                        Parent Category
                        <select value={parentCategoryId} onChange={(e) => setParentCategoryId(e.target.value)}>
                          <option value="">No parent category</option>
                          {parentCategoryOptions.map((category) => (
                            <option key={category.id} value={category.id}>{formatCategoryLabel(category)}</option>
                          ))}
                        </select>
                      </label>
                      <div className="AdminFieldWide AdminButtonRow">
                        <LoadingButton className="Btn" type="submit" loading={isActionLoading('category-create')} loadingText="Creating...">
                          Create Category
                        </LoadingButton>
                      </div>
                    </form>
                  </div>
                </section>

                <section className="Card">
                  <div className="CardBody">
                    <div className="AdminCategoryList">
                      {categories.map((category) => (
                        <div key={category.id} className="AdminCategoryRow">
                          <div>
                            <strong>{formatCategoryLabel(category)}</strong>
                            <div className="Muted">
                              {category.parentName ? `Parent: ${formatCategoryLabel(category.parentName)} • ` : 'Top level • '}
                              {categoryCounts.get(getCategoryValue(category)) || 0} product(s)
                            </div>
                          </div>
                          <div className="AdminButtonRow">
                            <button
                              className="BtnOutline"
                              type="button"
                              onClick={() => {
                                setEditingCategoryId(category.id);
                                setEditingCategoryName(category.name);
                                setEditingCategoryParentId(category.parentId || '');
                              }}
                            >
                              Edit
                            </button>
                            <LoadingButton
                              className="BtnDanger"
                              type="button"
                              loading={isActionLoading(`category-delete-${category.id}`)}
                              loadingText="Deleting..."
                              disabled={(categoryCounts.get(getCategoryValue(category)) || 0) > 0}
                              onClick={() => runAction(
                                `category-delete-${category.id}`,
                                () => deleteCategory(category),
                                {
                                  successMessage: `${formatCategoryLabel(category)} removed.`,
                                  errorMessage: `Failed to remove ${formatCategoryLabel(category)}.`,
                                }
                              )}
                            >
                              Delete
                            </LoadingButton>
                          </div>
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
              <>
                <section className="Card">
                  <div className="CardBody">
                    <div className="AdminSectionHeader">
                      <div>
                        <h2 className="SectionTitle">Hero Slides</h2>
                        <p className="AdminSubtle">Manage homepage banners directly from storefront settings.</p>
                      </div>
                    </div>
                    <div className="AdminFormGrid">
                      <label>
                        Title
                        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fresh arrivals this week" />
                      </label>
                      <label>
                        Image URL
                        <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
                      </label>
                      <div className="AdminButtonRow AdminFormActions">
                        <LoadingButton className="Btn" type="button" onClick={addUrl} loading={isActionLoading('hero-add-url')} loadingText="Adding...">
                          Add From URL
                        </LoadingButton>
                        <label className="BtnOutline AdminUploadButton">
                          {isActionLoading('hero-upload') ? 'Uploading...' : 'Upload Images'}
                          <input type="file" accept="image/*" multiple onChange={(e) => uploadImages(e.target.files)} disabled={isActionLoading('hero-upload')} />
                        </label>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="Card">
                  <div className="CardBody">
                    <h2 className="SectionTitle">Live Hero Banners</h2>
                    {slides.length === 0 ? (
                      <p className="Muted">No hero slides yet.</p>
                    ) : (
                      <div className="Grid">
                        {slides.map((slide) => (
                          <div className="Card" key={slide.id}>
                            <img src={resolveImageSource(slide.image, SLIDE_FALLBACK_IMAGE, 'landscape_16_9')} alt={slide.title} onError={(e) => { e.currentTarget.src = SLIDE_FALLBACK_IMAGE; }} />
                            <div className="CardBody">
                              <h3>{slide.title}</h3>
                              <div className="AdminButtonRow">
                                <LoadingButton className="BtnOutline" type="button" onClick={() => moveUp(slide.id)} loading={isActionLoading(`hero-up-${slide.id}`)} loadingText="Moving...">
                                  Up
                                </LoadingButton>
                                <LoadingButton className="BtnOutline" type="button" onClick={() => moveDown(slide.id)} loading={isActionLoading(`hero-down-${slide.id}`)} loadingText="Moving...">
                                  Down
                                </LoadingButton>
                                <button className="BtnOutline" type="button" onClick={() => startEdit(slide)}>Edit</button>
                                <LoadingButton className="BtnDanger" type="button" onClick={() => removeSlide(slide.id)} loading={isActionLoading(`hero-delete-${slide.id}`)} loadingText="Deleting...">
                                  Delete
                                </LoadingButton>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </section>

      {selectedFarmer && (
        <FarmerDetailModal
          farmer={selectedFarmer}
          onClose={closeFarmerDetails}
          isActionLoading={isActionLoading}
          onToggleVerified={() => runAction(
            `farmer-verify-${selectedFarmer.id}`,
            () => updateUser(selectedFarmer.id, { isVerified: !selectedFarmer.isVerified }),
            {
              successMessage: selectedFarmer.isVerified ? 'Farmer verification removed.' : 'Farmer marked as verified.',
              errorMessage: 'Failed to update farmer verification.',
            }
          )}
          onApprove={() => runAction(
            `approve-farmer-${selectedFarmer.id}`,
            async () => {
              await approveSeller(selectedFarmer.id);
              if (tab !== 'farmers-list') goToTab('farmers-list');
            },
            {
              successMessage: `${selectedFarmer.name} approved.`,
              errorMessage: `Failed to approve ${selectedFarmer.name}.`,
            }
          )}
          onDisable={() => runAction(
            `disable-farmer-${selectedFarmer.id}`,
            async () => {
              await suspendSeller(selectedFarmer.id);
              if (tab !== 'farmers-rejected') goToTab('farmers-rejected');
            },
            {
              successMessage: `${selectedFarmer.name} disabled.`,
              errorMessage: `Failed to disable ${selectedFarmer.name}.`,
            }
          )}
          onReject={() => runAction(
            `reject-farmer-${selectedFarmer.id}`,
            async () => {
              await rejectSeller(selectedFarmer.id);
              if (tab !== 'farmers-rejected') goToTab('farmers-rejected');
            },
            {
              successMessage: `${selectedFarmer.name} rejected.`,
              errorMessage: `Failed to reject ${selectedFarmer.name}.`,
            }
          )}
          onDelete={async () => {
            const removed = await runAction(
              `delete-farmer-${selectedFarmer.id}`,
              () => deleteSeller(selectedFarmer.id),
              {
                successMessage: `${selectedFarmer.name} removed.`,
                errorMessage: `Failed to remove ${selectedFarmer.name}.`,
              }
            );
            if (removed !== null) {
              closeFarmerDetails();
            }
          }}
          onResetPassword={(password) => runAction(
            `reset-password-${selectedFarmer.id}`,
            () => resetSellerPassword(selectedFarmer.id, password),
            {
              successMessage: `Password reset for ${selectedFarmer.name}.`,
              errorMessage: (err) => err.message || `Failed to reset ${selectedFarmer.name}'s password.`,
            }
          )}
        />
      )}

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          productsMap={productsMap}
          farmersMap={farmersMap}
          usersMap={usersMap}
          onClose={closeOrderDetails}
        />
      )}

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
                  <LoadingButton className="Btn" type="button" onClick={saveEdit} loading={isActionLoading('hero-edit-save')} loadingText="Saving...">
                    Save
                  </LoadingButton>
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
                      <option key={category.id} value={getCategoryValue(category)}>{formatCategoryLabel(category)}</option>
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
                  <LoadingButton className="Btn" type="submit" loading={isActionLoading('product-create')} loadingText="Saving...">
                    Save Product
                  </LoadingButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showCreateUserModal && (
        <div className="EditOverlay">
          <div className="EditModal Card AdminModalMedium">
            <div className="CardBody">
              <div className="AdminSectionHeader">
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: '0.2rem' }}>Create User</h3>
                  <p className="AdminSubtle">Create a new admin account without crowding the main Users page.</p>
                </div>
                <button className="BtnOutline" type="button" onClick={() => setShowCreateUserModal(false)}>Close</button>
              </div>
              <AdminCreateForm
                loading={isActionLoading('admin-create')}
                onCreate={async (payload) => {
                  const created = await runAction(
                    'admin-create',
                    () => register({ ...payload, role: 'admin' }),
                    {
                      successMessage: 'Admin created.',
                      errorMessage: 'Failed to create admin.',
                    }
                  );
                  if (created) {
                    setShowCreateUserModal(false);
                  }
                  return created;
                }}
              />
            </div>
          </div>
        </div>
      )}

      {editingCategoryId && (
        <div className="EditOverlay">
          <div className="EditModal Card AdminModalMedium">
            <div className="CardBody">
              <div className="AdminSectionHeader">
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: '0.2rem' }}>Edit Category</h3>
                  <p className="AdminSubtle">Update the category name or move it under a different parent.</p>
                </div>
                <button className="BtnOutline" type="button" onClick={() => setEditingCategoryId(null)}>Close</button>
              </div>
              <form
                className="AdminFormGrid"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const updated = await runAction(
                    'category-edit-save',
                    () => updateCategory(editingCategoryId, { name: editingCategoryName, parentId: editingCategoryParentId }),
                    {
                      successMessage: 'Category updated.',
                      errorMessage: (err) => err.message || 'Failed to update category.',
                    }
                  );
                  if (updated) {
                    setEditingCategoryId(null);
                    setEditingCategoryName('');
                    setEditingCategoryParentId('');
                  }
                }}
              >
                <label>
                  Category Name
                  <input value={editingCategoryName} onChange={(e) => setEditingCategoryName(e.target.value)} required />
                </label>
                <label>
                  Parent Category
                  <select value={editingCategoryParentId} onChange={(e) => setEditingCategoryParentId(e.target.value)}>
                    <option value="">No parent category</option>
                    {parentCategoryOptions
                      .filter((category) => category.id !== editingCategoryId)
                      .map((category) => (
                        <option key={category.id} value={category.id}>{formatCategoryLabel(category)}</option>
                      ))}
                  </select>
                </label>
                <div className="AdminFieldWide AdminButtonRow AdminAlignEnd">
                  <button className="BtnOutline" type="button" onClick={() => setEditingCategoryId(null)}>Cancel</button>
                  <LoadingButton className="Btn" type="submit" loading={isActionLoading('category-edit-save')} loadingText="Saving...">
                    Save Category
                  </LoadingButton>
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

function FarmerSection({
  title,
  searchValue,
  onSearchChange,
  placeholder,
  farmers,
  emptyText,
  viewMode,
  onViewModeChange,
  onSelectFarmer,
}) {
  return (
    <div className="AdminStack">
      <section className="Card">
        <div className="CardBody">
          <div className="AdminSectionHeader">
            <div>
              <h2 className="SectionTitle">{title}</h2>
              <p className="AdminSubtle">Click a farmer to open the full profile and manage approval, disable/enable, and password reset.</p>
            </div>
            <div className="AdminViewToggle">
              <button className={`BtnOutline ${viewMode === 'cards' ? 'AdminViewToggleActive' : ''}`} type="button" onClick={() => onViewModeChange('cards')}>Card View</button>
              <button className={`BtnOutline ${viewMode === 'table' ? 'AdminViewToggleActive' : ''}`} type="button" onClick={() => onViewModeChange('table')}>Table View</button>
            </div>
          </div>
          <div className="AdminSearchWrap">
            <input className="SearchInput" placeholder={placeholder} value={searchValue} onChange={(e) => onSearchChange(e.target.value)} />
          </div>
        </div>
      </section>

      {farmers.length === 0 ? (
        <p className="Muted">{emptyText}</p>
      ) : viewMode === 'table' ? (
        <div className="Card">
          <div className="CardBody">
            <div className="AdminTableWrap">
              <table className="AdminTable">
                <thead>
                  <tr>
                    <th>Farmer</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {farmers.map((farmer) => (
                    <tr key={farmer.id} className="AdminTableRowInteractive" onClick={() => onSelectFarmer(farmer)}>
                      <td>
                        <strong>{farmer.name}</strong>
                        {farmer.businessName && <div className="Muted">{farmer.businessName}</div>}
                      </td>
                      <td>{farmer.phone || '-'}</td>
                      <td>{farmer.email || '-'}</td>
                      <td>{capitalize(getFarmerStatus(farmer))}</td>
                      <td>{new Date(farmer.createdAt || Date.now()).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="BtnOutline"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectFarmer(farmer);
                          }}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="Grid FarmerCardGrid">
          {farmers.map((farmer) => (
            <button className="FarmerCardButton Card" key={farmer.id} type="button" onClick={() => onSelectFarmer(farmer)}>
              <div className="CardBody FarmerCardBody">
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
                  {farmer.businessPhone && <div><strong>Business Phone:</strong> {farmer.businessPhone}</div>}
                  {farmer.bankName && <div><strong>Bank:</strong> {farmer.bankName}</div>}
                </div>
                <div className="FarmerCardFooter">View full details and manage account</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FarmerDetailModal({
  farmer,
  onClose,
  onToggleVerified,
  onApprove,
  onDisable,
  onReject,
  onDelete,
  onResetPassword,
  isActionLoading,
}) {
  const [newPassword, setNewPassword] = useState('');
  const status = getFarmerStatus(farmer);
  const canEnable = ['rejected', 'suspended', 'blocked'].includes(status);
  const canDisable = status === 'approved';
  const canReject = ['pending', 'approved'].includes(status);
  const canApprove = status === 'pending' || canEnable;

  return (
    <div className="EditOverlay">
      <div className="EditModal Card AdminModalMedium DetailModal">
        <div className="CardBody">
          <div className="AdminSectionHeader">
            <div>
              <h3 style={{ marginTop: 0, marginBottom: '0.2rem' }}>{farmer.name}</h3>
              <p className="AdminSubtle">Review account details, approval state, access status, and password support.</p>
            </div>
            <button className="BtnOutline" type="button" onClick={onClose}>Close</button>
          </div>

          <div className="AdminPillRow" style={{ marginTop: 0 }}>
            <span className="AdminPill">{capitalize(status)}</span>
            {farmer.isVerified && <span className="AdminPill">Verified</span>}
            <span className="AdminPill">{farmer.email || 'No email'}</span>
            <span className="AdminPill">{farmer.phone || 'No phone'}</span>
          </div>

          <div className="FarmerDetailGrid">
            <InfoBlock label="Address" value={farmer.address} />
            <InfoBlock label="ID" value={[farmer.idType, farmer.idNumber].filter(Boolean).join(' - ')} />
            <InfoBlock label="Business Name" value={farmer.businessName} />
            <InfoBlock label="Business Address" value={farmer.businessAddress} />
            <InfoBlock label="Business Phone" value={farmer.businessPhone} />
            <InfoBlock label="Registration Number" value={farmer.registrationNumber} />
            <InfoBlock label="Bank Details" value={[farmer.bankName, farmer.branchName, farmer.branchCode, farmer.accountName, farmer.accountNumber].filter(Boolean).join(' | ')} />
            <InfoBlock label="MTN MoMo" value={[farmer.mobileMoneyMtnName, farmer.mobileMoneyNumber].filter(Boolean).join(' - ')} />
          </div>

          <div className="AdminSectionHeader" style={{ marginTop: '1rem' }}>
            <div>
              <h4 style={{ margin: 0 }}>Account Actions</h4>
              <p className="AdminSubtle">Approve, verify, disable, enable again, reject, or permanently remove the farmer account.</p>
            </div>
          </div>
          <div className="AdminButtonRow">
            <LoadingButton
              className="BtnOutline"
              type="button"
              loading={isActionLoading(`farmer-verify-${farmer.id}`)}
              loadingText="Saving..."
              onClick={onToggleVerified}
            >
              {farmer.isVerified ? 'Remove Verification' : 'Mark Verified'}
            </LoadingButton>
            {canApprove && (
              <LoadingButton className="Btn" type="button" loading={isActionLoading(`approve-farmer-${farmer.id}`)} loadingText="Saving..." onClick={onApprove}>
                {status === 'pending' ? 'Approve Account' : 'Enable Account'}
              </LoadingButton>
            )}
            {canDisable && (
              <LoadingButton className="BtnOutline" type="button" loading={isActionLoading(`disable-farmer-${farmer.id}`)} loadingText="Disabling..." onClick={onDisable}>
                Disable Account
              </LoadingButton>
            )}
            {canReject && (
              <LoadingButton className="BtnDanger" type="button" loading={isActionLoading(`reject-farmer-${farmer.id}`)} loadingText="Rejecting..." onClick={onReject}>
                Reject Account
              </LoadingButton>
            )}
            <LoadingButton className="BtnDanger" type="button" loading={isActionLoading(`delete-farmer-${farmer.id}`)} loadingText="Deleting..." onClick={onDelete}>
              Delete Farmer
            </LoadingButton>
          </div>

          <div className="FarmerResetCard">
            <div>
              <h4 style={{ margin: 0 }}>Reset Password</h4>
              <p className="AdminSubtle">Set a new password for the farmer without requiring the old password.</p>
            </div>
            <div className="FarmerResetRow">
              <input
                type="password"
                placeholder="Enter a new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <LoadingButton
                className="Btn"
                type="button"
                loading={isActionLoading(`reset-password-${farmer.id}`)}
                loadingText="Resetting..."
                onClick={async () => {
                  const updated = await onResetPassword(newPassword);
                  if (updated) setNewPassword('');
                }}
              >
                Reset Password
              </LoadingButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderDetailModal({ order, productsMap, farmersMap, usersMap, onClose }) {
  const buyer = usersMap.get(String(order.buyerId || ''));
  const items = getOrderItems(order);

  return (
    <div className="EditOverlay">
      <div className="EditModal Card AdminModalMedium OrderDetailModal">
        <div className="CardBody">
          <div className="AdminSectionHeader">
            <div>
              <h3 style={{ marginTop: 0, marginBottom: '0.2rem' }}>Order #{order.id}</h3>
              <p className="AdminSubtle">Full order breakdown including buyer, delivery note, products, payment reference, and chat access.</p>
            </div>
            <button className="BtnOutline" type="button" onClick={onClose}>Close</button>
          </div>

          <div className="AdminPillRow" style={{ marginTop: 0 }}>
            <span className="AdminPill">{formatOrderStatusLabel(order.orderStatus || order.status || 'processing')}</span>
            <span className="AdminPill">{order.paymentStatus || 'paid'}</span>
            <span className="AdminPill">GHS {getOrderValue(order).toFixed(2)}</span>
          </div>

          <div className="FarmerDetailGrid">
            <InfoBlock label="Buyer" value={buyer?.name || `Buyer ${String(order.buyerId || '').slice(-6)}`} />
            <InfoBlock label="Buyer Phone" value={buyer?.phone} />
            <InfoBlock label="Buyer Email" value={buyer?.email} />
            <InfoBlock label="Placed At" value={new Date(order.createdAt || order.placedAt || Date.now()).toLocaleString()} />
            <InfoBlock label="Needed By" value={order.neededBy} />
            <InfoBlock label="Paystack Reference" value={order.paystackReference} />
            <InfoBlock label="Payment Status" value={order.paymentStatus} />
            <InfoBlock label="Delivery Note" value={order.requestNote} />
          </div>

          <div className="AdminButtonRow" style={{ marginTop: '1rem' }}>
            {order.buyerId ? (
              <Link className="BtnOutline" to={`/profiles/buyer/${encodeURIComponent(order.buyerId)}`}>
                View Buyer Profile
              </Link>
            ) : null}
          </div>

          <div className="AdminPillRow">
            {buildOrderTimeline(order.orderStatus || order.status || 'processing').map((step) => (
              <span key={step.label} className="AdminPill" style={{ background: step.active ? '#dcfce7' : '#e2e8f0', color: step.active ? '#166534' : '#475569' }}>
                {step.label}
              </span>
            ))}
          </div>

          <div className="AdminSectionHeader" style={{ marginTop: '1rem' }}>
            <div>
              <h4 style={{ margin: 0 }}>Products In This Order</h4>
              <p className="AdminSubtle">Open the buyer-farmer chat directly from each ordered product.</p>
            </div>
          </div>

          <div className="AdminOrderItemsGrid">
            {items.map((item) => {
              const product = productsMap.get(item.productId || item.id);
              const farmer = farmersMap.get(String(item.sellerId || product?.sellerId || ''));
              return (
                <div className="Card" key={`${order.id}-${item.productId || item.id}`}>
                  <img
                    src={product ? resolveProductImage(product) : PRODUCT_FALLBACK_IMAGE}
                    alt={product?.name || 'Order item'}
                    onError={(e) => { e.currentTarget.src = PRODUCT_FALLBACK_IMAGE; }}
                  />
                  <div className="CardBody">
                    <h4 style={{ marginTop: 0, marginBottom: '0.35rem' }}>{product?.name || `Item ${item.productId || item.id}`}</h4>
                    <div className="AdminDetailList">
                      <div><strong>Quantity:</strong> {getItemQty(item)}</div>
                      <div><strong>Price:</strong> GHS {(Number(item.price) || 0).toFixed(2)}</div>
                      <div><strong>Farmer:</strong> {farmer?.name || 'No farmer'}</div>
                      {product?.category && <div><strong>Category:</strong> {product.category}</div>}
                    </div>
                    <div className="AdminButtonRow">
                      {item.productId ? (
                        <Link className="BtnOutline" to={`/product/${encodeURIComponent(item.productId || item.id)}`}>
                          Open Product
                        </Link>
                      ) : null}
                      {item.sellerId ? (
                        <Link className="BtnOutline" to={`/profiles/farmer/${encodeURIComponent(item.sellerId)}`}>
                          View Farmer Profile
                        </Link>
                      ) : null}
                      {item.sellerId && (
                        <Link to={`/messages?buyerId=${encodeURIComponent(order.buyerId)}&farmerId=${encodeURIComponent(item.sellerId)}&productId=${encodeURIComponent(item.productId || item.id)}`}>
                          Open Chat
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="FarmerInfoBlock">
      <strong>{label}</strong>
      <span>{value || 'Not provided'}</span>
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

function AdminCreateForm({ onCreate, loading = false }) {
  const [form, setForm] = useState({ name: '', username: '', phone: '', password: '', role: 'admin' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    const created = await onCreate(form);
    if (created) {
      setForm({ name: '', username: '', phone: '', password: '', role: 'admin' });
    } else {
      setError('Failed');
    }
  };

  return (
    <form onSubmit={submit} className="AdminFormGrid">
      <label>
        Full Name
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </label>
      <label>
        Username
        <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
      </label>
      <label>
        Phone Number
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
      </label>
      <label>
        Password
        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
      </label>
      <label>
        Role
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="admin">Admin</option>
        </select>
      </label>
      <div className="AdminFieldWide AdminButtonRow">
        <LoadingButton className="Btn" type="submit" loading={loading} loadingText="Creating...">
          Create Admin
        </LoadingButton>
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

function formatOrderStatusLabel(status) {
  const current = String(status || '').replace(/-/g, ' ');
  return current ? `${current[0].toUpperCase()}${current.slice(1)}` : 'Processing';
}

function buildOrderTimeline(status) {
  const steps = ['processing', 'packaged', 'sent-for-delivery', 'completed'];
  const normalized = String(status || 'processing');
  const currentIndex = Math.max(0, steps.indexOf(normalized));
  return steps.map((step, index) => ({
    label: formatOrderStatusLabel(step),
    active: index <= currentIndex,
  }));
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
