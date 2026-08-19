import express, { Request, Response, NextFunction } from "express";
import path from "path";
import crypto from "crypto";
import compression from "compression";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { uploadToR2, generateFileName } from './src/lib/r2';
import { fetchCbuRates } from './src/lib/exchangeRates';
import { sendOrderNotification, sendReviewNotification } from './src/lib/telegram';
import multer from 'multer';
import type { User, Product, Category, Order, AdminStats, OrderStatus, ProductReview, Currency } from "./src/types";
import { calculateDeliveryFee } from "./src/lib/pricing";

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ 
  connectionString,
  ssl: connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1')
    ? { rejectUnauthorized: false }
    : undefined
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// USD/EUR/RUB/CNY kurslarini O'zbekiston Markaziy banki (CBU)'ning rasmiy
// API'sidan sinxronlaydi, shunda saytda ko'rsatiladigan narxlar har doim
// haqiqiy, joriy kursga mos keladi (admin tomonidan qo'lda kiritilgan
// eskirgan raqamlar emas). CBU vaqtincha ishlamay qolsa ham, oxirgi
// muvaffaqiyatli olingan kurs bazada saqlanib qoladi — narxlar hech qachon
// 0 yoki noto'g'ri qiymatga tushib qolmaydi.
const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', RUB: '₽', CNY: '¥' };
const SUPPORTED_CURRENCY_CODES = ['USD', 'EUR', 'RUB', 'CNY'];

async function syncCurrencyRates(): Promise<{ updated: string[]; failed: boolean }> {
  try {
    const rates = await fetchCbuRates();
    const updated: string[] = [];

    for (const code of SUPPORTED_CURRENCY_CODES) {
      const rate = rates[code];
      if (!rate || !isFinite(rate) || rate <= 0) continue;

      await prisma.currency.upsert({
        where: { code },
        update: { rate, source: 'cbu' },
        create: { code, symbol: CURRENCY_SYMBOLS[code] || code, rate, isActive: true, source: 'cbu' },
      });
      updated.push(code);
    }

    console.log(`✅ Valyuta kurslari CBU'dan yangilandi (${updated.join(', ')}) — ${new Date().toISOString()}`);
    return { updated, failed: false };
  } catch (error) {
    console.error('❌ CBU dan valyuta kursini olishda xatolik, oxirgi ma\'lum kurslar saqlanadi:', error);
    return { updated: [], failed: true };
  }
}

// Server ishga tushganda darhol, so'ngra har 6 soatda bir marta sinxronlaydi.
syncCurrencyRates();
setInterval(syncCurrencyRates, 6 * 60 * 60 * 1000);

const app = express();
// Render (and most PaaS hosts) sit behind a reverse proxy — without this, req.ip
// resolves to the proxy's address for every visitor, which would make the admin-login
// rate limiter below share one bucket across all users instead of one per real client.
app.set('trust proxy', 1);
// Gzip/Brotli every text response (HTML, CSS, JS, JSON API). Was completely missing —
// meaning every page load and every /api/products call was sent uncompressed. This
// alone typically cuts JS/CSS/JSON transfer size by 60-80%, which matters most on the
// mobile connections most customers are actually using.
app.use(compression());

// Prisma stores firstName/lastName/phone as flat columns on Order, but the
// frontend (and the Order type) expects a nested `customer` object. This
// normalizes any Prisma order row (or array of rows) into that shape so
// every endpoint that returns orders is consistent.
function mapOrder(order: any) {
  if (!order) return order;
  const { firstName, lastName, phone, user, ...rest } = order;
  return {
    ...rest,
    customer: { firstName, lastName, phone },
    ...(user !== undefined ? { user: sanitizeUser(user) } : {}),
  };
}
function mapOrders(orders: any[]) {
  return orders.map(mapOrder);
}

// PBKDF2 hash + salt must never leave the server — with only 10,000 possible
// 4-digit PINs, anyone who obtained a hash+salt pair could brute-force the
// real PIN offline in well under a second. Every response that includes a
// user (or a list of users) must go through this first.
function sanitizeUser(user: any) {
  if (!user) return user;
  const { pinHash, salt, ...safe } = user;
  return safe;
}
function sanitizeUsers(users: any[]) {
  return users.map(sanitizeUser);
}

