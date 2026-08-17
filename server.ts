import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import type { User, Product, Category, Order, AdminStats, OrderStatus, ProductReview, Currency, ProductVariant, WholesaleTier } from "./src/types";

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "zamon-market-secure-jwt-key-2025";

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Storage files path
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_FILE = path.join(DATA_DIR, "store.json");

// In-Memory state with disk persistence
interface DBState {
  users: (User & { pinHash: string; salt: string })[];
  products: Product[];
  categories: Category[];
  orders: Order[];
  currencies: Currency[];
  loginAttempts: Record<string, { attempts: number; lockUntil?: number }>;
}

// Utility: Hash PIN using crypto PBKDF2
function hashPin(pin: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(pin, generatedSalt, 1000, 64, "sha512").toString("hex");
  return { hash, salt: generatedSalt };
}

// Utility: Simple secure JWT implementation using HMAC-SHA256
function generateToken(payload: { id: string; role: string; phone: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string): { id: string; role: string; phone: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${body}`)
      .digest("base64url");
    if (signature !== expectedSig) return null;
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch (err) {
    return null;
  }
}

// Seed Categories
const initialCategories: Category[] = [
  {
    id: "cat-electronics",
    name: "Elektronika",
    slug: "electronics",
    iconName: "Tv",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
    isActive: true,
    productCount: 8,
  },
  {
    id: "cat-smartphones",
    name: "Smartfonlar & Gadjetlar",
    slug: "smartphones",
    iconName: "Smartphone",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80",
    isActive: true,
    productCount: 7,
  },
  {
    id: "cat-appliances",
    name: "Maishiy texnika",
    slug: "appliances",
    iconName: "Refrigerator",
    image: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=600&q=80",
    isActive: true,
    productCount: 6,
  },
  {
    id: "cat-fashion",
    name: "Kiyim & Poyabzal",
    slug: "fashion",
    iconName: "Shirt",
    image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=600&q=80",
    isActive: true,
    productCount: 6,
  },
  {
    id: "cat-beauty",
    name: "Go'zallik & Parvarish",
    slug: "beauty",
    iconName: "Sparkles",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80",
    isActive: true,
    productCount: 5,
  },
  {
    id: "cat-home",
    name: "Uy & Oshxona",
    slug: "home",
    iconName: "Home",
    image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80",
    isActive: true,
    productCount: 5,
  },
  {
    id: "cat-sports",
    name: "Sport & Sayohat",
    slug: "sports",
    iconName: "Dumbbell",
    image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80",
    isActive: true,
    productCount: 4,
  },
  {
    id: "cat-accessories",
    name: "Aksessuarlar & Soatlar",
    slug: "accessories",
    iconName: "Watch",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
    isActive: true,
    productCount: 5,
  },
];

// Seed Products
const initialProducts: Product[] = [
  {
    id: "prod-1",
    name: "Apple iPhone 15 Pro Max 256GB Natural Titanium",
    description: "Eng so'nggi A17 Pro protsessori, titan korpus, 48MP asosiy kamera va 5x optik zoom bilan ta'minlangan flagman smartfon. 120Hz ProMotion OLED ekran va Action button bilan to'ldirilgan.",
    price: 15400000,
    oldPrice: 17200000,
    discount: 10,
    category: "smartphones",
    categoryName: "Smartfonlar & Gadjetlar",
    images: [
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=1000&q=80"
    ],
    stock: 24,
    rating: 4.9,
    reviewsCount: 184,
    salesCount: 640,
    isFeatured: true,
    isNew: true,
    isActive: true,
    specs: {
      "Xotira": "256 GB",
      "Operativ xotira": "8 GB",
      "Protsessor": "Apple A17 Pro (3nm)",
      "Ekran": "6.7 dyuym OLED Super Retina XDR 120Hz",
      "Kamera": "48 MP + 12 MP + 12 MP (5x zoom)",
      "Akkumulyator": "4422 mAh, 20W tezkor zaryad",
      "Kafolat": "1 yil rasmiy"
    },
    wholesalePrice: 13800000,
    piecePrice: 15400000,
    variants: [
      {
        id: "variant-1-256gb",
        name: "256GB",
        sku: "IP15PM-256",
        retailPrice: 15400000,
        wholesalePrice: 13800000,
        usdPrice: 1213,
        eurPrice: 1116,
        stock: 24,
        wholesaleTiers: [
          { minQuantity: 5, price: 13500000 },
          { minQuantity: 10, price: 13200000 },
          { minQuantity: 20, price: 12800000 }
        ]
      },
      {
        id: "variant-1-512gb",
        name: "512GB",
        sku: "IP15PM-512",
        retailPrice: 18200000,
        wholesalePrice: 16400000,
        usdPrice: 1433,
        eurPrice: 1320,
        stock: 15,
        wholesaleTiers: [
          { minQuantity: 5, price: 16000000 },
          { minQuantity: 10, price: 15600000 },
          { minQuantity: 20, price: 15200000 }
        ]
      }
    ],
    reviews: [
      { id: "r1", userId: "u1", userName: "Jasur O.", rating: 5, comment: "Kamera sifati juda yuqori! Yetkazib berish ham tez bo'ldi.", createdAt: "2025-02-10T14:20:00Z" },
      { id: "r2", userId: "u2", userName: "Nodira K.", rating: 5, comment: "Titan korpus juda yengil va qulay ushlanadi. Tavsiya qilaman!", createdAt: "2025-02-12T09:15:00Z" }
    ],
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-2",
    name: "Sony WH-1000XM5 Simsiz Shovqinni Bosuvchi Quloqchinlar",
    description: "Sanoat yetakchisi faol shovqin bekor qilish (ANC), 30 soatlik batareya muddati, kristaldek toza ovoz va ergonomik qulay dizayn.",
    price: 3890000,
    oldPrice: 4600000,
    discount: 15,
    category: "electronics",
    categoryName: "Elektronika",
    images: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1000&q=80"
    ],
    stock: 18,
    rating: 4.8,
    reviewsCount: 92,
    salesCount: 410,
    isFeatured: true,
    isNew: false,
    isActive: true,
    specs: {
      "Ulanish turi": "Bluetooth 5.2 & 3.5mm Jack",
      "Ishlash vaqti": "30 soat (ANC yoqilganda)",
      "Zaryadlash": "USB Type-C (3 daqiqada 3 soat)",
      "Shovqinni pasaytirish": "Industry-leading Dual Chip ANC",
      "Mikrofonlar": "8 ta mikrofon"
    },
    wholesalePrice: 3500000,
    piecePrice: 3890000,
    reviews: [
      { id: "r3", userId: "u3", userName: "Bobur T.", rating: 5, comment: "Samolyotda va ofisda shovqinni umuman yo'qotadi, ovozi ajoyib.", createdAt: "2025-02-05T11:00:00Z" }
    ],
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-3",
    name: "Samsung 55\" Crystal 4K UHD Smart TV (CU7000)",
    description: "Yorqin Crystal UHD ranglar, Tizen OS smart platformasi, HDR10+ qo'llab-quvvatlash va nozik ramkasiz dizayn.",
    price: 5490000,
    oldPrice: 6200000,
    discount: 11,
    category: "appliances",
    categoryName: "Maishiy texnika",
    images: [
      "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=1000&q=80"
    ],
    stock: 9,
    rating: 4.7,
    reviewsCount: 67,
    salesCount: 230,
    isFeatured: true,
    isNew: false,
    isActive: true,
    specs: {
      "Ekran diagonali": "55 dyuym (140 sm)",
      "Ruxsat": "3840 x 2160 (4K UHD)",
      "Smart TV": "Samsung Tizen OS",
      "Ovoz quvvati": "20W Dolby Digital Plus",
      "Ulagichlar": "3x HDMI, 1x USB, LAN, Wi-Fi 5, Bluetooth"
    },
    wholesalePrice: 4940000,
    piecePrice: 5490000,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-4",
    name: "Apple MacBook Air 13.6\" M2 Chip 8/256GB Midnight",
    description: "Yupqa va qudratli noutbuk, M2 protsessori, 18 soat batareya muddati, Liquid Retina ekrani va MagSafe zaryadlash porti.",
    price: 12900000,
    oldPrice: 14500000,
    discount: 11,
    category: "electronics",
    categoryName: "Elektronika",
    images: [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=1000&q=80"
    ],
    stock: 14,
    rating: 4.9,
    reviewsCount: 145,
    salesCount: 380,
    isFeatured: true,
    isNew: true,
    isActive: true,
    specs: {
      "Protsessor": "Apple M2 (8-core CPU, 8-core GPU)",
      "Operativ xotira": "8 GB Unified Memory",
      "Doimiy xotira": "256 GB SSD",
      "Ekran": "13.6\" Liquid Retina 500 nits",
      "Og'irligi": "1.24 kg"
    },
    wholesalePrice: 11600000,
    piecePrice: 12900000,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-5",
    name: "Dyson V15 Detect Simsiz Changyutgich",
    description: "Lazerli chang aniqlash texnologiyasi, LCD ekran, 240 AW kuchli so'rish quvvati va 60 daqiqagacha avtonom ishlash.",
    price: 8900000,
    oldPrice: 9800000,
    discount: 9,
    category: "appliances",
    categoryName: "Maishiy texnika",
    images: [
      "https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=1000&q=80"
    ],
    stock: 11,
    rating: 4.9,
    reviewsCount: 48,
    salesCount: 155,
    isFeatured: false,
    isNew: true,
    isActive: true,
    specs: {
      "So'rish quvvati": "240 AW",
      "Ishlash vaqti": "60 daqiqa",
      "Filtrlash": "99.99% HEPA mikroskopik filtr",
      "Og'irligi": "3.0 kg"
    },
    wholesalePrice: 8000000,
    piecePrice: 8900000,
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-6",
    name: "Nike Air Force 1 '07 Classic Erkaklar Krossovkasi",
    description: "Afsonaviy charm dizayn, qulay havo yostig'i (Air Cushioning), har kungi kiyish uchun ideal va chidamli poyabzal.",
    price: 1350000,
    oldPrice: 1650000,
    discount: 18,
    category: "fashion",
    categoryName: "Kiyim & Poyabzal",
    images: [
      "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=1000&q=80"
    ],
    stock: 35,
    rating: 4.8,
    reviewsCount: 210,
    salesCount: 890,
    isFeatured: true,
    isNew: false,
    isActive: true,
    specs: {
      "Material": "100% Tabiiy charm",
      "Taglik": "Vulkanizatsiyalangan elastik rezina",
      "Mavsum": "Barcha fasllar",
      "Ishlab chiqarilgan": "Vetnam"
    },
    wholesalePrice: 1200000,
    piecePrice: 1350000,
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-7",
    name: "Zara Erkaklar Premium Oversize Paxta Xudi",
    description: "100% premium zich paxta matosidan tikilgan, qulay kapyushonli va zamonaviy oversize fasonli xudi.",
    price: 490000,
    oldPrice: 650000,
    discount: 25,
    category: "fashion",
    categoryName: "Kiyim & Poyabzal",
    images: [
      "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1000&q=80"
    ],
    stock: 40,
    rating: 4.6,
    reviewsCount: 88,
    salesCount: 420,
    isFeatured: false,
    isNew: true,
    isActive: true,
    specs: {
      "Tarkibi": "100% Premium Organik Paxta",
      "Zichligi": "380 g/m²",
      "Fasl": "Kuz / Bahor / Qish",
      "Ranglar": "Qora, Bej, Grafit"
    },
    wholesalePrice: 440000,
    piecePrice: 490000,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-8",
    name: "Apple Watch Series 9 GPS 45mm Starlight Aluminium",
    description: "S9 SiP chip, Double Tap innovatsion boshqaruvi, doimiy yonuvchi 2000 nits ekran, EKG va qondagi kislorod o'lchagich.",
    price: 5200000,
    oldPrice: 5800000,
    discount: 10,
    category: "accessories",
    categoryName: "Aksessuarlar & Soatlar",
    images: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=1000&q=80"
    ],
    stock: 19,
    rating: 4.9,
    reviewsCount: 112,
    salesCount: 520,
    isFeatured: true,
    isNew: true,
    isActive: true,
    specs: {
      "Korpus": "45 mm alyuminiy",
      "Ekran": "Always-On Retina OLED (2000 nits)",
      "Sensorlar": "Yurak urishi, EKG, SpO2, Harorat",
      "Suvga chidamlilik": "WR50 (50 metrgacha)"
    },
    wholesalePrice: 4700000,
    piecePrice: 5200000,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-9",
    name: "Xiaomi Robot Vacuum S10+ Nam Tozalashli Changyutgich",
    description: "4000 Pa kuchli tortish kuchi, 3D to'siqlarni aylanib o'tish lazer tizimi, 2 ta aylanuvchi nam tozalash mikrofibralari.",
    price: 3650000,
    oldPrice: 4200000,
    discount: 13,
    category: "appliances",
    categoryName: "Maishiy texnika",
    images: [
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=1000&q=80"
    ],
    stock: 15,
    rating: 4.7,
    reviewsCount: 79,
    salesCount: 310,
    isFeatured: false,
    isNew: false,
    isActive: true,
    specs: {
      "Navigatsiya": "LDS Lidar + 3D laser",
      "Tortish kuchi": "4000 Pa",
      "Akkumulyator": "5200 mAh (2 soat tozalash)",
      "Boshqaruv": "Mi Home / Xiaomi Home ilovasi"
    },
    wholesalePrice: 3300000,
    piecePrice: 3650000,
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-10",
    name: "Estée Lauder Advanced Night Repair Zardob 50ml",
    description: "Ajinlarga qarshi va terini chuqur namlantiruvchi afsonaviy tungi tiklovchi elita zardob.",
    price: 1150000,
    oldPrice: 1350000,
    discount: 15,
    category: "beauty",
    categoryName: "Go'zallik & Parvarish",
    images: [
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1608248597359-0d297880946d?auto=format&fit=crop&w=1000&q=80"
    ],
    stock: 22,
    rating: 4.9,
    reviewsCount: 134,
    salesCount: 460,
    isFeatured: true,
    isNew: false,
    isActive: true,
    specs: {
      "Hajmi": "50 ml",
      "Turi": "Tungi tiklovchi sarum",
      "Teringa mosligi": "Barcha turdagi teri uchun",
      "Ishlab chiqarilgan": "AQSH / Fransiya"
    },
    wholesalePrice: 1030000,
    piecePrice: 1150000,
    createdAt: new Date(Date.now() - 18 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-11",
    name: "De'Longhi Magnifica S Avtomatik Qahva Mashinasi",
    description: "Yangi donachalardan xushbo'y espresso va kapuchino tayyorlash tizimi, qo'lda ko'pirtiruvchi kapuchinator.",
    price: 6100000,
    oldPrice: 6900000,
    discount: 12,
    category: "home",
    categoryName: "Uy & Oshxona",
    images: [
      "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1587080413959-06b859fb107d?auto=format&fit=crop&w=1000&q=80"
    ],
    stock: 8,
    rating: 4.8,
    reviewsCount: 61,
    salesCount: 190,
    isFeatured: false,
    isNew: false,
    isActive: true,
    specs: {
      "Bosim": "15 Bar",
      "Suv idishi": "1.8 litr",
      "Don idishi": "250 gramm",
      "Funksiyalar": "Espresso, Lungo, Kapuchino, Issiq suv"
    },
    wholesalePrice: 5500000,
    piecePrice: 6100000,
    createdAt: new Date(Date.now() - 22 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-12",
    name: "Xiaomi Electric Scooter 4 Pro Elektrosamokat",
    description: "55 km masofaga yetuvchi quvvat, 700W maksimal quvvatli motor, 10 dyuymli tubeless g'ildiraklar va disk tormoz.",
    price: 6850000,
    oldPrice: 7600000,
    discount: 10,
    category: "sports",
    categoryName: "Sport & Sayohat",
    images: [
      "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1000&q=80"
    ],
    stock: 12,
    rating: 4.7,
    reviewsCount: 54,
    salesCount: 175,
    isFeatured: true,
    isNew: true,
    isActive: true,
    specs: {
      "Maksimal tezlik": "25 km/soat",
      "Bir zaryadda masofa": "55 km gacha",
      "Maksimal yuk": "120 kg",
      "Tormoz tizimi": "Old e-ABS va orqa ikki diskli tormoz"
    },
    wholesalePrice: 6200000,
    piecePrice: 6850000,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Seed Users
const adminPinHash = hashPin("1234");
const userPinHash = hashPin("1234");

const initialUsers: (User & { pinHash: string; salt: string })[] = [
  {
    id: "user-admin-1",
    firstName: "Admin",
    lastName: "Boshqaruvchi",
    phone: "+998901234567",
    role: "admin",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    addresses: [
      {
        id: "addr-admin-1",
        title: "Bosh Ofis",
        region: "Toshkent shahri",
        district: "Yunusobod tumani",
        street: "Amir Temur shoh ko'chasi",
        house: "107B",
        apartment: "Ofis 402",
        latitude: 41.3385,
        longitude: 69.2855,
        formattedAddress: "Toshkent shahri, Yunusobod tumani, Amir Temur shoh ko'chasi 107B",
        isDefault: true
      }
    ],
    isBlocked: false,
    totalSpent: 42500000,
    ordersCount: 8,
    createdAt: "2025-01-01T00:00:00Z",
    pinHash: adminPinHash.hash,
    salt: adminPinHash.salt
  },
  {
    id: "user-demo-1",
    firstName: "Shahzod",
    lastName: "Qalandarov",
    phone: "+998991234567",
    role: "user",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
    addresses: [
      {
        id: "addr-user-1",
        title: "Uyim",
        region: "Toshkent shahri",
        district: "Mirzo Ulug'bek tumani",
        street: "Buyuk Ipak Yo'li",
        house: "12",
        apartment: "45",
        latitude: 41.3275,
        longitude: 69.3342,
        formattedAddress: "Toshkent shahri, Mirzo Ulug'bek tumani, Buyuk Ipak Yo'li 12",
        isDefault: true
      }
    ],
    isBlocked: false,
    totalSpent: 16750000,
    ordersCount: 3,
    createdAt: "2025-01-15T10:00:00Z",
    pinHash: userPinHash.hash,
    salt: userPinHash.salt
  }
];

// Seed Orders
const initialOrders: Order[] = [
  {
    id: "ord-10291",
    orderNumber: "#ORD-10291",
    userId: "user-demo-1",
    customer: {
      firstName: "Shahzod",
      lastName: "Qalandarov",
      phone: "+998991234567"
    },
    items: [
      {
        productId: "prod-2",
        name: "Sony WH-1000XM5 Simsiz Shovqinni Bosuvchi Quloqchinlar",
        price: 3890000,
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
        quantity: 1,
        categoryName: "Elektronika"
      }
    ],
    subtotal: 3890000,
    deliveryFee: 0,
    total: 3890000,
    deliveryAddress: {
      region: "Toshkent shahri",
      district: "Mirzo Ulug'bek tumani",
      street: "Buyuk Ipak Yo'li",
      house: "12",
      apartment: "45",
      notes: "Eshik kodi: 45k",
      latitude: 41.3275,
      longitude: 69.3342,
      formattedAddress: "Toshkent shahri, Mirzo Ulug'bek tumani, Buyuk Ipak Yo'li 12"
    },
    paymentMethod: "uzum_pay",
    status: "Delivered",
    statusHistory: [
      { status: "Pending", timestamp: "2025-02-10T10:00:00Z" },
      { status: "Confirmed", timestamp: "2025-02-10T10:15:00Z" },
      { status: "Shipped", timestamp: "2025-02-10T14:00:00Z" },
      { status: "Delivered", timestamp: "2025-02-11T12:30:00Z" }
    ],
    createdAt: "2025-02-10T10:00:00Z",
    estimatedDelivery: "2025-02-11"
  },
  {
    id: "ord-10292",
    orderNumber: "#ORD-10292",
    userId: "user-demo-1",
    customer: {
      firstName: "Shahzod",
      lastName: "Qalandarov",
      phone: "+998991234567"
    },
    items: [
      {
        productId: "prod-6",
        name: "Nike Air Force 1 '07 Classic Erkaklar Krossovkasi",
        price: 1350000,
        image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=600&q=80",
        quantity: 1,
        categoryName: "Kiyim & Poyabzal"
      },
      {
        productId: "prod-7",
        name: "Zara Erkaklar Premium Oversize Paxta Xudi",
        price: 490000,
        image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80",
        quantity: 2,
        categoryName: "Kiyim & Poyabzal"
      }
    ],
    subtotal: 2330000,
    deliveryFee: 25000,
    total: 2355000,
    deliveryAddress: {
      region: "Toshkent shahri",
      district: "Mirzo Ulug'bek tumani",
      street: "Buyuk Ipak Yo'li",
      house: "12",
      apartment: "45",
      latitude: 41.3275,
      longitude: 69.3342,
      formattedAddress: "Toshkent shahri, Mirzo Ulug'bek tumani, Buyuk Ipak Yo'li 12"
    },
    paymentMethod: "card",
    status: "Shipped",
    statusHistory: [
      { status: "Pending", timestamp: "2025-02-14T11:00:00Z" },
      { status: "Confirmed", timestamp: "2025-02-14T11:30:00Z" },
      { status: "Preparing", timestamp: "2025-02-14T15:00:00Z" },
      { status: "Shipped", timestamp: "2025-02-15T09:00:00Z" }
    ],
    createdAt: "2025-02-14T11:00:00Z",
    estimatedDelivery: "2025-02-16"
  }
];

// Seed Currencies
const initialCurrencies: Currency[] = [
  {
    id: "currency-usd",
    code: "USD",
    symbol: "$",
    rate: 12700,
    isActive: true
  },
  {
    id: "currency-eur",
    code: "EUR",
    symbol: "€",
    rate: 13800,
    isActive: true
  },
  {
    id: "currency-rub",
    code: "RUB",
    symbol: "₽",
    rate: 140,
    isActive: true
  },
  {
    id: "currency-cny",
    code: "CNY",
    symbol: "¥",
    rate: 1750,
    isActive: true
  }
];

// Initialize DB State
let db: DBState = {
  users: initialUsers,
  products: initialProducts,
  categories: initialCategories,
  orders: initialOrders,
  currencies: initialCurrencies,
  loginAttempts: {}
};

// Load saved data if exists
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      if (data.products && data.categories) {
        db = {
          ...db,
          ...data,
          loginAttempts: {}
        };
      }
    }
  } catch (err) {
    console.error("Error loading DB file, falling back to initial data", err);
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving DB file", err);
  }
}

loadDB();

// Helper: Sanitize user object (remove pinHash and salt)
function sanitizeUser(user: User & { pinHash?: string; salt?: string }): User {
  const { pinHash, salt, ...safeUser } = user;
  return safeUser as User;
}

// Middleware: Authentication
function authMiddleware(req: Request & { user?: { id: string; role: string; phone: string } }, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Kirish talab qilinadi (Token mavjud emas)" });
  }
  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ message: "Yaroqsiz yoki muddati o'tgan token" });
  }
  req.user = payload;
  next();
}

// Middleware: Admin Only
function adminMiddleware(req: Request & { user?: { id: string; role: string; phone: string } }, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Ruxsat yo'q. Faqat administratorlar uchun." });
  }
  next();
}

// ---------------- API ROUTES ----------------

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 1. Auth: Register
app.post("/api/auth/register", (req, res) => {
  const { firstName, lastName, phone, pin } = req.body;

  if (!firstName || !lastName || !phone || !pin) {
    return res.status(400).json({ message: "Barcha maydonlarni to'ldiring (Ism, Familiya, Telefon, PIN)" });
  }

  // Normalize phone
  const cleanPhone = phone.trim().replace(/[^\d+]/g, "");
  if (cleanPhone.length < 9) {
    return res.status(400).json({ message: "Telefon raqami noto'g'ri kiritildi" });
  }

  // Validate 4-digit PIN
  if (!/^\d{4}$/.test(pin.toString().trim())) {
    return res.status(400).json({ message: "PIN-kod aynan 4 ta raqamdan iborat bo'lishi kerak" });
  }

  // Check duplicate
  const existingUser = db.users.find(u => u.phone === cleanPhone);
  if (existingUser) {
    return res.status(409).json({ message: "Bu telefon raqami bilan foydalanuvchi allaqachon mavjud. Iltimos, tizimga kiring." });
  }

  const { hash, salt } = hashPin(pin.toString().trim());
  const newUser: User & { pinHash: string; salt: string } = {
    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    phone: cleanPhone,
    role: "user",
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(firstName + " " + lastName)}&backgroundColor=7000ff`,
    addresses: [],
    isBlocked: false,
    totalSpent: 0,
    ordersCount: 0,
    createdAt: new Date().toISOString(),
    pinHash: hash,
    salt
  };

  db.users.push(newUser);
  saveDB();

  const token = generateToken({ id: newUser.id, role: newUser.role, phone: newUser.phone });
  return res.status(201).json({
    user: sanitizeUser(newUser),
    token,
    message: "Muvaffaqiyatli ro'yxatdan o'tdingiz"
  });
});

