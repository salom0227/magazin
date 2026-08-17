import React from 'react';
import {
  Sparkles,
  Droplets,
  Home,
  ShoppingBag,
  Sparkle,
  User,
  Heart,
  Folder,
  LayoutGrid,
  ArrowRight,
  Shirt,
  Tv,
  Smartphone,
  Watch
} from 'lucide-react';
import type { Category } from '../types';

interface CategoryListProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (slug: string) => void;
}

const iconMap: Record<string, any> = {
  Sparkles,
  Droplets,
  Home,
  ShoppingBag,
  Sparkle,
  User,
  Heart,
  Shirt,
  Tv,
  Smartphone,
  Watch,
  Folder,
};

export const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="w-full space-y-4 mb-6">
      {/* Category Visual Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#dfbe9f]" />
            <h3 className="font-serif text-lg sm:text-xl font-bold text-white tracking-wide">
              Kategoriyalar
            </h3>
          </div>
          <button
            onClick={() => onSelectCategory('all')}
            className="text-xs text-[#dfbe9f] hover:text-[#f3dfc8] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Barcha toifalar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Visual Category Cards Carousel/Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-2.5 sm:gap-3.5">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.slug;
            return (
              <div
                key={cat.id}
                onClick={() => onSelectCategory(cat.slug)}
                className={`group cursor-pointer flex flex-col items-center text-center p-2.5 rounded-2xl border transition-all duration-300 ${
                  isSelected
                    ? 'bg-[#1a3327] border-[#dfbe9f] shadow-lg shadow-[#dfbe9f]/10 scale-102'
                    : 'bg-[#102018] border-[#1e382b] hover:border-[#2d523f] hover:bg-[#14291f]'
                }`}
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-[#0d1713] border border-[#254637] mb-2 relative flex items-center justify-center group-hover:border-[#dfbe9f]/50 transition-colors">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-40 group-hover:opacity-10 transition-opacity" />
                </div>
                <span
                  className={`text-[11px] sm:text-xs font-semibold line-clamp-1 transition-colors ${
                    isSelected ? 'text-[#dfbe9f]' : 'text-gray-200 group-hover:text-[#dfbe9f]'
                  }`}
                >
                  {cat.name}
                </span>
                <span className="text-[10px] text-gray-400">
                  {cat.productCount || 0} ta
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pill Filter Quick Strip */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {/* All Products pill */}
        <button
          onClick={() => onSelectCategory('all')}
          className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] shadow-md'
              : 'bg-[#12241c] hover:bg-[#172e23] text-gray-300 hover:text-white border border-[#244233]'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Barchasi</span>
        </button>

        {/* Category pills */}
        {categories.map((cat) => {
          const IconComponent = iconMap[cat.iconName] || Folder;
          const isSelected = selectedCategory === cat.slug;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.slug)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] shadow-md font-bold'
                  : 'bg-[#12241c] hover:bg-[#172e23] text-gray-300 hover:text-white border border-[#244233]'
              }`}
            >
              <IconComponent className={`w-3.5 h-3.5 ${isSelected ? 'text-[#0d1713]' : 'text-[#dfbe9f]'}`} />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

