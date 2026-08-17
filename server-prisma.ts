import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { uploadToR2, generateFileName } from "./src/lib/r2";
import { sendOrderNotification } from "./src/lib/telegram";
import multer from "multer";
import {
  serializeCategory,
  serializeCurrency,
  serializeOrder,
  serializeProduct,
  serializeReview,
  serializeUser,
} from "./src/lib/serializers";
import type { AdminStats, OrderStatus } from "./src/types";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET environment variable is required. Add it to your .env file.");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required. Add it to your .env file.");
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 3000;
const DELIVERY_FEE = Number(process.env.DELIVERY_FEE) || 25000;
const FREE_DELIVERY_THRESHOLD = Number(process.env.FREE_DELIVERY_THRESHOLD) || 500000;
const ORDER_STATUSES: OrderStatus[] = [
  "Pending",
  "Confirmed",
  "Preparing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// ---------------- AUTH HELPERS ----------------

interface TokenPayload {
  id: string;
  role: string;
  phone: string;
}

interface AuthedRequest extends Request {
  auth?: TokenPayload;
}

function hashPin(pin: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(pin, generatedSalt, 100_000, 64, "sha512").toString("hex");
  return { hash, salt: generatedSalt };
}

function pinMatches(pin: string, user: { pinHash: string; salt: string }): boolean {
  const { hash } = hashPin(pin, user.salt);
  const expected = Buffer.from(user.pinHash, "hex");
  const actual = Buffer.from(hash, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function generateToken(payload: TokenPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET as string)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", JWT_SECRET as string)
      .update(`${header}.${body}`)
      .digest("base64url");
    const expected = Buffer.from(expectedSig);
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload & {
      exp?: number;
    };
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return { id: decoded.id, role: decoded.role, phone: decoded.phone };
  } catch {
    return null;
  }
}

function readToken(req: Request): TokenPayload | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return verifyToken(authHeader.substring(7));
}

function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const payload = readToken(req);
  if (!payload) {
    return res.status(401).json({ message: "Kirish talab qilinadi (token yaroqsiz yoki mavjud emas)" });
  }
  req.auth = payload;
  next();
}

/** Attaches req.auth when a valid token is present, but never rejects the request. */
function optionalAuthMiddleware(req: AuthedRequest, _res: Response, next: NextFunction) {
  const payload = readToken(req);
  if (payload) req.auth = payload;
  next();
}

function adminMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.auth?.role !== "admin") {
    return res.status(403).json({ message: "Ruxsat yo'q. Faqat administratorlar uchun." });
  }
  next();
}

// In-memory brute-force protection. Single-process only; use a shared store when scaling out.
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 5 * 60 * 1000;
const loginAttempts = new Map<string, { attempts: number; lockUntil?: number }>();

function normalizePhone(phone: string): string {
  return phone.trim().replace(/[^\d+]/g, "");
}

// ---------------- INPUT HELPERS ----------------

type Body = Record<string, unknown>;

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
}

function asSpecs(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Prisma.InputJsonValue;
}

// ---------------- HEALTH ----------------

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ---------------- AUTH ----------------

