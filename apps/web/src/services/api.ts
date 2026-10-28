import axios from 'axios';

export const API_BASE_URL = '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('bidflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bidflow_token');
      localStorage.removeItem('bidflow_user');
    }
    return Promise.reject(error);
  },
);

export const api = {
  // Auth
  login: (data: any) => apiClient.post('/auth/login', data).then((res) => res.data),
  register: (data: any) => apiClient.post('/auth/register', data).then((res) => res.data),
  getCurrentUser: () => apiClient.get('/auth/me').then((res) => res.data),

  // Listings
  getListings: (params?: any) => apiClient.get('/listings', { params }).then((res) => res.data),
  getListing: (id: string) => apiClient.get(`/listings/${id}`).then((res) => res.data),
  createListing: (data: any) => apiClient.post('/listings', data).then((res) => res.data),
  deleteListing: (id: string) => apiClient.delete(`/listings/${id}`).then((res) => res.data),

  // Auctions
  getAuctions: (params?: any) => apiClient.get('/auctions', { params }).then((res) => res.data),
  getAuction: (id: string) => apiClient.get(`/auctions/${id}`).then((res) => res.data),
  toggleWatchlist: (id: string) => apiClient.post(`/auctions/${id}/watchlist`).then((res) => res.data),

  // Bidding (With optional Idempotency-Key)
  placeBid: (auctionId: string, amount: number, idempotencyKey?: string) =>
    apiClient
      .post(
        `/auctions/${auctionId}/bids`,
        { amount },
        {
          headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
        },
      )
      .then((res) => res.data),
  getAuctionBids: (auctionId: string) => apiClient.get(`/auctions/${auctionId}/bids`).then((res) => res.data),

  // User Dashboards
  getMyBids: () => apiClient.get('/users/me/bids').then((res) => res.data),
  getMyAuctions: () => apiClient.get('/users/me/auctions').then((res) => res.data),
  getMyWatchlist: () => apiClient.get('/users/me/watchlist').then((res) => res.data),
  getUserProfile: (id: string) => apiClient.get(`/users/${id}/profile`).then((res) => res.data),

  // Notifications
  getNotifications: () => apiClient.get('/notifications').then((res) => res.data),
  markNotificationRead: (id: string) => apiClient.patch(`/notifications/${id}/read`).then((res) => res.data),
  markAllNotificationsRead: () => apiClient.patch('/notifications/read-all').then((res) => res.data),

  // Admin
  getAdminUsers: () => apiClient.get('/admin/users').then((res) => res.data),
  setAdminUserSuspension: (id: string, isSuspended: boolean, reason: string) =>
    apiClient.patch(`/admin/users/${id}/suspend`, { isSuspended, reason }).then((res) => res.data),
  getAdminReports: () => apiClient.get('/admin/reports').then((res) => res.data),
  moderateListing: (id: string, action: 'SUSPEND' | 'APPROVE', notes: string) =>
    apiClient.post(`/admin/listings/${id}/moderate`, { action, notes }).then((res) => res.data),
  getAuditLogs: () => apiClient.get('/admin/audit-logs').then((res) => res.data),
};
