const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const getToken = () => localStorage.getItem('admin_token')

const req = async (method, path, body, isForm = false) => {
  const headers = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!isForm) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data
}

export const api = {
  // Auth
  login: (email, password) => req('POST', '/auth/login', { email, password }),
  me: () => req('GET', '/auth/me'),

  // Dashboard
  stats: () => req('GET', '/dashboard/stats'),

  // Products
  getProducts: (params = {}) => req('GET', '/products?' + new URLSearchParams(params)),
  getProduct: (id) => req('GET', `/products/${id}`),
  createProduct: (form) => req('POST', '/products', form, true),
  updateProduct: (id, form) => req('PUT', `/products/${id}`, form, true),
  deleteProduct: (id) => req('DELETE', `/products/${id}`),
  toggleProduct: (id) => req('PATCH', `/products/${id}/toggle`),

  // Orders
  getOrders: (params = {}) => req('GET', '/orders?' + new URLSearchParams(params)),
  getOrder: (id) => req('GET', `/orders/${id}`),
  updateOrderStatus: (id, status) => req('PATCH', `/orders/${id}/status`, { status }),

  // Users
  getUsers: (params = {}) => req('GET', '/users?' + new URLSearchParams(params)),
  getUser: (id) => req('GET', `/users/${id}`),
  toggleUser: (id) => req('PATCH', `/users/${id}/toggle`),

  // Banners
  getBanners: () => req('GET', '/banners'),
  createBanner: (form) => req('POST', '/banners', form, true),
  updateBanner: (id, form) => req('PUT', `/banners/${id}`, form, true),
  deleteBanner: (id) => req('DELETE', `/banners/${id}`),
  toggleBanner: (id) => req('PATCH', `/banners/${id}/toggle`),

  // Reviews (admin)
  getReviews: (params = {}) => req('GET', '/admin/reviews?' + new URLSearchParams(params)),
  updateReview: (id, data) => req('PUT', `/admin/reviews/${id}`, data),
  deleteReview: (id) => req('DELETE', `/reviews/${id}`),

  // Coupons (admin)
  getCoupons: () => req('GET', '/coupons/admin'),
  createCoupon: (data) => req('POST', '/coupons/admin', data),
  updateCoupon: (id, data) => req('PUT', `/coupons/admin/${id}`, data),
  deleteCoupon: (id) => req('DELETE', `/coupons/admin/${id}`),
  toggleCoupon: (id) => req('PATCH', `/coupons/admin/${id}/toggle`),
}
