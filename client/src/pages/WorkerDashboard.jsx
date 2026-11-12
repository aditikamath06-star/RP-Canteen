import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import {
  REASON_TRANSLATIONS,
  ITEM_NAME_TRANSLATIONS,
  ITEM_NOTES_TRANSLATIONS,
  getLocalizedText,
} from '../utils/localizedData';
import {
  Package,
  AlertTriangle,
  XCircle,
  History,
  Search,
  ArrowUpDown,
  Utensils,
  Shield,
  CookingPot,
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
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('kn') ? 'kn' : 'en';
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

  // Recipes state for workers (read-only preparation sheets)
  const [recipes, setRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [workerScalePeople, setWorkerScalePeople] = useState(50);

  // Load movements or menu when activeTab switches
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
    } else if (activeTab === 'recipes') {
      const fetchRecipes = async () => {
        setRecipesLoading(true);
        try {
          const res = await api.getRecipes();
          if (res.success) setRecipes(res.recipes || []);
        } catch (err) {
          console.error(err);
        } finally {
          setRecipesLoading(false);
        }
      };
      fetchRecipes();
    }
  }, [activeTab]);

  const getDishName = (item) => {
    if (!item) return '';
    if (currentLang === 'kn') return item.nameKn || item.name || item.nameEn || '';
    return item.nameEn || item.name || item.nameKn || '';
  };

  const getDishDescription = (item) => {
    if (!item) return '';
    if (currentLang === 'kn') return item.descriptionKn || item.description || item.descriptionEn || '';
    return item.descriptionEn || item.description || item.descriptionKn || '';
  };

  return (
    <div className="dashboard-layout">
      {/* Dashboard Top Header Bar */}
      <div className="dashboard-header-bar">
        <div className="container dashboard-header-inner">
          <div className="dashboard-title-group">
            <h2>{t('worker.welcome', 'Canteen Staff & Kitchen Portal')}</h2>
            <p>
              {user?.fullName || user?.username} ({t('worker.roleTag', 'Kitchen Staff / Cook (Read-Only)')}) • {t('worker.institution', 'Rashtrotthana Parishath')}
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="dashboard-tabs">
            <button
              type="button"
              className={`dashboard-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => setActiveTab('inventory')}
            >
              <Package size={16} /> {t('worker.tabInventory', 'Ingredient Inventory')}
            </button>
            <button
              type="button"
              className={`dashboard-tab-btn ${activeTab === 'movements' ? 'active' : ''}`}
              onClick={() => setActiveTab('movements')}
            >
              <History size={16} /> {t('worker.tabMovements', 'Stock Movement History')}
            </button>
            <button
              type="button"
              className={`dashboard-tab-btn ${activeTab === 'recipes' ? 'active' : ''}`}
              onClick={() => setActiveTab('recipes')}
            >
              <CookingPot size={16} /> {t('worker.tabRecipes', 'Recipes & Prep Sheets')}
            </button>
            <button
              type="button"
              className={`dashboard-tab-btn ${activeTab === 'published_menu' ? 'active' : ''}`}
              onClick={() => setActiveTab('published_menu')}
            >
              <Utensils size={16} /> {t('worker.tabMenu', "Today's Published Menu")}
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
            <strong>{t('footer.institutionalStandards', 'Role Permission')}:</strong> {t('worker.readOnlyNotice', 'Read-Only Inventory Access: Modifying quantities, recording stock entries, and publishing daily menus is strictly reserved for the Head of Canteen.')}
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
              <span className="stat-label">{t('worker.totalIngredients', 'Total Ingredients')}</span>
            </div>
          </div>

          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setActiveTab('inventory');
              setStatusFilter(statusFilter === 'low_stock' ? 'all' : 'low_stock');
            }}
            title="Filter low stock items"
          >
            <div className="stat-icon amber">
              <AlertTriangle size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-val" style={{ color: '#b45309' }}>
                {summary.lowStockCount}
              </span>
              <span className="stat-label">{t('worker.lowStockAlerts', 'Low Stock Alerts')}</span>
            </div>
          </div>

          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setActiveTab('inventory');
              setStatusFilter(statusFilter === 'out_of_stock' ? 'all' : 'out_of_stock');
            }}
            title="Filter out-of-stock items"
          >
            <div className="stat-icon red">
              <XCircle size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-val" style={{ color: '#dc2626' }}>
                {summary.outOfStockCount}
              </span>
              <span className="stat-label">{t('worker.outOfStock', 'Out of Stock')}</span>
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
              <span className="stat-label">{t('worker.recentMovements', '24h Stock Movements')}</span>
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
                    placeholder={t('worker.searchPlaceholder', 'Search ingredient name or category...')}
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
                      {t(`inventoryCategories.${cat}`, cat)}
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
                  <option value="all">{t('worker.allStockStatus', 'All Stock Status')}</option>
                  <option value="low_stock">{t('worker.lowStock', 'Low Stock')}</option>
                  <option value="out_of_stock">{t('worker.outOfStock', 'Out of Stock')}</option>
                  <option value="in_stock">{t('worker.inStock', 'In Stock')}</option>
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
                  <option value="name">{t('worker.colIngredient', 'Ingredient Name')}</option>
                  <option value="currentQuantity">{t('worker.colCurrentStock', 'Current Stock')}</option>
                  <option value="category">{t('worker.colCategory', 'Category')}</option>
                  <option value="updatedAt">Date</option>
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
                  <p style={{ color: '#64748b' }}>Loading...</p>
                </div>
              ) : inventory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#64748b' }}>{t('worker.emptyInventory', 'No ingredients match your filter')}</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('worker.colIngredient', 'Ingredient Name')}</th>
                      <th>{t('worker.colCategory', 'Category')}</th>
                      <th>{t('head.colBrand', 'Brand')}</th>
                      <th style={{ textAlign: 'right' }}>{t('worker.colCurrentStock', 'Current Stock')}</th>
                      <th>{t('head.unit', 'Unit')}</th>
                      <th style={{ textAlign: 'right' }}>{t('worker.colUnitPrice', 'Price / Unit')}</th>
                      <th style={{ textAlign: 'right' }}>{t('worker.colTotalValue', 'Total Value')}</th>
                      <th style={{ textAlign: 'right' }}>{t('worker.colMinThreshold', 'Min Threshold')}</th>
                      <th>{t('worker.colStatus', 'Stock Status')}</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => (
                      <tr key={item._id}>
                        <td>
                          <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>
                            {getLocalizedText(item.name, currentLang === 'kn', ITEM_NAME_TRANSLATIONS)}
                          </strong>
                          {item.notes && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {getLocalizedText(item.notes, currentLang === 'kn', ITEM_NOTES_TRANSLATIONS)}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="category-pill">
                            {t(`inventoryCategories.${item.category}`, item.category)}
                          </span>
                        </td>
                        <td>
                          {item.category === 'Vegetables' ? (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>—</span>
                          ) : item.brand ? (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.78rem',
                                fontWeight: '700',
                                letterSpacing: '0.3px',
                                background: 'rgba(37, 99, 235, 0.08)',
                                color: '#1d4ed8',
                                border: '1px solid rgba(37, 99, 235, 0.2)',
                              }}
                            >
                              {item.brand}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>—</span>
                          )}
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
                        <td style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>{t(`units.${item.unit}`, item.unit)}</td>
                        <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--text-main)' }}>
                          {item.unitPrice ? `₹${Number(item.unitPrice).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>
                          {item.unitPrice && item.currentQuantity
                            ? `₹${(Number(item.currentQuantity) * Number(item.unitPrice)).toFixed(2)}`
                            : (item.totalCost ? `₹${Number(item.totalCost).toFixed(2)}` : '—')}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {item.minThreshold} {t(`units.${item.unit}`, item.unit)}
                        </td>
                        <td>
                          <StatusBadge status={item.stockStatus} />
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {new Date(item.updatedAt).toLocaleString(currentLang === 'kn' ? 'kn-IN' : 'en-IN', {
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
              <h3>{t('worker.movementsTitle', 'Stock Movement Audit History')}</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                {t('worker.readOnlyNotice', 'Immutable historical records of kitchen stock additions, consumption, and adjustments.')}
              </p>
            </div>

            <div className="table-container">
              {movementsLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#64748b' }}>Loading...</p>
                </div>
              ) : movements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#64748b' }}>No movements recorded yet.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: '125px' }}>{t('worker.colDate', 'Date & Time')}</th>
                      <th style={{ minWidth: '140px' }}>{t('worker.colIngredient', 'Ingredient Name')}</th>
                      <th>{t('worker.colMovementType', 'Movement Type')}</th>
                      <th style={{ textAlign: 'right' }}>Previous</th>
                      <th style={{ textAlign: 'right' }}>{t('worker.colChange', 'Quantity Changed')}</th>
                      <th style={{ textAlign: 'right' }}>{t('worker.colResulting', 'Stock Result')}</th>
                      <th style={{ minWidth: '120px' }}>{t('worker.colLoggedBy', 'Logged By')}</th>
                      <th style={{ minWidth: '150px' }}>{t('worker.colReason', 'Mandatory Reason / Note')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m._id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {new Date(m.createdAt).toLocaleString(currentLang === 'kn' ? 'kn-IN' : 'en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>
                            {getLocalizedText(m.itemNameSnapshot, currentLang === 'kn', ITEM_NAME_TRANSLATIONS)}
                          </strong>
                        </td>
                        <td>
                          <span className="movement-badge" data-type={m.movementType}>
                            {t(`worker.${m.movementType}`, m.movementType)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {m.previousQuantity} {t(`units.${m.unit}`, m.unit)}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: '700',
                            color: m.changeQuantity > 0 ? '#4ade80' : '#f87171',
                          }}
                        >
                          {m.changeQuantity > 0 ? `+${m.changeQuantity}` : m.changeQuantity}{' '}
                          {t(`units.${m.unit}`, m.unit)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--text-main)' }}>
                          {m.resultingQuantity} {t(`units.${m.unit}`, m.unit)}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>
                            {m.performedByName?.replace(/\s*\(Head of Canteen\)/i, '')}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
                            ({m.performedByRole === 'head' ? t('nav.head', 'Head') : t('nav.staff', 'Staff')})
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '240px', wordBreak: 'break-word' }}>
                          {getLocalizedText(m.reason, currentLang === 'kn', REASON_TRANSLATIONS)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TAB 2B: RECIPES & PREPARATION SHEETS (READ-ONLY) */}
        {activeTab === 'recipes' && (
          <div>
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CookingPot size={22} style={{ color: '#ea580c' }} />
                  {currentLang === 'kn' ? 'ಅಡುಗೆ ತಯಾರಿಕಾ ಪಾಕವಿಧಾನಗಳು' : 'Kitchen Preparation Formulas & Recipes'}
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
                  {currentLang === 'kn'
                    ? 'ಅಡುಗೆ ತಯಾರಿಕೆಗೆ ಅಗತ್ಯವಿರುವ ಪ್ರಮಾಣಬದ್ಧ ಸಾಮಗ್ರಿಗಳ ಪರಿಶೀಲನಾ ಪಟ್ಟಿ. ಜನರ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ ಬೇಕಾದ ನಿಖರ ಸಾಮಗ್ರಿಗಳ ತೂಕವನ್ನು ಲೆಕ್ಕಹಾಕಿ.'
                    : 'Standard recipe ingredient checklists for cooking. Enter a people count to calculate exact ingredient weights for kitchen prep.'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>
                  {currentLang === 'kn' ? 'ಲೆಕ್ಕಾಚಾರ:' : 'Calculate for:'}
                </span>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  style={{ width: '90px', padding: '4px 8px', fontSize: '0.9rem', fontWeight: '700' }}
                  value={workerScalePeople}
                  onChange={(e) => setWorkerScalePeople(Math.max(1, Number(e.target.value) || 1))}
                />
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {currentLang === 'kn' ? 'ಜನರಿಗೆ' : 'people'}
                </span>
              </div>
            </div>

            {recipesLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: '#64748b' }}>Loading preparation sheets...</p>
              </div>
            ) : recipes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <p style={{ color: '#64748b' }}>No recipes configured yet. Ask Canteen Head to set up dish formulas.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                {recipes.map((recipe) => {
                  const people = workerScalePeople || recipe.basePortion || 50;

                  return (
                    <div
                      key={recipe._id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div
                        style={{
                          padding: '1rem 1.25rem',
                          background: '#fafafa',
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: '#fef3c7',
                              color: '#92400e',
                              fontWeight: '600',
                            }}
                          >
                            {recipe.category}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: '#f1f5f9',
                              color: '#475569',
                              fontWeight: '600',
                            }}
                          >
                            {currentLang === 'kn' ? `ಮೂಲ: ${recipe.basePortion} ಜನರಿಗೆ` : `Base: ${recipe.basePortion}p`}
                          </span>
                        </div>
                        <h4 style={{ margin: '0 0 2px 0', fontSize: '1.05rem', color: '#1e293b' }}>
                          {currentLang === 'kn' ? (recipe.dishNameKn || recipe.dishName) : (recipe.dishName || recipe.dishNameKn)}
                        </h4>
                      </div>

                      <div style={{ padding: '1rem 1.25rem', flex: 1 }}>
                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: '#15803d',
                            fontWeight: '700',
                            marginBottom: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {currentLang === 'kn' ? `${people} ಜನರಿಗೆ ಅಗತ್ಯ ಸಾಮಗ್ರಿಗಳು:` : `Portions needed for ${people} people:`}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {recipe.ingredients.map((ing, idx) => {
                            const scaledQty = Number(((ing.quantity / recipe.basePortion) * people).toFixed(2));
                            const inStock = ing.inventoryItem?.currentQuantity ?? 0;
                            const isShort = inStock < scaledQty;

                            return (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontSize: '0.85rem',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  background: isShort ? '#fff1f2' : '#f8fafc',
                                  border: isShort ? '1px solid #fecdd3' : '1px solid #f1f5f9',
                                }}
                              >
                                <span style={{ fontWeight: '500', color: '#334155' }}>
                                  {ing.itemNameSnapshot}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <strong style={{ color: isShort ? '#dc2626' : '#0f172a' }}>
                                    {scaledQty} {ing.unit}
                                  </strong>
                                  <span style={{ fontSize: '0.72rem', color: isShort ? '#b91c1c' : '#64748b' }}>
                                    (Store: {inStock})
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PUBLISHED MENU (READ-ONLY) */}
        {activeTab === 'published_menu' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3>{t('worker.todayMenuTitle', "Today's Published Menu for Kitchen Reference")}</h3>
            </div>

            {menuLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: '#64748b' }}>Loading...</p>
              </div>
            ) : !publishedMenu ? (
              <div className="empty-state-box">
                <p>{t('worker.noMenuToday', 'No menu published for today yet.')}</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>{t('home.heroTitle', 'Dish Name')}</th>
                      <th>{t('worker.colCategory', 'Category')}</th>
                      <th>{t('worker.colStatus', 'Status')}</th>
                      <th>{t('worker.colWastage', 'Food Wastage')}</th>
                      <th>{t('head.colFeedback', 'Feedback / Notes')}</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {publishedMenu.items.map((item, idx) => {
                      const wasteQty = Number(item.wastage?.quantity) || 0;
                      const wasteUnit = item.wastage?.unit || 'kg';
                      const wasteReason = item.wastage?.reason || '';
                      return (
                        <tr key={item._id || idx}>
                          <td style={{ width: '40px', color: '#64748b' }}>{idx + 1}</td>
                          <td>
                            <strong>{getDishName(item)}</strong>
                          </td>
                          <td>
                            <span className="category-pill">
                              {t(`categories.${item.category}`, item.category)}
                            </span>
                          </td>
                          <td>
                            <StatusBadge status={item.isAvailable ? 'available' : 'unavailable'} />
                          </td>
                          <td>
                            {wasteQty > 0 ? (
                              <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
                                <span
                                  style={{
                                    fontSize: '0.78rem',
                                    color: '#b45309',
                                    background: '#fef3c7',
                                    border: '1px solid #fde68a',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontWeight: '700',
                                  }}
                                  title={wasteReason ? `Reason: ${wasteReason}` : ''}
                                >
                                  ⚠️ {wasteQty} {wasteUnit}
                                </span>
                                {wasteReason && (
                                  <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', maxWidth: '140px' }}>
                                    {wasteReason}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  color: '#15803d',
                                  background: '#dcfce7',
                                  border: '1px solid #bbf7d0',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontWeight: '600',
                                }}
                              >
                                ✓ {t('head.noWaste', '0 (No Waste)')}
                              </span>
                            )}
                          </td>
                          <td>
                            {item.feedback ? (
                              <span style={{ fontSize: '0.78rem', color: '#047857', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px', fontWeight: '500' }}>
                                💬 {item.feedback}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>
                            )}
                          </td>
                          <td style={{ color: '#475569', fontSize: '0.85rem' }}>
                            {getDishDescription(item) || '—'}
                          </td>
                        </tr>
                      );
                    })}
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
