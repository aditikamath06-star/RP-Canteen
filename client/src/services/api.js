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

  // Public Menu Endpoints
  async getPublishedMenu(date) {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    const res = await fetch(`${API_BASE}/menus/published${query}`);
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

  async deleteMenu(id) {
    const res = await fetch(`${API_BASE}/menus/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
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
};
