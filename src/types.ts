export type UserRole = 'user' | 'admin';

export interface Currency {
  id: string;
  code: string; // USD, EUR, RUB, CNY
  symbol: string; // $, €, ₽, ¥
  rate: number; // exchange rate to UZS
  isActive: boolean;
}

export interface WholesaleTier {
  minQuantity: number;
  price: number;
}

export interface ProductVariant {
  id: string;
  name: string; // e.g. "4L", "1L", "5L"
  sku: string;
  retailPrice: number; // dona narxi
  wholesalePrice: number; // optom narxi
  usdPrice?: number;
  eurPrice?: number;
  stock: number;
  wholesaleTiers?: WholesaleTier[]; // quantity-based pricing
}

export interface Address {
  id: string;
  title: string; // e.g. "Uy", "Ishxona"
  region: string;
  district: string;
  street: string;
  house: string;
  apartment?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  isDefault?: boolean;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  addresses: Address[];
  isBlocked: boolean;
  totalSpent: number;
  ordersCount: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  iconName: string;
  image: string;
  isActive: boolean;
  productCount?: number;
}

export interface ProductReview {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // default price (fallback)
  oldPrice?: number;
  discount?: number; // percentage e.g. 20
  category: string; // category slug or id
  categorySlug?: string;
  categoryName: string;
  images: string[];
  stock: number; // total stock across variants
  rating: number;
  reviewsCount: number;
  salesCount: number;
  isFeatured?: boolean;
  isNew?: boolean;
  isActive: boolean;
  specs: Record<string, string>;
  reviews?: ProductReview[];
  variants?: ProductVariant[]; // product variants (sizes, volumes, etc.)
  wholesalePrice?: number; // optom narxi (legacy, use variants)
  piecePrice?: number; // dona narxi (legacy, use variants)
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Preparing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  categoryName?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "#ORD-10293"
  userId?: string;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryAddress: {
    region: string;
    district: string;
    street: string;
    house: string;
    apartment?: string;
    notes?: string;
    latitude?: number;
    longitude?: number;
    formattedAddress?: string;
  };
  paymentMethod: 'cash' | 'card' | 'uzum_pay' | 'payme' | 'click';
  status: OrderStatus;
  statusHistory?: { status: OrderStatus; timestamp: string; note?: string }[];
  createdAt: string;
  estimatedDelivery?: string;
}

export interface AdminStats {
  totalOrders: number;
  todayOrders: number;
  totalUsers: number;
  totalProducts: number;
  totalRevenue: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  salesTrend: { date: string; amount: number; ordersCount: number }[];
  topProducts: { id: string; name: string; salesCount: number; revenue: number; image: string }[];
  recentOrders: Order[];
}

export interface AuthResponse {
  user: User;
  token: string;
  message?: string;
}
