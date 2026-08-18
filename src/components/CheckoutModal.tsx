import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  MapPin,
  Phone,
  User as UserIcon,
  CreditCard,
  Banknote,
  Truck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Building2,
  FileText
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatPrice } from '../lib/formatters';
import { api } from '../lib/api';
import type { Order } from '../types';

// Leaflet (LocationPickerMap) is a heavy dependency only needed during checkout —
// keep it out of the main bundle so the initial page load stays light on mobile.
const LocationPickerMap = React.lazy(() => import('./LocationPickerMap').then(m => ({ default: m.LocationPickerMap })));

interface CheckoutModalProps {
  onOrderSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ onOrderSuccess }) => {
  const { items, subtotal, deliveryFee, total, isCheckoutModalOpen, setIsCheckoutModalOpen, clearCart } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();

  // Step management (1: Info & Address, 2: Payment & Confirm)
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer form
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '+998');

  // Address form
  const [region, setRegion] = useState('Toshkent shahri');
  const [district, setDistrict] = useState('Yunusobod tumani');
  const [street, setStreet] = useState('');
  const [house, setHouse] = useState('');
  const [apartment, setApartment] = useState('');
  const [notes, setNotes] = useState('');
  const [coords, setCoords] = useState<{ latitude?: number; longitude?: number }>({});
  const [formattedAddress, setFormattedAddress] = useState('');

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'uzum_pay' | 'card' | 'cash' | 'payme' | 'click'>('uzum_pay');

  // Sync user defaults when modal opens
  useEffect(() => {
    if (user) {
      if (!firstName) setFirstName(user.firstName);
      if (!lastName) setLastName(user.lastName);
      if (phone === '+998') setPhone(user.phone);

      const defaultAddr = user.addresses?.find((a) => a.isDefault) || user.addresses?.[0];
      if (defaultAddr) {
        setRegion(defaultAddr.region || 'Toshkent shahri');
        setDistrict(defaultAddr.district || '');
        setStreet(defaultAddr.street || '');
        setHouse(defaultAddr.house || '');
        setApartment(defaultAddr.apartment || '');
        setNotes(defaultAddr.notes || '');
        if (defaultAddr.latitude && defaultAddr.longitude) {
          setCoords({ latitude: defaultAddr.latitude, longitude: defaultAddr.longitude });
        }
      }
    }
  }, [user, isCheckoutModalOpen]);

  if (!isCheckoutModalOpen) return null;

  const handleLocationPicked = (loc: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
    region?: string;
    district?: string;
    street?: string;
  }) => {
    setCoords({ latitude: loc.latitude, longitude: loc.longitude });
    setFormattedAddress(loc.formattedAddress);
    if (loc.region) setRegion(loc.region);
    if (loc.district) setDistrict(loc.district);
    if (loc.street) setStreet(loc.street);
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!firstName.trim()) {
      setError('Iltimos, ismingizni kiriting');
      return;
    }
    if (phone.length < 13) {
      setError("Telefon raqamini to'liq kiriting (+998 XX XXX XX XX)");
      return;
    }
    if (!region.trim() || !street.trim()) {
      setError("Yetkazib berish viloyati va ko'chasini kiriting");
      return;
    }

    setStep(2);
  };

  const handleConfirmOrder = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const orderPayload = {
        customer: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
        },
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        deliveryAddress: {
          region: region.trim(),
          district: district.trim(),
          street: street.trim(),
          house: house.trim(),
          apartment: apartment.trim(),
          notes: notes.trim(),
          latitude: coords.latitude,
          longitude: coords.longitude,
          formattedAddress: formattedAddress || `${region}, ${district} ${street} ${house}`.trim(),
        },
        paymentMethod,
      };

      const res = await api.createOrder(orderPayload);
      clearCart();
      setIsCheckoutModalOpen(false);
      onOrderSuccess(res.order);
      showToast('Buyurtmangiz muvaffaqiyatli qabul qilindi!', 'success');
    } catch (err: any) {
      setError(err.message || 'Buyurtma berishda xatolik yuz berdi');
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-[#0f1d17] rounded-2xl sm:rounded-3xl shadow-2xl border border-[#234233] max-w-3xl w-full my-auto overflow-hidden relative max-h-[94vh] flex flex-col text-gray-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c3629] bg-[#0c1813] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#1d382b] border border-[#2d523f] text-[#dfbe9f] flex items-center justify-center font-bold text-sm shadow-xs">
              {step}
            </div>
            <div>
              <h3 className="font-bold font-serif text-base text-white">
                {step === 1 ? 'Buyurtma rasmiylashtirish' : 'Buyurtmani tasdiqlash va to\'lov'}
              </h3>
              <p className="text-xs text-gray-400">
                {step === 1 ? 'Qabul qiluvchi va manzilni ko\'rsating' : 'Ma\'lumotlarni tekshiring'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCheckoutModalOpen(false)}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#1a3327] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form id="checkout-step1-form" onSubmit={handleNextStep} className="space-y-6">
              {/* Section 1: Shaxsiy ma'lumotlar */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#dfbe9f] uppercase tracking-wider flex items-center gap-1.5 font-serif">
                  <UserIcon className="w-4 h-4 text-[#dfbe9f]" />
                  <span>1. Qabul qiluvchi ma'lumotlari</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Ism *</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Shahzod"
                      className="w-full px-3 py-2.5 bg-[#12221a] border border-[#234233] rounded-xl text-xs sm:text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Familiya</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Qalandarov"
                      className="w-full px-3 py-2.5 bg-[#12221a] border border-[#234233] rounded-xl text-xs sm:text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Telefon raqami *
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        let val = e.target.value.replace(/[^\d+]/g, '');
                        if (!val.startsWith('+998')) val = '+998';
                        if (val.length <= 13) setPhone(val);
                      }}
                      placeholder="+998 90 123 45 67"
                      className="w-full px-3 py-2.5 bg-[#12221a] border border-[#234233] rounded-xl text-xs sm:text-sm text-white font-medium placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Yetkazib berish manzili va Lokatsiya */}
              <div className="space-y-3 pt-2 border-t border-[#1d3a2c]">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#dfbe9f] uppercase tracking-wider flex items-center gap-1.5 font-serif">
                    <MapPin className="w-4 h-4 text-[#dfbe9f]" />
                    <span>2. Yetkazib berish manzili va lokatsiya</span>
                  </h4>
                </div>

                {/* Leaflet Map Location Picker */}
                <React.Suspense fallback={
                  <div className="h-52 rounded-xl bg-[#12221a] border border-[#234233] animate-pulse flex items-center justify-center text-xs text-gray-500">
                    Xarita yuklanmoqda...
                  </div>
                }>
                  <LocationPickerMap
                    initialLat={coords.latitude || 41.311081}
                    initialLng={coords.longitude || 69.240562}
                    onLocationSelect={handleLocationPicked}
                  />
                </React.Suspense>

                {/* Manual Address Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Viloyat / Shahar *
                    </label>
                    <input
                      type="text"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      placeholder="Toshkent shahri"
                      className="w-full px-3 py-2.5 bg-[#12221a] border border-[#234233] rounded-xl text-xs sm:text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Tuman / Hudud
                    </label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="Mirzo Ulug'bek tumani"
                      className="w-full px-3 py-2.5 bg-[#12221a] border border-[#234233] rounded-xl text-xs sm:text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Ko'cha nomi *
                    </label>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Buyuk Ipak Yo'li ko'chasi"
                      className="w-full px-3 py-2.5 bg-[#12221a] border border-[#234233] rounded-xl text-xs sm:text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Uy raqami</label>
                    <input
                      type="text"
                      value={house}
                      onChange={(e) => setHouse(e.target.value)}
                      placeholder="12-uy"
                      className="w-full px-3 py-2.5 bg-[#12221a] border border-[#234233] rounded-xl text-xs sm:text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Kvartira / Xonadon
                    </label>
                    <input
                      type="text"
                      value={apartment}
                      onChange={(e) => setApartment(e.target.value)}
                      placeholder="45-xonadon (ixtiyoriy)"
                      className="w-full px-3 py-2.5 bg-[#12221a] border border-[#234233] rounded-xl text-xs sm:text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Kuryer uchun qo'shimcha izoh / Mo'ljal
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Eshik kodi: 45k, 3-qavat, Korzinka ro'parasida"
                      className="w-full px-3 py-2.5 bg-[#12221a] border border-[#234233] rounded-xl text-xs sm:text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                    />
                  </div>
                </div>
              </div>
            </form>
          ) : (
            /* Step 2: Payment Method & Final Summary */
            <div className="space-y-6">
              {/* Payment Methods */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#dfbe9f] uppercase tracking-wider flex items-center gap-1.5 font-serif">
                  <CreditCard className="w-4 h-4 text-[#dfbe9f]" />
                  <span>To'lov usulini tanlang</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label
                    onClick={() => setPaymentMethod('uzum_pay')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                      paymentMethod === 'uzum_pay'
                        ? 'border-[#dfbe9f] bg-[#162e22] shadow-xs'
                        : 'border-[#244534] hover:border-[#315d46] bg-[#102018]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#dfbe9f]">Velora Pay / Nasiya</span>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'uzum_pay' ? 'border-[#dfbe9f] bg-[#dfbe9f]' : 'border-gray-500'}`}>
                        {paymentMethod === 'uzum_pay' && <div className="w-1.5 h-1.5 bg-[#0d1713] rounded-full" />}
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-400">1 klikda to'lov yoki 0-0-12 muddatli to'lov</span>
                  </label>

                  <label
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                      paymentMethod === 'card'
                        ? 'border-[#dfbe9f] bg-[#162e22] shadow-xs'
                        : 'border-[#244534] hover:border-[#315d46] bg-[#102018]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">Bank kartasi (Uzcard / Humo)</span>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'card' ? 'border-[#dfbe9f] bg-[#dfbe9f]' : 'border-gray-500'}`}>
                        {paymentMethod === 'card' && <div className="w-1.5 h-1.5 bg-[#0d1713] rounded-full" />}
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-400">Online xavfsiz to'lov</span>
                  </label>

                  <label
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                      paymentMethod === 'cash'
                        ? 'border-[#dfbe9f] bg-[#162e22] shadow-xs'
                        : 'border-[#244534] hover:border-[#315d46] bg-[#102018]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">Qabul qilganda naqd</span>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'cash' ? 'border-[#dfbe9f] bg-[#dfbe9f]' : 'border-gray-500'}`}>
                        {paymentMethod === 'cash' && <div className="w-1.5 h-1.5 bg-[#0d1713] rounded-full" />}
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-400">Kuryerga yetkazilganda to'lash</span>
                  </label>
                </div>
              </div>

              {/* Order Confirmation Breakdown Box */}
              <div className="bg-[#12221a] rounded-2xl p-4 border border-[#234233] space-y-4">
                <h4 className="text-xs font-bold text-[#dfbe9f] uppercase tracking-wider font-serif">
                  Buyurtma tafsilotlari
                </h4>

                {/* Items preview */}
                <div className="space-y-2 border-b border-[#1d3a2c] pb-3">
                  <p className="text-xs font-semibold text-gray-300">Mahsulotlar ro'yxati:</p>
                  {items.map((it) => (
                    <div key={it.productId} className="flex justify-between text-xs text-gray-200">
                      <span className="truncate pr-2">
                        {it.product.name} <strong className="text-[#dfbe9f]">× {it.quantity}</strong>
                      </span>
                      <span className="font-semibold shrink-0 text-[#dfbe9f]">
                        {formatPrice(it.product.price * it.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Delivery info summary */}
                <div className="space-y-1 text-xs text-gray-300 border-b border-[#1d3a2c] pb-3">
                  <p className="font-semibold text-white">Qabul qiluvchi:</p>
                  <p>{firstName} {lastName} ({phone})</p>
                  <p className="text-gray-400 mt-1">
                    <strong>Manzil:</strong> {region}, {district} {street} {house} {apartment ? `(Kvartira: ${apartment})` : ''}
                  </p>
                  {notes && <p className="text-gray-400 italic">Izoh: "{notes}"</p>}
                </div>

                {/* Price summary */}
                <div className="space-y-1.5 text-xs text-gray-300">
                  <div className="flex justify-between">
                    <span>Mahsulotlar:</span>
                    <span className="font-bold text-white">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Yetkazib berish:</span>
                    <span className="font-bold text-emerald-400">
                      {deliveryFee === 0 ? 'Bepul' : formatPrice(deliveryFee)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-[#1d3a2c]">
                    <span>Jami to'lov:</span>
                    <span className="text-[#dfbe9f]">{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 border-t border-[#1c3629] bg-[#0c1813] flex items-center justify-between gap-3 shrink-0">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2.5 bg-[#172c21] hover:bg-[#1e392b] border border-[#2e5240] text-[#dfbe9f] rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              Ortga qaytish
            </button>
          ) : (
            <div className="text-xs text-gray-400 hidden sm:block">
              Jami: <strong className="text-[#dfbe9f] font-bold">{formatPrice(total)}</strong>
            </div>
          )}

          {step === 1 ? (
            <button
              type="submit"
              form="checkout-step1-form"
              className="ml-auto px-6 py-3 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] hover:opacity-95 text-[#0d1713] font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Davom etish</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmOrder}
              disabled={isSubmitting}
              className="ml-auto px-6 py-3 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] hover:opacity-95 text-[#0d1713] font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>Rasmiylashtirilmoqda...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>BUYURTMANI TASDIQLASH ({formatPrice(total)})</span>
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

