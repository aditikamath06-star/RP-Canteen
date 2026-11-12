import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { VegBadge } from '../components/VegBadge';
import { ReportsView } from '../components/ReportsView';
import {
  REASON_TRANSLATIONS,
  ITEM_NAME_TRANSLATIONS,
  ITEM_NOTES_TRANSLATIONS,
  getLocalizedText,
} from '../utils/localizedData';
import {
  resolveFoodImage,
  QUICK_IMAGE_PRESETS,
  CATEGORY_DEFAULT_IMAGES,
} from '../utils/foodImages';
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
  CheckCircle2,
  Eye,
  Send,
  Languages,
  Sparkles,
  CookingPot,
  UtensilsCrossed,
  Building2,
  BarChart2,
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
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('kn') ? 'kn' : 'en';
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'movements' | 'menus' | 'staff' | 'audit'

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

  // Auto-alert popup for out of stock & low stock items on initial entry
  const [isStockAlertModalOpen, setIsStockAlertModalOpen] = useState(false);
  const [hasShownStockAlert, setHasShownStockAlert] = useState(false);

  // Form states
  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'Grains & Pulses',
    brand: '',
    initialQuantity: '',
    unit: 'kg',
    totalCost: '',
    unitPrice: '',
    minThreshold: '5',
    notes: '',
  });

  const [editItemForm, setEditItemForm] = useState({
    name: '',
    category: 'Grains & Pulses',
    brand: '',
    unit: 'kg',
    totalCost: '',
    unitPrice: '',
    minThreshold: '5',
    notes: '',
  });

  const handleItemInitialQtyChange = (val) => {
    const qty = parseFloat(val);
    const cost = parseFloat(itemForm.totalCost);
    const unitP = parseFloat(itemForm.unitPrice);
    let newUnitPrice = itemForm.unitPrice;
    let newTotalCost = itemForm.totalCost;

    if (!isNaN(qty) && qty > 0) {
      if (!isNaN(cost) && cost > 0) {
        newUnitPrice = (cost / qty).toFixed(2);
      } else if (!isNaN(unitP) && unitP > 0) {
        newTotalCost = (qty * unitP).toFixed(2);
      }
    }
    setItemForm((prev) => ({
      ...prev,
      initialQuantity: val,
      unitPrice: newUnitPrice,
      totalCost: newTotalCost,
    }));
  };

  const handleItemTotalCostChange = (val) => {
    const cost = parseFloat(val);
    const qty = parseFloat(itemForm.initialQuantity);
    let newUnitPrice = itemForm.unitPrice;
    if (!isNaN(cost) && !isNaN(qty) && qty > 0) {
      newUnitPrice = (cost / qty).toFixed(2);
    }
    setItemForm((prev) => ({
      ...prev,
      totalCost: val,
      unitPrice: newUnitPrice,
    }));
  };

  const handleItemUnitPriceChange = (val) => {
    const unitP = parseFloat(val);
    const qty = parseFloat(itemForm.initialQuantity);
    let newTotalCost = itemForm.totalCost;
    if (!isNaN(unitP) && !isNaN(qty) && qty > 0) {
      newTotalCost = (qty * unitP).toFixed(2);
    }
    setItemForm((prev) => ({
      ...prev,
      unitPrice: val,
      totalCost: newTotalCost,
    }));
  };

  const handleEditItemTotalCostChange = (val) => {
    const cost = parseFloat(val);
    const qty = parseFloat(selectedItem?.currentQuantity || 0);
    let newUnitPrice = editItemForm.unitPrice;
    if (!isNaN(cost) && qty > 0) {
      newUnitPrice = (cost / qty).toFixed(2);
    }
    setEditItemForm((prev) => ({
      ...prev,
      totalCost: val,
      unitPrice: newUnitPrice,
    }));
  };

  const handleEditItemUnitPriceChange = (val) => {
    const unitP = parseFloat(val);
    const qty = parseFloat(selectedItem?.currentQuantity || 0);
    let newTotalCost = editItemForm.totalCost;
    if (!isNaN(unitP) && qty > 0) {
      newTotalCost = (qty * unitP).toFixed(2);
    }
    setEditItemForm((prev) => ({
      ...prev,
      unitPrice: val,
      totalCost: newTotalCost,
    }));
  };

  const [stockForm, setStockForm] = useState({
    movementType: 'received',
    quantity: '',
    exactResultingQuantity: '',
    reason: '',
  });

  // Load Inventory & Summary
  const loadInventory = async () => {
    setInvLoading(true);
    try {
      const [sumRes, invRes] = await Promise.all([
        api.getInventorySummary(),
        api.getInventory({
          search: invSearch,
          category: invCategory,
          status: invStatus,
          includeArchived,
        }),
      ]);

      if (sumRes.success) setSummary(sumRes.summary);
      if (invRes.success) {
        setInventory(invRes.inventory);

        // As soon as head enters, trigger popup if there are out of stock or critical low items
        if (!hasShownStockAlert) {
          const outList = (invRes.inventory || []).filter(
            (i) => !i.isArchived && Number(i.currentQuantity) <= 0
          );
          const lowList = (invRes.inventory || []).filter(
            (i) => !i.isArchived && Number(i.currentQuantity) > 0 && Number(i.currentQuantity) <= (Number(i.minThreshold) || 5)
          );
          if (outList.length > 0 || lowList.length > 0) {
            setIsStockAlertModalOpen(true);
          }
          setHasShownStockAlert(true);
        }
      }
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setInvLoading(false);
    }
  };

  const outOfStockItems = useMemo(
    () => (inventory || []).filter((i) => !i.isArchived && Number(i.currentQuantity) <= 0),
    [inventory]
  );

  const lowStockItems = useMemo(
    () =>
      (inventory || []).filter(
        (i) => !i.isArchived && Number(i.currentQuantity) > 0 && Number(i.currentQuantity) <= (Number(i.minThreshold) || 5)
      ),
    [inventory]
  );

  const handleQuickRestockFromAlert = (item) => {
    setIsStockAlertModalOpen(false);
    setSelectedItem(item);
    setStockForm({
      movementType: 'received',
      quantity: '',
      exactResultingQuantity: '',
      reason: 'Replenishing out of stock item from alert',
    });
    setIsStockModalOpen(true);
  };

  useEffect(() => {
    loadInventory();
  }, [invSearch, invCategory, invStatus, includeArchived]);

  // Handle Add Item
  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: itemForm.name,
        category: itemForm.category,
        brand: itemForm.category === 'Vegetables' ? '' : (itemForm.brand || '').trim(),
        unit: itemForm.unit,
        minThreshold: Number(itemForm.minThreshold) || 5,
        initialQuantity: Number(itemForm.initialQuantity) || 0,
        unitPrice: Number(itemForm.unitPrice) || 0,
        totalCost: Number(itemForm.totalCost) || 0,
        notes: itemForm.notes,
      };

      const res = await api.createInventoryItem(payload);
      if (res.success) {
        showNotification(t('messages.itemSaved', `Item "${res.item.name}" added to inventory!`));
        setIsAddModalOpen(false);
        setItemForm({
          name: '',
          category: 'Grains & Pulses',
          brand: '',
          initialQuantity: '',
          unit: 'kg',
          totalCost: '',
          unitPrice: '',
          minThreshold: '5',
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
    if (!selectedItem) return;

    try {
      const payload = {
        name: editItemForm.name,
        category: editItemForm.category,
        brand: editItemForm.category === 'Vegetables' ? '' : (editItemForm.brand || '').trim(),
        unit: editItemForm.unit,
        unitPrice: Number(editItemForm.unitPrice) || 0,
        totalCost: Number(editItemForm.totalCost) || 0,
        minThreshold: Number(editItemForm.minThreshold),
        notes: editItemForm.notes,
      };

      const res = await api.updateInventoryItem(selectedItem._id, payload);
      if (res.success) {
        showNotification(t('messages.itemSaved', 'Inventory item details updated successfully.'));
        setIsEditModalOpen(false);
        setSelectedItem(null);
        loadInventory();
      }
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // Handle Stock Update
  const handleUpdateStock = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      const payload = {
        movementType: stockForm.movementType,
        reason: stockForm.reason,
      };

      if (stockForm.movementType === 'correction') {
        payload.exactResultingQuantity = Number(stockForm.exactResultingQuantity);
      } else {
        payload.quantity = Number(stockForm.quantity);
      }

      const res = await api.updateStock(selectedItem._id, payload);
      if (res.success) {
        showNotification(
          t('messages.stockUpdated', `Stock updated: ${res.item.currentQuantity} ${res.item.unit}`)
        );
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
  // 3. DAILY MENU MANAGEMENT STATE & ACTIONS (BILINGUAL)
  // -------------------------------------------------------------------------
  const [menusList, setMenusList] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [isMenuEditorOpen, setIsMenuEditorOpen] = useState(false);

  // Menu Editor Form
  const [menuFormDate, setMenuFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [menuFormTitle, setMenuFormTitle] = useState('Daily Vegetarian Canteen Menu');
  const [menuFormNote, setMenuFormNote] = useState('');
  const [menuFormStatus, setMenuFormStatus] = useState('draft');
  const [menuFormItems, setMenuFormItems] = useState([]);

  // Bilingual New Dish Form inside Menu Builder
  const [editingDishIndex, setEditingDishIndex] = useState(null); // null when adding new dish
  const [feedbackViewDish, setFeedbackViewDish] = useState(null); // Dish to view customer feedbacks

  // Wastage Tracking States
  const [isWastageModalOpen, setIsWastageModalOpen] = useState(false);
  const [wastageDishTarget, setWastageDishTarget] = useState(null); // { dish, itemIndex, menuId, date }
  const [wastageForm, setWastageForm] = useState({
    quantity: '',
    unit: 'kg',
    reason: '',
  });
  const [selectedMenuForWastage, setSelectedMenuForWastage] = useState(null);
  const [isMenuWastageOverviewOpen, setIsMenuWastageOverviewOpen] = useState(false);

  const openMenuWastageOverview = (menu) => {
    setSelectedMenuForWastage(menu);
    setIsMenuWastageOverviewOpen(true);
  };

  const handleOpenWastageModal = (dish, itemIndex, menuId = null, date = null) => {
    setWastageDishTarget({
      dish,
      itemIndex,
      menuId: menuId || editingMenu?._id || null,
      date: date || editingMenu?.date || null,
    });
    setWastageForm({
      quantity: dish.wastage?.quantity !== undefined && dish.wastage?.quantity !== 0 ? String(dish.wastage.quantity) : '',
      unit: dish.wastage?.unit || 'kg',
      reason: dish.wastage?.reason || '',
    });
    setIsWastageModalOpen(true);
  };

  const handleSaveWastage = async (e) => {
    e.preventDefault();
    if (!wastageDishTarget) return;

    const qty = Math.max(0, parseFloat(wastageForm.quantity) || 0);
    const updatedWastage = {
      quantity: qty,
      unit: wastageForm.unit,
      reason: (wastageForm.reason || '').trim(),
      recordedAt: new Date(),
      recordedBy: user?.fullName || user?.username || 'Head of Canteen',
    };

    if (wastageDishTarget.menuId && wastageDishTarget.dish?._id) {
      try {
        const res = await api.recordDishWastage(
          wastageDishTarget.menuId,
          wastageDishTarget.dish._id,
          updatedWastage
        );
        if (res.success) {
          showNotification(t('messages.wastageSaved', 'Food wastage record updated successfully!'));
          await loadAllMenus();
          // Update selectedMenuForWastage if overview is open
          if (selectedMenuForWastage && selectedMenuForWastage._id === wastageDishTarget.menuId) {
            setSelectedMenuForWastage((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                items: prev.items.map((it) =>
                  it._id === wastageDishTarget.dish._id ? { ...it, wastage: updatedWastage } : it
                ),
              };
            });
          }
          // Update in menuFormItems if builder is open
          if (wastageDishTarget.itemIndex !== null && wastageDishTarget.itemIndex !== undefined) {
            setMenuFormItems((prev) => {
              const clone = [...prev];
              if (clone[wastageDishTarget.itemIndex]) {
                clone[wastageDishTarget.itemIndex] = {
                  ...clone[wastageDishTarget.itemIndex],
                  wastage: updatedWastage,
                };
              }
              return clone;
            });
          }
          setIsWastageModalOpen(false);
          setWastageDishTarget(null);
          return;
        }
      } catch (err) {
        showNotification(err.message, true);
        return;
      }
    }

    // In-form update if menu is a brand new draft not yet in DB
    if (wastageDishTarget.itemIndex !== null && wastageDishTarget.itemIndex !== undefined) {
      setMenuFormItems((prev) => {
        const clone = [...prev];
        if (clone[wastageDishTarget.itemIndex]) {
          clone[wastageDishTarget.itemIndex] = {
            ...clone[wastageDishTarget.itemIndex],
            wastage: updatedWastage,
          };
        }
        return clone;
      });
      showNotification(t('messages.wastageSaved', 'Food wastage updated in form.'));
      setIsWastageModalOpen(false);
      setWastageDishTarget(null);
    }
  };

  const [newDish, setNewDish] = useState({
    nameKn: '',
    nameEn: '',
    category: 'Breakfast',
    descriptionKn: '',
    descriptionEn: '',
    imageUrl: '',
    feedback: '',
    isAvailable: true,
  });

  const [translatingName, setTranslatingName] = useState(false);
  const [translatingDesc, setTranslatingDesc] = useState(false);

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
    setEditingDishIndex(null);
    setMenuFormDate(new Date().toISOString().split('T')[0]);
    setMenuFormTitle('Rashtrotthana Parishath - Daily Vegetarian Menu');
    setMenuFormNote('');
    setMenuFormStatus('draft');
    setMenuFormItems([]);
    setNewDish({
      nameKn: '',
      nameEn: '',
      category: 'Breakfast',
      descriptionKn: '',
      descriptionEn: '',
      imageUrl: '',
      feedback: '',
      isAvailable: true,
    });
    setIsMenuEditorOpen(true);
  };

  const openEditMenuModal = (menu) => {
    setEditingMenu(menu);
    setEditingDishIndex(null);
    setMenuFormDate(menu.date);
    setMenuFormTitle(menu.title);
    setMenuFormNote(menu.specialNote || '');
    setMenuFormStatus(menu.status);
    setMenuFormItems(menu.items || []);
    setNewDish({
      nameKn: '',
      nameEn: '',
      category: 'Breakfast',
      descriptionKn: '',
      descriptionEn: '',
      imageUrl: '',
      feedback: '',
      isAvailable: true,
    });
    setIsMenuEditorOpen(true);
  };

  // Suggest English translation for food name and description
  const handleSuggestEnglish = async () => {
    const textToTranslate = newDish.nameKn.trim();
    const descToTranslate = newDish.descriptionKn.trim();

    if (!textToTranslate && !descToTranslate) {
      showNotification('Please enter the Kannada food name first.', true);
      return;
    }

    try {
      if (textToTranslate) {
        setTranslatingName(true);
        const nameRes = await api.translateText(textToTranslate, 'kn', 'en');
        if (nameRes && nameRes.translatedText) {
          setNewDish((prev) => ({ ...prev, nameEn: nameRes.translatedText }));
        }
      }

      if (descToTranslate) {
        setTranslatingDesc(true);
        const descRes = await api.translateText(descToTranslate, 'kn', 'en');
        if (descRes && descRes.translatedText) {
          setNewDish((prev) => ({ ...prev, descriptionEn: descRes.translatedText }));
        }
      }
      showNotification('Suggested English translation added. You can review and edit it.');
    } catch (err) {
      showNotification(t('messages.translationError', 'Translation suggestion service unavailable.'), true);
    } finally {
      setTranslatingName(false);
      setTranslatingDesc(false);
    }
  };

  // Suggest Kannada translation for food name and description
  const handleSuggestKannada = async () => {
    const textToTranslate = newDish.nameEn.trim();
    const descToTranslate = newDish.descriptionEn.trim();

    if (!textToTranslate && !descToTranslate) {
      showNotification('Please enter the English food name first.', true);
      return;
    }

    try {
      if (textToTranslate) {
        setTranslatingName(true);
        const nameRes = await api.translateText(textToTranslate, 'en', 'kn');
        if (nameRes && nameRes.translatedText) {
          setNewDish((prev) => ({ ...prev, nameKn: nameRes.translatedText }));
        }
      }

      if (descToTranslate) {
        setTranslatingDesc(true);
        const descRes = await api.translateText(descToTranslate, 'en', 'kn');
        if (descRes && descRes.translatedText) {
          setNewDish((prev) => ({ ...prev, descriptionKn: descRes.translatedText }));
        }
      }
      showNotification('ಕನ್ನಡ ಅನುವಾದದ ಸಲಹೆಯನ್ನು ಸೇರಿಸಲಾಗಿದೆ. ಪರಿಶೀಲಿಸಿ ಬದಲಾಯಿಸಬಹುದು.');
    } catch (err) {
      showNotification(t('messages.translationError', 'Translation suggestion service unavailable.'), true);
    } finally {
      setTranslatingName(false);
      setTranslatingDesc(false);
    }
  };

  const handleAddDishToMenu = (e) => {
    e.preventDefault();
    const effectiveName = newDish.nameKn.trim() || newDish.nameEn.trim();
    if (!effectiveName) {
      showNotification('Please enter either Kannada or English name for the food item.', true);
      return;
    }

    if (editingDishIndex !== null && editingDishIndex >= 0) {
      // Update existing item in menu
      const updated = [...menuFormItems];
      const existing = updated[editingDishIndex] || {};
      updated[editingDishIndex] = {
        ...existing,
        name: effectiveName,
        nameKn: newDish.nameKn.trim(),
        nameEn: newDish.nameEn.trim(),
        category: newDish.category,
        description: newDish.descriptionKn.trim() || newDish.descriptionEn.trim(),
        descriptionKn: newDish.descriptionKn.trim(),
        descriptionEn: newDish.descriptionEn.trim(),
        imageUrl: newDish.imageUrl.trim(),
        feedback: (newDish.feedback || '').trim(),
        isAvailable: newDish.isAvailable !== false,
        isVegetarian: true,
      };
      setMenuFormItems(updated);
      setEditingDishIndex(null);
      showNotification('Dish details updated in menu.');
    } else {
      // Add new item to menu
      const dishToAdd = {
        name: effectiveName,
        nameKn: newDish.nameKn.trim(),
        nameEn: newDish.nameEn.trim(),
        category: newDish.category,
        description: newDish.descriptionKn.trim() || newDish.descriptionEn.trim(),
        descriptionKn: newDish.descriptionKn.trim(),
        descriptionEn: newDish.descriptionEn.trim(),
        imageUrl: newDish.imageUrl.trim(),
        feedback: (newDish.feedback || '').trim(),
        isAvailable: newDish.isAvailable !== false,
        isVegetarian: true, // Strictly pure vegetarian
        displayOrder: menuFormItems.length + 1,
      };
      setMenuFormItems([...menuFormItems, dishToAdd]);
      showNotification('Dish added to menu.');
    }

    // Reset form
    setNewDish({
      nameKn: '',
      nameEn: '',
      category: newDish.category,
      descriptionKn: '',
      descriptionEn: '',
      imageUrl: '',
      feedback: '',
      isAvailable: true,
    });
  };

  const handleEditDishInForm = (idx) => {
    const item = menuFormItems[idx];
    if (!item) return;

    setEditingDishIndex(idx);
    setNewDish({
      nameKn: item.nameKn || item.name || '',
      nameEn: item.nameEn || item.name || '',
      category: item.category || 'Breakfast',
      descriptionKn: item.descriptionKn || item.description || '',
      descriptionEn: item.descriptionEn || item.description || '',
      imageUrl: item.imageUrl || '',
      feedback: item.feedback || '',
      isAvailable: item.isAvailable !== false,
    });

    // Scroll up to subform if needed
    const subformEl = document.querySelector('.dish-subform-box');
    if (subformEl) {
      subformEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleCancelDishEdit = () => {
    setEditingDishIndex(null);
    setNewDish({
      nameKn: '',
      nameEn: '',
      category: 'Breakfast',
      descriptionKn: '',
      descriptionEn: '',
      imageUrl: '',
      feedback: '',
      isAvailable: true,
    });
  };

  const handleRemoveDishFromMenu = (idx) => {
    const updated = [...menuFormItems];
    updated.splice(idx, 1);
    setMenuFormItems(updated);
    if (editingDishIndex === idx) {
      handleCancelDishEdit();
    } else if (editingDishIndex !== null && editingDishIndex > idx) {
      setEditingDishIndex(editingDishIndex - 1);
    }
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
          showNotification(t('messages.menuUpdated', `Menu for ${menuFormDate} updated!`));
          setIsMenuEditorOpen(false);
          loadAllMenus();
        }
      } else {
        const res = await api.createMenu(payload);
        if (res.success) {
          showNotification(t('messages.menuCreated', `New menu for ${menuFormDate} created!`));
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
        showNotification(
          newStatus === 'published'
            ? t('messages.menuPublished', 'Menu is now published.')
            : t('messages.menuUnpublished', 'Menu saved as draft.')
        );
        loadAllMenus();
      }
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // -------------------------------------------------------------------------
  // 3B. RECIPES & FOOD PREPARATION AUTO-DEDUCTION STATE & ACTIONS
  // -------------------------------------------------------------------------
  const [recipesList, setRecipesList] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [allInventoryOptions, setAllInventoryOptions] = useState([]);
  const [ingredientFilter, setIngredientFilter] = useState('');
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [recipeForm, setRecipeForm] = useState({
    dishName: '',
    dishNameKn: '',
    category: 'Breakfast',
    basePortion: 50,
    description: '',
    ingredients: [{ inventoryItem: '', quantity: '', unit: 'kg' }],
  });
  const [translatingRecipeKn, setTranslatingRecipeKn] = useState(false);
  const [translatingRecipeEn, setTranslatingRecipeEn] = useState(false);

  // Search/filter inventory options by name, brand, or category
  const filteredInventoryOptions = useMemo(() => {
    if (!ingredientFilter.trim()) return allInventoryOptions;
    const term = ingredientFilter.toLowerCase();
    return allInventoryOptions.filter(
      (it) =>
        (it.name && it.name.toLowerCase().includes(term)) ||
        (it.brand && it.brand.toLowerCase().includes(term)) ||
        (it.category && it.category.toLowerCase().includes(term))
    );
  }, [allInventoryOptions, ingredientFilter]);

  // Quick 1-click add from search result
  const handleQuickAddIngredient = (item) => {
    if (!item) return;
    const emptyIdx = recipeForm.ingredients.findIndex((ing) => !ing.inventoryItem);
    if (emptyIdx !== -1) {
      const updated = [...recipeForm.ingredients];
      updated[emptyIdx] = {
        ...updated[emptyIdx],
        inventoryItem: item._id,
        unit: item.unit || 'kg',
      };
      setRecipeForm({ ...recipeForm, ingredients: updated });
    } else {
      setRecipeForm({
        ...recipeForm,
        ingredients: [
          ...recipeForm.ingredients,
          { inventoryItem: item._id, quantity: '', unit: item.unit || 'kg' },
        ],
      });
    }
    showNotification(`Added "${item.name}" to recipe formula!`);
  };

  // Auto-translate / auto-suggest English from Kannada in Recipe modal
  const handleSuggestRecipeEnglish = async () => {
    const textToTranslate = (recipeForm.dishNameKn || '').trim();
    if (!textToTranslate) {
      showNotification('Please enter the Kannada dish name first.', true);
      return;
    }
    try {
      setTranslatingRecipeEn(true);
      const res = await api.translateText(textToTranslate, 'kn', 'en');
      if (res && res.translatedText) {
        setRecipeForm((prev) => ({ ...prev, dishName: res.translatedText }));
        showNotification('English dish name generated!');
      }
    } catch {
      showNotification('Translation suggestion service unavailable.', true);
    } finally {
      setTranslatingRecipeEn(false);
    }
  };

  // Auto-translate / auto-suggest Kannada from English in Recipe modal
  const handleSuggestRecipeKannada = async () => {
    const textToTranslate = (recipeForm.dishName || '').trim();
    if (!textToTranslate) {
      showNotification('Please enter the English dish name first.', true);
      return;
    }
    try {
      setTranslatingRecipeKn(true);
      const res = await api.translateText(textToTranslate, 'en', 'kn');
      if (res && res.translatedText) {
        setRecipeForm((prev) => ({ ...prev, dishNameKn: res.translatedText }));
        showNotification(currentLang === 'kn' ? 'ಕನ್ನಡ ಹೆಸರು ಸೇರಿಸಲಾಗಿದೆ!' : 'Kannada name generated!');
      }
    } catch {
      showNotification('Translation suggestion service unavailable.', true);
    } finally {
      setTranslatingRecipeKn(false);
    }
  };

  // Food Preparation Modal State
  const [isPrepareModalOpen, setIsPrepareModalOpen] = useState(false);
  const [preparingRecipe, setPreparingRecipe] = useState(null);
  const [preparePeopleCount, setPreparePeopleCount] = useState(50);
  const [prepareNotes, setPrepareNotes] = useState('');
  const [isExecutingPrepare, setIsExecutingPrepare] = useState(false);

  const loadAllInventoryOptions = async () => {
    try {
      const res = await api.getInventory({ limit: 500, includeArchived: false });
      if (res && res.success) {
        setAllInventoryOptions(res.inventory || res.items || []);
      } else if (Array.isArray(inventory) && inventory.length > 0) {
        setAllInventoryOptions(inventory);
      }
    } catch {
      if (Array.isArray(inventory) && inventory.length > 0) {
        setAllInventoryOptions(inventory);
      }
    }
  };

  const loadRecipes = async () => {
    setRecipesLoading(true);
    try {
      const res = await api.getRecipes();
      if (res.success) {
        setRecipesList(res.recipes || []);
      }
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setRecipesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'recipes') {
      loadRecipes();
      loadAllInventoryOptions();
    }
  }, [activeTab]);

  const openNewRecipeModal = () => {
    loadAllInventoryOptions();
    setIngredientFilter('');
    setEditingRecipe(null);
    setRecipeForm({
      dishName: '',
      dishNameKn: '',
      category: 'Breakfast',
      basePortion: 50,
      description: '',
      ingredients: [{ inventoryItem: '', quantity: '', unit: 'kg' }],
    });
    setIsRecipeModalOpen(true);
  };

  const openEditRecipeModal = (recipe) => {
    loadAllInventoryOptions();
    setIngredientFilter('');
    setEditingRecipe(recipe);
    setRecipeForm({
      dishName: recipe.dishName || '',
      dishNameKn: recipe.dishNameKn || '',
      category: recipe.category || 'Breakfast',
      basePortion: recipe.basePortion || 50,
      description: recipe.description || '',
      ingredients: (recipe.ingredients || []).map((ing) => ({
        inventoryItem: ing.inventoryItem?._id || ing.inventoryItem || '',
        quantity: ing.quantity,
        unit: ing.unit || ing.inventoryItem?.unit || 'kg',
      })),
    });
    setIsRecipeModalOpen(true);
  };

  const handleAddIngredientRow = () => {
    setRecipeForm({
      ...recipeForm,
      ingredients: [
        ...recipeForm.ingredients,
        { inventoryItem: '', quantity: '', unit: 'kg' },
      ],
    });
  };

  const handleRemoveIngredientRow = (idx) => {
    const updated = recipeForm.ingredients.filter((_, i) => i !== idx);
    setRecipeForm({
      ...recipeForm,
      ingredients: updated.length > 0 ? updated : [{ inventoryItem: '', quantity: '', unit: 'kg' }],
    });
  };

  const handleIngredientChange = (idx, field, value) => {
    const updated = [...recipeForm.ingredients];
    if (field === 'inventoryItem') {
      const selectedItem = allInventoryOptions.find((it) => String(it._id) === String(value));
      updated[idx] = {
        ...updated[idx],
        inventoryItem: value,
        unit: selectedItem ? selectedItem.unit : updated[idx].unit,
      };
    } else {
      updated[idx] = {
        ...updated[idx],
        [field]: value,
      };
    }
    setRecipeForm({ ...recipeForm, ingredients: updated });
  };

  const handleSaveRecipe = async (e) => {
    e.preventDefault();
    if (!recipeForm.dishName.trim()) {
      showNotification('Dish name is required', true);
      return;
    }
    const portion = Number(recipeForm.basePortion);
    if (!portion || portion < 1) {
      showNotification('Base portion must be at least 1 person', true);
      return;
    }

    const validIngredients = recipeForm.ingredients.filter(
      (ing) => ing.inventoryItem && Number(ing.quantity) > 0
    );
    if (validIngredients.length === 0) {
      showNotification('Please add at least one ingredient with a valid quantity', true);
      return;
    }

    const payload = {
      ...recipeForm,
      basePortion: portion,
      ingredients: validIngredients.map((ing) => ({
        inventoryItem: ing.inventoryItem,
        quantity: Number(ing.quantity),
        unit: ing.unit,
      })),
    };

    try {
      if (editingRecipe) {
        const res = await api.updateRecipe(editingRecipe._id, payload);
        if (res.success) {
          showNotification(`Recipe for "${payload.dishName}" updated!`);
          setIsRecipeModalOpen(false);
          loadRecipes();
        }
      } else {
        const res = await api.createRecipe(payload);
        if (res.success) {
          showNotification(`Recipe for "${payload.dishName}" created!`);
          setIsRecipeModalOpen(false);
          loadRecipes();
        }
      }
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleDeleteRecipe = async (recipe) => {
    if (!window.confirm(`Are you sure you want to delete the recipe formula for "${recipe.dishName}"?`)) return;
    try {
      const res = await api.deleteRecipe(recipe._id);
      if (res.success) {
        showNotification(res.message);
        loadRecipes();
      }
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const openPrepareModal = (recipe) => {
    loadAllInventoryOptions();
    setPreparingRecipe(recipe);
    setPreparePeopleCount(recipe.basePortion || 50);
    setPrepareNotes('');
    setIsPrepareModalOpen(true);
  };

  const handleExecutePreparation = async (e) => {
    e.preventDefault();
    if (!preparingRecipe) return;
    const people = Number(preparePeopleCount);
    if (!people || people < 1) {
      showNotification('Please enter a valid number of people (at least 1)', true);
      return;
    }

    setIsExecutingPrepare(true);
    try {
      const res = await api.prepareRecipe(preparingRecipe._id, {
        targetPeople: people,
        notes: prepareNotes.trim(),
      });
      if (res.success) {
        showNotification(`✓ ${res.message}`);
        setIsPrepareModalOpen(false);
        setPreparingRecipe(null);
        // Live refresh recipes, inventory, movements and summary!
        loadRecipes();
        loadInventory();
        loadSummary();
        loadMovements();
      }
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setIsExecutingPrepare(false);
    }
  };

  // -------------------------------------------------------------------------
  // 3B. BRANCH FOOD INDENTS & ORDERS STATE & ACTIONS
  // -------------------------------------------------------------------------
  const [branchOrdersData, setBranchOrdersData] = useState({
    recurringOrders: [],
    specialOrders: [],
    todaySummary: {},
  });
  const [branchOrdersLoading, setBranchOrdersLoading] = useState(false);
  const [dailyDeductSession, setDailyDeductSession] = useState('Lunch');
  const [isExecutingDailyBranchDeduct, setIsExecutingDailyBranchDeduct] = useState(false);
  const [eventFilterStatus, setEventFilterStatus] = useState('all');

  const loadBranchOrders = async () => {
    setBranchOrdersLoading(true);
    try {
      const res = await api.getAllBranchOrders();
      if (res.success) {
        setBranchOrdersData({
          recurringOrders: res.recurringOrders || [],
          specialOrders: res.specialOrders || [],
          todaySummary: res.todaySummary || {},
        });
      }
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setBranchOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'branches') {
      loadBranchOrders();
    }
  }, [activeTab]);

  const handleExecuteBranchDailyDeduct = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (
      !window.confirm(
        `Are you sure you want to approve and auto-deduct inventory stock for all active branches for today's ${dailyDeductSession} (${todayStr})?`
      )
    ) {
      return;
    }
    setIsExecutingDailyBranchDeduct(true);
    try {
      const res = await api.executeBranchDailyDeduct({
        date: todayStr,
        mealSession: dailyDeductSession,
      });
      if (res.success) {
        showNotification(res.message);
        loadBranchOrders();
        loadInventory();
        loadMovements();
      }
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setIsExecutingDailyBranchDeduct(false);
    }
  };

  const handleApproveSpecialEvent = async (order) => {
    if (
      !window.confirm(
        `Approve special event order "${order.specialEvent.eventName}" and auto-deduct stock for ${order.specialEvent.peopleCount} people?`
      )
    ) {
      return;
    }
    try {
      const res = await api.approveAndDeductBranchSpecialEvent(order._id);
      if (res.success) {
        showNotification(res.message);
        loadBranchOrders();
        loadInventory();
        loadMovements();
      }
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleRejectSpecialEvent = async (order) => {
    const reason = window.prompt(
      `Enter reason for rejecting "${order.specialEvent.eventName}":`,
      'Canteen capacity full / Stock unavailable'
    );
    if (reason === null) return;
    try {
      const res = await api.rejectBranchSpecialEvent(order._id, reason);
      if (res.success) {
        showNotification(res.message);
        loadBranchOrders();
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h2>{t('head.portalTitle', 'Head of Canteen Management Portal')}</h2>
              {(outOfStockItems.length > 0 || lowStockItems.length > 0) && (
                <button
                  type="button"
                  onClick={() => setIsStockAlertModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: outOfStockItems.length > 0 ? '#fee2e2' : '#fef3c7',
                    color: outOfStockItems.length > 0 ? '#dc2626' : '#b45309',
                    border: `1px solid ${outOfStockItems.length > 0 ? '#fca5a5' : '#fde68a'}`,
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                  title={currentLang === 'kn' ? 'ದಾಸ್ತಾನು ಎಚ್ಚರಿಕೆ ಪಾಪ್ಅಪ್ ವೀಕ್ಷಿಸಿ' : 'View Stock Depletion Alert'}
                >
                  <AlertTriangle size={14} />
                  <span>
                    {outOfStockItems.length > 0
                      ? (currentLang === 'kn'
                          ? `🚨 ${outOfStockItems.length} ಸಾಮಗ್ರಿಗಳು ಖಾಲಿ! (ಎಚ್ಚರಿಕೆ ವೀಕ್ಷಿಸಿ)`
                          : `🚨 ${outOfStockItems.length} Out of Stock! (View Alert)`)
                      : (currentLang === 'kn'
                          ? `⚡ ${lowStockItems.length} ಕಡಿಮೆ ದಾಸ್ತಾನು (ಎಚ್ಚರಿಕೆ ವೀಕ್ಷಿಸಿ)`
                          : `⚡ ${lowStockItems.length} Low Stock (View Alert)`)}
                  </span>
                </button>
              )}
            </div>
            <p>
              {user?.fullName?.replace(/\s*\(Head of Canteen\)/i, '') || user?.username} ({t('head.headTag', 'Head of Canteen (Administrator)')}) • {t('head.institution', 'Rashtrotthana Parishath')}
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="dashboard-tabs">
            <button
              type="button"
              className={`dashboard-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => setActiveTab('inventory')}
            >
              <Package size={16} /> {t('head.tabInventory', 'Inventory Management')}
            </button>
            <button
              type="button"
              className={`dashboard-tab-btn ${activeTab === 'movements' ? 'active' : ''}`}
              onClick={() => setActiveTab('movements')}
            >
              <History size={16} /> {t('head.tabMovements', 'Stock Movements')}
            </button>
            <button
              type="button"
              className={`dashboard-tab-btn ${activeTab === 'recipes' ? 'active' : ''}`}
              onClick={() => setActiveTab('recipes')}
            >
              <CookingPot size={16} /> {t('head.tabRecipes', 'Food Prep & Recipes')}
            </button>
            <button
              type="button"
              className={`dashboard-tab-btn ${activeTab === 'branches' ? 'active' : ''}`}
              onClick={() => setActiveTab('branches')}
            >
              <Building2 size={16} /> {t('head.tabBranches', 'Branch Indents & Orders')}
            </button>
            <button
              type="button"
              className={`dashboard-tab-btn ${activeTab === 'menus' ? 'active' : ''}`}
              onClick={() => setActiveTab('menus')}
            >
              <Calendar size={16} /> {currentLang === 'kn' ? 'ದೈನಂದಿನ ಮೆನು' : 'Daily Menus'}
            </button>
            <button
              type="button"
              className={`dashboard-tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
              onClick={() => setActiveTab('staff')}
            >
              <Users size={16} /> {t('head.tabStaff', 'Staff Accounts')}
            </button>
            <button
              type="button"
              className={`dashboard-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
              onClick={() => setActiveTab('audit')}
            >
              <ShieldAlert size={16} /> {t('head.tabAudit', 'Audit Trail')}
            </button>
            <button
              type="button"
              className={`dashboard-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <BarChart2 size={16} /> {currentLang === 'kn' ? 'ವರದಿಗಳು ಮತ್ತು ಅಂಕಿಅಂಶಗಳು' : 'Reports & Analytics'}
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
                  <span className="stat-label">{t('head.totalInventory', 'Total Inventory Items')}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon amber"><AlertTriangle size={24} /></div>
                <div className="stat-info">
                  <span className="stat-val" style={{ color: '#b45309' }}>{summary.lowStockCount}</span>
                  <span className="stat-label">{t('head.lowStockWarning', 'Low Stock Items')}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon red"><XCircle size={24} /></div>
                <div className="stat-info">
                  <span className="stat-val" style={{ color: '#dc2626' }}>{summary.outOfStockCount}</span>
                  <span className="stat-label">{t('head.outOfStockAlert', 'Out of Stock')}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green"><History size={24} /></div>
                <div className="stat-info">
                  <span className="stat-val">{summary.recentMovements24h}</span>
                  <span className="stat-label">{t('head.movements24h', 'Movements (24h)')}</span>
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
                  <Plus size={16} /> {t('head.addInventoryBtn', 'Add Inventory Item')}
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
                    placeholder={t('head.filterSearch', 'Search items...')}
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
                  <option value="All">{t('inventoryCategories.All', 'All')}</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{t(`inventoryCategories.${c}`, c)}</option>
                  ))}
                </select>

                {/* Status */}
                <select
                  className="form-select"
                  style={{ width: 'auto', height: '36px', fontSize: '0.85rem' }}
                  value={invStatus}
                  onChange={(e) => setInvStatus(e.target.value)}
                >
                  <option value="all">{t('worker.allStockStatus', 'All Levels')}</option>
                  <option value="low_stock">{t('worker.lowStock', 'Low Stock Only')}</option>
                  <option value="out_of_stock">{t('worker.outOfStock', 'Out of Stock Only')}</option>
                  <option value="in_stock">{t('worker.inStock', 'Healthy Stock')}</option>
                </select>
              </div>

              {/* Include Archived toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', color: '#64748b' }}>
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(e) => setIncludeArchived(e.target.checked)}
                />
                {t('head.includeArchived', 'Show Archived Items')}
              </label>
            </div>

            {/* Inventory Table with Head-only Controls */}
            <div className="table-container">
              {invLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#64748b' }}>Loading...</p>
                </div>
              ) : inventory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#64748b' }}>No inventory items found.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('head.colItem', 'Ingredient Name')}</th>
                      <th>{t('head.colCategory', 'Category')}</th>
                      <th>{t('head.colBrand', 'Brand')}</th>
                      <th style={{ textAlign: 'right' }}>{t('head.colStock', 'Current Stock')}</th>
                      <th>{t('head.unit', 'Unit')}</th>
                      <th style={{ textAlign: 'right' }}>{t('head.colUnitPrice', 'Price / Unit')}</th>
                      <th style={{ textAlign: 'right' }}>{t('head.colTotalValue', 'Total Value')}</th>
                      <th style={{ textAlign: 'right' }}>{t('head.colMinThreshold', 'Min Threshold')}</th>
                      <th>{t('head.colStatus', 'Status')}</th>
                      <th style={{ textAlign: 'center' }}>{t('head.colActions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => (
                      <tr key={item._id} style={{ opacity: item.isArchived ? 0.6 : 1 }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>
                              {getLocalizedText(item.name, currentLang === 'kn', ITEM_NAME_TRANSLATIONS)}
                            </strong>
                            {item.isArchived && (
                              <span style={{ fontSize: '0.65rem', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', padding: '2px 5px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                ARCHIVED
                              </span>
                            )}
                          </div>
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
                        <td style={{ color: 'var(--text-secondary)' }}>{t(`units.${item.unit}`, item.unit)}</td>
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
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
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
                              title="Update stock (Add, consume, discard, or correct)"
                            >
                              {t('head.updateStock', 'Update Stock')}
                            </button>

                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.3rem 0.5rem' }}
                              onClick={() => {
                                setSelectedItem(item);
                                setEditItemForm({
                                  name: item.name,
                                  category: item.category,
                                  brand: item.category === 'Vegetables' ? '' : (item.brand || ''),
                                  unit: item.unit,
                                  unitPrice: item.unitPrice !== undefined ? String(item.unitPrice) : '',
                                  totalCost: item.totalCost !== undefined ? String(item.totalCost) : '',
                                  minThreshold: String(item.minThreshold),
                                  notes: item.notes || '',
                                });
                                setIsEditModalOpen(true);
                              }}
                              title="Edit item properties"
                            >
                              <Edit2 size={13} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.3rem 0.5rem', color: item.isArchived ? '#15803d' : '#64748b' }}
                              onClick={() => handleArchiveToggle(item)}
                              title={item.isArchived ? t('head.restoreItem', 'Restore Item') : t('head.archiveItem', 'Archive Item')}
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
                <h3>{t('head.tabMovements', 'Stock Movement History')}</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {t('worker.readOnlyNotice', 'Immutable audit records of all stock additions, deductions, and corrections.')}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Filter:</span>
                <select
                  className="form-select"
                  style={{ width: 'auto', height: '36px', fontSize: '0.85rem' }}
                  value={movFilter}
                  onChange={(e) => setMovFilter(e.target.value)}
                >
                  <option value="all">{t('worker.filterAllMovements', 'All Movements')}</option>
                  <option value="received">{t('worker.received', 'Stock Received')}</option>
                  <option value="consumed">{t('worker.consumed', 'Stock Consumed')}</option>
                  <option value="discarded">{t('worker.discarded', 'Discarded / Expired')}</option>
                  <option value="correction">{t('worker.correction', 'Stock Correction')}</option>
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
                  <p style={{ color: '#64748b' }}>Loading...</p>
                </div>
              ) : movements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#64748b' }}>No movements recorded matching filter.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: '125px' }}>{t('worker.colDate', 'Timestamp')}</th>
                      <th style={{ minWidth: '140px' }}>{t('head.colItem', 'Item Name')}</th>
                      <th>{t('worker.colMovementType', 'Type')}</th>
                      <th style={{ textAlign: 'right' }}>Previous</th>
                      <th style={{ textAlign: 'right' }}>{t('worker.colChange', 'Change')}</th>
                      <th style={{ textAlign: 'right' }}>{t('worker.colResulting', 'Resulting')}</th>
                      <th style={{ minWidth: '120px' }}>{t('worker.colLoggedBy', 'Responsible')}</th>
                      <th style={{ minWidth: '150px' }}>{t('worker.colReason', 'Reason')}</th>
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
                          {m.changeQuantity > 0 ? `+${m.changeQuantity}` : m.changeQuantity} {t(`units.${m.unit}`, m.unit)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--text-main)' }}>
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

        {/* =========================================================================
            TAB 2B: RECIPES & FOOD PREPARATION AUTO-DEDUCTION
            ========================================================================= */}
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
                  {currentLang === 'kn' ? 'ಅಡುಗೆ ತಯಾರಿಕೆ ಮತ್ತು ಪಾಕವಿಧಾನಗಳು' : 'Food Preparation & Recipes'}
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
                  {t(
                    'head.recipesSubtitle',
                    'Configure standard ingredient formulas for dishes. When cooking, click "Prepare Food" to enter the number of people, and the required ingredients will be automatically deducted from your inventory.'
                  )}
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={openNewRecipeModal}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> {t('head.newRecipeBtn', 'New Recipe Formula')}
              </button>
            </div>

            {/* Recipes Grid */}
            {recipesLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: '#64748b' }}>Loading recipes...</p>
              </div>
            ) : recipesList.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem',
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px dashed #cbd5e1',
                }}
              >
                <CookingPot size={40} style={{ color: '#cbd5e1', marginBottom: '0.75rem' }} />
                <h4 style={{ color: '#475569', marginBottom: '0.5rem' }}>No recipes configured yet</h4>
                <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '1rem' }}>
                  Configure recipe formulas for your dishes to enable 1-click automatic stock deductions when food is cooked.
                </p>
                <button type="button" className="btn btn-primary btn-sm" onClick={openNewRecipeModal}>
                  <Plus size={16} /> Create First Recipe
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                  gap: '1.25rem',
                }}
              >
                {recipesList.map((recipe) => (
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
                    {/* Card Header */}
                    <div
                      style={{
                        padding: '1rem 1.25rem',
                        background: '#fafafa',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
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
                              background: '#e0f2fe',
                              color: '#0369a1',
                              fontWeight: '600',
                            }}
                          >
                            👥 Formula for {recipe.basePortion} People
                          </span>
                        </div>
                        <h4 style={{ margin: '0 0 2px 0', fontSize: '1.05rem', color: '#1e293b' }}>
                          {currentLang === 'kn' ? (recipe.dishNameKn || recipe.dishName) : (recipe.dishName || recipe.dishNameKn)}
                        </h4>
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px' }}
                          onClick={() => openEditRecipeModal(recipe)}
                          title="Edit Recipe"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', color: '#ef4444' }}
                          onClick={() => handleDeleteRecipe(recipe)}
                          title="Delete Recipe"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Card Body: Ingredients Table */}
                    <div style={{ padding: '1rem 1.25rem', flex: 1 }}>
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: '#64748b',
                          fontWeight: '600',
                          marginBottom: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        Ingredients (For {recipe.basePortion} People):
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {recipe.ingredients.map((ing, idx) => {
                          const curStock = ing.inventoryItem?.currentQuantity ?? 0;
                          const isLow = curStock < ing.quantity;

                          return (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.85rem',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                background: isLow ? '#fff1f2' : '#f8fafc',
                                border: isLow ? '1px solid #fecdd3' : '1px solid #f1f5f9',
                              }}
                            >
                              <span style={{ fontWeight: '500', color: '#334155' }}>
                                {ing.itemNameSnapshot}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <strong style={{ color: '#0f172a' }}>
                                  {ing.quantity} {ing.unit}
                                </strong>
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    background: isLow ? '#fee2e2' : '#dcfce7',
                                    color: isLow ? '#b91c1c' : '#15803d',
                                    fontWeight: '600',
                                  }}
                                >
                                  Stock: {curStock} {ing.unit}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Card Footer: Prepare Action Button */}
                    <div
                      style={{
                        padding: '0.75rem 1.25rem',
                        background: '#fafafa',
                        borderTop: '1px solid #e2e8f0',
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{
                          width: '100%',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: '8px',
                          background: '#16a34a',
                          borderColor: '#15803d',
                          fontWeight: '600',
                        }}
                        onClick={() => openPrepareModal(recipe)}
                      >
                        <CookingPot size={16} /> Prepare Food & Deduct Stock
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2C: BRANCH FOOD INDENTS & ORDERS (ಶಾಖಾ ಬೇಡಿಕೆಗಳು)
            ========================================================================= */}
        {activeTab === 'branches' && (
          <div>
            {/* Header Banner */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: '#e0f2fe',
                    color: '#0369a1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Building2 size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                    {currentLang === 'kn' ? 'ಶಾಖಾ ಊಟದ ಬೇಡಿಕೆಗಳು ಮತ್ತು ಸಮಾರಂಭದ ಆದೇಶಗಳು' : 'Branch Food Indents & Function Orders'}
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                    {currentLang === 'kn'
                      ? 'ಪ್ರಧಾನ ಕಚೇರಿ, ಮುದ್ರಣಾಲಯ, ರಕ್ತನಿಧಿ, ಸಂರಕ್ಷಾ ಮತ್ತು ಅಷ್ಟಾಂಗ ಯೋಗ ಶಾಖೆಗಳ ಕೇಂದ್ರೀಕೃತ ಊಟದ ಬೇಡಿಕೆಗಳು ಹಾಗೂ ಸ್ವಯಂಚಾಲಿತ ದಾಸ್ತಾನು ಕಡಿತ.'
                      : 'Central food requirements from Head Office, Mudranalaya, Blood Bank, Samraksha & Ashtanga Yoga with automated stock deduction.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={loadBranchOrders}
                disabled={branchOrdersLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} className={branchOrdersLoading ? 'spin' : ''} />
                <span>Refresh Orders</span>
              </button>
            </div>

            {/* Consolidated Today's Requirements KPI Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
                <div style={{ color: '#b45309', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                  🌅 Today's Breakfast Total
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b' }}>
                  {branchOrdersData.todaySummary?.breakfastTotal || 0} <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#64748b' }}>people</span>
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
                <div style={{ color: '#15803d', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                  🍛 Today's Lunch Total
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b' }}>
                  {branchOrdersData.todaySummary?.lunchTotal || 0} <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#64748b' }}>people</span>
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
                <div style={{ color: '#7c3aed', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                  ☕ Today's Evening Snacks
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b' }}>
                  {branchOrdersData.todaySummary?.snacksTotal || 0} <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#64748b' }}>people</span>
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
                <div style={{ color: '#0369a1', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                  🏢 Active Branch Units
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b' }}>
                  {branchOrdersData.todaySummary?.activeBranchesCount || 0} / 4 <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#64748b' }}>units</span>
                </div>
              </div>
            </div>

            {/* 1-Click Action Card: Auto-Deduct Today's Stock for Branches */}
            <div
              style={{
                background: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: '14px',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} color="#15803d" />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#166534' }}>
                    1-Click Auto-Deduct Stock for Today's Branch Food Requirements
                  </h3>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#15803d' }}>
                  Automatically maps today's published menu dishes to recipe formulas and deducts proportional ingredient stock for all active branches.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <select
                  className="form-select"
                  style={{ width: 'auto', fontSize: '0.85rem', height: '38px', background: '#ffffff' }}
                  value={dailyDeductSession}
                  onChange={(e) => setDailyDeductSession(e.target.value)}
                >
                  <option value="Breakfast">{currentLang === 'kn' ? 'ಉಪಾಹಾರ (ತಿಂಡಿ)' : 'Breakfast'}</option>
                  <option value="Lunch">{currentLang === 'kn' ? 'ಮಧ್ಯಾಹ್ನದ ಊಟ' : 'Lunch'}</option>
                  <option value="Evening Snacks">{currentLang === 'kn' ? 'ಸಂಜೆ ತಿಂಡಿ' : 'Evening Snacks'}</option>
                  <option value="Dinner">{currentLang === 'kn' ? 'ರಾತ್ರಿ ಊಟ' : 'Dinner'}</option>
                </select>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleExecuteBranchDailyDeduct}
                  disabled={isExecutingDailyBranchDeduct}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '38px' }}
                >
                  <CheckCircle2 size={16} />
                  <span>
                    {isExecutingDailyBranchDeduct
                      ? currentLang === 'kn'
                        ? 'ದಾಸ್ತಾನು ಕಡಿತಗೊಳಿಸಲಾಗುತ್ತಿದೆ...'
                        : 'Deducting Stock...'
                      : currentLang === 'kn'
                      ? `ಅನುಮೋದಿಸಿ ಮತ್ತು ${{
                          breakfast: 'ಉಪಾಹಾರದ',
                          lunch: 'ಮಧ್ಯಾಹ್ನದ ಊಟದ',
                          snacks: 'ಸಂಜೆ ತಿಂಡಿಯ',
                          dinner: 'ರಾತ್ರಿ ಊಟದ',
                        }[dailyDeductSession] || dailyDeductSession} ದಾಸ್ತಾನು ಕಡಿತಗೊಳಿಸಿ`
                      : `Approve & Deduct ${dailyDeductSession} Stock`}
                  </span>
                </button>
              </div>
            </div>

            {/* Table 1: Standing Daily Headcounts for All 4 Branches */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>
                  {currentLang === 'kn' ? 'ಶಾಖೆಗಳ ದೈನಂದಿನ ಖಾಯಂ ಊಟದ ಬೇಡಿಕೆ' : 'Branch Standing Daily Meal Headcounts'}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {currentLang === 'kn'
                    ? 'ಶಾಖೆಗಳು ತಮ್ಮ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಇದನ್ನು ಯಾವಾಗ ಬೇಕಾದರೂ ನವೀಕರಿಸಬಹುದು'
                    : 'Branches can update these anytime in their branch portal'}
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>{currentLang === 'kn' ? 'ಶಾಖೆ' : 'Branch Unit'}</th>
                      <th>{currentLang === 'kn' ? 'ಸ್ಥಿತಿ' : 'Status'}</th>
                      <th>{currentLang === 'kn' ? 'ಉಪಾಹಾರ' : 'Breakfast'}</th>
                      <th>{currentLang === 'kn' ? 'ಮಧ್ಯಾಹ್ನದ ಊಟ' : 'Lunch'}</th>
                      <th>{currentLang === 'kn' ? 'ಸಂಜೆ ತಿಂಡಿ' : 'Snacks'}</th>
                      <th>{currentLang === 'kn' ? 'ರಾತ್ರಿ ಊಟ' : 'Dinner'}</th>
                      <th>{currentLang === 'kn' ? 'ವಿಶೇಷ ವಿತರಣಾ ಟಿಪ್ಪಣಿ' : 'Special Delivery Notes'}</th>
                      <th>{currentLang === 'kn' ? 'ಇಂದಿನ ಕಡಿತಗಳು' : "Today's Deductions"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(branchOrdersData.recurringOrders || []).map((order) => {
                      const dr = order.dailyRecurring || {};
                      const todayStr = new Date().toISOString().split('T')[0];
                      const todayDeductions = (dr.deductionsHistory || []).filter((h) => h.date === todayStr);

                      return (
                        <tr key={order._id}>
                          <td>
                            <div style={{ fontWeight: '700', color: '#1e293b' }}>
                              {currentLang === 'kn' && order.branchNameKn ? order.branchNameKn : order.branchNameEn}
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                background: dr.isActive ? '#dcfce7' : '#fee2e2',
                                color: dr.isActive ? '#15803d' : '#dc2626',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontWeight: '700',
                                fontSize: '0.75rem',
                              }}
                            >
                              {dr.isActive
                                ? (currentLang === 'kn' ? 'ಸಕ್ರಿಯ' : 'Active')
                                : (currentLang === 'kn' ? 'ಸ್ಥಗಿತ' : 'Paused')}
                            </span>
                          </td>
                          <td style={{ fontWeight: '600' }}>{dr.breakfastCount || 0}</td>
                          <td style={{ fontWeight: '700', color: '#15803d' }}>{dr.lunchCount || 0}</td>
                          <td style={{ fontWeight: '600' }}>{dr.snacksCount || 0}</td>
                          <td style={{ fontWeight: '600' }}>{dr.dinnerCount || 0}</td>
                          <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{dr.notes || '—'}</td>
                          <td>
                            {todayDeductions.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                {todayDeductions.map((td, tdi) => (
                                  <span
                                    key={tdi}
                                    style={{
                                      background: '#dcfce7',
                                      color: '#15803d',
                                      fontSize: '0.7rem',
                                      padding: '1px 6px',
                                      borderRadius: '8px',
                                      fontWeight: '600',
                                    }}
                                  >
                                    ✓ {td.mealSession} ({td.peopleCount}p)
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Pending</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: Special Occasion / Function Requests Queue */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>
                    Special Function & Event Requests (ವಿಶೇಷ ಸಮಾರಂಭದ ಬೇಡಿಕೆಗಳು)
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Review branch event requests, check recipe stock feasibility, and approve with auto-deduction.
                  </p>
                </div>

                {/* Filter Pills */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['all', 'pending', 'stock_deducted', 'rejected'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={`btn btn-sm ${eventFilterStatus === st ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.75rem', padding: '3px 10px', textTransform: 'capitalize' }}
                      onClick={() => setEventFilterStatus(st)}
                    >
                      {st === 'stock_deducted' ? 'Deducted' : st}
                    </button>
                  ))}
                </div>
              </div>

              {(branchOrdersData.specialOrders || []).filter((o) => eventFilterStatus === 'all' || o.status === eventFilterStatus).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  <Calendar size={32} style={{ color: '#94a3b8', margin: '0 auto 0.5rem' }} />
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>No special event orders in this category.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Occasion / Event Name</th>
                        <th>Branch Unit</th>
                        <th>Date & Session</th>
                        <th>People Count</th>
                        <th>Selected Dishes</th>
                        <th>Status</th>
                        <th>Head Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(branchOrdersData.specialOrders || [])
                        .filter((o) => eventFilterStatus === 'all' || o.status === eventFilterStatus)
                        .map((order) => {
                          const se = order.specialEvent || {};
                          const isPending = order.status === 'pending';
                          const isDeducted = order.status === 'stock_deducted';
                          const isRejected = order.status === 'rejected';

                          return (
                            <tr key={order._id}>
                              <td>
                                <div style={{ fontWeight: '700', color: '#1e293b' }}>{se.eventName}</div>
                                {se.specialInstructions && (
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                                    Note: {se.specialInstructions}
                                  </div>
                                )}
                              </td>
                              <td style={{ fontWeight: '600' }}>{currentLang === 'kn' && order.branchNameKn ? order.branchNameKn : order.branchNameEn}</td>
                              <td>
                                <div style={{ fontWeight: '600' }}>{se.eventDate}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{se.mealSession}</div>
                              </td>
                              <td style={{ fontWeight: '700', color: '#1e293b' }}>
                                {se.peopleCount} <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>p</span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {(se.requestedDishes || []).map((d, di) => (
                                    <span
                                      key={di}
                                      style={{
                                        background: '#f1f5f9',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '12px',
                                        padding: '1px 8px',
                                        fontSize: '0.75rem',
                                        color: '#334155',
                                      }}
                                    >
                                      {d.dishName}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td>
                                {isDeducted && (
                                  <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '10px', fontWeight: '700', fontSize: '0.75rem' }}>
                                    ✅ Stock Deducted
                                  </span>
                                )}
                                {isPending && (
                                  <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '10px', fontWeight: '700', fontSize: '0.75rem' }}>
                                    ⏳ Pending Review
                                  </span>
                                )}
                                {isRejected && (
                                  <div>
                                    <span style={{ background: '#fee2e2', color: '#dc2626', padding: '3px 8px', borderRadius: '10px', fontWeight: '700', fontSize: '0.75rem' }}>
                                      ❌ Rejected
                                    </span>
                                    {order.approvalDetails?.rejectionReason && (
                                      <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '2px' }}>
                                        {order.approvalDetails.rejectionReason}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td>
                                {isPending && (
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                      type="button"
                                      className="btn btn-primary btn-sm"
                                      style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                      onClick={() => handleApproveSpecialEvent(order)}
                                      title="Approve and auto-deduct stock"
                                    >
                                      Approve & Deduct
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      style={{ padding: '3px 8px', fontSize: '0.75rem', color: '#ef4444' }}
                                      onClick={() => handleRejectSpecialEvent(order)}
                                      title="Reject order"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                                {isDeducted && (
                                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    {order.approvalDetails?.deductedAt ? new Date(order.approvalDetails.deductedAt).toLocaleDateString() : 'Completed'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: DAILY MENU MANAGEMENT (BILINGUAL)
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
                <h3>{currentLang === 'kn' ? 'ದೈನಂದಿನ ಮೆನು ನಿರ್ವಹಣೆ' : 'Daily Menu Management'}</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {currentLang === 'kn' ? 'ಖಾದ್ಯಗಳ ಹೆಸರು ಮತ್ತು ವಿವರಗಳನ್ನು ನಮೂದಿಸಿ ಮತ್ತು ಪ್ರಕಟಿಸಿ.' : 'Create, edit and publish daily menus for RP Canteen.'}
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={openNewMenuModal}
              >
                <Plus size={16} /> {t('head.newDailyMenuBtn', 'Create Daily Menu')}
              </button>
            </div>

            {/* Menus List */}
            <div className="table-container">
              {menuLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#64748b' }}>Loading...</p>
                </div>
              ) : menusList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#64748b' }}>No menus created yet. Click "Create Daily Menu" above.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('head.colMenuDate', 'Menu Date')}</th>
                      <th>{t('head.colMenuTitle', 'Title')}</th>
                      <th>{t('head.colMenuStatus', 'Status')}</th>
                      <th>{t('head.colDishes', 'Dishes')}</th>
                      <th>Published At</th>
                      <th>Created By</th>
                      <th style={{ textAlign: 'center' }}>{t('head.colActions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menusList.map((m) => (
                      <tr key={m._id}>
                        <td>
                          <strong style={{ fontSize: '1rem' }}>{m.date}</strong>
                          {m.date === new Date().toISOString().split('T')[0] && (
                            <span style={{ marginLeft: '6px', fontSize: '0.7rem', background: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>
                              {t('home.todayBadge', 'TODAY')}
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
                            {m.status === 'published' ? t('status.published', 'Published') : t('status.draft', 'Draft')}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: '600' }}>{m.items?.length || 0}</span> {t('home.pureVegGuarantee', 'Vegetarian Items')}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {m.publishedAt
                            ? new Date(m.publishedAt).toLocaleString(currentLang === 'kn' ? 'kn-IN' : 'en-IN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : t('status.draft', 'Unpublished draft')}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {m.createdBy?.fullName || m.createdBy?.username || t('nav.head', 'Head')}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            {/* Toggle Publish / Draft */}
                            <button
                              type="button"
                              className={`btn btn-sm ${m.status === 'published' ? 'btn-secondary' : 'btn-accent'}`}
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                              onClick={() => handleQuickPublishToggle(m)}
                              title={m.status === 'published' ? 'Unpublish menu' : 'Publish menu'}
                            >
                              {m.status === 'published' ? t('head.unpublish', 'Unpublish') : t('head.publishNow', 'Publish')}
                            </button>

                            {/* Edit Menu */}
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.3rem 0.5rem' }}
                              onClick={() => openEditMenuModal(m)}
                              title="Edit menu items and details"
                            >
                              <Edit2 size={13} /> {t('head.editMenu', 'Edit')}
                            </button>

                            {/* Maintain Food Wastage for this Menu */}
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.3rem 0.5rem', color: '#b45309' }}
                              onClick={() => openMenuWastageOverview(m)}
                              title={t('head.colWastage', 'Maintain Food Wastage')}
                            >
                              <Trash2 size={13} /> {t('head.colWastage', 'Wastage')}
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
                <h3>{t('head.tabStaff', 'Canteen Staff Accounts')}</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Manage authorized workers, cooks, and canteen staff members.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsAddStaffModalOpen(true)}
              >
                <Plus size={16} /> {t('head.addNewStaff', 'Add Staff Account')}
              </button>
            </div>

            <div className="table-container">
              {staffLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#64748b' }}>Loading...</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('head.colStaffName', 'Full Name')}</th>
                      <th>{t('head.colStaffUser', 'Username')}</th>
                      <th>{t('head.colStaffEmail', 'Email')}</th>
                      <th>{t('head.colStaffRole', 'Role')}</th>
                      <th>{t('head.colStaffActive', 'Status')}</th>
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
                            {member.role === 'head' ? t('head.headRole', 'HEAD OF CANTEEN') : t('head.workerRole', 'CANTEEN STAFF')}
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
                            {member.isActive ? t('head.active', 'Active') : t('head.inactive', 'Deactivated')}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {member.lastLogin
                            ? new Date(member.lastLogin).toLocaleString(currentLang === 'kn' ? 'kn-IN' : 'en-IN', {
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
                              {member.isActive ? t('head.deactivate', 'Deactivate') : t('head.activate', 'Activate')}
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
            TAB 5: AUDIT TRAIL
            ========================================================================= */}
        {activeTab === 'audit' && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <h3>{t('head.auditTrailTitle', 'Administrative Security & Action Audit Trail')}</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Server-side tamper-resistant record of administrative actions, staff logins, and menu publishes.
              </p>
            </div>

            <div className="table-container">
              {auditLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#64748b' }}>Loading...</p>
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
                          {new Date(log.createdAt).toLocaleString(currentLang === 'kn' ? 'kn-IN' : 'en-IN', {
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

        {/* =========================================================================
            TAB 6: REPORTS & ANALYTICS
            ========================================================================= */}
        {activeTab === 'reports' && <ReportsView />}
      </div>

      {/* =========================================================================
          MODAL: OUT OF STOCK & CRITICAL LOW STOCK ALERT (AUTO-POPUP FOR HEAD)
          ========================================================================= */}
      <Modal
        isOpen={isStockAlertModalOpen}
        onClose={() => setIsStockAlertModalOpen(false)}
        title={currentLang === 'kn' ? '⚠️ ತುರ್ತು ದಾಸ್ತಾನು ಎಚ್ಚರಿಕೆ (ಖಾಲಿಯಾದ ಸಾಮಗ್ರಿಗಳು)' : '⚠️ Critical Kitchen Stock Alert'}
        maxWidth="740px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top Alert Banner */}
          <div
            style={{
              padding: '1rem 1.25rem',
              background: '#fff1f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            <AlertTriangle size={24} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: '800', color: '#991b1b', fontSize: '0.95rem', marginBottom: '2px' }}>
                {currentLang === 'kn'
                  ? 'ಕ್ಯಾಂಟೀನ್ ಅಡುಗೆಮನೆಯಲ್ಲಿ ಸಾಮಗ್ರಿಗಳ ಮರುಪೂರಣ ತಕ್ಷಣ ಅಗತ್ಯವಿದೆ!'
                  : 'Immediate Kitchen Restock Required!'}
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#7f1d1d', lineHeight: '1.4' }}>
                {currentLang === 'kn'
                  ? 'ಕೆಳಗಿನ ಅಗತ್ಯ ಅಡುಗೆ ಸಾಮಗ್ರಿಗಳು ಕ್ಯಾಂಟೀನ್‌ನಲ್ಲಿ ಸಂಪೂರ್ಣವಾಗಿ ಖಾಲಿಯಾಗಿವೆ ಅಥವಾ ಕನಿಷ್ಠ ಮಿತಿಗಿಂತ ಕಡಿಮೆಯಿವೆ. ಅಡುಗೆಗೆ ಅಡಚಣೆಯಾಗದಂತೆ ತಕ್ಷಣ ಮರುಪೂರಣ ಮಾಡಿ.'
                  : 'The following essential cooking ingredients are currently completely out of stock or below safe minimum thresholds. Please record replenishment to ensure uninterrupted canteen meals.'}
              </p>
            </div>
          </div>

          {/* 1. Out of Stock List (Quantity = 0) */}
          {outOfStockItems.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.6rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dc2626' }} />
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#991b1b', fontWeight: '800' }}>
                  {currentLang === 'kn'
                    ? `ಸಂಪೂರ್ಣ ಖಾಲಿಯಾದ ಸಾಮಗ್ರಿಗಳು (${outOfStockItems.length})`
                    : `Completely Out of Stock (${outOfStockItems.length})`}
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                {outOfStockItems.map((item) => (
                  <div
                    key={item._id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: '#fef2f2',
                      border: '1px solid #fee2e2',
                      borderRadius: '10px',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.92rem' }}>
                        {getLocalizedText(item.name, currentLang === 'kn', ITEM_NAME_TRANSLATIONS)}
                        {item.brand && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal', marginLeft: '6px' }}>
                            ({item.brand})
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '0.75rem', marginTop: '3px', color: '#64748b', alignItems: 'center' }}>
                        <span className="category-pill" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                          {item.category}
                        </span>
                        <span style={{ color: '#dc2626', fontWeight: '700' }}>
                          {currentLang === 'kn' ? 'ಪ್ರಸ್ತುತ ದಾಸ್ತಾನು:' : 'Current Stock:'} 0 {item.unit}
                        </span>
                        <span>•</span>
                        <span>
                          {currentLang === 'kn' ? 'ಕನಿಷ್ಠ ಅಗತ್ಯ:' : 'Min Required:'} {item.minThreshold || 5} {item.unit}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '0.78rem', padding: '5px 12px', background: '#16a34a', borderColor: '#16a34a' }}
                      onClick={() => handleQuickRestockFromAlert(item)}
                    >
                      + {currentLang === 'kn' ? 'ಈಗಲೇ ಮರುಪೂರಣ ಮಾಡಿ' : 'Restock Now'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Low Stock List (0 < Quantity <= Threshold) */}
          {lowStockItems.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.6rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#d97706' }} />
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#92400e', fontWeight: '800' }}>
                  {currentLang === 'kn'
                    ? `ಕಡಿಮೆ ಪ್ರಮಾಣದ ದಾಸ್ತಾನು — ಮರುಆದೇಶ ಅಗತ್ಯ (${lowStockItems.length})`
                    : `Critically Low Stock — Reorder Needed (${lowStockItems.length})`}
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {lowStockItems.map((item) => (
                  <div
                    key={item._id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: '#fffbeb',
                      border: '1px solid #fef3c7',
                      borderRadius: '10px',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.92rem' }}>
                        {getLocalizedText(item.name, currentLang === 'kn', ITEM_NAME_TRANSLATIONS)}
                        {item.brand && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal', marginLeft: '6px' }}>
                            ({item.brand})
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '0.75rem', marginTop: '3px', color: '#64748b', alignItems: 'center' }}>
                        <span className="category-pill" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                          {item.category}
                        </span>
                        <span style={{ color: '#b45309', fontWeight: '700' }}>
                          {currentLang === 'kn' ? 'ಪ್ರಸ್ತುತ:' : 'Current:'} {item.currentQuantity} {item.unit}
                        </span>
                        <span>•</span>
                        <span>
                          {currentLang === 'kn' ? 'ಕನಿಷ್ಠ ಅಗತ್ಯ:' : 'Min Required:'} {item.minThreshold || 5} {item.unit}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                      onClick={() => handleQuickRestockFromAlert(item)}
                    >
                      + {currentLang === 'kn' ? 'ದಾಸ್ತಾನು ಭರ್ತಿ' : 'Restock'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '0.75rem',
              borderTop: '1px solid #e2e8f0',
              marginTop: '0.5rem',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setIsStockAlertModalOpen(false);
                setActiveTab('inventory');
                setInvStatus('out_of_stock');
              }}
            >
              {currentLang === 'kn' ? 'ದಾಸ್ತಾನು ಪಟ್ಟಿಗೆ ಹೋಗಿ' : 'Go to Inventory Management'}
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsStockAlertModalOpen(false)}
            >
              {currentLang === 'kn' ? 'ಖಚಿತಪಡಿಸಿ / ಮುಚ್ಚಿ' : 'Acknowledge & Close'}
            </button>
          </div>
        </div>
      </Modal>

      {/* =========================================================================
          MODAL: ADD INVENTORY ITEM
          ========================================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t('head.modalAddInventory', 'Add New Kitchen Inventory Item')}
      >
        <form onSubmit={handleAddItem}>
          <div className="form-group">
            <label className="form-label">{t('head.ingredientName', 'Ingredient / Item Name')} *</label>
            <input
              type="text"
              className="form-input"
              placeholder={t('head.ingredientNamePlaceholder', 'e.g. Sona Masoori Rice, Toor Dal, Cow Milk')}
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">{t('head.category', 'Category')} *</label>
              <select
                className="form-select"
                value={itemForm.category}
                onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                required
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{t(`inventoryCategories.${c}`, c)}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('head.unit', 'Measurement Unit')} *</label>
              <select
                className="form-select"
                value={itemForm.unit}
                onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                required
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{t(`units.${u}`, u)}</option>
                ))}
              </select>
            </div>
          </div>

          {itemForm.category === 'Vegetables' ? (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.6rem 0.85rem',
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>🥦</span>
              <span>{t('head.noBrandForVeg', 'Vegetables are fresh farm produce without a brand.')}</span>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">
                {t('head.brand', 'Brand')} <span style={{ fontSize: '0.78rem', color: '#64748b' }}>({t('head.brandOptional', 'For packaged items like Milk, Ghee, Tea')})</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder={t('head.brandPlaceholder', 'e.g. Nandini, Fortune, Tata Tea, Cothas')}
                value={itemForm.brand}
                onChange={(e) => setItemForm({ ...itemForm, brand: e.target.value })}
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">{t('head.initialQty', 'Initial Stock Quantity')}</label>
              <input
                type="number"
                step="any"
                min="0"
                className="form-input"
                placeholder="0"
                value={itemForm.initialQuantity}
                onChange={(e) => handleItemInitialQtyChange(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('head.minThreshold', 'Min Alert Threshold')} *</label>
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

          {/* Pricing & Cost Calculation */}
          <div
            style={{
              background: 'var(--bg-subtle, #f8fafc)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                💰 {t('head.procurementCost', 'Purchase Price & Cost Calculation')}
              </strong>
              {Number(itemForm.initialQuantity) > 0 && Number(itemForm.unitPrice) > 0 && (
                <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: '600' }}>
                  {itemForm.initialQuantity} {t(`units.${itemForm.unit}`, itemForm.unit)} @ ₹{Number(itemForm.unitPrice).toFixed(2)} / {t(`units.${itemForm.unit}`, itemForm.unit)}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>
                  {t('head.totalCost', 'Total Purchase Cost (₹)')}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="form-input"
                  placeholder="e.g. 500"
                  value={itemForm.totalCost}
                  onChange={(e) => handleItemTotalCostChange(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>
                  {t('head.unitPrice', 'Price per Unit')} (₹ / {t(`units.${itemForm.unit}`, itemForm.unit)})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="form-input"
                  placeholder="Auto-calculated or enter"
                  value={itemForm.unitPrice}
                  onChange={(e) => handleItemUnitPriceChange(e.target.value)}
                />
              </div>
            </div>
            {Number(itemForm.initialQuantity) > 0 && Number(itemForm.totalCost) > 0 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                💡 {currentLang === 'kn' ? 'ಸ್ವಯಂ ಲೆಕ್ಕಾಚಾರ:' : 'Auto-calculated:'} ₹{Number(itemForm.totalCost).toFixed(2)} ÷ {itemForm.initialQuantity} {t(`units.${itemForm.unit}`, itemForm.unit)} = <strong>₹{Number(itemForm.unitPrice || 0).toFixed(2)} / {t(`units.${itemForm.unit}`, itemForm.unit)}</strong>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">{t('head.notes', 'Notes (Optional)')}</label>
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
              {t('head.cancel', 'Cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {t('head.saveInventory', 'Save Inventory Item')}
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
        title={t('head.modalEditInventory', 'Edit Inventory Item')}
      >
        <form onSubmit={handleEditItem}>
          <div className="form-group">
            <label className="form-label">{t('head.ingredientName', 'Ingredient / Item Name')} *</label>
            <input
              type="text"
              className="form-input"
              value={editItemForm.name}
              onChange={(e) => setEditItemForm({ ...editItemForm, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">{t('head.category', 'Category')} *</label>
              <select
                className="form-select"
                value={editItemForm.category}
                onChange={(e) => setEditItemForm({ ...editItemForm, category: e.target.value })}
                required
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{t(`inventoryCategories.${c}`, c)}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('head.unit', 'Measurement Unit')} *</label>
              <select
                className="form-select"
                value={editItemForm.unit}
                onChange={(e) => setEditItemForm({ ...editItemForm, unit: e.target.value })}
                required
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{t(`units.${u}`, u)}</option>
                ))}
              </select>
            </div>
          </div>

          {editItemForm.category === 'Vegetables' ? (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.6rem 0.85rem',
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>🥦</span>
              <span>{t('head.noBrandForVeg', 'Vegetables are fresh farm produce without a brand.')}</span>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">
                {t('head.brand', 'Brand')} <span style={{ fontSize: '0.78rem', color: '#64748b' }}>({t('head.brandOptional', 'For packaged items like Milk, Ghee, Tea')})</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder={t('head.brandPlaceholder', 'e.g. Nandini, Fortune, Tata Tea, Cothas')}
                value={editItemForm.brand}
                onChange={(e) => setEditItemForm({ ...editItemForm, brand: e.target.value })}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">{t('head.minThreshold', 'Min Alert Threshold')} *</label>
            <input
              type="number"
              step="any"
              min="0"
              className="form-input"
              value={editItemForm.minThreshold}
              onChange={(e) => setEditItemForm({ ...editItemForm, minThreshold: e.target.value })}
              required
            />
          </div>

          {/* Pricing & Cost Calculation */}
          <div
            style={{
              background: 'var(--bg-subtle, #f8fafc)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                💰 {t('head.procurementCost', 'Purchase Price & Cost Calculation')}
              </strong>
              {Number(selectedItem?.currentQuantity) > 0 && Number(editItemForm.unitPrice) > 0 && (
                <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: '600' }}>
                  {selectedItem.currentQuantity} {t(`units.${editItemForm.unit}`, editItemForm.unit)} @ ₹{Number(editItemForm.unitPrice).toFixed(2)} / {t(`units.${editItemForm.unit}`, editItemForm.unit)}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>
                  {t('head.totalCost', 'Total Purchase Cost (₹)')}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="form-input"
                  placeholder="e.g. 500"
                  value={editItemForm.totalCost}
                  onChange={(e) => handleEditItemTotalCostChange(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>
                  {t('head.unitPrice', 'Price per Unit')} (₹ / {t(`units.${editItemForm.unit}`, editItemForm.unit)})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="form-input"
                  placeholder="Auto-calculated or enter"
                  value={editItemForm.unitPrice}
                  onChange={(e) => handleEditItemUnitPriceChange(e.target.value)}
                />
              </div>
            </div>
            {Number(selectedItem?.currentQuantity) > 0 && Number(editItemForm.totalCost) > 0 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                💡 {currentLang === 'kn' ? 'ಸ್ವಯಂ ಲೆಕ್ಕಾಚಾರ:' : 'Auto-calculated:'} ₹{Number(editItemForm.totalCost).toFixed(2)} ÷ {selectedItem.currentQuantity} {t(`units.${editItemForm.unit}`, editItemForm.unit)} = <strong>₹{Number(editItemForm.unitPrice || 0).toFixed(2)} / {t(`units.${editItemForm.unit}`, editItemForm.unit)}</strong>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">{t('head.notes', 'Notes (Optional)')}</label>
            <input
              type="text"
              className="form-input"
              value={editItemForm.notes}
              onChange={(e) => setEditItemForm({ ...editItemForm, notes: e.target.value })}
            />
          </div>

          <div className="modal-footer" style={{ margin: '1.5rem -1.5rem -1.5rem', padding: '1rem 1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
              {t('head.cancel', 'Cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {t('head.saveChanges', 'Save Changes')}
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: UPDATE STOCK QUANTITY
          ========================================================================= */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        title={`${t('head.updateStock', 'Update Stock')} — ${selectedItem?.name || ''}`}
      >
        <form onSubmit={handleUpdateStock}>
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{t('head.currentAvailableStock', 'Current Available Stock:')}</span>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                {selectedItem?.currentQuantity} {t(`units.${selectedItem?.unit}`, selectedItem?.unit)}
              </div>
            </div>
            <StatusBadge status={selectedItem?.stockStatus} />
          </div>

          <div className="form-group">
            <label className="form-label">{t('head.movementType', 'Movement Type')} *</label>
            <select
              className="form-select"
              value={stockForm.movementType}
              onChange={(e) => setStockForm({ ...stockForm, movementType: e.target.value })}
              required
            >
              <option value="received">{t('head.stockReceived', 'Stock Received (Addition)')}</option>
              <option value="consumed">{t('head.stockConsumed', 'Stock Consumed (Deduction)')}</option>
              <option value="discarded">{t('head.stockDiscarded', 'Stock Discarded / Expired (Deduction)')}</option>
              <option value="correction">{t('head.stockCorrection', 'Stock Correction (Manual Reconciliation)')}</option>
            </select>
          </div>

          {stockForm.movementType === 'correction' ? (
            <div className="form-group">
              <label className="form-label">{t('head.newExactCount', { unit: t(`units.${selectedItem?.unit}`, selectedItem?.unit) })} *</label>
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
                {t('head.quantityToAddDeduct', {
                  type: stockForm.movementType === 'received' ? 'Add' : 'Deduct',
                  unit: t(`units.${selectedItem?.unit}`, selectedItem?.unit),
                })} *
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
            <label className="form-label">{t('head.mandatoryReason', 'Mandatory Reason / Note')} *</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder={t('head.reasonPlaceholder', 'e.g. Received weekly supply / Used for lunch preparation')}
              value={stockForm.reason}
              onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })}
              required
            />
          </div>

          <div className="modal-footer" style={{ margin: '1.5rem -1.5rem -1.5rem', padding: '1rem 1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsStockModalOpen(false)}>
              {t('head.cancel', 'Cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {t('head.confirmMovement', 'Confirm & Record Stock Movement')}
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: BILINGUAL DAILY MENU BUILDER & EDITOR
          ========================================================================= */}
      <Modal
        isOpen={isMenuEditorOpen}
        onClose={() => setIsMenuEditorOpen(false)}
        title={editingMenu ? (currentLang === 'kn' ? `${menuFormDate} ರ ಮೆನು ಸಂಪಾದಿಸಿ` : `Edit Menu for ${menuFormDate}`) : (currentLang === 'kn' ? 'ದೈನಂದಿನ ಮೆನು ರಚಿಸಿ' : 'Daily Menu Builder')}
        maxWidth="820px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top Menu Meta Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{t('head.menuDate', 'Menu Date')} *</label>
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
              <label className="form-label">{t('head.menuTitle', 'Menu Heading Title')} *</label>
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
            <label className="form-label">{t('head.menuSpecialNote', 'Special Notice (Optional)')}</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Festival Special Sweets prepared today with pure desi ghee"
              value={menuFormNote}
              onChange={(e) => setMenuFormNote(e.target.value)}
            />
          </div>

          {/* Bilingual Food Item Entry Card */}
          <div
            className="dish-subform-box"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Languages size={18} color="#1b4332" />
                {editingDishIndex !== null
                  ? t('head.editDishHeading', 'Edit Vegetarian Dish in Menu')
                  : t('head.addDishHeading', 'Add Vegetarian Dish to Menu')}
              </h4>
              <VegBadge showLabel={true} />
            </div>

            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
              {currentLang === 'kn' ? 'ಖಾದ್ಯದ ಹೆಸರನ್ನು ನಮೂದಿಸಿ. ಸ್ವಯಂ ಅನುವಾದ ಸಲಹೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಅಥವಾ ಸಂಪಾದಿಸಿ.' : 'Enter dish name. Smart translations can be reviewed or edited.'}
            </p>

            <form onSubmit={handleAddDishToMenu}>
              {/* Row 1: Food Names in Kannada & English with Auto-Suggest */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-main)' }}>
                      {t('head.kannadaName', 'Kannada Name')}
                    </label>
                    {newDish.nameEn && (
                      <button
                        type="button"
                        onClick={handleSuggestKannada}
                        disabled={translatingName}
                        style={{
                          fontSize: '0.75rem',
                          background: 'none',
                          border: 'none',
                          color: '#15803d',
                          cursor: 'pointer',
                          fontWeight: '600',
                          padding: 0,
                        }}
                      >
                        {translatingName ? t('head.translating', 'Translating...') : t('head.suggestKnBtn', '✨ Suggest Kannada')}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t('head.kannadaNamePlaceholder', 'ಉದಾ: ಇಡ್ಲಿ, ಮೈಸೂರು ಮಸಾಲ ದೋಸೆ')}
                    value={newDish.nameKn}
                    onChange={(e) => setNewDish({ ...newDish, nameKn: e.target.value })}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-main)' }}>
                      {t('head.englishName', 'English Name')}
                    </label>
                    {newDish.nameKn && (
                      <button
                        type="button"
                        onClick={handleSuggestEnglish}
                        disabled={translatingName}
                        style={{
                          fontSize: '0.75rem',
                          background: 'none',
                          border: 'none',
                          color: '#15803d',
                          cursor: 'pointer',
                          fontWeight: '600',
                          padding: 0,
                        }}
                      >
                        {translatingName ? t('head.translating', 'Translating...') : t('head.suggestEnBtn', '✨ Suggest English')}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t('head.englishNamePlaceholder', 'e.g. Idli, Mysore Masala Dosa')}
                    value={newDish.nameEn}
                    onChange={(e) => setNewDish({ ...newDish, nameEn: e.target.value })}
                  />
                </div>
              </div>

              {/* Row 2: Meal Category Selection */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                    {t('head.category', 'Meal Category')} *
                  </label>
                  <select
                    className="form-select"
                    value={newDish.category}
                    onChange={(e) => setNewDish({ ...newDish, category: e.target.value })}
                  >
                    {MEAL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{t(`categories.${cat}`, cat)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-main)' }}>
                      {t('head.imageUrl', 'Food Image URL (Optional)')}
                    </label>
                    {newDish.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setNewDish({ ...newDish, imageUrl: '' })}
                        style={{ fontSize: '0.72rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        {t('head.clearPhoto', '✕ Clear')}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://..."
                    value={newDish.imageUrl}
                    onChange={(e) => setNewDish({ ...newDish, imageUrl: e.target.value })}
                  />
                </div>
              </div>

              {/* 1-Click Quick Photo Presets & Live Thumbnail Preview */}
              <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(0, 0, 0, 0.02)', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>
                    {t('head.quickPhotos', '✨ 1-Click Verified Photos:')}
                  </span>
                  {QUICK_IMAGE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      style={{
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        border: newDish.imageUrl === preset.url ? '1px solid #16a34a' : '1px solid #cbd5e1',
                        background: newDish.imageUrl === preset.url ? '#dcfce7' : 'var(--bg-surface)',
                        color: newDish.imageUrl === preset.url ? '#15803d' : 'var(--text-main)',
                        cursor: 'pointer',
                        fontWeight: newDish.imageUrl === preset.url ? '600' : 'normal',
                      }}
                      onClick={() => setNewDish({ ...newDish, imageUrl: preset.url })}
                    >
                      {currentLang === 'kn' ? preset.labelKn : preset.labelEn}
                    </button>
                  ))}
                </div>

                {/* Live Preview Display */}
                {(() => {
                  const autoPreview = resolveFoodImage(newDish);
                  if (newDish.imageUrl) {
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={newDish.imageUrl}
                          alt="Selected preview"
                          style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #16a34a' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <div style={{ fontSize: '0.75rem' }}>
                          <span style={{ color: '#16a34a', fontWeight: '600' }}>✓ {t('head.customPhotoSelected', 'Selected Photo Preview')}</span>
                          <span style={{ color: '#64748b', marginLeft: '6px' }}>({t('head.photoConfirmed', 'Will display to customers')})</span>
                        </div>
                      </div>
                    );
                  } else if (autoPreview?.src) {
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={autoPreview.src}
                          alt="Auto preview"
                          style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px dashed #cbd5e1' }}
                        />
                        <div style={{ fontSize: '0.75rem' }}>
                          <span style={{ color: '#15803d', fontWeight: '600' }}>✨ {t('head.autoDetectedPhoto', 'Smart Auto-Detected Photo')}: </span>
                          <span style={{ color: '#64748b' }}>{autoPreview.label || t('head.categoryDefault', 'Category Default')}</span>
                          <span style={{ color: '#94a3b8', marginLeft: '6px' }}>({t('head.leaveBlankNotice', 'No URL entered, so this verified photo is safely used')})</span>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        🛡️ {t('head.pureVegGraphicNotice', 'No photo matched. An authentic Pure Vegetarian Graphic Card will be shown safely.')}
                      </div>
                    );
                  }
                })()}
              </div>

              {/* Row 3: Descriptions in Kannada & English */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                    {t('head.kannadaDesc', 'Kannada Description')}
                  </label>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    placeholder={t('head.kannadaDescPlaceholder', 'ಉದಾ: ಅಕ್ಕಿ ಮತ್ತು ಉದ್ದಿನ ಬೇಳೆಯಿಂದ ತಯಾರಿಸಿದ ಆಹಾರ.')}
                    value={newDish.descriptionKn}
                    onChange={(e) => setNewDish({ ...newDish, descriptionKn: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                    {t('head.englishDesc', 'English Description')}
                  </label>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    placeholder={t('head.englishDescPlaceholder', 'e.g. Steamed South Indian rice and lentil dish.')}
                    value={newDish.descriptionEn}
                    onChange={(e) => setNewDish({ ...newDish, descriptionEn: e.target.value })}
                  />
                </div>
              </div>

              {/* Row 4: Dish Feedback & Special Kitchen Remarks */}
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                  💬 {t('head.feedback', 'Dish Feedback / Special Note (Optional)')}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('head.feedbackPlaceholder', 'e.g. Mildly spiced, customer favorite, or chef remarks')}
                  value={newDish.feedback}
                  onChange={(e) => setNewDish({ ...newDish, feedback: e.target.value })}
                />
              </div>

              {/* Row 5: Availability checkbox & Add/Update button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newDish.isAvailable}
                    onChange={(e) => setNewDish({ ...newDish, isAvailable: e.target.checked })}
                  />
                  {t('head.markAvailable', 'Mark Available Initially')}
                </label>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {editingDishIndex !== null && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleCancelDishEdit}
                      style={{ padding: '0.3rem 0.75rem' }}
                    >
                      {t('head.cancelEdit', 'Cancel Edit')}
                    </button>
                  )}
                  <button type="submit" className="btn btn-secondary btn-sm">
                    {editingDishIndex !== null ? (
                      <>
                        <Edit2 size={15} /> {t('head.updateDishBtn', 'Update Dish in Menu')}
                      </>
                    ) : (
                      <>
                        <Plus size={15} /> {t('head.addDishBtn', 'Add Dish to Menu')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Current Dishes List in this Menu */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h4 style={{ fontSize: '0.95rem' }}>{t('head.dishesInMenu', { count: menuFormItems.length })}</h4>
              <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: '600' }}>
                {t('home.pureVegGuarantee', '100% Pure Vegetarian Guaranteed • No Prices')}
              </span>
            </div>

            {menuFormItems.length === 0 ? (
              <div
                className="dish-empty-box"
                style={{ padding: '2rem', textAlign: 'center', background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b' }}
              >
                {t('head.noDishesAdded', 'No dishes added yet. Use the subform above to add vegetarian dishes.')}
              </div>
            ) : (
              <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table className="data-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{currentLang === 'kn' ? 'ಖಾದ್ಯದ ಹೆಸರು' : 'Dish Name'}</th>
                      <th>{t('head.colCategory', 'Category')}</th>
                      <th>{t('head.colAvailability', 'Availability')}</th>
                      <th>{t('head.colWastage', 'Food Wastage')}</th>
                      <th>{t('head.colFeedback', 'Feedback')}</th>
                      <th style={{ textAlign: 'center' }}>{t('head.colActions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuFormItems.map((item, idx) => (
                      <tr
                        key={idx}
                        style={editingDishIndex === idx ? { background: 'rgba(37, 99, 235, 0.08)' } : undefined}
                      >
                        <td style={{ width: '42px', textAlign: 'center', padding: '4px 6px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <img
                              src={resolveFoodImage(item)?.src || CATEGORY_DEFAULT_IMAGES[item.category] || 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80'}
                              alt=""
                              style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                            />
                            <span style={{ fontSize: '0.65rem', color: '#64748b' }}>#{idx + 1}</span>
                          </div>
                        </td>
                        <td>
                          <strong>
                            {currentLang === 'kn'
                              ? (item.nameKn || item.name || item.nameEn || '—')
                              : (item.nameEn || item.name || item.nameKn || '—')}
                          </strong>
                          {(currentLang === 'kn'
                            ? (item.descriptionKn || item.description)
                            : (item.descriptionEn || item.description)) && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {currentLang === 'kn'
                                ? (item.descriptionKn || item.description)
                                : (item.descriptionEn || item.description)}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="category-pill">
                            {t(`categories.${item.category}`, item.category)}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`btn btn-sm ${item.isAvailable ? 'btn-secondary' : 'btn-danger'}`}
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                            onClick={() => handleToggleDishAvailabilityInForm(idx)}
                          >
                            {item.isAvailable ? t('status.available', 'Available') : t('status.unavailable', 'Unavailable')}
                          </button>
                        </td>
                        <td>
                          {Number(item.wastage?.quantity) > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleOpenWastageModal(item, idx, editingMenu?._id)}
                              style={{
                                border: '1px solid #fde68a',
                                background: '#fef3c7',
                                color: '#b45309',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                fontWeight: '700',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title={item.wastage?.reason ? `Reason: ${item.wastage.reason}` : 'Click to edit wastage'}
                            >
                              ⚠️ {item.wastage.quantity} {item.wastage.unit || 'kg'}
                              <Edit2 size={10} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenWastageModal(item, idx, editingMenu?._id)}
                              style={{
                                border: '1px solid #bbf7d0',
                                background: '#dcfce7',
                                color: '#15803d',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                fontWeight: '600',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Click to record wasted/leftover food"
                            >
                              ✓ {t('head.noWaste', '0 (No Waste)')}
                              <Plus size={10} />
                            </button>
                          )}
                        </td>
                        <td>
                          {item.feedback ? (
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: '#047857',
                                background: '#ecfdf5',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                maxWidth: '140px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={item.feedback}
                            >
                              💬 {item.feedback}
                            </div>
                          ) : item.customerFeedbacks && item.customerFeedbacks.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setFeedbackViewDish(item)}
                              style={{
                                border: 'none',
                                background: '#fef3c7',
                                color: '#b45309',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                fontWeight: '600',
                              }}
                              title="Click to view customer feedback"
                            >
                              ⭐ {(item.customerFeedbacks.reduce((a, b) => a + (b.rating || 5), 0) / item.customerFeedbacks.length).toFixed(1)} ({item.customerFeedbacks.length})
                            </button>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <button
                              type="button"
                              style={{
                                color: editingDishIndex === idx ? '#16a34a' : '#2563eb',
                                padding: '4px',
                                background: editingDishIndex === idx ? 'rgba(22, 163, 74, 0.15)' : 'none',
                                borderRadius: '4px',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              onClick={() => handleEditDishInForm(idx)}
                              title={t('head.editDish', 'Edit Dish')}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              style={{
                                color: '#ef4444',
                                padding: '4px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              onClick={() => handleRemoveDishFromMenu(idx)}
                              title={t('head.removeDish', 'Remove Dish')}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
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
              {t('head.cancel', 'Cancel')}
            </button>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleSaveMenu('draft')}
              >
                {t('head.saveAsDraft', 'Save as Draft')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleSaveMenu('published')}
              >
                <Send size={15} /> {t('head.saveAndPublish', 'Publish Menu Immediately')}
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
        title={t('head.addNewStaff', 'Provision Canteen Staff Account')}
      >
        <form onSubmit={handleCreateStaff}>
          <div className="form-group">
            <label className="form-label">{t('head.colStaffName', 'Full Name')} *</label>
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
              <label className="form-label">{t('head.colStaffUser', 'Username')} *</label>
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
              <label className="form-label">{t('head.colStaffRole', 'Role')} *</label>
              <select
                className="form-select"
                value={staffForm.role}
                onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                required
              >
                <option value="worker">{t('head.workerRole', 'Canteen Staff / Cook (Read-only)')}</option>
                <option value="head">{t('head.headRole', 'Head of Canteen (Administrator)')}</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('head.colStaffEmail', 'Email Address')} *</label>
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
            <label className="form-label">Password * (Min 6 chars)</label>
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
              {t('head.cancel', 'Cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {t('head.addNewStaff', 'Create Account')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Customer Feedback Viewer Modal */}
      {feedbackViewDish && (
        <Modal
          isOpen={true}
          title={`${t('head.customerFeedbacksTitle', 'Customer Feedback & Ratings')} - ${currentLang === 'kn' ? (feedbackViewDish.nameKn || feedbackViewDish.name || feedbackViewDish.nameEn) : (feedbackViewDish.nameEn || feedbackViewDish.name || feedbackViewDish.nameKn)}`}
          onClose={() => setFeedbackViewDish(null)}
        >
          <div>
            {feedbackViewDish.feedback && (
              <div style={{ padding: '0.75rem', background: '#ecfdf5', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #a7f3d0' }}>
                <strong style={{ fontSize: '0.8rem', color: '#047857' }}>💬 {t('head.feedback', 'Dish Feedback / Notes')}:</strong>
                <div style={{ fontSize: '0.85rem', color: '#065f46', marginTop: '2px' }}>{feedbackViewDish.feedback}</div>
              </div>
            )}

            {feedbackViewDish.customerFeedbacks && feedbackViewDish.customerFeedbacks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                {feedbackViewDish.customerFeedbacks.map((fb, fidx) => (
                  <div key={fidx} style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-main)', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.8rem' }}>{fb.customerName || 'Customer'}</span>
                      <span style={{ color: '#eab308', fontSize: '0.85rem' }}>{'★'.repeat(fb.rating || 5)}{'☆'.repeat(5 - (fb.rating || 5))}</span>
                    </div>
                    {fb.comment && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>"{fb.comment}"</div>}
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px' }}>
                      {new Date(fb.createdAt || Date.now()).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem' }}>
                {t('head.noCustomerFeedback', 'No customer feedback submitted yet.')}
              </div>
            )}

            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFeedbackViewDish(null)}>
                {t('head.cancel', 'Close')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* =========================================================================
          MODAL: RECORD FOOD WASTAGE
          ========================================================================= */}
      <Modal
        isOpen={isWastageModalOpen}
        onClose={() => {
          setIsWastageModalOpen(false);
          setWastageDishTarget(null);
        }}
        title={`🗑️ ${t('head.modalLogWastage', 'Record Food Wastage')} — ${
          currentLang === 'kn'
            ? (wastageDishTarget?.dish?.nameKn || wastageDishTarget?.dish?.name || wastageDishTarget?.dish?.nameEn || '')
            : (wastageDishTarget?.dish?.nameEn || wastageDishTarget?.dish?.name || wastageDishTarget?.dish?.nameKn || '')
        }`}
      >
        <form onSubmit={handleSaveWastage}>
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--bg-subtle, #f8fafc)',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #e2e8f0)',
              marginBottom: '1rem',
            }}
          >
            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)' }}>
              {currentLang === 'kn'
                ? (wastageDishTarget?.dish?.nameKn || wastageDishTarget?.dish?.name || wastageDishTarget?.dish?.nameEn)
                : (wastageDishTarget?.dish?.nameEn || wastageDishTarget?.dish?.name || wastageDishTarget?.dish?.nameKn)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
              {t('categories.' + wastageDishTarget?.dish?.category, wastageDishTarget?.dish?.category)} • {editingMenu?.date || wastageDishTarget?.date || new Date().toISOString().split('T')[0]}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">{t('head.wastageQty', 'Wasted / Surplus Quantity')} *</label>
              <input
                type="number"
                step="any"
                min="0"
                className="form-input"
                placeholder="0"
                value={wastageForm.quantity}
                onChange={(e) => setWastageForm({ ...wastageForm, quantity: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('head.wastageUnit', 'Unit')}</label>
              <select
                className="form-select"
                value={wastageForm.unit}
                onChange={(e) => setWastageForm({ ...wastageForm, unit: e.target.value })}
              >
                <option value="kg">{currentLang === 'kn' ? 'ಕಿಲೋಗ್ರಾಂ' : 'kg'}</option>
                <option value="plates">{currentLang === 'kn' ? 'ಪ್ಲೇಟ್' : 'plates'}</option>
                <option value="liters">{currentLang === 'kn' ? 'ಲೀಟರ್' : 'liters'}</option>
                <option value="portions">{currentLang === 'kn' ? 'ಭಾಗ' : 'portions'}</option>
                <option value="pieces">{currentLang === 'kn' ? 'ತುಂಡು' : 'pieces'}</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('head.wastageReason', 'Reason / Food Disposition')}</label>
            <input
              type="text"
              className="form-input"
              placeholder={t('head.wastageReasonPlaceholder', 'e.g. Surplus preparation, Lower footfall, Handed over to Gaushala')}
              value={wastageForm.reason}
              onChange={(e) => setWastageForm({ ...wastageForm, reason: e.target.value })}
            />
          </div>

          <div className="modal-footer" style={{ margin: '1.5rem -1.5rem -1.5rem', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setIsWastageModalOpen(false);
                setWastageDishTarget(null);
              }}
            >
              {t('head.cancel', 'Cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {t('head.saveWastage', 'Save Wastage Record')}
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: DAILY MENU WASTAGE OVERVIEW (MAINTAIN WASTAGE BY DATE)
          ========================================================================= */}
      {selectedMenuForWastage && (
        <Modal
          isOpen={isMenuWastageOverviewOpen}
          onClose={() => {
            setIsMenuWastageOverviewOpen(false);
            setSelectedMenuForWastage(null);
          }}
          title={`📊 ${t('head.colWastage', 'Daily Food Wastage Log')} — ${selectedMenuForWastage.date}`}
        >
          <div>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{selectedMenuForWastage.title}</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {selectedMenuForWastage.items?.length || 0} {t('home.pureVegGuarantee', 'Prepared Vegetarian Dishes')}
                </div>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: selectedMenuForWastage.status === 'published' ? '#dcfce7' : '#fef3c7',
                  color: selectedMenuForWastage.status === 'published' ? '#15803d' : '#b45309',
                  fontWeight: '700',
                }}
              >
                {selectedMenuForWastage.status.toUpperCase()}
              </span>
            </div>

            <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table className="data-table" style={{ fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('home.heroTitle', 'Dish Name')}</th>
                    <th>{t('worker.colCategory', 'Category')}</th>
                    <th>{t('head.colWastage', 'Wastage')}</th>
                    <th style={{ textAlign: 'center' }}>{t('head.colActions', 'Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedMenuForWastage.items || []).map((item, idx) => {
                    const wasteQty = Number(item.wastage?.quantity) || 0;
                    const wasteUnit = item.wastage?.unit || 'kg';
                    const wasteReason = item.wastage?.reason || '';
                    return (
                      <tr key={item._id || idx}>
                        <td style={{ color: 'var(--text-secondary)', width: '30px' }}>{idx + 1}</td>
                        <td>
                          <strong>
                            {currentLang === 'kn'
                              ? (item.nameKn || item.name || item.nameEn)
                              : (item.nameEn || item.name || item.nameKn)}
                          </strong>
                        </td>
                        <td>
                          <span className="category-pill">
                            {t(`categories.${item.category}`, item.category)}
                          </span>
                        </td>
                        <td>
                          {wasteQty > 0 ? (
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
                          {wasteReason && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {wasteReason}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                            onClick={() =>
                              handleOpenWastageModal(
                                item,
                                idx,
                                selectedMenuForWastage._id,
                                selectedMenuForWastage.date
                              )
                            }
                          >
                            <Edit2 size={11} /> {wasteQty > 0 ? t('head.editWastage', 'Edit') : t('head.logWastage', 'Log')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setIsMenuWastageOverviewOpen(false);
                  setSelectedMenuForWastage(null);
                }}
              >
                {t('head.cancel', 'Close')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* =========================================================================
          PREPARE FOOD & AUTO-DEDUCT STOCK MODAL
          ========================================================================= */}
      {isPrepareModalOpen && preparingRecipe && (
        <Modal
          isOpen={isPrepareModalOpen}
          onClose={() => !isExecutingPrepare && setIsPrepareModalOpen(false)}
          title={`🍲 Prepare Food: ${preparingRecipe.dishName}`}
        >
          <form onSubmit={handleExecutePreparation} style={{ maxWidth: '680px' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '6px' }}>
                How many people are you preparing for? (ಎಷ್ಟು ಜನರಿಗೆ ಅಡುಗೆ ತಯಾರಿಸಲಾಗುತ್ತಿದೆ?) *
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="form-input"
                  style={{ fontSize: '1.1rem', fontWeight: '700', maxWidth: '160px' }}
                  value={preparePeopleCount}
                  onChange={(e) => setPreparePeopleCount(e.target.value)}
                  required
                />
                <span style={{ fontSize: '0.88rem', color: '#64748b' }}>
                  People / Portions (Formula Base: {preparingRecipe.basePortion} people)
                </span>
              </div>

              {/* Quick Preset Portion Buttons */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                {[25, 50, 75, 100, 150, 200].map((num) => (
                  <button
                    key={num}
                    type="button"
                    style={{
                      fontSize: '0.75rem',
                      padding: '3px 10px',
                      borderRadius: '14px',
                      border: Number(preparePeopleCount) === num ? '1px solid #16a34a' : '1px solid #cbd5e1',
                      background: Number(preparePeopleCount) === num ? '#dcfce7' : '#ffffff',
                      color: Number(preparePeopleCount) === num ? '#15803d' : '#475569',
                      fontWeight: Number(preparePeopleCount) === num ? '700' : '500',
                      cursor: 'pointer',
                    }}
                    onClick={() => setPreparePeopleCount(num)}
                  >
                    {num} people
                  </button>
                ))}
              </div>
            </div>

            {/* Live Calculation Table */}
            {(() => {
              const people = Math.max(1, Number(preparePeopleCount) || 1);
              let hasShortage = false;

              return (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>
                    Calculated Inventory Deductions (ಲೆಕ್ಕಾಚಾರ ಮಾಡಿದ ದಾಸ್ತಾನು ಕಡಿತ):
                  </div>
                  <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <table className="data-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Ingredient</th>
                          <th>Formula ({preparingRecipe.basePortion}p)</th>
                          <th>Need for {people}p</th>
                          <th>Store Stock</th>
                          <th>Stock After Cooking</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preparingRecipe.ingredients.map((ing, idx) => {
                          const needed = Number(((ing.quantity / preparingRecipe.basePortion) * people).toFixed(2));
                          const current = ing.inventoryItem?.currentQuantity ?? 0;
                          const after = Number((current - needed).toFixed(2));
                          const isShort = current < needed;
                          if (isShort) hasShortage = true;

                          return (
                            <tr key={idx} style={{ background: isShort ? '#fff1f2' : 'transparent' }}>
                              <td>
                                <strong>{ing.itemNameSnapshot}</strong>
                              </td>
                              <td style={{ color: '#64748b' }}>
                                {ing.quantity} {ing.unit}
                              </td>
                              <td>
                                <strong style={{ color: isShort ? '#dc2626' : '#0f172a' }}>
                                  {needed} {ing.unit}
                                </strong>
                              </td>
                              <td>
                                {current} {ing.unit}
                              </td>
                              <td style={{ color: after < 0 ? '#dc2626' : '#15803d', fontWeight: '600' }}>
                                {after < 0 ? `Short by ${Math.abs(after)}` : `${after} ${ing.unit}`}
                              </td>
                              <td>
                                {isShort ? (
                                  <span style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: '700' }}>
                                    ❌ Insufficient
                                  </span>
                                ) : (
                                  <span style={{ color: '#15803d', fontSize: '0.75rem', fontWeight: '700' }}>
                                    ✅ Sufficient
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {hasShortage && (
                    <div
                      style={{
                        marginTop: '10px',
                        padding: '10px 14px',
                        background: '#fef2f2',
                        border: '1px solid #fecdd3',
                        borderRadius: '6px',
                        color: '#991b1b',
                        fontSize: '0.85rem',
                      }}
                    >
                      ⚠️ <strong>Cannot Deduct:</strong> One or more ingredients do not have enough stock in the kitchen. Please adjust the portion count or replenish the stock before confirming preparation.
                    </div>
                  )}

                  <div style={{ marginTop: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>
                      Preparation Notes / Batch Details (Optional):
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., Morning breakfast batch for students"
                      value={prepareNotes}
                      onChange={(e) => setPrepareNotes(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsPrepareModalOpen(false)}
                      disabled={isExecutingPrepare}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ background: '#16a34a', borderColor: '#15803d', fontWeight: '600' }}
                      disabled={hasShortage || isExecutingPrepare || people < 1}
                    >
                      {isExecutingPrepare ? 'Deducting Stock...' : `✓ Confirm Preparation & Auto-Deduct Stock`}
                    </button>
                  </div>
                </div>
              );
            })()}
          </form>
        </Modal>
      )}

      {/* =========================================================================
          RECIPE FORMULA EDITOR MODAL (CREATE / EDIT)
          ========================================================================= */}
      {isRecipeModalOpen && (
        <Modal
          isOpen={isRecipeModalOpen}
          onClose={() => setIsRecipeModalOpen(false)}
          title={editingRecipe ? `Edit Recipe Formula: ${editingRecipe.dishName}` : 'Create New Recipe Formula'}
        >
          <form onSubmit={handleSaveRecipe} style={{ maxWidth: '680px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Dish Name in English *</label>
                  {recipeForm.dishNameKn && (
                    <button
                      type="button"
                      onClick={handleSuggestRecipeEnglish}
                      disabled={translatingRecipeEn}
                      style={{
                        fontSize: '0.75rem',
                        background: 'none',
                        border: 'none',
                        color: '#15803d',
                        cursor: 'pointer',
                        fontWeight: '600',
                        padding: 0,
                      }}
                    >
                      {translatingRecipeEn ? 'Translating...' : '✨ Suggest English'}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Tea, Bisi Bele Bath"
                  value={recipeForm.dishName}
                  onChange={(e) => setRecipeForm({ ...recipeForm, dishName: e.target.value })}
                  required
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    {currentLang === 'kn' ? 'ಕನ್ನಡದಲ್ಲಿ ಖಾದ್ಯದ ಹೆಸರು' : 'Dish Name in Kannada'}
                  </label>
                  {recipeForm.dishName && (
                    <button
                      type="button"
                      onClick={handleSuggestRecipeKannada}
                      disabled={translatingRecipeKn}
                      style={{
                        fontSize: '0.75rem',
                        background: 'none',
                        border: 'none',
                        color: '#15803d',
                        cursor: 'pointer',
                        fontWeight: '600',
                        padding: 0,
                      }}
                    >
                      {translatingRecipeKn
                        ? (currentLang === 'kn' ? 'ಅನುವಾದಿಸಲಾಗುತ್ತಿದೆ...' : 'Translating...')
                        : (currentLang === 'kn' ? '✨ ಕನ್ನಡ ಸಲಹೆ' : '✨ Suggest Kannada')}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ಉದಾಹರಣೆಗೆ: ಚಹಾ, ಬಿಸಿಬೇಳೆ ಬಾತ್"
                  value={recipeForm.dishNameKn}
                  onChange={(e) => setRecipeForm({ ...recipeForm, dishNameKn: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label className="form-label">Meal Category *</label>
                <select
                  className="form-input"
                  value={recipeForm.category}
                  onChange={(e) => setRecipeForm({ ...recipeForm, category: e.target.value })}
                  required
                >
                  {['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner', 'Beverages', 'Sweets & Desserts'].map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Base Portion (Number of People) *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="form-input"
                  value={recipeForm.basePortion}
                  onChange={(e) => setRecipeForm({ ...recipeForm, basePortion: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Ingredients Selection Builder */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ margin: 0, fontWeight: '600' }}>
                  Ingredients from Kitchen Inventory (ಸಾಮಗ್ರಿಗಳು) *
                </label>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddIngredientRow}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}
                >
                  <Plus size={14} /> Add Ingredient Row
                </button>
              </div>

              {/* Ingredient Search & Filter Bar */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#64748b',
                    }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '32px', fontSize: '0.82rem', height: '36px' }}
                    placeholder="Search ingredient (e.g. tea, rice, milk, oil, dal, sugar)..."
                    value={ingredientFilter}
                    onChange={(e) => setIngredientFilter(e.target.value)}
                  />
                </div>
                {ingredientFilter && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.78rem', height: '36px', padding: '0 12px' }}
                    onClick={() => setIngredientFilter('')}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Quick-Add Chips for Search Matches */}
              {ingredientFilter.trim() && (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    fontSize: '0.8rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '600', color: '#334155' }}>
                      Search Results ({filteredInventoryOptions.length} items found):
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Click any item to add it to recipe</span>
                  </div>
                  {filteredInventoryOptions.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: '4px 0' }}>
                      No inventory item matching "{ingredientFilter}".
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {filteredInventoryOptions.map((item) => (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() => handleQuickAddIngredient(item)}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #16a34a',
                            borderRadius: '16px',
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            color: '#15803d',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: '600',
                            transition: 'all 0.15s ease',
                          }}
                          title={`Click to add ${item.name} to recipe`}
                        >
                          <Plus size={12} color="#16a34a" />
                          <span>{item.name} {item.brand ? `[${item.brand}]` : ''}</span>
                          <span style={{ color: '#64748b', fontWeight: 'normal', fontSize: '0.7rem' }}>
                            ({item.currentQuantity} {item.unit})
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recipeForm.ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 70px 36px',
                      gap: '8px',
                      alignItems: 'center',
                      background: '#f8fafc',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <select
                        className="form-input"
                        style={{ fontSize: '0.85rem' }}
                        value={ing.inventoryItem}
                        onChange={(e) => handleIngredientChange(idx, 'inventoryItem', e.target.value)}
                        required
                      >
                        <option value="">-- Select Ingredient --</option>
                        {/* Preserve currently selected item if not in filtered list */}
                        {ing.inventoryItem && !filteredInventoryOptions.some((it) => String(it._id) === String(ing.inventoryItem)) && (
                          (() => {
                            const cur = allInventoryOptions.find((it) => String(it._id) === String(ing.inventoryItem));
                            return cur ? (
                              <option key={cur._id} value={cur._id}>
                                {cur.name} {cur.brand ? `[${cur.brand}]` : ''} (Stock: {cur.currentQuantity} {cur.unit})
                              </option>
                            ) : null;
                          })()
                        )}
                        {filteredInventoryOptions.map((item) => (
                          <option key={item._id} value={item._id}>
                            {item.name} {item.brand ? `[${item.brand}]` : ''} (Stock: {item.currentQuantity} {item.unit})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        placeholder="Quantity"
                        className="form-input"
                        style={{ fontSize: '0.85rem' }}
                        value={ing.quantity}
                        onChange={(e) => handleIngredientChange(idx, 'quantity', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        className="form-input"
                        style={{ fontSize: '0.85rem', background: '#f1f5f9', color: '#475569' }}
                        value={ing.unit}
                        readOnly
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                        onClick={() => handleRemoveIngredientRow(idx)}
                        title="Remove ingredient"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Preparation Notes / Description (Optional)</label>
              <textarea
                className="form-input"
                rows="2"
                placeholder="Special cooking notes, soaking instructions, etc."
                value={recipeForm.description}
                onChange={(e) => setRecipeForm({ ...recipeForm, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsRecipeModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Recipe Formula
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
