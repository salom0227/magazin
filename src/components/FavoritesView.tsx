import React, { useState, useEffect } from 'react';
import { Heart, ShoppingBag, ArrowLeft, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { ProductCard } from './ProductCard';
import { api } from '../lib/api';
import type { Product } from '../types';

interface FavoritesViewProps {
  onOpenProduct: (product: Product) => void;
  onGoShopping: () => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  onOpenProduct,
  onGoShopping,
}) => {
  const { favorites } = useCart();
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // To'g'ridan-to'g'ri /api/favorites'dan yuklaydi (joriy hisobga bog'liq
  // holda serverda filtrlangan) — oldingi versiyada mahsulotlarning faqat
  // birinchi 50 tasi orasidan qidirilardi, shu sabab 50-o'rindan keyingi
  // sevimli mahsulot umuman ko'rinmasdi.
  useEffect(() => {
    setIsLoading(true);
    api
      .getFavorites()
      .then((products) => {
        setFavoriteProducts(products);
      })
      .catch(() => {
        setFavoriteProducts([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [favorites]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-tight flex items-center gap-2">
            <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
            <span>Saralangan mahsulotlar</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Sizga yoqqan mahsulotlar to'plami ({favorites.length} ta)
          </p>
        </div>

        <button
          onClick={onGoShopping}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#dfbe9f] hover:text-white bg-[#14281e] border border-[#234233] px-3.5 py-2 rounded-xl cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Katalogga qaytish</span>
        </button>
      </div>

      {/* Grid or Empty state */}
      {isLoading ? (
        <div className="py-20 text-center text-gray-400">
          <div className="w-8 h-8 border-3 border-[#dfbe9f] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Yuklanmoqda...</p>
        </div>
      ) : favoriteProducts.length === 0 ? (
        <div className="bg-[#0f1d17] rounded-2xl p-12 text-center border border-[#234233] space-y-4 max-w-md mx-auto shadow-xl">
          <div className="w-14 h-14 bg-rose-950/40 border border-rose-800/40 rounded-full flex items-center justify-center text-rose-400 mx-auto">
            <Heart className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-bold font-serif text-white">
            Saralangan mahsulotlar ro'yxati bo'sh
          </h3>
          <p className="text-xs text-gray-400">
            Sizga ma'qul kelgan mahsulotlardagi yurakcha belgisini bosib, ularni bu yerda saqlab qo'yishingiz mumkin.
          </p>
          <button
            onClick={onGoShopping}
            className="px-5 py-2.5 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] hover:opacity-95 text-[#0d1713] font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
          >
            Mahsulotlarni ko'rish
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {favoriteProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={onOpenProduct}
            />
          ))}
        </div>
      )}
    </div>
  );
};