app.post("/api/auth/register", async (req, res) => {
  try {
    const body = req.body as Body;
    const firstName = asString(body.firstName);
    const lastName = asString(body.lastName);
    const rawPhone = asString(body.phone);
    const pin = asString(body.pin);

    if (!firstName || !lastName || !rawPhone || !pin) {
      return res.status(400).json({ message: "Barcha maydonlarni to'ldiring (Ism, Familiya, Telefon, PIN)" });
    }

    const phone = normalizePhone(rawPhone);
    if (phone.length < 9) {
      return res.status(400).json({ message: "Telefon raqami noto'g'ri kiritildi" });
    }

    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ message: "PIN-kod aynan 4 ta raqamdan iborat bo'lishi kerak" });
    }

    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      return res.status(409).json({
        message: "Bu telefon raqami bilan foydalanuvchi allaqachon mavjud. Iltimos, tizimga kiring.",
      });
    }

    const { hash, salt } = hashPin(pin);
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        phone,
        pinHash: hash,
        salt,
        role: "user",
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          `${firstName} ${lastName}`,
        )}&backgroundColor=7000ff`,
      },
      include: { addresses: true },
    });

    const token = generateToken({ id: user.id, role: user.role, phone: user.phone });
    res.status(201).json({
      user: serializeUser(user),
      token,
      message: "Muvaffaqiyatli ro'yxatdan o'tdingiz",
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Ro'yxatdan o'tishda xatolik yuz berdi" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const body = req.body as Body;
    const rawPhone = asString(body.phone);
    const pin = asString(body.pin);

    if (!rawPhone || !pin) {
      return res.status(400).json({ message: "Telefon raqam va PIN-kodni kiriting" });
    }

    const phone = normalizePhone(rawPhone);
    const attemptInfo = loginAttempts.get(phone);
    if (attemptInfo?.lockUntil && attemptInfo.lockUntil > Date.now()) {
      const remainingSeconds = Math.ceil((attemptInfo.lockUntil - Date.now()) / 1000);
      return res.status(429).json({
        message: `Xavfsizlik choralari: Ko'p marta xato kiritildi. Iltimos, ${remainingSeconds} soniyadan keyin qayta urinib ko'ring.`,
      });
    }

    const user = await prisma.user.findUnique({ where: { phone }, include: { addresses: true } });
    if (!user || !pinMatches(pin, user)) {
      const currentAttempts = (attemptInfo?.attempts || 0) + 1;
      if (currentAttempts >= MAX_LOGIN_ATTEMPTS) {
        loginAttempts.set(phone, { attempts: 0, lockUntil: Date.now() + LOGIN_LOCK_MS });
        return res.status(429).json({
          message: `${MAX_LOGIN_ATTEMPTS} marta xato urinish. Hisob 5 daqiqaga vaqtincha bloklandi.`,
        });
      }
      loginAttempts.set(phone, { attempts: currentAttempts });
      return res.status(401).json({
        message: `Telefon raqam yoki PIN-kod noto'g'ri. Qolgan urinishlar: ${MAX_LOGIN_ATTEMPTS - currentAttempts}`,
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "Hisobingiz bloklangan. Qo'llab-quvvatlash xizmati bilan bog'laning." });
    }

    loginAttempts.delete(phone);
    const token = generateToken({ id: user.id, role: user.role, phone: user.phone });
    res.json({
      user: serializeUser(user),
      token,
      message: "Tizimga muvaffaqiyatli kirdingiz",
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Kirishda xatolik yuz berdi" });
  }
});

app.get("/api/auth/me", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.id },
      include: { addresses: true },
    });
    if (!user) return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    res.json(serializeUser(user));
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ message: "Foydalanuvchi ma'lumotlarini olishda xatolik" });
  }
});

app.put("/api/auth/profile", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const body = req.body as Body;
    const user = await prisma.user.update({
      where: { id: req.auth!.id },
      data: {
        firstName: asString(body.firstName),
        lastName: asString(body.lastName),
        avatar: asString(body.avatar),
      },
      include: { addresses: true },
    });
    res.json(serializeUser(user));
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Profilni yangilashda xatolik" });
  }
});

app.post("/api/auth/addresses", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const body = req.body as Body;
    const region = asString(body.region);
    const street = asString(body.street);
    if (!region || !street) {
      return res.status(400).json({ message: "Manzil ma'lumotlarini to'liq kiriting" });
    }

    const userId = req.auth!.id;
    const district = asString(body.district) ?? "";
    const house = asString(body.house) ?? "";
    const existingCount = await prisma.address.count({ where: { userId } });
    const isDefault = asBoolean(body.isDefault) ?? existingCount === 0;

    await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      }
      await tx.address.create({
        data: {
          userId,
          title: asString(body.title) ?? "Manzilim",
          region,
          district,
          street,
          house,
          apartment: asString(body.apartment),
          notes: asString(body.notes),
          latitude: asNumber(body.latitude),
          longitude: asNumber(body.longitude),
          formattedAddress:
            asString(body.formattedAddress) ?? `${region}, ${district} ${street} ${house}`.trim(),
          isDefault,
        },
      });
    });

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { addresses: true } });
    res.status(201).json(serializeUser(user!));
  } catch (error) {
    console.error("Add address error:", error);
    res.status(500).json({ message: "Manzilni saqlashda xatolik" });
  }
});

app.delete("/api/auth/addresses/:id", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const userId = req.auth!.id;
    const deleted = await prisma.address.deleteMany({ where: { id: req.params.id, userId } });
    if (deleted.count === 0) {
      return res.status(404).json({ message: "Manzil topilmadi" });
    }
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { addresses: true } });
    res.json(serializeUser(user!));
  } catch (error) {
    console.error("Delete address error:", error);
    res.status(500).json({ message: "Manzilni o'chirishda xatolik" });
  }
});

// ---------------- CATEGORIES ----------------

app.get("/api/categories", async (_req, res) => {
  try {
    const [categories, counts] = await Promise.all([
      prisma.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.product.groupBy({ by: ["categorySlug"], where: { isActive: true }, _count: true }),
    ]);
    const countBySlug = new Map(counts.map((row) => [row.categorySlug, row._count]));
    res.json(categories.map((cat) => serializeCategory(cat, countBySlug.get(cat.slug) ?? 0)));
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ message: "Kategoriyalarni olishda xatolik" });
  }
});

app.post("/api/categories", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const body = req.body as Body;
    const name = asString(body.name);
    const slug = asString(body.slug);
    if (!name || !slug) {
      return res.status(400).json({ message: "Kategoriya nomi va slug talab qilinadi" });
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug: slug.toLowerCase().replace(/\s+/g, "-"),
        iconName: asString(body.iconName) ?? "Folder",
        image:
          asString(body.image) ??
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
        isActive: asBoolean(body.isActive) ?? true,
      },
    });
    res.status(201).json(serializeCategory(category, 0));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ message: "Bunday slug bilan kategoriya allaqachon mavjud" });
    }
    console.error("Create category error:", error);
    res.status(500).json({ message: "Kategoriya yaratishda xatolik" });
  }
});

app.put("/api/categories/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const body = req.body as Body;
    const slug = asString(body.slug);
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        name: asString(body.name),
        slug: slug ? slug.toLowerCase().replace(/\s+/g, "-") : undefined,
        iconName: asString(body.iconName),
        image: asString(body.image),
        isActive: asBoolean(body.isActive),
      },
    });
    res.json(serializeCategory(category));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return res.status(404).json({ message: "Kategoriya topilmadi" });
    }
    console.error("Update category error:", error);
    res.status(500).json({ message: "Kategoriyani yangilashda xatolik" });
  }
});

app.delete("/api/categories/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const category = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!category) return res.status(404).json({ message: "Kategoriya topilmadi" });

    const productCount = await prisma.product.count({ where: { categorySlug: category.slug } });
    if (productCount > 0) {
      return res.status(409).json({
        message: `Bu kategoriyada ${productCount} ta mahsulot bor. Avval ularni o'chiring yoki boshqa kategoriyaga o'tkazing.`,
      });
    }

    await prisma.category.delete({ where: { id: category.id } });
    res.json({ message: "Kategoriya muvaffaqiyatli o'chirildi" });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ message: "Kategoriyani o'chirishda xatolik" });
  }
});

// ---------------- PRODUCTS ----------------

app.get("/api/products", optionalAuthMiddleware, async (req: AuthedRequest, res) => {
  try {
    const {
      q,
      search,
      category,
      minPrice,
      maxPrice,
      rating,
      discountOnly,
      inStock,
      isFeatured,
      isNew,
      includeInactive,
      sort = "popular",
      page = "1",
      limit = "20",
    } = req.query as Record<string, string | undefined>;

    const where: Prisma.ProductWhereInput = {};
    const isAdmin = req.auth?.role === "admin";
    if (!(isAdmin && includeInactive === "true")) {
      where.isActive = true;
    }

    const searchTerm = search || q;
    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
        { categoryName: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    if (category && category !== "all") {
      where.categorySlug = category;
    }

    const min = asNumber(minPrice);
    const max = asNumber(maxPrice);
    if (min !== undefined || max !== undefined) {
      where.price = { ...(min !== undefined ? { gte: min } : {}), ...(max !== undefined ? { lte: max } : {}) };
    }

    const minRating = asNumber(rating);
    if (minRating !== undefined) where.rating = { gte: minRating };
    if (discountOnly === "true") where.discount = { gt: 0 };
    if (inStock === "true") where.stock = { gt: 0 };
    if (isFeatured === "true") where.isFeatured = true;
    if (isNew === "true") where.isNew = true;

    const orderByBySort: Record<string, Prisma.ProductOrderByWithRelationInput> = {
      price_asc: { price: "asc" },
      price_desc: { price: "desc" },
      rating: { rating: "desc" },
      new: { createdAt: "desc" },
      newest: { createdAt: "desc" },
      popular: { salesCount: "desc" },
    };
    const orderBy = orderByBySort[sort] ?? orderByBySort.popular;

    const pageNum = Math.max(1, asNumber(page) ?? 1);
    const limitNum = Math.min(100, Math.max(1, asNumber(limit) ?? 20));

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: { variants: true },
        orderBy,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
    ]);

    res.json({
      products: products.map(serializeProduct),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ message: "Mahsulotlarni olishda xatolik" });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        variants: true,
        reviews: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    if (!product) return res.status(404).json({ message: "Mahsulot topilmadi" });

    const related = await prisma.product.findMany({
      where: { categorySlug: product.categorySlug, isActive: true, id: { not: product.id } },
      include: { variants: true },
      take: 6,
    });

    res.json({ product: serializeProduct(product), related: related.map(serializeProduct) });
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({ message: "Mahsulotni olishda xatolik" });
  }
});

app.post("/api/products", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const body = req.body as Body;
    const name = asString(body.name);
    const price = asNumber(body.price);
    const categorySlug = asString(body.category) ?? asString(body.categorySlug);

    if (!name || price === undefined || !categorySlug) {
      return res.status(400).json({ message: "Mahsulot nomi, narxi va kategoriyasi majburiy" });
    }

    const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
    if (!category) return res.status(400).json({ message: "Bunday kategoriya mavjud emas" });

    const oldPrice = asNumber(body.oldPrice);
    const discount =
      asNumber(body.discount) ??
      (oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0);

    const product = await prisma.product.create({
      data: {
        name,
        description: asString(body.description) ?? "",
        price,
        oldPrice,
        discount,
        categorySlug: category.slug,
        categoryName: category.name,
        images: asStringArray(body.images) ?? [
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
        ],
        stock: asNumber(body.stock) ?? 0,
        isFeatured: asBoolean(body.isFeatured) ?? false,
        isNew: asBoolean(body.isNew) ?? true,
        isActive: asBoolean(body.isActive) ?? true,
        specs: asSpecs(body.specs) ?? {},
        wholesalePrice: asNumber(body.wholesalePrice),
        piecePrice: asNumber(body.piecePrice),
      },
      include: { variants: true },
    });

    res.status(201).json(serializeProduct(product));
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({ message: "Mahsulot yaratishda xatolik" });
  }
});

app.put("/api/products/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const body = req.body as Body;
    const categorySlug = asString(body.category) ?? asString(body.categorySlug);
    let categoryName: string | undefined;

    if (categorySlug) {
      const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
      if (!category) return res.status(400).json({ message: "Bunday kategoriya mavjud emas" });
      categoryName = category.name;
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name: asString(body.name),
        description: asString(body.description),
        price: asNumber(body.price),
        oldPrice: asNumber(body.oldPrice),
        discount: asNumber(body.discount),
        categorySlug,
        categoryName,
        images: asStringArray(body.images),
        stock: asNumber(body.stock),
        isFeatured: asBoolean(body.isFeatured),
        isNew: asBoolean(body.isNew),
        isActive: asBoolean(body.isActive),
        specs: asSpecs(body.specs),
        wholesalePrice: asNumber(body.wholesalePrice),
        piecePrice: asNumber(body.piecePrice),
      },
      include: { variants: true },
    });

    res.json(serializeProduct(product));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return res.status(404).json({ message: "Mahsulot topilmadi" });
    }
    console.error("Update product error:", error);
    res.status(500).json({ message: "Mahsulotni yangilashda xatolik" });
  }
});

app.delete("/api/products/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: "Mahsulot muvaffaqiyatli o'chirildi" });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return res.status(404).json({ message: "Mahsulot topilmadi" });
    }
    console.error("Delete product error:", error);
    res.status(500).json({ message: "Mahsulotni o'chirishda xatolik" });
  }
});

app.post("/api/products/:id/reviews", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const body = req.body as Body;
    const rating = asNumber(body.rating);
    const comment = asString(body.comment);
    if (rating === undefined || !comment) {
      return res.status(400).json({ message: "Reyting va sharh matnini kiriting" });
    }

    const [product, user] = await Promise.all([
      prisma.product.findUnique({ where: { id: req.params.id } }),
      prisma.user.findUnique({ where: { id: req.auth!.id } }),
    ]);
    if (!product) return res.status(404).json({ message: "Mahsulot topilmadi" });
    if (!user) return res.status(404).json({ message: "Foydalanuvchi topilmadi" });

    const review = await prisma.productReview.create({
      data: {
        productId: product.id,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName.charAt(0)}.`,
        rating: Math.min(5, Math.max(1, Math.round(rating))),
        comment,
      },
    });

    const aggregate = await prisma.productReview.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: true,
    });

    const updated = await prisma.product.update({
      where: { id: product.id },
      data: {
        rating: Number((aggregate._avg.rating ?? 0).toFixed(1)),
        reviewsCount: aggregate._count,
      },
    });

    res.status(201).json({
      review: serializeReview(review),
      rating: updated.rating,
      reviewsCount: updated.reviewsCount,
    });
  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({ message: "Sharh qo'shishda xatolik" });
  }
});

