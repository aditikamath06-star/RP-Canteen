// Centralized API client service for RP Canteen

const API_BASE = '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('rp_canteen_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.message || `Request failed with status ${res.status}`;
    const error = new Error(errorMsg);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
};

export const api = {
  // Authentication
  async login(identifier, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    return handleResponse(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async logout() {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch {
      // Ignore network errors on logout
    }
    localStorage.removeItem('rp_canteen_token');
    localStorage.removeItem('rp_canteen_user');
  },

  async updateLanguagePreference(language) {
    const res = await fetch(`${API_BASE}/auth/language`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ language }),
    });
    return handleResponse(res);
  },

  async translateText(text, from = 'auto', to = 'kn') {
    const res = await fetch(`${API_BASE}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, from, to }),
    });
    return handleResponse(res);
  },

  // Public Menu Endpoints (includes staff details if logged in)
  async getPublishedMenu(date) {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    const res = await fetch(`${API_BASE}/menus/published${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getPublishedDates() {
    const res = await fetch(`${API_BASE}/menus/published-dates`);
    return handleResponse(res);
  },

  // Staff Menu Management
  async getAllMenus() {
    const res = await fetch(`${API_BASE}/menus/all`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createMenu(menuData) {
    const res = await fetch(`${API_BASE}/menus`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(menuData),
    });
    return handleResponse(res);
  },

  async updateMenu(id, menuData) {
    const res = await fetch(`${API_BASE}/menus/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(menuData),
    });
    return handleResponse(res);
  },

  async publishMenu(id, status) {
    const res = await fetch(`${API_BASE}/menus/${id}/publish`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    return handleResponse(res);
  },

  async toggleMenuItemAvailability(menuId, itemId, isAvailable) {
    const res = await fetch(`${API_BASE}/menus/${menuId}/item-availability`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ itemId, isAvailable }),
    });
    return handleResponse(res);
  },

  async recordDishWastage(menuId, itemId, wastageData) {
    const res = await fetch(`${API_BASE}/menus/${menuId}/items/${itemId}/wastage`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(wastageData),
    });
    return handleResponse(res);
  },

  async deleteMenu(id) {
    const res = await fetch(`${API_BASE}/menus/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async submitDishFeedback(menuId, itemId, feedbackData) {
    const res = await fetch(`${API_BASE}/menus/${menuId}/items/${itemId}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedbackData),
    });
    return handleResponse(res);
  },

  // Inventory Endpoints
  async getInventorySummary() {
    const res = await fetch(`${API_BASE}/inventory/summary`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getInventory(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/inventory?${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createInventoryItem(itemData) {
    const res = await fetch(`${API_BASE}/inventory`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(itemData),
    });
    return handleResponse(res);
  },

  async updateInventoryItem(id, itemData) {
    const res = await fetch(`${API_BASE}/inventory/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(itemData),
    });
    return handleResponse(res);
  },

  async adjustStock(id, movementData) {
    const res = await fetch(`${API_BASE}/inventory/${id}/stock`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(movementData),
    });
    return handleResponse(res);
  },

  async updateStock(id, movementData) {
    return this.adjustStock(id, movementData);
  },

  async archiveInventoryItem(id, archive = true) {
    const res = await fetch(`${API_BASE}/inventory/${id}/archive`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ archive }),
    });
    return handleResponse(res);
  },

  // Stock Movement History
  async getMovements(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/movements?${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Staff Account Management (Head only)
  async getStaff() {
    const res = await fetch(`${API_BASE}/staff`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createStaff(staffData) {
    const res = await fetch(`${API_BASE}/staff`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(staffData),
    });
    return handleResponse(res);
  },

  async toggleStaffStatus(id, isActive) {
    const res = await fetch(`${API_BASE}/staff/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isActive }),
    });
    return handleResponse(res);
  },

  // Audit Logs (Head only)
  async getAuditLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/audit-logs?${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Recipes & Preparation Management
  async getRecipes() {
    const res = await fetch(`${API_BASE}/recipes`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getRecipeById(id) {
    const res = await fetch(`${API_BASE}/recipes/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createRecipe(recipeData) {
    const res = await fetch(`${API_BASE}/recipes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(recipeData),
    });
    return handleResponse(res);
  },

  async updateRecipe(id, recipeData) {
    const res = await fetch(`${API_BASE}/recipes/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(recipeData),
    });
    return handleResponse(res);
  },

  async deleteRecipe(id) {
    const res = await fetch(`${API_BASE}/recipes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async prepareRecipe(id, { targetPeople, notes = '' }) {
    const res = await fetch(`${API_BASE}/recipes/${id}/prepare`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ targetPeople, notes }),
    });
    return handleResponse(res);
  },

  // Branch Orders & Indents
  async getMyBranchOrder() {
    const res = await fetch(`${API_BASE}/branch-orders/my-branch`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async updateBranchRecurringOrder(data) {
    const res = await fetch(`${API_BASE}/branch-orders/recurring`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async submitBranchSpecialEventOrder(data) {
    const res = await fetch(`${API_BASE}/branch-orders/special-event`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getAllBranchOrders() {
    const res = await fetch(`${API_BASE}/branch-orders/all`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async approveAndDeductBranchSpecialEvent(id) {
    const res = await fetch(`${API_BASE}/branch-orders/special-event/${id}/approve-and-deduct`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async rejectBranchSpecialEvent(id, reason) {
    const res = await fetch(`${API_BASE}/branch-orders/special-event/${id}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
    return handleResponse(res);
  },

  async executeBranchDailyDeduct(data) {
    const res = await fetch(`${API_BASE}/branch-orders/daily-deduct`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Reports & Analytics (Head only)
  async getReportAnalytics(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/reports/analytics?${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getReportCsvDownloadUrl(params = {}) {
    const token = localStorage.getItem('rp_canteen_token') || localStorage.getItem('token') || '';
    const query = new URLSearchParams({ ...params, ...(token ? { token } : {}) }).toString();
    return `${API_BASE}/reports/export-csv?${query}`;
  },
};
