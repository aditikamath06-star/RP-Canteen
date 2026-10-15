import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { VegBadge } from '../components/VegBadge';
import {
  Package,
  AlertTriangle,
  XCircle,
  History,
  Calendar,
  Users,
  ShieldAlert,
  Plus,
  Edit2,
  Trash2,
  Archive,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  CheckCircle2,
  Eye,
  Send,
  FileText,
} from 'lucide-react';

const CATEGORIES = [
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

const UNITS = ['kg', 'g', 'l', 'ml', 'packets', 'pieces', 'tins', 'bags', 'boxes'];

const MEAL_CATEGORIES = [
  'Breakfast',
  'Lunch',
  'Evening Snacks',
  'Dinner',
  'Beverages',
  'Sweets & Desserts',
];

export const HeadDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('inventory'); // 'overview' | 'inventory' | 'movements' | 'menus' | 'staff' | 'audit'

  // Global messages
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const showNotification = (msg, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 6000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  // -------------------------------------------------------------------------
  // 1. INVENTORY STATE & ACTIONS
  // -------------------------------------------------------------------------
  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState({
    totalItems: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    recentMovements24h: 0,
  });
  const [invLoading, setInvLoading] = useState(true);
  const [invSearch, setInvSearch] = useState('');
  const [invCategory, setInvCategory] = useState('All');
  const [invStatus, setInvStatus] = useState('all');
  const [includeArchived, setIncludeArchived] = useState(false);

  // Modals for Inventory
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form states
  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'Grains & Pulses',
    initialQuantity: 0,
    unit: 'kg',
    minThreshold: 5,
    notes: '',
  });

  const [stockForm, setStockForm] = useState({
    movementType: 'received', // 'received' | 'consumed' | 'discarded' | 'correction'
    quantity: '',
    exactResultingQuantity: '',
    reason: '',
  });

  const loadInventory = async () => {
    setInvLoading(true);
    try {
      const [sumRes, listRes] = await Promise.all([
        api.getInventorySummary(),
        api.getInventory({
          search: invSearch,
          category: invCategory,
          status: invStatus,
          includeArchived: includeArchived ? 'true' : 'false',
        }),
      ]);
      if (sumRes.success) setSummary(sumRes.summary);
      if (listRes.success) setInventory(listRes.inventory);
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setInvLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [invSearch, invCategory, invStatus, includeArchived]);

  // Handle Add Item
  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createInventoryItem(itemForm);
      if (res.success) {
        showNotification(`Created inventory item "${res.item.name}"`);
        setIsAddModalOpen(false);
        setItemForm({
          name: '',
          category: 'Grains & Pulses',
          initialQuantity: 0,
          unit: 'kg',
          minThreshold: 5,
          notes: '',
        });
        loadInventory();
      }
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // Handle Edit Item
  const handleEditItem = async (e) => {
    e.preventDefault();
    try {
      const res = await api.updateInventoryItem(selectedItem._id, itemForm);
      if (res.success) {
        showNotification(`Updated item "${res.item.name}"`);
        setIsEditModalOpen(false);
        setSelectedItem(null);
        loadInventory();
      }
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // Handle Stock Adjustment
  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!stockForm.reason.trim()) {
      showNotification('Please provide a specific reason for stock modification.', true);
      return;
    }
    try {
      const payload = {
        movementType: stockForm.movementType,
        reason: stockForm.reason,
      };

      if (stockForm.movementType === 'correction' && stockForm.exactResultingQuantity !== '') {
        payload.exactResultingQuantity = Number(stockForm.exactResultingQuantity);
      } else {
        payload.quantity = Number(stockForm.quantity);
      }

      const res = await api.adjustStock(selectedItem._id, payload);
      if (res.success) {
        showNotification(res.message);
        setIsStockModalOpen(false);
        setSelectedItem(null);
        setStockForm({
          movementType: 'received',
          quantity: '',
          exactResultingQuantity: '',
          reason: '',
        });
        loadInventory();
      }
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // Handle Archive Item
  const handleArchiveToggle = async (item) => {
    const actionName = item.isArchived ? 'restore' : 'archive';
    if (
      !window.confirm(
        `Are you sure you want to ${actionName} "${item.name}"? Historical stock records will remain preserved.`
      )
    ) {
      return;
    }

    try {
      const res = await api.archiveInventoryItem(item._id, !item.isArchived);
      if (res.success) {
        showNotification(res.message);
        loadInventory();
      }
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // -------------------------------------------------------------------------
  // 2. STOCK MOVEMENTS STATE
  // -------------------------------------------------------------------------
  const [movements, setMovements] = useState([]);
  const [movFilter, setMovFilter] = useState('all');
  const [movLoading, setMovLoading] = useState(false);

  const loadMovements = async () => {
    setMovLoading(true);
    try {
      const res = await api.getMovements({ movementType: movFilter, limit: 150 });
      if (res.success) setMovements(res.movements);
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setMovLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'movements') {
      loadMovements();
    }
  }, [activeTab, movFilter]);

  // -------------------------------------------------------------------------
  // 3. DAILY MENU MANAGEMENT STATE & ACTIONS
  // -------------------------------------------------------------------------
  const [menusList, setMenusList] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null); // null when creating or viewing list
  const [isMenuEditorOpen, setIsMenuEditorOpen] = useState(false);

  // Menu Editor Form
  const [menuFormDate, setMenuFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [menuFormTitle, setMenuFormTitle] = useState('Daily Vegetarian Canteen Menu');
  const [menuFormNote, setMenuFormNote] = useState('');
  const [menuFormStatus, setMenuFormStatus] = useState('draft');
  const [menuFormItems, setMenuFormItems] = useState([]);

  // New Dish Subform inside Menu
  const [newDish, setNewDish] = useState({
    name: '',
    category: 'Breakfast',
    description: '',
    imageUrl: '',
    isAvailable: true,
  });

  const loadAllMenus = async () => {
    setMenuLoading(true);
    try {
      const res = await api.getAllMenus();
      if (res.success) setMenusList(res.menus);
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setMenuLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'menus') {
      loadAllMenus();
    }
  }, [activeTab]);

  const openNewMenuModal = () => {
    setEditingMenu(null);
    setMenuFormDate(new Date().toISOString().split('T')[0]);
    setMenuFormTitle('Rashtrotthana Parishath - Daily Vegetarian Menu');
    setMenuFormNote('');
    setMenuFormStatus('draft');
    setMenuFormItems([]);
    setIsMenuEditorOpen(true);
  };

  const openEditMenuModal = (menu) => {
    setEditingMenu(menu);
    setMenuFormDate(menu.date);
    setMenuFormTitle(menu.title);
    setMenuFormNote(menu.specialNote || '');
    setMenuFormStatus(menu.status);
    setMenuFormItems(menu.items || []);
    setIsMenuEditorOpen(true);
  };

  const handleAddDishToMenu = (e) => {
    e.preventDefault();
    if (!newDish.name.trim()) {
      showNotification('Dish name is required.', true);
      return;
    }

    setMenuFormItems([
      ...menuFormItems,
      {
        ...newDish,
        isVegetarian: true, // Strictly pure vegetarian
        displayOrder: menuFormItems.length + 1,
      },
    ]);

    // Reset new dish form
    setNewDish({
      name: '',
      category: newDish.category,
      description: '',
      imageUrl: '',
      isAvailable: true,
    });
  };

  const handleRemoveDishFromMenu = (idx) => {
    const updated = [...menuFormItems];
    updated.splice(idx, 1);
    setMenuFormItems(updated);
  };

  const handleToggleDishAvailabilityInForm = (idx) => {
    const updated = [...menuFormItems];
    updated[idx].isAvailable = !updated[idx].isAvailable;
    setMenuFormItems(updated);
  };

  const handleSaveMenu = async (saveAsStatus) => {
    if (!menuFormDate) {
      showNotification('Please select a date for the menu.', true);
      return;
    }

    if (menuFormItems.length === 0) {
      showNotification('Please add at least one vegetarian dish to the menu.', true);
      return;
    }

    try {
      const payload = {
        date: menuFormDate,
        title: menuFormTitle,
        specialNote: menuFormNote,
        status: saveAsStatus || menuFormStatus,
        items: menuFormItems,
      };

      if (editingMenu) {
        const res = await api.updateMenu(editingMenu._id, payload);
        if (res.success) {
          showNotification(`Menu for ${menuFormDate} updated (${res.menu.status})!`);
          setIsMenuEditorOpen(false);
          loadAllMenus();
        }
      } else {
        const res = await api.createMenu(payload);
        if (res.success) {
          showNotification(`New menu for ${menuFormDate} created (${res.menu.status})!`);
          setIsMenuEditorOpen(false);
          loadAllMenus();
        }
      }
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleQuickPublishToggle = async (menu) => {
    const newStatus = menu.status === 'published' ? 'draft' : 'published';
    try {
      const res = await api.publishMenu(menu._id, newStatus);
      if (res.success) {
        showNotification(res.message);
        loadAllMenus();
      }
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleQuickItemAvailability = async (menuId, itemId, currentStatus) => {
    try {
      const res = await api.toggleMenuItemAvailability(menuId, itemId, !currentStatus);
      if (res.success) {
        showNotification(res.message);
        loadAllMenus();
      }
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // -------------------------------------------------------------------------
  // 4. STAFF ACCOUNT MANAGEMENT STATE & ACTIONS
  // -------------------------------------------------------------------------
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    role: 'worker',
  });

  const loadStaff = async () => {
    setStaffLoading(true);
    try {
      const res = await api.getStaff();
      if (res.success) setStaffList(res.staff);
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'staff') {
      loadStaff();
    }
  }, [activeTab]);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createStaff(staffForm);
      if (res.success) {
        showNotification(`Created staff account "${res.user.username}" (${res.user.role})!`);
        setIsAddStaffModalOpen(false);
        setStaffForm({
          username: '',
          email: '',
          fullName: '',
          password: '',
          role: 'worker',
        });
        loadStaff();
      }
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleToggleStaffStatus = async (staffMember) => {
    if (staffMember._id === user.id) {
      showNotification('Cannot deactivate your own Head of Canteen account.', true);
      return;
    }

    try {
      const res = await api.toggleStaffStatus(staffMember._id, !staffMember.isActive);
      if (res.success) {
        showNotification(res.message);
        loadStaff();
      }
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // -------------------------------------------------------------------------
  // 5. AUDIT LOGS STATE
  // -------------------------------------------------------------------------
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const res = await api.getAuditLogs({ limit: 100 });
      if (res.success) setAuditLogs(res.logs);
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab]);

  return (
    <div className="dashboard-layout">
      {/* Header Bar */}
      <div className="dashboard-header-bar">
        <div className="container dashboard-header-inner">
          <div className="dashboard-title-group">
            <h2>Head of Canteen Administration Portal</h2>
            <p>
              Administrator: <strong>{user?.fullName?.replace(/\s*\(Head of Canteen\)/i, '') || user?.username}</strong> (Head of Canteen) • Full Privileged Access
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="dashboard-tabs">
            <button
              type="button"
              className={`dashboard-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => setActiveTab('inventory')}
            >
              <Package size={16} /> Inventory Management
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
              className={`dashboard-tab-btn ${activeTab === 'menus' ? 'active' : ''}`}
              onClick={() => setActiveTab('menus')}
            >
              <Calendar size={16} /> Daily Menus
            </button>
            <button
              type="button"
              className={`dashboard-tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
              onClick={() => setActiveTab('staff')}
            >
              <Users size={16} /> Staff Accounts
            </button>
            <button
              type="button"
              className={`dashboard-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
              onClick={() => setActiveTab('audit')}
            >
              <ShieldAlert size={16} /> Audit Trail
            </button>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '1.5rem 1.25rem 4rem' }}>
        {/* Alerts / Feedback Notifications */}
        {successMsg && (
          <div className="alert-box alert-success">
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="alert-box alert-error">
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* =========================================================================
            TAB 1: INVENTORY MANAGEMENT
            ========================================================================= */}
        {activeTab === 'inventory' && (
          <div>
            {/* Quick Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue"><Package size={24} /></div>
                <div className="stat-info">
                  <span className="stat-val">{summary.totalItems}</span>
                  <span className="stat-label">Total Inventory Items</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon amber"><AlertTriangle size={24} /></div>
                <div className="stat-info">
                  <span className="stat-val" style={{ color: '#b45309' }}>{summary.lowStockCount}</span>
                  <span className="stat-label">Low Stock Alerts</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon red"><XCircle size={24} /></div>
                <div className="stat-info">
                  <span className="stat-val" style={{ color: '#dc2626' }}>{summary.outOfStockCount}</span>
                  <span className="stat-label">Out of Stock Items</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green"><History size={24} /></div>
                <div className="stat-info">
                  <span className="stat-val">{summary.recentMovements24h}</span>
                  <span className="stat-label">Stock Movements (24h)</span>
                </div>
              </div>
            </div>

            {/* Actions Bar & Filters */}
            <div className="filter-bar-card">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsAddModalOpen(true)}
                >
                  <Plus size={16} /> Add Inventory Item
                </button>

                {/* Search */}
                <div style={{ position: 'relative', minWidth: '220px' }}>
                  <Search
                    size={16}
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '34px', height: '36px', fontSize: '0.85rem' }}
                    placeholder="Search ingredients..."
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                  />
                </div>

                {/* Category */}
                <select
                  className="form-select"
                  style={{ width: 'auto', height: '36px', fontSize: '0.85rem' }}
                  value={invCategory}
                  onChange={(e) => setInvCategory(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                {/* Status */}
                <select
                  className="form-select"
                  style={{ width: 'auto', height: '36px', fontSize: '0.85rem' }}
                  value={invStatus}
                  onChange={(e) => setInvStatus(e.target.value)}
                >
                  <option value="all">All Levels</option>
                  <option value="low_stock">Low Stock Only</option>
                  <option value="out_of_stock">Out of Stock Only</option>
                  <option value="in_stock">Healthy Stock</option>
                </select>
              </div>

              {/* Include Archived toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', color: '#64748b' }}>
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(e) => setIncludeArchived(e.target.checked)}
                />
                Show Archived Items
              </label>
            </div>

            {/* Inventory Table with Head-only Controls */}
            <div className="table-container">
              {invLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#64748b' }}>Loading inventory items...</p>
                </div>
              ) : inventory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#64748b' }}>No inventory items found.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ingredient Name</th>
                      <th>Category</th>
                      <th style={{ textAlign: 'right' }}>Current Stock</th>
                      <th>Unit</th>
                      <th style={{ textAlign: 'right' }}>Min Alert Threshold</th>
                      <th>Stock Status</th>
                      <th style={{ textAlign: 'center' }}>Head Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => (
                      <tr key={item._id} style={{ opacity: item.isArchived ? 0.6 : 1 }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>{item.name}</strong>
                            {item.isArchived && (
                              <span style={{ fontSize: '0.65rem', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', padding: '2px 5px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                ARCHIVED
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{item.notes}</div>
                          )}
                        </td>
                        <td>
                          <span className="category-pill">
                            {item.category}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '800', fontSize: '1rem' }}>
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
                        <td style={{ color: 'var(--text-secondary)' }}>{item.unit}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {item.minThreshold} {item.unit}
                        </td>
                        <td>
                          <StatusBadge status={item.stockStatus} />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            {/* Stock Adjustment Button */}
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                              onClick={() => {
                                setSelectedItem(item);
                                setStockForm({
                                  movementType: 'received',
                                  quantity: '',
                                  exactResultingQuantity: '',
                                  reason: '',
                                });
                                setIsStockModalOpen(true);
                              }}
                              title="Update stock (received, consumed, discarded, correction)"
                            >
                              <TrendingUp size={13} /> Update Stock
                            </button>

                            {/* Edit Item Details */}
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.3rem 0.5rem' }}
                              onClick={() => {
                                setSelectedItem(item);
                                setItemForm({
                                  name: item.name,
                                  category: item.category,
                                  unit: item.unit,
                                  minThreshold: item.minThreshold,
                                  notes: item.notes || '',
                                });
                                setIsEditModalOpen(true);
                              }}
                              title="Edit item details & threshold"
                            >
                              <Edit2 size={13} />
                            </button>

                            {/* Archive Toggle */}
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.3rem 0.5rem', color: item.isArchived ? '#15803d' : '#64748b' }}
                              onClick={() => handleArchiveToggle(item)}
                              title={item.isArchived ? 'Restore item' : 'Archive item'}
                            >
                              <Archive size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: STOCK MOVEMENT AUDIT TRAIL
            ========================================================================= */}
        {activeTab === 'movements' && (
          <div>
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <h3>Stock Movement History</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Immutable audit records of all stock additions, deductions, and corrections.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Filter Movement:</span>
                <select
                  className="form-select"
                  style={{ width: 'auto', height: '36px', fontSize: '0.85rem' }}
                  value={movFilter}
                  onChange={(e) => setMovFilter(e.target.value)}
                >
                  <option value="all">All Movements</option>
                  <option value="received">Stock Received</option>
                  <option value="consumed">Stock Consumed</option>
                  <option value="discarded">Discarded / Expired</option>
                  <option value="correction">Stock Correction</option>
                </select>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={loadMovements}
                  title="Refresh movements"
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
            </div>

            <div className="table-container">
              {movLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#64748b' }}>Loading historical movements...</p>
                </div>
              ) : movements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#64748b' }}>No movements recorded matching filter.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Item Name</th>
                      <th>Movement Type</th>
                      <th style={{ textAlign: 'right' }}>Previous Stock</th>
                      <th style={{ textAlign: 'right' }}>Change</th>
                      <th style={{ textAlign: 'right' }}>Resulting Stock</th>
                      <th>Responsible Account</th>
                      <th>Mandatory Reason</th>
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
                          {m.changeQuantity > 0 ? `+${m.changeQuantity}` : m.changeQuantity} {m.unit}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--text-main)' }}>
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

        {/* =========================================================================
            TAB 3: DAILY MENU MANAGEMENT
            ========================================================================= */}
        {activeTab === 'menus' && (
          <div>
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <h3>Daily Vegetarian Menu Management</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Create, update, and publish date-specific pure vegetarian menus. No food prices are used in institutional menus.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={openNewMenuModal}
              >
                <Plus size={16} /> Create Daily Menu
              </button>
            </div>

            {/* Menus List */}
            <div className="table-container">
              {menuLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#64748b' }}>Loading daily menus...</p>
                </div>
              ) : menusList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#64748b' }}>No menus created yet. Click "Create Daily Menu" above.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Menu Date</th>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Dishes Count</th>
                      <th>Published Timestamp</th>
                      <th>Created By</th>
                      <th style={{ textAlign: 'center' }}>Head Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menusList.map((m) => (
                      <tr key={m._id}>
                        <td>
                          <strong style={{ fontSize: '1rem' }}>{m.date}</strong>
                          {m.date === new Date().toISOString().split('T')[0] && (
                            <span style={{ marginLeft: '6px', fontSize: '0.7rem', background: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>
                              TODAY
                            </span>
                          )}
                        </td>
                        <td>{m.title}</td>
                        <td>
                          <span
                            style={{
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              backgroundColor: m.status === 'published' ? '#dcfce7' : '#fef3c7',
                              color: m.status === 'published' ? '#15803d' : '#b45309',
                            }}
                          >
                            {m.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: '600' }}>{m.items?.length || 0}</span> vegetarian items
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {m.publishedAt
                            ? new Date(m.publishedAt).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Unpublished draft'}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {m.createdBy?.fullName || m.createdBy?.username || 'Head'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            {/* Toggle Publish / Draft */}
                            <button
                              type="button"
                              className={`btn btn-sm ${m.status === 'published' ? 'btn-secondary' : 'btn-accent'}`}
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                              onClick={() => handleQuickPublishToggle(m)}
                              title={m.status === 'published' ? 'Unpublish menu (save as draft)' : 'Publish menu to public website'}
                            >
                              {m.status === 'published' ? 'Unpublish' : 'Publish'}
                            </button>

                            {/* Edit Menu */}
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.3rem 0.5rem' }}
                              onClick={() => openEditMenuModal(m)}
                              title="Edit menu items and details"
                            >
                              <Edit2 size={13} /> Edit
                            </button>

                            {/* View on Public Page */}
                            <a
                              href={`/?date=${m.date}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.3rem 0.5rem' }}
                              title="Preview on Public Page"
                            >
                              <Eye size={13} />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: STAFF MANAGEMENT
            ========================================================================= */}
        {activeTab === 'staff' && (
          <div>
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <h3>Canteen Staff Accounts</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Manage authorized workers, cooks, and canteen staff members.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsAddStaffModalOpen(true)}
              >
                <Plus size={16} /> Add Staff Account
              </button>
            </div>

            <div className="table-container">
              {staffLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#64748b' }}>Loading staff accounts...</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map((member) => (
                      <tr key={member._id}>
                        <td><strong>{member.fullName}</strong></td>
                        <td>{member.username}</td>
                        <td style={{ color: '#64748b' }}>{member.email}</td>
                        <td>
                          <span className="role-pill" data-role={member.role}>
                            {member.role === 'head' ? 'HEAD OF CANTEEN' : 'CANTEEN STAFF'}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              color: member.isActive ? '#15803d' : '#dc2626',
                              fontWeight: '600',
                              fontSize: '0.85rem',
                            }}
                          >
                            {member.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {member.lastLogin
                            ? new Date(member.lastLogin).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Never logged in'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {member._id !== user.id ? (
                            <button
                              type="button"
                              className={`btn btn-sm ${member.isActive ? 'btn-danger' : 'btn-secondary'}`}
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                              onClick={() => handleToggleStaffStatus(member)}
                            >
                              {member.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              Current User
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: AUDIT LOGS
            ========================================================================= */}
        {activeTab === 'audit' && (
          <div>
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <h3>Administrative Audit History</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Permanent log of administrative events: stock updates, inventory creations, menu publications, and staff account modifications.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={loadAuditLogs}
              >
                <RefreshCw size={14} /> Refresh Logs
              </button>
            </div>

            <div className="table-container">
              {auditLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#64748b' }}>Loading audit records...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#64748b' }}>No audit records found.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action</th>
                      <th>Performed By</th>
                      <th>Target Type</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log._id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#64748b' }}>
                          {new Date(log.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td>
                          <span className="code-pill">
                            {log.action}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text-main)' }}>{log.performedByName}</strong>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            ({log.performedByRole})
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-main)' }}>{log.targetType}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '350px' }}>
                          <pre className="code-block">
                            {JSON.stringify(log.details, null, 1)}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL: ADD INVENTORY ITEM
          ========================================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Kitchen Inventory Item"
      >
        <form onSubmit={handleAddItem}>
          <div className="form-group">
            <label className="form-label">Ingredient / Item Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Sona Masoori Rice, Toor Dal, Cow Milk"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-select"
                value={itemForm.category}
                onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                required
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Measurement Unit *</label>
              <select
                className="form-select"
                value={itemForm.unit}
                onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                required
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Initial Stock Quantity</label>
              <input
                type="number"
                step="any"
                min="0"
                className="form-input"
                placeholder="0"
                value={itemForm.initialQuantity}
                onChange={(e) => setItemForm({ ...itemForm, initialQuantity: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Min Alert Threshold *</label>
              <input
                type="number"
                step="any"
                min="0"
                className="form-input"
                placeholder="5"
                value={itemForm.minThreshold}
                onChange={(e) => setItemForm({ ...itemForm, minThreshold: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. For daily sambar, sourced organic"
              value={itemForm.notes}
              onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
            />
          </div>

          <div className="modal-footer" style={{ margin: '1.5rem -1.5rem -1.5rem', padding: '1rem 1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Inventory Item
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: EDIT INVENTORY ITEM
          ========================================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Item: ${selectedItem?.name}`}
      >
        <form onSubmit={handleEditItem}>
          <div className="form-group">
            <label className="form-label">Item Name *</label>
            <input
              type="text"
              className="form-input"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-select"
                value={itemForm.category}
                onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                required
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Measurement Unit *</label>
              <select
                className="form-select"
                value={itemForm.unit}
                onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                required
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Minimum Stock Threshold *</label>
            <input
              type="number"
              step="any"
              min="0"
              className="form-input"
              value={itemForm.minThreshold}
              onChange={(e) => setItemForm({ ...itemForm, minThreshold: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <input
              type="text"
              className="form-input"
              value={itemForm.notes}
              onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
            />
          </div>

          <div className="modal-footer" style={{ margin: '1.5rem -1.5rem -1.5rem', padding: '1rem 1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Update Details
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: UPDATE STOCK QUANTITY (HEAD EXCLUSIVE PERMISSION)
          ========================================================================= */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        title={`Update Stock: ${selectedItem?.name}`}
      >
        <form onSubmit={handleAdjustStock}>
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Current Available Stock:</span>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                {selectedItem?.currentQuantity} {selectedItem?.unit}
              </div>
            </div>
            <StatusBadge status={selectedItem?.stockStatus} />
          </div>

          <div className="form-group">
            <label className="form-label">Movement Type *</label>
            <select
              className="form-select"
              value={stockForm.movementType}
              onChange={(e) => setStockForm({ ...stockForm, movementType: e.target.value })}
              required
            >
              <option value="received">Stock Received (Addition)</option>
              <option value="consumed">Stock Consumed (Deduction)</option>
              <option value="discarded">Stock Discarded / Expired (Deduction)</option>
              <option value="correction">Stock Correction (Manual Reconciliation)</option>
            </select>
          </div>

          {stockForm.movementType === 'correction' ? (
            <div className="form-group">
              <label className="form-label">New Exact Count in Stock ({selectedItem?.unit}) *</label>
              <input
                type="number"
                step="any"
                min="0"
                className="form-input"
                placeholder="Enter exact physically verified quantity"
                value={stockForm.exactResultingQuantity}
                onChange={(e) => setStockForm({ ...stockForm, exactResultingQuantity: e.target.value })}
                required
              />
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">
                Quantity to {stockForm.movementType === 'received' ? 'Add' : 'Deduct'} ({selectedItem?.unit}) *
              </label>
              <input
                type="number"
                step="any"
                min="0.001"
                className="form-input"
                placeholder="e.g. 5"
                value={stockForm.quantity}
                onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Mandatory Reason / Note *</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="e.g. Received weekly supply from wholesale vendor / Used for 300 lunch thali meals / Spoilage inspection"
              value={stockForm.reason}
              onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })}
              required
            />
          </div>

          <div className="modal-footer" style={{ margin: '1.5rem -1.5rem -1.5rem', padding: '1rem 1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsStockModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Confirm & Record Stock Movement
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: DAILY MENU BUILDER & EDITOR
          ========================================================================= */}
      <Modal
        isOpen={isMenuEditorOpen}
        onClose={() => setIsMenuEditorOpen(false)}
        title={editingMenu ? `Edit Menu for ${menuFormDate}` : 'Create Daily Vegetarian Menu'}
        maxWidth="750px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top Menu Meta Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Menu Date *</label>
              <input
                type="date"
                className="form-input"
                value={menuFormDate}
                onChange={(e) => setMenuFormDate(e.target.value)}
                disabled={Boolean(editingMenu)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Menu Heading Title *</label>
              <input
                type="text"
                className="form-input"
                value={menuFormTitle}
                onChange={(e) => setMenuFormTitle(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Special Notice (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Festival Special Sweets prepared today with pure ghee"
              value={menuFormNote}
              onChange={(e) => setMenuFormNote(e.target.value)}
            />
          </div>

          {/* Add Vegetarian Dish Subform */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.95rem' }}>Add Vegetarian Dish to Menu</h4>
              <VegBadge showLabel={true} />
            </div>

            <form onSubmit={handleAddDishToMenu}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Dish Name (e.g. Mysore Masala Dosa, Bisibelebath)"
                  value={newDish.name}
                  onChange={(e) => setNewDish({ ...newDish, name: e.target.value })}
                  required
                />
                <select
                  className="form-select"
                  value={newDish.category}
                  onChange={(e) => setNewDish({ ...newDish, category: e.target.value })}
                >
                  {MEAL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Description (ingredients, taste, accompaniment)"
                  value={newDish.description}
                  onChange={(e) => setNewDish({ ...newDish, description: e.target.value })}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Food Image URL (Optional)"
                  value={newDish.imageUrl}
                  onChange={(e) => setNewDish({ ...newDish, imageUrl: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newDish.isAvailable}
                    onChange={(e) => setNewDish({ ...newDish, isAvailable: e.target.checked })}
                  />
                  Mark Available Initially
                </label>

                <button type="submit" className="btn btn-secondary btn-sm">
                  <Plus size={15} /> Add Dish to Menu
                </button>
              </div>
            </form>
          </div>

          {/* Current Dishes List in this Menu */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h4 style={{ fontSize: '0.95rem' }}>Dishes in this Menu ({menuFormItems.length})</h4>
              <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: '600' }}>
                100% Pure Vegetarian Guaranteed • No Prices
              </span>
            </div>

            {menuFormItems.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b' }}>
                No dishes added yet. Use the subform above to add vegetarian dishes.
              </div>
            ) : (
              <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table className="data-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Dish Name</th>
                      <th>Category</th>
                      <th>Availability</th>
                      <th style={{ textAlign: 'center' }}>Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuFormItems.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ width: '30px', color: '#64748b' }}>{idx + 1}</td>
                        <td>
                          <strong>{item.name}</strong>
                          {item.description && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.description}</div>
                          )}
                        </td>
                        <td>
                          <span className="category-pill">
                            {item.category}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`btn btn-sm ${item.isAvailable ? 'btn-secondary' : 'btn-danger'}`}
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                            onClick={() => handleToggleDishAvailabilityInForm(idx)}
                          >
                            {item.isAvailable ? 'Available' : 'Unavailable'}
                          </button>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            style={{ color: '#ef4444', padding: '4px' }}
                            onClick={() => handleRemoveDishFromMenu(idx)}
                            title="Remove dish"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="modal-footer" style={{ margin: '1rem -1.5rem -1.5rem', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsMenuEditorOpen(false)}>
              Cancel
            </button>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleSaveMenu('draft')}
              >
                Save as Draft
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleSaveMenu('published')}
              >
                <Send size={15} /> Publish to Website
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* =========================================================================
          MODAL: ADD STAFF ACCOUNT
          ========================================================================= */}
      <Modal
        isOpen={isAddStaffModalOpen}
        onClose={() => setIsAddStaffModalOpen(false)}
        title="Provision Canteen Staff Account"
      >
        <form onSubmit={handleCreateStaff}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Ramesh Kumar"
              value={staffForm.fullName}
              onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Username *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. worker_ramesh"
                value={staffForm.username}
                onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Role *</label>
              <select
                className="form-select"
                value={staffForm.role}
                onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                required
              >
                <option value="worker">Canteen Staff / Cook (Read-only)</option>
                <option value="head">Head of Canteen (Administrator)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              className="form-input"
              placeholder="e.g. ramesh@rashtrotthana.org"
              value={staffForm.email}
              onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Temporary Password * (Min 6 chars)</label>
            <input
              type="password"
              className="form-input"
              placeholder="Create secure password"
              value={staffForm.password}
              onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
              required
            />
          </div>

          <div className="modal-footer" style={{ margin: '1.5rem -1.5rem -1.5rem', padding: '1rem 1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddStaffModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
