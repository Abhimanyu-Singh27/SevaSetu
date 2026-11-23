import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError } from "@/lib/portal-api";
import { prisma } from "@/lib/prisma";
import starterCatalog from "@/lib/starter-service-catalog.json";

function serviceSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const categorySlugs = starterCatalog.map(({ slug }) => slug);
      const categoriesCreated = await tx.serviceCategory.createMany({
        data: starterCatalog.map(({ name, slug }) => ({
          name,
          slug,
          description: `${name} services from local professionals.`,
          active: true,
        })),
        skipDuplicates: true,
      });
      const categories = await tx.serviceCategory.findMany({
        where: { slug: { in: categorySlugs } },
        select: { id: true, slug: true },
      });
      const categoryIds = new Map(categories.map(({ id, slug }) => [slug, id]));
      const missingCategory = starterCatalog.find(({ slug }) => !categoryIds.has(slug));
      if (missingCategory) throw new Error(`Could not create starter category ${missingCategory.name}`);

      const serviceRows = starterCatalog.flatMap(({ name: categoryName, slug: categorySlug, services }) => {
        const categoryId = categoryIds.get(categorySlug);
        if (!categoryId) throw new Error(`Could not find starter category ${categoryName}`);
        return services.map((serviceName) => ({
          name: serviceName,
          slug: serviceSlug(serviceName),
          categoryId,
          description: `${serviceName} from verified SevaSetu professionals.`,
          active: true,
        }));
      });
      const servicesCreated = await tx.service.createMany({ data: serviceRows, skipDuplicates: true });

      await tx.auditLog.create({
        data: {
          actorId: session.userId,
          action: "STARTER_CATALOG_BOOTSTRAPPED",
          targetType: "CATALOG",
          targetId: "starter-catalog",
          metadata: { addedCategories: categoriesCreated.count, addedServices: servicesCreated.count },
        },
      });
      return { addedCategories: categoriesCreated.count, addedServices: servicesCreated.count };
    }, { timeout: 30_000 });

    return NextResponse.json({ data: result });
  } catch (error) {
    return apiError(error, "Unable to load the starter service catalog. Please try again.");
  }
}
