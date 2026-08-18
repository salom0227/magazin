import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  ShieldCheck,
  ArrowRight,
  Truck,
  CheckCircle2,
  Gift
} from 'lucide-react';
import type { Banner } from '../types';
import { api } from '../lib/api';

interface HeroBannerProps {
  onBannerClick: (categorySlug: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onBannerClick }) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    api.getBanners().then(setBanners).catch(() => setBanners([]));
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % banners.length);
  };

  const banner = banners[current];

  return (
    <div className="space-y-4 mb-6">
      {/* Main Luxury Dark Emerald Hero Box */}
      {banner && (
        <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-[#223d30] bg-[#0c1813] group">
        {/* Atmospheric radial gradient highlights */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#214b38]/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-[#dfbe9f]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-8 sm:py-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Typography and CTA */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-5 text-white">
              {banner.tag && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#162e22] border border-[#2b513d] text-[11px] font-semibold text-[#dfbe9f] tracking-wider uppercase">
                    <Sparkles className="w-3 h-3 text-[#dfbe9f]" />
                    {banner.tag}
                  </span>
                </div>
              )}

              {/* Large Luxury Serif Heading */}
              <div className="font-serif tracking-tight leading-[1.08] text-white">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-display">
                  {banner.titleLine1}
                </h1>
                {(banner.titleLine2 || banner.titleAccent) && (
                  <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-display">
                    {banner.titleLine2}{' '}
                    <span className="italic font-serif bg-gradient-to-r from-[#f3dfc8] via-[#dfbe9f] to-[#b88a64] bg-clip-text text-transparent">
                      {banner.titleAccent}
                    </span>
                  </h2>
                )}
              </div>

              {/* Subtitle */}
              {banner.subtitle && (
                <p className="text-gray-300 text-sm sm:text-base max-w-lg font-light leading-relaxed">
                  {banner.subtitle}
                </p>
              )}

              {/* Action Buttons & Features */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => banner.categorySlug && onBannerClick(banner.categorySlug)}
                  className="bg-gradient-to-r from-[#dfbe9f] via-[#d6af8c] to-[#b88a64] text-[#0d1713] hover:opacity-95 px-6 sm:px-8 py-3 rounded-full font-bold text-xs sm:text-sm shadow-lg hover:shadow-[#dfbe9f]/20 transition-all active:scale-95 flex items-center gap-2 cursor-pointer group/btn"
                >
                  <span className="tracking-wide uppercase font-bold">Xarid qilish</span>
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
                </button>

                <div className="flex items-center gap-3 text-xs text-gray-300">
                  <div className="w-8 h-8 rounded-full bg-[#172c21] border border-[#284938] flex items-center justify-center text-[#dfbe9f]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">Original mahsulotlar</span>
                    <span className="text-[10px] text-gray-400">Sifat kafolati bilan</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Hero Image Card with Floating Badges */}
            <div className="lg:col-span-5 flex justify-center items-center relative">
              {/* Outer decorative ring */}
              <div className="relative w-full max-w-sm sm:max-w-md aspect-4/3 sm:aspect-square rounded-3xl overflow-hidden border border-[#2b4c3c] shadow-2xl bg-gradient-to-br from-[#14281e] to-[#0d1813]">
                <img
                  src={banner.image}
                  alt={banner.titleLine1}
                  className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700 opacity-90"
                />

                {/* Floating "Tez yetkazib berish" Pill on top */}
                {banner.badge && (
                  <div className="absolute top-4 right-4 bg-[#0d1a14]/90 backdrop-blur-md border border-[#2b4b3b] px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
                    <div className="w-5 h-5 rounded-full bg-[#dfbe9f] text-[#0d1713] flex items-center justify-center">
                      <Truck className="w-3 h-3 stroke-[2.5]" />
                    </div>
                    <span className="text-xs font-semibold text-[#dfbe9f]">
                      {banner.badge}
                    </span>
                  </div>
                )}

                {/* Bottom floating product highlights */}
                {banner.productHighlights && banner.productHighlights.length > 0 && (
                  <div className="absolute bottom-4 left-4 right-4 bg-[#0d1a14]/90 backdrop-blur-md border border-[#2b4b3b] p-3 rounded-2xl flex items-center justify-between text-[11px] text-gray-200">
                    {banner.productHighlights.slice(0, 3).map((h, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#dfbe9f]" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Nav Arrows */}
        {banners.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#10241b]/80 hover:bg-[#183528] text-[#dfbe9f] border border-[#2e5240] backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-20"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={nextSlide}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#10241b]/80 hover:bg-[#183528] text-[#dfbe9f] border border-[#2e5240] backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-20"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Indicator dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrent(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === current
                      ? 'w-7 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64]'
                      : 'w-2 bg-[#254637]'
                  }`}
                />
              ))}
            </div>
          </>
        )}
        </div>
      )}

      {/* 4 Feature Trust Blocks */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#102018] border border-[#1e382b] p-3 sm:p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#172c21] border border-[#2a4d3b] flex items-center justify-center text-[#dfbe9f] shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-white">Tez yetkazib berish</h4>
            <p className="text-[10px] sm:text-[11px] text-gray-400">Butun O'zbekiston bo'ylab</p>
          </div>
        </div>

        <div className="bg-[#102018] border border-[#1e382b] p-3 sm:p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#172c21] border border-[#2a4d3b] flex items-center justify-center text-[#dfbe9f] shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-white">100% Original</h4>
            <p className="text-[10px] sm:text-[11px] text-gray-400">Sertifikatlangan mahsulotlar</p>
          </div>
        </div>

        <div className="bg-[#102018] border border-[#1e382b] p-3 sm:p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#172c21] border border-[#2a4d3b] flex items-center justify-center text-[#dfbe9f] shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-white">Xavfsiz to'lov</h4>
            <p className="text-[10px] sm:text-[11px] text-gray-400">Payme, Click, Uzum, Naqd</p>
          </div>
        </div>

        <div className="bg-[#102018] border border-[#1e382b] p-3 sm:p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#172c21] border border-[#2a4d3b] flex items-center justify-center text-[#dfbe9f] shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-white">Katta chegirmalar</h4>
            <p className="text-[10px] sm:text-[11px] text-gray-400">Har haftalik maxsus aksiyalar</p>
          </div>
        </div>
      </div>
    </div>
  );
};

