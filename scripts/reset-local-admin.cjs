const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
    const before = await prisma.user.count({ where: { role: "ADMIN" } });
    const deleted = await prisma.user.deleteMany({ where: { role: "ADMIN" } });
    const after = await prisma.user.count({ where: { role: "ADMIN" } });
    console.log(JSON.stringify({ adminAccountsBefore: before, adminAccountsDeleted: deleted.count, adminAccountsRemaining: after }));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}).finally(() => prisma.$disconnect());
