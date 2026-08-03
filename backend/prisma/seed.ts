import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const employeePassword = await bcrypt.hash("Employee@123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@ngo.org" },
    update: {},
    create: {
      name: "Finance Admin",
      email: "admin@ngo.org",
      passwordHash: adminPassword,
      role: Role.FINANCE_ADMIN,
      city: "Delhi",
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: "employee@ngo.org" },
    update: {},
    create: {
      name: "Asha Verma",
      email: "employee@ngo.org",
      passwordHash: employeePassword,
      role: Role.EMPLOYEE,
      city: "Mumbai",
    },
  });

  const employee2 = await prisma.user.upsert({
    where: { email: "ravi.kumar@ngo.org" },
    update: {},
    create: {
      name: "Ravi Kumar",
      email: "ravi.kumar@ngo.org",
      passwordHash: employeePassword,
      role: Role.EMPLOYEE,
      city: "Bengaluru",
    },
  });

  const projectsData = [
    { name: "Clean Water Initiative", code: "CWI-001", city: "Mumbai", description: "Providing clean drinking water access in rural Maharashtra." },
    { name: "Girl Child Education", code: "GCE-002", city: "Delhi", description: "Scholarships and school infrastructure for girl children." },
    { name: "Rural Healthcare Camp", code: "RHC-003", city: "Bengaluru", description: "Mobile healthcare camps across Karnataka villages." },
  ];

  const projects = [];
  for (const p of projectsData) {
    const proj = await prisma.project.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
    projects.push(proj);
  }

  await prisma.projectAssignment.createMany({
    data: [
      { userId: employee.id, projectId: projects[0].id },
      { userId: employee.id, projectId: projects[1].id },
      { userId: employee2.id, projectId: projects[2].id },
      { userId: employee2.id, projectId: projects[0].id },
    ],
    skipDuplicates: true,
  });

  const categoryNames = [
    { name: "Travel", description: "Local & intercity travel expenses" },
    { name: "Accommodation", description: "Hotel/lodging during field visits" },
    { name: "Food & Refreshments", description: "Meals during official work" },
    { name: "Office Supplies", description: "Stationery and consumables" },
    { name: "Medical Camp Supplies", description: "Supplies for healthcare camps" },
    { name: "Printing & Communication", description: "Printing, courier, phone/internet" },
  ];

  for (const c of categoryNames) {
    await prisma.expenseCategory.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
  }

  console.log("Seed complete.");
  console.log("Admin login: admin@ngo.org / Admin@123");
  console.log("Employee login: employee@ngo.org / Employee@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