// Diagnostic endpoint to check DB connection and tables. Admin-only — it used to be
// public and would hand anyone the full table list, whether JWT_SECRET/ADMIN_PIN are
// set, and raw error stack traces, which is exactly what an attacker probing the site
// would want to see first.
app.get("/api/db-diagnose", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await prisma.$connect();
    const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`;
    res.json({ 
      status: "connected", 
      message: "Database connected successfully!", 
      tables,
      env: {
        hasDbUrl: !!process.env.DATABASE_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasAdminPin: !!process.env.ADMIN_PIN
      }
    });
  } catch (err: any) {
    console.error("DB Diagnose Error:", err);
    res.status(500).json({ 
      status: "failed", 
      message: err.message, 
      code: err.code,
      stack: err.stack 
    });
  }
});

const PORT = process.env.PORT || 3000;
if (!process.env.JWT_SECRET) {
  console.error("CRITICAL: JWT_SECRET environment variable is missing.");
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

// Rate limiting
const loginAttempts: Record<string, { attempts: number; lockUntil?: number }> = {};

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Utility: Hash PIN using crypto PBKDF2
function hashPin(pin: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(pin, generatedSalt, 1000, 64, "sha512").toString("hex");
  return { hash, salt: generatedSalt };
}

function sanitizeProductData(data: any) {
  const sanitized: any = {};
  const allowedKeys = [
    "name",
    "description",
    "price",
    "oldPrice",
    "discount",
    "categorySlug",
    "categoryName",
    "images",
    "stock",
    "rating",
    "reviewsCount",
    "salesCount",
    "isFeatured",
    "isNew",
    "isActive",
    "specs",
    "wholesalePrice",
    "piecePrice",
    "wholesaleMinQty",
  ];

  allowedKeys.forEach((key) => {
    if (data[key] !== undefined) {
      sanitized[key] = data[key];
    }
  });

  // Type casts
  if (sanitized.price !== undefined) sanitized.price = Math.round(Number(sanitized.price));
  if (sanitized.oldPrice !== undefined) sanitized.oldPrice = Math.round(Number(sanitized.oldPrice));
  if (sanitized.discount !== undefined) sanitized.discount = Math.round(Number(sanitized.discount));
  if (sanitized.stock !== undefined) sanitized.stock = Math.round(Number(sanitized.stock));
  if (sanitized.rating !== undefined) sanitized.rating = Number(sanitized.rating);
  if (sanitized.reviewsCount !== undefined) sanitized.reviewsCount = Math.round(Number(sanitized.reviewsCount));
  if (sanitized.salesCount !== undefined) sanitized.salesCount = Math.round(Number(sanitized.salesCount));
  if (sanitized.wholesalePrice !== undefined) sanitized.wholesalePrice = Math.round(Number(sanitized.wholesalePrice));
  if (sanitized.piecePrice !== undefined) sanitized.piecePrice = Math.round(Number(sanitized.piecePrice));
  if (sanitized.wholesaleMinQty !== undefined) {
    sanitized.wholesaleMinQty = sanitized.wholesaleMinQty === null || sanitized.wholesaleMinQty === ''
      ? null
      : Math.round(Number(sanitized.wholesaleMinQty));
  }

  return sanitized;
}

// Optom narx qachon qo'llanishini hal qiluvchi yagona joy — bu yerdagi
// mantiq buzilsa, butun sayt bo'ylab (savat, checkout, buyurtma) narx
// noto'g'ri hisoblanadi, shuning uchun frontend va backend shu bir xil
// qoidaga amal qiladi: admin belgilagan minimal dona sonidan kam bo'lmasa
// va optom narx haqiqatan ham belgilangan bo'lsa — optom narx ishlatiladi.
function getUnitPrice(product: { price: number; piecePrice?: number | null; wholesalePrice?: number | null; wholesaleMinQty?: number | null }, quantity: number): number {
  const piecePrice = product.piecePrice || product.price;
  const hasWholesale = !!product.wholesalePrice && !!product.wholesaleMinQty && product.wholesaleMinQty > 0;
  if (hasWholesale && quantity >= (product.wholesaleMinQty as number)) {
    return product.wholesalePrice as number;
  }
  return piecePrice;
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

// Middleware: Auth check
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid token" });
  }
  (req as any).user = decoded;
  next();
}

// Middleware: Admin check
function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// Middleware: identifies the user if a valid token is sent, but never
// blocks the request — used for endpoints like checkout that must work
// for both guests and logged-in users, while still tying the order to
// the account when one exists.
function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const decoded = verifyToken(authHeader.substring(7));
    if (decoded) (req as any).user = decoded;
  }
  next();
}

// API: Categories
app.get("/api/categories", async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    res.json(categories.map((c) => ({ ...c, productCount: c._count.products, _count: undefined })));
  } catch (error) {
    console.error("Categories fetch error:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// API: Products
app.get("/api/products", async (req, res) => {
  try {
    const { category, search, limit = 50, page = 1, sort = "new" } = req.query;
    const where: any = { isActive: true };
    
    if (category && category !== "all") {
      where.categorySlug = category;
    }
    
    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' };
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    else if (sort === 'price_desc') orderBy = { price: 'desc' };
    else if (sort === 'rating') orderBy = { rating: 'desc' };
    else if (sort === 'popular') orderBy = { salesCount: 'desc' };

    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { variants: true },
        take,
        skip,
        orderBy
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      products,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / take) || 1
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        variants: true,
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const related = await prisma.product.findMany({
      where: {
        categorySlug: product.categorySlug,
        id: { not: product.id },
        isActive: true
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    res.json({ product, related });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

app.post("/api/products", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { variants, ...rest } = req.body;
    const sanitizedProduct = sanitizeProductData(rest);

    // Majburiy maydonlar yo'q bo'lsa, avval bu Prisma'ning ichki
    // validatsiya xatosiga borib, tushunarsiz 500 bilan qulardi. Endi admin
    // aniq nima yetishmayotganini ko'radi.
    const required = ["name", "price", "categorySlug", "categoryName"];
    const missing = required.filter((key) => sanitizedProduct[key] === undefined || sanitizedProduct[key] === "");
    if (missing.length > 0) {
      return res.status(400).json({ error: `Majburiy maydonlar to'ldirilmagan: ${missing.join(", ")}` });
    }

    const product = await prisma.product.create({
      data: {
        ...sanitizedProduct,
        variants: variants && Array.isArray(variants) ? {
          create: variants.map((v: any) => ({
            name: v.name,
            sku: v.sku || `SKU-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            retailPrice: Math.round(Number(v.retailPrice || v.price || 0)),
            wholesalePrice: Math.round(Number(v.wholesalePrice || v.price || 0)),
            usdPrice: v.usdPrice ? Number(v.usdPrice) : null,
            eurPrice: v.eurPrice ? Number(v.eurPrice) : null,
            stock: Math.round(Number(v.stock || 0)),
            wholesaleTiers: v.wholesaleTiers || [],
          }))
        } : undefined
      },
      include: { variants: true },
    });
    res.json(product);
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

app.put("/api/products/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { variants, ...rest } = req.body;
    const sanitizedProduct = sanitizeProductData(rest);

    const product = await prisma.$transaction(async (tx) => {
      if (variants && Array.isArray(variants)) {
        await tx.productVariant.deleteMany({
          where: { productId: req.params.id }
        });
      }

      return await tx.product.update({
        where: { id: req.params.id },
        data: {
          ...sanitizedProduct,
          variants: variants && Array.isArray(variants) ? {
            create: variants.map((v: any) => ({
              name: v.name,
              sku: v.sku || `SKU-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              retailPrice: Math.round(Number(v.retailPrice || v.price || 0)),
              wholesalePrice: Math.round(Number(v.wholesalePrice || v.price || 0)),
              usdPrice: v.usdPrice ? Number(v.usdPrice) : null,
              eurPrice: v.eurPrice ? Number(v.eurPrice) : null,
              stock: Math.round(Number(v.stock || 0)),
              wholesaleTiers: v.wholesaleTiers || [],
            }))
          } : undefined
        },
        include: { variants: true }
      });
    });

    res.json(product);
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
});