// 2. Auth: Login with Rate Limiting (Brute-force protection for 4-digit PIN)
app.post("/api/auth/login", (req, res) => {
  const { phone, pin } = req.body;

  if (!phone || !pin) {
    return res.status(400).json({ message: "Telefon raqam va PIN-kodni kiriting" });
  }

  const cleanPhone = phone.trim().replace(/[^\d+]/g, "");

  // Rate Limiting Check
  const attemptInfo = db.loginAttempts[cleanPhone];
  if (attemptInfo && attemptInfo.lockUntil && attemptInfo.lockUntil > Date.now()) {
    const remainingSeconds = Math.ceil((attemptInfo.lockUntil - Date.now()) / 1000);
    return res.status(429).json({
      message: `Xavfsizlik choralari: Ko'p marta xato kiritildi. Iltimos, ${remainingSeconds} soniyadan keyin qayta urinib ko'ring.`
    });
  }

  const user = db.users.find(u => u.phone === cleanPhone);
  if (!user) {
    return res.status(401).json({ message: "Bunday telefon raqamli foydalanuvchi topilmadi" });
  }

  if (user.isBlocked) {
    return res.status(403).json({ message: "Hisobingiz bloklangan. Qo'llab-quvvatlash xizmati bilan bog'laning." });
  }

  const { hash } = hashPin(pin.toString().trim(), user.salt);
  if (hash !== user.pinHash) {
    // Record failed attempt
    const currentAttempts = (attemptInfo?.attempts || 0) + 1;
    if (currentAttempts >= 5) {
      db.loginAttempts[cleanPhone] = {
        attempts: 0,
        lockUntil: Date.now() + 5 * 60 * 1000 // Lock for 5 minutes
      };
      return res.status(429).json({
        message: "5 marta xato PIN kiritildi. Hisob 5 daqiqaga vaqtincha bloklandi."
      });
    } else {
      db.loginAttempts[cleanPhone] = { attempts: currentAttempts };
      return res.status(401).json({
        message: `Noto'g'ri PIN-kod. Qolgan urinishlar: ${5 - currentAttempts}`
      });
    }
  }

  // Clear attempts on success
  delete db.loginAttempts[cleanPhone];

  const token = generateToken({ id: user.id, role: user.role, phone: user.phone });
  return res.json({
    user: sanitizeUser(user),
    token,
    message: "Tizimga muvaffaqiyatli kirdingiz"
  });
});