// ---------------- FAVORITES ----------------

app.get("/api/favorites", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.auth!.id },
      orderBy: { createdAt: "desc" },
    });
    const products = await prisma.product.findMany({
      where: { id: { in: favorites.map((fav) => fav.productId) } },
      include: { variants: true },
    });
    res.json({
      productIds: favorites.map((fav) => fav.productId),
      products: products.map(serializeProduct),
    });
  } catch (error) {
    console.error("Get favorites error:", error);
    res.status(500).json({ message: "Sevimlilarni olishda xatolik" });
  }
});

app.post("/api/favorites", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const productId = asString((req.body as Body).productId);
    if (!productId) return res.status(400).json({ message: "productId talab qilinadi" });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ message: "Mahsulot topilmadi" });

    await prisma.favorite.upsert({
      where: { userId_productId: { userId: req.auth!.id, productId } },
      create: { userId: req.auth!.id, productId },
      update: {},
    });

    res.status(201).json({ message: "Sevimlilarga qo'shildi", productId });
  } catch (error) {
    console.error("Add favorite error:", error);
    res.status(500).json({ message: "Sevimlilarga qo'shishda xatolik" });
  }
});

app.delete("/api/favorites/:productId", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    await prisma.favorite.deleteMany({
      where: { userId: req.auth!.id, productId: req.params.productId },
    });
    res.json({ message: "Sevimlilardan olib tashlandi", productId: req.params.productId });
  } catch (error) {
    console.error("Delete favorite error:", error);
    res.status(500).json({ message: "Sevimlilardan o'chirishda xatolik" });
  }
});

