import axios from 'axios';

// Use VITE_API_URL from .env / .env.production — fallback to localhost for dev.
// In production set: VITE_API_URL=https://api.yourdomain.com/api
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh });
        localStorage.setItem('access_token', data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (u, p) => api.post('/auth/login/', { username: u, password: p }),
  me: () => api.get('/users/me/'),
  updateMe: (data) => api.patch('/users/update_me/', data),
  forgotPassword: (username) => api.post('/auth/forgot-password/', { username }),
  resetPassword: (username, otp, new_password) => api.post('/auth/reset-password/', { username, otp, new_password }),
};
export const usersApi = {
  list: (params) => api.get('/users/', { params }),
  get: (id) => api.get(`/users/${id}/`),
  create: (data) => api.post('/users/', data),
  update: (id, data) => api.patch(`/users/${id}/`, data),
  delete: (id) => api.delete(`/users/${id}/`),
  staffList: () => api.get('/users/staff_list/'),
  setRole: (id, role) => api.post(`/users/${id}/set_role/`, { role }),
};
export const projectsApi = {
  list:          ()           => api.get('/projects/'),
  get:           (id)         => api.get(`/projects/${id}/`),
  create:        (data)       => api.post('/projects/', data),
  update:        (id, data)   => api.patch(`/projects/${id}/`, data),
  delete:        (id)         => api.delete(`/projects/${id}/`),
  plots:         (id, params) => api.get(`/projects/${id}/plots/`, { params }),
  dashboardStats:()           => api.get('/projects/dashboard_stats/'),
  // Plots Excel workflow
  plotTemplate:  ()           => api.get('/projects/plot_template/', { responseType: 'blob' }),
  importPlots:   (id, fd)     => api.post(`/projects/${id}/import_plots/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  clearPlots:    (id)         => api.delete(`/projects/${id}/clear_plots/`),
};
export const plotsApi = {
  list:   (params)     => api.get('/plots/', { params }),
  create: (data)       => api.post('/plots/', data),
  update: (id, data)   => api.patch(`/plots/${id}/`, data),
  delete: (id)         => api.delete(`/plots/${id}/`),
};
export const attendanceApi = {
  list: (params) => api.get('/attendance/', { params }),
  todayStatus: () => api.get('/attendance/today_status/'),
  punchIn: (data) => api.post('/attendance/punch_in/', data),
  punchOut: (data) => api.post('/attendance/punch_out/', data),
};
export const companyApi = {
  get:  ()     => api.get('/company-profile/'),
  save: (data) => api.post('/company-profile/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};
export const officeLocationsApi = {
  list:   ()          => api.get('/office-locations/'),
  create: (data)      => api.post('/office-locations/', data),
  update: (id, data)  => api.patch(`/office-locations/${id}/`, data),
  delete: (id)        => api.delete(`/office-locations/${id}/`),
};
export const attendanceSettingsApi = {
  get:    ()     => api.get('/attendance-settings/'),
  save:   (data) => api.post('/attendance-settings/', data),
};
export const reportsApi = {
  // Schema — returns REPORT_SCHEMA with field definitions per type
  schema:     ()               => api.get('/reports/schema/'),
  // CRUD (upsert by user + report_date + report_type)
  list:       (params)         => api.get('/reports/', { params }),
  get:        (id)             => api.get(`/reports/${id}/`),
  save:       (data)           => api.post('/reports/', data),
  update:     (id, data)       => api.patch(`/reports/${id}/`, data),
  // Admin: add notes / change status
  review:     (id, data)       => api.patch(`/reports/${id}/review/`, data),
  // Admin/SuperAdmin: team view
  team:       (params)         => api.get('/reports/team/', { params }),
  // Download blank xlsx template for a given report_type
  template:   (reportType)     => api.get('/reports/template/', {
    params:       { report_type: reportType },
    responseType: 'blob',
  }),
  // Upload filled xlsx/csv to import historical data
  importData: (reportType, file) => {
    const fd = new FormData();
    fd.append('report_type', reportType);
    fd.append('file', file);
    return api.post('/reports/import/', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
export const feedbackApi = {
  list: () => api.get('/feedback/'),
  myList: () => api.get('/feedback/my/'),
  create: (data) => api.post('/feedback/', data),
  reply: (id, data) => api.patch(`/feedback/${id}/reply/`, data),
  markRead: (id) => api.patch(`/feedback/${id}/mark_read/`),
};
export const todosApi = {
  list: (params) => api.get('/todos/', { params }),
  create: (data) => api.post('/todos/', data),
  update: (id, data) => api.patch(`/todos/${id}/`, data),
  delete: (id) => api.delete(`/todos/${id}/`),
  complete: (id) => api.post(`/todos/${id}/complete/`),
  uncomplete: (id) => api.post(`/todos/${id}/uncomplete/`),
  toggleComplete: (id) => api.post(`/todos/${id}/toggle_complete/`),
};
export const tutorialsApi = {
  list:     ()          => api.get('/tutorials/'),
  upload:   (data)      => api.post('/tutorials/', data),
  delete:   (id)        => api.delete(`/tutorials/${id}/`),
  view:     (id)        => api.post(`/tutorials/${id}/view/`),
  limits:   ()          => api.get('/tutorials/limits/'),
  // Authenticated file download (Content-Disposition: attachment)
  download: (id)        => api.get(`/tutorials/${id}/download/`, { responseType: 'blob' }),
  // Authenticated inline stream URL (for iframes, video src, etc.)
  streamUrl:(id)        => `${api.defaults.baseURL}/tutorials/${id}/stream/`,
};
export const achievementsApi = {
  leaderboard:  (params)     => api.get('/achievements/leaderboard/', { params }),
  list:         (params)     => api.get('/achievements/', { params }),
  labels:       (period_type) => api.get('/achievements/labels/', { params: { period_type } }),
  create:       (data)       => api.post('/achievements/', data),
  update:       (id, data)   => api.patch(`/achievements/${id}/`, data),
};

export const teamAchievementsApi = {
  // Full bucket view (sales ranked + pre-sales data)
  buckets:          (params) => api.get('/team-achievements/buckets/', { params }),
  // Sales-only rankings
  rankings:         (params) => api.get('/team-achievements/rankings/', { params }),
  availablePeriods: ()       => api.get('/team-achievements/available_periods/'),
  members:          (params) => api.get('/team-achievements/members/', { params }),
  list:             (params) => api.get('/team-achievements/', { params }),
  // Admin: re-rank all periods to fix any dirty-data rank gaps
  recalculateAll:   ()       => api.post('/team-achievements/recalculate_all/'),
  // Inline CRUD for TeamAchievement records
  createRecord:     (data)   => api.post('/team-achievements/', data),
  updateRecord:     (id, data) => api.patch(`/team-achievements/${id}/`, data),
  deleteRecord:     (id)     => api.delete(`/team-achievements/${id}/`),
  // Upload (pass team_type='sales'|'pre_sales' to lock type for all rows)
  upload:           (formData) => api.post('/team-achievements/upload/', formData, {
                       headers: { 'Content-Type': 'multipart/form-data' },
                     }),
  // Templates (authenticated blob download)
  downloadSalesTemplate:    () => api.get('/team-achievements/template/?team_type=sales',     { responseType: 'blob' }),
  downloadPresalesTemplate: () => api.get('/team-achievements/template/?team_type=pre_sales',  { responseType: 'blob' }),
  // History
  history:          (params) => api.get('/upload-history/', { params }),
  historyErrors:    (id)     => api.get(`/upload-history/${id}/errors/`),
};

export const teamMembersApi = {
  list:   (params) => api.get('/team-members/', { params }),
  create: (data)   => api.post('/team-members/', data),
  update: (id, data) => api.patch(`/team-members/${id}/`, data),
  delete: (id)     => api.delete(`/team-members/${id}/`),
};
export const leavesApi = {
  list: (params) => api.get('/leaves/', { params }),
  myList: () => api.get('/leaves/my/'),
  create: (data) => api.post('/leaves/', data),
  review: (id, data) => api.patch(`/leaves/${id}/review/`, data),
};

export const notificationsApi = {
  list: () => api.get('/notifications/'),
  unread: () => api.get('/notifications/unread/'),
  markRead: (id) => api.post(`/notifications/${id}/mark_read/`),
  markAllRead: () => api.post('/notifications/mark_all_read/'),
  pushSubscribe: (sub) => api.post('/notifications/push/subscribe/', sub),
  pushUnsubscribe: (endpoint) => api.post('/notifications/push/unsubscribe/', { endpoint }),
  vapidKey: () => api.get('/notifications/push/vapid-key/'),
};
export const offersApi = {
  active: () => api.get('/offers/active/'),
  list: () => api.get('/offers/'),
  create: (data) => api.post('/offers/', data),
  update: (id, data) => api.patch(`/offers/${id}/`, data),
  delete: (id) => api.delete(`/offers/${id}/`),
};
export const bannersApi = {
  active: () => api.get('/banners/active/'),
  list: () => api.get('/banners/'),
  create: (data) => api.post('/banners/', data),
  update: (id, data) => api.patch(`/banners/${id}/`, data),
  delete: (id) => api.delete(`/banners/${id}/`),
};
export const excelImportApi = {
  import: (file, type) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    return api.post('/excel-import/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export default api;
