import { Telegraf } from 'telegraf';
import type { Order } from '../types';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const bot = BOT_TOKEN ? new Telegraf(BOT_TOKEN) : null;

export async function sendOrderNotification(order: Order) {
  if (!bot || !CHAT_ID) {
    console.warn('⚠️ Telegram is not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID), skipping notification');
    return;
  }

  try {
    const address = order.deliveryAddress;
    const message = `
🛒 <b>Yangi Buyurtma</b>

📋 <b>Buyurtma raqami:</b> ${order.orderNumber}
👤 <b>Mijoz:</b> ${order.customer.firstName} ${order.customer.lastName}
📱 <b>Telefon:</b> ${order.customer.phone}
💰 <b>Umumiy summa:</b> ${formatPrice(order.total)}

📦 <b>Mahsulotlar:</b>
${order.items
  .map((item) => `• ${item.name} x${item.quantity} = ${formatPrice(item.price * item.quantity)}`)
  .join('\n')}

📍 <b>Yetkazib berish manzili:</b>
${address.region}, ${address.district}
${address.street}, ${address.house} ${address.apartment || ''}
${address.notes ? `📝 Izoh: ${address.notes}` : ''}

💳 <b>To'lov turi:</b> ${order.paymentMethod}
📅 <b>Vaqt:</b> ${new Date(order.createdAt).toLocaleString('uz-UZ')}
    `.trim();

    await bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'HTML' });

    if (address.latitude && address.longitude) {
      await bot.telegram.sendLocation(CHAT_ID, address.latitude, address.longitude);
    }

    console.log('✅ Telegram notification sent');
  } catch (error) {
    // Never fail the order because a notification could not be delivered.
    console.error('❌ Failed to send Telegram notification:', error);
  }
}

function formatPrice(price: number): string {
  return price.toLocaleString('uz-UZ') + " so'm";
}
