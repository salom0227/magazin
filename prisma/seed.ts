import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...');

  // Create Categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Smartfonlar',
        slug: 'smartphones',
        iconName: 'smartphone',
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Noutbuklar',
        slug: 'laptops',
        iconName: 'laptop',
        image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400',
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Kiyimlar',
        slug: 'clothing',
        iconName: 'shirt',
        image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400',
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Uy uchun',
        slug: 'home',
        iconName: 'home',
        image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400',
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Aksessuarlar',
        slug: 'accessories',
        iconName: 'watch',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
        isActive: true,
      },
    }),
  ]);

  console.log('✅ Categories created');

  // Create Currencies
  const currencies = await Promise.all([
    prisma.currency.create({
      data: {
        code: 'USD',
        symbol: '$',
        rate: 12700,
        isActive: true,
      },
    }),
    prisma.currency.create({
      data: {
        code: 'EUR',
        symbol: '€',
        rate: 13800,
        isActive: true,
      },
    }),
    prisma.currency.create({
      data: {
        code: 'RUB',
        symbol: '₽',
        rate: 140,
        isActive: true,
      },
    }),
    prisma.currency.create({
      data: {
        code: 'CNY',
        symbol: '¥',
        rate: 1750,
        isActive: true,
      },
    }),
  ]);

  console.log('✅ Currencies created');

  // Create Products with Variants
  const iPhoneProduct = await prisma.product.create({
    data: {
      name: 'iPhone 15 Pro Max',
      description: 'A17 Pro chip, Titanium design, 48MP camera system',
      price: 15400000,
      oldPrice: 16500000,
      discount: 7,
      categorySlug: 'smartphones',
      categoryName: 'Smartfonlar',
      images: [
        'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600',
        'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600',
      ],
      stock: 50,
      rating: 4.8,
      reviewsCount: 124,
      salesCount: 89,
      isFeatured: true,
      isNew: true,
      isActive: true,
      specs: {
        'Processor': 'A17 Pro',
        'Display': '6.7" Super Retina XDR',
        'Storage': '256GB / 512GB',
        'Camera': '48MP Main',
      },
      variants: {
        create: [
          {
            name: '256GB',
            sku: 'IP15PM-256',
            retailPrice: 15400000,
            wholesalePrice: 14500000,
            stock: 30,
            wholesaleTiers: [
              { minQuantity: 5, price: 14200000 },
              { minQuantity: 10, price: 14000000 },
              { minQuantity: 20, price: 13800000 },
            ],
          },
          {
            name: '512GB',
            sku: 'IP15PM-512',
            retailPrice: 17500000,
            wholesalePrice: 16500000,
            stock: 20,
            wholesaleTiers: [
              { minQuantity: 5, price: 16200000 },
              { minQuantity: 10, price: 16000000 },
              { minQuantity: 20, price: 15800000 },
            ],
          },
        ],
      },
    },
  });

  const macbookProduct = await prisma.product.create({
    data: {
      name: 'MacBook Pro 14" M3',
      description: 'M3 chip, 14" Liquid Retina XDR display, 512GB SSD',
      price: 28500000,
      oldPrice: 30000000,
      discount: 5,
      categorySlug: 'laptops',
      categoryName: 'Noutbuklar',
      images: [
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600',
      ],
      stock: 25,
      rating: 4.9,
      reviewsCount: 89,
      salesCount: 67,
      isFeatured: true,
      isActive: true,
      specs: {
        'Processor': 'M3',
        'Display': '14" Liquid Retina XDR',
        'Memory': '8GB',
        'Storage': '512GB SSD',
      },
    },
  });

  const perfumeProduct = await prisma.product.create({
    data: {
      name: 'Chanel No. 5',
      description: 'Classic Eau de Parfum, 100ml',
      price: 2500000,
      oldPrice: 2800000,
      discount: 11,
      categorySlug: 'accessories',
      categoryName: 'Aksessuarlar',
      images: [
        'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600',
      ],
      stock: 100,
      rating: 4.7,
      reviewsCount: 156,
      salesCount: 234,
      isFeatured: true,
      isActive: true,
      specs: {
        'Volume': '100ml',
        'Type': 'Eau de Parfum',
        'Brand': 'Chanel',
      },
      variants: {
        create: [
          {
            name: '50ml',
            sku: 'CHANEL-50',
            retailPrice: 1500000,
            wholesalePrice: 1300000,
            stock: 50,
            wholesaleTiers: [
              { minQuantity: 10, price: 1250000 },
              { minQuantity: 20, price: 1200000 },
            ],
          },
          {
            name: '100ml',
            sku: 'CHANEL-100',
            retailPrice: 2500000,
            wholesalePrice: 2200000,
            stock: 50,
            wholesaleTiers: [
              { minQuantity: 10, price: 2150000 },
              { minQuantity: 20, price: 2100000 },
            ],
          },
        ],
      },
    },
  });

  // Create more products
  await prisma.product.createMany({
    data: [
      {
        name: 'Samsung Galaxy S24 Ultra',
        description: 'AI-powered smartphone, 200MP camera',
        price: 18500000,
        categorySlug: 'smartphones',
        categoryName: 'Smartfonlar',
        images: ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600'],
        stock: 40,
        rating: 4.6,
        reviewsCount: 78,
        salesCount: 56,
        isActive: true,
      },
      {
        name: 'Nike Air Max 270',
        description: 'Comfortable running shoes',
        price: 1200000,
        categorySlug: 'clothing',
        categoryName: 'Kiyimlar',
        images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'],
        stock: 80,
        rating: 4.5,
        reviewsCount: 234,
        salesCount: 345,
        isActive: true,
      },
      {
        name: 'Philips Air Fryer',
        description: 'Healthy cooking with less oil',
        price: 1800000,
        categorySlug: 'home',
        categoryName: 'Uy uchun',
        images: ['https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600'],
        stock: 35,
        rating: 4.4,
        reviewsCount: 89,
        salesCount: 123,
        isActive: true,
      },
    ],
  });

  console.log('✅ Products created');

  // Create Admin User
  await prisma.user.create({
    data: {
      firstName: 'Admin',
      lastName: 'User',
      phone: '+998901234567',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
      isBlocked: false,
    },
  });

  console.log('✅ Admin user created');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
