// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const services = [
  ["Home repairs", "home-repairs", ["Electrical repair", "Plumbing repair", "Appliance repair"]],
  ["Cleaning", "cleaning", ["House cleaning", "Garden cleaning", "Water-tank cleaning"]],
  ["Moving & delivery", "moving-delivery", ["Moving help", "Loading and unloading", "Local delivery"]],
  ["Construction", "construction", ["Carpentry", "Painting", "Masonry"]],
  ["Garden care", "garden-care", ["Garden care"]],
  ["Pest control", "pest-control", ["Pest control"]],
  ["Car wash", "car-wash", ["Car wash"]],
  ["Event help", "event-help", ["Event help"]],
];

async function main() {
  for (const [categoryName, categorySlug, serviceNames] of services) {
    const category = await prisma.serviceCategory.upsert({ where: { slug: categorySlug }, update: { active: true }, create: { name: categoryName, slug: categorySlug, description: `${categoryName} services from local professionals.` } });
    for (const name of serviceNames) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      await prisma.service.upsert({ where: { slug }, update: { active: true, categoryId: category.id }, create: { name, slug, categoryId: category.id, description: `${name} from verified SevaSetu professionals.` } });
    }
  }
  console.log("SevaSetu development service catalog seeded.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