app.delete("/api/products/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await prisma.product.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// API: Image Upload
app.post("/api/upload", authMiddleware, adminMiddleware, upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileName = generateFileName(req.file.originalname);
    const url = await uploadToR2(req.file.buffer, fileName, req.file.mimetype);

    res.json({ url });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// API: Review Image Upload — any logged-in user (not just admin) can upload
// a photo to attach to their product review, Uzum-style.
app.post("/api/upload/review-image", authMiddleware, upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileName = `reviews/${generateFileName(req.file.originalname)}`;
    const url = await uploadToR2(req.file.buffer, fileName, req.file.mimetype);

    res.json({ url });
  } catch (error) {
    console.error('Review image upload error:', error);
    res.status(500).json({ error: "Rasmni yuklashda xatolik" });
  }
});

// API: Currencies
app.get("/api/currencies", async (req, res) => {
  try {
    const currencies = await prisma.currency.findMany({
      orderBy: { code: 'asc' }
    });
    res.json(currencies);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch currencies" });
  }
});

app.put("/api/currencies/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const data: any = {};
    if (req.body.rate !== undefined) {
      const rate = Number(req.body.rate);
      if (!isFinite(rate) || rate <= 0) {
        return res.status(400).json({ error: "Kurs musbat son bo'lishi kerak" });
      }
      data.rate = rate;
      data.source = 'manual'; // admin qo'lda o'zgartirdi — keyingi avtomatik CBU sinxronizatsiyasigacha shu qiymat qo'llanadi
    }
    if (req.body.isActive !== undefined) data.isActive = !!req.body.isActive;
    if (req.body.symbol !== undefined) data.symbol = String(req.body.symbol).slice(0, 8);

    const currency = await prisma.currency.update({
      where: { id: req.params.id },
      data,
    });
    res.json(currency);
  } catch (error) {
    res.status(500).json({ error: "Failed to update currency" });
  }
});

