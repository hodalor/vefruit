import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useUserAuth } from '../auth/UserAuthContext';
import { useSellerAuth } from '../auth/SellerAuthContext';
import useProducts from '../products/useProducts';
import { loadOrders } from '../orders/orderService';
import LoadingButton from '../components/LoadingButton';
import { useToast } from '../toast/ToastContext';
import { loadSellerReviews, saveSellerReview } from '../reviews/reviewService';
import {
  buildPurchaseHistoryRows,
  formatDateTime,
  formatMoney,
  formatOrderStatusLabel,
  getItemQty,
  getOrderItems,
  getOrderValue,
} from '../buyer/buyerData';

function PublicProfile() {
  const { role = '', id = '' } = useParams();
  const { users, current } = useUserAuth();
  const { sellers } = useSellerAuth();
  const { showToast } = useToast();
  const products = useProducts();
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ averageRating: 0, reviewCount: 0 });
  const [reviewForm, setReviewForm] = useState({ rating: 0, review: '' });
  const [savingReview, setSavingReview] = useState(false);

  const normalizedRole = role === 'farmer' ? 'farmer' : 'buyer';
  const profile = useMemo(() => (
    normalizedRole === 'buyer'
      ? users.find((entry) => String(entry.id) === String(id))
      : sellers.find((entry) => String(entry.id) === String(id))
  ), [id, normalizedRole, sellers, users]);

  useEffect(() => {
    if (!id) {
      setOrders([]);
      return;
    }
    const params = normalizedRole === 'buyer' ? { buyerId: id } : { sellerId: id };
    loadOrders(params).then(setOrders).catch(() => setOrders([]));
  }, [id, normalizedRole]);

  useEffect(() => {
    if (normalizedRole !== 'farmer' || !id) {
      setReviews([]);
      setReviewSummary({ averageRating: 0, reviewCount: 0 });
      return;
    }
    loadSellerReviews(id)
      .then((data) => {
        setReviews(data.reviews || []);
        setReviewSummary(data.summary || { averageRating: 0, reviewCount: 0 });
      })
      .catch(() => {
        setReviews([]);
        setReviewSummary({ averageRating: 0, reviewCount: 0 });
      });
  }, [id, normalizedRole]);

  const productsMap = useMemo(() => new Map(products.map((entry) => [String(entry.id), entry])), [products]);
  const farmerProducts = useMemo(
    () => products.filter((entry) => String(entry.sellerId) === String(id)),
    [id, products]
  );

  const buyerStats = useMemo(() => {
    const totalSpent = orders.reduce((sum, order) => sum + getOrderValue(order), 0);
    const completedOrders = orders.filter((order) => String(order.orderStatus || '') === 'completed').length;
    const itemsBought = orders.reduce((sum, order) => (
      sum + getOrderItems(order).reduce((inner, item) => inner + getItemQty(item), 0)
    ), 0);
    return {
      totalOrders: orders.length,
      completedOrders,
      totalSpent,
      itemsBought,
    };
  }, [orders]);

  const farmerStats = useMemo(() => {
    const relevantOrderItems = orders.flatMap((order) => (
      getOrderItems(order)
        .filter((item) => String(item.sellerId || '') === String(id))
        .map((item) => ({ order, item }))
    ));
    const totalRevenue = relevantOrderItems.reduce(
      (sum, entry) => sum + (Number(entry.item.price) || 0) * getItemQty(entry.item),
      0
    );
    const completedDeals = orders.filter((order) => String(order.orderStatus || '') === 'completed').length;
    return {
      activeProducts: farmerProducts.length,
      totalDeals: orders.length,
      completedDeals,
      totalRevenue,
    };
  }, [farmerProducts.length, id, orders]);

  const purchaseHistory = useMemo(
    () => buildPurchaseHistoryRows(orders, productsMap).slice(0, 8),
    [orders, productsMap]
  );

  const farmerDeals = useMemo(() => (
    orders.flatMap((order) => (
      getOrderItems(order)
        .filter((item) => String(item.sellerId || '') === String(id))
        .map((item) => ({
          orderId: order.id,
          order,
          item,
          product: productsMap.get(String(item.productId || '')),
        }))
    )).slice(0, 8)
  ), [id, orders, productsMap]);

  const canReviewFarmer = normalizedRole === 'farmer' && current?.role === 'buyer' && String(current.id) !== String(id);

  const submitReview = async (event) => {
    event.preventDefault();
    if (!canReviewFarmer || !reviewForm.rating || savingReview) return;
    setSavingReview(true);
    try {
      await saveSellerReview({
        sellerId: id,
        buyerId: current.id,
        rating: reviewForm.rating,
        review: reviewForm.review,
      });
      const refreshed = await loadSellerReviews(id);
      setReviews(refreshed.reviews || []);
      setReviewSummary(refreshed.summary || { averageRating: 0, reviewCount: 0 });
      setReviewForm({ rating: 0, review: '' });
      showToast('Seller review saved.');
    } catch (err) {
      showToast(err.message || 'Unable to save review.', { type: 'error' });
    } finally {
      setSavingReview(false);
    }
  };

  if (!profile) {
    return (
      <main className="Container">
        <section className="Card">
          <div className="CardBody">
            <h1>Profile Not Found</h1>
            <p className="Muted">We could not find that buyer or farmer profile.</p>
            <Link className="BtnOutline" to="/messages">Back to messages</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="Container">
      <section className="PublicProfileHero Card">
        <div className="CardBody">
          <div className="PublicProfileHeroTop">
            <div className="PublicProfileAvatar">
              {String(profile.name || 'U').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="PublicProfileEyebrow">{normalizedRole === 'buyer' ? 'Buyer profile' : 'Farmer profile'}</div>
              <h1 className="PublicProfileTitle">
                {profile.name}
                {profile.isVerified ? <span className="VerifiedBadge" title="Verified account">✓</span> : null}
              </h1>
              <div className="AdminPillRow">
                <span className="AdminPill">{normalizedRole === 'buyer' ? 'Buyer' : 'Farmer'}</span>
                {profile.isVerified ? <span className="AdminPill">Verified</span> : null}
                {normalizedRole === 'farmer' ? <span className="AdminPill">{reviewSummary.averageRating || 0}/5 rating</span> : null}
                <span className="AdminPill">Joined {formatDateTime(profile.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="BuyerProfileGrid">
            {profile.phone ? <div className="BuyerDetailCard"><strong>Phone</strong><div>{profile.phone}</div></div> : null}
            {profile.email ? <div className="BuyerDetailCard"><strong>Email</strong><div>{profile.email}</div></div> : null}
            {profile.address ? <div className="BuyerDetailCard"><strong>Address</strong><div>{profile.address}</div></div> : null}
            {profile.businessName ? <div className="BuyerDetailCard"><strong>Business</strong><div>{profile.businessName}</div></div> : null}
          </div>
        </div>
      </section>

      <section className="PublicProfileSection">
        <div className="StatGrid">
          {normalizedRole === 'buyer' ? (
            <>
              <StatCard label="Total Orders" value={buyerStats.totalOrders} />
              <StatCard label="Completed Orders" value={buyerStats.completedOrders} />
              <StatCard label="Items Bought" value={buyerStats.itemsBought} />
              <StatCard label="Total Spent" value={formatMoney(buyerStats.totalSpent)} />
            </>
          ) : (
            <>
              <StatCard label="Products Listed" value={farmerStats.activeProducts} />
              <StatCard label="Total Deals" value={farmerStats.totalDeals} />
              <StatCard label="Completed Deals" value={farmerStats.completedDeals} />
              <StatCard label="Revenue" value={formatMoney(farmerStats.totalRevenue)} />
            </>
          )}
        </div>
      </section>

      {normalizedRole === 'buyer' ? (
        <section className="PublicProfileGrid">
          <section className="Card">
            <div className="CardBody">
              <div className="AdminSectionHeader">
                <div>
                  <h2 className="SectionTitle">Recent Purchase History</h2>
                  <p className="AdminSubtle">Recent products this buyer has purchased on the platform.</p>
                </div>
              </div>
              {purchaseHistory.length === 0 ? (
                <p className="Muted">No purchase history yet.</p>
              ) : (
                <div className="PublicProfileList">
                  {purchaseHistory.map((entry) => (
                    <Link key={entry.id} className="PublicProfileListCard" to={`/product/${encodeURIComponent(entry.item.productId || entry.item.id)}`}>
                      <strong>{entry.productName}</strong>
                      <span>Quantity: {entry.quantity}</span>
                      <span>Amount: {formatMoney(entry.amount)}</span>
                      <span>Ordered: {formatDateTime(entry.createdAt)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="Card">
            <div className="CardBody">
              <div className="AdminSectionHeader">
                <div>
                  <h2 className="SectionTitle">Trust Details</h2>
                  <p className="AdminSubtle">Public trust and activity signals for this buyer.</p>
                </div>
              </div>
              <div className="PublicProfileDetailList">
                <div><strong>Verification:</strong> {profile.isVerified ? 'Verified account' : 'Standard account'}</div>
                <div><strong>Total platform orders:</strong> {buyerStats.totalOrders}</div>
                <div><strong>Completed orders:</strong> {buyerStats.completedOrders}</div>
                <div><strong>Last updated:</strong> {formatDateTime(profile.updatedAt)}</div>
              </div>
            </div>
          </section>
        </section>
      ) : (
        <section className="PublicProfileGrid">
          <section className="Card">
            <div className="CardBody">
              <div className="AdminSectionHeader">
                <div>
                  <h2 className="SectionTitle">Products By This Farmer</h2>
                  <p className="AdminSubtle">Current approved products listed by this farmer.</p>
                </div>
              </div>
              {farmerProducts.length === 0 ? (
                <p className="Muted">No products listed yet.</p>
              ) : (
                <div className="PublicProfileList">
                  {farmerProducts.map((entry) => (
                    <Link key={entry.id} className="PublicProfileListCard" to={`/product/${encodeURIComponent(entry.id)}`}>
                      <strong>{entry.name}</strong>
                      <span>{entry.category}</span>
                      <span>{formatMoney(entry.price)}</span>
                      <span>{entry.location || 'Location not set'}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="Card">
            <div className="CardBody">
              <div className="AdminSectionHeader">
                <div>
                  <h2 className="SectionTitle">Recent Deals</h2>
                  <p className="AdminSubtle">Latest order items this farmer has sold on the platform.</p>
                </div>
              </div>
              {farmerDeals.length === 0 ? (
                <p className="Muted">No deal history yet.</p>
              ) : (
                <div className="PublicProfileList">
                  {farmerDeals.map((entry) => (
                    <div key={`${entry.orderId}-${entry.item.productId}`} className="PublicProfileListCard">
                      <strong>{entry.product?.name || `Product ${entry.item.productId}`}</strong>
                      <span>Quantity: {getItemQty(entry.item)}</span>
                      <span>Amount: {formatMoney((Number(entry.item.price) || 0) * getItemQty(entry.item))}</span>
                      <span>Status: {formatOrderStatusLabel(entry.order.orderStatus)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="Card PublicProfileWide">
            <div className="CardBody">
              <div className="AdminSectionHeader">
                <div>
                  <h2 className="SectionTitle">Ratings And Reviews</h2>
                  <p className="AdminSubtle">Public feedback left by buyers for this farmer.</p>
                </div>
                <div className="ChatRatingSummary">{renderStars(reviewSummary.averageRating)} <span>{reviewSummary.averageRating || 0}/5</span></div>
              </div>
              {canReviewFarmer ? (
                <form className="PublicReviewForm" onSubmit={submitReview}>
                  <div>
                    <strong>Rate This Farmer</strong>
                    <div className="PublicStarSelector" role="radiogroup" aria-label="Seller rating">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`PublicStarButton ${value <= reviewForm.rating ? 'active' : ''}`}
                          onClick={() => setReviewForm((prev) => ({ ...prev, rating: value }))}
                          aria-label={`${value} star${value === 1 ? '' : 's'}`}
                          aria-pressed={value <= reviewForm.rating}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  <label>
                    Review
                    <textarea
                      rows="4"
                      value={reviewForm.review}
                      onChange={(event) => setReviewForm((prev) => ({ ...prev, review: event.target.value }))}
                      placeholder="Share how the deal went with this farmer."
                    />
                  </label>
                  <LoadingButton className="Btn" type="submit" loading={savingReview} loadingText="Saving...">
                    Save Review
                  </LoadingButton>
                </form>
              ) : null}
              {reviews.length === 0 ? (
                <p className="Muted">No reviews yet.</p>
              ) : (
                <div className="PublicProfileList">
                  {reviews.map((review) => {
                    const buyer = users.find((entry) => String(entry.id) === String(review.buyerId));
                    return (
                      <Link key={review.id} className="PublicProfileListCard" to={`/profiles/buyer/${encodeURIComponent(review.buyerId)}`}>
                        <strong>
                          {buyer?.name || 'Buyer'}
                          {buyer?.isVerified ? <span className="VerifiedBadge" title="Verified account">✓</span> : null}
                        </strong>
                        <span>{renderStars(review.rating)}</span>
                        <span>{review.review || 'No written review provided.'}</span>
                        <span>{formatDateTime(review.createdAt)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </section>
      )}
    </main>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="StatCard">
      <div className="StatLabel">{label}</div>
      <div className="StatValue">{value}</div>
    </div>
  );
}

function renderStars(rating = 0) {
  const value = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return `${'★'.repeat(value)}${'☆'.repeat(Math.max(0, 5 - value))}`;
}

export default PublicProfile;
