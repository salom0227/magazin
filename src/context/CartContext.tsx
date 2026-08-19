import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { CartItem, Product } from '../types';
import { useToast } from './ToastContext';
import { getUnitPrice, FREE_DELIVERY_THRESHOLD, STANDARD_DELIVERY_FEE } from '../lib/pricing';

interface CartContextType {
  items: CartItem[];
  itemsCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  freeDeliveryThreshold: number;
  amountNeededForFreeDelivery: number;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  isCheckoutModalOpen: boolean;
  setIsCheckoutModalOpen: (open: boolean) => void;
  addToCart: (product: Product, quantity?: number, options?: { color?: string; size?: string; unitPriceOverride?: number }) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  getItemQuantity: (productId: string) => number;
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('zamon_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('zamon_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    try {
      localStorage.setItem('zamon_cart', JSON.stringify(items));
    } catch (e) {
      console.error(e);
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem('zamon_favorites', JSON.stringify(favorites));
    } catch (e) {
      console.error(e);
    }
  }, [favorites]);

  const addToCart = (product: Product, quantity = 1, options?: { color?: string; size?: string; unitPriceOverride?: number }) => {
    if (product.stock <= 0) {
      showToast('Kechirasiz, mahsulot omborda qolmagan', 'error');
      return;
    }

    // Variant mahsulotlar uchun (masalan hajm/o'lcham tanlangan) narx
    // ProductDetailModal'da allaqachon hisoblab beriladi (unitPriceOverride).
    // Oddiy mahsulotlar uchun narx miqdorga qarab (optom chegarasi bo'yicha)
    // shu yerda avtomatik hisoblanadi — bu butun sayt bo'ylab yagona qoida.
    const usesOverride = options?.unitPriceOverride !== undefined;

    setItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, product.stock);
        const newUnitPrice = usesOverride
          ? (options!.unitPriceOverride as number)
          : getUnitPrice(product, newQty);
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: newQty,
                unitPrice: newUnitPrice,
                selectedColor: options?.color || item.selectedColor,
                selectedSize: options?.size || item.selectedSize,
              }
            : item
        );
      }
      const qty = Math.min(quantity, product.stock);
      const unitPrice = usesOverride
        ? (options!.unitPriceOverride as number)
        : getUnitPrice(product, qty);
      return [
        ...prev,
        {
          productId: product.id,
          product,
          quantity: qty,
          unitPrice,
          selectedColor: options?.color,
          selectedSize: options?.size,
        },
      ];
    });

    showToast(`"${product.name.slice(0, 24)}..." savatga qo'shildi`, 'success');
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const maxQty = item.product.stock || 99;
          const newQty = Math.min(quantity, maxQty);
          // Variantli mahsulotlarda tanlangan variant narxi savatda
          // saqlanmagani sabab (faqat rang/o'lcham nomi saqlanadi), miqdor
          // o'zgarganda narxni faqat variant biriktirilmagan mahsulotlar
          // uchun qayta hisoblaymiz — aks holda noto'g'ri (bazaviy) narxga
          // sakrab ketishi mumkin edi.
          const hasVariants = !!item.product.variants?.length;
          const newUnitPrice = hasVariants ? item.unitPrice : getUnitPrice(item.product, newQty);
          return { ...item, quantity: newQty, unitPrice: newUnitPrice };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
    showToast('Mahsulot savatdan olib tashlandi', 'info');
  };

  const clearCart = () => {
    setItems([]);
  };

  const getItemQuantity = (productId: string): number => {
    const found = items.find((i) => i.productId === productId);
    return found ? found.quantity : 0;
  };

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        showToast('Saralangandan olib tashlandi', 'info');
        return prev.filter((id) => id !== productId);
      } else {
        showToast('Saralanganlarga qo\'shildi', 'success');
        return [...prev, productId];
      }
    });
  };

  const isFavorite = (productId: string): boolean => {
    return favorites.includes(productId);
  };

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.unitPrice ?? item.product.price) * item.quantity, 0);
  }, [items]);

  const itemsCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const deliveryFee = useMemo(() => {
    if (subtotal === 0) return 0;
    return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
  }, [subtotal]);

  const total = useMemo(() => {
    return subtotal + deliveryFee;
  }, [subtotal, deliveryFee]);

  const amountNeededForFreeDelivery = useMemo(() => {
    return Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  }, [subtotal]);

  return (
    <CartContext.Provider
      value={{
        items,
        itemsCount,
        subtotal,
        deliveryFee,
        total,
        freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
        amountNeededForFreeDelivery,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        isCheckoutModalOpen,
        setIsCheckoutModalOpen,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        getItemQuantity,
        favorites,
        toggleFavorite,
        isFavorite,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