// Admin panelidan "Hozir yangilash" tugmasi orqali CBU kurslarini
// darhol qayta olib kelish uchun.
app.post("/api/currencies/sync", authMiddleware, adminMiddleware, async (req, res) => {
  const result = await syncCurrencyRates();
  if (result.failed) {
    return res.status(502).json({ error: "CBU dan kurslarni olib bo'lmadi. Birozdan so'ng qayta urinib ko'ring." });
  }
  const currencies = await prisma.currency.findMany({ orderBy: { code: 'asc' } });
  res.json({ message: `Yangilandi: ${result.updated.join(', ')}`, currencies });
});

// API: Auth
app.post("/api/auth/register", async (req, res) => {
  try {
    const { firstName, lastName, phone, pin } = req.body;

    // Bu maydonlar bo'lmasa, avval hashPin(pin) yoki Prisma create() ichida
    // tushunarsiz texnik xato (500) bilan qulardi. Endi aniq, foydalanuvchiga
    // ko'rsatsa bo'ladigan xabar bilan darhol rad etiladi.
    if (!firstName || !lastName || !phone || !pin) {
      return res.status(400).json({ error: "Barcha maydonlarni to'ldiring" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const { hash, salt } = hashPin(pin);
    
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        phone,
        role: 'user',
        pinHash: hash,
        salt: salt,
      },
    });

    const token = generateToken({ id: user.id, role: user.role, phone: user.phone });
    
    res.json({ user: sanitizeUser(user), token });
  } catch (error) {
    res.status(500).json({ error: "Failed to register user" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { phone, pin } = req.body;
    if (!phone || !pin) {
      return res.status(400).json({ error: "Telefon raqam va PIN kiritilishi shart" });
    }

    const attempt = loginAttempts[phone];
    if (attempt && attempt.lockUntil && attempt.lockUntil > Date.now()) {
      return res.status(429).json({ error: "Tizim vaqtincha bloklandi. Keyinroq urinib ko'ring." });
    }
    
    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.pinHash || !user.salt) {
      return res.status(500).json({ error: "Server configuration error" });
    }

    const { hash } = hashPin(pin, user.salt);
    if (hash !== user.pinHash) {
      if (!loginAttempts[phone]) loginAttempts[phone] = { attempts: 0 };
      loginAttempts[phone].attempts += 1;
      
      if (loginAttempts[phone].attempts >= 5) {
        loginAttempts[phone].lockUntil = Date.now() + 15 * 60 * 1000; // 15 mins lock
        return res.status(429).json({ error: "Ketma-ket xato urinishlar. 15 daqiqadan so'ng urinib ko'ring." });
      }
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Success, reset attempts
    if (loginAttempts[phone]) delete loginAttempts[phone];
    
    const token = generateToken({ id: user.id, role: user.role, phone: user.phone });
    
    res.json({ user: sanitizeUser(user), token });
  } catch (error) {
    res.status(500).json({ error: "Failed to login" });
  }
});

app.post("/api/auth/admin-login", async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: "Parol kiritilmagan" });
    }

    // This endpoint had no throttling at all — unlike /api/auth/login it wasn't even
    // keyed by phone, so a bot could try passwords forever. Key by IP instead, since
    // there's only ever one admin account to guess against.
    const attemptKey = `admin:${req.ip}`;
    const attempt = loginAttempts[attemptKey];
    if (attempt && attempt.lockUntil && attempt.lockUntil > Date.now()) {
      return res.status(429).json({ error: "Tizim vaqtincha bloklandi. Keyinroq urinib ko'ring." });
    }

    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' },
    });

    if (!adminUser) {
      return res.status(404).json({ error: "Admin foydalanuvchisi topilmadi" });
    }

    let isValid = !!process.env.ADMIN_PIN && password === process.env.ADMIN_PIN;

    if (!isValid && adminUser.pinHash && adminUser.salt) {
      const { hash } = hashPin(password, adminUser.salt);
      if (hash === adminUser.pinHash) {
        isValid = true;
      }
    }

    if (!isValid) {
      if (!loginAttempts[attemptKey]) loginAttempts[attemptKey] = { attempts: 0 };
      loginAttempts[attemptKey].attempts += 1;

      if (loginAttempts[attemptKey].attempts >= 5) {
        loginAttempts[attemptKey].lockUntil = Date.now() + 15 * 60 * 1000; // 15 mins lock
        return res.status(429).json({ error: "Ketma-ket xato urinishlar. 15 daqiqadan so'ng urinib ko'ring." });
      }
      return res.status(401).json({ error: "Admin paroli noto'g'ri" });
    }

    if (loginAttempts[attemptKey]) delete loginAttempts[attemptKey];

    const token = generateToken({ id: adminUser.id, role: adminUser.role, phone: adminUser.phone });
    res.json({ user: sanitizeUser(adminUser), token, message: "Admin panelga xush kelibsiz" });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ error: "Admin login error" });
  }
});

