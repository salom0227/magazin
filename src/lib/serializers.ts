import type {
  Address as DbAddress,
  Category as DbCategory,
  Currency as DbCurrency,
  DeliveryAddress as DbDeliveryAddress,
  Order as DbOrder,
  OrderItem as DbOrderItem,
  Product as DbProduct,
  ProductReview as DbProductReview,
  ProductVariant as DbProductVariant,
  User as DbUser,
} from '@prisma/client';
import type {
  Address,
  Category,
  Currency,
  Order,
  OrderStatus,
  Product,
  ProductReview,
  ProductVariant,
  User,
  WholesaleTier,
} from '../types';

export type DbUserFull = DbUser & { addresses?: DbAddress[] };
export type DbProductFull = DbProduct & {
  variants?: DbProductVariant[];
  reviews?: DbProductReview[];
};
export type DbOrderFull = DbOrder & {
  items?: DbOrderItem[];
  deliveryAddress?: DbDeliveryAddress | null;
};

function toUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

export function serializeAddress(address: DbAddress): Address {
  return {
    id: address.id,
    title: address.title,
    region: address.region,
    district: address.district,
    street: address.street,
    house: address.house,
    apartment: toUndefined(address.apartment),
    notes: toUndefined(address.notes),
    latitude: toUndefined(address.latitude),
    longitude: toUndefined(address.longitude),
    formattedAddress: toUndefined(address.formattedAddress),
    isDefault: address.isDefault,
  };
}

/** Never exposes pinHash / salt to clients. */
export function serializeUser(user: DbUserFull): User {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role === 'admin' ? 'admin' : 'user',
    avatar: toUndefined(user.avatar),
    addresses: (user.addresses ?? []).map(serializeAddress),
    isBlocked: user.isBlocked,
    totalSpent: user.totalSpent,
    ordersCount: user.ordersCount,
    createdAt: user.createdAt.toISOString(),
  };
}

export function serializeCategory(category: DbCategory, productCount?: number): Category {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    iconName: category.iconName,
    image: category.image,
    isActive: category.isActive,
    productCount: productCount ?? category.productCount,
  };
}

export function serializeVariant(variant: DbProductVariant): ProductVariant {
  return {
    id: variant.id,
    name: variant.name,
    sku: variant.sku,
    retailPrice: variant.retailPrice,
    wholesalePrice: variant.wholesalePrice,
    usdPrice: toUndefined(variant.usdPrice),
    eurPrice: toUndefined(variant.eurPrice),
    stock: variant.stock,
    wholesaleTiers: Array.isArray(variant.wholesaleTiers)
      ? (variant.wholesaleTiers as unknown as WholesaleTier[])
      : [],
  };
}

export function serializeReview(review: DbProductReview): ProductReview {
  return {
    id: review.id,
    userId: review.userId,
    userName: review.userName,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
  };
}

export function serializeProduct(product: DbProductFull): Product {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    oldPrice: toUndefined(product.oldPrice),
    discount: toUndefined(product.discount),
    category: product.categorySlug,
    categoryName: product.categoryName,
    images: product.images,
    stock: product.stock,
    rating: product.rating,
    reviewsCount: product.reviewsCount,
    salesCount: product.salesCount,
    isFeatured: product.isFeatured,
    isNew: product.isNew,
    isActive: product.isActive,
    specs: (product.specs ?? {}) as Record<string, string>,
    reviews: product.reviews?.map(serializeReview),
    variants: product.variants?.map(serializeVariant),
    wholesalePrice: toUndefined(product.wholesalePrice),
    piecePrice: toUndefined(product.piecePrice),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function serializeOrder(order: DbOrderFull): Order {
  const address = order.deliveryAddress;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    userId: toUndefined(order.userId),
    customer: {
      firstName: order.firstName,
      lastName: order.lastName,
      phone: order.phone,
    },
    items: (order.items ?? []).map((item) => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: item.quantity,
      categoryName: toUndefined(item.categoryName),
    })),
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    deliveryAddress: {
      region: address?.region ?? '',
      district: address?.district ?? '',
      street: address?.street ?? '',
      house: address?.house ?? '',
      apartment: toUndefined(address?.apartment ?? null),
      notes: toUndefined(address?.notes ?? null),
      latitude: toUndefined(address?.latitude ?? null),
      longitude: toUndefined(address?.longitude ?? null),
      formattedAddress: toUndefined(address?.formattedAddress ?? null),
    },
    paymentMethod: order.paymentMethod as Order['paymentMethod'],
    status: order.status as OrderStatus,
    statusHistory: Array.isArray(order.statusHistory)
      ? (order.statusHistory as unknown as Order['statusHistory'])
      : [],
    createdAt: order.createdAt.toISOString(),
    estimatedDelivery: toUndefined(order.estimatedDelivery),
  };
}

export function serializeCurrency(currency: DbCurrency): Currency {
  return {
    id: currency.id,
    code: currency.code,
    symbol: currency.symbol,
    rate: currency.rate,
    isActive: currency.isActive,
  };
}