// ---------------- UPLOAD ----------------

app.post(
  "/api/upload",
  authMiddleware,
  adminMiddleware,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ message: "Fayl yuborilmadi" });

      const fileName = generateFileName(req.file.originalname);
      const url = await uploadToR2(req.file.buffer, fileName, req.file.mimetype);
      res.json({ url });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Rasmni yuklashda xatolik" });
    }
  },
);

// ---------------- CURRENCIES ----------------

app.get("/api/currencies", async (_req, res) => {
  try {
    const currencies = await prisma.currency.findMany({ orderBy: { code: "asc" } });
    res.json(currencies.map(serializeCurrency));
  } catch (error) {
    console.error("Get currencies error:", error);
    res.status(500).json({ message: "Valyutalarni olishda xatolik" });
  }
});

app.put("/api/currencies/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const body = req.body as Body;
    const currency = await prisma.currency.update({
      where: { id: req.params.id },
      data: {
        rate: asNumber(body.rate),
        isActive: asBoolean(body.isActive),
      },
    });
    res.json(serializeCurrency(currency));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return res.status(404).json({ message: "Valyuta topilmadi" });
    }
    console.error("Update currency error:", error);
    res.status(500).json({ message: "Valyutani yangilashda xatolik" });
  }
});

// ---------------- ORDERS ----------------

