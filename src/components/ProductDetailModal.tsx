import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  Heart,
  ShoppingBag,
  Zap,
  Truck,
  ShieldCheck,
  RotateCcw,
  Plus,
  Minus,
  Check,
  Send,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Product, ProductReview } from '../types';
import { formatInstallment, formatDate } from '../lib/formatters';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useCurrency } from '../context/CurrencyContext';
import { api } from '../lib/api';

interface ProductDetailModalProps {
  productId: string | null;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  productId,
  onClose,
  onSelectProduct,
}) => {
  const { addToCart, toggleFavorite, isFavorite, setIsCheckoutModalOpen } = useCart();
  const { user, openAuthModal } = useAuth();
  const { showToast } = useToast();
  const { formatPrice } = useCurrency();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'specs' | 'desc' | 'reviews'>('specs');
  const [priceType, setPriceType] = useState<'piece' | 'wholesale'>('piece');
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [showWholesaleTable, setShowWholesaleTable] = useState(false);

  // Review Form state
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    if (!productId) return;
    setIsLoading(true);
    setSelectedImage(0);
    setQuantity(1);
    setSelectedVariant(null);
    setPriceType('piece');

    api
      .getProductById(productId)
      .then((res) => {
        setProduct(res.product);
        setRelated(res.related || []);
        // Auto-select first variant if available
        if (res.product.variants && res.product.variants.length > 0) {
          setSelectedVariant(res.product.variants[0].id);
        }
      })
      .catch((err) => {
        showToast(err.message || 'Mahsulotni yuklab bo\'lmadi', 'error');
        onClose();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [productId]);

  if (!productId) return null;

  const isFav = product ? isFavorite(product.id) : false;
  const currentVariant = product?.variants?.find(v => v.id === selectedVariant);
  const currentPrice = currentVariant
    ? (priceType === 'wholesale' ? currentVariant.wholesalePrice : currentVariant.retailPrice)
    : (priceType === 'wholesale' ? (product?.wholesalePrice || product?.price) : (product?.piecePrice || product?.price));
  const currentStock = currentVariant?.stock || product?.stock || 0;

  const handleBuyNow = () => {
    if (!product) return;
    addToCart(product, quantity);
    onClose();
    setIsCheckoutModalOpen(true);
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('login', () => {});
      return;
    }
    if (!commentInput.trim() || !product) return;

    setIsSubmittingReview(true);
    try {
      const res = await api.addProductReview(product.id, ratingInput, commentInput);
      showToast('Sharhingiz uchun tashakkur!', 'success');
      setCommentInput('');
      setProduct((prev) => {
        if (!prev) return prev;
        const newReviews = [res.review, ...(prev.reviews || [])];
        return {
          ...prev,
          reviews: newReviews,
          reviewsCount: newReviews.length,
          rating: res.rating,
        };
      });
    } catch (err: any) {
      showToast(err.message || 'Sharh yuborishda xatolik', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-[#0f1d17] rounded-2xl sm:rounded-3xl shadow-2xl border border-[#234233] max-w-4xl w-full my-auto overflow-hidden relative max-h-[92vh] flex flex-col text-gray-100"
      >
        {/* Top Header with Close */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#1c3629] bg-[#0c1813] shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
            <span>Katalog</span>
            <span>/</span>
            <span className="text-[#dfbe9f] font-bold">{product?.categoryName || 'Mahsulot'}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#1a3327] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {isLoading || !product ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400 space-y-3">
              <div className="w-10 h-10 border-4 border-[#dfbe9f] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium">Mahsulot yuklanmoqda...</p>
            </div>
          ) : (
            <>
              {/* Product Top Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Images column */}
                <div className="md:col-span-5 space-y-3">
                  {/* Main Large Image */}
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#0a130f] border border-[#234233] shadow-inner group">
                    <img
                      src={product.images[selectedImage] || product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {product.discount && product.discount > 0 && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 bg-gradient-to-r from-amber-600 to-rose-600 text-white font-extrabold text-xs rounded-lg shadow-sm">
                        -{product.discount}% Chegirma
                      </span>
                    )}
                  </div>

                  {/* Thumbnail selector */}
                  {product.images.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {product.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImage(idx)}
                          className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                            selectedImage === idx
                              ? 'border-[#dfbe9f] ring-2 ring-[#dfbe9f]/30'
                              : 'border-[#234233] opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info & Buy column */}
                <div className="md:col-span-7 space-y-4">
                  <div>
                    {/* Rating & Social Proof */}
                    <div className="flex flex-wrap items-center gap-3 text-xs mb-2">
                      <div className="flex items-center gap-1 font-bold text-[#dfbe9f] bg-[#162c21] px-2.5 py-1 rounded-lg border border-[#274c39]">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span>{product.rating}</span>
                        <span className="text-gray-400 font-normal">({product.reviewsCount} ta sharh)</span>
                      </div>
                      {product.salesCount > 0 && (
                        <span className="text-gray-400 font-medium">
                          {product.salesCount} ta buyurtma berilgan
                        </span>
                      )}
                      <span className="text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-lg">
                        Mavjud: {currentStock} dona
                      </span>
                    </div>

                    {/* Product Name */}
                    <h2 className="text-lg sm:text-xl font-bold font-serif text-white leading-snug">
                      {product.name}
                    </h2>
                  </div>

                  {/* Pricing Box */}
                  <div className="p-4 bg-[#12241b] rounded-2xl border border-[#244534] space-y-2">
                    {/* Variant Selector */}
                    {product.variants && product.variants.length > 0 && (
                      <div className="mb-3">
                        <span className="text-xs font-semibold text-gray-300 mb-2 block">Hajmni tanlang:</span>
                        <div className="flex flex-wrap gap-2">
                          {product.variants.map((variant) => (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() => setSelectedVariant(variant.id)}
                              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                selectedVariant === variant.id
                                  ? 'bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713]'
                                  : 'bg-[#1a3327] text-gray-400 border border-[#2b4c3b]'
                              }`}
                            >
                              {variant.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Price Type Selector */}
                    <div className="flex gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setPriceType('piece')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          priceType === 'piece'
                            ? 'bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713]'
                            : 'bg-[#1a3327] text-gray-400 border border-[#2b4c3b]'
                        }`}
                      >
                        Dona narxi
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriceType('wholesale')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          priceType === 'wholesale'
                            ? 'bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713]'
                            : 'bg-[#1a3327] text-gray-400 border border-[#2b4c3b]'
                        }`}
                      >
                        Optom narxi
                      </button>
                    </div>

                    <div className="flex items-baseline gap-3">
                      <span className="text-2xl sm:text-3xl font-extrabold text-[#dfbe9f] tracking-tight">
                        {formatPrice(currentPrice)}
                      </span>
                      {product.oldPrice && product.oldPrice > product.price && (
                        <span className="text-sm sm:text-base text-gray-400 line-through">
                          {formatPrice(product.oldPrice)}
                        </span>
                      )}
                    </div>

                    {/* Wholesale Price Table Button */}
                    {currentVariant?.wholesaleTiers && currentVariant.wholesaleTiers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowWholesaleTable(true)}
                        className="text-xs font-semibold text-[#dfbe9f] hover:text-[#f3dfc8] underline cursor-pointer"
                      >
                        Optom narxlar jadvali
                      </button>
                    )}
                  </div>

                  {/* Quantity and Actions */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-gray-300">Miqdor:</span>
                      <div className="flex items-center border border-[#2b4c3b] rounded-xl bg-[#0c1813] p-1">
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="w-8 h-8 flex items-center justify-center hover:bg-[#193226] text-gray-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center font-bold text-sm text-white">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.min(currentStock, q + 1))}
                          disabled={quantity >= currentStock}
                          className="w-8 h-8 flex items-center justify-center hover:bg-[#193226] text-gray-200 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">
                        Jami: <strong className="text-[#dfbe9f]">{formatPrice(currentPrice * quantity)}</strong>
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => addToCart(product, quantity)}
                        disabled={currentStock <= 0}
                        className="py-3 px-4 bg-[#172c21] hover:bg-[#1e392b] text-[#dfbe9f] border border-[#2e5240] font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                      >
                        <ShoppingBag className="w-4 h-4 text-[#dfbe9f]" />
                        <span>Savatga qo'shish</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleBuyNow}
                        disabled={currentStock <= 0}
                        className="py-3 px-4 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] hover:opacity-95 text-[#0d1713] font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                      >
                        <Zap className="w-4 h-4 fill-[#0d1713]" />
                        <span>Hozir xarid qilish</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => toggleFavorite(product.id)}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                        <span>{isFav ? 'Sevimlilardan o\'chirish' : 'Sevimlilarga saqlash'}</span>
                      </button>

                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                        <Truck className="w-3.5 h-3.5" />
                        <span>1 kunda bepul yetkazib berish</span>
                      </div>
                    </div>
                  </div>

                  {/* Delivery & Warranty perks */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1a3327] text-center">
                    <div className="p-2 bg-[#12221a] rounded-xl border border-[#234233]">
                      <Truck className="w-4 h-4 mx-auto text-[#dfbe9f] mb-1" />
                      <span className="text-[10px] font-bold text-white block">Tezkor yetkazish</span>
                      <span className="text-[9px] text-gray-400">Ertagayoq qo'lingizda</span>
                    </div>
                    <div className="p-2 bg-[#12221a] rounded-xl border border-[#234233]">
                      <ShieldCheck className="w-4 h-4 mx-auto text-[#dfbe9f] mb-1" />
                      <span className="text-[10px] font-bold text-white block">Kafolat</span>
                      <span className="text-[9px] text-gray-400">100% original kafolati</span>
                    </div>
                    <div className="p-2 bg-[#12221a] rounded-xl border border-[#234233]">
                      <RotateCcw className="w-4 h-4 mx-auto text-[#dfbe9f] mb-1" />
                      <span className="text-[10px] font-bold text-white block">Qaytarish</span>
                      <span className="text-[9px] text-gray-400">10 kun ichida qulay</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs Section: Specs, Description, Reviews */}
              <div className="pt-4 border-t border-[#1d382b]">
                <div className="flex border-b border-[#213f30] gap-6">
                  <button
                    onClick={() => setActiveTab('specs')}
                    className={`pb-3 text-sm font-bold transition-all relative cursor-pointer ${
                      activeTab === 'specs' ? 'text-[#dfbe9f]' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>Texnik xususiyatlari</span>
                    {activeTab === 'specs' && (
                      <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#dfbe9f]" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('desc')}
                    className={`pb-3 text-sm font-bold transition-all relative cursor-pointer ${
                      activeTab === 'desc' ? 'text-[#dfbe9f]' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>Batafsil tavsif</span>
                    {activeTab === 'desc' && (
                      <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#dfbe9f]" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`pb-3 text-sm font-bold transition-all relative cursor-pointer ${
                      activeTab === 'reviews' ? 'text-[#dfbe9f]' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>Sharhlar ({product.reviews?.length || 0})</span>
                    {activeTab === 'reviews' && (
                      <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#dfbe9f]" />
                    )}
                  </button>
                </div>

                <div className="pt-4">
                  {/* Tab: Specs */}
                  {activeTab === 'specs' && (
                    <div className="bg-[#12221a] rounded-2xl p-4 border border-[#234233]">
                      {product.specs && Object.keys(product.specs).length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {Object.entries(product.specs).map(([key, val]) => (
                            <div key={key} className="flex justify-between py-1.5 border-b border-[#1c3629] text-xs">
                              <span className="text-gray-400 font-medium">{key}:</span>
                              <span className="font-bold text-white text-right">{val}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">Texnik parametrlar kiritilmagan</p>
                      )}
                    </div>
                  )}

                  {/* Tab: Desc */}
                  {activeTab === 'desc' && (
                    <div className="bg-[#12221a] rounded-2xl p-4 border border-[#234233] text-sm text-gray-300 leading-relaxed">
                      <p>{product.description || "Mahsulot haqida to'liq ma'lumot mavjud emas."}</p>
                    </div>
                  )}

                  {/* Tab: Reviews */}
                  {activeTab === 'reviews' && (
                    <div className="space-y-4">
                      {/* Add Review Form */}
                      <form onSubmit={handleAddReview} className="bg-[#14261d] border border-[#264837] rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-[#dfbe9f] flex items-center gap-1.5">
                            <MessageSquare className="w-4 h-4 text-[#dfbe9f]" />
                            <span>Mahsulotga sharh qoldiring</span>
                          </h4>
                          {/* Rating selector */}
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setRatingInput(star)}
                                className="cursor-pointer transition-transform hover:scale-110"
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    star <= ratingInput
                                      ? 'text-amber-400 fill-amber-400'
                                      : 'text-gray-600'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <textarea
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          placeholder="Mahsulot haqidagi fikr va taassurotlaringizni yozing..."
                          rows={2}
                          className="w-full p-3 bg-[#0d1713] border border-[#284c3a] rounded-xl text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                          required
                        />

                        <button
                          type="submit"
                          disabled={isSubmittingReview || !commentInput.trim()}
                          className="px-4 py-2 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] hover:opacity-95 text-[#0d1713] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Send className="w-3 h-3" />
                          <span>Yuborish</span>
                        </button>
                      </form>

                      {/* Reviews List */}
                      <div className="space-y-2.5">
                        {product.reviews && product.reviews.length > 0 ? (
                          product.reviews.map((rev) => (
                            <div key={rev.id} className="p-3.5 bg-[#12221a] border border-[#234233] rounded-xl space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-white">{rev.userName}</span>
                                <span className="text-[10px] text-gray-400">{formatDate(rev.createdAt)}</span>
                              </div>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`w-3 h-3 ${
                                      s <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-600'
                                    }`}
                                  />
                                ))}
                              </div>
                              <p className="text-xs text-gray-300">{rev.comment}</p>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-xs text-gray-400">
                            Hali sharhlar mavjud emas. Birinchi bo'lib sharh qoldiring!
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Related Products Recommendation */}
              {related.length > 0 && (
                <div className="pt-6 border-t border-[#1d382b]">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5 font-serif">
                    <Sparkles className="w-4 h-4 text-[#dfbe9f]" />
                    <span>O'xshash mahsulotlar</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {related.map((rel) => (
                      <div
                        key={rel.id}
                        onClick={() => {
                          onSelectProduct(rel);
                        }}
                        className="p-2.5 bg-[#12221a] hover:bg-[#162c21] border border-[#234233] hover:border-[#dfbe9f]/60 rounded-xl transition-colors cursor-pointer flex items-center gap-2.5"
                      >
                        <img
                          src={rel.images[0]}
                          alt={rel.name}
                          className="w-12 h-12 rounded-lg object-cover bg-[#0d1713]"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{rel.name}</p>
                          <p className="text-xs font-bold text-[#dfbe9f]">{formatPrice(rel.price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Wholesale Price Table Modal */}
      {showWholesaleTable && currentVariant?.wholesaleTiers && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0f1d17] rounded-2xl shadow-2xl border border-[#234233] max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Optom narxlar jadvali</h3>
              <button
                onClick={() => setShowWholesaleTable(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#1a3327] rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-xs font-semibold text-gray-400 pb-2 border-b border-[#234233]">
                <span>Miqdor</span>
                <span>Narx (dona)</span>
                <span>Chegirma</span>
              </div>

              {currentVariant.wholesaleTiers.map((tier, index) => {
                const discount = Math.round(((currentVariant.retailPrice - tier.price) / currentVariant.retailPrice) * 100);
                return (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-[#1a3327]">
                    <span className="text-sm font-bold text-white">{tier.minQuantity}+ dona</span>
                    <span className="text-sm font-bold text-[#dfbe9f]">{formatPrice(tier.price)}</span>
                    <span className="text-xs font-semibold text-emerald-400">-{discount}%</span>
                  </div>
                );
              })}

              <div className="flex justify-between items-center py-2 bg-[#12221a] rounded-lg px-3">
                <span className="text-sm font-bold text-white">Chakana narx</span>
                <span className="text-sm font-bold text-gray-400">{formatPrice(currentVariant.retailPrice)}</span>
                <span className="text-xs font-semibold text-gray-500">0%</span>
              </div>
            </div>

            <button
              onClick={() => setShowWholesaleTable(false)}
              className="w-full mt-4 py-2.5 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] font-bold rounded-xl text-sm cursor-pointer hover:opacity-95 transition-opacity"
            >
              Yopish
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