// 3. Auth: Me
app.get("/api/auth/me", authMiddleware, (req: Request & { user?: { id: string } }, res: Response) => {
  const user = db.users.find(u => u.id === req.user?.id);
  if (!user) {
    return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
  }
  return res.json(sanitizeUser(user));
});

// 4. Auth: Update Profile
app.put("/api/auth/profile", authMiddleware, (req: Request & { user?: { id: string } }, res: Response) => {
  const user = db.users.find(u => u.id === req.user?.id);
  if (!user) return res.status(404).json({ message: "Foydalanuvchi topilmadi" });

  const { firstName, lastName, avatar } = req.body;
  if (firstName) user.firstName = firstName.trim();
  if (lastName) user.lastName = lastName.trim();
  if (avatar) user.avatar = avatar;

  saveDB();
  return res.json(sanitizeUser(user));
});

// 5. Auth: Add / Save Address
app.post("/api/auth/addresses", authMiddleware, (req: Request & { user?: { id: string } }, res: Response) => {
  const user = db.users.find(u => u.id === req.user?.id);
  if (!user) return res.status(404).json({ message: "Foydalanuvchi topilmadi" });

  const { title, region, district, street, house, apartment, notes, latitude, longitude, formattedAddress, isDefault } = req.body;

  if (!region || !street) {
    return res.status(400).json({ message: "Manzil ma'lumotlarini to'liq kiriting" });
  }

  if (isDefault) {
    user.addresses.forEach(a => a.isDefault = false);
  }

  const newAddress = {
    id: `addr-${Date.now()}`,
    title: title || "Manzilim",
    region,
    district: district || "",
    street,
    house: house || "",
    apartment: apartment || "",
    notes: notes || "",
    latitude: latitude ? Number(latitude) : undefined,
    longitude: longitude ? Number(longitude) : undefined,
    formattedAddress: formattedAddress || `${region}, ${district} ${street} ${house}`.trim(),
    isDefault: isDefault || user.addresses.length === 0
  };

  user.addresses.push(newAddress);
  saveDB();
  return res.status(201).json(sanitizeUser(user));
});

