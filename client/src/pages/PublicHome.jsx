import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { VegBadge } from '../components/VegBadge';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { resolveFoodImage, CATEGORY_DEFAULT_IMAGES } from '../utils/foodImages';
import {
  Calendar,
  Sparkles,
  Search,
  CheckCircle2,
  Coffee,
  Info,
  MessageSquare,
  Star,
} from 'lucide-react';

const MEAL_CATEGORIES = [
  'All',
  'Breakfast',
  'Lunch',
  'Evening Snacks',
  'Dinner',
  'Beverages',
  'Sweets & Desserts',
];

export const PublicHome = () => {
  const { t, i18n } = useTranslation();
  const todayStr = new Date().toISOString().split('T')[0];
  const currentLang = i18n.language?.startsWith('kn') ? 'kn' : 'en';

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [publishedDates, setPublishedDates] = useState([]);
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Customer Feedback state
  const [feedbackModalItem, setFeedbackModalItem] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackCustomerName, setFeedbackCustomerName] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccessMsg, setFeedbackSuccessMsg] = useState('');

  const handleOpenFeedback = (item) => {
    setFeedbackModalItem(item);
    setFeedbackRating(5);
    setFeedbackComment('');
    setFeedbackCustomerName('');
    setFeedbackSuccessMsg('');
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!menu?._id || !feedbackModalItem?._id) return;
    setFeedbackSubmitting(true);
    try {
      const res = await api.submitDishFeedback(menu._id, feedbackModalItem._id, {
        rating: feedbackRating,
        comment: feedbackComment,
        customerName: feedbackCustomerName,
      });
      if (res.success) {
        setFeedbackSuccessMsg(t('home.feedbackSuccess', 'Thank you for your valuable feedback!'));
        const updatedItems = (menu.items || []).map((it) => {
          if (it._id === feedbackModalItem._id) {
            return {
              ...it,
              customerFeedbacks: res.customerFeedbacks || [
                ...(it.customerFeedbacks || []),
                { rating: feedbackRating, comment: feedbackComment },
              ],
            };
          }
          return it;
        });
        setMenu({ ...menu, items: updatedItems });
        setTimeout(() => {
          setFeedbackModalItem(null);
        }, 1500);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  // Fetch list of dates that have published menus
  useEffect(() => {
    const fetchDates = async () => {
      try {
        const res = await api.getPublishedDates();
        if (res.success && Array.isArray(res.dates)) {
          setPublishedDates(res.dates);
        }
      } catch (err) {
        console.error('Failed to load published dates list:', err);
      }
    };
    fetchDates();
  }, []);

  // Fetch menu whenever selectedDate changes (with auto-retry if cloud server is waking up)
  useEffect(() => {
    let isMounted = true;
    let retryTimer = null;

    const fetchMenu = async (attempt = 1) => {
      setLoading(true);
      setError('');
      try {
        const res = await api.getPublishedMenu(selectedDate);
        if (!isMounted) return;
        if (res.success && res.menu) {
          setMenu(res.menu);
          setLoading(false);
        } else {
          setMenu(null);
          setError(
            res.message || t('home.emptyTitle', "The menu hasn't been published yet.")
          );
          setLoading(false);
        }
      } catch (err) {
        if (!isMounted) return;
        // If free cloud server is waking up from inactivity, auto-retry up to 3 times
        if (attempt <= 3) {
          retryTimer = setTimeout(() => {
            if (isMounted) fetchMenu(attempt + 1);
          }, 3500);
        } else {
          setMenu(null);
          setError(t('home.emptyTitle', "The menu hasn't been published yet."));
          setLoading(false);
        }
      }
    };

    fetchMenu();

    return () => {
      isMounted = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [selectedDate, t]);

  // Format date display (e.g., Wednesday, 14 October 2026 or ಬುಧವಾರ, ೧೪ ಅಕ್ಟೋಬರ್ ೨೦೨೬)
  const formatDateHeading = (dateStr) => {
    try {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(year, month - 1, day);
      const locale = currentLang === 'kn' ? 'kn-IN' : 'en-IN';
      return d.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Helper to get localized dish name and description with clean fallbacks
  const getDishName = (item) => {
    if (!item) return '';
    if (currentLang === 'kn') {
      return item.nameKn || item.name || item.nameEn || '';
    }
    return item.nameEn || item.name || item.nameKn || '';
  };

  const getDishDescription = (item) => {
    if (!item) return '';
    if (currentLang === 'kn') {
      return item.descriptionKn || item.description || item.descriptionEn || '';
    }
    return item.descriptionEn || item.description || item.descriptionKn || '';
  };

  // Filter items by category and search
  const filteredItems = menu?.items
    ? menu.items.filter((item) => {
        const matchesCategory =
          selectedCategory === 'All' || item.category === selectedCategory;
        const nameText = getDishName(item);
        const descText = getDishDescription(item);
        const query = searchQuery.trim().toLowerCase();

        const matchesSearch =
          !query ||
          nameText.toLowerCase().includes(query) ||
          descText.toLowerCase().includes(query) ||
          (item.name && item.name.toLowerCase().includes(query));

        return matchesCategory && matchesSearch;
      })
    : [];

  return (
    <main>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-glow"></div>
        <div className="container hero-content">
          <div className="hero-institution-badge">
            <Sparkles size={15} />
            {t('home.institutionBadge', 'Rashtrotthana Parishath')}
          </div>

          <h1 className="hero-title">{t('home.heroTitle', 'Welcome to RP Canteen')}</h1>

          <p className="hero-subtitle">
            {t('home.heroSubtitle', 'Your Daily Canteen Menu at Rashtrotthana Parishath')}
          </p>

          <div className="hero-date-card">
            <Calendar size={18} color="#15803d" />
            <span>{formatDateHeading(selectedDate)}</span>
            {selectedDate === todayStr && (
              <span
                style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                }}
              >
                {t('home.todayBadge', 'TODAY')}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="container" style={{ padding: '2rem 1.25rem 4rem' }}>
        {/* Streamlined Floating Date Selector & Search Bar */}
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: '16px',
            padding: '1rem 1.25rem',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border-color)',
            marginBottom: '2rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          {/* Date Picker Controls */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
            <button
              type="button"
              className={`btn btn-sm ${selectedDate === todayStr ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: '999px', padding: '0.45rem 1rem' }}
              onClick={() => setSelectedDate(todayStr)}
            >
              {t('home.todaysMenu', "Today's Menu")}
            </button>

            <input
              type="date"
              className="form-input"
              style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.875rem', fontWeight: '600', borderRadius: '8px' }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              aria-label={t('home.selectDate', 'Select menu date')}
            />

            {/* Quick selector for dates with published menus */}
            {publishedDates.length > 0 && (
              <select
                className="form-select"
                style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.85rem', borderRadius: '8px' }}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                aria-label={t('home.otherMenus', { count: publishedDates.length })}
              >
                <option value="">{t('home.otherMenus', { count: publishedDates.length })}</option>
                {publishedDates.map((item) => (
                  <option key={item.date} value={item.date}>
                    {item.date} {item.date === todayStr ? `(${t('home.todayBadge', 'TODAY')})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              placeholder={t('home.searchPlaceholder', 'Search vegetarian dishes...')}
              className="form-input"
              style={{ paddingLeft: '36px', paddingRight: '12px', height: '38px', borderRadius: '999px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="menu-controls">
          <div className="category-pills">
            {MEAL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`cat-pill ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {t(`categories.${cat}`, cat)}
              </button>
            ))}
          </div>

          {menu && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <VegBadge showLabel={true} />
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                {t('home.dishesAvailable', {
                  count: filteredItems.length,
                  defaultValue: `${filteredItems.length} Dishes Available`,
                })}
              </span>
            </div>
          )}
        </div>

        {/* Menu Notice/Special Note if any */}
        {menu?.specialNote && (
          <div
            style={{
              background: '#fefce8',
              border: '1px solid #fef08a',
              color: '#854d0e',
              padding: '0.85rem 1.25rem',
              borderRadius: '10px',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.9rem',
            }}
          >
            <Info size={18} />
            <span><strong>{t('home.canteenNotice', 'Canteen Notice:')}</strong> {menu.specialNote}</span>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid #e2e8f0',
                borderTopColor: '#1b4332',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 1rem',
              }}
            ></div>
            <p style={{ color: '#64748b', fontWeight: '500' }}>
              {t('home.loading', 'Loading daily vegetarian menu...')}
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Empty State when no menu is published */}
        {!loading && !menu && (
          <div className="empty-state-box">
            <div className="empty-state-icon">
              <Calendar size={32} />
            </div>
            <h3 className="empty-state-title">
              {t('home.emptyTitle', "The menu hasn't been published yet.")}
            </h3>
            <p className="empty-state-desc">
              {t('home.emptyDesc', 'Please check back later! The canteen administration publishes daily menus each morning.')}
            </p>
            <div style={{ marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setSelectedDate(todayStr)}
              >
                {t('home.checkToday', "Check Today's Menu")}
              </button>
            </div>
          </div>
        )}

        {/* Food Cards Grid */}
        {!loading && menu && (
          <>
            {filteredItems.length === 0 ? (
              <div className="empty-state-box" style={{ padding: '2.5rem 1rem' }}>
                <Coffee size={32} style={{ color: '#94a3b8', margin: '0 auto 0.5rem' }} />
                <h4>{t('home.noDishesCategory', { category: t(`categories.${selectedCategory}`, selectedCategory) })}</h4>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                  {t('home.noDishesSub', 'Try selecting another category or clearing your search filter.')}
                </p>
              </div>
            ) : (
              <div className="food-grid">
                {filteredItems.map((item, idx) => {
                  const dishName = getDishName(item);
                  const dishDesc = getDishDescription(item);
                  const categoryLabel = t(`categories.${item.category}`, item.category);
                  const foodImg = resolveFoodImage(item);
                  const fallbackCategoryImg = CATEGORY_DEFAULT_IMAGES[item.category] || 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80';

                  return (
                    <div key={item._id || idx} className="food-card">
                      {/* Food Image with Smart Auto-Detection & Safe Pure-Veg Graphic Fallback */}
                      <div className="food-card-img-wrapper">
                        {foodImg?.src ? (
                          <img
                            src={foodImg.src}
                            alt={dishName}
                            className="food-card-img"
                            loading="lazy"
                            onError={(e) => {
                              // If custom link fails, fall back to smart category default
                              e.target.onerror = null;
                              e.target.src = fallbackCategoryImg;
                            }}
                          />
                        ) : (
                          <div className="food-card-placeholder-graphic">
                            <div className="food-placeholder-icon">🌱</div>
                            <div className="food-placeholder-name">{dishName}</div>
                            <div className="food-placeholder-tag">{categoryLabel}</div>
                          </div>
                        )}
                        <div className="food-card-badge-layer">
                          <VegBadge showLabel={true} />
                          <StatusBadge
                            status={item.isAvailable ? 'available' : 'unavailable'}
                          />
                        </div>
                      </div>

                      {/* Food Card Body - STRICTLY NO PRICES */}
                      <div className="food-card-body">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span className="food-card-category">{categoryLabel}</span>
                          {item.customerFeedbacks && item.customerFeedbacks.length > 0 && (
                            <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              ⭐ {(item.customerFeedbacks.reduce((a, b) => a + (b.rating || 5), 0) / item.customerFeedbacks.length).toFixed(1)}
                              <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'normal' }}>
                                ({item.customerFeedbacks.length})
                              </span>
                            </span>
                          )}
                        </div>

                        <h3 className="food-card-title">{dishName}</h3>
                        {dishDesc && (
                          <p className="food-card-desc">{dishDesc}</p>
                        )}

                        {item.feedback && (
                          <div style={{ margin: '0.4rem 0', padding: '4px 8px', background: 'rgba(16, 185, 129, 0.08)', borderLeft: '3px solid #10b981', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--color-primary-dark)' }}>
                            💬 <strong>{t('head.colFeedback', 'Feedback')}:</strong> {item.feedback}
                          </div>
                        )}

                        <div className="food-card-footer">
                          <span style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={14} /> {t('home.pureVegGuarantee', '100% Sattvic Pure Vegetarian')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenFeedback(item)}
                            style={{
                              background: 'none',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              padding: '2px 8px',
                              fontSize: '0.75rem',
                              color: 'var(--text-main)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <MessageSquare size={13} /> {t('home.giveFeedback', 'Feedback')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Customer Feedback Modal */}
      {feedbackModalItem && (
        <Modal
          isOpen={true}
          title={t('home.feedbackFor', { dish: getDishName(feedbackModalItem) })}
          onClose={() => setFeedbackModalItem(null)}
        >
          {feedbackSuccessMsg ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🙏</div>
              <h4 style={{ color: '#15803d', marginBottom: '0.5rem' }}>{feedbackSuccessMsg}</h4>
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                {t('home.pureVegGuarantee', '100% Sattvic Pure Vegetarian • Rashtrotthana Parishath')}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitFeedback}>
              <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)', display: 'block', marginBottom: '0.5rem' }}>
                  {t('home.rateDish', 'Rate this Dish')}
                </label>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.75rem',
                        color: star <= feedbackRating ? '#eab308' : '#cbd5e1',
                        padding: '0 4px',
                        transition: 'transform 0.1s',
                      }}
                      onClick={() => setFeedbackRating(star)}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                  {t('home.yourFeedback', 'Your Feedback / Review (Optional)')}
                </label>
                <textarea
                  rows={3}
                  className="form-textarea"
                  placeholder={t('home.feedbackInputPlaceholder', 'How was the taste and preparation?')}
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                  {t('home.yourNameOptional', 'Your Name (Optional)')}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Customer"
                  value={feedbackCustomerName}
                  onChange={(e) => setFeedbackCustomerName(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ margin: '1rem -1.5rem -1.5rem', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setFeedbackModalItem(null)}
                  disabled={feedbackSubmitting}
                >
                  {t('head.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={feedbackSubmitting}
                >
                  {feedbackSubmitting ? t('home.submitting', 'Submitting...') : t('home.submitFeedback', 'Submit Feedback')}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </main>
  );
};
