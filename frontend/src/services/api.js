import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  login: async (username, password) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    
    const response = await api.post('/auth/token', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/users/me');
    return response.data;
  },
};

// Stays API
export const staysAPI = {
  getPendingStays: async () => {
    const response = await api.get('/stays/pending');
    return response.data;
  },
  
  getActiveStays: async () => {
    const response = await api.get('/stays/active');
    return response.data;
  },
  
  checkIn: async (stayId, spotType) => {
    const response = await api.post(`/stays/${stayId}/check-in`, null, {
      params: { spot_type: spotType }
    });
    return response.data;
  },
  
  checkOut: async (stayId, finalPrice) => {
    const response = await api.post(`/stays/${stayId}/check-out`, null, {
      params: { final_price: finalPrice }
    });
    return response.data;
  },
  
  discard: async (stayId, reason) => {
    const response = await api.post(`/stays/${stayId}/discard`, null, {
      params: { reason }
    });
    return response.data;
  },
  
  createManualEntry: async (licensePlate, vehicleType, spotType) => {
    const response = await api.post('/stays/manual', null, {
      params: {
        license_plate: licensePlate,
        vehicle_type: vehicleType,
        spot_type: spotType
      }
    });
    return response.data;
  },
    // Nuevo: Registrar pago adelantado
  registerPrepayment: async (stayId, prepaymentData) => {
    const response = await fetch(`/api/stays/${stayId}/prepayment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(prepaymentData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error registering prepayment');
    }
    
    return response.json();
  },

  // Nuevo: Imprimir ticket
  printTicket: async (ticketData) => {
    const response = await fetch('/api/print-ticket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(ticketData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error printing ticket');
    }
    
    return response.json();
  },

  // Modificar el método updateStay existente para incluir payment_status
  updateStay: async (stayId, updateData) => {
    const response = await fetch(`/api/stays/${stayId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error updating stay');
    }
    
    return response.json();
  },

  // Añadir log de historial
  addHistoryLog: async (logData) => {
    const response = await fetch('/api/history-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(logData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error adding history log');
    }
    
    return response.json();
  }
};

// Dashboard API
export const dashboardAPI = {
  getData: async () => {
    const response = await api.get('/dashboard/data');
    return response.data;
  },
};

// History API (REEMPLAZA la sección existente)
export const historyAPI = {
  getLogs: async (params = {}) => {
    const response = await api.get('/history/', { params });
    return response.data;
  },
  getStats: async (days = 30) => {
    const response = await api.get('/history/stats/', {
      params: { days }
    });
    return response.data;
  },
};