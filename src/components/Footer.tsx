import React from 'react';
import { ShoppingBag, ShieldCheck, Truck, RotateCcw, Headphones, ArrowUpRight, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#08120d] text-gray-400 text-xs pt-10 pb-20 md:pb-10 border-t border-[#1a3327]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Links Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Col 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1c3328] to-[#12221a] border border-[#305342] flex items-center justify-center text-[#dfbe9f] font-serif font-bold text-lg">
                V
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-serif font-bold text-base text-white tracking-wider">VELORA</span>
                <span className="text-[10px] font-semibold text-[#dfbe9f] uppercase tracking-widest">SHOP</span>
              </div>
            </div>
            <p className="text-gray-400 leading-relaxed text-[11px]">
              Beauty, parvarish, uy-ro'zg'or va kundalik mahsulotlar uchun premium online market. Sifatli va original tanlov.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-[#dfbe9f] font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sifat va nafosat uyg'unligi</span>
            </div>
          </div>

          {/* Col 2: Kompaniya */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Kompaniya</h4>
            <ul className="space-y-1.5 text-[11px] text-gray-400">
              <li><a href="#about" className="hover:text-[#dfbe9f] transition-colors">Biz haqimizda</a></li>
              <li><a href="#vacancies" className="hover:text-[#dfbe9f] transition-colors">Vakansiyalar</a></li>
              <li><a href="#points" className="hover:text-[#dfbe9f] transition-colors">Topshirish punktlari</a></li>
              <li><a href="#rules" className="hover:text-[#dfbe9f] transition-colors">Foydalanish qoidalari</a></li>
            </ul>
          </div>

          {/* Col 3: Xaridorlarga */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Xaridorlarga</h4>
            <ul className="space-y-1.5 text-[11px] text-gray-400">
              <li><a href="#faq" className="hover:text-[#dfbe9f] transition-colors">Savol-javoblar (FAQ)</a></li>
              <li><a href="#delivery" className="hover:text-[#dfbe9f] transition-colors">Yetkazib berish</a></li>
              <li><a href="#warranty" className="hover:text-[#dfbe9f] transition-colors">Kafolat va qaytarish</a></li>
              <li><a href="#installment" className="hover:text-[#dfbe9f] transition-colors">To'lov turlari</a></li>
            </ul>
          </div>

          {/* Col 4: Aloqa va To'lov */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Mijozlar xizmati</h4>
            <p className="text-gray-300 font-semibold text-sm">+998 71 200-00-20</p>
            <p className="text-[11px] text-gray-400">Har kuni: 09:00 dan 21:00 gacha</p>

            <div className="pt-2 flex flex-wrap gap-1.5">
              <span className="px-2.5 py-1 bg-[#12221a] border border-[#234233] rounded-lg text-gray-200 font-bold text-[10px]">
                Payme
              </span>
              <span className="px-2.5 py-1 bg-[#12221a] border border-[#234233] rounded-lg text-gray-200 font-bold text-[10px]">
                Click
              </span>
              <span className="px-2.5 py-1 bg-[#12221a] border border-[#234233] rounded-lg text-gray-200 font-bold text-[10px]">
                Uzum
              </span>
              <span className="px-2.5 py-1 bg-[#12221a] border border-[#234233] rounded-lg text-gray-200 font-bold text-[10px]">
                Uzcard / Humo
              </span>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-6 border-t border-[#172e23] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-500">
          <div className="flex flex-wrap gap-4">
            <a href="#about" className="hover:text-gray-300">Biz haqimizda</a>
            <a href="#delivery" className="hover:text-gray-300">Yetkazib berish</a>
            <a href="#return" className="hover:text-gray-300">Qaytarish</a>
            <a href="#terms" className="hover:text-gray-300">Maxfiylik siyosati</a>
          </div>
          <p>© 2026 Velora Shop. Barcha huquqlar himoyalangan.</p>
        </div>
      </div>
    </footer>
  );
};

