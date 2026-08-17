import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Phone, User as UserIcon, ShieldCheck, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalTab,
    setAuthModalTab,
    login,
    register,
    quickDemoLogin,
    isLoading,
  } = useAuth();

  // Login form state
  const [loginPhone, setLoginPhone] = useState('+998');
  const [loginPin, setLoginPin] = useState('');

  // Register form state
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regPhone, setRegPhone] = useState('+998');
  const [regPin, setRegPin] = useState('');
  const [regConfirmPin, setRegConfirmPin] = useState('');

  const [error, setError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handlePhoneInput = (val: string, setter: (v: string) => void) => {
    let clean = val.replace(/[^\d+]/g, '');
    if (!clean.startsWith('+998')) {
      clean = '+998';
    }
    if (clean.length <= 13) {
      setter(clean);
    }
  };

  const handlePinInput = (val: string, setter: (v: string) => void) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    setter(clean);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (loginPhone.length < 13) {
      setError("Telefon raqamini to'liq kiriting (+998 XX XXX XX XX)");
      return;
    }
    if (loginPin.length !== 4) {
      setError("PIN-kod aynan 4 ta raqam bo'lishi kerak");
      return;
    }

    try {
      await login(loginPhone, loginPin);
    } catch (err: any) {
      setError(err.message || 'Kirishda xatolik yuz berdi');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!regFirstName.trim() || !regLastName.trim()) {
      setError('Ism va familiyangizni kiriting');
      return;
    }
    if (regPhone.length < 13) {
      setError("Telefon raqamini to'liq kiriting (+998 XX XXX XX XX)");
      return;
    }
    if (regPin.length !== 4) {
      setError("PIN-kod aynan 4 ta raqam bo'lishi kerak");
      return;
    }
    if (regPin !== regConfirmPin) {
      setError('PIN-kodlar bir xil emas');
      return;
    }

    try {
      await register(regFirstName, regLastName, regPhone, regPin);
    } catch (err: any) {
      setError(err.message || "Ro'yxatdan o'tishda xatolik");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-[#0f1d17] rounded-2xl shadow-2xl border border-[#234233] max-w-md w-full overflow-hidden relative text-gray-100"
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-[#1a3327] rounded-full transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-[#12241b] via-[#0d1713] to-[#152a20] p-6 text-center relative overflow-hidden border-b border-[#1c3629]">
          <div className="relative z-10">
            <div className="w-12 h-12 mx-auto mb-3 bg-[#172e22] rounded-2xl border border-[#2d523f] flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-7 h-7 text-[#dfbe9f]" />
            </div>
            <h2 className="text-2xl font-bold font-serif tracking-tight text-white">Velora Shop</h2>
            <p className="text-gray-400 text-xs mt-1">
              {authModalTab === 'login'
                ? 'Hisobingizga kiring va xaridlaringizni boshqaring'
                : 'Yangi hisob yarating va tezkor xarid qiling'}
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border border-[#234233] bg-[#0c1813] p-1 m-4 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setAuthModalTab('login');
            }}
            className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              authModalTab === 'login'
                ? 'bg-[#183124] text-[#dfbe9f] border border-[#2c543f] shadow-xs'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Kirish
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setAuthModalTab('register');
            }}
            className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              authModalTab === 'register'
                ? 'bg-[#183124] text-[#dfbe9f] border border-[#2c543f] shadow-xs'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Ro'yxatdan o'tish
          </button>
        </div>

        {/* Content Body */}
        <div className="px-6 pb-6 pt-2">
          {error && (
            <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {authModalTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Telefon raqam
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Phone className="w-4 h-4 text-[#dfbe9f]" />
                  </div>
                  <input
                    type="tel"
                    value={loginPhone}
                    onChange={(e) => handlePhoneInput(e.target.value, setLoginPhone)}
                    placeholder="+998 90 123 45 67"
                    className="w-full pl-10 pr-3 py-2.5 bg-[#12221a] border border-[#234233] rounded-xl text-sm font-medium text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    4 xonali PIN-kod
                  </label>
                  <span className="text-[11px] text-gray-400 font-medium">Masalan: 1234</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4 text-[#dfbe9f]" />
                  </div>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={loginPin}
                    onChange={(e) => handlePinInput(e.target.value, setLoginPin)}
                    placeholder="••••"
                    className="w-full pl-10 pr-3 py-2.5 bg-[#12221a] border border-[#234233] rounded-xl text-sm font-medium tracking-widest text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] hover:opacity-95 text-[#0d1713] font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <span>Tekshirilmoqda...</span>
                ) : (
                  <>
                    <span>Tizimga kirish</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Ism</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={regFirstName}
                      onChange={(e) => setRegFirstName(e.target.value)}
                      placeholder="Jasur"
                      className="w-full px-3 py-2.5 bg-[#12221a] border border-[#234233] rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Familiya</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={regLastName}
                      onChange={(e) => setRegLastName(e.target.value)}
                      placeholder="Olimov"
                      className="w-full px-3 py-2.5 bg-[#12221a] border border-[#234233] rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Telefon raqam
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Phone className="w-4 h-4 text-[#dfbe9f]" />
                  </div>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => handlePhoneInput(e.target.value, setRegPhone)}
                    placeholder="+998 90 123 45 67"
                    className="w-full pl-10 pr-3 py-2.5 bg-[#12221a] border border-[#234233] rounded-xl text-sm font-medium text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    4 xonali PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={regPin}
                    onChange={(e) => handlePinInput(e.target.value, setRegPin)}
                    placeholder="••••"
                    className="w-full px-3 py-2.5 bg-[#12221a] border border-[#234233] rounded-xl text-sm font-medium tracking-widest text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    PIN qayta
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={regConfirmPin}
                    onChange={(e) => handlePinInput(e.target.value, setRegConfirmPin)}
                    placeholder="••••"
                    className="w-full px-3 py-2.5 bg-[#12221a] border border-[#234233] rounded-xl text-sm font-medium tracking-widest text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f]"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 mt-2 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] hover:opacity-95 text-[#0d1713] font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <span>Yaratilmoqda...</span>
                ) : (
                  <>
                    <span>Ro'yxatdan o'tish</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}


        </div>
      </motion.div>
    </div>
  );
};