// API: Orders
app.get("/api/orders", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: true,
        deliveryAddress: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(mapOrders(orders));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

app.get("/api/orders/user", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
        deliveryAddress: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(mapOrders(orders));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user orders" });
  }
});

app.post("/api/orders", optionalAuthMiddleware, async (req, res) => {
  try {
    const { items, customer, deliveryAddress, paymentMethod } = req.body;

    // items/customer/deliveryAddress yo'q yoki noto'g'ri shaklda bo'lsa,
    // pastdagi kod (masalan `for (const item of items)`) tushunarsiz
    // texnik xato bilan qulardi ("items is not iterable",
    // "Cannot read properties of undefined"). Endi aniq xabar bilan rad
    // etiladi.
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Savat bo'sh" });
    }
    if (!customer || !customer.firstName || !customer.lastName || !customer.phone) {
      return res.status(400).json({ error: "Mijoz ma'lumotlari to'liq emas" });
    }
    if (!deliveryAddress || !deliveryAddress.region || !deliveryAddress.district || !deliveryAddress.street) {
      return res.status(400).json({ error: "Yetkazib berish manzili to'liq emas" });
    }

    // Trust the server-verified session, not a client-supplied userId —
    // this is also what makes the order show up under "Mening
    // buyurtmalarim" for logged-in users. Guests (no valid token) still
    // get userId: null and can check their order by its number/phone.
    const authenticatedUserId = (req as any).user?.id || null;
    
    const order = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const orderItemsData = [];
      
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error(`Mahsulot topilmadi: ${item.productId}`);
        if (product.stock < item.quantity) {
          throw new Error(`Kechirasiz, "${product.name}" mahsulotidan faqat ${product.stock} dona qolgan.`);
        }
        
        // Calculate with real price from DB — automatically applies the
        // admin-configured wholesale (optom) price once quantity reaches
        // the configured threshold. Never trust a price sent by the client.
        const unitPrice = getUnitPrice(product, item.quantity);
        subtotal += unitPrice * item.quantity;
        
        // The findUnique check above only proves there was enough stock at
        // read time — two customers buying the last unit at the same
        // moment could both pass that check before either one's decrement
        // lands, taking stock negative. The `stock: { gte }` guard here
        // makes the actual write atomic: it only succeeds if enough stock
        // is still there the instant the row is updated, closing that race.
        const decremented = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { 
            stock: { decrement: item.quantity },
            salesCount: { increment: item.quantity }
          }
        });
        if (decremented.count === 0) {
          throw new Error(`Kechirasiz, "${product.name}" mahsulotidan yetarli miqdorda qolmadi.`);
        }
        
        orderItemsData.push({
          productId: product.id,
          name: product.name,
          price: unitPrice,
          quantity: item.quantity,
          image: product.images[0] || "",
          categoryName: product.categoryName
        });
      }
      
      const deliveryFee = calculateDeliveryFee(subtotal);
      const total = subtotal + deliveryFee;
      const orderNumber = `ORD-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${Date.now().toString().slice(-4)}`;

      return await tx.order.create({
        data: {
          orderNumber,
          userId: authenticatedUserId,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          subtotal,
          deliveryFee,
          total,
          paymentMethod,
          status: 'Pending',
          items: {
            create: orderItemsData,
          },
          deliveryAddress: {
            create: {
              region: deliveryAddress.region,
              district: deliveryAddress.district,
              street: deliveryAddress.street,
              house: deliveryAddress.house,
              apartment: deliveryAddress.apartment,
              notes: deliveryAddress.notes,
              latitude: deliveryAddress.latitude,
              longitude: deliveryAddress.longitude,
              formattedAddress: deliveryAddress.formattedAddress,
            },
          },
          statusHistory: [
            {
              status: 'Pending',
              timestamp: new Date().toISOString(),
              note: 'Buyurtma rasmiylashtirildi'
            }
          ]
        },
        include: {
          items: true,
          deliveryAddress: true,
        },
      });
    });

    // Send Telegram notification
    try {
      await sendOrderNotification(order);
    } catch (e) {
      console.error('Telegram API error:', e);
    }

    res.json(mapOrder(order));
  } catch (error: any) {
    console.error('Order creation error:', error);
    res.status(400).json({ error: error.message || "Failed to create order" });
  }
});

