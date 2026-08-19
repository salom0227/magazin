import type { Product } from '../types';

/**
 * Optom narx qachon qo'llanishini hal qiluvchi yagona joy (frontend tomoni).
 * Bu backend'dagi (server-prisma.ts) getUnitPrice bilan bir xil qoidaga
 * amal qiladi: admin panelda belgilangan "optom necha donadan boshlanadi"
 * (wholesaleMinQty) qiymatidan kam bo'lmasa va optom narx haqiqatan ham
 * belgilangan bo'lsa — optom narx ishlatiladi. Bu faqat ko'rinish uchun;
 * yakuniy, ishonchli narx har doim serverda qayta hisoblanadi.
 */
export function getUnitPrice(product: Pick<Product, 'price' | 'piecePrice' | 'wholesalePrice' | 'wholesaleMinQty'>, quantity: number): number {
  const piecePrice = product.piecePrice || product.price;
  const hasWholesale = !!product.wholesalePrice && !!product.wholesaleMinQty && product.wholesaleMinQty > 0;
  if (hasWholesale && quantity >= (product.wholesaleMinQty as number)) {
    return product.wholesalePrice as number;
  }
  return piecePrice;
}

export function hasWholesaleTier(product: Pick<Product, 'price' | 'piecePrice' | 'wholesalePrice' | 'wholesaleMinQty'>): boolean {
  return !!product.wholesalePrice && !!product.wholesaleMinQty && product.wholesaleMinQty > 0 &&
    product.wholesalePrice !== (product.piecePrice || product.price);
}
