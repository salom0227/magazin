import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { api } from '../lib/api';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register';
  authModalCallback: (() => void) | null;
  openAuthModal: (tab?: 'login' | 'register', callback?: () => void) => void;
  closeAuthModal: () => void;
  setAuthModalTab: (tab: 'login' | 'register') => void;
  login: (phone: string, pin: string) => Promise<void>;
  adminLogin: (password: string) => Promise<void>;
  register: (firstName: string, lastName: string, phone: string, pin: string) => Promise<void>;
  logout: () => void;
  updateProfile: (profile: Partial<User>) => Promise<void>;
  addAddress: (address: any) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  quickDemoLogin: (role: 'admin' | 'user') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('zamon_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [authModalCallback, setAuthModalCallback] = useState<(() => void) | null>(null);
  const { showToast } = useToast();

  const fetchCurrentUser = useCallback(async () => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const u = await api.getMe();
      setUser(u);
    } catch (err) {
      console.warn('Session expired or invalid token', err);
      localStorage.removeItem('zamon_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const openAuthModal = (tab: 'login' | 'register' = 'login', callback?: () => void) => {
    setAuthModalTab(tab);
    setAuthModalCallback(callback ? () => callback : null);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthModalCallback(null);
  };

  const login = async (phone: string, pin: string) => {
    try {
      setIsLoading(true);
      const res = await api.login(phone, pin);
      localStorage.setItem('zamon_token', res.token);
      setToken(res.token);
      setUser(res.user);
      setIsAuthModalOpen(false);
      showToast(res.message || 'Xush kelibsiz!', 'success');
      if (authModalCallback) {
        authModalCallback();
        setAuthModalCallback(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Kirishda xatolik yuz berdi', 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const adminLogin = async (password: string) => {
    try {
      setIsLoading(true);
      const res = await api.adminLogin(password);
      localStorage.setItem('zamon_token', res.token);
      setToken(res.token);
      setUser(res.user);
      setIsAuthModalOpen(false);
      showToast(res.message || 'Admin panelga xush kelibsiz!', 'success');
      if (authModalCallback) {
        authModalCallback();
        setAuthModalCallback(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Admin paroli noto\'g\'ri', 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (firstName: string, lastName: string, phone: string, pin: string) => {
    try {
      setIsLoading(true);
      const res = await api.register(firstName, lastName, phone, pin);
      localStorage.setItem('zamon_token', res.token);
      setToken(res.token);
      setUser(res.user);
      setIsAuthModalOpen(false);
      showToast('Ro\'yxatdan muvaffaqiyatli o\'tdingiz!', 'success');
      if (authModalCallback) {
        authModalCallback();
        setAuthModalCallback(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Ro\'yxatdan o\'tishda xatolik', 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const quickDemoLogin = async (role: 'admin' | 'user') => {
    if (role === 'admin') {
      await login('+998901234567', '1234');
    } else {
      await login('+998991234567', '1234');
    }
  };

  const logout = () => {
    localStorage.removeItem('zamon_token');
    setToken(null);
    setUser(null);
    showToast('Tizimdan chiqildi', 'info');
  };

  const updateProfile = async (profile: Partial<User>) => {
    try {
      const updated = await api.updateProfile(profile);
      setUser(updated);
      showToast('Profil ma\'lumotlari yangilandi', 'success');
    } catch (err: any) {
      showToast(err.message || 'Xatolik', 'error');
      throw err;
    }
  };

  const addAddress = async (address: any) => {
    try {
      const updated = await api.addAddress(address);
      setUser(updated);
      showToast('Yangi manzil saqlandi', 'success');
    } catch (err: any) {
      showToast(err.message || 'Xatolik', 'error');
      throw err;
    }
  };

  const deleteAddress = async (id: string) => {
    try {
      const updated = await api.deleteAddress(id);
      setUser(updated);
      showToast('Manzil o\'chirildi', 'info');
    } catch (err: any) {
      showToast(err.message || 'Xatolik', 'error');
      throw err;
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin,
        isAuthModalOpen,
        authModalTab,
        authModalCallback,
        openAuthModal,
        closeAuthModal,
        setAuthModalTab,
        login,
        adminLogin,
        register,
        logout,
        updateProfile,
        addAddress,
        deleteAddress,
        quickDemoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
