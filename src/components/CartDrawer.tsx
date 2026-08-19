import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  Truck,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

interface CartDrawerProps {
  onOpenProduct?: (productId: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onOpenProduct }) => {
  const {
    items,
    itemsCount,
    subtotal,
    deliveryFee,
    total,
    freeDeliveryThreshold,
    amountNeededForFreeDelivery,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    setIsCheckoutModalOpen,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const { user, openAuthModal } = useAuth();
  const { formatPrice } = useCurrency();

  if (!isCartDrawerOpen) return null;

  const handleCheckoutClick = () => {
    setIsCartDrawerOpen(false);
    if (!user) {
      openAuthModal('register', () => {
        setIsCheckoutModalOpen(true);
      });
    } else {
      setIsCheckoutModalOpen(true);
    }
  };

  const progressPercent = Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100));
  const finalTotal = total;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex justify-end">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-md bg-[#0f1d17] border-l border-[#223f31] h-full shadow-2xl flex flex-col relative z-10 text-gray-100"
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-[#1c3629] flex items-center justify-between bg-[#0b1712] shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#dfbe9f]" />
            <h3 className="font-bold font-serif text-base text-white">Savat</h3>
            <span className="text-xs font-semibold px-2 py-0.5 bg-[#172c21] border border-[#2e5240] text-[#dfbe9f] rounded-full">
              {itemsCount} ta
            </span>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2.5 py-1 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/60 rounded-lg transition-colors cursor-pointer"
              >
                Tozalash
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(false)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1a3327] rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Free Delivery Bar */}
        <div className="p-3.5 bg-[#13261e] border-b border-[#1d3a2c] shrink-0">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-[#dfbe9f]" />
              <span>Yetkazib berish:</span>
            </span>
            <span className="font-semibold text-[#dfbe9f]">
              {amountNeededForFreeDelivery === 0
                ? "Bepul yetkazib berish ta'minlandi!"
                : `Yana ${formatPrice(amountNeededForFreeDelivery)}`}
            </span>
          </div>
          <div className="w-full bg-[#0d1a14] h-1.5 rounded-full overflow-hidden border border-[#244535]">
            <div
              className="bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-[#1b3629]">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-3">
              <div className="w-16 h-16 bg-[#162c21] border border-[#2b4d3c] rounded-full flex items-center justify-center text-[#dfbe9f]">
                <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h4 className="font-bold font-serif text-white text-base">Savatingiz hozircha bo'sh</h4>
              <p className="text-xs text-gray-400 max-w-xs">
                Katalogdan kerakli mahsulotlarni tanlang va savatga qo'shing
              </p>
              <button
                type="button"
                onClick={() => setIsCartDrawerOpen(false)}
                className="px-5 py-2.5 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer hover:opacity-95"
              >
                Xaridni boshlash
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="pt-3 first:pt-0 flex gap-3 items-start">
                <img
                  src={item.product.images[0]}
                  alt={item.product.name}
                  onClick={() => {
                    if (onOpenProduct) {
                      setIsCartDrawerOpen(false);
                      onOpenProduct(item.productId);
                    }
                  }}
                  className="w-18 h-18 rounded-xl object-cover border border-[#234233] bg-[#0c1813] shrink-0 cursor-pointer"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <h4
                      onClick={() => {
                        if (onOpenProduct) {
                          setIsCartDrawerOpen(false);
                          onOpenProduct(item.productId);
                        }
                      }}
                      className="text-xs font-semibold text-gray-100 line-clamp-2 leading-snug hover:text-[#dfbe9f] cursor-pointer"
                    >
                      {item.product.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId)}
                      className="p-1 text-gray-400 hover:text-rose-400 transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#dfbe9f] block">
                        {formatPrice(item.unitPrice ?? item.product.price)}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Jami: {formatPrice((item.unitPrice ?? item.product.price) * item.quantity)}
                      </span>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center border border-[#2b4d3c] rounded-xl bg-[#0c1813] p-0.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center hover:bg-[#1a3327] text-gray-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-bold text-xs text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                        className="w-6 h-6 flex items-center justify-center hover:bg-[#1a3327] text-gray-200 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Checkout Summary */}
        {items.length > 0 && (
          <div className="p-4 border-t border-[#1d3a2c] bg-[#0b1712] space-y-3 shrink-0">
            {/* Calculations Breakdown */}
            <div className="space-y-1.5 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Mahsulotlar ({itemsCount}):</span>
                <span className="font-semibold text-gray-200">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Yetkazib berish:</span>
                <span className="font-semibold text-gray-200">
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-400 font-bold">Bepul</span>
                  ) : (
                    formatPrice(deliveryFee)
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-1.5 border-t border-[#1d3a2c]">
                <span>Umumiy to'lov:</span>
                <span className="text-[#dfbe9f]">{formatPrice(finalTotal)}</span>
              </div>
            </div>

            {/* Checkout Trigger Button */}
            <button
              type="button"
              onClick={handleCheckoutClick}
              className="w-full py-3 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] hover:opacity-95 text-[#0d1713] font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Buyurtma berish</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

