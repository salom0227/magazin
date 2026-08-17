import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

export async function sendOrderNotification(order: any) {
  try {
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

    await bot.telegram.sendMessage(CHAT_ID, message, {
      parse_mode: 'HTML',
    });

    // Send location if available
    if (order.deliveryAddress.latitude && order.deliveryAddress.longitude) {
      await bot.telegram.sendLocation(
        CHAT_ID,
        order.deliveryAddress.latitude,
        order.deliveryAddress.longitude
      );
    }

    console.log('✅ Telegram notification sent');
  } catch (error) {
    console.error('❌ Failed to send Telegram notification:', error);
    // Don't throw error - order should still be saved even if notification fails
  }
}

function formatPrice(price: number): string {
  return price.toLocaleString('uz-UZ') + " so'm";
}
