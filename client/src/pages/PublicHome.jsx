import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { VegBadge } from '../components/VegBadge';
import { StatusBadge } from '../components/StatusBadge';
import {
  Calendar,
  Clock,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Coffee,
  Info,
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
  const location = useLocation();
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [publishedDates, setPublishedDates] = useState([]);
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Fetch menu whenever selectedDate changes
  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.getPublishedMenu(selectedDate);
        if (res.success && res.menu) {
          setMenu(res.menu);
        } else {
          setMenu(null);
          // Standard empty state message from requirements
          setError(
            res.message || "The menu hasn't been published yet. Please check back later!"
          );
        }
      } catch (err) {
        setMenu(null);
        setError("The menu hasn't been published yet. Please check back later!");
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [selectedDate]);

  // Format date display (e.g., Wednesday, 14 October 2026)
  const formatDateHeading = (dateStr) => {
    try {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Filter items by category and search
  const filteredItems = menu?.items
    ? menu.items.filter((item) => {
        const matchesCategory =
          selectedCategory === 'All' || item.category === selectedCategory;
        const matchesSearch =
          !searchQuery.trim() ||
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase());
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
            Rashtrotthana Parishath
          </div>

          <h1 className="hero-title">Welcome to RP Canteen</h1>

          <p className="hero-subtitle">
            Your Daily Canteen Menu at Rashtrotthana Parishath
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
                TODAY
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
              Today's Menu
            </button>

            <input
              type="date"
              className="form-input"
              style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.875rem', fontWeight: '600', borderRadius: '8px' }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              aria-label="Select menu date"
            />

            {/* Quick selector for dates with published menus */}
            {publishedDates.length > 0 && (
              <select
                className="form-select"
                style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.85rem', borderRadius: '8px' }}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                aria-label="Published dates list"
              >
                <option value="">Other Menus ({publishedDates.length})</option>
                {publishedDates.map((item) => (
                  <option key={item.date} value={item.date}>
                    {item.date} {item.date === todayStr ? '(Today)' : ''}
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
              placeholder="Search vegetarian dishes..."
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
                {cat}
              </button>
            ))}
          </div>

          {menu && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <VegBadge showLabel={true} />
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                {filteredItems.length} {filteredItems.length === 1 ? 'Dish' : 'Dishes'} Available
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
            <span><strong>Canteen Notice:</strong> {menu.specialNote}</span>
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
            <p style={{ color: '#64748b', fontWeight: '500' }}>Loading daily vegetarian menu...</p>
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
              The menu hasn't been published yet.
            </h3>
            <p className="empty-state-desc">
              Please check back later! The canteen administration publishes daily
              menus each morning.
            </p>
            <div style={{ marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setSelectedDate(todayStr)}
              >
                Check Today's Menu
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
                <h4>No dishes found in category "{selectedCategory}"</h4>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                  Try selecting another category or clearing your search filter.
                </p>
              </div>
            ) : (
              <div className="food-grid">
                {filteredItems.map((item, idx) => (
                  <div key={item._id || idx} className="food-card">
                    {/* Food Image with Fallback */}
                    <div className="food-card-img-wrapper">
                      <img
                        src={
                          item.imageUrl ||
                          'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80'
                        }
                        alt={item.name}
                        className="food-card-img"
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src =
                            'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      <div className="food-card-badge-layer">
                        <VegBadge showLabel={true} />
                        <StatusBadge
                          status={item.isAvailable ? 'available' : 'unavailable'}
                        />
                      </div>
                    </div>

                    {/* Food Card Body - STRICTLY NO PRICES */}
                    <div className="food-card-body">
                      <span className="food-card-category">{item.category}</span>
                      <h3 className="food-card-title">{item.name}</h3>
                      {item.description && (
                        <p className="food-card-desc">{item.description}</p>
                      )}

                      <div className="food-card-footer">
                        <span style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={14} /> 100% Sattvic Pure Vegetarian
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};