// 6. Auth: Delete Address
app.delete("/api/auth/addresses/:id", authMiddleware, (req: Request & { user?: { id: string } }, res: Response) => {
  const user = db.users.find(u => u.id === req.user?.id);
  if (!user) return res.status(404).json({ message: "Foydalanuvchi topilmadi" });

  user.addresses = user.addresses.filter(a => a.id !== req.params.id);
  saveDB();
  return res.json(sanitizeUser(user));
});

// 7. Categories: Get All
app.get("/api/categories", (req, res) => {
  // calculate dynamic counts
  const categoriesWithCounts = db.categories.map(cat => ({
    ...cat,
    productCount: db.products.filter(p => p.isActive && (p.category === cat.slug || p.category === cat.id)).length
  }));
  res.json(categoriesWithCounts);
});

// 8. Categories: Create (Admin)
app.post("/api/categories", authMiddleware, adminMiddleware, (req, res) => {
  const { name, slug, iconName, image } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ message: "Kategoriya nomi va slug talab qilinadi" });
  }
  const newCat: Category = {
    id: `cat-${Date.now()}`,
    name,
    slug: slug.toLowerCase().replace(/\s+/g, "-"),
    iconName: iconName || "Folder",
    image: image || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
    isActive: true,
    productCount: 0
  };
  db.categories.push(newCat);
  saveDB();
  res.status(201).json(newCat);
});

