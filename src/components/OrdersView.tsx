import React, { useState, useEffect } from 'react';
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw,
  AlertCircle,
  MapPin,
  ChevronRight,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import type { Order, OrderStatus } from '../types';
import { formatPrice, formatDate, formatPhone } from '../lib/formatters';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface OrdersViewProps {
  onOpenProduct?: (productId: string) => void;
  onGoShopping?: () => void;
}

const statusOrder: OrderStatus[] = ['Pending', 'Confirmed', 'Preparing', 'Shipped', 'Delivered'];

const statusLabels: Record<OrderStatus, { text: string; color: string; bg: string }> = {
  Pending: { text: 'Kutilmoqda', color: 'text-amber-300', bg: 'bg-amber-950/50 border-amber-800/60' },
  Confirmed: { text: 'Tasdiqlandi', color: 'text-blue-300', bg: 'bg-blue-950/50 border-blue-800/60' },
  Preparing: { text: 'Yig\'ilmoqda', color: 'text-[#dfbe9f]', bg: 'bg-[#1e3b2e] border-[#2d5843]' },
  Shipped: { text: 'Yo\'lda (Kuryerda)', color: 'text-cyan-300', bg: 'bg-cyan-950/50 border-cyan-800/60' },
  Delivered: { text: 'Yetkazildi', color: 'text-emerald-300', bg: 'bg-emerald-950/50 border-emerald-800/60' },
  Cancelled: { text: 'Bekor qilindi', color: 'text-rose-300', bg: 'bg-rose-950/50 border-rose-800/60' },
};

export const OrdersView: React.FC<OrdersViewProps> = ({ onOpenProduct, onGoShopping }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const data = await api.getOrders();
      setOrders(data);
    } catch (err: any) {
      showToast(err.message || 'Buyurtmalarni yuklashda xatolik', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    if (filterStatus === 'all') return true;
    return o.status === filterStatus;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6 text-gray-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-[#dfbe9f]" />
            <span>Mening buyurtmalarim</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Barcha xaridlaringiz holati va yetkazib berish jarayonini kuzating
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
              filterStatus === 'all'
                ? 'bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] shadow-md font-bold'
                : 'bg-[#11231a] text-gray-300 border border-[#234233] hover:bg-[#183124]'
            }`}
          >
            Barchasi ({orders.length})
          </button>
          <button
            onClick={() => setFilterStatus('Pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
              filterStatus === 'Pending'
                ? 'bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] shadow-md font-bold'
                : 'bg-[#11231a] text-gray-300 border border-[#234233] hover:bg-[#183124]'
            }`}
          >
            Kutilmoqda
          </button>
          <button
            onClick={() => setFilterStatus('Shipped')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
              filterStatus === 'Shipped'
                ? 'bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] shadow-md font-bold'
                : 'bg-[#11231a] text-gray-300 border border-[#234233] hover:bg-[#183124]'
            }`}
          >
            Yo'lda
          </button>
          <button
            onClick={() => setFilterStatus('Delivered')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
              filterStatus === 'Delivered'
                ? 'bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] text-[#0d1713] shadow-md font-bold'
                : 'bg-[#11231a] text-gray-300 border border-[#234233] hover:bg-[#183124]'
            }`}
          >
            Yetkazilgan
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-24 text-center text-gray-400 space-y-3">
          <div className="w-8 h-8 border-3 border-[#dfbe9f] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold">Buyurtmalar yuklanmoqda...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-[#0f1d17] rounded-2xl p-10 text-center border border-[#234233] space-y-4 max-w-md mx-auto shadow-xl">
          <div className="w-14 h-14 bg-[#183124] rounded-full flex items-center justify-center text-[#dfbe9f] mx-auto border border-[#2e5240]">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold font-serif text-white">
            {filterStatus === 'all' ? 'Hozircha hech qanday buyurtma berilmagan' : 'Bu holatdagi buyurtmalar topilmadi'}
          </h3>
          <p className="text-xs text-gray-400">
            Velora Shop'ning qulay takliflari va kolleksiyalaridan bahramand bo'ling!
          </p>
          {onGoShopping && (
            <button
              onClick={onGoShopping}
              className="px-5 py-2.5 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] hover:opacity-95 text-[#0d1713] font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
            >
              Xarid qilish
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const badge = statusLabels[order.status] || statusLabels.Pending;
            const currentStepIdx = statusOrder.indexOf(order.status);

            return (
              <div
                key={order.id}
                className="bg-[#0f1d17] rounded-2xl border border-[#234233] hover:border-[#355f4a] transition-all p-4 sm:p-5 space-y-4 shadow-lg"
              >
                {/* Order Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1c3629]">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm sm:text-base text-[#dfbe9f] font-mono">
                      {order.orderNumber}
                    </span>
                    <span className="text-xs text-gray-600">|</span>
                    <span className="text-xs text-gray-400 font-medium">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.bg} ${badge.color}`}
                  >
                    {badge.text}
                  </span>
                </div>

                {/* Progress tracker if not cancelled */}
                {order.status !== 'Cancelled' && (
                  <div className="py-2">
                    <div className="grid grid-cols-5 gap-1 text-center">
                      {statusOrder.map((st, idx) => {
                        const isDone = idx <= currentStepIdx;
                        const isCurrent = idx === currentStepIdx;
                        return (
                          <div key={st} className="flex flex-col items-center gap-1.5">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                isDone
                                  ? 'bg-[#dfbe9f] text-[#0d1713] shadow-xs'
                                  : 'bg-[#152a20] text-gray-500 border border-[#234233]'
                              } ${isCurrent ? 'ring-4 ring-[#dfbe9f]/30 scale-110' : ''}`}
                            >
                              {idx + 1}
                            </div>
                            <span
                              className={`text-[10px] leading-tight ${
                                isDone ? 'text-[#dfbe9f] font-bold' : 'text-gray-500 font-medium'
                              }`}
                            >
                              {statusLabels[st].text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Items in order */}
                <div className="divide-y divide-[#172d22]">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-12 h-12 rounded-xl object-cover border border-[#234233] bg-[#12221a] shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{item.name}</p>
                          <p className="text-[11px] text-gray-400">
                            {formatPrice(item.price)} × <strong className="text-[#dfbe9f]">{item.quantity} dona</strong>
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-white shrink-0">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Order Footer Info */}
                <div className="pt-3 border-t border-[#1c3629] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#12221a] p-3.5 rounded-xl text-xs text-gray-300 border border-[#1e3b2e]">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-medium text-white">
                      <MapPin className="w-3.5 h-3.5 text-[#dfbe9f] shrink-0" />
                      <span>{order.deliveryAddress.formattedAddress || order.deliveryAddress.street}</span>
                    </div>
                    <div className="text-[11px] text-gray-400 pl-5">
                      Qabul qiluvchi: {order.customer.firstName} {order.customer.lastName} ({formatPhone(order.customer.phone)})
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[11px] text-gray-400 block">Jami to'lov:</span>
                    <span className="text-sm font-bold text-[#dfbe9f]">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

