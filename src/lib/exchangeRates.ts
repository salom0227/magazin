/**
 * O'zbekiston Respublikasi Markaziy banki (CBU)'ning rasmiy, ochiq valyuta
 * kursi API'sidan real kurslarni olib keladi. Bu — saytdagi USD/RUB/EUR
 * kurslarining haqiqiy, kunlik yangilanadigan manbasi (avval bu qiymatlar
 * admin panelda qo'lda, doim eskirgan holda kiritilardi).
 *
 * Hujjatlashtirilmagan, lekin keng qo'llaniladigan rasmiy endpoint:
 *   https://cbu.uz/en/arkhiv-kursov-valyut/json/
 * Har bir valyuta uchun quyidagi shakldagi obyektlar qaytaradi:
 *   { Ccy: "USD", Rate: "12750.45", Nominal: "1", Date: "18.08.2026", ... }
 */

const CBU_API_URL = 'https://cbu.uz/en/arkhiv-kursov-valyut/json/';

interface CbuRateEntry {
  Ccy: string;
  Rate: string;
  Nominal: string;
  Date?: string;
}

/**
 * CBU'dan barcha valyutalar kursini olib, { "USD": 12750.45, "RUB": 141.2, ... }
 * shaklidagi xaritaga aylantiradi. Har doim "1 birlik = necha so'm"ga
 * normallashtiriladi (Nominal 1 dan farqli bo'lsa ham — masalan ba'zi
 * valyutalar 100 birlik uchun beriladi).
 *
 * Tarmoq yoki API bilan bog'liq har qanday xatolik shu yerda uloqtiriladi
 * (throw qilinadi) — chaqiruvchi tomon eski, oxirgi ma'lum kursni
 * saqlab qolishi va hech qachon 0/NaN kursni bazaga yozmasligi kerak.
 */
export async function fetchCbuRates(): Promise<Record<string, number>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(CBU_API_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`CBU API HTTP ${res.status}`);
    }

    const data: CbuRateEntry[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('CBU API bo\'sh yoki noto\'g\'ri formatda javob qaytardi');
    }

    const rates: Record<string, number> = {};
    for (const entry of data) {
      const code = entry?.Ccy;
      const rawRate = Number(entry?.Rate);
      const nominal = Number(entry?.Nominal) || 1;

      if (!code || !isFinite(rawRate) || rawRate <= 0 || nominal <= 0) continue;

      // Har doim "1 birlik valyuta = necha so'm" ga keltiramiz.
      rates[code] = rawRate / nominal;
    }

    if (Object.keys(rates).length === 0) {
      throw new Error('CBU javobida haqiqiy kurslar topilmadi');
    }

    return rates;
  } finally {
    clearTimeout(timeout);
  }
}
