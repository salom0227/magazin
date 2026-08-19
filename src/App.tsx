import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Flame,
  Filter,
  ArrowUpDown,
  Search,
  Layers,
  ChevronRight,
  RefreshCw,
  ShoppingBag,
  SlidersHorizontal
} from 'lucide-react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { CurrencyProvider, useCurrency } from './context/CurrencyContext';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { HeroBanner } from './components/HeroBanner';
import { CategoryList } from './components/CategoryList';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { OrdersView } from './components/OrdersView';
import { ProfileView } from './components/ProfileView';
import { FavoritesView } from './components/FavoritesView';
import { AuthModal } from './components/AuthModal';
import { SALE_CATEGORY_SLUG } from './lib/constants';
import { Footer } from './components/Footer';
import { api } from './lib/api';
import type { Product, Category, Order } from './types';

// Admin panel is heavy (tables, charts) and only needed by admins — split it out of the
// main bundle so regular shoppers, especially on mobile, don't pay for its weight upfront.
const AdminPanel = React.lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const AdminLoginView = React.lazy(() => import('./components/AdminLoginView').then(m => ({ default: m.AdminLoginView })));

const MainAppContent: React.FC = () => {
  const { user, isAdmin, openAuthModal } = useAuth();
  const { isCartDrawerOpen } = useCart();

  // Navigation State
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined' && (window.location.pathname === '/admin' || window.location.pathname === '/admin/')) {
      return 'admin';
    }
    return 'home';
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc' | 'rating' | 'new'>('popular');

  // Sync browser URL with activeTab
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (activeTab === 'admin' && window.location.pathname !== '/admin') {
        window.history.pushState({}, '', '/admin');
      } else if (activeTab !== 'admin' && window.location.pathname === '/admin') {
        window.history.pushState({}, '', '/');
      }
    }
  }, [activeTab]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/admin' || window.location.pathname === '/admin/') {
        setActiveTab('admin');
      } else {
        setActiveTab('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Fetch muvaffaqiyatsiz bo'lganda avval faqat konsolga yozilardi, ekranda
  // esa "Mahsulot topilmadi" chiqardi — xuddi qidiruv natija bermagandek,
  // mijoz server ishlamayotganini bilmay qolardi. Endi bu ikki holat
  // ajratiladi.
  const [loadError, setLoadError] = useState<boolean>(false);

  // Modals
  const [selectedProductModalId, setSelectedProductModalId] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Load initial categories & products
  const loadData = async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const [catsRes, prodsRes] = await Promise.all([
        api.getCategories(),
        api.getProducts({
          // "Aksiyalar" haqiqiy kategoriya emas — chegirmali mahsulotlarni
          // discount filtri orqali ko'rsatadi (pastdagi SALE_CATEGORY_SLUG).
          category: selectedCategory !== 'all' && selectedCategory !== SALE_CATEGORY_SLUG ? selectedCategory : undefined,
          onSale: selectedCategory === SALE_CATEGORY_SLUG ? true : undefined,
          search: searchQuery.trim() || undefined,
          sort: sortBy,
        }),
      ]);
      setCategories(catsRes);
      setProducts(prodsRes.products);
    } catch (err) {
      console.error('Error fetching data:', err);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, searchQuery, sortBy]);

  const handleOpenProduct = (product: Product) => {
    setSelectedProductModalId(product.id);
  };

  const handleOpenProductById = (productId: string) => {
    setSelectedProductModalId(productId);
  };

  const handleCategorySelect = (slug: string) => {
    setSelectedCategory(slug);
    setActiveTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If Admin tab is selected
  if (activeTab === 'admin') {
    const adminFallback = (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1713]">
        <RefreshCw className="w-6 h-6 text-[#dfbe9f] animate-spin" />
      </div>
    );
    if (isAdmin) {
      return (
        <React.Suspense fallback={adminFallback}>
          <AdminPanel
            categories={categories}
            onExitAdmin={() => {
              if (typeof window !== 'undefined') window.history.pushState({}, '', '/');
              setActiveTab('home');
            }}
            onRefreshData={loadData}
          />
        </React.Suspense>
      );
    }
    return (
      <React.Suspense fallback={adminFallback}>
        <AdminLoginView
          onGoHome={() => {
            if (typeof window !== 'undefined') window.history.pushState({}, '', '/');
            setActiveTab('home');
          }}
        />
      </React.Suspense>
    );
  }

  // Flash Sale products (discount > 15%)
  const flashSaleProducts = products.filter((p) => (p.discount || 0) >= 15).slice(0, 5);

  return (
    <div className="min-h-screen bg-[#0d1713] flex flex-col selection:bg-[#dfbe9f] selection:text-[#0d1713] font-sans text-gray-100">
      {/* Top Navbar */}
      <Navbar
        categories={categories}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectCategory={handleCategorySelect}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenProduct={handleOpenProductById}
      />

      {/* Main Content Router */}
      <main className="flex-1">
        {activeTab === 'orders' ? (
          <OrdersView
            onOpenProduct={handleOpenProductById}
            onGoShopping={() => setActiveTab('home')}
          />
        ) : activeTab === 'profile' ? (
          <ProfileView
            onGoToOrders={() => setActiveTab('orders')}
            onGoToFavorites={() => setActiveTab('favorites')}
            onGoToAdmin={() => setActiveTab('admin')}
          />
        ) : activeTab === 'favorites' ? (
          <FavoritesView
            onOpenProduct={handleOpenProduct}
            onGoShopping={() => setActiveTab('home')}
          />
        ) : activeTab === 'categories' ? (
          /* Mobile Full Categories View */
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#dfbe9f]" />
              <span>Barcha kategoriyalar</span>
            </h1>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div
                onClick={() => handleCategorySelect('all')}
                className="p-4 bg-[#12221a] rounded-2xl border border-[#234233] hover:border-[#dfbe9f] shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-[#dfbe9f]">Barcha mahsulotlar</span>
                  <ChevronRight className="w-4 h-4 text-[#dfbe9f]" />
                </div>
                <p className="text-xs text-gray-400">{products.length} ta mahsulot</p>
              </div>

              {categories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.slug)}
                  className="p-3 bg-[#12221a] rounded-2xl border border-[#234233] hover:border-[#dfbe9f] shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-24 object-cover rounded-xl mb-2 group-hover:scale-105 transition-transform"
                  />
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs text-gray-100 group-hover:text-[#dfbe9f]">
                      {cat.name}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {cat.productCount} ta
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Default: Home / Catalog View */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-5">
            {/* Hero Banners */}
            {selectedCategory === 'all' && !searchQuery && (
              <HeroBanner onBannerClick={handleCategorySelect} />
            )}

            {/* Category Slider Bar */}
            <div className="space-y-2">
              <CategoryList
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={handleCategorySelect}
              />
            </div>

            {/* Flash Deals / Katta chegirmalar Section */}
            {selectedCategory === 'all' && !searchQuery && flashSaleProducts.length > 0 && (
              <div className="bg-gradient-to-r from-[#10241b] via-[#162e22] to-[#12221a] rounded-3xl p-5 text-white space-y-4 shadow-xl border border-[#244233]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#dfbe9f] text-[#0d1713] flex items-center justify-center font-bold">
                      <Flame className="w-4 h-4 fill-[#0d1713]" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold font-serif tracking-wide">
                        Maxsus takliflar & Katta Chegirmalar
                      </h2>
                      <p className="text-xs text-gray-300">
                        Eng ommabop premium mahsulotlar uchun cheklangan vaqtdagi aksiyalar
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold px-3 py-1 bg-[#172c21] text-[#dfbe9f] rounded-full border border-[#2a4d3b]">
                    24 soat qoldi
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {flashSaleProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      onClick={handleOpenProduct}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Products Filter & Sorting Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#182c23]">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 font-serif">
                  <span>
                    {searchQuery
                      ? `"${searchQuery}" bo'yicha qidiruv natijalari`
                      : selectedCategory === 'all'
                      ? 'Ommabop mahsulotlar'
                      : selectedCategory === SALE_CATEGORY_SLUG
                      ? 'Aksiyadagi mahsulotlar'
                      : categories.find((c) => c.slug === selectedCategory)?.name || 'Katalog'}
                  </span>
                  <span className="text-xs font-bold text-[#dfbe9f] bg-[#162a20] border border-[#2b4c3b] px-2.5 py-0.5 rounded-full font-sans">
                    {products.length} ta
                  </span>
                </h2>
                {selectedCategory !== 'all' && (
                  <button
                    onClick={() => handleCategorySelect('all')}
                    className="text-xs text-[#dfbe9f] hover:text-[#f3dfc8] font-semibold mt-0.5 block cursor-pointer transition-colors"
                  >
                    ← Barcha toifalarga qaytish
                  </button>
                )}
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-xs text-gray-400 font-medium hidden sm:inline">Saralash:</span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-1.5 bg-[#12221a] border border-[#234233] rounded-xl text-xs font-semibold text-gray-200 shadow-sm focus:outline-none focus:border-[#dfbe9f] cursor-pointer"
                  >
                    <option value="popular">Ommabopligi bo'yicha</option>
                    <option value="price_asc">Narx: arzondan qimmatga</option>
                    <option value="price_desc">Narx: qimmatdan arzonga</option>
                    <option value="rating">Reytingi yuqori</option>
                    <option value="new">Yangilari avval</option>
                  </select>
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#dfbe9f] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Products Main High Density Grid */}
            {isLoading ? (
              <div className="py-24 text-center text-gray-400 space-y-3">
                <div className="w-8 h-8 border-3 border-[#dfbe9f] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-semibold text-gray-300">Mahsulotlar yuklanmoqda...</p>
              </div>
            ) : loadError ? (
              <div className="bg-[#12221a] rounded-3xl p-12 text-center border border-[#234233] space-y-3 max-w-md mx-auto shadow-xl">
                <div className="w-12 h-12 bg-[#172c21] border border-[#284938] rounded-2xl flex items-center justify-center text-[#dfbe9f] mx-auto">
                  <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
                </div>
                <h3 className="text-sm font-bold text-white">Ma'lumotlarni yuklab bo'lmadi</h3>
                <p className="text-xs text-gray-400">
                  Server bilan bog'lanishda xatolik yuz berdi. Internetni tekshirib, qayta urinib ko'ring
                </p>
                <button
                  onClick={() => loadData()}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] font-bold text-xs rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                >
                  Qayta urinish
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="bg-[#12221a] rounded-3xl p-12 text-center border border-[#234233] space-y-3 max-w-md mx-auto shadow-xl">
                <div className="w-12 h-12 bg-[#172c21] border border-[#284938] rounded-2xl flex items-center justify-center text-[#dfbe9f] mx-auto">
                  <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
                </div>
                <h3 className="text-sm font-bold text-white">Mahsulot topilmadi</h3>
                <p className="text-xs text-gray-400">
                  Qidiruv so'zini o'zgartirib ko'ring yoki boshqa toifani tanlang
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] font-bold text-xs rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                >
                  Filtrlarni tozalash
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={handleOpenProduct}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Global Modals & Drawers */}
      <AuthModal />
      <CartDrawer onOpenProduct={handleOpenProductById} />
      <CheckoutModal
        onOrderSuccess={(ord) => {
          setCompletedOrder(ord);
        }}
      />
      <OrderSuccessModal
        order={completedOrder}
        onClose={() => setCompletedOrder(null)}
        onViewOrders={() => {
          setCompletedOrder(null);
          setActiveTab('orders');
        }}
      />
      <ProductDetailModal
        productId={selectedProductModalId}
        onClose={() => setSelectedProductModalId(null)}
        onSelectProduct={(p) => setSelectedProductModalId(p.id)}
      />

      {/* Footer */}
      <Footer />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <CurrencyProvider>
            <MainAppContent />
          </CurrencyProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
