import React, { useState } from 'react';
import {
  User as UserIcon,
  Phone,
  MapPin,
  Heart,
  Package,
  LogOut,
  Shield,
  Edit2,
  Plus,
  Trash2,
  CheckCircle2,
  ShoppingBag,
  KeyRound,
  Camera
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { formatPrice, formatPhone, formatDate } from '../lib/formatters';

// Tayyor avatarlar to'plami — DiceBear (ochiq, bepul, MIT litsenziyali)
// orqali generatsiya qilingan chizilgan (illyustrativ) odam siymolari.
// Haqiqiy odam fotosurati emas, shuning uchun mualliflik huquqi va
// shaxsiy hayot bilan bog'liq muammo yo'q.
const PRESET_AVATARS = [
  'aidan', 'jasur', 'malika', 'dilnoza', 'sardor', 'nodira', 'shahzod', 'zarina',
].map((seed) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`);

interface ProfileViewProps {
  onGoToOrders: () => void;
  onGoToFavorites: () => void;
  onGoToAdmin: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onGoToOrders,
  onGoToFavorites,
  onGoToAdmin,
}) => {
  const { user, isAdmin, logout, updateProfile, changePin, addAddress, deleteAddress } = useAuth();
  const { favorites } = useCart();
  const { showToast } = useToast();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [avatarChoice, setAvatarChoice] = useState<string | null>(null);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);

  // Change PIN state
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);

  // Add Address State
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [addrTitle, setAddrTitle] = useState('Uy');
  const [addrRegion, setAddrRegion] = useState('Toshkent shahri');
  const [addrDistrict, setAddrDistrict] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrHouse, setAddrHouse] = useState('');
  const [addrApartment, setAddrApartment] = useState('');

  if (!user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;
    try {
      await updateProfile({
        firstName,
        lastName,
        ...(avatarChoice ? { avatar: avatarChoice } : {}),
      });
      setIsEditingProfile(false);
      setIsAvatarPickerOpen(false);
      setAvatarChoice(null);
    } catch {
      // handled
    }
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === 'string') {
        setAvatarChoice(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinInput.length !== 4 || !/^\d{4}$/.test(newPinInput)) {
      showToast('Yangi PIN 4 ta raqamdan iborat bo\'lishi kerak', 'error');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      showToast('Yangi PIN mos kelmadi', 'error');
      return;
    }
    setIsSavingPin(true);
    try {
      await changePin(currentPinInput, newPinInput);
      setIsChangingPin(false);
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
    } catch {
      // handled by context toast
    } finally {
      setIsSavingPin(false);
    }
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrStreet.trim()) {
      showToast("Ko'cha nomini kiriting", 'error');
      return;
    }

    try {
      await addAddress({
        title: addrTitle,
        region: addrRegion,
        district: addrDistrict,
        street: addrStreet,
        house: addrHouse,
        apartment: addrApartment,
        formattedAddress: `${addrRegion}, ${addrDistrict} ${addrStreet} ${addrHouse}`.trim(),
        isDefault: user.addresses.length === 0,
      });
      setIsAddingAddress(false);
      setAddrStreet('');
      setAddrHouse('');
      setAddrApartment('');
    } catch {
      // handled
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6 text-gray-100">
      {/* Header Profile Card */}
      <div className="bg-[#0f1d17] rounded-2xl p-6 border border-[#234233] shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => { setIsEditingProfile(true); setIsAvatarPickerOpen(true); }}
              className="relative group cursor-pointer shrink-0"
              title="Avatarni o'zgartirish"
            >
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.firstName)}`}
                alt={user.firstName}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-[#dfbe9f] shadow-md"
              />
              <div className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold font-serif text-white">
                  {user.firstName} {user.lastName}
                </h1>
                {isAdmin ? (
                  <span className="px-2.5 py-0.5 bg-amber-950/60 text-amber-300 text-[10px] font-bold rounded-full border border-amber-800/60">
                    ADMIN
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-[#173024] text-[#dfbe9f] text-[10px] font-bold rounded-full border border-[#2b543e]">
                    XARIDOR
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{formatPhone(user.phone)}</p>
              <p className="text-[11px] text-gray-500">
                A'zo bo'lgan sana: {formatDate(user.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={onGoToAdmin}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="px-3.5 py-2 bg-[#14291f] hover:bg-[#1c3629] border border-[#274c39] text-gray-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#dfbe9f]" />
              <span>Tahrirlash</span>
            </button>

            <button
              type="button"
              onClick={logout}
              className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 text-rose-300 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Chiqish</span>
            </button>
          </div>
        </div>

        {/* Edit Profile inline */}
        {isEditingProfile && (
          <form onSubmit={handleSaveProfile} className="mt-4 pt-4 border-t border-[#1c3629] space-y-4">
            {isAvatarPickerOpen && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-300">Avatar tanlang</label>
                <div className="flex flex-wrap gap-2.5">
                  {PRESET_AVATARS.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setAvatarChoice(url)}
                      className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        (avatarChoice || user.avatar) === url ? 'border-[#dfbe9f] scale-105' : 'border-[#234233] hover:border-[#3a6b52]'
                      }`}
                    >
                      <img src={url} alt="Avatar" className="w-full h-full object-cover" />
                    </button>
                  ))}
                  <label className="w-12 h-12 rounded-xl border-2 border-dashed border-[#234233] hover:border-[#dfbe9f] flex items-center justify-center cursor-pointer text-gray-400 hover:text-[#dfbe9f] transition-colors">
                    <Camera className="w-4 h-4" />
                    <input type="file" accept="image/*" onChange={handleAvatarFileUpload} className="hidden" />
                  </label>
                </div>
                {avatarChoice && avatarChoice.startsWith('data:') && (
                  <p className="text-[11px] text-emerald-400">✓ Yangi rasm tanlandi, "Saqlash" tugmasini bosing</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Ism</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Familiya</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] hover:opacity-95 text-[#0d1713] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  Saqlash
                </button>
                <button
                  type="button"
                  onClick={() => { setIsEditingProfile(false); setIsAvatarPickerOpen(false); setAvatarChoice(null); }}
                  className="px-3 py-2 bg-[#14291f] text-gray-300 border border-[#234233] rounded-xl text-xs font-medium cursor-pointer"
                >
                  Bekor qilish
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Change PIN (login parolini o'zgartirish) */}
        <div className="mt-4 pt-4 border-t border-[#1c3629]">
          {!isChangingPin ? (
            <button
              type="button"
              onClick={() => setIsChangingPin(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-[#dfbe9f] transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#dfbe9f]" />
              <span>Kirish parolini (PIN) o'zgartirish</span>
            </button>
          ) : (
            <form onSubmit={handleChangePin} className="space-y-3">
              <h4 className="text-xs font-bold text-[#dfbe9f] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Kirish parolini (PIN) o'zgartirish</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Joriy PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={currentPinInput}
                    onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-xs text-white tracking-widest focus:outline-none focus:border-[#dfbe9f]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Yangi PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-xs text-white tracking-widest focus:outline-none focus:border-[#dfbe9f]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Yangi PIN (tasdiqlash)</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 bg-[#12221a] border border-[#234233] rounded-xl text-xs text-white tracking-widest focus:outline-none focus:border-[#dfbe9f]"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSavingPin}
                  className="px-4 py-2 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] hover:opacity-95 disabled:opacity-60 text-[#0d1713] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  {isSavingPin ? 'Saqlanmoqda...' : 'Parolni yangilash'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsChangingPin(false); setCurrentPinInput(''); setNewPinInput(''); setConfirmPinInput(''); }}
                  className="px-3 py-2 bg-[#14291f] text-gray-300 border border-[#234233] rounded-xl text-xs font-medium cursor-pointer"
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Quick stats & shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div
          onClick={onGoToOrders}
          className="p-4 bg-[#0f1d17] rounded-2xl border border-[#234233] hover:border-[#dfbe9f]/50 transition-all cursor-pointer space-y-1 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Buyurtmalar</span>
            <Package className="w-4 h-4 text-[#dfbe9f]" />
          </div>
          <p className="text-xl font-bold text-white font-serif">{user.ordersCount || 0}</p>
          <p className="text-[10px] text-[#dfbe9f] font-bold">Buyurtmalar tarixini ko'rish →</p>
        </div>

        <div
          onClick={onGoToFavorites}
          className="p-4 bg-[#0f1d17] rounded-2xl border border-[#234233] hover:border-[#dfbe9f]/50 transition-all cursor-pointer space-y-1 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Saralanganlar</span>
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          </div>
          <p className="text-xl font-bold text-white font-serif">{favorites.length}</p>
          <p className="text-[10px] text-rose-400 font-bold">Sevimlilar ro'yxati →</p>
        </div>

        <div className="col-span-2 sm:col-span-1 p-4 bg-[#0f1d17] rounded-2xl border border-[#234233] space-y-1 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Jami xaridlar</span>
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-base sm:text-lg font-bold text-[#dfbe9f] truncate">
            {formatPrice(user.totalSpent || 0)}
          </p>
          <p className="text-[10px] text-gray-500">Platformadagi faollik</p>
        </div>
      </div>

      {/* Saved Addresses Section */}
      <div className="bg-[#0f1d17] rounded-2xl p-6 border border-[#234233] shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#dfbe9f]" />
            <h2 className="font-bold font-serif text-sm sm:text-base text-white">Saqlangan manzillar</h2>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingAddress(!isAddingAddress)}
            className="px-3 py-1.5 bg-[#173024] hover:bg-[#1f3f30] text-[#dfbe9f] border border-[#2b543e] font-bold text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manzil qo'shish</span>
          </button>
        </div>

        {/* Add Address Form */}
        {isAddingAddress && (
          <form onSubmit={handleCreateAddress} className="p-4 bg-[#12221a] rounded-2xl border border-[#234233] space-y-3">
            <h4 className="text-xs font-bold text-[#dfbe9f]">Yangi manzil kiritish</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">Nomi</label>
                <input
                  type="text"
                  value={addrTitle}
                  onChange={(e) => setAddrTitle(e.target.value)}
                  placeholder="Uy, Ishxona"
                  className="w-full px-3 py-1.5 bg-[#0d1713] border border-[#234233] rounded-lg text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">Shahar/Viloyat</label>
                <input
                  type="text"
                  value={addrRegion}
                  onChange={(e) => setAddrRegion(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#0d1713] border border-[#234233] rounded-lg text-xs text-white focus:outline-none focus:border-[#dfbe9f]"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">Tuman</label>
                <input
                  type="text"
                  value={addrDistrict}
                  onChange={(e) => setAddrDistrict(e.target.value)}
                  placeholder="Yunusobod"
                  className="w-full px-3 py-1.5 bg-[#0d1713] border border-[#234233] rounded-lg text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">Ko'cha nomi</label>
                <input
                  type="text"
                  value={addrStreet}
                  onChange={(e) => setAddrStreet(e.target.value)}
                  placeholder="Amir Temur shoh ko'chasi"
                  className="w-full px-3 py-1.5 bg-[#0d1713] border border-[#234233] rounded-lg text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">Uy / Kvartira</label>
                <input
                  type="text"
                  value={addrHouse}
                  onChange={(e) => setAddrHouse(e.target.value)}
                  placeholder="12-uy, 45-kv"
                  className="w-full px-3 py-1.5 bg-[#0d1713] border border-[#234233] rounded-lg text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] hover:opacity-95 text-[#0d1713] rounded-xl text-xs font-bold cursor-pointer shadow-md"
              >
                Saqlash
              </button>
              <button
                type="button"
                onClick={() => setIsAddingAddress(false)}
                className="px-3 py-2 bg-[#14291f] text-gray-300 border border-[#234233] rounded-xl text-xs font-medium cursor-pointer"
              >
                Bekor qilish
              </button>
            </div>
          </form>
        )}

        {/* Address Cards List */}
        {user.addresses && user.addresses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {user.addresses.map((addr) => (
              <div
                key={addr.id}
                className="p-3.5 bg-[#12221a] border border-[#234233] rounded-xl flex items-start justify-between gap-3"
              >
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <span>{addr.title}</span>
                    {addr.isDefault && (
                      <span className="px-1.5 py-0.2 bg-[#173024] text-[#dfbe9f] text-[9px] border border-[#2b543e] rounded-sm">
                        Asosiy
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 leading-snug">
                    {addr.formattedAddress || `${addr.region}, ${addr.district} ${addr.street} ${addr.house}`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => deleteAddress(addr.id)}
                  className="p-1.5 text-gray-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic">Hozircha saqlangan manzillar yo'q</p>
        )}
      </div>
    </div>
  );
};