function generateOrderNumber(): string {
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `#ORD-${Date.now().toString(36).toUpperCase()}-${random}`;
}

interface OrderItemInput {
  productId: string;
  quantity: number;
}

function parseOrderItems(value: unknown): OrderItemInput[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const items: OrderItemInput[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) return null;
    const item = raw as Body;
    const productId = asString(item.productId);
    const quantity = asNumber(item.quantity) ?? 1;
    if (!productId || quantity < 1) return null;
    items.push({ productId, quantity: Math.floor(quantity) });
  }
  return items;
}

app.post("/api/orders", optionalAuthMiddleware, async (req: AuthedRequest, res) => {
  try {
    const body = req.body as Body;
    const customer = (body.customer ?? {}) as Body;
    const deliveryAddress = (body.deliveryAddress ?? {}) as Body;

    const firstName = asString(customer.firstName);
    const phone = asString(customer.phone);
    if (!firstName || !phone) {
      return res.status(400).json({ message: "Mijoz ma'lumotlari (Ism, Telefon) to'liq emas" });
    }

    const items = parseOrderItems(body.items);
    if (!items) {
      return res.status(400).json({ message: "Savat bo'sh yoki mahsulot ma'lumotlari noto'g'ri" });
    }

    const region = asString(deliveryAddress.region);
    const street = asString(deliveryAddress.street);
    if (!region || !street) {
      return res.status(400).json({ message: "Yetkazib berish manzilini to'liq kiriting" });
    }

    const paymentMethod = asString(body.paymentMethod) ?? "cash";
    const userId = req.auth?.id;

    const order = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: items.map((item) => item.productId) } },
      });
      const productById = new Map(products.map((product) => [product.id, product]));

      let subtotal = 0;
      const orderItems = items.map((item) => {
        const product = productById.get(item.productId);
        if (!product || !product.isActive) {
          throw new HttpError(400, `Mahsulot topilmadi: ${item.productId}`);
        }
        if (product.stock < item.quantity) {
          throw new HttpError(
            409,
            `"${product.name}" uchun omborda yetarli qoldiq yo'q (mavjud: ${product.stock} dona)`,
          );
        }
        // Price always comes from the database, never from the client payload.
        subtotal += product.price * item.quantity;
        return {
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.images[0] ?? "",
          quantity: item.quantity,
          categoryName: product.categoryName,
        };
      });

      for (const item of items) {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity }, salesCount: { increment: item.quantity } },
        });
        if (updated.count === 0) {
          const product = productById.get(item.productId);
          throw new HttpError(409, `"${product?.name ?? item.productId}" omborda tugab qoldi`);
        }
      }

      const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
      const total = subtotal + deliveryFee;

      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: userId ?? null,
          firstName,
          lastName: asString(customer.lastName) ?? "",
          phone,
          subtotal,
          deliveryFee,
          total,
          paymentMethod,
          status: "Pending",
          statusHistory: [
            {
              status: "Pending",
              timestamp: new Date().toISOString(),
              note: "Buyurtma qabul qilindi va tasdiqlash kutilmoqda",
            },
          ],
          estimatedDelivery: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split("T")[0],
          items: { create: orderItems },
          deliveryAddress: {
            create: {
              region,
              district: asString(deliveryAddress.district) ?? "",
              street,
              house: asString(deliveryAddress.house) ?? "",
              apartment: asString(deliveryAddress.apartment),
              notes: asString(deliveryAddress.notes),
              latitude: asNumber(deliveryAddress.latitude),
              longitude: asNumber(deliveryAddress.longitude),
              formattedAddress: asString(deliveryAddress.formattedAddress) ?? `${region}, ${street}`,
            },
          },
        },
        include: { items: true, deliveryAddress: true },
      });

      if (userId) {
        await tx.user.update({
          where: { id: userId },
          data: { ordersCount: { increment: 1 }, totalSpent: { increment: total } },
        });
      }

      return created;
    });

    const serialized = serializeOrder(order);
    await sendOrderNotification(serialized);

    res.status(201).json({ order: serialized, message: "Buyurtmangiz muvaffaqiyatli qabul qilindi!" });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error("Order creation error:", error);
    res.status(500).json({ message: "Buyurtma yaratishda xatolik" });
  }
});

