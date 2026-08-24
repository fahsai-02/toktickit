import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const categories = [
  { name: "Account and Access" },
  { name: "Hardware" },
  { name: "Software" },
  { name: "Network" },
];

const relatedSystems = [
  { name: "Email", categoryName: null },
  { name: "Campus Wi-Fi", categoryName: "Network" },
  { name: "VPN", categoryName: "Network" },
  { name: "LEB2 App", categoryName: "Software" },
  { name: "Grade Submission App", categoryName: "Software" },
  { name: "Printer", categoryName: "Hardware" },
  { name: "Corporate Laptop", categoryName: "Hardware" },
];

const requesters = [
  {
    name: "Jennifer Anderson",
    email: "jennifer.anderson@toktickit.dev",
    isActive: true,
  },
  {
    name: "David Lee",
    email: "david.lee@toktickit.dev",
    isActive: true,
  },
  {
    name: "Sarah Johnson",
    email: "sarah.johnson@toktickit.dev",
    isActive: true,
  },
  {
    name: "Michael Brown",
    email: "michael.brown@toktickit.dev",
    isActive: true,
  },
  {
    name: "Napat Chaiwong",
    email: "napat.chaiwong@toktickit.dev",
    isActive: true,
  },
  // NOTE: isActive is intentionally false; re-seeding resets manual status changes (e.g. reactivation) back to seed values.
  {
    name: "Robert Brown",
    email: "robert.brown@toktickit.dev",
    isActive: false,
  },
];

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: category,
      create: category,
    });
  }

  const categoryRows = await prisma.category.findMany();
  const categoryIdByName = new Map(categoryRows.map((c) => [c.name, c.id]));

  for (const system of relatedSystems) {
    let categoryId: number | null = null;
    if (system.categoryName) {
      categoryId = categoryIdByName.get(system.categoryName) ?? null;
      if (categoryId === null) {
        throw new Error(`Category "${system.categoryName}" not found for related system "${system.name}"`);
      }
    }
    const data = { name: system.name, categoryId, isActive: true };
    await prisma.relatedSystem.upsert({
      where: { name: system.name },
      update: data,
      create: data,
    });
  }

  for (const requester of requesters) {
    await prisma.requester.upsert({
      where: { email: requester.email },
      update: requester,
      create: requester,
    });
  }

  const [categoryCount, systemCount, activeRequesters, inactiveRequesters] =
    await Promise.all([
      prisma.category.count(),
      prisma.relatedSystem.count(),
      prisma.requester.count({ where: { isActive: true } }),
      prisma.requester.count({ where: { isActive: false } }),
    ]);

  console.log(
    `Seeded ${categoryCount} categories, ${systemCount} related systems, ${activeRequesters} active requesters, ${inactiveRequesters} inactive requesters`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
