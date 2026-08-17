import type { Product, Category, Order, User } from '../types';

export const mockCategories: Category[] = [
  {
    id: "cat-beauty-care",
    name: "Beauty & Care",
    slug: "beauty-care",
    iconName: "Sparkles",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80",
    isActive: true,
    productCount: 12,
  },
  {
    id: "cat-laundry",
    name: "Laundry",
    slug: "laundry",
    iconName: "Shirt",
    image: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=600&q=80",
    isActive: true,
    productCount: 8,
  },
  {
    id: "cat-home",
    name: "Home",
    slug: "home",
    iconName: "Home",
    image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80",
    isActive: true,
    productCount: 9,
  },
  {
    id: "cat-accessories",
    name: "Accessories",
    slug: "accessories",
    iconName: "Watch",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
    isActive: true,
    productCount: 10,
  },
  {
    id: "cat-everyday",
    name: "Everyday",
    slug: "everyday",
    iconName: "Folder",
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80",
    isActive: true,
    productCount: 14,
  },
  {
    id: "cat-women",
    name: "Ayollar uchun",
    slug: "women",
    iconName: "Sparkles",
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80",
    isActive: true,
    productCount: 11,
  },
  {
    id: "cat-men",
    name: "Erkaklar uchun",
    slug: "men",
    iconName: "Watch",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80",
    isActive: true,
    productCount: 7,
  },
  {
    id: "cat-kids",
    name: "Bolalar uchun",
    slug: "kids",
    iconName: "Sparkles",
    image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=600&q=80",
    isActive: true,
    productCount: 6,
  },
];

