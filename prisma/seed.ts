// Demo seed data: one local Food Court location with four original shops (not the
// spec's example names/brands), enough menu/table/QR data to walk every scenario in the
// plan's verification section. Run with `npm run db:seed` (or `npm run db:reset`).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

function token() {
  return randomBytes(16).toString("base64url");
}

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log("Seeding Foodivo demo data...");

  const adminPassword = "admin123";
  const admin = await prisma.user.upsert({
    where: { email: "admin@foodivo.demo" },
    update: {},
    create: {
      email: "admin@foodivo.demo",
      name: "Platform Admin",
      passwordHash: await hash(adminPassword),
      role: "SUPER_ADMIN",
    },
  });

  const location = await prisma.location.upsert({
    where: { slug: "riverside-food-court" },
    update: {},
    create: {
      name: "Riverside Food Court",
      slug: "riverside-food-court",
      description: "A lively riverside strip of local restaurants, stalls, and cafés.",
    },
  });

  const shopDefs = [
    {
      slug: "anwars-kitchen",
      name: "Anwar's Kitchen",
      category: "Bangladeshi · Local Food",
      description: "Home-style Bangladeshi curries and grilled specialties, family run since 2010.",
      address: "12 Riverside Lane",
      latitude: 23.7300,
      longitude: 90.4100,
      phone: "+880-1711-000001",
      prepTimeMinutes: 20,
      deliveryFee: 40,
      minOrder: 150,
      rating: 4.7,
      ratingCount: 128,
      categories: [
        {
          name: "Curries",
          products: [
            { name: "Chicken Rezala", description: "Slow-cooked chicken in a mild, creamy curry.", price: 320, prepTimeMinutes: 20, dietaryTags: ["halal"] },
            { name: "Beef Bhuna", description: "Rich, spice-forward beef curry.", price: 380, prepTimeMinutes: 25, dietaryTags: ["halal", "spicy"] },
            { name: "Mixed Vegetable Curry", description: "Seasonal vegetables in a light curry.", price: 220, prepTimeMinutes: 15, dietaryTags: ["vegetarian"] },
          ],
        },
        {
          name: "Rice & Bread",
          products: [
            { name: "Steamed Rice", description: "Plain steamed rice.", price: 60, prepTimeMinutes: 5 },
            { name: "Garlic Naan", description: "Fresh-baked naan with garlic butter.", price: 90, prepTimeMinutes: 8 },
          ],
        },
      ],
      tables: ["A01", "A02", "A03", "A04"],
      promo: { code: "WELCOME10", type: "PERCENT", value: 10 },
    },
    {
      slug: "golden-wok-stall",
      name: "Golden Wok Stall",
      category: "Chinese · Street Food",
      description: "Fast wok-fried noodles and rice, cooked to order at the stall.",
      address: "4 Market Row",
      latitude: 23.7280,
      longitude: 90.4130,
      phone: "+880-1711-000002",
      prepTimeMinutes: 12,
      deliveryFee: 35,
      minOrder: 100,
      rating: 4.5,
      ratingCount: 76,
      categories: [
        {
          name: "Noodles",
          products: [
            {
              name: "Chicken Chow Mein",
              description: "Wok-fried noodles with chicken and vegetables.",
              price: 210,
              prepTimeMinutes: 10,
              options: [{ name: "Size", values: [{ label: "Regular", priceDelta: 0 }, { label: "Large", priceDelta: 60 }] }],
              addons: [{ name: "Extra chicken", price: 50 }, { name: "Extra veggies", price: 30 }],
            },
            { name: "Vegetable Fried Rice", description: "Classic wok-fried rice with mixed vegetables.", price: 170, prepTimeMinutes: 10, dietaryTags: ["vegetarian"] },
          ],
        },
        {
          name: "Sides",
          products: [
            { name: "Spring Rolls (4pc)", description: "Crispy vegetable spring rolls.", price: 120, prepTimeMinutes: 8 },
          ],
        },
      ],
      tables: ["S01", "S02"],
    },
    {
      slug: "riverside-cafe",
      name: "Riverside Café",
      category: "Café · Coffee",
      description: "Slow coffee and light bites with a view of the river.",
      address: "1 Riverside Lane",
      latitude: 23.7305,
      longitude: 90.4090,
      phone: "+880-1711-000003",
      prepTimeMinutes: 8,
      deliveryFee: 30,
      minOrder: 0,
      rating: 4.9,
      ratingCount: 203,
      categories: [
        {
          name: "Coffee",
          products: [
            {
              name: "Cappuccino",
              description: "Espresso, steamed milk, thick foam.",
              price: 180,
              prepTimeMinutes: 5,
              options: [{ name: "Size", values: [{ label: "Small", priceDelta: 0 }, { label: "Medium", priceDelta: 30 }, { label: "Large", priceDelta: 50 }] }],
            },
            { name: "Cold Brew", description: "18-hour slow-steeped cold brew.", price: 200, prepTimeMinutes: 3 },
          ],
        },
        {
          name: "Light Bites",
          products: [
            { name: "Butter Croissant", description: "Flaky, buttery, baked fresh daily.", price: 130, prepTimeMinutes: 3, status: "SOLD_OUT" },
            { name: "Avocado Toast", description: "Sourdough, smashed avocado, chili flakes.", price: 250, prepTimeMinutes: 8, dietaryTags: ["vegetarian"] },
          ],
        },
      ],
      tables: ["C1", "C2", "C3"],
    },
  ];

  for (const def of shopDefs) {
    const ownerEmail = `owner-${def.slug}@foodivo.demo`;
    const owner = await prisma.user.upsert({
      where: { email: ownerEmail },
      update: {},
      create: { email: ownerEmail, name: `${def.name} Owner`, passwordHash: await hash("vendor123"), role: "SHOP_OWNER" },
    });

    const shop = await prisma.shop.upsert({
      where: { slug: def.slug },
      update: {},
      create: {
        slug: def.slug,
        name: def.name,
        category: def.category,
        description: def.description,
        address: def.address,
        latitude: def.latitude,
        longitude: def.longitude,
        phone: def.phone,
        email: ownerEmail,
        status: "ACTIVE",
        locationId: location.id,
        prepTimeMinutes: def.prepTimeMinutes,
        deliveryFee: def.deliveryFee,
        minOrder: def.minOrder,
        rating: def.rating,
        ratingCount: def.ratingCount,
        staff: { create: { userId: owner.id, role: "SHOP_OWNER" } },
      },
    });

    await prisma.qRCode.upsert({
      where: { token: `shop-${def.slug}` },
      update: {},
      create: { token: `shop-${def.slug}`, type: "SHOP", shopId: shop.id, label: `${def.name} — Shop QR` },
    });

    for (let ci = 0; ci < def.categories.length; ci++) {
      const catDef = def.categories[ci];
      const category = await prisma.category.create({
        data: { shopId: shop.id, name: catDef.name, sortOrder: ci },
      });
      for (let pi = 0; pi < catDef.products.length; pi++) {
        const p = catDef.products[pi] as {
          name: string;
          description: string;
          price: number;
          prepTimeMinutes: number;
          status?: string;
          dietaryTags?: string[];
          options?: { name: string; values: { label: string; priceDelta: number }[] }[];
          addons?: { name: string; price: number }[];
        };
        await prisma.product.create({
          data: {
            shopId: shop.id,
            categoryId: category.id,
            name: p.name,
            description: p.description,
            price: p.price,
            prepTimeMinutes: p.prepTimeMinutes,
            status: p.status ?? "AVAILABLE",
            dietaryTags: JSON.stringify(p.dietaryTags ?? []),
            sortOrder: pi,
            options: p.options
              ? { create: p.options.map((o) => ({ name: o.name, values: { create: o.values } })) }
              : undefined,
            addons: p.addons ? { create: p.addons } : undefined,
          },
        });
      }
    }

    for (const label of def.tables) {
      const table = await prisma.table.create({ data: { shopId: shop.id, area: "Main", label } });
      await prisma.qRCode.create({
        data: { token: token(), type: "TABLE", shopId: shop.id, tableId: table.id, label: `Table ${label}` },
      });
    }

    if ("promo" in def && def.promo) {
      await prisma.promotion.create({
        data: {
          shopId: shop.id,
          code: def.promo.code,
          title: `${def.promo.value}% off`,
          type: def.promo.type,
          value: def.promo.value,
          active: true,
        },
      });
    }

    console.log(`  ✓ ${def.name}`);
  }

  // One shop left PENDING so the admin approval queue has something to demo.
  const pendingOwner = await prisma.user.upsert({
    where: { email: "owner-fresh-press@foodivo.demo" },
    update: {},
    create: {
      email: "owner-fresh-press@foodivo.demo",
      name: "Fresh Press Juice Bar Owner",
      passwordHash: await hash("vendor123"),
      role: "SHOP_OWNER",
    },
  });
  await prisma.shop.upsert({
    where: { slug: "fresh-press-juice-bar" },
    update: {},
    create: {
      slug: "fresh-press-juice-bar",
      name: "Fresh Press Juice Bar",
      category: "Drinks · Juice",
      description: "Cold-pressed juices and smoothies, made to order.",
      address: "7 Market Row",
      latitude: 23.7340,
      longitude: 90.4060,
      phone: "+880-1711-000004",
      email: "owner-fresh-press@foodivo.demo",
      status: "PENDING",
      locationId: location.id,
      staff: { create: { userId: pendingOwner.id, role: "SHOP_OWNER" } },
    },
  });

  console.log("\nDone. Sign-ins:");
  console.log(`  Admin:  admin@foodivo.demo / ${adminPassword}`);
  console.log(`  Vendor: owner-anwars-kitchen@foodivo.demo / vendor123 (and other shops, same pattern)`);
  console.log(`  Pending shop (for approval demo): owner-fresh-press@foodivo.demo / vendor123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
