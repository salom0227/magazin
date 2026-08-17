import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  ShoppingBag,
  Heart,
  User as UserIcon,
  MapPin,
  X,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Menu,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { formatPrice } from '../lib/formatters';
import type { Category } from '../types';

interface NavbarProps {
  categories: Category[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectCategory: (categorySlug: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenProduct: (productId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  categories,
  searchQuery,
  onSearchChange,
  onSelectCategory,
  activeTab,
  setActiveTab,
}) => {
  const { user, isAdmin, openAuthModal, logout } = useAuth();
  const { itemsCount, subtotal, setIsCartDrawerOpen, favorites } = useCart();
  const { currencies, selectedCurrency, setSelectedCurrency, formatPrice: formatPriceWithCurrency } = useCurrency();

  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [language, setLanguage] = useState<'uz' | 'ru'>('uz');
  const catalogRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (catalogRef.current && !catalogRef.current.contains(event.target as Node)) {
        setIsCatalogOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
      if (currencyRef.current && !currencyRef.current.contains(event.target as Node)) {
        setIsCurrencyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { label: 'Bosh sahifa', slug: 'all' },
    { label: 'Ayollar uchun', slug: 'women' },
    { label: 'Erkaklar uchun', slug: 'men' },
    { label: 'Uy uchun', slug: 'home' },
    { label: 'Bolalar uchun', slug: 'kids' },
    { label: 'Aksessuarlar', slug: 'accessories' },
    { label: 'Aksiyalar', slug: 'beauty-care', isSpecial: true },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0d1713] border-b border-[#1b2e24] shadow-md">
      {/* Top Utility Bar */}
      <div className="bg-[#070e0a] text-gray-400 text-xs py-1.5 px-4 sm:px-6 border-b border-[#17261e]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6 text-[11px]">
            <div className="flex items-center gap-1.5 text-gray-300">
              <Zap className="w-3 h-3 text-[#dfbe9f]" />
              <span>Tez yetkazib berish</span>
            </div>
            <span className="hidden sm:inline text-gray-700">|</span>
            <div className="hidden sm:flex items-center gap-1.5 text-gray-300">
              <span className="text-[#dfbe9f] font-bold">✓</span>
              <span>100% Original mahsulotlar</span>
            </div>
            <span className="hidden md:inline text-gray-700">|</span>
            <div className="hidden md:flex items-center gap-1.5 text-gray-300">
              <ShieldCheck className="w-3.5 h-3.5 text-[#dfbe9f]" />
              <span>Ishonchli to'lov</span>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 text-[11px]">
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className="flex items-center gap-1.5 text-[#dfbe9f] hover:text-[#f3dfc8] font-semibold bg-[#172a21] px-2.5 py-0.5 rounded border border-[#2b4b3b] cursor-pointer transition-colors"
              >
                <LayoutDashboard className="w-3 h-3" />
                <span>Admin Panel</span>
              </button>
            )}

            <div className="hidden lg:flex items-center gap-1.5 text-gray-400">
              <span>Aloqa:</span>
              <strong className="text-gray-200">+998 71 200-00-20</strong>
            </div>

            <div className="flex items-center gap-1 text-gray-300 cursor-pointer hover:text-white">
              <span>{language === 'uz' ? "O'zbekcha" : "Русский"}</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </div>

            {/* Currency Selector */}
            <div className="relative" ref={currencyRef}>
              <button
                onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                className="flex items-center gap-1.5 text-gray-300 hover:text-white cursor-pointer transition-colors"
              >
                <DollarSign className="w-3.5 h-3.5 text-[#dfbe9f]" />
                <span className="font-bold text-[#dfbe9f]">{selectedCurrency?.code || 'UZS'}</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {isCurrencyDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-[#0f1d17] border border-[#234233] rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setSelectedCurrency({ id: 'currency-uzs', code: 'UZS', symbol: "so'm", rate: 1, isActive: true });
                        setIsCurrencyDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        selectedCurrency?.code === 'UZS' ? 'bg-[#1a3327] text-[#dfbe9f]' : 'text-gray-300 hover:bg-[#12221a] hover:text-white'
                      }`}
                    >
                      <span className="font-bold">UZS</span>
                      <span className="text-gray-400">so'm</span>
                    </button>
                    {currencies.filter(c => c.isActive).map((currency) => (
                      <button
                        key={currency.id}
                        onClick={() => {
                          setSelectedCurrency(currency);
                          setIsCurrencyDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          selectedCurrency?.code === currency.code ? 'bg-[#1a3327] text-[#dfbe9f]' : 'text-gray-300 hover:bg-[#12221a] hover:text-white'
                        }`}
                      >
                        <span className="font-bold">{currency.code}</span>
                        <span className="text-gray-400">{currency.symbol}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Brand & Search Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3 sm:gap-6">
          {/* Velora Shop Luxury Monogram & Brand Logo */}
          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            <div
              onClick={() => {
                onSelectCategory('all');
                setActiveTab('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2.5 cursor-pointer select-none group"
            >
              {/* Stylized V Monogram with Bag & Leaf motif */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1c3328] to-[#12221a] border border-[#305342] flex items-center justify-center text-[#dfbe9f] shadow-inner group-hover:border-[#dfbe9f] transition-all relative">
                <span className="font-serif font-bold text-2xl tracking-tighter bg-gradient-to-b from-[#f3dfc8] to-[#c79d7b] bg-clip-text text-transparent">
                  V
                </span>
                <span className="absolute -top-1 -right-1 text-[10px] text-[#dfbe9f]">✦</span>
              </div>

              <div className="flex flex-col">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-serif text-xl sm:text-2xl font-bold tracking-wider text-white group-hover:text-[#dfbe9f] transition-colors">
                    VELORA
                  </span>
                  <span className="text-[11px] font-semibold text-[#dfbe9f] tracking-widest uppercase">
                    SHOP
                  </span>
                </div>
                <span className="text-[8px] sm:text-[9px] text-gray-400 tracking-widest uppercase font-medium">
                  BEAUTY • CARE • HOME • EVERYDAY
                </span>
              </div>
            </div>

            {/* Catalog Button */}
            <div className="relative hidden md:block" ref={catalogRef}>
              <button
                onClick={() => setIsCatalogOpen(!isCatalogOpen)}
                className={`bg-[#162720] hover:bg-[#1c3328] text-white border border-[#274436] px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all cursor-pointer text-xs ${
                  isCatalogOpen ? 'bg-[#1c3328] border-[#dfbe9f] text-[#dfbe9f]' : ''
                }`}
              >
                {isCatalogOpen ? (
                  <X className="w-4 h-4 text-[#dfbe9f]" />
                ) : (
                  <Menu className="w-4 h-4 text-[#dfbe9f]" />
                )}
                <span className="font-semibold">Katalog</span>
              </button>

              {/* Catalog Popover */}
              {isCatalogOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-[#12221a] rounded-2xl shadow-2xl border border-[#284637] py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-[#1b3225] flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#dfbe9f] uppercase tracking-wider">
                      Toifalar
                    </span>
                    <span className="text-[11px] text-gray-400 font-semibold">{categories.length} ta toifa</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto py-1">
                    <button
                      onClick={() => {
                        onSelectCategory('all');
                        setIsCatalogOpen(false);
                        setActiveTab('home');
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#dfbe9f] hover:bg-[#182c22] flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>Barcha mahsulotlar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          onSelectCategory(cat.slug);
                          setIsCatalogOpen(false);
                          setActiveTab('home');
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs text-gray-200 hover:text-[#dfbe9f] hover:bg-[#182c22] flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={cat.image}
                            alt={cat.name}
                            className="w-7 h-7 rounded-lg object-cover border border-[#2d4c3c]"
                          />
                          <span className="font-medium">{cat.name}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {cat.productCount || 0}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search Input Bar with Gold Action Button */}
          <div className="flex-1 max-w-2xl relative">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Mahsulot, brend yoki kategoriya..."
                className="w-full bg-[#13231c] border border-[#243e32] text-gray-100 placeholder:text-gray-500 rounded-xl py-2 pl-4 pr-12 text-xs sm:text-sm focus:outline-none focus:border-[#dfbe9f] focus:ring-1 focus:ring-[#dfbe9f]/30 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <Search className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Right Action Icons: Kirish, Sevimlilar, Savat */}
          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            {/* Kirish / Profile */}
            <div className="relative" ref={profileRef}>
              {user ? (
                <div>
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex flex-col items-center cursor-pointer text-gray-300 hover:text-[#dfbe9f] transition-colors"
                  >
                    <UserIcon className="w-5 h-5 text-gray-200 hover:text-[#dfbe9f]" />
                    <span className="text-[10px] mt-0.5 font-medium text-gray-300">{user.firstName}</span>
                  </button>

                  {/* Profile Dropdown */}
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-[#12221a] rounded-xl shadow-xl border border-[#274436] py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-3 py-2 border-b border-[#1b3225]">
                        <p className="text-xs font-bold text-white">{user.firstName} {user.lastName}</p>
                        <p className="text-[10px] text-gray-400">{user.phone}</p>
                      </div>

                      <button
                        onClick={() => {
                          setActiveTab('profile');
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-medium text-gray-200 hover:bg-[#182c22] hover:text-[#dfbe9f] flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>Mening profilim</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('orders');
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-medium text-gray-200 hover:bg-[#182c22] hover:text-[#dfbe9f] flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Buyurtmalarim</span>
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => {
                            setActiveTab('admin');
                            setIsProfileDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-semibold text-[#dfbe9f] hover:bg-[#182c22] flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5 text-[#dfbe9f]" />
                          <span>Admin Panel</span>
                        </button>
                      )}

                      <div className="border-t border-[#1b3225] my-1" />

                      <button
                        onClick={() => {
                          logout();
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-medium text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Chiqish</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => openAuthModal('login')}
                  className="flex flex-col items-center cursor-pointer text-gray-300 hover:text-[#dfbe9f] transition-colors"
                >
                  <UserIcon className="w-5 h-5 stroke-[1.75]" />
                  <span className="text-[10px] mt-0.5 font-medium">Kirish</span>
                </div>
              )}
            </div>

            {/* Sevimlilar */}
            <div
              onClick={() => setActiveTab('favorites')}
              className={`flex flex-col items-center cursor-pointer transition-colors relative ${
                activeTab === 'favorites' ? 'text-[#dfbe9f]' : 'text-gray-300 hover:text-[#dfbe9f]'
              }`}
            >
              <div className="relative">
                <Heart className={`w-5 h-5 stroke-[1.75] ${favorites.length > 0 ? 'text-rose-500 fill-rose-500' : ''}`} />
                {favorites.length > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-xs">
                    {favorites.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 font-medium">Sevimlilar</span>
            </div>

            {/* Savat */}
            <div
              onClick={() => setIsCartDrawerOpen(true)}
              className="flex flex-col items-center cursor-pointer text-gray-300 hover:text-[#dfbe9f] relative transition-colors"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5 stroke-[1.75]" />
                {itemsCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-xs">
                    {itemsCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 font-medium">Savat</span>
            </div>
          </div>
        </div>
      </div>

      {/* Velora Luxury Navigation Bar (Horizontal Tabs) */}
      <nav className="bg-[#0b1410] border-t border-[#182c23] px-4 sm:px-6 py-2 flex items-center gap-6 sm:gap-8 text-xs overflow-x-auto no-scrollbar max-w-7xl mx-auto">
        {navLinks.map((link) => {
          const isActive = activeTab === 'home' && (link.slug === 'all' ? true : false);
          return (
            <button
              key={link.label}
              onClick={() => {
                onSelectCategory(link.slug);
                setActiveTab('home');
              }}
              className={`whitespace-nowrap transition-all cursor-pointer font-medium relative py-1 ${
                link.isSpecial
                  ? 'text-amber-300 hover:text-amber-200 font-semibold'
                  : 'text-gray-300 hover:text-[#dfbe9f]'
              }`}
            >
              <span>{link.label}</span>
              {link.slug === 'all' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
