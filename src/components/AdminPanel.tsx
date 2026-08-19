import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  ArrowLeft,
  X,
  Search,
  Check,
  ChevronDown,
  Layers,
  Coins,
  RefreshCw,
  Image as ImageIcon,
  GripVertical
} from 'lucide-react';
import type { AdminStats, Product, Order, User, Category, OrderStatus, Currency, ProductVariant, Banner } from '../types';
import { formatPrice, formatDate, formatPhone } from '../lib/formatters';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';

interface AdminPanelProps {
  categories: Category[];
  onExitAdmin: () => void;
  onRefreshData?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  categories,
  onExitAdmin,
  onRefreshData,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'users' | 'currencies' | 'categories' | 'banners'>('dashboard');

  // Stats
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderSearch, setOrderSearch] = useState('');

  // Users
  const [users, setUsers] = useState<User[]>([]);

  // Currencies
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [isSyncingCurrencies, setIsSyncingCurrencies] = useState(false);

  // Categories
  const [categoryList, setCategoryList] = useState<Category[]>(categories);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Partial<Category> | null>(null);
  const [categoryImageUpload, setCategoryImageUpload] = useState<string | null>(null);

  // Banners
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isEditingBanner, setIsEditingBanner] = useState(false);
  const [currentBanner, setCurrentBanner] = useState<Partial<Banner> | null>(null);
  const [bannerImageUpload, setBannerImageUpload] = useState<string | null>(null);

  // Image upload
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // Variants management
  const [showVariants, setShowVariants] = useState(false);

  // Fetch Stats
  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const data = await api.getAdminStats();
      setStats(data);
    } catch (err: any) {
      showToast(err.message || 'Statistikani yuklab bo\'lmadi', 'error');
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Fetch Products
  const loadProducts = async () => {
    try {
      const data = await api.getProducts({ limit: 100 });
      setProducts(data.products);
    } catch (err: any) {
      showToast(err.message || 'Mahsulotlarni yuklashda xatolik', 'error');
    }
  };

  // Fetch Orders
  const loadOrders = async () => {
    try {
      const data = await api.getAdminOrders();
      setOrders(data);
    } catch (err: any) {
      showToast(err.message || 'Buyurtmalarni yuklashda xatolik', 'error');
    }
  };

  // Fetch Users
  const loadUsers = async () => {
    try {
      const data = await api.getAdminUsers();
      setUsers(data);
    } catch (err: any) {
      showToast(err.message || 'Foydalanuvchilarni yuklashda xatolik', 'error');
    }
  };

  // Fetch Currencies
  const loadCurrencies = async () => {
    try {
      const data = await api.getCurrencies();
      setCurrencies(data);
    } catch (err: any) {
      showToast(err.message || 'Valyuta kurslarini yuklashda xatolik', 'error');
    }
  };

  // Fetch Categories (admin-managed list)
  const loadCategories = async () => {
    try {
      const data = await api.getCategories();
      setCategoryList(data);
    } catch (err: any) {
      showToast(err.message || 'Kategoriyalarni yuklashda xatolik', 'error');
    }
  };

  // Fetch Banners
  const loadBanners = async () => {
    try {
      const data = await api.getAdminBanners();
      setBanners(data);
    } catch (err: any) {
      showToast(err.message || 'Bannerlarni yuklashda xatolik', 'error');
    }
  };

  useEffect(() => {
    loadStats();
    loadProducts();
    loadOrders();
    loadUsers();
    loadCurrencies();
    loadCategories();
    loadBanners();
  }, []);

  // Handle Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          setUploadedImages((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Single-image upload helper, used by Category & Banner forms
  const handleSingleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === 'string') {
        setter(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Category Save (Create or Update)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCategory || !currentCategory.name || !currentCategory.slug) {
      showToast("Nomi va slug (url) maydonlari majburiy", 'error');
      return;
    }
    const image = categoryImageUpload || currentCategory.image;
    if (!image) {
      showToast('Kategoriya uchun rasm tanlang', 'error');
      return;
    }
    try {
      if (currentCategory.id) {
        await api.updateCategory(currentCategory.id, { ...currentCategory, image });
        showToast('Kategoriya yangilandi', 'success');
      } else {
        await api.createCategory({
          name: currentCategory.name,
          slug: currentCategory.slug,
          iconName: currentCategory.iconName || 'Folder',
          image,
          isActive: true,
        });
        showToast("Kategoriya qo'shildi", 'success');
      }
      loadCategories();
      if (onRefreshData) onRefreshData();
      setIsEditingCategory(false);
      setCurrentCategory(null);
      setCategoryImageUpload(null);
    } catch (err: any) {
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm("Rostdan ham ushbu kategoriyani o'chirmoqchimisiz?")) return;
    try {
      await api.deleteCategory(id);
      showToast("Kategoriya o'chirildi", 'success');
      loadCategories();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showToast(err.message || "O'chirishda xatolik", 'error');
    }
  };

  const handleToggleCategoryActive = async (cat: Category) => {
    try {
      await api.updateCategory(cat.id, { isActive: !cat.isActive });
      loadCategories();
      if (onRefreshData) onRefreshData();
      showToast('Holat yangilandi', 'success');
    } catch (err: any) {
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    }
  };

  // Handle Banner Save (Create or Update)
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBanner || !currentBanner.titleLine1) {
      showToast('Sarlavha (1-qator) majburiy', 'error');
      return;
    }
    const image = bannerImageUpload || currentBanner.image;
    if (!image) {
      showToast('Banner uchun rasm tanlang', 'error');
      return;
    }
    try {
      const payload = { ...currentBanner, image };
      if (currentBanner.id) {
        await api.updateBanner(currentBanner.id, payload);
        showToast('Banner yangilandi', 'success');
      } else {
        await api.createBanner(payload);
        showToast("Banner qo'shildi", 'success');
      }
      loadBanners();
      setIsEditingBanner(false);
      setCurrentBanner(null);
      setBannerImageUpload(null);
    } catch (err: any) {
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm("Rostdan ham ushbu bannerni o'chirmoqchimisiz?")) return;
    try {
      await api.deleteBanner(id);
      showToast("Banner o'chirildi", 'success');
      loadBanners();
    } catch (err: any) {
      showToast(err.message || "O'chirishda xatolik", 'error');
    }
  };

  const handleToggleBannerActive = async (banner: Banner) => {
    try {
      await api.updateBanner(banner.id, { isActive: !banner.isActive });
      loadBanners();
      showToast('Holat yangilandi', 'success');
    } catch (err: any) {
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    }
  };

  // Handle Product Save (Create or Update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct || !currentProduct.name || !currentProduct.price) {
      showToast('Iltimos, barcha majburiy maydonlarni to\'ldiring', 'error');
      return;
    }

    // Combine uploaded images with existing images
    const finalImages = uploadedImages.length > 0 ? uploadedImages : currentProduct.images || [];

    try {
      if (currentProduct.id) {
        await api.updateProduct(currentProduct.id, { ...currentProduct, images: finalImages });
        showToast('Mahsulot yangilandi', 'success');
      } else {
        await api.createProduct({ ...currentProduct, images: finalImages });
        showToast('Mahsulot qo\'shildi', 'success');
      }
      loadProducts();
      setIsEditingProduct(false);
      setCurrentProduct(null);
      setUploadedImages([]);
    } catch (err: any) {
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    }
  };

  // Handle Product Delete
  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Rostdan ham ushbu mahsulotni o'chirmoqchimisiz?")) return;
    try {
      await api.deleteProduct(id);
      showToast("Mahsulot o'chirildi", 'success');
      loadProducts();
      loadStats();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showToast(err.message || "O'chirishda xatolik", 'error');
    }
  };

  // Handle Order Status Update
  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await api.updateOrderStatus(orderId, status);
      showToast(`Buyurtma holati "${status}" ga o'zgartirildi`, 'success');
      loadOrders();
      loadStats();
    } catch (err: any) {
      showToast(err.message || 'Holatni yangilashda xatolik', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1713] text-gray-100 pb-16">
      {/* Admin Navbar */}
      <div className="bg-[#09110e] border-b border-[#1c3629] px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#dfbe9f] to-[#b88a64] flex items-center justify-center text-[#0d1713] font-bold shadow-md">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold font-serif text-base text-white tracking-wider">VELORA SHOP</span>
            <span className="ml-2 px-2 py-0.5 bg-[#1a3327] text-[#dfbe9f] font-bold text-[10px] rounded-md border border-[#2d523f] uppercase">
              Admin Boshqaruvi
            </span>
          </div>
        </div>

        <button
          onClick={onExitAdmin}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#14281e] hover:bg-[#1a3528] text-[#dfbe9f] rounded-xl text-xs font-semibold border border-[#234233] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Do'konga qaytish</span>
        </button>
      </div>

      {/* Main Admin Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-[#1c3629] pb-3">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] shadow-md'
                : 'bg-[#12221a] hover:bg-[#183124] text-gray-300 border border-[#234233]'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Statistika & Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] shadow-md'
                : 'bg-[#12221a] hover:bg-[#183124] text-gray-300 border border-[#234233]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Mahsulotlar ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] shadow-md'
                : 'bg-[#12221a] hover:bg-[#183124] text-gray-300 border border-[#234233]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Buyurtmalar ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] shadow-md'
                : 'bg-[#12221a] hover:bg-[#183124] text-gray-300 border border-[#234233]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Foydalanuvchilar ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] shadow-md'
                : 'bg-[#12221a] hover:bg-[#183124] text-gray-300 border border-[#234233]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Kategoriyalar ({categoryList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('banners')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'banners'
                ? 'bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] shadow-md'
                : 'bg-[#12221a] hover:bg-[#183124] text-gray-300 border border-[#234233]'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Bannerlar ({banners.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('currencies')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'currencies'
                ? 'bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] shadow-md'
                : 'bg-[#12221a] hover:bg-[#183124] text-gray-300 border border-[#234233]'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Valyuta kurslari</span>
          </button>
        </div>

        {/* Tab 1: Dashboard & Metrics */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-[#0f1d17] rounded-2xl border border-[#234233] space-y-2 shadow-lg">
                <div className="flex justify-between items-center text-gray-400 text-xs">
                  <span>Jami Tushum (Savdo)</span>
                  <DollarSign className="w-4 h-4 text-[#dfbe9f]" />
                </div>
                <p className="text-xl sm:text-2xl font-extrabold text-[#dfbe9f] font-serif">
                  {formatPrice(stats.totalRevenue)}
                </p>
                <p className="text-[11px] text-gray-400">Muvaffaqiyatli buyurtmalar</p>
              </div>

              <div className="p-5 bg-[#0f1d17] rounded-2xl border border-[#234233] space-y-2 shadow-lg">
                <div className="flex justify-between items-center text-gray-400 text-xs">
                  <span>Barcha Buyurtmalar</span>
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-xl sm:text-2xl font-extrabold text-white font-serif">
                  {stats.totalOrders} ta
                </p>
                <p className="text-[11px] text-amber-300 font-semibold">
                  {stats.pendingOrders} ta kutilmoqda
                </p>
              </div>

              <div className="p-5 bg-[#0f1d17] rounded-2xl border border-[#234233] space-y-2 shadow-lg">
                <div className="flex justify-between items-center text-gray-400 text-xs">
                  <span>Yetkazib berildi</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-xl sm:text-2xl font-extrabold text-white font-serif">
                  {stats.deliveredOrders} ta
                </p>
                <p className="text-[11px] text-gray-400">Muvaffaqiyatli yetkazib berildi</p>
              </div>

              <div className="p-5 bg-[#0f1d17] rounded-2xl border border-[#234233] space-y-2 shadow-lg">
                <div className="flex justify-between items-center text-gray-400 text-xs">
                  <span>Bekor qilindi</span>
                  <AlertCircle className="w-4 h-4 text-red-400" />
                </div>
                <p className="text-xl sm:text-2xl font-extrabold text-white font-serif">
                  {stats.cancelledOrders} ta
                </p>
                <p className="text-[11px] text-gray-400">Bekor qilingan buyurtmalar</p>
              </div>
            </div>

            {/* Second Row of Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 bg-[#0f1d17] rounded-2xl border border-[#234233] space-y-2 shadow-lg">
                <div className="flex justify-between items-center text-gray-400 text-xs">
                  <span>Bugungi buyurtmalar</span>
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                </div>
                <p className="text-xl sm:text-2xl font-extrabold text-white font-serif">
                  {stats.todayOrders} ta
                </p>
                <p className="text-[11px] text-gray-400">Bugun kelgan buyurtmalar</p>
              </div>

              <div className="p-5 bg-[#0f1d17] rounded-2xl border border-[#234233] space-y-2 shadow-lg">
                <div className="flex justify-between items-center text-gray-400 text-xs">
                  <span>Mahsulotlar soni</span>
                  <Package className="w-4 h-4 text-cyan-400" />
                </div>
                <p className="text-xl sm:text-2xl font-extrabold text-white font-serif">
                  {stats.totalProducts} ta
                </p>
                <p className="text-[11px] text-gray-400">{categoryList.length} ta kategoriya</p>
              </div>

              <div className="p-5 bg-[#0f1d17] rounded-2xl border border-[#234233] space-y-2 shadow-lg">
                <div className="flex justify-between items-center text-gray-400 text-xs">
                  <span>Foydalanuvchilar</span>
                  <Users className="w-4 h-4 text-[#dfbe9f]" />
                </div>
                <p className="text-xl sm:text-2xl font-extrabold text-white font-serif">
                  {stats.totalUsers} nafar
                </p>
                <p className="text-[11px] text-gray-400">Ro'yxatdan o'tgan mijozlar</p>
              </div>
            </div>

            {/* Sales Trend Chart */}
            <div className="bg-[#0f1d17] rounded-2xl border border-[#234233] p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-bold font-serif text-sm text-white">Savdo tendensiyasi (7 kun)</h3>
                <TrendingUp className="w-4 h-4 text-[#dfbe9f]" />
              </div>
              <div className="flex items-end gap-2 h-32">
                {stats.salesTrend?.slice(-7).map((trend, index) => {
                  const maxAmount = Math.max(...stats.salesTrend.map(t => t.amount));
                  const height = (trend.amount / maxAmount) * 100;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-[#1a3327] rounded-t-lg relative" style={{ height: `${Math.max(height, 5)}%` }}>
                        <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#dfbe9f] to-[#b88a64] rounded-t-lg" style={{ height: '100%' }}></div>
                      </div>
                      <span className="text-[9px] text-gray-400">{trend.date}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-[#0f1d17] rounded-2xl border border-[#234233] p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-bold font-serif text-sm text-white">Eng ko'p sotilgan mahsulotlar</h3>
                <button
                  onClick={() => setActiveTab('products')}
                  className="text-xs text-[#dfbe9f] hover:underline font-semibold cursor-pointer"
                >
                  Barchasini ko'rish →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {stats.topProducts?.slice(0, 5).map((product) => (
                  <div key={product.id} className="bg-[#12221a] rounded-xl p-3 border border-[#234233]">
                    <img src={product.image} alt={product.name} className="w-full h-20 object-cover rounded-lg mb-2" />
                    <h4 className="text-xs font-semibold text-white line-clamp-2 mb-1">{product.name}</h4>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-400">{product.salesCount} dona</span>
                      <span className="text-[#dfbe9f] font-bold">{formatPrice(product.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Orders in Dashboard */}
            <div className="bg-[#0f1d17] rounded-2xl border border-[#234233] p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-bold font-serif text-sm text-white">So'nggi buyurtmalar</h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs text-[#dfbe9f] hover:underline font-semibold cursor-pointer"
                >
                  Barchasini ko'rish →
                </button>
              </div>

              <div className="divide-y divide-[#172d22]">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-bold text-[#dfbe9f] font-mono">{order.orderNumber}</span>
                      <span className="text-gray-400 ml-3">
                        {order.customer.firstName} {order.customer.lastName} ({order.customer.phone})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-white">{formatPrice(order.total)}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#173024] text-[#dfbe9f] border border-[#2b543e]">
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Products Management */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search product */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Mahsulot nomi bo'yicha qidiruv..."
                  className="w-full pl-9 pr-3 py-2.5 bg-[#0f1d17] border border-[#234233] rounded-xl text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                />
              </div>

              <button
                onClick={() => {
                  const firstCategory = categoryList[0];
                  setCurrentProduct({
                    name: '',
                    price: 0,
                    categorySlug: firstCategory?.slug || '',
                    categoryName: firstCategory?.name || '',
                    images: [],
                    description: '',
                    stock: 0,
                    isPopular: false,
                    specs: {},
                  });
                  setIsEditingProduct(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] hover:opacity-95 text-[#0d1713] font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Yangi mahsulot qo'shish</span>
              </button>
            </div>

            {/* Products Table — min-w so the table keeps its natural width on narrow
                screens and the wrapper's overflow-x-auto can actually kick in, instead
                of the columns getting squeezed into each other. */}
            <div className="bg-[#0f1d17] rounded-2xl border border-[#234233] overflow-x-auto shadow-lg">
              <table className="w-full min-w-[720px] text-left text-xs text-gray-300">
                <thead className="bg-[#12221a] text-gray-400 uppercase text-[10px] font-bold border-b border-[#1c3629]">
                  <tr>
                    <th className="p-3.5">Rasm & Nomi</th>
                    <th className="p-3.5">Kategoriya</th>
                    <th className="p-3.5">Narxi</th>
                    <th className="p-3.5">Zaxira</th>
                    <th className="p-3.5">Sotuv</th>
                    <th className="p-3.5 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#172d22]">
                  {products
                    .filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-[#14291f] transition-colors">
                        <td className="p-3.5 flex items-center gap-3">
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover bg-[#12221a] border border-[#234233] shrink-0"
                          />
                          <div className="min-w-0 max-w-xs">
                            <p className="font-bold text-white truncate">{p.name}</p>
                            <p className="text-[10px] text-gray-400">ID: {p.id}</p>
                          </div>
                        </td>
                        <td className="p-3.5 font-medium text-gray-300">{p.categoryName}</td>
                        <td className="p-3.5 font-extrabold text-[#dfbe9f]">{formatPrice(p.price)}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              p.stock > 5 ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50' : 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
                            }`}
                          >
                            {p.stock} dona
                          </span>
                        </td>
                        <td className="p-3.5 font-medium">{p.salesCount} ta</td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setCurrentProduct({ ...p });
                                setIsEditingProduct(true);
                              }}
                              className="p-1.5 hover:bg-[#1a3327] text-[#dfbe9f] rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-1.5 hover:bg-rose-950/40 text-rose-400 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Orders Management */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Buyurtma raqami yoki telefon bo'yicha..."
                className="w-full pl-9 pr-3 py-2.5 bg-[#0f1d17] border border-[#234233] rounded-xl text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
              />
            </div>

            <div className="space-y-3">
              {orders
                .filter(
                  (o) =>
                    o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
                    o.customer.phone.includes(orderSearch)
                )
                .map((o) => (
                  <div
                    key={o.id}
                    className="p-4 sm:p-5 bg-[#0f1d17] rounded-2xl border border-[#234233] space-y-3 text-xs shadow-lg"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#1c3629]">
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-sm text-[#dfbe9f] font-mono">
                          {o.orderNumber}
                        </span>
                        <span className="text-gray-600">|</span>
                        <span className="text-gray-400">{formatDate(o.createdAt)}</span>
                      </div>

                      {/* Status Selector dropdown */}
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-[11px]">Holat:</span>
                        <select
                          value={o.status}
                          onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value as OrderStatus)}
                          className="bg-[#12221a] border border-[#234233] text-[#dfbe9f] font-bold text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#dfbe9f] cursor-pointer"
                        >
                          <option value="Pending">Kutilmoqda (Pending)</option>
                          <option value="Confirmed">Tasdiqlandi (Confirmed)</option>
                          <option value="Preparing">Yig'ilmoqda (Preparing)</option>
                          <option value="Shipped">Yo'lda / Kuryerda (Shipped)</option>
                          <option value="Delivered">Yetkazildi (Delivered)</option>
                          <option value="Cancelled">Bekor qilindi (Cancelled)</option>
                        </select>
                      </div>
                    </div>

                    {/* Customer & Address Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-300">
                      <div>
                        <p className="text-gray-400">Qabul qiluvchi:</p>
                        <p className="font-bold text-white">
                          {o.customer.firstName} {o.customer.lastName} ({formatPhone(o.customer.phone)})
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Manzil:</p>
                        <p className="font-medium text-gray-200">
                          {o.deliveryAddress.formattedAddress || o.deliveryAddress.street}
                        </p>
                        {o.deliveryAddress.notes && (
                          <p className="text-[11px] text-gray-400 italic">"{o.deliveryAddress.notes}"</p>
                        )}
                      </div>
                    </div>

                    {/* Order items */}
                    <div className="pt-2 border-t border-[#172d22] space-y-1">
                      {o.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-gray-400">
                          <span>
                            {it.name} <strong className="text-white">× {it.quantity}</strong>
                          </span>
                          <span className="font-bold text-gray-200">
                            {formatPrice(it.price * it.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Order total */}
                    <div className="pt-2 border-t border-[#1c3629] flex justify-between items-center text-sm font-extrabold">
                      <span className="text-gray-400">Jami to'lov:</span>
                      <span className="text-[#dfbe9f]">{formatPrice(o.total)}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Tab 4: Users Management */}
        {activeTab === 'users' && (
          <div className="bg-[#0f1d17] rounded-2xl border border-[#234233] overflow-x-auto shadow-lg">
            <table className="w-full min-w-[560px] text-left text-xs text-gray-300">
              <thead className="bg-[#12221a] text-gray-400 uppercase text-[10px] font-bold border-b border-[#1c3629]">
                <tr>
                  <th className="p-3.5">Foydalanuvchi</th>
                  <th className="p-3.5">Telefon</th>
                  <th className="p-3.5">Rol</th>
                  <th className="p-3.5">Buyurtmalar</th>
                  <th className="p-3.5">Jami Xarid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#172d22]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#14291f] transition-colors">
                    <td className="p-3.5 flex items-center gap-2.5">
                      <img
                        src={u.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.firstName)}`}
                        alt=""
                        className="w-8 h-8 rounded-full border border-[#234233]"
                      />
                      <div>
                        <p className="font-bold text-white">{u.firstName} {u.lastName}</p>
                        <p className="text-[10px] text-gray-400">{formatDate(u.createdAt)}</p>
                      </div>
                    </td>
                    <td className="p-3.5 font-medium text-gray-200">{formatPhone(u.phone)}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          u.role === 'admin' ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60' : 'bg-[#173024] text-[#dfbe9f] border border-[#2b543e]'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-white">{u.ordersCount || 0} ta</td>
                    <td className="p-3.5 font-extrabold text-[#dfbe9f]">{formatPrice(u.totalSpent || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Edit / Create Modal */}
      {isEditingProduct && currentProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0f1d17] border border-[#234233] rounded-3xl max-w-2xl w-full p-6 space-y-4 my-auto shadow-2xl text-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c3629]">
              <h3 className="font-bold font-serif text-base text-white">
                {currentProduct.id ? "Mahsulotni tahrirlash" : "Yangi mahsulot qo'shish"}
              </h3>
              <button
                onClick={() => {
                  setIsEditingProduct(false);
                  setCurrentProduct(null);
                }}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1a3327] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-gray-300 mb-1 font-semibold">Mahsulot nomi *</label>
                  <input
                    type="text"
                    value={currentProduct.name || ''}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-1 font-semibold">Chakana narxi (so'm) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={currentProduct.price || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setCurrentProduct({ ...currentProduct, price: val ? Number(val) : 0 });
                    }}
                    className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-white focus:outline-none focus:border-[#dfbe9f]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-1 font-semibold">Optom narxi (so'm)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={currentProduct.wholesalePrice || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setCurrentProduct({ ...currentProduct, wholesalePrice: val ? Number(val) : 0 });
                    }}
                    className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-white focus:outline-none focus:border-[#dfbe9f]"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-1 font-semibold">Optom necha donadan boshlanadi</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Masalan: 10"
                    value={currentProduct.wholesaleMinQty || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setCurrentProduct({ ...currentProduct, wholesaleMinQty: val ? Number(val) : undefined });
                    }}
                    className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-white focus:outline-none focus:border-[#dfbe9f]"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Mijoz shu miqdorda yoki undan ko'p buyurtma qilsa, optom narx avtomatik qo'llanadi.
                    {currentProduct.wholesaleMinQty === 1 && (
                      <span className="block text-amber-400 mt-0.5">
                        ⚠️ "1" qiymati optom narxni doimiy qilib qo'yadi — "Dona narxi" hech qachon ko'rinmaydi. Odatda 5, 10 kabi qiymat kiriting.
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-gray-300 mb-1 font-semibold">Dona narxi (so'm)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={currentProduct.piecePrice || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setCurrentProduct({ ...currentProduct, piecePrice: val ? Number(val) : 0 });
                    }}
                    className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-white focus:outline-none focus:border-[#dfbe9f]"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-1 font-semibold">Eski narxi (so'm)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={currentProduct.oldPrice || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setCurrentProduct({ ...currentProduct, oldPrice: val ? Number(val) : 0 });
                    }}
                    className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-white focus:outline-none focus:border-[#dfbe9f]"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-1 font-semibold">Kategoriya *</label>
                  <select
                    value={currentProduct.categorySlug || currentProduct.category || 'smartphones'}
                    onChange={(e) => {
                      const selected = categoryList.find((c) => c.slug === e.target.value);
                      setCurrentProduct({
                        ...currentProduct,
                        category: e.target.value,
                        categorySlug: e.target.value,
                        categoryName: selected ? selected.name : 'Boshqa',
                      });
                    }}
                    className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-white focus:outline-none focus:border-[#dfbe9f] cursor-pointer"
                  >
                    {categoryList.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 mb-1 font-semibold">Mavjud zaxira (dona) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={currentProduct.stock || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setCurrentProduct({ ...currentProduct, stock: val ? Number(val) : 0 });
                    }}
                    className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-white focus:outline-none focus:border-[#dfbe9f]"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-gray-300 mb-1 font-semibold">Rasm yuklash (yoki URL kiriting)</label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-white focus:outline-none focus:border-[#dfbe9f] cursor-pointer"
                    />
                    {uploadedImages.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {uploadedImages.map((img, index) => (
                          <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border border-[#234233]">
                            <img src={img} alt={`Uploaded ${index}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-white text-xs cursor-pointer hover:bg-red-700"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="text-gray-400 text-[10px]">Yoki rasm URL manzilini kiriting:</div>
                    <input
                      type="url"
                      value={currentProduct.images?.[0] || ''}
                      onChange={(e) =>
                        setCurrentProduct({
                          ...currentProduct,
                          images: [e.target.value, ...(currentProduct.images?.slice(1) || [])],
                        })
                      }
                      className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-white focus:outline-none focus:border-[#dfbe9f]"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-gray-300 mb-1 font-semibold">Batafsil tavsif</label>
                  <textarea
                    value={currentProduct.description || ''}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-white focus:outline-none focus:border-[#dfbe9f]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => setShowVariants(!showVariants)}
                    className="flex items-center gap-2 text-xs font-semibold text-[#dfbe9f] hover:text-[#f3dfc8] cursor-pointer"
                  >
                    <Layers className="w-4 h-4" />
                    <span>{showVariants ? 'Variantlarni yashirish' : 'Variantlar qo\'shish (256GB, 512GB va h.k.)'}</span>
                  </button>

                  {showVariants && (
                    <div className="mt-3 p-3 bg-[#12221a] border border-[#234233] rounded-xl space-y-3">
                      <div className="text-[10px] text-gray-400">
                        Variantlar qo'shish uchun mahsulotni saqlang, keyin tahrirlash orqali variantlarni qo'shishingiz mumkin.
                      </div>
                      <div className="text-xs text-gray-300">
                        Hozircha variantlarni to'liq boshqarish funksiyasi ishlab chiqilmoqda.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1c3629]">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProduct(false);
                    setCurrentProduct(null);
                  }}
                  className="px-4 py-2 bg-[#14291f] border border-[#234233] text-gray-300 rounded-xl font-semibold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] hover:opacity-95 text-[#0d1713] font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 5: Currencies */}
      {activeTab === 'currencies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#dfbe9f]" />
              <span>Valyuta kurslari</span>
            </h2>
            <button
              onClick={async () => {
                setIsSyncingCurrencies(true);
                try {
                  const result = await api.syncCurrencies();
                  setCurrencies(result.currencies);
                  showToast(result.message || 'Kurslar yangilandi', 'success');
                } catch (err: any) {
                  showToast(err.message || "Kurslarni yangilab bo'lmadi", 'error');
                } finally {
                  setIsSyncingCurrencies(false);
                }
              }}
              disabled={isSyncingCurrencies}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a3327] hover:bg-[#234233] text-[#dfbe9f] rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingCurrencies ? 'animate-spin' : ''}`} />
              {isSyncingCurrencies ? 'Yangilanmoqda...' : 'Hozir yangilash (CBU)'}
            </button>
          </div>

          <p className="text-xs text-gray-500 -mt-2">
            USD, EUR, RUB, CNY kurslari O'zbekiston Markaziy banki (CBU) rasmiy API'sidan har 6 soatda avtomatik yangilanadi.
            Qo'lda kiritilgan qiymat keyingi avtomatik yangilanishda CBU'ning joriy kursi bilan almashtiriladi.
          </p>

          <div className="bg-[#0f1d17] rounded-2xl border border-[#234233] overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="bg-[#12221a] border-b border-[#234233]">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400">Valyuta</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400">Belgisi</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400">Kurs (UZS)</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400">Manba</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400">Holat</th>
                </tr>
              </thead>
              <tbody>
                {currencies.map((currency) => (
                  <tr key={currency.id} className="border-b border-[#1a3327] hover:bg-[#12221a]">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-white">{currency.code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[#dfbe9f] font-bold">{currency.symbol}</span>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        inputMode="decimal"
                        defaultValue={currency.rate || ''}
                        onBlur={(e) => {
                          const val = e.target.value.replace(/[^\d.]/g, '');
                          const newRate = val ? Number(val) : 0;
                          if (!newRate || newRate === currency.rate) return;
                          api.updateCurrency(currency.id, { rate: newRate }).then((updated) => {
                            setCurrencies(currencies.map(c =>
                              c.id === currency.id ? updated : c
                            ));
                            showToast('Kurs qo\'lda yangilandi', 'success');
                          }).catch((err) => showToast(err.message, 'error'));
                        }}
                        className="w-32 px-2 py-1 bg-[#0d1713] border border-[#234233] rounded-lg text-white text-sm focus:outline-none focus:border-[#dfbe9f]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        currency.source === 'manual'
                          ? 'bg-amber-900/30 text-amber-400 border border-amber-800/40'
                          : 'bg-sky-900/30 text-sky-400 border border-sky-800/40'
                      }`}>
                        {currency.source === 'manual' ? "Qo'lda" : 'CBU (avtomatik)'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          api.updateCurrency(currency.id, { isActive: !currency.isActive }).then(() => {
                            setCurrencies(currencies.map(c => 
                              c.id === currency.id ? { ...c, isActive: !currency.isActive } : c
                            ));
                            showToast('Holat yangilandi', 'success');
                          });
                        }}
                        className={`px-2 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          currency.isActive 
                            ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/40' 
                            : 'bg-gray-800/40 text-gray-400 border border-gray-700/40'
                        }`}
                      >
                        {currency.isActive ? 'Faol' : 'Nofaol'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Categories */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#dfbe9f]" />
              <span>Kategoriyalar</span>
            </h2>
            <button
              onClick={() => {
                setCurrentCategory({ name: '', slug: '', iconName: 'Folder', image: '' });
                setCategoryImageUpload(null);
                setIsEditingCategory(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] rounded-xl text-xs font-bold shadow-md hover:opacity-90 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi kategoriya</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryList.map((cat) => (
              <div key={cat.id} className="bg-[#0f1d17] rounded-2xl border border-[#234233] overflow-hidden">
                <div className="h-28 w-full bg-[#12221a] overflow-hidden">
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-sm">{cat.name}</span>
                    <button
                      onClick={() => handleToggleCategoryActive(cat)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer ${
                        cat.isActive
                          ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/40'
                          : 'bg-gray-800/40 text-gray-400 border border-gray-700/40'
                      }`}
                    >
                      {cat.isActive ? 'Faol' : 'Nofaol'}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400">/{cat.slug} • {cat.productCount ?? 0} mahsulot</p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        setCurrentCategory(cat);
                        setCategoryImageUpload(null);
                        setIsEditingCategory(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-[#12221a] hover:bg-[#183124] text-gray-200 rounded-lg text-xs font-semibold border border-[#234233] cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Tahrirlash</span>
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="flex items-center justify-center px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900/50 text-red-400 rounded-lg border border-red-900/40 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {categoryList.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-500 text-sm">
                Hali kategoriya yo'q. "Yangi kategoriya" tugmasi orqali qo'shing.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Banners */}
      {activeTab === 'banners' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#dfbe9f]" />
              <span>Bosh sahifa bannerlari</span>
            </h2>
            <button
              onClick={() => {
                setCurrentBanner({
                  titleLine1: '', productHighlights: [], order: banners.length, isActive: true,
                });
                setBannerImageUpload(null);
                setIsEditingBanner(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] rounded-xl text-xs font-bold shadow-md hover:opacity-90 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi banner</span>
            </button>
          </div>

          <div className="space-y-3">
            {banners.map((banner) => (
              <div key={banner.id} className="bg-[#0f1d17] rounded-2xl border border-[#234233] p-4 flex items-center gap-4">
                <GripVertical className="w-4 h-4 text-gray-600 shrink-0" />
                <div className="w-24 h-16 rounded-xl overflow-hidden bg-[#12221a] shrink-0">
                  <img src={banner.image} alt={banner.titleLine1} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">
                    {banner.titleLine1} {banner.titleLine2}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">{banner.subtitle || banner.tag || '—'}</p>
                </div>
                <button
                  onClick={() => handleToggleBannerActive(banner)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 cursor-pointer ${
                    banner.isActive
                      ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/40'
                      : 'bg-gray-800/40 text-gray-400 border border-gray-700/40'
                  }`}
                >
                  {banner.isActive ? 'Faol' : 'Nofaol'}
                </button>
                <button
                  onClick={() => {
                    setCurrentBanner(banner);
                    setBannerImageUpload(null);
                    setIsEditingBanner(true);
                  }}
                  className="p-2 bg-[#12221a] hover:bg-[#183124] text-gray-200 rounded-lg border border-[#234233] cursor-pointer shrink-0"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteBanner(banner.id)}
                  className="p-2 bg-red-950/40 hover:bg-red-900/50 text-red-400 rounded-lg border border-red-900/40 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {banners.length === 0 && (
              <div className="text-center py-10 text-gray-500 text-sm">
                Hali banner yo'q. "Yangi banner" tugmasi orqali qo'shing.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Category */}
      {isEditingCategory && currentCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0f1d17] border border-[#234233] rounded-3xl max-w-lg w-full p-6 space-y-4 my-auto shadow-2xl text-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c3629]">
              <h3 className="font-bold font-serif text-base text-white">
                {currentCategory.id ? 'Kategoriyani tahrirlash' : "Yangi kategoriya qo'shish"}
              </h3>
              <button
                onClick={() => { setIsEditingCategory(false); setCurrentCategory(null); }}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1a3327] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 mb-1 font-semibold">Nomi *</label>
                <input
                  type="text"
                  value={currentCategory.name || ''}
                  onChange={(e) => {
                    const name = e.target.value;
                    setCurrentCategory((prev) => {
                      const next = { ...prev, name };
                      // Auto-fill slug from name only while creating a new category
                      if (!prev?.id) {
                        next.slug = name.toLowerCase().trim()
                          .replace(/[^a-z0-9\s-]/g, '')
                          .replace(/\s+/g, '-');
                      }
                      return next;
                    });
                  }}
                  className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-semibold">Slug (url) *</label>
                <input
                  type="text"
                  value={currentCategory.slug || ''}
                  onChange={(e) => setCurrentCategory({ ...currentCategory, slug: e.target.value })}
                  className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-semibold">Rasm *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleSingleImageUpload(e, setCategoryImageUpload)}
                  className="w-full text-gray-300 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#dfbe9f] file:text-[#0d1713] file:font-bold file:cursor-pointer cursor-pointer"
                />
                {(categoryImageUpload || currentCategory.image) && (
                  <img
                    src={categoryImageUpload || currentCategory.image}
                    alt="Preview"
                    className="mt-2 w-full h-28 object-cover rounded-xl border border-[#234233]"
                  />
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsEditingCategory(false); setCurrentCategory(null); }}
                  className="flex-1 px-4 py-2.5 bg-[#12221a] hover:bg-[#183124] text-gray-200 rounded-xl font-semibold border border-[#234233] cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] rounded-xl font-bold shadow-md hover:opacity-90 cursor-pointer"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Banner */}
      {isEditingBanner && currentBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0f1d17] border border-[#234233] rounded-3xl max-w-xl w-full p-6 space-y-4 my-auto shadow-2xl text-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c3629]">
              <h3 className="font-bold font-serif text-base text-white">
                {currentBanner.id ? 'Bannerni tahrirlash' : "Yangi banner qo'shish"}
              </h3>
              <button
                onClick={() => { setIsEditingBanner(false); setCurrentBanner(null); }}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1a3327] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 mb-1 font-semibold">Ustki teg (masalan: YANGI TO'PLAM)</label>
                  <input
                    type="text"
                    value={currentBanner.tag || ''}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, tag: e.target.value })}
                    className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1 font-semibold">Kichik nishon (masalan: Tez yetkazib berish)</label>
                  <input
                    type="text"
                    value={currentBanner.badge || ''}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, badge: e.target.value })}
                    className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1 font-semibold">Sarlavha, 1-qator *</label>
                  <input
                    type="text"
                    value={currentBanner.titleLine1 || ''}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, titleLine1: e.target.value })}
                    className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1 font-semibold">Sarlavha, 2-qator</label>
                  <input
                    type="text"
                    value={currentBanner.titleLine2 || ''}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, titleLine2: e.target.value })}
                    className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-gray-300 mb-1 font-semibold">Urg'u so'z (rangli qism)</label>
                  <input
                    type="text"
                    value={currentBanner.titleAccent || ''}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, titleAccent: e.target.value })}
                    className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-gray-300 mb-1 font-semibold">Qisqa tavsif</label>
                  <textarea
                    value={currentBanner.subtitle || ''}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, subtitle: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1 font-semibold">Bosilganda o'tadigan kategoriya</label>
                  <select
                    value={currentBanner.categorySlug || ''}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, categorySlug: e.target.value })}
                    className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-white focus:outline-none focus:border-[#dfbe9f]"
                  >
                    <option value="">— tanlanmagan —</option>
                    {categoryList.map((c) => (
                      <option key={c.id} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-1 font-semibold">Tartib raqami</label>
                  <input
                    type="number"
                    value={currentBanner.order ?? 0}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, order: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-white focus:outline-none focus:border-[#dfbe9f]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-gray-300 mb-1 font-semibold">Rasm *</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleSingleImageUpload(e, setBannerImageUpload)}
                    className="w-full text-gray-300 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#dfbe9f] file:text-[#0d1713] file:font-bold file:cursor-pointer cursor-pointer"
                  />
                  {(bannerImageUpload || currentBanner.image) && (
                    <img
                      src={bannerImageUpload || currentBanner.image}
                      alt="Preview"
                      className="mt-2 w-full h-32 object-cover rounded-xl border border-[#234233]"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsEditingBanner(false); setCurrentBanner(null); }}
                  className="flex-1 px-4 py-2.5 bg-[#12221a] hover:bg-[#183124] text-gray-200 rounded-xl font-semibold border border-[#234233] cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] rounded-xl font-bold shadow-md hover:opacity-90 cursor-pointer"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
