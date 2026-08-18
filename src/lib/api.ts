import type { User, Product, Category, Order, AdminStats, AuthResponse, Currency } from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('zamon_token') || localStorage.getItem('velora_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseErrorAndThrow(res: Response, fallbackMessage: string): Promise<never> {
  const errData = await res.json().catch(() => ({}));
  throw new Error(errData.error || fallbackMessage);
}

export const api = {
  // Auth
  async login(phone: string, pin: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, pin }),
    });
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, 'Tizimga kirishda xatolik');
  },

  async adminLogin(password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, "Admin paroli noto'g'ri");
  },

  async register(firstName: string, lastName: string, phone: string, pin: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, phone, pin }),
    });
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, "Ro'yxatdan o'tishda xatolik");
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, "Foydalanuvchi ma'lumotlarini olishda xatolik");
  },

  async updateProfile(profile: Partial<User>): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(profile),
    });
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, 'Profilni yangilashda xatolik');
  },

  async addAddress(address: Record<string, any>): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/addresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(address),
    });
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, "Manzil qo'shishda xatolik");
  },

  async deleteAddress(id: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/addresses/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, "Manzilni o'chirishda xatolik");
  },

  async getProducts(params: Record<string, any> = {}): Promise<{ products: Product[]; total: number; page: number; totalPages: number }> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
    const res = await fetch(`${API_BASE}/products?${query.toString()}`);
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, 'Mahsulotlarni yuklashda xatolik');
  },

  async getProductById(id: string): Promise<{ product: Product; related: Product[] }> {
    const res = await fetch(`${API_BASE}/products/${id}`);
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, 'Mahsulotni yuklashda xatolik');
  },

  async createProduct(product: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(product),
    });
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, "Mahsulot qo'shishda xatolik");
  },

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(product),
    });
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, 'Mahsulotni yangilashda xatolik');
  },

  async deleteProduct(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, "Mahsulotni o'chirishda xatolik");
  },

  async addProductReview(productId: string, rating: number, comment: string): Promise<any> {
    const res = await fetch(`${API_BASE}/products/${productId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ rating, comment }),
    });
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, 'Sharh yuborishda xatolik');
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    const res = await fetch(`${API_BASE}/categories`);
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, 'Kategoriyalarni yuklashda xatolik');
  },

  async createCategory(category: Partial<Category>): Promise<Category> {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(category),
    });
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, "Kategoriya qo'shishda xatolik");
  },

  async updateCategory(id: string, category: Partial<Category>): Promise<Category> {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(category),
    });
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, 'Kategoriyani yangilashda xatolik');
  },

  async deleteCategory(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, "Kategoriyani o'chirishda xatolik");
  },

  // Orders
  async createOrder(orderData: {
    customer: { firstName: string; lastName: string; phone: string };
    items: { productId: string; quantity: number }[];
    deliveryAddress: Record<string, any>;
    paymentMethod: string;
  }): Promise<{ order: Order; message: string }> {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(orderData),
    });
    if (res.ok) {
      const order = await res.json();
      return { order, message: 'Buyurtma rasmiylashtirildi' };
    }
    return parseErrorAndThrow(res, 'Buyurtma yaratishda xatolik');
  },

  // Orders belonging to the currently logged-in user ("Mening buyurtmalarim").
  async getOrders(): Promise<Order[]> {
    const res = await fetch(`${API_BASE}/orders/user`, {
      headers: { ...getAuthHeader() },
    });
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, 'Buyurtmalarni yuklashda xatolik');
  },

  async getOrderById(id: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      headers: { ...getAuthHeader() },
    });
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, 'Buyurtmani yuklashda xatolik');
  },

  async updateOrderStatus(id: string, status: string, note?: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status, note }),
    });
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, 'Buyurtma holatini yangilashda xatolik');
  },

  // Admin
  async getAdminStats(): Promise<AdminStats> {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: { ...getAuthHeader() },
    });
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, 'Statistikani yuklashda xatolik');
  },

  // All orders in the system (admin only).
  async getAdminOrders(): Promise<Order[]> {
    const res = await fetch(`${API_BASE}/orders`, {
      headers: { ...getAuthHeader() },
    });
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, 'Buyurtmalarni yuklashda xatolik');
  },

  async getAdminUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: { ...getAuthHeader() },
    });
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, 'Foydalanuvchilarni yuklashda xatolik');
  },

  async toggleUserBlock(userId: string, isBlocked: boolean): Promise<{ user: User; message: string }> {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/block`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ isBlocked }),
    });
    if (res.ok) {
      const user = await res.json();
      return { user, message: 'Foydalanuvchi holati yangilandi' };
    }
    return parseErrorAndThrow(res, "Foydalanuvchi holatini o'zgartirishda xatolik");
  },

  async getCurrencies(): Promise<Currency[]> {
    const res = await fetch(`${API_BASE}/currencies`);
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, 'Valyuta kurslarini yuklashda xatolik');
  },

  async updateCurrency(id: string, currency: Partial<Currency>): Promise<Currency> {
    const res = await fetch(`${API_BASE}/currencies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(currency),
    });
    if (res.ok) return await res.json();
    return parseErrorAndThrow(res, 'Valyuta kursini yangilashda xatolik');
  },
};