app.put("/api/orders/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    // status hech qanday enum bilan cheklanmagan edi — noto'g'ri qiymat
    // (masalan yozuv xatosi) baribir bazaga yozilib, keyin frontendning
    // status-ga qarab ishlaydigan hamma joyi (badge rangi, filtrlar,
    // "keyingi bosqich" tugmalari) buzilardi.
    const ALLOWED_STATUSES = ['Pending', 'Confirmed', 'Preparing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Noto'g'ri holat qiymati" });
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status,
        statusHistory: {
          push: {
            status,
            timestamp: new Date().toISOString(),
          },
        },
      },
    });

    res.json(mapOrder(order));
  } catch (error) {
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// API: Admin Stats
app.get("/api/admin/stats", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [
      totalOrders,
      todayOrders,
      totalUsers,
      totalProducts,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.count({ where: { status: 'Pending' } }),
      prisma.order.count({ where: { status: 'Delivered' } }),
      prisma.order.count({ where: { status: 'Cancelled' } }),
    ]);

    const orders = await prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const totalRevenue = orders
      .filter(o => o.status === 'Delivered')
      .reduce((sum, o) => sum + o.total, 0);

    // Calculate sales trend (last 7 days)
    const salesTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' });
      
      const dayOrders = orders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate.toDateString() === date.toDateString();
      });
      
      salesTrend.push({
        date: dateStr,
        amount: dayOrders.reduce((sum, o) => sum + o.total, 0),
        ordersCount: dayOrders.length,
      });
    }

    // Calculate top products
    const productSales = new Map<string, { count: number; revenue: number; name: string; image: string }>();
    orders.forEach(order => {
      order.items.forEach(item => {
        const existing = productSales.get(item.productId);
        if (existing) {
          existing.count += item.quantity;
          existing.revenue += item.price * item.quantity;
        } else {
          productSales.set(item.productId, {
            count: item.quantity,
            revenue: item.price * item.quantity,
            name: item.name,
            image: item.image,
          });
        }
      });
    });

    const topProducts = Array.from(productSales.entries())
      .map(([id, data]) => ({ id, ...data, salesCount: data.count }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

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
      recentOrders: mapOrders(orders.slice(0, 10)) as any,
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
});

// API: Users
app.get("/api/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(sanitizeUsers(users));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// API: Health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API: Auth - Me & Profile
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { addresses: true }
    });
    if (!user) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    res.json(sanitizeUser(user));
  } catch (error) {
    res.status(500).json({ error: "Server xatosi" });
  }
});

app.put("/api/auth/profile", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { firstName, lastName, avatar, phone } = req.body;

    if (phone) {
      const existing = await prisma.user.findUnique({ where: { phone } });
      if (existing && existing.id !== userId) {
        return res.status(400).json({ error: "Bu telefon raqami boshqa foydalanuvchida ro'yxatdan o'tgan" });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { firstName, lastName, avatar, ...(phone ? { phone } : {}) },
      include: { addresses: true }
    });
    res.json(sanitizeUser(updatedUser));
  } catch (error) {
    res.status(500).json({ error: "Profilni yangilashda xatolik" });
  }
});

// Login/parolni (PIN) o'zgartirish — admin uchun ham, oddiy foydalanuvchi
// uchun ham bir xil: admin-login screeni ADMIN_PIN bo'lmasa shu yerda
// yangilangan pinHash'ni ham tekshiradi (qarang: /api/auth/admin-login).
app.put("/api/auth/change-pin", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { currentPin, newPin } = req.body;

    if (!newPin || !/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ error: "Yangi PIN 4 ta raqamdan iborat bo'lishi kerak" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.pinHash || !user.salt) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    const { hash: currentHash } = hashPin(currentPin || '', user.salt);
    if (currentHash !== user.pinHash) {
      return res.status(401).json({ error: "Joriy PIN noto'g'ri" });
    }

    const { hash, salt } = hashPin(newPin);
    await prisma.user.update({
      where: { id: userId },
      data: { pinHash: hash, salt },
    });

    res.json({ message: "PIN muvaffaqiyatli yangilandi" });
  } catch (error) {
    res.status(500).json({ error: "PINni yangilashda xatolik" });
  }
});

