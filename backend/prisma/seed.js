// Seed script — populates DB with sample Tier-2 Indian grocery data
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding...');

  // Categories
  const cats = await Promise.all([
    prisma.category.upsert({ where: { slug: 'dairy' }, update: {}, create: { name: 'Dairy & Eggs', nameHi: 'डेयरी', nameGu: 'ડેરી', slug: 'dairy' } }),
    prisma.category.upsert({ where: { slug: 'staples' }, update: {}, create: { name: 'Staples & Grains', nameHi: 'अनाज', nameGu: 'અનાજ', slug: 'staples' } }),
    prisma.category.upsert({ where: { slug: 'vegetables' }, update: {}, create: { name: 'Vegetables', nameHi: 'सब्जियां', nameGu: 'શાકભાજી', slug: 'vegetables' } }),
    prisma.category.upsert({ where: { slug: 'snacks' }, update: {}, create: { name: 'Snacks & Beverages', nameHi: 'स्नैक्स', nameGu: 'નાસ્તો', slug: 'snacks' } }),
    prisma.category.upsert({ where: { slug: 'personal' }, update: {}, create: { name: 'Personal Care', nameHi: 'व्यक्तिगत देखभाल', nameGu: 'વ્યક્તિગત સંભાળ', slug: 'personal' } }),
  ]);

  const [dairy, staples, vegetables, snacks, personal] = cats;

  // Products
  const products = [
    { barcode: '8901030884079', sku: 'AMUL-MILK-1L', name: 'Amul Full Cream Milk', nameHi: 'अमूल फुल क्रीम दूध', nameGu: 'અમૂલ ફૂલ ક્રીમ દૂધ', mrp: 68, discountPrice: 64, stockQty: 150, unit: 'litre', categoryId: dairy.id },
    { barcode: '8901030012876', sku: 'AMUL-DAHI-400', name: 'Amul Dahi (Curd)', nameHi: 'अमूल दही', nameGu: 'અમૂલ દહીં', mrp: 45, discountPrice: 42, stockQty: 80, unit: 'pack', categoryId: dairy.id },
    { barcode: '8901063000171', sku: 'AMUL-BUTTER-500', name: 'Amul Butter', nameHi: 'अमूल मक्खन', nameGu: 'અમૂલ માખણ', mrp: 265, discountPrice: 250, stockQty: 40, unit: 'pack', categoryId: dairy.id },
    { barcode: '8901519100014', sku: 'PANEER-200', name: 'Fresh Paneer', nameHi: 'ताजा पनीर', nameGu: 'તાજો પનીર', mrp: 95, discountPrice: 89, stockQty: 30, unit: 'pack', categoryId: dairy.id },

    { barcode: '8901058851766', sku: 'AASHIR-ATTA-5KG', name: 'Aashirvaad Atta 5kg', nameHi: 'आशीर्वाद आटा', nameGu: 'આશીર્વાદ આટો', mrp: 285, discountPrice: 265, stockQty: 200, unit: 'kg', categoryId: staples.id },
    { barcode: '8904073109706', sku: 'INDIA-GATE-BASMATI-1KG', name: 'India Gate Basmati Rice 1kg', nameHi: 'इंडिया गेट बासमती', nameGu: 'ઇન્ડિયા ગેટ બાસમતી', mrp: 145, discountPrice: 135, stockQty: 100, unit: 'kg', categoryId: staples.id },
    { barcode: '8901058853197', sku: 'TATA-SALT-1KG', name: 'Tata Salt 1kg', nameHi: 'टाटा नमक', nameGu: 'ટાટા મીઠું', mrp: 24, discountPrice: 22, stockQty: 300, unit: 'kg', categoryId: staples.id },
    { barcode: '8901058001849', sku: 'FORTUNE-OIL-1L', name: 'Fortune Sunflower Oil 1L', nameHi: 'फॉर्च्यून सूरजमुखी तेल', nameGu: 'ફોર્ચ્યુન સૂર્યમુખી તેલ', mrp: 175, discountPrice: 162, stockQty: 60, unit: 'litre', categoryId: staples.id },

    { barcode: 'VEG-POTATO-1KG', sku: 'VEG-POTATO-1KG', name: 'Potato (Aalu)', nameHi: 'आलू', nameGu: 'બટાટા', mrp: 45, discountPrice: 38, stockQty: 500, unit: 'kg', categoryId: vegetables.id },
    { barcode: 'VEG-TOMATO-1KG', sku: 'VEG-TOMATO-1KG', name: 'Tomato (Tamatar)', nameHi: 'टमाटर', nameGu: 'ટામેટાં', mrp: 60, discountPrice: 52, stockQty: 200, unit: 'kg', categoryId: vegetables.id },
    { barcode: 'VEG-ONION-1KG', sku: 'VEG-ONION-1KG', name: 'Onion (Pyaz)', nameHi: 'प्याज', nameGu: 'ડુંગળી', mrp: 50, discountPrice: 44, stockQty: 400, unit: 'kg', categoryId: vegetables.id },
    { barcode: 'VEG-SPINACH-500G', sku: 'VEG-SPINACH-500G', name: 'Spinach (Palak)', nameHi: 'पालक', nameGu: 'પાલક', mrp: 30, discountPrice: 25, stockQty: 0, unit: 'pack', categoryId: vegetables.id }, // out of stock

    { barcode: '8901058015594', sku: 'PARLE-G-800', name: 'Parle-G Biscuits 800g', nameHi: 'पार्ले-जी बिस्किट', nameGu: 'પાર્લે-જી બિસ્કિટ', mrp: 80, discountPrice: 72, stockQty: 150, unit: 'pack', categoryId: snacks.id },
    { barcode: '8901058821813', sku: 'TATA-TEA-250', name: 'Tata Tea Premium 250g', nameHi: 'टाटा चाय', nameGu: 'ટાટા ચા', mrp: 135, discountPrice: 120, stockQty: 75, unit: 'pack', categoryId: snacks.id },
    { barcode: '8901207001888', sku: 'MAGGI-NOODLES-4PK', name: 'Maggi Noodles (4 pack)', nameHi: 'मैगी नूडल्स', nameGu: 'મેગી નૂડલ્સ', mrp: 72, discountPrice: 65, stockQty: 200, unit: 'pack', categoryId: snacks.id },

    { barcode: '8901207001560', sku: 'LIFEBUOY-SOAP-4PK', name: 'Lifebuoy Soap 4 pack', nameHi: 'लाइफबॉय साबुन', nameGu: 'લાઈફબૉય સાબુ', mrp: 90, discountPrice: 82, stockQty: 120, unit: 'pack', categoryId: personal.id },
    { barcode: '8901207001220', sku: 'DOVE-SHAMPOO-340ML', name: 'Dove Shampoo 340ml', nameHi: 'डव शैम्पू', nameGu: 'ડોવ શેમ્પૂ', mrp: 385, discountPrice: 349, stockQty: 45, unit: 'piece', categoryId: personal.id },
  ];

  for (const p of products) {
    await prisma.product.upsert({ where: { barcode: p.barcode }, update: p, create: p });
  }

  // Delivery slots for today and tomorrow
  const slotTimes = [
    ['09:00', '11:00'], ['11:00', '13:00'], ['14:00', '16:00'],
    ['16:00', '18:00'], ['18:00', '20:00'],
  ];

  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    date.setHours(0, 0, 0, 0);

    for (const [start, end] of slotTimes) {
      await prisma.deliverySlot.upsert({
        where: { date_startTime: { date, startTime: start } },
        update: {},
        create: { date, startTime: start, endTime: end, capacity: 20, booked: Math.floor(Math.random() * 8) },
      });
    }
  }

  // Default admin account
  const adminHash = await bcrypt.hash('store@123', 12);
  await prisma.admin.upsert({
    where: { username: 'store' },
    update: {},
    create: { username: 'store', passwordHash: adminHash, name: 'Store Admin' },
  });

  // Default homepage sections
  const sections = [
    { key: 'popular-categories', title: 'Popular Categories',    subtitle: 'Shop by category',    sortOrder: 1 },
    { key: 'hero-banners',       title: 'Hero Banners',          subtitle: 'Promotional banners', sortOrder: 2 },
    { key: 'clearance',          title: 'Clearance Carnival',    subtitle: 'Limited time deals',  sortOrder: 3 },
    { key: 'weekly-savers',      title: "This Week's Savers",    subtitle: 'Best value picks',    sortOrder: 4 },
    { key: 'daily-essentials',   title: 'Daily Essentials',      subtitle: 'Staples you need',    sortOrder: 5 },
    { key: 'best-sellers',       title: 'Best Sellers',          subtitle: 'Most popular items',  sortOrder: 6 },
    { key: 'product-grid',       title: 'All Products',          subtitle: 'Browse everything',   sortOrder: 7 },
  ];
  for (const s of sections) {
    await prisma.homeSection.upsert({ where: { key: s.key }, update: {}, create: s });
  }

  // Default delivery config
  await prisma.deliveryConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', deliveryEnabled: true, pickupEnabled: true, earliestMsg: 'Delivery in 2-4 hours', freeDeliveryMin: 500, deliveryFee: 30 },
  }).catch(async () => {
    const existing = await prisma.deliveryConfig.findFirst();
    if (!existing) {
      await prisma.deliveryConfig.create({ data: { deliveryEnabled: true, pickupEnabled: true, earliestMsg: 'Delivery in 2-4 hours', freeDeliveryMin: 500, deliveryFee: 30 } });
    }
  });

  // Default hero banners
  const banners = [
    { title: 'Fresh Vegetables', subtitle: 'Farm-fresh, direct from mandi', bgColor: '#16a34a', ctaText: 'Shop Now', ctaLink: '/products?category=vegetables', isActive: true, sortOrder: 1 },
    { title: 'Amul Dairy Products', subtitle: 'Milk, Curd, Paneer & more', bgColor: '#2563eb', ctaText: 'Shop Now', ctaLink: '/products?category=dairy', isActive: true, sortOrder: 2 },
    { title: 'Order above ₹500', subtitle: 'Get FREE Home Delivery', bgColor: '#ea580c', ctaText: 'Shop Now', ctaLink: '/products', isActive: true, sortOrder: 3 },
  ];
  const bannerCount = await prisma.banner.count();
  if (bannerCount === 0) {
    for (const b of banners) await prisma.banner.create({ data: b });
  }

  console.log(`Seeded ${products.length} products, 5 categories, 15 delivery slots, 1 admin, ${sections.length} sections, ${banners.length} banners.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
