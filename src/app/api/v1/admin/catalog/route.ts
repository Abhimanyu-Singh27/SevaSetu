import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { catalogInput } from "@/lib/portal-contracts";
import { apiError } from "@/lib/portal-api";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  const parsed = catalogInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid name, URL slug, and category." }, { status: 400 });
  try {
    const input = parsed.data;
    const result = await prisma.$transaction(async (tx) => {
      const data = { name: input.name, slug: input.slug, description: input.description || null, active: input.active };
      const record = input.kind === "category"
        ? input.id ? await tx.serviceCategory.update({ where: { id: input.id }, data }) : await tx.serviceCategory.create({ data })
        : input.id ? await tx.service.update({ where: { id: input.id }, data: { ...data, categoryId: input.categoryId } }) : await tx.service.create({ data: { ...data, categoryId: input.categoryId } });
      await tx.auditLog.create({ data: { actorId: session.userId, action: input.id ? "CATALOG_UPDATED" : "CATALOG_CREATED", targetType: input.kind.toUpperCase(), targetId: record.id, metadata: { active: record.active } } });
      return record;
    });
    return NextResponse.json({ data: result }, { status: parsed.data.id ? 200 : 201 });
  } catch (error) { return apiError(error); }
}