// 9. Categories: Update (Admin)
app.put("/api/categories/:id", authMiddleware, adminMiddleware, (req, res) => {
  const cat = db.categories.find(c => c.id === req.params.id);
  if (!cat) return res.status(404).json({ message: "Kategoriya topilmadi" });

  const { name, slug, iconName, image, isActive } = req.body;
  if (name) cat.name = name;
  if (slug) cat.slug = slug.toLowerCase().replace(/\s+/g, "-");
  if (iconName) cat.iconName = iconName;
  if (image) cat.image = image;
  if (typeof isActive === "boolean") cat.isActive = isActive;

  saveDB();
  res.json(cat);
});

// 10. Categories: Delete (Admin)
app.delete("/api/categories/:id", authMiddleware, adminMiddleware, (req, res) => {
  const index = db.categories.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: "Kategoriya topilmadi" });
  db.categories.splice(index, 1);
  saveDB();
  res.json({ message: "Kategoriya muvaffaqiyatli o'chirildi" });
});

// 11. Products: Query with Search, Filters, Sorting & Pagination
app.get("/api/products", (req, res) => {
  const {
    q,
    category,
    minPrice,
    maxPrice,
    rating,
    discountOnly,
    inStock,
    isFeatured,
    isNew,
    sort = "popular",
    page = "1",
    limit = "20"
  } = req.query;

  let filtered = [...db.products];

  // Only active products for regular users, unless admin flag
  if (req.query.includeInactive !== "true") {
    filtered = filtered.filter(p => p.isActive !== false);
  }

  // Search by query (name, description, specs)
  if (q && typeof q === "string") {
    const searchTerms = q.toLowerCase().trim().split(/\s+/);
    filtered = filtered.filter(p => {
      const targetText = `${p.name} ${p.description} ${p.categoryName} ${Object.values(p.specs || {}).join(" ")}`.toLowerCase();
      return searchTerms.every(term => targetText.includes(term));
    });
  }

  // Filter by category
  if (category && typeof category === "string" && category !== "all") {
    filtered = filtered.filter(p => p.category === category || p.categoryName?.toLowerCase() === category.toLowerCase());
  }

  // Price filters
  if (minPrice) {
    const min = Number(minPrice);
    if (!isNaN(min)) filtered = filtered.filter(p => p.price >= min);
  }
  if (maxPrice) {
    const max = Number(maxPrice);
    if (!isNaN(max)) filtered = filtered.filter(p => p.price <= max);
  }

  // Rating filter
  if (rating) {
    const minRating = Number(rating);
    if (!isNaN(minRating)) filtered = filtered.filter(p => p.rating >= minRating);
  }

  // Discount only
  if (discountOnly === "true") {
    filtered = filtered.filter(p => (p.discount && p.discount > 0) || (p.oldPrice && p.oldPrice > p.price));
  }

  // In Stock
  if (inStock === "true") {
    filtered = filtered.filter(p => p.stock > 0);
  }

  // Featured
  if (isFeatured === "true") {
    filtered = filtered.filter(p => p.isFeatured);
  }

  // New
  if (isNew === "true") {
    filtered = filtered.filter(p => p.isNew);
  }

  // Sorting
  if (sort === "price_asc") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sort === "price_desc") {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sort === "newest") {
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (sort === "rating") {
    filtered.sort((a, b) => b.rating - a.rating);
  } else {
    // Popular
    filtered.sort((a, b) => b.salesCount - a.salesCount);
  }

  const total = filtered.length;
  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 20;
  const startIndex = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(startIndex, startIndex + limitNum);

  res.json({
    products: paginated,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1
  });
});

