import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Building2,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  CookingPot,
  Save,
  Coffee,
  Utensils,
  History,
  XCircle,
  Sparkles,
} from 'lucide-react';

export const BranchDashboard = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const currentLang = i18n.language || 'en';

  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'events'
  const [loading, setLoading] = useState(true);
  const [savingDaily, setSavingDaily] = useState(false);
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [notification, setNotification] = useState(null);

  const [branchInfo, setBranchInfo] = useState({ nameEn: '', nameKn: '' });
  const [recurringOrder, setRecurringOrder] = useState(null);
  const [specialEvents, setSpecialEvents] = useState([]);
  const [todayMenu, setTodayMenu] = useState(null);
  const [availableRecipes, setAvailableRecipes] = useState([]);

  // Daily recurring form state
  const [dailyForm, setDailyForm] = useState({
    isActive: true,
    breakfastCount: 0,
    lunchCount: 0,
    snacksCount: 0,
    dinnerCount: 0,
    notes: '',
  });

  // Special event order modal state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState({
    eventName: '',
    eventDate: new Date().toISOString().split('T')[0],
    mealSession: 'Lunch',
    peopleCount: 50,
    selectedRecipeIds: [],
    specialInstructions: '',
  });
  const [recipeSearch, setRecipeSearch] = useState('');
  const [eventCategoryFilter, setEventCategoryFilter] = useState('All');

  const showNotification = (msg, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 4500);
  };

  const loadBranchData = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [orderRes, menuRes, recipesRes] = await Promise.all([
        api.getMyBranchOrder(),
        api.getPublishedMenu(todayStr).catch(() => ({ success: false })),
        api.getRecipes().catch(() => ({ success: false })),
      ]);

      if (orderRes.success) {
        setBranchInfo(orderRes.branchInfo || { nameEn: user?.fullName, nameKn: user?.branchNameKn });
        setRecurringOrder(orderRes.recurringOrder);
        setSpecialEvents(orderRes.specialEvents || []);

        if (orderRes.recurringOrder?.dailyRecurring) {
          const dr = orderRes.recurringOrder.dailyRecurring;
          setDailyForm({
            isActive: dr.isActive ?? true,
            breakfastCount: dr.breakfastCount || 0,
            lunchCount: dr.lunchCount || 0,
            snacksCount: dr.snacksCount || 0,
            dinnerCount: dr.dinnerCount || 0,
            notes: dr.notes || '',
          });
        }
      }

      if (menuRes && menuRes.success) {
        setTodayMenu(menuRes.menu);
      }

      if (recipesRes && recipesRes.success) {
        setAvailableRecipes(recipesRes.recipes || []);
      }
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranchData();
  }, []);

  const handleSaveDaily = async (e) => {
    e.preventDefault();
    setSavingDaily(true);
    try {
      const res = await api.updateBranchRecurringOrder(dailyForm);
      if (res.success) {
        showNotification(t('branch.dailySaved', 'Daily recurring meal requirement updated successfully!'));
        setRecurringOrder(res.recurringOrder);
      }
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setSavingDaily(false);
    }
  };

  const adjustCount = (field, delta) => {
    setDailyForm((prev) => ({
      ...prev,
      [field]: Math.max(0, (Number(prev[field]) || 0) + delta),
    }));
  };

  const toggleRecipeSelection = (recipe) => {
    setEventForm((prev) => {
      const exists = prev.selectedRecipeIds.includes(recipe._id);
      if (exists) {
        return {
          ...prev,
          selectedRecipeIds: prev.selectedRecipeIds.filter((id) => id !== recipe._id),
        };
      } else {
        return {
          ...prev,
          selectedRecipeIds: [...prev.selectedRecipeIds, recipe._id],
        };
      }
    });
  };

  const handleSubmitEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.eventName.trim()) {
      showNotification('Please enter the event name.', true);
      return;
    }
    if (eventForm.selectedRecipeIds.length === 0) {
      showNotification('Please select at least one dish for the event.', true);
      return;
    }

    const selectedDishes = eventForm.selectedRecipeIds.map((id) => {
      const rec = availableRecipes.find((r) => r._id === id);
      return {
        recipeId: id,
        dishName: rec ? rec.dishName : 'Dish',
        dishNameKn: rec ? rec.dishNameKn : '',
      };
    });

    setSubmittingEvent(true);
    try {
      const payload = {
        eventName: eventForm.eventName.trim(),
        eventDate: eventForm.eventDate,
        mealSession: eventForm.mealSession,
        peopleCount: Number(eventForm.peopleCount),
        requestedDishes: selectedDishes,
        specialInstructions: eventForm.specialInstructions.trim(),
      };

      const res = await api.submitBranchSpecialEventOrder(payload);
      if (res.success) {
        showNotification(`Event order "${payload.eventName}" submitted to Canteen Head for approval!`);
        setIsEventModalOpen(false);
        setEventForm({
          eventName: '',
          eventDate: new Date().toISOString().split('T')[0],
          mealSession: 'Lunch',
          peopleCount: 50,
          selectedRecipeIds: [],
          specialInstructions: '',
        });
        loadBranchData();
      }
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setSubmittingEvent(false);
    }
  };

  const filteredRecipesForEvent = availableRecipes.filter((r) => {
    if (eventCategoryFilter !== 'All' && r.category !== eventCategoryFilter) {
      return false;
    }
    if (!recipeSearch.trim()) return true;
    const term = recipeSearch.toLowerCase();
    return (
      (r.dishName && r.dishName.toLowerCase().includes(term)) ||
      (r.dishNameKn && r.dishNameKn.includes(term)) ||
      (r.category && r.category.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ flexGrow: 1, padding: '2rem 1.25rem', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            background: notification.isError ? '#ef4444' : '#15803d',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '500',
            fontSize: '0.9rem',
          }}
        >
          {notification.isError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '1.75rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              background: '#e0f2fe',
              color: '#0369a1',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Building2 size={30} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                {currentLang === 'kn' && branchInfo.nameKn ? branchInfo.nameKn : branchInfo.nameEn || user?.fullName}
              </h1>
              <span
                style={{
                  background: '#e0f2fe',
                  color: '#0369a1',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                }}
              >
                Rashtrotthana Unit
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Canteen Daily Food Indents & Special Function Requests Portal
            </p>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('daily')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <CookingPot size={16} />
            <span>{currentLang === 'kn' ? 'ದೈನಂದಿನ ಊಟದ ಬೇಡಿಕೆ' : 'Daily Food Indent'}</span>
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'events' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('events')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Calendar size={16} />
            <span>{currentLang === 'kn' ? 'ವಿಶೇಷ ಸಮಾರಂಭದ ಬೇಡಿಕೆಗಳು' : 'Special Event Orders'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <p>{currentLang === 'kn' ? 'ವಿವರಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...' : 'Loading branch portal details...'}</p>
        </div>
      ) : activeTab === 'daily' ? (
        /* =========================================================================
           TAB 1: DAILY RECURRING FOOD INDENT
           ========================================================================= */
        <div>
          <form onSubmit={handleSaveDaily}>
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main)' }}>
                    {currentLang === 'kn' ? 'ದೈನಂದಿನ ಖಾಯಂ ಊಟದ ಬೇಡಿಕೆ' : 'Standing Daily Meal Requirement'}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {currentLang === 'kn'
                      ? 'ಕೇಂದ್ರ ಕ್ಯಾಂಟೀನ್‌ನಿಂದ ನಿಮ್ಮ ಶಾಖೆಗೆ ಪ್ರತಿದಿನ ಎಷ್ಟು ಜನರಿಗೆ ಊಟ ಬೇಕು ಎಂಬುದನ್ನು ನಮೂದಿಸಿ. ಅಡುಗೆ ತಯಾರಿಸಿದಾಗ ದಾಸ್ತಾನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಕಡಿತಗೊಳ್ಳುತ್ತದೆ.'
                      : 'Specify how many people from your branch require food from the central canteen everyday. Stock will be auto-deducted when food is prepared.'}
                  </p>
                </div>

                {/* Status Switch Active / Paused */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: dailyForm.isActive ? '#15803d' : '#94a3b8' }}>
                    {dailyForm.isActive
                      ? currentLang === 'kn'
                        ? '✅ ದೈನಂದಿನ ಊಟ ಸಕ್ರಿಯವಾಗಿದೆ'
                        : '✅ Daily Food Active'
                      : currentLang === 'kn'
                      ? '⏸️ ದೈನಂದಿನ ಊಟ ನಿಲ್ಲಿಸಲಾಗಿದೆ'
                      : '⏸️ Daily Food Paused'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDailyForm({ ...dailyForm, isActive: !dailyForm.isActive })}
                    className={`btn btn-sm ${dailyForm.isActive ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.78rem' }}
                  >
                    {dailyForm.isActive
                      ? currentLang === 'kn'
                        ? 'ರಜೆಗಾಗಿ ನಿಲ್ಲಿಸಿ'
                        : 'Pause for Holidays'
                      : currentLang === 'kn'
                      ? 'ಮರುಪ್ರಾರಂಭಿಸಿ'
                      : 'Resume Daily Food'}
                  </button>
                </div>
              </div>

              {/* 4 Meal Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {/* Breakfast */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.2rem',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#b45309', marginBottom: '6px' }}>
                    <Coffee size={20} />
                    <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                      {currentLang === 'kn' ? 'ಉಪಾಹಾರ (ತಿಂಡಿ)' : 'Breakfast'}
                    </span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: '#1e293b', margin: '8px 0' }}>
                    {dailyForm.breakfastCount} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#64748b' }}>{currentLang === 'kn' ? 'ಜನರಿಗೆ' : 'people'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                    <button type="button" onClick={() => adjustCount('breakfastCount', -5)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px' }}>-5</button>
                    <button type="button" onClick={() => adjustCount('breakfastCount', -1)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px' }}>-1</button>
                    <button type="button" onClick={() => adjustCount('breakfastCount', 1)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px' }}>+1</button>
                    <button type="button" onClick={() => adjustCount('breakfastCount', 5)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px' }}>+5</button>
                  </div>
                </div>

                {/* Lunch */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.2rem',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#15803d', marginBottom: '6px' }}>
                    <Utensils size={20} />
                    <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                      {currentLang === 'kn' ? 'ಮಧ್ಯಾಹ್ನದ ಊಟ' : 'Lunch'}
                    </span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: '#1e293b', margin: '8px 0' }}>
                    {dailyForm.lunchCount} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#64748b' }}>{currentLang === 'kn' ? 'ಜನರಿಗೆ' : 'people'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                    <button type="button" onClick={() => adjustCount('lunchCount', -5)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px' }}>-5</button>
                    <button type="button" onClick={() => adjustCount('lunchCount', -1)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px' }}>-1</button>
                    <button type="button" onClick={() => adjustCount('lunchCount', 1)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px' }}>+1</button>
                    <button type="button" onClick={() => adjustCount('lunchCount', 5)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px' }}>+5</button>
                  </div>
                </div>

                {/* Evening Snacks */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.2rem',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#7c3aed', marginBottom: '6px' }}>
                    <Coffee size={20} />
                    <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                      {currentLang === 'kn' ? 'ಸಂಜೆ ತಿಂಡಿ / ಚಹಾ' : 'Evening Snacks'}
                    </span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: '#1e293b', margin: '8px 0' }}>
                    {dailyForm.snacksCount} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#64748b' }}>{currentLang === 'kn' ? 'ಜನರಿಗೆ' : 'people'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                    <button type="button" onClick={() => adjustCount('snacksCount', -5)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px' }}>-5</button>
                    <button type="button" onClick={() => adjustCount('snacksCount', -1)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px' }}>-1</button>
                    <button type="button" onClick={() => adjustCount('snacksCount', 1)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px' }}>+1</button>
                    <button type="button" onClick={() => adjustCount('snacksCount', 5)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px' }}>+5</button>
                  </div>
                </div>

                {/* Dinner */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.2rem',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#0369a1', marginBottom: '6px' }}>
                    <Utensils size={20} />
                    <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                      {currentLang === 'kn' ? 'ರಾತ್ರಿ ಊಟ' : 'Dinner'}
                    </span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: '#1e293b', margin: '8px 0' }}>
                    {dailyForm.dinnerCount} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#64748b' }}>{currentLang === 'kn' ? 'ಜನರಿಗೆ' : 'people'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                    <button type="button" onClick={() => adjustCount('dinnerCount', -5)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px' }}>-5</button>
                    <button type="button" onClick={() => adjustCount('dinnerCount', -1)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px' }}>-1</button>
                    <button type="button" onClick={() => adjustCount('dinnerCount', 1)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px' }}>+1</button>
                    <button type="button" onClick={() => adjustCount('dinnerCount', 5)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px' }}>+5</button>
                  </div>
                </div>
              </div>

              {/* Special dietary or delivery notes */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: '600' }}>
                  {currentLang === 'kn' ? 'ವಿತರಣಾ ಸೂಚನೆಗಳು / ಆಹಾರದ ಟಿಪ್ಪಣಿಗಳು' : 'Delivery Instructions / Staff Dietary Notes'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={currentLang === 'kn' ? 'ಉದಾಹರಣೆಗೆ: ಮಧ್ಯಾಹ್ನ ೧೨:೪೫ಕ್ಕೆ ಊಟದ ಪಾತ್ರೆಗಳನ್ನು ತಲುಪಿಸಿ' : 'e.g. Please deliver lunch containers by 12:45 PM to 2nd floor desk.'}
                  value={dailyForm.notes}
                  onChange={(e) => setDailyForm({ ...dailyForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingDaily}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem' }}
                >
                  <Save size={16} />
                  <span>
                    {savingDaily
                      ? currentLang === 'kn'
                        ? 'ಉಳಿಸಲಾಗುತ್ತಿದೆ...'
                        : 'Saving Changes...'
                      : currentLang === 'kn'
                      ? 'ದೈನಂದಿನ ಬೇಡಿಕೆಯನ್ನು ಉಳಿಸಿ'
                      : 'Save Daily Food Requirement'}
                  </span>
                </button>
              </div>
            </div>
          </form>

          {/* Today's Canteen Menu Preview */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
              <CookingPot size={20} color="#15803d" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>
                {currentLang === 'kn' ? 'ಕೇಂದ್ರ ಕ್ಯಾಂಟೀನ್‌ನ ಇಂದಿನ ಮೆನು' : "Today's Central Canteen Menu"}
              </h3>
            </div>

            {todayMenu && todayMenu.items && todayMenu.items.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {todayMenu.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#f8fafc',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>
                        {currentLang === 'kn' ? (item.nameKn || item.name || item.nameEn) : (item.nameEn || item.name || item.nameKn)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t(`categories.${item.category}`, item.category)}</div>
                    </div>
                    <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>
                      {currentLang === 'kn' ? 'ಶುದ್ಧ ಸಸ್ಯಾಹಾರಿ 🌱' : 'Pure Veg 🌱'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                {currentLang === 'kn' ? 'ಕ್ಯಾಂಟೀನ್ ಮುಖ್ಯಸ್ಥರು ಇಂದಿನ ಮೆನುವನ್ನು ಪ್ರಕಟಿಸಿಲ್ಲ.' : "Today's menu hasn't been published yet by Canteen Head."}
              </p>
            )}
          </div>

          {/* Deduction History */}
          {recurringOrder?.dailyRecurring?.deductionsHistory && recurringOrder.dailyRecurring.deductionsHistory.length > 0 && (
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <History size={18} color="#0369a1" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  {currentLang === 'kn' ? 'ಇತ್ತೀಚಿನ ದೈನಂದಿನ ದಾಸ್ತಾನು ಕಡಿತದ ಇತಿಹಾಸ' : 'Recent Daily Food Stock Auto-Deductions'}
                </h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>{currentLang === 'kn' ? 'ದಿನಾಂಕ' : 'Date'}</th>
                      <th>{currentLang === 'kn' ? 'ಆಹಾರದ ಅವಧಿ' : 'Meal Session'}</th>
                      <th>{currentLang === 'kn' ? 'ಜನರ ಸಂಖ್ಯೆ' : 'People Count'}</th>
                      <th>{currentLang === 'kn' ? 'ಕಡಿತದ ಸಮಯ' : 'Deduction Time'}</th>
                      <th>{currentLang === 'kn' ? 'ಸ್ಥಿತಿ' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recurringOrder.dailyRecurring.deductionsHistory.slice(-10).reverse().map((h, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: '600' }}>{h.date}</td>
                        <td>{currentLang === 'kn' ? t(`categories.${h.mealSession}`, h.mealSession) : h.mealSession}</td>
                        <td>{h.peopleCount} {currentLang === 'kn' ? 'ಜನರಿಗೆ' : 'people'}</td>
                        <td style={{ color: '#64748b' }}>{new Date(h.deductedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>
                          <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', fontWeight: '600', fontSize: '0.75rem' }}>
                            {currentLang === 'kn' ? '✅ ಕಡಿತಗೊಳಿಸಲಾಗಿದೆ' : '✅ Auto-Deducted'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* =========================================================================
           TAB 2: SPECIAL OCCASION / FUNCTION ORDERS
           ========================================================================= */
        <div>
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main)' }}>
                {currentLang === 'kn' ? 'ವಿಶೇಷ ಸಮಾರಂಭ ಮತ್ತು ಕಾರ್ಯಕ್ರಮಗಳ ಬೇಡಿಕೆಗಳು' : 'Special Occasion & Function Orders'}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {currentLang === 'kn'
                  ? 'ಶಾಖೆಯ ಸಮಾರಂಭಗಳು, ಶಿಬಿರಗಳು ಅಥವಾ ಸಭೆಗಳಿಗಾಗಿ ಆಹಾರದ ಬೇಡಿಕೆಯನ್ನು ಸಲ್ಲಿಸಿ. ಕ್ಯಾಂಟೀನ್ ಮುಖ್ಯಸ್ಥರು ಪರಿಶೀಲಿಸಿ ಅನುಮೋದಿಸಿದಾಗ ದಾಸ್ತಾನು ಕಡಿತವಾಗುತ್ತದೆ.'
                  : 'Submit food requirements for branch events, camps, celebrations, or meetings. Canteen Head will review and auto-deduct stock upon approval.'}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsEventModalOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} />
              <span>{currentLang === 'kn' ? '+ ಹೊಸ ಸಮಾರಂಭದ ಬೇಡಿಕೆ ಸಲ್ಲಿಸಿ' : '+ Request Food for Function / Event'}</span>
            </button>
          </div>

          {/* Special Events History Table */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {specialEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                <Calendar size={36} style={{ color: '#94a3b8', margin: '0 auto 0.75rem' }} />
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#334155' }}>No special function orders yet</h4>
                <p style={{ fontSize: '0.875rem', margin: 0 }}>
                  Click the button above to request food for any upcoming branch celebration or meeting.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Occasion / Event Name</th>
                      <th>Date & Meal</th>
                      <th>Head Count</th>
                      <th>Requested Dishes</th>
                      <th>Status & Approval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {specialEvents.map((evt) => {
                      const se = evt.specialEvent || {};
                      const isDeducted = evt.status === 'stock_deducted';
                      const isApproved = evt.status === 'approved';
                      const isPending = evt.status === 'pending';
                      const isRejected = evt.status === 'rejected';

                      return (
                        <tr key={evt._id}>
                          <td>
                            <div style={{ fontWeight: '700', color: '#1e293b' }}>{se.eventName}</div>
                            {se.specialInstructions && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                                Note: {se.specialInstructions}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: '600' }}>{se.eventDate}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{se.mealSession}</div>
                          </td>
                          <td style={{ fontWeight: '700', color: '#1e293b' }}>
                            {se.peopleCount} <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>people</span>
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
                                  {currentLang === 'kn' && d.dishNameKn ? d.dishNameKn : d.dishName}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            {isDeducted && (
                              <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: '12px', fontWeight: '700', fontSize: '0.75rem' }}>
                                {currentLang === 'kn' ? '✅ ಅನುಮೋದಿಸಲಾಗಿದೆ & ದಾಸ್ತಾನು ಕಡಿತ' : '✅ Approved & Stock Deducted'}
                              </span>
                            )}
                            {isApproved && (
                              <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: '12px', fontWeight: '700', fontSize: '0.75rem' }}>
                                {currentLang === 'kn' ? '🟢 ಮುಖ್ಯಸ್ಥರಿಂದ ಅನುಮೋದಿಸಲಾಗಿದೆ' : '🟢 Approved by Head'}
                              </span>
                            )}
                            {isPending && (
                              <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: '12px', fontWeight: '700', fontSize: '0.75rem' }}>
                                {currentLang === 'kn' ? '⏳ ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ' : '⏳ Pending Head Review'}
                              </span>
                            )}
                            {isRejected && (
                              <div>
                                <span style={{ background: '#fee2e2', color: '#dc2626', padding: '3px 10px', borderRadius: '12px', fontWeight: '700', fontSize: '0.75rem' }}>
                                  {currentLang === 'kn' ? '❌ ತಿರಸ್ಕೃತ' : '❌ Rejected'}
                                </span>
                                {evt.approvalDetails?.rejectionReason && (
                                  <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '2px' }}>
                                    {evt.approvalDetails.rejectionReason}
                                  </div>
                                )}
                              </div>
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
          SPECIAL EVENT ORDER SUBMISSION MODAL
          ========================================================================= */}
      {isEventModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '640px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                Request Food for Special Function / Event
              </h2>
              <button
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <XCircle size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmitEvent}>
              {/* Event Name */}
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: '600' }}>Event / Occasion Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Annual Blood Donation Camp, Board Meeting, Press Day"
                  value={eventForm.eventName}
                  onChange={(e) => setEventForm({ ...eventForm, eventName: e.target.value })}
                  required
                />
              </div>

              {/* Event Date & Meal Session */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: '600' }}>Event Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={eventForm.eventDate}
                    onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: '600' }}>Meal Session *</label>
                  <select
                    className="form-select"
                    value={eventForm.mealSession}
                    onChange={(e) => setEventForm({ ...eventForm, mealSession: e.target.value })}
                  >
                    <option value="Breakfast">{currentLang === 'kn' ? 'ಉಪಾಹಾರ (ತಿಂಡಿ)' : 'Breakfast'}</option>
                    <option value="Lunch">{currentLang === 'kn' ? 'ಮಧ್ಯಾಹ್ನದ ಊಟ' : 'Lunch'}</option>
                    <option value="Evening Snacks">{currentLang === 'kn' ? 'ಸಂಜೆ ತಿಂಡಿ' : 'Evening Snacks'}</option>
                    <option value="Dinner">{currentLang === 'kn' ? 'ರಾತ್ರಿ ಊಟ' : 'Dinner'}</option>
                  </select>
                </div>
              </div>

              {/* Expected Number of People */}
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: '600' }}>
                  {currentLang === 'kn' ? 'ಊಟದ ವ್ಯವಸ್ಥೆ ಮಾಡಬೇಕಾದ ಜನರ ಸಂಖ್ಯೆ *' : 'Number of People to Cater *'}
                </label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={eventForm.peopleCount}
                  onChange={(e) => setEventForm({ ...eventForm, peopleCount: e.target.value })}
                  required
                />
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  {[25, 50, 75, 100, 150, 200].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setEventForm({ ...eventForm, peopleCount: count })}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '2px 10px', fontSize: '0.75rem' }}
                    >
                      {count}p
                    </button>
                  ))}
                </div>
              </div>

              {/* Dish Selection Checklist with Search */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: '600' }}>
                    {currentLang === 'kn' ? 'ಸಮಾರಂಭಕ್ಕಾಗಿ ಖಾದ್ಯಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ *' : 'Select Dishes for Function *'}{' '}
                    ({eventForm.selectedRecipeIds.length} {currentLang === 'kn' ? 'ಆಯ್ಕೆಯಾಗಿದೆ' : 'selected'})
                  </label>
                </div>

                {/* Explanatory Reassurance Banner */}
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '10px',
                    fontSize: '0.8rem',
                    color: '#166534',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>✨</span>
                  <div>
                    <strong>
                      {currentLang === 'kn'
                        ? 'ಸಂಪೂರ್ಣ ಪಾಕವಿಧಾನಗಳ ಪಟ್ಟಿ:'
                        : 'Master Recipe Catalog:'}
                    </strong>{' '}
                    {currentLang === 'kn'
                      ? 'ಇಂದಿನ ದೈನಂದಿನ ಮೆನುವಿನಲ್ಲಿಲ್ಲದಿದ್ದರೂ ಸಹ, ಕ್ಯಾಂಟೀನ್‌ನ ಯಾವುದೇ ತಿನಿಸನ್ನು ನಿಮ್ಮ ಸಮಾರಂಭಕ್ಕಾಗಿ ಮುಕ್ತವಾಗಿ ಆಯ್ಕೆಮಾಡಬಹುದು.'
                      : 'You can order any dish from the canteen’s master recipe catalog for your function, not limited to today’s daily menu.'}
                  </div>
                </div>

                {/* Selected Dishes Tray with Quick Remove Buttons */}
                {eventForm.selectedRecipeIds.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#15803d', marginBottom: '4px' }}>
                      {currentLang === 'kn' ? 'ಆಯ್ಕೆಮಾಡಿದ ತಿನಿಸುಗಳು:' : 'Selected Banquet Dishes:'}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {eventForm.selectedRecipeIds.map((id) => {
                        const rec = availableRecipes.find((r) => r._id === id);
                        if (!rec) return null;
                        return (
                          <span
                            key={id}
                            style={{
                              background: '#dcfce7',
                              border: '1px solid #86efac',
                              color: '#15803d',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            {currentLang === 'kn' ? (rec.dishNameKn || rec.dishName) : (rec.dishName || rec.dishNameKn)}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRecipeSelection(rec);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#15803d',
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: '0.8rem',
                                lineHeight: 1,
                                fontWeight: '700',
                              }}
                              title={currentLang === 'kn' ? 'ತೆಗೆದುಹಾಕಿ' : 'Remove'}
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Category Filter Pills */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  {['All', 'Breakfast', 'Lunch', 'Evening Snacks', 'Dinner', 'Beverages', 'Sweets & Desserts'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      style={{
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        border: eventCategoryFilter === cat ? '1px solid #16a34a' : '1px solid #cbd5e1',
                        background: eventCategoryFilter === cat ? '#dcfce7' : '#ffffff',
                        color: eventCategoryFilter === cat ? '#15803d' : '#475569',
                        fontWeight: eventCategoryFilter === cat ? '700' : '500',
                        cursor: 'pointer',
                      }}
                      onClick={() => setEventCategoryFilter(cat)}
                    >
                      {currentLang === 'kn'
                        ? {
                            All: 'ಎಲ್ಲವೂ',
                            Breakfast: 'ಉಪಾಹಾರ',
                            Lunch: 'ಮಧ್ಯಾಹ್ನದ ಊಟ',
                            'Evening Snacks': 'ಸಂಜೆ ತಿಂಡಿ',
                            Dinner: 'ರಾತ್ರಿ ಊಟ',
                            Beverages: 'ಪಾನೀಯಗಳು',
                            'Sweets & Desserts': 'ಸಿಹಿ ತಿನಿಸುಗಳು',
                          }[cat] || cat
                        : cat}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.8rem', marginBottom: '8px' }}
                  placeholder={currentLang === 'kn' ? 'ಪಾಕವಿಧಾನವನ್ನು ಹುಡುಕಿ (ಉದಾ: ದೋಸೆ, ಬಾತ್, ಕೇಸರಿ, ಕಾಫಿ)...' : 'Filter available dishes (e.g. dosa, bath, sweet, coffee)...'}
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                />

                <div
                  style={{
                    maxHeight: '180px',
                    overflowY: 'auto',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px',
                    background: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  {filteredRecipesForEvent.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                      {currentLang === 'kn' ? 'ಯಾವುದೇ ಖಾದ್ಯ ಕಂಡುಬಂದಿಲ್ಲ.' : 'No dishes match your filter.'}
                    </div>
                  ) : (
                    filteredRecipesForEvent.map((recipe) => {
                      const isSelected = eventForm.selectedRecipeIds.includes(recipe._id);
                      return (
                        <div
                          key={recipe._id}
                          onClick={() => toggleRecipeSelection(recipe)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: isSelected ? '#dcfce7' : '#ffffff',
                            border: isSelected ? '1px solid #16a34a' : '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.1s ease',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by row click
                            style={{ cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1, fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: isSelected ? '700' : '500', color: '#1e293b' }}>
                              {currentLang === 'kn' ? (recipe.dishNameKn || recipe.dishName) : (recipe.dishName || recipe.dishNameKn)}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {currentLang === 'kn'
                              ? {
                                  Breakfast: 'ಉಪಾಹಾರ',
                                  Lunch: 'ಮಧ್ಯಾಹ್ನದ ಊಟ',
                                  'Evening Snacks': 'ಸಂಜೆ ತಿಂಡಿ',
                                  Dinner: 'ರಾತ್ರಿ ಊಟ',
                                  Beverages: 'ಪಾನೀಯಗಳು',
                                  'Sweets & Desserts': 'ಸಿಹಿ ತಿನಿಸುಗಳು',
                                }[recipe.category] || recipe.category
                              : recipe.category}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Special Instructions */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: '600' }}>
                  {currentLang === 'kn' ? 'ವಿಶೇಷ ಸೂಚನೆಗಳು / ವಿತರಣಾ ಸಮಯ' : 'Special Instructions / Delivery Timing'}
                </label>
                <textarea
                  className="form-input"
                  rows="2"
                  placeholder={
                    currentLang === 'kn'
                      ? 'ಉದಾ: ಬಡಿಸುವ ಚಮಚಗಳು ಮತ್ತು ತಟ್ಟೆಗಳನ್ನು ವ್ಯವಸ್ಥೆ ಮಾಡಿ. ಸರಿಯಾಗಿ ಮಧ್ಯಾಹ್ನ ೧:೧೫ ಕ್ಕೆ ಸಿದ್ಧಪಡಿಸಿ.'
                      : 'e.g. Please arrange serving spoons and plates. Ready by 1:15 PM sharp.'
                  }
                  value={eventForm.specialInstructions}
                  onChange={(e) => setEventForm({ ...eventForm, specialInstructions: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEventModalOpen(false)}
                >
                  {currentLang === 'kn' ? 'ರದ್ದುಮಾಡಿ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingEvent}
                >
                  {submittingEvent
                    ? (currentLang === 'kn' ? 'ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ...' : 'Submitting Order...')
                    : (currentLang === 'kn' ? 'ಸಮಾರಂಭದ ಬೇಡಿಕೆಯನ್ನು ಸಲ್ಲಿಸಿ' : 'Submit Function Request')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

