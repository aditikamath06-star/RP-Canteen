import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import {
  Package,
  AlertTriangle,
  XCircle,
  History,
  Search,
  Filter,
  ArrowUpDown,
  Utensils,
  Clock,
  Shield,
  Eye,
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'Grains & Pulses',
  'Vegetables',
  'Dairy',
  'Spices & Condiments',
  'Flours',
  'Oils & Ghee',
  'Beverages & Tea',
  'Bakery & Snacks',
  'General Groceries',
];

export const WorkerDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'movements' | 'published_menu'

  // Summary counts
  const [summary, setSummary] = useState({
    totalItems: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    recentMovements24h: 0,
  });

  // Inventory state
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter and sort controls
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'low_stock', 'out_of_stock', 'in_stock'
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Movements state
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

  // Today's published menu state
  const [publishedMenu, setPublishedMenu] = useState(null);
  const [menuLoading, setMenuLoading] = useState(false);

  // Load summary and inventory
  const loadInventoryData = async () => {
    setLoading(true);
    try {
      const [sumRes, invRes] = await Promise.all([
        api.getInventorySummary(),
        api.getInventory({
          search,
          category,
          status: statusFilter,
          sortBy,
          sortOrder,
        }),
      ]);

      if (sumRes.success) setSummary(sumRes.summary);
      if (invRes.success) setInventory(invRes.inventory);
    } catch (err) {
      setError(err.message || 'Failed to load inventory data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventoryData();
  }, [search, category, statusFilter, sortBy, sortOrder]);

  // Load movements when tab is active
  useEffect(() => {
    if (activeTab === 'movements') {
      const fetchMovements = async () => {
        setMovementsLoading(true);
        try {
          const res = await api.getMovements({ limit: 100 });
          if (res.success) setMovements(res.movements);
        } catch (err) {
          console.error(err);
        } finally {
          setMovementsLoading(false);
        }
      };
      fetchMovements();
    } else if (activeTab === 'published_menu') {
      const fetchMenu = async () => {
        setMenuLoading(true);
        try {
          const res = await api.getPublishedMenu();
          if (res.success) setPublishedMenu(res.menu);
        } catch (err) {
          console.error(err);
        } finally {
          setMenuLoading(false);
        }
      };
      fetchMenu();
    }
  }, [activeTab]);

  return (
    <div className="dashboard-layout">
      {/* Dashboard Top Header Bar */}
      <div className="dashboard-header-bar">
        <div className="container dashboard-header-inner">
          <div className="dashboard-title-group">
            <h2>Staff Kitchen & Inventory Portal</h2>
            <p>
              Logged in as: <strong>{user?.fullName || user?.username}</strong> (Canteen Staff / Cook) • Read-only Access
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="dashboard-tabs">
            <button
              type="button"
              className={`dashboard-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => setActiveTab('inventory')}
            >
              <Package size={16} /> Inventory Stock
            </button>
            <button
              type="button"
              className={`dashboard-tab-btn ${activeTab === 'movements' ? 'active' : ''}`}
              onClick={() => setActiveTab('movements')}
            >
              <History size={16} /> Stock Movements
            </button>
            <button
              type="button"
              className={`dashboard-tab-btn ${activeTab === 'published_menu' ? 'active' : ''}`}
              onClick={() => setActiveTab('published_menu')}
            >
              <Utensils size={16} /> View Today's Menu
            </button>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '1.5rem 1.25rem 3rem' }}>
        {/* Role permission info banner */}
        <div
          style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}
        >
          <Shield size={16} color="#1b4332" />
          <span>
            <strong>Role Permission:</strong> Canteen Staff accounts have authorized read-only visibility into kitchen stocks, ingredient thresholds, and movement history. Stock modifications and menu publishing are restricted exclusively to the Head of Canteen.
          </span>
        </div>

        {/* Summary Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              <Package size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-val">{summary.totalItems}</span>
              <span className="stat-label">Total Inventory Items</span>
            </div>
          </div>

          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setActiveTab('inventory');
              setStatusFilter(statusFilter === 'low_stock' ? 'all' : 'low_stock');
            }}
            title="Click to filter low stock items"
          >
            <div className="stat-icon amber">
              <AlertTriangle size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-val" style={{ color: '#b45309' }}>
                {summary.lowStockCount}
              </span>
              <span className="stat-label">Low Stock Alerts</span>
            </div>
          </div>

          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setActiveTab('inventory');
              setStatusFilter(statusFilter === 'out_of_stock' ? 'all' : 'out_of_stock');
            }}
            title="Click to filter out-of-stock items"
          >
            <div className="stat-icon red">
              <XCircle size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-val" style={{ color: '#dc2626' }}>
                {summary.outOfStockCount}
              </span>
              <span className="stat-label">Out of Stock Items</span>
            </div>
          </div>

          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveTab('movements')}
          >
            <div className="stat-icon green">
              <History size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-val">{summary.recentMovements24h}</span>
              <span className="stat-label">Movements (Last 24h)</span>
            </div>
          </div>
        </div>

        {/* TAB 1: INVENTORY TABLE */}
        {activeTab === 'inventory' && (
          <div>
            {/* Filter & Search Bar */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                {/* Search */}
                <div style={{ position: 'relative', minWidth: '220px' }}>
                  <Search
                    size={16}
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '34px', height: '38px', fontSize: '0.85rem' }}
                    placeholder="Search ingredients..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {/* Category Filter */}
                <select
                  className="form-select"
                  style={{ width: 'auto', height: '38px', fontSize: '0.85rem' }}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'All' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>

                {/* Stock Status Filter */}
                <select
                  className="form-select"
                  style={{ width: 'auto', height: '38px', fontSize: '0.85rem' }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Stock Levels</option>
                  <option value="low_stock">Low Stock Only</option>
                  <option value="out_of_stock">Out of Stock Only</option>
                  <option value="in_stock">Healthy Stock</option>
                </select>
              </div>

              {/* Sorting */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Sort:</span>
                <select
                  className="form-select"
                  style={{ width: 'auto', height: '38px', fontSize: '0.85rem' }}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="name">Item Name</option>
                  <option value="currentQuantity">Available Quantity</option>
                  <option value="category">Category</option>
                  <option value="updatedAt">Last Updated</option>
                </select>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ height: '38px' }}
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  title={`Order: ${sortOrder.toUpperCase()}`}
                >
                  <ArrowUpDown size={14} /> {sortOrder.toUpperCase()}
                </button>
              </div>
            </div>

            {/* Inventory Data Table */}
            <div className="table-container">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#64748b' }}>Loading inventory items...</p>
                </div>
              ) : inventory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#64748b' }}>No inventory items matched your criteria.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ingredient / Item Name</th>
                      <th>Category</th>
                      <th style={{ textAlign: 'right' }}>Available Quantity</th>
                      <th>Unit</th>
                      <th style={{ textAlign: 'right' }}>Min Threshold</th>
                      <th>Stock Status</th>
                      <th>Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => (
                      <tr key={item._id}>
                        <td>
                          <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>{item.name}</strong>
                          {item.notes && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {item.notes}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="category-pill">
                            {item.category}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '700', fontSize: '1rem' }}>
                          <span
                            style={{
                              color:
                                item.stockStatus === 'out_of_stock'
                                  ? 'var(--status-outofstock)'
                                  : item.stockStatus === 'low_stock'
                                  ? 'var(--status-lowstock)'
                                  : 'var(--status-instock)',
                            }}
                          >
                            {item.currentQuantity}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>{item.unit}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {item.minThreshold} {item.unit}
                        </td>
                        <td>
                          <StatusBadge status={item.stockStatus} />
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {new Date(item.updatedAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: STOCK MOVEMENT HISTORY */}
        {activeTab === 'movements' && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <h3>Stock Movement History</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Immutable historical records of kitchen stock additions, consumption, and adjustments.
              </p>
            </div>

            <div className="table-container">
              {movementsLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#64748b' }}>Loading historical movements...</p>
                </div>
              ) : movements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#64748b' }}>No stock movements recorded yet.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Inventory Item</th>
                      <th>Movement Type</th>
                      <th style={{ textAlign: 'right' }}>Previous</th>
                      <th style={{ textAlign: 'right' }}>Change</th>
                      <th style={{ textAlign: 'right' }}>Resulting</th>
                      <th>Responsible Account</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m._id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {new Date(m.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>{m.itemNameSnapshot}</strong>
                        </td>
                        <td>
                          <span className="movement-badge" data-type={m.movementType}>
                            {m.movementType}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {m.previousQuantity} {m.unit}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: '700',
                            color: m.changeQuantity > 0 ? '#4ade80' : '#f87171',
                          }}
                        >
                          {m.changeQuantity > 0 ? `+${m.changeQuantity}` : m.changeQuantity}{' '}
                          {m.unit}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--text-main)' }}>
                          {m.resultingQuantity} {m.unit}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>
                            {m.performedByName?.replace(/\s*\(Head of Canteen\)/i, '')}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
                            ({m.performedByRole})
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{m.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PUBLISHED MENU (READ-ONLY) */}
        {activeTab === 'published_menu' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3>Today's Published Canteen Menu</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Kitchen staff reference for items being served today.
              </p>
            </div>

            {menuLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: '#64748b' }}>Loading today's menu...</p>
              </div>
            ) : !publishedMenu ? (
              <div className="empty-state-box">
                <p>No menu has been published for today yet.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Dish Name</th>
                      <th>Meal Category</th>
                      <th>Availability Status</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {publishedMenu.items.map((item, idx) => (
                      <tr key={item._id || idx}>
                        <td style={{ width: '40px', color: '#64748b' }}>{idx + 1}</td>
                        <td>
                          <strong>{item.name}</strong>
                        </td>
                        <td>
                          <span className="category-pill">
                            {item.category}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={item.isAvailable ? 'available' : 'unavailable'} />
                        </td>
                        <td style={{ color: '#475569', fontSize: '0.85rem' }}>
                          {item.description || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
