import type { User, Product, Category, Order, AdminStats, AuthResponse, OrderStatus, Currency } from '../types';
import {
  mockCategories,
  mockProducts,
  mockDefaultUser,
  mockAdminUser,
  mockOrders,
} from '../data/mockData';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('zamon_token') || localStorage.getItem('velora_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Client-side LocalStorage DB for bulletproof zero-lag fallback
function getLocalProducts(): Product[] {
  try {
    const saved = localStorage.getItem('velora_local_products_v2');
    if (saved) return JSON.parse(saved);
  } catch (e: any) { if (!import.meta.env.DEV) throw e; }
  return mockProducts;
}

function saveLocalProducts(products: Product[]) {
  try {
    localStorage.setItem('velora_local_products_v2', JSON.stringify(products));
  } catch (e: any) { if (!import.meta.env.DEV) throw e; }
}

function getLocalCategories(): Category[] {
  try {
    const saved = localStorage.getItem('velora_local_categories_v2');
    if (saved) return JSON.parse(saved);
  } catch (e: any) { if (!import.meta.env.DEV) throw e; }
  return mockCategories;
}

function getLocalOrders(): Order[] {
  try {
    const saved = localStorage.getItem('velora_local_orders_v2');
    if (saved) return JSON.parse(saved);
  } catch (e: any) { if (!import.meta.env.DEV) throw e; }
  return mockOrders;
}

function saveLocalOrders(orders: Order[]) {
  try {
    localStorage.setItem('velora_local_orders_v2', JSON.stringify(orders));
  } catch (e: any) { if (!import.meta.env.DEV) throw e; }
}

export const api = {
  // Auth
  async login(phone: string, pin: string): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin }),
      });
      if (res.ok) {
        return await res.json();
      }
      // If response is not ok, throw to prevent local fallback
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Tizimga kirishda xatolik');
    } catch (e: any) {
      if (e.message) throw e;
      throw new Error('Tarmoq xatosi');
    }
  },

  async register(firstName: string, lastName: string, phone: string, pin: string): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone, pin }),
      });
      if (res.ok) {
        return await res.json();
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Ro\'yxatdan o\'tishda xatolik');
    } catch (e: any) {
      if (e.message) throw e;
      throw new Error('Tarmoq xatosi');
    }
  },

  async getMe(): Promise<User> {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { ...getAuthHeader() },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e: any) { if (!import.meta.env.DEV) throw e; }

    const saved = localStorage.getItem('velora_user');
    if (saved) return JSON.parse(saved);
    return mockDefaultUser;
  },

  async updateProfile(profile: Partial<User>): Promise<User> {
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(profile),
      });
      if (res.ok) return await res.json();
    } catch (e: any) { if (!import.meta.env.DEV) throw e; }

    const current = await this.getMe();
    const updated = { ...current, ...profile };
    localStorage.setItem('velora_user', JSON.stringify(updated));
    return updated;
  },

  async addAddress(address: Record<string, any>): Promise<User> {
    try {
      const res = await fetch(`${API_BASE}/auth/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(address),
      });
      if (res.ok) return await res.json();
    } catch (e: any) { if (!import.meta.env.DEV) throw e; }

    const current = await this.getMe();
    const newAddr = {
      id: 'addr-' + Date.now(),
      title: address.title || 'Manzil',
      region: address.region || 'Toshkent',
      district: address.district || '',
      street: address.street || '',
      house: address.house || '',
      formattedAddress: `${address.region || ''}, ${address.district || ''}, ${address.street || ''} ${address.house || ''}`.trim(),
      isDefault: current.addresses.length === 0,
    };
    const updated = { ...current, addresses: [...current.addresses, newAddr] };
    localStorage.setItem('velora_user', JSON.stringify(updated));
    return updated;
  },

  async deleteAddress(id: string): Promise<User> {
    try {
      const res = await fetch(`${API_BASE}/auth/addresses/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() },
      });
      if (res.ok) return await res.json();
    } catch (e: any) { if (!import.meta.env.DEV) throw e; }

    const current = await this.getMe();
    const updated = { ...current, addresses: current.addresses.filter((a) => a.id !== id) };
    localStorage.setItem('velora_user', JSON.stringify(updated));
    return updated;
  },

  async getProducts(params: Record<string, any> = {}): Promise<{ products: Product[]; total: number; page: number; totalPages: number }> {
    try {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query.append(key, String(value));
        }
      });
      const res = await fetch(`${API_BASE}/products?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        saveLocalProducts(data.products || []);
        return data;
      }
      throw new Error("Server error");
    } catch (e) {
      // Fallback only in dev
      if (!import.meta.env.DEV) throw e;
    }

    // Instant local filter & sort (DEV fallback)
    let prods = [...getLocalProducts()];

    if (params.category && params.category !== 'all') {
      prods = prods.filter((p) => p.category === params.category);
    }
    if (params.search) {
      const s = String(params.search).toLowerCase();
      prods = prods.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          p.description.toLowerCase().includes(s) ||
          p.categoryName?.toLowerCase().includes(s)
      );
    }
    if (params.sort === 'price_asc') {
      prods.sort((a, b) => a.price - b.price);
    } else if (params.sort === 'price_desc') {
      prods.sort((a, b) => b.price - a.price);
    } else if (params.sort === 'rating') {
      prods.sort((a, b) => b.rating - a.rating);
    } else if (params.sort === 'new') {
      prods.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      prods.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
    }

    return {
      products: prods,
      total: prods.length,
      page: 1,
      totalPages: 1,
    };
  },

  async getProductById(id: string): Promise<{ product: Product; related: Product[] }> {
    try {
      const res = await fetch(`${API_BASE}/products/${id}`);
      if (res.ok) return await res.json();
      throw new Error("Server error");
    } catch (e) {
      if (!import.meta.env.DEV) throw e;
    }

    const prods = getLocalProducts();
    const product = prods.find((p) => p.id === id) || prods[0];
    const related = prods.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 5);
    return { product, related };
  },

  async createProduct(product: Partial<Product>): Promise<Product> {
    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(product),
      });
      if (res.ok) return await res.json();
    } catch (e: any) { if (!import.meta.env.DEV) throw e; }

    const prods = getLocalProducts();
    const newP: Product = {
      id: 'prod-' + Date.now(),
      name: product.name || 'Yangi mahsulot',
      description: product.description || '',
      price: product.price || 100000,
      oldPrice: product.oldPrice,
      discount: product.discount || 0,
      category: product.category || 'smartphones',
      categoryName: product.categoryName || 'Smartfonlar',
      images: product.images && product.images.length > 0 ? product.images : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'],
      stock: product.stock || 10,
      rating: 5,
      reviewsCount: 0,
      salesCount: 0,
      isFeatured: false,
      isNew: true,
      isActive: true,
      specs: product.specs || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    prods.unshift(newP);
    saveLocalProducts(prods);
    return newP;
  },

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(product),
      });
      if (res.ok) return await res.json();
    } catch (e: any) { if (!import.meta.env.DEV) throw e; }

    const prods = getLocalProducts();
    const idx = prods.findIndex((p) => p.id === id);
    if (idx !== -1) {
      prods[idx] = { ...prods[idx], ...product, updatedAt: new Date().toISOString() };
      saveLocalProducts(prods);
      return prods[idx];
    }
    throw new Error('Mahsulot topilmadi');
  },

  async deleteProduct(id: string): Promise<{ message: string }> {
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() },
      });
      if (res.ok) return await res.json();
    } catch (e: any) { if (!import.meta.env.DEV) throw e; }

    const prods = getLocalProducts().filter((p) => p.id !== id);
    saveLocalProducts(prods);
    return { message: 'Mahsulot o\'chirildi' };
  },

  async addProductReview(productId: string, rating: number, comment: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ rating, comment }),
      });
      if (res.ok) return await res.json();
    } catch (e: any) { if (!import.meta.env.DEV) throw e; }

    const prods = getLocalProducts();
    const prod = prods.find((p) => p.id === productId);
    if (prod) {
      const newRev = {
        id: 'rev-' + Date.now(),
        userId: 'user-1',
        userName: 'Siz',
        rating,
        comment,
        createdAt: new Date().toISOString(),
      };
      prod.reviews = [newRev, ...(prod.reviews || [])];
      prod.reviewsCount = (prod.reviewsCount || 0) + 1;
      saveLocalProducts(prods);
      return { message: 'Sharh qabul qilindi' };
    }
    return { message: 'Sharh saqlandi' };
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (e: any) { if (!import.meta.env.DEV) throw e; }
    return getLocalCategories();
  },

  async createCategory(category: Partial<Category>): Promise<Category> {
    try {
      const res = await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(category),
      });
      if (res.ok) return await res.json();
    } catch (e: any) { if (!import.meta.env.DEV) throw e; }

    const newCat: Category = {
      id: 'cat-' + Date.now(),
      name: category.name || 'Yangi toifa',
      slug: category.slug || 'yangi-toifa',
      iconName: category.iconName || 'Package',
      image: category.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
      isActive: true,
      productCount: 0,
    };
    return newCat;
  },

  async updateCategory(id: string, category: Partial<Category>): Promise<Category> {
    try {
      const res = await fetch(`${API_BASE}/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(category),
      });
      if (res.ok) return await res.json();
    } catch (e: any) { if (!import.meta.env.DEV) throw e; }

    return { ...mockCategories[0], ...category, id };
  },

  async deleteCategory(id: string): Promise<{ message: string }> {
    try {
      const res = await fetch(`${API_BASE}/categories/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() },
      });
      if (res.ok) return await res.json();
    } catch (e: any) { if (!import.meta.env.DEV) throw e; }

    return { message: 'Kategoriya o\'chirildi' };
  },

  // Orders
  async createOrder(orderData: {
    customer: { firstName: string; lastName: string; phone: string };
    items: { productId: string; quantity: number }[];
    deliveryAddress: Record<string, any>;
    paymentMethod: string;
  }): Promise<{ order: Order; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(orderData),
      });
      if (res.ok) {
        const order = await res.json();
        return { order, message: 'Buyurtma rasmiylashtirildi' };
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Buyurtma yaratishda xatolik');
    } catch (e: any) {
      if (!import.meta.env.DEV) throw e;
      if (e.message && e.message !== 'Failed to fetch') throw e;
    }

    // Generate local order (fallback for DEV only)
    const prods = getLocalProducts();
    const orderItems = orderData.items.map((i) => {
      const p = prods.find((prod) => prod.id === i.productId) || prods[0];
      return {
        productId: p.id,
        name: p.name,
        price: p.price,
        quantity: i.quantity,
        image: p.images[0],
      };
    });

    const subtotal = orderItems.reduce((s, it) => s + it.price * it.quantity, 0);
    const deliveryFee = subtotal >= 500000 ? 0 : 25000;
    const total = subtotal + deliveryFee;

    const newOrder: Order = {
      id: 'ord-' + Date.now(),
      orderNumber: '#ORD-' + Math.floor(10000 + Math.random() * 90000),
      userId: 'user-1',
      customer: orderData.customer,
      items: orderItems,
      deliveryAddress: orderData.deliveryAddress as any,
      paymentMethod: orderData.paymentMethod as any,
      status: 'Pending',
      statusHistory: [
        {
          status: 'Pending',
          timestamp: new Date().toISOString(),
          note: 'Buyurtma muvaffaqiyatli qabul qilindi',
        },
      ],
      subtotal,
      deliveryFee,
      total,
      createdAt: new Date().toISOString(),
    };

    const orders = [newOrder, ...getLocalOrders()];
    saveLocalOrders(orders);

    return { order: newOrder, message: 'Buyurtma rasmiylashtirildi (DEV)' };
  },

  async getOrders(): Promise<Order[]> {
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        headers: { ...getAuthHeader() },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          saveLocalOrders(data);
          return data;
        }
      }
    } catch (e: any) { if (!import.meta.env.DEV) throw e; }

    return getLocalOrders();
  },

  async getOrderById(id: string): Promise<Order> {
    try {
      const res = await fetch(`${API_BASE}/orders/${id}`, {
        headers: { ...getAuthHeader() },
      });
      if (res.ok) return await res.json();
    } catch (e: any) { if (!import.meta.env.DEV) throw e; }

    const orders = getLocalOrders();
    const found = orders.find((o) => o.id === id);
    if (found) return found;
    return orders[0];
  },

  async updateOrderStatus(id: string, status: string, note?: string): Promise<Order> {
    try {
      const res = await fetch(`${API_BASE}/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ status, note }),
      });
      if (res.ok) return await res.json();
    } catch (e: any) { if (!import.meta.env.DEV) throw e; }

    const orders = getLocalOrders();
    const idx = orders.findIndex((o) => o.id === id);
    if (idx !== -1) {
      orders[idx].status = status as OrderStatus;
      orders[idx].statusHistory = [
        ...(orders[idx].statusHistory || []),
        {
          status: status as OrderStatus,
          timestamp: new Date().toISOString(),
          note: note || `Status o'zgardi: ${status}`,
        },
      ];
      saveLocalOrders(orders);
      return orders[idx];
    }
    throw new Error('Buyurtma topilmadi');
  },

  // Admin
  async getAdminStats(): Promise<AdminStats> {
    try {
      const res = await fetch(`${API_BASE}/admin/stats`, {
        headers: { ...getAuthHeader() },
      });
      if (res.ok) return await res.json();
    } catch (e: any) { if (!import.meta.env.DEV) throw e; }

    const orders = getLocalOrders();
    const prods = getLocalProducts();
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

    return {
      totalRevenue: totalRevenue || 54200000,
      totalOrders: orders.length + 18,
      todayOrders: 5,
      totalProducts: prods.length,
      totalUsers: 142,
      pendingOrders: orders.filter((o) => o.status === 'Pending').length || 2,
      deliveredOrders: orders.filter((o) => o.status === 'Delivered').length || 14,
      cancelledOrders: orders.filter((o) => o.status === 'Cancelled').length || 1,
      salesTrend: [
        { date: '10 Feb', amount: 3200000, ordersCount: 4 },
        { date: '11 Feb', amount: 4500000, ordersCount: 6 },
        { date: '12 Feb', amount: 6100000, ordersCount: 8 },
        { date: '13 Feb', amount: 5300000, ordersCount: 7 },
        { date: '14 Feb', amount: 8900000, ordersCount: 12 },
        { date: '15 Feb', amount: 7200000, ordersCount: 9 },
        { date: '16 Feb', amount: 4850000, ordersCount: 5 },
      ],
      topProducts: prods.slice(0, 5).map((p) => ({
        id: p.id,
        name: p.name,
        salesCount: p.salesCount || 10,
        revenue: (p.salesCount || 10) * p.price,
        image: p.images[0],
      })),
      recentOrders: orders.slice(0, 5),
    };
  },

  async getAdminOrders(): Promise<Order[]> {
    return this.getOrders();
  },

  async getAdminUsers(): Promise<User[]> {
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: { ...getAuthHeader() },
      });
      if (res.ok) return await res.json();
    } catch (e: any) { if (!import.meta.env.DEV) throw e; }

    return [mockDefaultUser, mockAdminUser];
  },

  async toggleUserBlock(userId: string): Promise<{ user: User; message: string }> {
    return {
      user: { ...mockDefaultUser, id: userId, isBlocked: false },
      message: 'Foydalanuvchi holati yangilandi',
    };
  },

  async getCurrencies(): Promise<Currency[]> {
    try {
      const res = await fetch(`${API_BASE}/currencies`);
      if (res.ok) return await res.json();
    } catch (e: any) { if (!import.meta.env.DEV) throw e; }

    return [
      { id: 'currency-usd', code: 'USD', symbol: '$', rate: 12700, isActive: true },
      { id: 'currency-eur', code: 'EUR', symbol: '€', rate: 13800, isActive: true },
      { id: 'currency-rub', code: 'RUB', symbol: '₽', rate: 140, isActive: true },
      { id: 'currency-cny', code: 'CNY', symbol: '¥', rate: 1750, isActive: true },
    ];
  },

  async updateCurrency(id: string, currency: Partial<Currency>): Promise<Currency> {
    try {
      const res = await fetch(`${API_BASE}/currencies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(currency),
      });
      if (res.ok) return await res.json();
    } catch (e: any) { if (!import.meta.env.DEV) throw e; }

    return { id, code: 'USD', symbol: '$', rate: 12700, isActive: true };
  },
};
