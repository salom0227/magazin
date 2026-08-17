import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { CheckCircle2, Package, ArrowRight, Home, Clock, MapPin } from 'lucide-react';
import type { Order } from '../types';
import { formatPrice, formatDate } from '../lib/formatters';

interface OrderSuccessModalProps {
  order: Order | null;
  onClose: () => void;
  onViewOrders: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  onClose,
  onViewOrders,
}) => {
  useEffect(() => {
    if (order) {
      // Trigger celebratory confetti with gold/emerald luxury palette
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#dfbe9f', '#b88a64', '#10b981', '#ffffff'],
      });
    }
  }, [order]);

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-[#0f1d17] rounded-3xl shadow-2xl border border-[#234233] max-w-md w-full overflow-hidden text-center p-6 sm:p-8 relative text-gray-100"
      >
        {/* Animated Check Icon */}
        <div className="w-20 h-20 mx-auto mb-4 bg-[#172e22] text-[#dfbe9f] border border-[#2d523f] rounded-full flex items-center justify-center shadow-inner ring-8 ring-[#12241b]">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-tight">
          Buyurtma muvaffaqiyatli qabul qilindi!
        </h2>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Kuryerimiz tez orada siz bilan bog'lanadi va yetkazib berishni amalga oshiradi.
        </p>

        {/* Order Details Card */}
        <div className="my-5 p-4 bg-[#12221a] rounded-2xl border border-[#234233] text-left space-y-2.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-medium">Buyurtma raqami:</span>
            <span className="font-bold text-[#dfbe9f] text-sm font-mono">{order.orderNumber}</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-medium">Holat:</span>
            <span className="px-2.5 py-0.5 bg-[#1a3327] border border-[#2e5240] text-[#dfbe9f] font-bold rounded-full text-[11px]">
              Qabul qilindi (Kutilmoqda)
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-medium">Umumiy to'lov:</span>
            <span className="font-bold text-white">{formatPrice(order.total)}</span>
          </div>

          <div className="pt-2 border-t border-[#1c382b] flex items-start gap-2 text-xs text-gray-300">
            <MapPin className="w-4 h-4 text-[#dfbe9f] shrink-0 mt-0.5" />
            <span className="line-clamp-2">
              {order.deliveryAddress.formattedAddress || order.deliveryAddress.street}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onViewOrders}
            className="w-full py-3 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] hover:opacity-95 text-[#0d1713] font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Package className="w-4 h-4" />
            <span>Buyurtmalarimni ko'rish</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-[#152a20] hover:bg-[#1c3629] border border-[#264837] text-gray-200 font-semibold rounded-xl text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Home className="w-4 h-4 text-[#dfbe9f]" />
            <span>Bosh sahifaga qaytish</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