// API: Addresses
app.post("/api/auth/addresses", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { title, region, district, street, house, apartment, notes, latitude, longitude, formattedAddress, isDefault } = req.body;
    
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false }
      });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        title, region, district, street, house, apartment, notes, latitude, longitude, formattedAddress,
        isDefault: isDefault || false
      }
    });

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { addresses: true } });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Manzil qo'shishda xatolik" });
  }
});

app.delete("/api/auth/addresses/:id", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    await prisma.address.deleteMany({
      where: { id: req.params.id, userId }
    });
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { addresses: true } });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Manzilni o'chirishda xatolik" });
  }
});

// API: Favorites
app.get("/api/favorites", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: { product: true }
    });
    res.json(favorites.map(f => f.product));
  } catch (error) {
    res.status(500).json({ error: "Yoqtirganlarni olishda xatolik" });
  }
});

app.post("/api/favorites", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ error: "Mahsulot ko'rsatilmagan" });
    }
    // @@unique([userId, productId]) bor — bir mahsulotni ikki marta bosish
    // (masalan tez-tez bosilganda, yoki ikki tab ochiq bo'lsa) create() ni
    // takrorlab chaqirardi va Prisma unique-constraint xatosi (P2002) bilan
    // 500 qaytarardi. upsert bilan bu amal idempotent bo'ladi — allaqachon
    // yoqtirilgan bo'lsa ham xatosiz "success" qaytadi.
    await prisma.favorite.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Add favorite error:", error);
    res.status(500).json({ error: "Saqlashda xatolik" });
  }
});

app.delete("/api/favorites/:productId", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    await prisma.favorite.deleteMany({
      where: { userId, productId: req.params.productId }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "O'chirishda xatolik" });
  }
});

// API: Product Reviews
app.post("/api/products/:id/reviews", authMiddleware, async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = (req as any).user.id;
    const { rating, comment } = req.body;
    const ratingNum = Math.round(Number(rating));
    const images: string[] = Array.isArray(req.body.images)
      ? req.body.images.filter((u: any) => typeof u === 'string').slice(0, 5)
      : [];

    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: "Yulduzcha bahosi 1 dan 5 gacha bo'lishi kerak" });
    }
    if (!comment || !String(comment).trim()) {
      return res.status(400).json({ error: "Sharh matnini kiriting" });
    }

    const [user, product] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.product.findUnique({ where: { id: productId } }),
    ]);
    if (!user) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    if (!product) return res.status(404).json({ error: "Mahsulot topilmadi" });

    const review = await prisma.productReview.create({
      data: {
        productId,
        userId,
        userName: `${user.firstName} ${user.lastName}`,
        rating: ratingNum,
        comment: String(comment).trim(),
        images,
      }
    });

    // Update product rating and reviews count
    const productReviews = await prisma.productReview.findMany({ where: { productId } });
    const totalRating = productReviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / productReviews.length;

    await prisma.product.update({
      where: { id: productId },
      data: {
        rating: averageRating,
        reviewsCount: productReviews.length
      }
    });

    // Har bir yangi sharh — kim, qaysi mahsulotga, nechta yulduz va nima
    // yozgani — Telegram botga yuboriladi. Yuborish muvaffaqiyatsiz bo'lsa
    // ham sharh baribir saqlangan bo'lib qoladi.
    sendReviewNotification(review, product.name).catch((err) =>
      console.error('❌ Failed to send review notification:', err)
    );

    res.json({ review, rating: averageRating, reviewsCount: productReviews.length });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ error: "Sharh qoldirishda xatolik" });
  }
});

// Har bir mahsulot endpointi kabi (sanitizeProductData), bu yerda ham
// req.body to'g'ridan-to'g'ri Prisma'ga uzatilmaydi. Frontend kategoriya
// tahrirlashda butun obyektni (id, createdAt, updatedAt, productCount, ...)
// qaytarib yuboradi — sanitizatsiyasiz bu qiymatlar bazaga tasodifan qayta
// yozilib ketishi yoki noma'lum maydon tufayli Prisma xatosi (500) berishi
// mumkin edi.
function sanitizeCategoryData(data: any) {
  const sanitized: any = {};
  const allowedKeys = ["name", "slug", "iconName", "image", "isActive"];
  allowedKeys.forEach((key) => {
    if (data[key] !== undefined) sanitized[key] = data[key];
  });
  return sanitized;
}

// API: Categories Admin
app.post("/api/categories", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const category = await prisma.category.create({ data: sanitizeCategoryData(req.body) });
    res.json(category);
  } catch (error) {
    console.error("Category create error:", error);
    res.status(500).json({ error: "Toifa yaratishda xatolik" });
  }
});

