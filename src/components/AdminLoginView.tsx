import React, { useState } from 'react';
import { ShieldCheck, Lock, ArrowRight, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AdminLoginView: React.FC<{ onGoHome: () => void }> = ({ onGoHome }) => {
  const { adminLogin, isLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password.trim()) {
      setError('Admin parolini kiriting');
      return;
    }

    try {
      await adminLogin(password.trim());
    } catch (err: any) {
      setError(err.message || 'Admin paroli noto\'g\'ri');
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1713] flex items-center justify-center p-4 selection:bg-[#dfbe9f] selection:text-[#0d1713] font-sans text-gray-100">
      <div className="bg-[#0f1d17] rounded-3xl shadow-2xl border border-[#234233] max-w-md w-full overflow-hidden p-8 space-y-6">
        {/* Top Icon & Title */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#1b3628] to-[#12241b] rounded-2xl border border-[#2e5641] flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-9 h-9 text-[#dfbe9f]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-serif text-white tracking-tight">Admin Paneli</h1>
            <p className="text-xs text-gray-400 mt-1">
              Boshqaruv tizimiga kirish uchun admin parolini kiriting
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-xs text-rose-300 text-center font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">
              Admin Paroli
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <KeyRound className="w-4 h-4 text-[#dfbe9f]" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin parolini kiriting"
                className="w-full pl-10 pr-4 py-3 bg-[#12221a] border border-[#234233] rounded-xl text-sm font-medium text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dfbe9f] transition-colors"
                autoFocus
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-[#dfbe9f] to-[#b88a64] hover:opacity-95 text-[#0d1713] font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <span>Tekshirilmoqda...</span>
            ) : (
              <>
                <span>Admin panelga kirish</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Go back */}
        <div className="pt-2 text-center border-t border-[#1c3629]">
          <button
            type="button"
            onClick={onGoHome}
            className="text-xs text-[#dfbe9f] hover:text-[#f3dfc8] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Bosh sahifaga qaytish</span>
          </button>
        </div>
      </div>
    </div>
  );
};
