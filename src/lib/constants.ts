// "Aksiyalar" navbar tugmasi haqiqiy kategoriya emas — bosilganda chegirmali
// mahsulotlarni ko'rsatadi (App.tsx'da onSale filtri orqali). App.tsx va
// Navbar.tsx ikkalasi ham shu qiymatni ishlatadi, shuning uchun hech qachon
// bir-biridan ajralib qolmaydi. Alohida faylda, chunki App.tsx Navbar'ni
// import qiladi — agar shu qiymat App.tsx'da turib, Navbar undan import
// qilsa, aylanma import (circular import) hosil bo'lardi.
export const SALE_CATEGORY_SLUG = '__sale__';