// 12. Products: Get by ID + Related
app.get("/api/products/:id", (req, res) => {
  const product = db.products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ message: "Mahsulot topilmadi" });
  }

  const related = db.products
    .filter(p => p.id !== product.id && p.category === product.category && p.isActive)
    .slice(0, 6);

  res.json({ product, related });
});

// 13. Products: Create (Admin)
app.post("/api/products", authMiddleware, adminMiddleware, (req, res) => {
  const { name, description, price, oldPrice, discount, category, images, stock, specs, isFeatured, isNew } = req.body;

  if (!name || !price || !category) {
    return res.status(400).json({ message: "Mahsulot nomi, narxi va kategoriyasi majburiy" });
  }

  const catObj = db.categories.find(c => c.slug === category || c.id === category);
  const categoryName = catObj ? catObj.name : category;

  const newProduct: Product = {
    id: `prod-${Date.now()}`,
    name: name.trim(),
    description: description || "",
    price: Number(price),
    oldPrice: oldPrice ? Number(oldPrice) : undefined,
    discount: discount ? Number(discount) : (oldPrice && Number(oldPrice) > Number(price) ? Math.round(((Number(oldPrice) - Number(price)) / Number(oldPrice)) * 100) : 0),
    category,
    categoryName,
    images: Array.isArray(images) && images.length > 0 ? images : ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80"],
    stock: stock !== undefined ? Number(stock) : 10,
    rating: 5.0,
    reviewsCount: 0,
    salesCount: 0,
    isFeatured: Boolean(isFeatured),
    isNew: isNew !== undefined ? Boolean(isNew) : true,
    isActive: true,
    specs: specs || {},
    reviews: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.products.unshift(newProduct);
  saveDB();
  res.status(201).json(newProduct);
});

// 14. Products: Update (Admin)
app.put("/api/products/:id", authMiddleware, adminMiddleware, (req, res) => {
  const product = db.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ message: "Mahsulot topilmadi" });

  const { name, description, price, oldPrice, discount, category, images, stock, specs, isFeatured, isNew, isActive } = req.body;

  if (name) product.name = name.trim();
  if (description !== undefined) product.description = description;
  if (price !== undefined) product.price = Number(price);
  if (oldPrice !== undefined) product.oldPrice = oldPrice ? Number(oldPrice) : undefined;
  if (discount !== undefined) product.discount = Number(discount);
  if (category) {
    product.category = category;
    const catObj = db.categories.find(c => c.slug === category || c.id === category);
    if (catObj) product.categoryName = catObj.name;
  }
  if (Array.isArray(images)) product.images = images;
  if (stock !== undefined) product.stock = Number(stock);
  if (specs !== undefined) product.specs = specs;
  if (isFeatured !== undefined) product.isFeatured = Boolean(isFeatured);
  if (isNew !== undefined) product.isNew = Boolean(isNew);
  if (isActive !== undefined) product.isActive = Boolean(isActive);
  product.updatedAt = new Date().toISOString();

  saveDB();
  res.json(product);
});

