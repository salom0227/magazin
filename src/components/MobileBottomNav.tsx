import React from 'react';
import { Home, Layers, ShoppingBag, Package, User, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, setActiveTab }) => {
  const { itemsCount, setIsCartDrawerOpen, favorites } = useCart();
  const { user, openAuthModal } = useAuth();

  const handleTabClick = (tab: string) => {
    if (tab === 'cart') {
      setIsCartDrawerOpen(true);
      return;
    }
    if (tab === 'profile' && !user) {
      openAuthModal('login', () => setActiveTab('profile'));
      return;
    }
    if (tab === 'orders' && !user) {
      openAuthModal('login', () => setActiveTab('orders'));
      return;
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d1713]/95 backdrop-blur-lg border-t border-[#1d3328] shadow-2xl px-2 py-1.5 safe-area-pb">
      <div className="flex items-center justify-around">
        {/* Home */}
        <button
          onClick={() => handleTabClick('home')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'home'
              ? 'text-[#dfbe9f] font-bold scale-105'
              : 'text-gray-400 hover:text-white font-medium'
          }`}
        >
          <Home className={`w-5 h-5 ${activeTab === 'home' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5">Asosiy</span>
        </button>

        {/* Categories / Catalog */}
        <button
          onClick={() => handleTabClick('categories')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'text-[#dfbe9f] font-bold scale-105'
              : 'text-gray-400 hover:text-white font-medium'
          }`}
        >
          <Layers className={`w-5 h-5 ${activeTab === 'categories' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5">Katalog</span>
        </button>

        {/* Favorites */}
        <button
          onClick={() => handleTabClick('favorites')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative cursor-pointer ${
            activeTab === 'favorites'
              ? 'text-[#dfbe9f] font-bold scale-105'
              : 'text-gray-400 hover:text-white font-medium'
          }`}
        >
          <div className="relative">
            <Heart className={`w-5 h-5 ${activeTab === 'favorites' ? 'stroke-[2.5] fill-[#dfbe9f]' : 'stroke-2'}`} />
            {favorites.length > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {favorites.length}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Sevimlilar</span>
        </button>

        {/* Cart */}
        <button
          onClick={() => handleTabClick('cart')}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-gray-400 hover:text-[#dfbe9f] font-medium transition-all relative cursor-pointer"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 stroke-2" />
            {itemsCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {itemsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Savat</span>
        </button>

        {/* Profile */}
        <button
          onClick={() => handleTabClick('profile')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'text-[#dfbe9f] font-bold scale-105'
              : 'text-gray-400 hover:text-white font-medium'
          }`}
        >
          <User className={`w-5 h-5 ${activeTab === 'profile' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5">Profil</span>
        </button>
      </div>
    </nav>
  );
};

