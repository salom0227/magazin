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

// Yetkazib berish narxi ham xuddi shu sababga ko'ra shu yerda, yagona joyda
// belgilanadi: avval bu qiymat frontendda (CartContext.tsx: 25 000) va
// backendda (server-prisma.ts: 30 000) alohida-alohida yozilgan edi. Mijoz
// butun savat/checkout jarayonida 25 000 so'm ko'rardi, lekin buyurtma
// serverda yakunlanganda haqiqatda 30 000 so'm hisoblanardi — bu chekka
// bug emas, har bir buyurtmaga ta'sir qiluvchi narx nomuvofiqligi edi.
// Endi ikkala tomon ham shu konstantalarni import qiladi, shuning uchun
// ular kelajakda ham bir-biridan ajralib qolishi mumkin emas.
export const FREE_DELIVERY_THRESHOLD = 500000; // 500 000 so'mdan yuqori — bepul
export const STANDARD_DELIVERY_FEE = 30000; // 30 000 so'm

export function calculateDeliveryFee(subtotal: number): number {
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
}