// 15. Products: Delete (Admin)
app.delete("/api/products/:id", authMiddleware, adminMiddleware, (req, res) => {
  const index = db.products.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: "Mahsulot topilmadi" });
  db.products.splice(index, 1);
  saveDB();
  res.json({ message: "Mahsulot muvaffaqiyatli o'chirildi" });
});

// 16. Products: Add Review
app.post("/api/products/:id/reviews", authMiddleware, (req: Request & { user?: { id: string } }, res: Response) => {
  const product = db.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ message: "Mahsulot topilmadi" });

  const user = db.users.find(u => u.id === req.user?.id);
  const { rating, comment } = req.body;

  if (!rating || !comment) {
    return res.status(400).json({ message: "Reyting va sharh matnini kiriting" });
  }

  const newReview: ProductReview = {
    id: `rev-${Date.now()}`,
    userId: user ? user.id : "guest",
    userName: user ? `${user.firstName} ${user.lastName[0]}.` : "Xaridor",
    rating: Math.min(5, Math.max(1, Number(rating))),
    comment: comment.trim(),
    createdAt: new Date().toISOString()
  };

  if (!product.reviews) product.reviews = [];
  product.reviews.unshift(newReview);
  product.reviewsCount = product.reviews.length;
  const avg = product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length;
  product.rating = Number(avg.toFixed(1));

  saveDB();
  res.status(201).json({ review: newReview, rating: product.rating, reviewsCount: product.reviewsCount });
});

// 17. Orders: Create Order
app.post("/api/orders", (req, res) => {
  const authHeader = req.headers.authorization;
  let loggedInUser: (User & { pinHash: string; salt: string }) | undefined;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const payload = verifyToken(authHeader.split(" ")[1]);
    if (payload) {
      loggedInUser = db.users.find(u => u.id === payload.id);
    }
  }

  const { customer, items, deliveryAddress, paymentMethod } = req.body;

  if (!customer || !customer.firstName || !customer.phone) {
    return res.status(400).json({ message: "Mijoz ma'lumotlari (Ism, Telefon) to'liq emas" });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Savat bo'sh, mahsulot qo'shing" });
  }

  if (!deliveryAddress || !deliveryAddress.region || !deliveryAddress.street) {
    return res.status(400).json({ message: "Yetkazib berish manzilini to'liq kiriting" });
  }

  // Calculate order items & check stock
  let subtotal = 0;
  const validatedItems = items.map((item: { productId: string; quantity: number }) => {
    const prod = db.products.find(p => p.id === item.productId);
    if (!prod) {
      throw new Error(`Mahsulot topilmadi: ${item.productId}`);
    }
    const qty = Math.max(1, item.quantity || 1);
    if (prod.stock < qty) {
      throw new Error(`"${prod.name}" uchun omborda yetarli qoldiq yo'q (Mavjud: ${prod.stock} dona)`);
    }

    // Deduct stock and increment sales
    prod.stock -= qty;
    prod.salesCount += qty;

    const itemTotal = prod.price * qty;
    subtotal += itemTotal;

    return {
      productId: prod.id,
      name: prod.name,
      price: prod.price,
      image: prod.images[0] || "",
      quantity: qty,
      categoryName: prod.categoryName
    };
  });

  const deliveryFee = subtotal >= 500000 ? 0 : 25000;
  const total = subtotal + deliveryFee;

  const orderNum = `#ORD-${Math.floor(10000 + Math.random() * 90000)}`;
  const newOrder: Order = {
    id: `ord-${Date.now()}`,
    orderNumber: orderNum,
    userId: loggedInUser ? loggedInUser.id : undefined,
    customer: {
      firstName: customer.firstName.trim(),
      lastName: customer.lastName ? customer.lastName.trim() : "",
      phone: customer.phone.trim()
    },
    items: validatedItems,
    subtotal,
    deliveryFee,
    total,
    deliveryAddress: {
      region: deliveryAddress.region,
      district: deliveryAddress.district || "",
      street: deliveryAddress.street,
      house: deliveryAddress.house || "",
      apartment: deliveryAddress.apartment || "",
      notes: deliveryAddress.notes || "",
      latitude: deliveryAddress.latitude ? Number(deliveryAddress.latitude) : undefined,
      longitude: deliveryAddress.longitude ? Number(deliveryAddress.longitude) : undefined,
      formattedAddress: deliveryAddress.formattedAddress || `${deliveryAddress.region}, ${deliveryAddress.street} ${deliveryAddress.house || ""}`.trim()
    },
    paymentMethod: paymentMethod || "uzum_pay",
    status: "Pending",
    statusHistory: [
      {
        status: "Pending",
        timestamp: new Date().toISOString(),
        note: "Buyurtma qabul qilindi va tasdiqlash kutilmoqda"
      }
    ],
    createdAt: new Date().toISOString(),
    estimatedDelivery: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split("T")[0]
  };

  // Update user stats
  if (loggedInUser) {
    loggedInUser.ordersCount += 1;
    loggedInUser.totalSpent += total;
  }

  db.orders.unshift(newOrder);
  saveDB();

  res.status(201).json({
    order: newOrder,
    message: "Buyurtmangiz muvaffaqiyatli qabul qilindi!"
  });
});