app.get("/api/orders", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const isAdmin = req.auth!.role === "admin";
    const orders = await prisma.order.findMany({
      where: isAdmin ? {} : { OR: [{ userId: req.auth!.id }, { phone: req.auth!.phone }] },
      include: { items: true, deliveryAddress: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders.map(serializeOrder));
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ message: "Buyurtmalarni olishda xatolik" });
  }
});

app.get("/api/orders/:id", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { OR: [{ id: req.params.id }, { orderNumber: req.params.id }] },
      include: { items: true, deliveryAddress: true },
    });
    if (!order) return res.status(404).json({ message: "Buyurtma topilmadi" });

    const isOwner = order.userId === req.auth!.id || order.phone === req.auth!.phone;
    if (req.auth!.role !== "admin" && !isOwner) {
      return res.status(403).json({ message: "Bu buyurtmani ko'rishga ruxsat yo'q" });
    }

    res.json(serializeOrder(order));
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ message: "Buyurtmani olishda xatolik" });
  }
});

app.put("/api/orders/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const body = req.body as Body;
    const status = asString(body.status) as OrderStatus | undefined;
    if (!status || !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Noto'g'ri status" });
    }

    const existing = await prisma.order.findFirst({
      where: { OR: [{ id: req.params.id }, { orderNumber: req.params.id }] },
    });
    if (!existing) return res.status(404).json({ message: "Buyurtma topilmadi" });

    const history = Array.isArray(existing.statusHistory) ? existing.statusHistory : [];
    const order = await prisma.order.update({
      where: { id: existing.id },
      data: {
        status,
        statusHistory: [
          ...(history as Prisma.InputJsonValue[]),
          {
            status,
            timestamp: new Date().toISOString(),
            note: asString(body.note) ?? `Status ${status} holatiga o'zgartirildi`,
          },
        ],
      },
      include: { items: true, deliveryAddress: true },
    });

    res.json(serializeOrder(order));
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ message: "Buyurtma statusini yangilashda xatolik" });
  }
});

