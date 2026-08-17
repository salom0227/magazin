import React from 'react';
import { Heart, Star, ShoppingBag, Plus, Minus, Check, Zap } from 'lucide-react';
import type { Product } from '../types';
import { formatInstallment } from '../lib/formatters';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const { addToCart, updateQuantity, getItemQuantity, toggleFavorite, isFavorite } = useCart();
  const { formatPrice } = useCurrency();
  const quantityInCart = getItemQuantity(product.id);
  const isFav = isFavorite(product.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(product.id);
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, 1);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateQuantity(product.id, quantityInCart - 1);
  };

  return (
    <div
      onClick={() => onClick(product)}
      className="bg-[#12221a] rounded-2xl border border-[#223d32] hover:border-[#dfbe9f]/60 flex flex-col p-3 shadow-md hover:shadow-xl hover:shadow-[#dfbe9f]/5 transition-all duration-300 relative cursor-pointer group justify-between"
    >
      {/* Favorite Button */}
      <button
        type="button"
        onClick={handleFavoriteClick}
        className={`absolute top-3 right-3 z-10 p-2 rounded-full bg-[#0e1b15]/80 backdrop-blur-xs border border-[#2a4a3b] transition-all cursor-pointer ${
          isFav ? 'text-rose-500 bg-rose-950/40 border-rose-800/60' : 'text-gray-400 hover:text-white hover:border-[#dfbe9f]'
        }`}
        aria-label="Sevimlilarga qo'shish"
      >
        <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500' : ''}`} />
      </button>

      {/* Product Image Box */}
      <div className="w-full aspect-square bg-[#0b1611] rounded-xl mb-2.5 flex items-center justify-center relative overflow-hidden border border-[#1a3227]">
        {/* Aksiya / Discount Badge */}
        {product.discount && product.discount > 0 ? (
          <div className="absolute top-2.5 left-2.5 bg-gradient-to-r from-amber-600 to-rose-600 text-white text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wider z-10 shadow-sm flex items-center gap-1">
            <Zap className="w-2.5 h-2.5 fill-white" />
            <span>-{product.discount}% AKSIYA</span>
          </div>
        ) : product.isNew ? (
          <div className="absolute top-2.5 left-2.5 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wider z-10 shadow-sm">
            YANGI
          </div>
        ) : null}

        <img
          src={product.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Stock Alert if sold out */}
        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-[#0d1713]/85 backdrop-blur-xs flex items-center justify-center z-20">
            <span className="bg-[#1f372c] text-[#dfbe9f] border border-[#305743] text-[11px] font-bold px-3 py-1 rounded-lg shadow-sm">
              Sotuvda tugagan
            </span>
          </div>
        )}
      </div>

      {/* Rating Row */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="flex items-center text-amber-400">
          <Star className="w-3 h-3 fill-amber-400" />
        </div>
        <span className="text-[11px] text-gray-300 font-semibold">
          {product.rating}
        </span>
        <span className="text-[10px] text-gray-400">
          ({product.reviewsCount || 0} sharh)
        </span>
      </div>

      {/* Product Title */}
      <h4 className="text-xs sm:text-sm font-medium leading-snug line-clamp-2 h-9 mb-1.5 text-gray-100 group-hover:text-[#dfbe9f] transition-colors">
        {product.name}
      </h4>

      {/* Price & Add to Cart Footer */}
      <div className="mt-auto pt-2 border-t border-[#1d352b] flex items-center justify-between">
        <div>
          {product.oldPrice && product.oldPrice > product.price && (
            <div className="text-[10px] text-gray-400 line-through">
              {formatPrice(product.oldPrice)}
            </div>
          )}
          <div className="text-xs sm:text-sm font-bold text-[#dfbe9f] tracking-tight">
            {formatPrice(product.price)}
          </div>
        </div>

        {quantityInCart > 0 ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center border border-[#3b634f] rounded-xl bg-[#162a20] p-0.5"
          >
            <button
              type="button"
              onClick={handleDecrement}
              className="w-6 h-6 flex items-center justify-center bg-[#102018] text-[#dfbe9f] hover:bg-[#1f382b] rounded-lg transition-colors cursor-pointer font-bold text-xs"
            >
              -
            </button>
            <span className="text-xs font-bold text-white px-2">
              {quantityInCart}
            </span>
            <button
              type="button"
              onClick={handleIncrement}
              disabled={product.stock <= quantityInCart}
              className="w-6 h-6 flex items-center justify-center bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] hover:opacity-90 rounded-lg transition-all cursor-pointer font-bold text-xs disabled:opacity-40"
            >
              +
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAddClick}
            disabled={product.stock <= 0}
            className="w-8 h-8 rounded-xl bg-[#172c22] border border-[#2b4c3c] flex items-center justify-center text-[#dfbe9f] hover:bg-gradient-to-r hover:from-[#dfbe9f] hover:to-[#b88a64] hover:text-[#0d1713] hover:border-transparent transition-all cursor-pointer disabled:opacity-40 shadow-xs"
            title="Savatga qo'shish"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

