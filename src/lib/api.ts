import type {
  User,
  Product,
  ProductReview,
  Category,
  Order,
  AdminStats,
  AuthResponse,
  Currency,
} from '../types';

const API_BASE = '/api';
const TOKEN_KEY = 'zamon_token';

/**
 * Mock/localStorage fallback exists only so the UI can be developed without a database.
 * In production a failing request must surface as an error instead of a fake success.
 */
const USE_MOCK_FALLBACK = import.meta.env.DEV;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...getAuthHeader(),
        ...(init.headers as Record<string, string> | undefined),
      },
    });
  } catch (error) {
    throw new ApiError("Serverga ulanib bo'lmadi. Internet aloqasini tekshiring.", 0);
  }

  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
        ? data.message
        : undefined) ?? `Xatolik yuz berdi (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}

async function withDevFallback<T>(call: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error;
    console.warn('[dev] API so\'rovi muvaffaqiyatsiz, mock ma\'lumotga o\'tildi:', error);
    return fallback();
  }
}

// ---------------- DEV-ONLY LOCAL STORE ----------------
// Imported lazily so the mock dataset is dropped from the production bundle.

async function mockData() {
  return import('../data/mockData');
}

async function getLocalProducts(): Promise<Product[]> {
  const saved = localStorage.getItem('zamon_local_products');
  if (saved) return JSON.parse(saved) as Product[];
  return (await mockData()).mockProducts;
}

function saveLocalProducts(products: Product[]) {
  localStorage.setItem('zamon_local_products', JSON.stringify(products));
}

async function getLocalCategories(): Promise<Category[]> {
  return (await mockData()).mockCategories;
}

async function getLocalOrders(): Promise<Order[]> {
  const saved = localStorage.getItem('zamon_local_orders');
  if (saved) return JSON.parse(saved) as Order[];
  return (await mockData()).mockOrders;
}

function saveLocalOrders(orders: Order[]) {
  localStorage.setItem('zamon_local_orders', JSON.stringify(orders));
}

export const api = {
  // ---------------- Auth (no mock fallback: authentication must be real) ----------------
  async login(phone: string, pin: string): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, pin }),
    });
  },

  async register(firstName: string, lastName: string, phone: string, pin: string): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ firstName, lastName, phone, pin }),
    });
  },

  async getMe(): Promise<User> {
    return request<User>('/auth/me');
  },

  async updateProfile(profile: Partial<User>): Promise<User> {
    return request<User>('/auth/profile', { method: 'PUT', body: JSON.stringify(profile) });
  },

  async addAddress(address: Record<string, unknown>): Promise<User> {
    return request<User>('/auth/addresses', { method: 'POST', body: JSON.stringify(address) });
  },

  async deleteAddress(id: string): Promise<User> {
    return request<User>(`/auth/addresses/${id}`, { method: 'DELETE' });
  },

  // ---------------- Products ----------------
  async getProducts(
    params: Record<string, string | number | undefined> = {},
  ): Promise<{ products: Product[]; total: number; page: number; totalPages: number }> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.append(key, String(value));
    });

    return withDevFallback(
      async () => {
        const data = await request<{ products: Product[]; total: number; page: number; totalPages: number }>(
          `/products?${query.toString()}`,
        );
        saveLocalProducts(data.products);
        return data;
      },
      async () => {
        let products = await getLocalProducts();

        if (params.category && params.category !== 'all') {
          products = products.filter((p) => p.category === params.category);
        }
        if (params.search) {
          const term = String(params.search).toLowerCase();
          products = products.filter(
            (p) =>
              p.name.toLowerCase().includes(term) ||
              p.description.toLowerCase().includes(term) ||
              p.categoryName?.toLowerCase().includes(term),
          );
        }

        const sorters: Record<string, (a: Product, b: Product) => number> = {
          price_asc: (a, b) => a.price - b.price,
          price_desc: (a, b) => b.price - a.price,
          rating: (a, b) => b.rating - a.rating,
          new: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          popular: (a, b) => (b.salesCount || 0) - (a.salesCount || 0),
        };
        products = [...products].sort(sorters[String(params.sort ?? 'popular')] ?? sorters.popular);

        return { products, total: products.length, page: 1, totalPages: 1 };
      },
    );
  },

  async getProductById(id: string): Promise<{ product: Product; related: Product[] }> {
    return withDevFallback(
      () => request<{ product: Product; related: Product[] }>(`/products/${id}`),
      async () => {
        const products = await getLocalProducts();
        const product = products.find((p) => p.id === id) ?? products[0];
        const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 5);
        return { product, related };
      },
    );
  },

  async createProduct(product: Partial<Product>): Promise<Product> {
    return request<Product>('/products', { method: 'POST', body: JSON.stringify(product) });
  },

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    return request<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(product) });
  },

  async deleteProduct(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/products/${id}`, { method: 'DELETE' });
  },

  async addProductReview(
    productId: string,
    rating: number,
    comment: string,
  ): Promise<{ review: ProductReview; rating: number; reviewsCount: number }> {
    return request<{ review: ProductReview; rating: number; reviewsCount: number }>(`/products/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    });
  },

  // ---------------- Categories ----------------
  async getCategories(): Promise<Category[]> {
    return withDevFallback(() => request<Category[]>('/categories'), () => getLocalCategories());
  },

  async createCategory(category: Partial<Category>): Promise<Category> {
    return request<Category>('/categories', { method: 'POST', body: JSON.stringify(category) });
  },

  async updateCategory(id: string, category: Partial<Category>): Promise<Category> {
    return request<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(category) });
  },

  async deleteCategory(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/categories/${id}`, { method: 'DELETE' });
  },

  // ---------------- Favorites ----------------
  async getFavorites(): Promise<{ productIds: string[]; products: Product[] }> {
    return request<{ productIds: string[]; products: Product[] }>('/favorites');
  },

  async addFavorite(productId: string): Promise<{ productId: string }> {
    return request<{ productId: string }>('/favorites', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    });
  },

  async removeFavorite(productId: string): Promise<{ productId: string }> {
    return request<{ productId: string }>(`/favorites/${productId}`, { method: 'DELETE' });
  },

  // ---------------- Orders ----------------
  async createOrder(orderData: {
    customer: { firstName: string; lastName: string; phone: string };
    items: { productId: string; quantity: number }[];
    deliveryAddress: Record<string, unknown>;
    paymentMethod: string;
  }): Promise<{ order: Order; message: string }> {
    return request<{ order: Order; message: string }>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  async getOrders(): Promise<Order[]> {
    return withDevFallback(
      async () => {
        const orders = await request<Order[]>('/orders');
        saveLocalOrders(orders);
        return orders;
      },
      () => getLocalOrders(),
    );
  },

  async getOrderById(id: string): Promise<Order> {
    return request<Order>(`/orders/${id}`);
  },

  async updateOrderStatus(id: string, status: string, note?: string): Promise<Order> {
    return request<Order>(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, note }),
    });
  },

  // ---------------- Admin ----------------
  async getAdminStats(): Promise<AdminStats> {
    return request<AdminStats>('/admin/stats');
  },

  async getAdminOrders(): Promise<Order[]> {
    return this.getOrders();
  },

  async getAdminUsers(): Promise<User[]> {
    return request<User[]>('/admin/users');
  },

  async toggleUserBlock(userId: string): Promise<{ user: User; message: string }> {
    return request<{ user: User; message: string }>(`/admin/users/${userId}/block`, { method: 'PUT' });
  },

  // ---------------- Currencies ----------------
  async getCurrencies(): Promise<Currency[]> {
    return withDevFallback(
      () => request<Currency[]>('/currencies'),
      async () => [
        { id: 'currency-usd', code: 'USD', symbol: '$', rate: 12700, isActive: true },
        { id: 'currency-eur', code: 'EUR', symbol: '€', rate: 13800, isActive: true },
        { id: 'currency-rub', code: 'RUB', symbol: '₽', rate: 140, isActive: true },
        { id: 'currency-cny', code: 'CNY', symbol: '¥', rate: 1750, isActive: true },
      ],
    );
  },

  async updateCurrency(id: string, currency: Partial<Currency>): Promise<Currency> {
    return request<Currency>(`/currencies/${id}`, { method: 'PUT', body: JSON.stringify(currency) });
  },
};
