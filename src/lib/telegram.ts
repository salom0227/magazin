import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
const CHAT_IDS = (process.env.TELEGRAM_CHAT_ID || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

export async function sendOrderNotification(order: any) {
  try {
    if (CHAT_IDS.length === 0) return;

    const message = `
🛒 <b>Yangi Buyurtma</b>

📋 <b>Buyurtma raqami:</b> ${order.orderNumber}
👤 <b>Mijoz:</b> ${order.firstName} ${order.lastName}
📱 <b>Telefon:</b> ${order.phone}
💰 <b>Umumiy summa:</b> ${formatPrice(order.total)}

📦 <b>Mahsulotlar:</b>
${order.items.map((item: any) => 
  `• ${item.name} x${item.quantity} = ${formatPrice(item.price * item.quantity)}`
).join('\n')}

📍 <b>Yetkazib berish manzili:</b>
${order.deliveryAddress.region}, ${order.deliveryAddress.district}
${order.deliveryAddress.street}, ${order.deliveryAddress.house} ${order.deliveryAddress.apartment || ''}
${order.deliveryAddress.notes ? `📝 Izoh: ${order.deliveryAddress.notes}` : ''}

💳 <b>To'lov turi:</b> ${order.paymentMethod}
📅 <b>Vaqt:</b> ${new Date(order.createdAt).toLocaleString('uz-UZ')}
    `.trim();

    for (const chatId of CHAT_IDS) {
      try {
        await bot.telegram.sendMessage(chatId, message, {
          parse_mode: 'HTML',
        });

        // Send location if available
        if (order.deliveryAddress.latitude && order.deliveryAddress.longitude) {
          await bot.telegram.sendLocation(
            chatId,
            order.deliveryAddress.latitude,
            order.deliveryAddress.longitude
          );
        }
      } catch (err) {
        console.error(`❌ Failed to send Telegram notification to ${chatId}:`, err);
      }
    }

    console.log('✅ Telegram notifications sent');
  } catch (error) {
    console.error('❌ Failed to send Telegram notification:', error);
    // Don't throw error - order should still be saved even if notification fails
  }
}

function formatPrice(price: number): string {
  return price.toLocaleString('uz-UZ') + " so'm";
}

function starsFor(rating: number): string {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return '⭐'.repeat(full) + '☆'.repeat(5 - full);
}

// Har bir yangi mahsulot sharhi (kim, qaysi mahsulot, necha yulduz, matn,
// rasmlar) botga yuboriladi — barcha sharhlarni bitta joydan kuzatib borish
// uchun.
export async function sendReviewNotification(
  review: { userName: string; rating: number; comment: string; images?: string[] },
  productName: string
) {
  try {
    if (CHAT_IDS.length === 0) return;

    const caption = `
📝 <b>Yangi sharh</b>

🛍️ <b>Mahsulot:</b> ${productName}
👤 <b>Kim yozdi:</b> ${review.userName}
${starsFor(review.rating)} (${review.rating}/5)

💬 <b>Fikr:</b>
${review.comment}
    `.trim();

    for (const chatId of CHAT_IDS) {
      try {
        const images = (review.images || []).filter(Boolean).slice(0, 10);

        if (images.length === 0) {
          await bot.telegram.sendMessage(chatId, caption, { parse_mode: 'HTML' });
        } else if (images.length === 1) {
          await bot.telegram.sendPhoto(chatId, images[0], {
            caption,
            parse_mode: 'HTML',
          });
        } else {
          // Media group captions only render on the first item in Telegram.
          await bot.telegram.sendMediaGroup(
            chatId,
            images.map((url, i) => ({
              type: 'photo' as const,
              media: url,
              ...(i === 0 ? { caption, parse_mode: 'HTML' as const } : {}),
            }))
          );
        }
      } catch (err) {
        console.error(`❌ Failed to send review notification to ${chatId}:`, err);
      }
    }
  } catch (error) {
    console.error('❌ Failed to send review notification:', error);
    // Sharh notification muvaffaqiyatsiz bo'lsa ham, sharh saqlanishi kerak.
  }
}