app.put("/api/categories/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: "Toifa topilmadi" });
    }

    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: sanitizeCategoryData(req.body)
    });

    // Kategoriya nomi o'zgargan bo'lsa, unga tegishli mahsulotlardagi
    // denormalizatsiya qilingan categoryName ham sinxronlanadi — aks holda
    // eski mahsulotlar admin panelda va buyurtmalarda eski nom bilan
    // ko'rinib qoladi.
    if (category.name !== existing.name) {
      await prisma.product.updateMany({
        where: { categorySlug: category.slug },
        data: { categoryName: category.name },
      });
    }

    res.json(category);
  } catch (error) {
    console.error("Category update error:", error);
    res.status(500).json({ error: "Toifa yangilashda xatolik" });
  }
});

app.delete("/api/categories/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const category = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!category) {
      return res.status(404).json({ error: "Toifa topilmadi" });
    }

    const productCount = await prisma.product.count({ where: { categorySlug: category.slug } });
    if (productCount > 0) {
      return res.status(400).json({
        error: `Bu toifada ${productCount} ta mahsulot mavjud. Avval ularni boshqa toifaga o'tkazing yoki o'chiring, so'ngra toifani o'chiring.`,
      });
    }

    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Category delete error:", error);
    res.status(500).json({ error: "Toifa o'chirishda xatolik" });
  }
});

// API: Banners (bosh sahifadagi slayder)
app.get("/api/banners", async (req, res) => {
  try {
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ error: "Bannerlarni olishda xatolik" });
  }
});

app.get("/api/admin/banners", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const banners = await prisma.banner.findMany({ orderBy: { order: 'asc' } });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ error: "Bannerlarni olishda xatolik" });
  }
});

app.post("/api/banners", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      tag, titleLine1, titleLine2, titleAccent, subtitle, badge,
      categorySlug, image, productHighlights, order, isActive,
    } = req.body;
    if (!titleLine1 || !image) {
      return res.status(400).json({ error: "Sarlavha va rasm majburiy" });
    }
    const banner = await prisma.banner.create({
      data: {
        tag, titleLine1, titleLine2, titleAccent, subtitle, badge,
        categorySlug, image,
        productHighlights: productHighlights || [],
        order: order ?? 0,
        isActive: isActive ?? true,
      },
    });
    res.json(banner);
  } catch (error) {
    res.status(500).json({ error: "Banner yaratishda xatolik" });
  }
});

app.put("/api/banners/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      tag, titleLine1, titleLine2, titleAccent, subtitle, badge,
      categorySlug, image, productHighlights, order, isActive,
    } = req.body;
    const banner = await prisma.banner.update({
      where: { id: req.params.id },
      data: {
        tag, titleLine1, titleLine2, titleAccent, subtitle, badge,
        categorySlug, image, productHighlights, order, isActive,
      },
    });
    res.json(banner);
  } catch (error) {
    res.status(500).json({ error: "Banner yangilashda xatolik" });
  }
});

app.delete("/api/banners/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await prisma.banner.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Bannerni o'chirishda xatolik" });
  }
});

// API: Single Order
app.get("/api/orders/:id", authMiddleware, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true, deliveryAddress: true, user: true }
    });
    if (!order) return res.status(404).json({ error: "Buyurtma topilmadi" });
    
    // Check if user owns the order, unless they are admin
    const user = (req as any).user;
    if (user.role !== "admin" && order.userId !== user.id) {
      return res.status(403).json({ error: "Ruxsat etilmagan" });
    }
    
    res.json(mapOrder(order));
  } catch (error) {
    res.status(500).json({ error: "Buyurtmani olishda xatolik" });
  }
});

// API: Admin Users
app.get("/api/admin/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(sanitizeUsers(users));
  } catch (error) {
    res.status(500).json({ error: "Foydalanuvchilarni olishda xatolik" });
  }
});

app.put("/api/admin/users/:id/block", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { isBlocked } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isBlocked }
    });
    res.json(sanitizeUser(user));
  } catch (error) {
    res.status(500).json({ error: "Holatni o'zgartirishda xatolik" });
  }
});

// Vite serve in development, static files in production
const isProduction = process.env.NODE_ENV === "production";

async function startServer() {
  if (isProduction) {
    const distPath = path.resolve(process.cwd(), "dist");
    // Vite gives every JS/CSS file a content hash in its name (e.g. index-COwJPZPg.js),
    // so those files never change under the same URL — safe to cache for a year.
    // index.html (and anything else without a hash) must stay revalidated on every
    // request, otherwise browsers could keep serving an old app shell that points at
    // JS/CSS chunks which no longer exist after the next deploy.
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }));
    app.get("*", (req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