export const mockProducts: Product[] = [
  {
    id: "prod-1",
    name: "Atir - La Belle (Luxury Eau De Parfum 100ml)",
    description: "Fransuz atirlarining eng nozik kompozitsiyasi. Yasmin, atirgul va vanilning jozibali ifori. 24 soatgacha saqlanib qoluvchi barqaror hid.",
    price: 125000,
    oldPrice: 160000,
    discount: 22,
    category: "beauty-care",
    categoryName: "Beauty & Care",
    images: [
      "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=80"
    ],
    stock: 45,
    rating: 4.9,
    reviewsCount: 128,
    salesCount: 840,
    isFeatured: true,
    isNew: true,
    isActive: true,
    specs: {
      "Hajmi": "100 ml",
      "Turi": "Eau De Parfum",
      "Aromat guruhi": "Gulli-sharqona",
      "Ishlab chiqarilgan": "Fransiya",
      "Chidamlilik": "24 soatgacha"
    },
    reviews: [
      { id: "r1", userId: "u1", userName: "Madina A.", rating: 5, comment: "Ifori shunchaki ajoyib! Butun kun davomida sezilib turadi.", createdAt: "2025-02-14T12:00:00Z" },
      { id: "r2", userId: "u2", userName: "Zarina T.", rating: 5, comment: "Qadoqlanishi juda hashamatli, sovg'a uchun mukammal tanlov.", createdAt: "2025-02-15T09:30:00Z" }
    ],
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-2",
    name: "Kir yuvish geli - 3L (Concentrated Active Formula)",
    description: "Kirlarni chuqur tozalovchi va mato tolalarini asrovchi yuqori konsentratsiyali suyuq gel. Oq va rangli kiyimlar uchun maxsus formula.",
    price: 78000,
    oldPrice: 95000,
    discount: 18,
    category: "laundry",
    categoryName: "Laundry",
    images: [
      "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=800&q=80"
    ],
    stock: 60,
    rating: 4.8,
    reviewsCount: 94,
    salesCount: 1120,
    isFeatured: true,
    isNew: false,
    isActive: true,
    specs: {
      "Hajmi": "3 Litr (60 marta yuvish)",
      "Turi": "Konsentrlangan gel",
      "Xususiyati": "Dog'larni yo'qotuvchi + xushbo'y",
      "Ishlab chiqarilgan": "Germaniya texnologiyasi"
    },
    reviews: [
      { id: "r3", userId: "u3", userName: "Dilnoza M.", rating: 5, comment: "Kiyimlarni yumshoq va juda xushbo'y qiladi!", createdAt: "2025-02-10T14:10:00Z" }
    ],
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-3",
    name: "Namlagich krem - 50ml (Hydra Deep Nourish Cream)",
    description: "Gialuron kislotasi va keramidlar bilan boyitilgan chuqur namlantiruvchi yuz kremi. Terini mayin, elastik va yorqin qiladi.",
    price: 65000,
    oldPrice: 85000,
    discount: 24,
    category: "beauty-care",
    categoryName: "Beauty & Care",
    images: [
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80"
    ],
    stock: 35,
    rating: 4.9,
    reviewsCount: 156,
    salesCount: 760,
    isFeatured: true,
    isNew: true,
    isActive: true,
    specs: {
      "Hajmi": "50 ml",
      "Turi": "Yuz va bo'yin uchun namlantiruvchi krem",
      "Tarkibi": "Gialuron kislotasi, Keramidlar, Peptidlar",
      "Teri turi": "Barcha teri turlariga mos"
    },
    reviews: [
      { id: "r4", userId: "u4", userName: "Nilufar B.", rating: 5, comment: "Yog'li iz qoldirmaydi, tez so'riladi. Terim silliq bo'ldi.", createdAt: "2025-02-11T16:00:00Z" }
    ],
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-4",
    name: "Shampun - Keratin (Smooth & Shine 500ml)",
    description: "Sochni ildizidan uchigacha oziqlantiruvchi keratin va tabiiy argan yog'li professional shampun. Soch to'kilishini kamaytiradi.",
    price: 45000,
    oldPrice: 60000,
    discount: 25,
    category: "beauty-care",
    categoryName: "Beauty & Care",
    images: [
      "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80"
    ],
    stock: 50,
    rating: 4.8,
    reviewsCount: 88,
    salesCount: 920,
    isFeatured: true,
    isNew: false,
    isActive: true,
    specs: {
      "Hajmi": "500 ml",
      "Dispenser": "Qulay nasosli dispenser",
      "Tarkibi": "Keratin, Argan yog'i, Vitamin B5",
      "Effekt": "Yaltiroqlik va mustahkamlik"
    },
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-5",
    name: "Ayollar sumkasi (Velora Elegance Shoulder Bag)",
    description: "Premium eko-charmdan ishlangan nafis ayollar sumkasi. Oltin zanjirli tasma, qulay ichki bo'linmalar va zamonaviy dizayn.",
    price: 185000,
    oldPrice: 240000,
    discount: 23,
    category: "accessories",
    categoryName: "Accessories",
    images: [
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80"
    ],
    stock: 20,
    rating: 4.9,
    reviewsCount: 72,
    salesCount: 340,
    isFeatured: true,
    isNew: true,
    isActive: true,
    specs: {
      "Material": "Yuqori sifatli eko-charm",
      "O'lchami": "24 x 16 x 8 sm",
      "Furnitura": "Zanglamaydigan oltin tusli metall",
      "Uslub": "Klassik & Kechki"
    },
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-6",
    name: "Xushbo'y sham to'plami (Aroma Diffuser & Candle Set)",
    description: "Tabiiy soya mumi va efir moylaridan tayyorlangan xonadon uchun xushbo'y sham va diffuzor. Xonaga tinchlantiruvchi hid beradi.",
    price: 55000,
    oldPrice: 70000,
    discount: 21,
    category: "home",
    categoryName: "Home",
    images: [
      "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80"
    ],
    stock: 28,
    rating: 4.8,
    reviewsCount: 45,
    salesCount: 290,
    isFeatured: false,
    isNew: true,
    isActive: true,
    specs: {
      "To'plam": "1x Diffuzor 100ml + 1x Sham 150g",
      "Ifor": "Lavanda va Santal daraxti",
      "Yonish vaqti": "35 soat"
    },
    createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-7",
    name: "Yuz uchun zardob (Vitamin C Glow Booster Serum 30ml)",
    description: "Terini oqartiruvchi va yoshartiruvchi kuchli antioksidant zardob. Pigmentatsiya va mayda ajinlarni samarali kamaytiradi.",
    price: 95000,
    oldPrice: 120000,
    discount: 20,
    category: "beauty-care",
    categoryName: "Beauty & Care",
    images: [
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1608248597359-598971f1e31d?auto=format&fit=crop&w=800&q=80"
    ],
    stock: 40,
    rating: 4.9,
    reviewsCount: 63,
    salesCount: 480,
    isFeatured: true,
    isNew: true,
    isActive: true,
    specs: {
      "Hajmi": "30 ml",
      "Faol moddalar": "15% Vitamin C, Ferul kislotasi, E vitamini",
      "Qo'llash": "Har kuni ertalab va kechqurun"
    },
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-8",
    name: "Taroq va soch parvarishi to'plami (Eco Wooden Hair Set)",
    description: "Tabiiy bambuk yog'ochidan tayyorlangan antistatik taroq va massaj cho'tkasi to'plami. Bosh terisini qon aylanishini yaxshilaydi.",
    price: 35000,
    oldPrice: 48000,
    discount: 27,
    category: "accessories",
    categoryName: "Accessories",
    images: [
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1590159763121-7c9ff3149e0a?auto=format&fit=crop&w=800&q=80"
    ],
    stock: 30,
    rating: 4.7,
    reviewsCount: 38,
    salesCount: 310,
    isFeatured: false,
    isNew: false,
    isActive: true,
    specs: {
      "Material": "100% Tabiiy bambuk",
      "To'plam": "2 dona taroq + ipak rezinachalar",
      "Xususiyati": "Antistatik va bosh massaji"
    },
    createdAt: new Date(Date.now() - 16 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-9",
    name: "Dush geli - Silk Care (Avokado & Bodom yog'i 750ml)",
    description: "Terini ipakdek yumshoq qiluvchi xushbo'y dush geli. Teri quruqligiga qarshi faol namlantiruvchi formulaga ega.",
    price: 38000,
    oldPrice: 48000,
    discount: 21,
    category: "everyday",
    categoryName: "Everyday",
    images: [
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80"
    ],
    stock: 65,
    rating: 4.8,
    reviewsCount: 82,
    salesCount: 650,
    isFeatured: false,
    isNew: true,
    isActive: true,
    specs: {
      "Hajmi": "750 ml",
      "Ifor": "Avokado va shirin bodom",
      "pH darajasi": "5.5 teri uchun neytral"
    },
    createdAt: new Date(Date.now() - 11 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-10",
    name: "Organik sovun va skrab to'plami (Handmade Spa Box)",
    description: "Qo'lda tayyorlangan tabiiy kofe skrabi va efir moyli efir sovunlari sovg'abop qutida.",
    price: 42000,
    oldPrice: 55000,
    discount: 23,
    category: "everyday",
    categoryName: "Everyday",
    images: [
      "https://images.unsplash.com/photo-1607006314605-7281c7ff910f?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=800&q=80"
    ],
    stock: 22,
    rating: 4.9,
    reviewsCount: 51,
    salesCount: 270,
    isFeatured: false,
    isNew: true,
    isActive: true,
    specs: {
      "To'plam": "2x Tabiiy sovun + 1x Kofe skrab 200g",
      "Qadoq": "Hashamatli ekologik quti"
    },
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-11",
    name: "Apple iPhone 15 Pro Max 256GB Natural Titanium",
    description: "Eng so'nggi A17 Pro protsessori, titan korpus, 48MP asosiy kamera va 5x optik zoom bilan ta'minlangan flagman smartfon.",
    price: 15400000,
    oldPrice: 17200000,
    discount: 10,
    category: "accessories",
    categoryName: "Accessories",
    images: [
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80"
    ],
    stock: 12,
    rating: 4.9,
    reviewsCount: 184,
    salesCount: 320,
    isFeatured: false,
    isNew: true,
    isActive: true,
    specs: {
      "Xotira": "256 GB",
      "Protsessor": "Apple A17 Pro (3nm)",
      "Ekran": "6.7\" OLED Super Retina XDR 120Hz"
    },
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-12",
    name: "Sony WH-1000XM5 Premium Simsiz Quloqchinlar",
    description: "Sanoat yetakchisi faol shovqin bekor qilish (ANC), 30 soatlik batareya muddati va kristaldek toza audio.",
    price: 3890000,
    oldPrice: 4600000,
    discount: 15,
    category: "accessories",
    categoryName: "Accessories",
    images: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80"
    ],
    stock: 15,
    rating: 4.8,
    reviewsCount: 92,
    salesCount: 210,
    isFeatured: false,
    isNew: false,
    isActive: true,
    specs: {
      "Ishlash vaqti": "30 soat (ANC bilan)",
      "Ulanish": "Bluetooth 5.2 & Hi-Res Audio"
    },
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const mockDefaultUser: User = {
  id: "user-1",
  firstName: "Shahzod",
  lastName: "Qalandarov",
  phone: "+998991234567",
  role: "user",
  isBlocked: false,
  addresses: [
    {
      id: "addr-1",
      title: "Uy",
      region: "Toshkent shahri",
      district: "Yunusobod",
      street: "Amir Temur shoh ko'chasi",
      house: "45-uy, 12-xonadon",
      formattedAddress: "Toshkent shahri, Yunusobod tumani, Amir Temur shoh ko'chasi, 45-uy, 12-xonadon",
      isDefault: true,
    },
  ],
  ordersCount: 3,
  totalSpent: 12450000,
  createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
};

export const mockAdminUser: User = {
  id: "admin-1",
  firstName: "Admin",
  lastName: "Velora",
  phone: "+998901234567",
  role: "admin",
  isBlocked: false,
  addresses: [],
  ordersCount: 0,
  totalSpent: 0,
  createdAt: new Date().toISOString(),
};

export const mockOrders: Order[] = [
  {
    id: "ord-1",
    orderNumber: "#VEL-84921",
    userId: "user-1",
    customer: {
      firstName: "Shahzod",
      lastName: "Qalandarov",
      phone: "+998991234567"
    },
    items: [
      {
        productId: "prod-1",
        name: "Atir - La Belle (Luxury Eau De Parfum)",
        price: 125000,
        quantity: 1,
        image: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=600&q=80"
      },
      {
        productId: "prod-2",
        name: "Kir yuvish geli - 3L",
        price: 78000,
        quantity: 1,
        image: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=600&q=80"
      }
    ],
    deliveryAddress: {
      region: "Toshkent shahri",
      district: "Yunusobod",
      street: "Amir Temur shoh ko'chasi",
      house: "45-uy, 12-xonadon",
      formattedAddress: "Toshkent shahri, Yunusobod tumani, Amir Temur shoh ko'chasi, 45-uy, 12-xonadon"
    },
    paymentMethod: "payme",
    status: "Delivered",
    statusHistory: [
      { status: "Pending", timestamp: "2025-02-10T10:00:00Z", note: "Buyurtma qabul qilindi" },
      { status: "Confirmed", timestamp: "2025-02-10T10:30:00Z", note: "To'lov tasdiqlandi" },
      { status: "Preparing", timestamp: "2025-02-10T11:00:00Z", note: "Ombordan yig'ilmoqda" },
      { status: "Shipped", timestamp: "2025-02-10T14:00:00Z", note: "Kuryerga topshirildi" },
      { status: "Delivered", timestamp: "2025-02-11T12:00:00Z", note: "Mijozga topshirildi" }
    ],
    subtotal: 203000,
    deliveryFee: 0,
    total: 203000,
    createdAt: "2025-02-10T10:00:00Z"
  }
];