// 18. Orders: Get All / User Orders
app.get("/api/orders", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Kirish talab qilinadi" });
  }

  const payload = verifyToken(authHeader.split(" ")[1]);
  if (!payload) {
    return res.status(401).json({ message: "Yaroqsiz token" });
  }

  if (payload.role === "admin") {
    // Admin sees all orders
    return res.json(db.orders);
  } else {
    // Regular user sees only their own orders or matching phone
    const userOrders = db.orders.filter(o => o.userId === payload.id || o.customer.phone === payload.phone);
    return res.json(userOrders);
  }
});

// 19. Orders: Get Single Order
app.get("/api/orders/:id", (req, res) => {
  const order = db.orders.find(o => o.id === req.params.id || o.orderNumber === req.params.id);
  if (!order) {
    return res.status(404).json({ message: "Buyurtma topilmadi" });
  }
  res.json(order);
});

// 20. Orders: Update Status (Admin)
app.put("/api/orders/:id/status", authMiddleware, adminMiddleware, (req, res) => {
  const order = db.orders.find(o => o.id === req.params.id || o.orderNumber === req.params.id);
  if (!order) return res.status(404).json({ message: "Buyurtma topilmadi" });

  const { status, note } = req.body as { status: OrderStatus; note?: string };
  const validStatuses: OrderStatus[] = ["Pending", "Confirmed", "Preparing", "Shipped", "Delivered", "Cancelled"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Noto'g'ri status" });
  }

  order.status = status;
  if (!order.statusHistory) order.statusHistory = [];
  order.statusHistory.push({
    status,
    timestamp: new Date().toISOString(),
    note: note || `Status ${status} holatiga o'zgartirildi`
  });

  saveDB();
  res.json(order);
});

// 21. Admin: Dashboard Stats
app.get("/api/admin/stats", authMiddleware, adminMiddleware, (req, res) => {
  const totalOrders = db.orders.length;
  const todayStr = new Date().toISOString().split("T")[0];
  const todayOrders = db.orders.filter(o => o.createdAt.startsWith(todayStr)).length;
  const totalUsers = db.users.filter(u => u.role === "user").length;
  const totalProducts = db.products.length;

  const totalRevenue = db.orders
    .filter(o => o.status !== "Cancelled")
    .reduce((sum, o) => sum + o.total, 0);

  const pendingOrders = db.orders.filter(o => o.status === "Pending").length;
  const deliveredOrders = db.orders.filter(o => o.status === "Delivered").length;
  const cancelledOrders = db.orders.filter(o => o.status === "Cancelled").length;

  // 7-day Sales Trend
  const salesTrendMap: Record<string, { amount: number; ordersCount: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split("T")[0];
    salesTrendMap[dStr] = { amount: 0, ordersCount: 0 };
  }

  db.orders.forEach(o => {
    const dStr = o.createdAt.split("T")[0];
    if (salesTrendMap[dStr] && o.status !== "Cancelled") {
      salesTrendMap[dStr].amount += o.total;
      salesTrendMap[dStr].ordersCount += 1;
    }
  });

  const salesTrend = Object.entries(salesTrendMap).map(([date, data]) => ({
    date,
    amount: data.amount,
    ordersCount: data.ordersCount
  }));

  const topProducts = [...db.products]
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      name: p.name,
      salesCount: p.salesCount,
      revenue: p.salesCount * p.price,
      image: p.images[0] || ""
    }));

  const stats: AdminStats = {
    totalOrders,
    todayOrders,
    totalUsers,
    totalProducts,
    totalRevenue,
    pendingOrders,
    deliveredOrders,
    cancelledOrders,
    salesTrend,
    topProducts,
    recentOrders: db.orders.slice(0, 8)
  };

  res.json(stats);
});

// 22. Currencies: Get All
app.get("/api/currencies", (req, res) => {
  res.json(db.currencies);
});

// 23. Currencies: Update Rate (Admin)
app.put("/api/currencies/:id", authMiddleware, adminMiddleware, (req, res) => {
  const currency = db.currencies.find(c => c.id === req.params.id);
  if (!currency) return res.status(404).json({ message: "Valyuta topilmadi" });

  const { rate, isActive } = req.body;
  if (rate !== undefined) currency.rate = Number(rate);
  if (typeof isActive === "boolean") currency.isActive = isActive;

  saveDB();
  res.json(currency);
});

// 24. Admin: User Management
app.get("/api/admin/users", authMiddleware, adminMiddleware, (req, res) => {
  const sanitizedUsers = db.users.map(u => sanitizeUser(u));
  res.json(sanitizedUsers);
});

// 23. Admin: Block / Unblock User
app.put("/api/admin/users/:id/block", authMiddleware, adminMiddleware, (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: "Foydalanuvchi topilmadi" });

  if (user.role === "admin") {
    return res.status(400).json({ message: "Administrator hisobini bloklab bo'lmaydi" });
  }

  user.isBlocked = !user.isBlocked;
  saveDB();
  res.json({ user: sanitizeUser(user), message: user.isBlocked ? "Foydalanuvchi bloklandi" : "Foydalanuvchi blokdan chiqarildi" });
});

// ---------------- VITE & STATIC SERVING ----------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Zamon Market Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
