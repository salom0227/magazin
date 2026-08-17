import express, { Request, Response, NextFunction } from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { uploadToR2, generateFileName } from './src/lib/r2';
import { sendOrderNotification } from './src/lib/telegram';
import multer from 'multer';
import type { User, Product, Category, Order, AdminStats, OrderStatus, ProductReview, Currency } from "./src/types";

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();
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

// API: Categories
app.get("/api/categories", async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error) {
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
    const product = await prisma.product.create({
      data: req.body,
      include: { variants: true },
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Failed to create product" });
  }
});

app.put("/api/products/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
      include: { variants: true },
    });
    res.json(product);
  } catch (error) {
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
    const currency = await prisma.currency.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(currency);
  } catch (error) {
    res.status(500).json({ error: "Failed to update currency" });
  }
});

// API: Auth
app.post("/api/auth/register", async (req, res) => {
  try {
    const { firstName, lastName, phone, pin } = req.body;
    
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
    
    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: "Failed to register user" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { phone, pin } = req.body;

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
    
    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: "Failed to login" });
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
    res.json(orders);
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
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user orders" });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const { items, customer, deliveryAddress, paymentMethod } = req.body;
    
    const order = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const orderItemsData = [];
      
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error(`Mahsulot topilmadi: ${item.productId}`);
        if (product.stock < item.quantity) {
          throw new Error(`Kechirasiz, "${product.name}" mahsulotidan faqat ${product.stock} dona qolgan.`);
        }
        
        // Calculate with real price from DB
        subtotal += product.price * item.quantity;
        
        // Decrease stock
        await tx.product.update({
          where: { id: item.productId },
          data: { 
            stock: { decrement: item.quantity },
            salesCount: { increment: item.quantity }
          }
        });
        
        orderItemsData.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          image: product.images[0] || "",
          categoryName: product.categoryName
        });
      }
      
      const deliveryFee = subtotal >= 500000 ? 0 : 30000;
      const total = subtotal + deliveryFee;
      const orderNumber = `ORD-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${Date.now().toString().slice(-4)}`;

      return await tx.order.create({
        data: {
          orderNumber,
          userId: customer.userId || null,
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

    res.json(order);
  } catch (error: any) {
    console.error('Order creation error:', error);
    res.status(400).json({ error: error.message || "Failed to create order" });
  }
});

app.put("/api/orders/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    
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

    res.json(order);
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
      recentOrders: orders.slice(0, 10) as any,
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
    res.json(users);
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
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Server xatosi" });
  }
});

app.put("/api/auth/profile", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { firstName, lastName, avatar } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { firstName, lastName, avatar },
      include: { addresses: true }
    });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Profilni yangilashda xatolik" });
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
    await prisma.favorite.create({
      data: { userId, productId }
    });
    res.json({ success: true });
  } catch (error) {
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

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });

    const review = await prisma.productReview.create({
      data: {
        productId,
        userId,
        userName: `${user.firstName} ${user.lastName}`,
        rating: Number(rating),
        comment
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

    res.json(review);
  } catch (error) {
    res.status(500).json({ error: "Sharh qoldirishda xatolik" });
  }
});

// API: Categories Admin
app.post("/api/categories", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const category = await prisma.category.create({ data: req.body });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: "Toifa yaratishda xatolik" });
  }
});

app.put("/api/categories/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: "Toifa yangilashda xatolik" });
  }
});

app.delete("/api/categories/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Toifa o'chirishda xatolik" });
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
    
    res.json(order);
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
    res.json(users);
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
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Holatni o'zgartirishda xatolik" });
  }
});

// Vite serve in development, static files in production
const isProduction = process.env.NODE_ENV === "production";

async function startServer() {
  if (isProduction) {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
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