// ---------------- ADMIN ----------------

app.get("/api/admin/stats", authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
    const [
      totalOrders,
      todayOrders,
      totalUsers,
      totalProducts,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      revenueAggregate,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.user.count({ where: { role: "user" } }),
      prisma.product.count(),
      prisma.order.count({ where: { status: "Pending" } }),
      prisma.order.count({ where: { status: "Delivered" } }),
      prisma.order.count({ where: { status: "Cancelled" } }),
      prisma.order.aggregate({ where: { status: { not: "Cancelled" } }, _sum: { total: true } }),
    ]);

    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const recentOrders = await prisma.order.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      include: { items: true, deliveryAddress: true },
      orderBy: { createdAt: "desc" },
    });

    const salesTrend = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(startOfToday);
      day.setDate(day.getDate() - i);
      const dayOrders = recentOrders.filter(
        (order) => order.status !== "Cancelled" && order.createdAt.toDateString() === day.toDateString(),
      );
      salesTrend.push({
        date: day.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" }),
        amount: dayOrders.reduce((sum, order) => sum + order.total, 0),
        ordersCount: dayOrders.length,
      });
    }

    const topProductRows = await prisma.product.findMany({
      orderBy: { salesCount: "desc" },
      take: 5,
    });

    const latestOrders = await prisma.order.findMany({
      include: { items: true, deliveryAddress: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const stats: AdminStats = {
      totalOrders,
      todayOrders,
      totalUsers,
      totalProducts,
      totalRevenue: revenueAggregate._sum.total ?? 0,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      salesTrend,
      topProducts: topProductRows.map((product) => ({
        id: product.id,
        name: product.name,
        salesCount: product.salesCount,
        revenue: product.salesCount * product.price,
        image: product.images[0] ?? "",
      })),
      recentOrders: latestOrders.map(serializeOrder),
    };

    res.json(stats);
  } catch (error) {
    console.error("Get admin stats error:", error);
    res.status(500).json({ message: "Statistikani olishda xatolik" });
  }
});

app.get("/api/admin/users", authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { addresses: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(users.map(serializeUser));
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Foydalanuvchilarni olishda xatolik" });
  }
});

app.put("/api/admin/users/:id/block", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    if (user.role === "admin") {
      return res.status(400).json({ message: "Administrator hisobini bloklab bo'lmaydi" });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { isBlocked: !user.isBlocked },
      include: { addresses: true },
    });

    res.json({
      user: serializeUser(updated),
      message: updated.isBlocked ? "Foydalanuvchi bloklandi" : "Foydalanuvchi blokdan chiqarildi",
    });
  } catch (error) {
    console.error("Block user error:", error);
    res.status(500).json({ message: "Foydalanuvchi holatini o'zgartirishda xatolik" });
  }
});

// Kept below the API routes so that unknown /api paths return JSON instead of index.html.
app.use("/api", (_req, res) => {
  res.status(404).json({ message: "API endpoint topilmadi" });
});

// ---------------- VITE & STATIC SERVING ----------------

async function startServer() {
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Zamon Market server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
