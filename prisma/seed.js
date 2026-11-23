// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");
const services = require("../src/lib/starter-service-catalog.json");

const prisma = new PrismaClient();

async function main() {
  for (const { name: categoryName, slug: categorySlug, services: serviceNames } of services) {
    const category = await prisma.serviceCategory.upsert({ where: { slug: categorySlug }, update: { active: true }, create: { name: categoryName, slug: categorySlug, description: `${categoryName} services from local professionals.` } });
    for (const name of serviceNames) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      await prisma.service.upsert({ where: { slug }, update: { active: true, categoryId: category.id }, create: { name, slug, categoryId: category.id, description: `${name} from verified SevaSetu professionals.` } });
    }
  }
  console.log("SevaSetu development service catalog seeded.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
